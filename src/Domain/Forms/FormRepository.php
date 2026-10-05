<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Domain\Forms;

use Flexa\FormFlow\Concerns\HasInstance;
use Flexa\FormFlow\Database\Schema;

defined( 'ABSPATH' ) || exit;

// phpcs:disable WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQLPlaceholders -- data-access class for our own tables; every query goes through $wpdb->prepare() (table names via %i), with WHERE clauses and IN() lists built only from literal %d/%s placeholders the sniff cannot follow statically.

final class FormRepository {
	use HasInstance;

	public function find( int $id ): ?Form {
		global $wpdb;

		$table = Schema::forms_table();
		$row   = $wpdb->get_row( $wpdb->prepare( 'SELECT * FROM %i WHERE id = %d', $table, $id ), ARRAY_A );

		return is_array( $row ) ? Form::from_row( $row ) : null;
	}

	public function find_by_uuid( string $uuid ): ?Form {
		global $wpdb;

		$table = Schema::forms_table();
		$row   = $wpdb->get_row( $wpdb->prepare( 'SELECT * FROM %i WHERE uuid = %s', $table, $uuid ), ARRAY_A );

		return is_array( $row ) ? Form::from_row( $row ) : null;
	}

	/**
	 * @param array<string, mixed> $args
	 * @return array{items: list<Form>, total: int}
	 */
	public function all( array $args = [] ): array {
		global $wpdb;

		$table    = Schema::forms_table();
		$search   = (string) ( $args['search'] ?? '' );
		$status   = (string) ( $args['status'] ?? '' );
		$page     = max( 1, (int) ( $args['page'] ?? 1 ) );
		$per_page = max( 1, min( 100, (int) ( $args['per_page'] ?? 20 ) ) );

		// Filters are fixed SQL that switch themselves off: `'' = %s` is true
		// when that filter is empty. Nothing is interpolated.
		$like   = '' !== $search ? '%' . $wpdb->esc_like( $search ) . '%' : '';
		$status = in_array( $status, [ 'draft', 'published' ], true ) ? $status : '';

		$total = (int) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM %i WHERE ( '' = %s OR title LIKE %s ) AND ( '' = %s OR status = %s )",
				$table,
				$like,
				$like,
				$status,
				$status
			)
		);

		$offset = ( $page - 1 ) * $per_page;
		$rows   = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM %i WHERE ( '' = %s OR title LIKE %s ) AND ( '' = %s OR status = %s ) ORDER BY updated_at DESC LIMIT %d OFFSET %d",
				$table,
				$like,
				$like,
				$status,
				$status,
				$per_page,
				$offset
			),
			ARRAY_A
		);

		$items = [];
		foreach ( is_array( $rows ) ? $rows : [] as $row ) {
			$items[] = Form::from_row( $row );
		}

		return [
			'items' => $items,
			'total' => $total,
		];
	}

	/**
	 * @param array<string, mixed> $config
	 */
	public function create( string $title, array $config = [] ): int {
		global $wpdb;

		$now = current_time( 'mysql', true );
		$wpdb->insert(
			Schema::forms_table(),
			[
				'uuid'       => wp_generate_uuid4(),
				'title'      => $title,
				'status'     => 'draft',
				'config'     => (string) wp_json_encode( [] === $config ? FieldTypes::default_config() : FieldTypes::sanitize_config( $config ) ),
				'created_at' => $now,
				'updated_at' => $now,
			],
			[ '%s', '%s', '%s', '%s', '%s', '%s' ]
		);

		return (int) $wpdb->insert_id;
	}

	/**
	 * Partial update: only the passed keys change. `config` is sanitized as a
	 * whole document (the builder owns it; there is no partial config merge).
	 *
	 * @param array<string, mixed> $fields
	 */
	public function update( int $id, array $fields ): bool {
		global $wpdb;

		$data = [];
		if ( array_key_exists( 'title', $fields ) ) {
			$data['title'] = sanitize_text_field( (string) $fields['title'] );
		}
		if ( array_key_exists( 'status', $fields ) && in_array( $fields['status'], [ 'draft', 'published' ], true ) ) {
			$data['status'] = (string) $fields['status'];
		}
		if ( array_key_exists( 'config', $fields ) && is_array( $fields['config'] ) ) {
			$data['config'] = (string) wp_json_encode( FieldTypes::sanitize_config( $fields['config'] ) );
		}
		if ( [] === $data ) {
			return false;
		}
		$data['updated_at'] = current_time( 'mysql', true );

		$updated = $wpdb->update( Schema::forms_table(), $data, [ 'id' => $id ], null, [ '%d' ] );

		return false !== $updated;
	}

	public function delete( int $id ): bool {
		global $wpdb;

		$entries = Schema::entries_table();
		$wpdb->query( $wpdb->prepare( 'DELETE FROM %i WHERE form_id = %d', $entries, $id ) );

		return false !== $wpdb->delete( Schema::forms_table(), [ 'id' => $id ], [ '%d' ] );
	}

	public function duplicate( int $id ): int {
		global $wpdb;

		$source = $this->find( $id );
		if ( null === $source ) {
			return 0;
		}

		$now = current_time( 'mysql', true );
		$wpdb->insert(
			Schema::forms_table(),
			[
				'uuid'       => wp_generate_uuid4(),
				/* translators: %s: title of the form being duplicated. */
				'title'      => sprintf( __( '%s (copy)', 'flexa-formflow' ), $source->title ),
				'status'     => 'draft',
				'config'     => (string) wp_json_encode( $source->config ),
				'created_at' => $now,
				'updated_at' => $now,
			],
			[ '%s', '%s', '%s', '%s', '%s', '%s' ]
		);

		return (int) $wpdb->insert_id;
	}

	public function count(): int {
		global $wpdb;

		$table = Schema::forms_table();

		return (int) $wpdb->get_var( $wpdb->prepare( 'SELECT COUNT(*) FROM %i', $table ) );
	}

	/**
	 * Entry counts per form for the list screen, one query for all rows.
	 *
	 * @param list<int> $form_ids
	 * @return array<int, int>
	 */
	public function entry_counts( array $form_ids ): array {
		global $wpdb;

		$form_ids = array_values( array_filter( array_map( 'intval', $form_ids ) ) );
		if ( [] === $form_ids ) {
			return [];
		}

		$entries      = Schema::entries_table();
		// One %d per form ID: the interpolated part is only a list of placeholders,
		// and every ID is still bound by prepare().
		$placeholders = implode( ',', array_fill( 0, count( $form_ids ), '%d' ) );
		$rows         = $wpdb->get_results(
			$wpdb->prepare( "SELECT form_id, COUNT(*) AS total FROM %i WHERE form_id IN ({$placeholders}) GROUP BY form_id", $entries, ...$form_ids ),
			ARRAY_A
		);

		$counts = [];
		foreach ( is_array( $rows ) ? $rows : [] as $row ) {
			$counts[ (int) $row['form_id'] ] = (int) $row['total'];
		}

		return $counts;
	}
}
