<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Domain\Entries;

defined( 'ABSPATH' ) || exit;

final class Entry {
	public function __construct(
		public readonly int $id,
		public readonly int $form_id,
		public readonly string $status,
		/** @var array<string, mixed> */
		public readonly array $data,
		/** @var array<string, mixed> */
		public readonly array $meta,
		public readonly string $created_at,
	) {}

	/**
	 * @param array<string, mixed> $row
	 */
	public static function from_row( array $row ): self {
		$data = json_decode( (string) ( $row['data'] ?? '' ), true );
		$meta = json_decode( (string) ( $row['meta'] ?? '' ), true );

		return new self(
			id: (int) ( $row['id'] ?? 0 ),
			form_id: (int) ( $row['form_id'] ?? 0 ),
			status: (string) ( $row['status'] ?? 'unread' ),
			data: is_array( $data ) ? $data : [],
			meta: is_array( $meta ) ? $meta : [],
			created_at: (string) ( $row['created_at'] ?? '' ),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public function to_array(): array {
		return [
			'id'         => $this->id,
			'form_id'    => $this->form_id,
			'status'     => $this->status,
			'data'       => $this->data,
			'meta'       => $this->meta,
			'created_at' => $this->created_at,
		];
	}
}
