<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Domain\Workflows;

use Flexa\FormFlow\Concerns\HasInstance;
use Flexa\FormFlow\Database\Schema;

defined( 'ABSPATH' ) || exit;

// phpcs:disable WordPress.DB.DirectDatabaseQuery -- data-access class for our own tables; every query goes through $wpdb->prepare() (table names via %i).

final class WorkflowRunRepository {
	use HasInstance;

	/** Newest runs kept per workflow; older rows are pruned after each record. */
	private const KEEP_PER_WORKFLOW = 100;

	/**
	 * Record one fired run and prune the workflow's history back to the cap.
	 *
	 * @param list<array{type: string, status: string, detail: string}> $log
	 */
	public function record( int $workflow_id, int $entry_id, int $form_id, string $status, array $log ): int {
		global $wpdb;

		$wpdb->insert(
			Schema::workflow_runs_table(),
			[
				'workflow_id' => $workflow_id,
				'entry_id'    => $entry_id,
				'form_id'     => $form_id,
				'status'      => $status,
				'log'         => (string) wp_json_encode( $log ),
				'created_at'  => current_time( 'mysql', true ),
			],
			[ '%d', '%d', '%d', '%s', '%s', '%s' ]
		);

		$id = (int) $wpdb->insert_id;
		$this->prune( $workflow_id );

		return $id;
	}

	/**
	 * Paginated run history for one workflow, newest first.
	 *
	 * @param array<string, mixed> $args
	 * @return array{items: list<WorkflowRun>, total: int}
	 */
	public function for_workflow( int $workflow_id, array $args = [] ): array {
		global $wpdb;

		$table    = Schema::workflow_runs_table();
		$page     = max( 1, (int) ( $args['page'] ?? 1 ) );
		$per_page = max( 1, min( 100, (int) ( $args['per_page'] ?? 25 ) ) );

		$total = (int) $wpdb->get_var(
			$wpdb->prepare( 'SELECT COUNT(*) FROM %i WHERE workflow_id = %d', $table, $workflow_id )
		);

		$offset = ( $page - 1 ) * $per_page;
		$rows   = $wpdb->get_results(
			$wpdb->prepare(
				'SELECT * FROM %i WHERE workflow_id = %d ORDER BY created_at DESC, id DESC LIMIT %d OFFSET %d',
				$table,
				$workflow_id,
				$per_page,
				$offset
			),
			ARRAY_A
		);

		$items = [];
		foreach ( is_array( $rows ) ? $rows : [] as $row ) {
			$items[] = WorkflowRun::from_row( $row );
		}

		return [
			'items' => $items,
			'total' => $total,
		];
	}

	public function delete_for_workflow( int $workflow_id ): int {
		global $wpdb;

		return (int) $wpdb->delete( Schema::workflow_runs_table(), [ 'workflow_id' => $workflow_id ], [ '%d' ] );
	}

	/**
	 * Drop everything older than the newest KEEP_PER_WORKFLOW rows for one
	 * workflow. Runs after each insert so the table stays bounded per workflow.
	 */
	private function prune( int $workflow_id ): void {
		global $wpdb;

		$table = Schema::workflow_runs_table();
		$keep  = self::KEEP_PER_WORKFLOW;

		$cutoff = $wpdb->get_var(
			$wpdb->prepare(
				'SELECT id FROM %i WHERE workflow_id = %d ORDER BY id DESC LIMIT 1 OFFSET %d',
				$table,
				$workflow_id,
				$keep
			)
		);
		if ( null === $cutoff ) {
			return;
		}

		$wpdb->query(
			$wpdb->prepare(
				'DELETE FROM %i WHERE workflow_id = %d AND id <= %d',
				$table,
				$workflow_id,
				(int) $cutoff
			)
		);
	}
}
