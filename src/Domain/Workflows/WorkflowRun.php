<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Domain\Workflows;

defined( 'ABSPATH' ) || exit;

/**
 * A single recorded workflow run: the overall outcome plus the per-step log the
 * engine produced. The log mirrors the shape the test runner returns, so the
 * Logs tab renders it the same way the canvas trail does.
 */
final class WorkflowRun {
	public function __construct(
		public readonly int $id,
		public readonly int $workflow_id,
		public readonly int $entry_id,
		public readonly int $form_id,
		public readonly string $status,
		/** @var list<array{type: string, status: string, detail: string}> */
		public readonly array $log,
		public readonly string $created_at,
	) {}

	/**
	 * @param array<string, mixed> $row
	 */
	public static function from_row( array $row ): self {
		$log   = json_decode( (string) ( $row['log'] ?? '' ), true );
		$clean = [];
		foreach ( is_array( $log ) ? $log : [] as $step ) {
			if ( ! is_array( $step ) ) {
				continue;
			}
			$clean[] = [
				'type'   => (string) ( $step['type'] ?? '' ),
				'status' => (string) ( $step['status'] ?? '' ),
				'detail' => (string) ( $step['detail'] ?? '' ),
			];
		}

		return new self(
			id: (int) ( $row['id'] ?? 0 ),
			workflow_id: (int) ( $row['workflow_id'] ?? 0 ),
			entry_id: (int) ( $row['entry_id'] ?? 0 ),
			form_id: (int) ( $row['form_id'] ?? 0 ),
			status: (string) ( $row['status'] ?? 'ok' ),
			log: $clean,
			created_at: (string) ( $row['created_at'] ?? '' ),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public function to_array(): array {
		return [
			'id'          => $this->id,
			'workflow_id' => $this->workflow_id,
			'entry_id'    => $this->entry_id,
			'form_id'     => $this->form_id,
			'status'      => $this->status,
			'log'         => $this->log,
			'created_at'  => $this->created_at,
		];
	}
}
