<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Domain\EmailTemplates;

use Flexa\FormFlow\Concerns\HasInstance;
use Flexa\FormFlow\Database\Schema;
use Flexa\FormFlow\Emails\TreeSanitizer;

defined( 'ABSPATH' ) || exit;

// phpcs:disable WordPress.DB.DirectDatabaseQuery -- data-access class for our own tables; every query goes through $wpdb->prepare() (table names via %i).

final class EmailTemplateRepository {
	use HasInstance;

	public function find( int $id ): ?EmailTemplate {
		global $wpdb;

		$table = Schema::email_templates_table();
		$row   = $wpdb->get_row( $wpdb->prepare( 'SELECT * FROM %i WHERE id = %d', $table, $id ), ARRAY_A );

		return is_array( $row ) ? EmailTemplate::from_row( $row ) : null;
	}

	/**
	 * Template libraries stay small, so there is no paging here.
	 *
	 * @return list<EmailTemplate>
	 */
	public function all(): array {
		global $wpdb;

		$table = Schema::email_templates_table();
		$rows  = $wpdb->get_results( $wpdb->prepare( 'SELECT * FROM %i ORDER BY updated_at DESC, id DESC', $table ), ARRAY_A );

		$items = [];
		foreach ( is_array( $rows ) ? $rows : [] as $row ) {
			$items[] = EmailTemplate::from_row( $row );
		}

		return $items;
	}

	/**
	 * @param array<string, mixed> $tree
	 */
	public function create( string $title, array $tree ): int {
		global $wpdb;

		$now = current_time( 'mysql', true );
		$wpdb->insert(
			Schema::email_templates_table(),
			[
				'title'      => sanitize_text_field( $title ),
				'tree'       => (string) wp_json_encode( TreeSanitizer::sanitize( $tree ) ),
				'created_at' => $now,
				'updated_at' => $now,
			],
			[ '%s', '%s', '%s', '%s' ]
		);

		return (int) $wpdb->insert_id;
	}

	/**
	 * Partial update: only the passed keys change. `tree` is sanitized as a
	 * whole document (the editor owns it).
	 *
	 * @param array<string, mixed> $fields
	 */
	public function update( int $id, array $fields ): bool {
		global $wpdb;

		$data = [];
		if ( array_key_exists( 'title', $fields ) ) {
			$data['title'] = sanitize_text_field( (string) $fields['title'] );
		}
		if ( array_key_exists( 'tree', $fields ) && is_array( $fields['tree'] ) ) {
			$data['tree'] = (string) wp_json_encode( TreeSanitizer::sanitize( $fields['tree'] ) );
		}
		if ( [] === $data ) {
			return false;
		}
		$data['updated_at'] = current_time( 'mysql', true );

		$updated = $wpdb->update( Schema::email_templates_table(), $data, [ 'id' => $id ], null, [ '%d' ] );

		return false !== $updated;
	}

	public function delete( int $id ): bool {
		global $wpdb;

		return false !== $wpdb->delete( Schema::email_templates_table(), [ 'id' => $id ], [ '%d' ] );
	}

	public function duplicate( int $id ): int {
		global $wpdb;

		$source = $this->find( $id );
		if ( null === $source ) {
			return 0;
		}

		$now = current_time( 'mysql', true );
		$wpdb->insert(
			Schema::email_templates_table(),
			[
				/* translators: %s: title of the template being duplicated. */
				'title'      => sprintf( __( '%s (copy)', 'flexa-formflow' ), $source->title ),
				'tree'       => (string) wp_json_encode( $source->tree ),
				'created_at' => $now,
				'updated_at' => $now,
			],
			[ '%s', '%s', '%s', '%s' ]
		);

		return (int) $wpdb->insert_id;
	}
}
