<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Domain\Workflows;

use Flexa\FormFlow\Concerns\HasInstance;
use Flexa\FormFlow\Database\Schema;

defined( 'ABSPATH' ) || exit;

// phpcs:disable WordPress.DB.DirectDatabaseQuery -- data-access class for our own tables; every query goes through $wpdb->prepare() (table names via %i).

final class WorkflowRepository {
	use HasInstance;

	public function find( int $id ): ?Workflow {
		global $wpdb;

		$table = Schema::workflows_table();
		$row   = $wpdb->get_row( $wpdb->prepare( 'SELECT * FROM %i WHERE id = %d', $table, $id ), ARRAY_A );

		return is_array( $row ) ? Workflow::from_row( $row ) : null;
	}

	/**
	 * @return list<Workflow>
	 */
	public function all(): array {
		global $wpdb;

		$table = Schema::workflows_table();
		$rows  = $wpdb->get_results( $wpdb->prepare( 'SELECT * FROM %i ORDER BY updated_at DESC, id DESC', $table ), ARRAY_A );

		$items = [];
		foreach ( is_array( $rows ) ? $rows : [] as $row ) {
			$items[] = Workflow::from_row( $row );
		}

		return $items;
	}

	/**
	 * Active workflows only, for the engine.
	 *
	 * @return list<Workflow>
	 */
	public function active(): array {
		global $wpdb;

		$table = Schema::workflows_table();
		$rows  = $wpdb->get_results(
			$wpdb->prepare( 'SELECT * FROM %i WHERE status = %s ORDER BY id ASC', $table, 'active' ),
			ARRAY_A
		);

		$items = [];
		foreach ( is_array( $rows ) ? $rows : [] as $row ) {
			$items[] = Workflow::from_row( $row );
		}

		return $items;
	}

	/**
	 * @param array<string, mixed> $config
	 */
	public function create( string $title, array $config = [] ): int {
		global $wpdb;

		$now = current_time( 'mysql', true );
		$wpdb->insert(
			Schema::workflows_table(),
			[
				'title'      => sanitize_text_field( $title ),
				'status'     => 'inactive',
				'config'     => (string) wp_json_encode( WorkflowSanitizer::sanitize( $config ) ),
				'created_at' => $now,
				'updated_at' => $now,
			],
			[ '%s', '%s', '%s', '%s', '%s' ]
		);

		return (int) $wpdb->insert_id;
	}

	/**
	 * Partial update: only the passed keys change.
	 *
	 * @param array<string, mixed> $fields
	 */
	public function update( int $id, array $fields ): bool {
		global $wpdb;

		$data = [];
		if ( array_key_exists( 'title', $fields ) ) {
			$data['title'] = sanitize_text_field( (string) $fields['title'] );
		}
		if ( array_key_exists( 'status', $fields ) && in_array( $fields['status'], [ 'active', 'inactive' ], true ) ) {
			$data['status'] = (string) $fields['status'];
		}
		if ( array_key_exists( 'config', $fields ) && is_array( $fields['config'] ) ) {
			$data['config'] = (string) wp_json_encode( WorkflowSanitizer::sanitize( $fields['config'] ) );
		}
		if ( [] === $data ) {
			return false;
		}
		$data['updated_at'] = current_time( 'mysql', true );

		$updated = $wpdb->update( Schema::workflows_table(), $data, [ 'id' => $id ], null, [ '%d' ] );

		return false !== $updated;
	}

	public function delete( int $id ): bool {
		global $wpdb;

		return false !== $wpdb->delete( Schema::workflows_table(), [ 'id' => $id ], [ '%d' ] );
	}

	public function count(): int {
		global $wpdb;

		$table = Schema::workflows_table();

		return (int) $wpdb->get_var( $wpdb->prepare( 'SELECT COUNT(*) FROM %i', $table ) );
	}
}
