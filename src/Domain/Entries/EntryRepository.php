<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Domain\Entries;

use Flexa\FormFlow\Concerns\HasInstance;
use Flexa\FormFlow\Database\Schema;

defined( 'ABSPATH' ) || exit;

// phpcs:disable WordPress.DB.DirectDatabaseQuery -- data-access class for our own tables; every query goes through $wpdb->prepare() (table names via %i).

final class EntryRepository {
	use HasInstance;

	public function find( int $id ): ?Entry {
		global $wpdb;

		$table = Schema::entries_table();
		$row   = $wpdb->get_row( $wpdb->prepare( 'SELECT * FROM %i WHERE id = %d', $table, $id ), ARRAY_A );

		return is_array( $row ) ? Entry::from_row( $row ) : null;
	}

	/**
	 * @param array<string, mixed> $args
	 * @return array{items: list<Entry>, total: int}
	 */
	public function all( array $args = [] ): array {
		global $wpdb;

		$table    = Schema::entries_table();
		$form_id  = max( 0, (int) ( $args['form_id'] ?? 0 ) );
		$status   = (string) ( $args['status'] ?? '' );
		$page     = max( 1, (int) ( $args['page'] ?? 1 ) );
		$per_page = max( 1, min( 100, (int) ( $args['per_page'] ?? 20 ) ) );

		// Filters are fixed SQL that switch themselves off: `0 = %d` is true when
		// no form is chosen, `'' = %s` when no status is. Nothing is interpolated.
		$status = in_array( $status, [ 'unread', 'read' ], true ) ? $status : '';

		$total = (int) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM %i WHERE ( 0 = %d OR form_id = %d ) AND ( '' = %s OR status = %s )",
				$table,
				$form_id,
				$form_id,
				$status,
				$status
			)
		);

		$offset = ( $page - 1 ) * $per_page;
		$rows   = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM %i WHERE ( 0 = %d OR form_id = %d ) AND ( '' = %s OR status = %s ) ORDER BY created_at DESC, id DESC LIMIT %d OFFSET %d",
				$table,
				$form_id,
				$form_id,
				$status,
				$status,
				$per_page,
				$offset
			),
			ARRAY_A
		);

		$items = [];
		foreach ( is_array( $rows ) ? $rows : [] as $row ) {
			$items[] = Entry::from_row( $row );
		}

		return [
			'items' => $items,
			'total' => $total,
		];
	}

	/**
	 * @param array<string, mixed> $data
	 * @param array<string, mixed> $meta
	 */
	public function create( int $form_id, array $data, array $meta = [] ): int {
		global $wpdb;

		$wpdb->insert(
			Schema::entries_table(),
			[
				'form_id'    => $form_id,
				'status'     => 'unread',
				'data'       => (string) wp_json_encode( $data ),
				'meta'       => (string) wp_json_encode( $meta ),
				'created_at' => current_time( 'mysql', true ),
			],
			[ '%d', '%s', '%s', '%s', '%s' ]
		);

		return (int) $wpdb->insert_id;
	}

	/**
	 * Append an event to the entry's activity log (kept in the meta column, last
	 * 50 events). Powers the delivery timeline on the entry detail screen.
	 *
	 * @param array<string, mixed> $event
	 */
	public function append_activity( int $id, array $event ): void {
		global $wpdb;

		$entry = $this->find( $id );
		if ( null === $entry ) {
			return;
		}

		$meta             = $entry->meta;
		$activity         = isset( $meta['activity'] ) && is_array( $meta['activity'] ) ? $meta['activity'] : [];
		$activity[]       = $event;
		$meta['activity'] = array_slice( $activity, -50 );

		$wpdb->update(
			Schema::entries_table(),
			[ 'meta' => (string) wp_json_encode( $meta ) ],
			[ 'id' => $id ],
			[ '%s' ],
			[ '%d' ]
		);
	}

	public function set_status( int $id, string $status ): bool {
		global $wpdb;

		if ( ! in_array( $status, [ 'unread', 'read' ], true ) ) {
			return false;
		}

		$updated = $wpdb->update(
			Schema::entries_table(),
			[ 'status' => $status ],
			[ 'id' => $id ],
			[ '%s' ],
			[ '%d' ]
		);

		return false !== $updated;
	}

	public function delete( int $id ): bool {
		global $wpdb;

		return false !== $wpdb->delete( Schema::entries_table(), [ 'id' => $id ], [ '%d' ] );
	}

	/**
	 * @return array{total: int, unread: int, last_7_days: int}
	 */
	public function counts(): array {
		global $wpdb;

		$table = Schema::entries_table();

		return [
			'total'       => (int) $wpdb->get_var( $wpdb->prepare( 'SELECT COUNT(*) FROM %i', $table ) ),
			'unread'      => (int) $wpdb->get_var( $wpdb->prepare( 'SELECT COUNT(*) FROM %i WHERE status = %s', $table, 'unread' ) ),
			'last_7_days' => (int) $wpdb->get_var(
				$wpdb->prepare( 'SELECT COUNT(*) FROM %i WHERE created_at >= %s', $table, gmdate( 'Y-m-d H:i:s', time() - 7 * DAY_IN_SECONDS ) )
			),
		];
	}
}
