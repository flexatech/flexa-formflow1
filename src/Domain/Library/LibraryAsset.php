<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Domain\Library;

defined( 'ABSPATH' ) || exit;

/**
 * A saved reusable asset in My Library: a pattern (field group / email
 * section), a template (whole form / email) or a recipe (whole workflow). The
 * source_* fields record which pack an imported asset came from so a Pack
 * update can diff against the user's copy.
 */
final class LibraryAsset {
	public function __construct(
		public readonly int $id,
		public readonly string $uuid,
		public readonly string $type,
		public readonly string $name,
		public readonly string $kind,
		/** @var array<string, mixed> */
		public readonly array $payload,
		public readonly string $source_pack,
		public readonly string $source_content_id,
		public readonly string $source_version,
		public readonly string $source_hash,
		public readonly string $created_at,
		public readonly string $updated_at,
	) {}

	/**
	 * @param array<string, mixed> $row
	 */
	public static function from_row( array $row ): self {
		$payload = json_decode( (string) ( $row['payload'] ?? '' ), true );

		return new self(
			id: (int) ( $row['id'] ?? 0 ),
			uuid: (string) ( $row['uuid'] ?? '' ),
			type: (string) ( $row['type'] ?? 'pattern' ),
			name: (string) ( $row['name'] ?? '' ),
			kind: (string) ( $row['kind'] ?? 'form' ),
			payload: is_array( $payload ) ? $payload : [],
			source_pack: (string) ( $row['source_pack'] ?? '' ),
			source_content_id: (string) ( $row['source_content_id'] ?? '' ),
			source_version: (string) ( $row['source_version'] ?? '' ),
			source_hash: (string) ( $row['source_hash'] ?? '' ),
			created_at: (string) ( $row['created_at'] ?? '' ),
			updated_at: (string) ( $row['updated_at'] ?? '' ),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public function to_array(): array {
		return [
			'id'         => $this->id,
			'uuid'       => $this->uuid,
			'type'       => $this->type,
			'name'       => $this->name,
			'kind'       => $this->kind,
			'payload'    => $this->payload,
			'source'     => [
				'pack'      => $this->source_pack,
				'contentId' => $this->source_content_id,
				'version'   => $this->source_version,
			],
			'created_at' => $this->created_at,
			'updated_at' => $this->updated_at,
		];
	}
}
