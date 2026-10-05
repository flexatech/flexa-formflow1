<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Domain\Forms;

defined( 'ABSPATH' ) || exit;

final class Form {
	public function __construct(
		public readonly int $id,
		public readonly string $uuid,
		public readonly string $title,
		public readonly string $status,
		/** @var array<string, mixed> */
		public readonly array $config,
		public readonly string $created_at,
		public readonly string $updated_at,
	) {}

	/**
	 * @param array<string, mixed> $row
	 */
	public static function from_row( array $row ): self {
		$config = json_decode( (string) ( $row['config'] ?? '' ), true );

		return new self(
			id: (int) ( $row['id'] ?? 0 ),
			uuid: (string) ( $row['uuid'] ?? '' ),
			title: (string) ( $row['title'] ?? '' ),
			status: (string) ( $row['status'] ?? 'draft' ),
			config: is_array( $config ) ? $config : [],
			created_at: (string) ( $row['created_at'] ?? '' ),
			updated_at: (string) ( $row['updated_at'] ?? '' ),
		);
	}

	public function is_published(): bool {
		return 'published' === $this->status;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function fields(): array {
		$fields = $this->config['fields'] ?? [];
		return is_array( $fields ) ? array_values( array_filter( $fields, 'is_array' ) ) : [];
	}

	/**
	 * @return array<string, mixed>
	 */
	public function settings(): array {
		$settings = $this->config['settings'] ?? [];
		return is_array( $settings ) ? $settings : [];
	}

	/**
	 * @return array<string, mixed>
	 */
	public function notifications(): array {
		$notifications = $this->config['notifications'] ?? [];
		return is_array( $notifications ) ? $notifications : [];
	}

	/**
	 * @return array<string, mixed>
	 */
	public function to_array(): array {
		return [
			'id'         => $this->id,
			'uuid'       => $this->uuid,
			'title'      => $this->title,
			'status'     => $this->status,
			'config'     => $this->config,
			'created_at' => $this->created_at,
			'updated_at' => $this->updated_at,
		];
	}
}
