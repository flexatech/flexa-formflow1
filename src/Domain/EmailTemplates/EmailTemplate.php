<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Domain\EmailTemplates;

defined( 'ABSPATH' ) || exit;

final class EmailTemplate {
	public function __construct(
		public readonly int $id,
		public readonly string $title,
		/** @var array<string, mixed> */
		public readonly array $tree,
		public readonly string $created_at,
		public readonly string $updated_at,
	) {}

	/**
	 * @param array<string, mixed> $row
	 */
	public static function from_row( array $row ): self {
		$tree = json_decode( (string) ( $row['tree'] ?? '' ), true );

		return new self(
			id: (int) ( $row['id'] ?? 0 ),
			title: (string) ( $row['title'] ?? '' ),
			tree: is_array( $tree ) ? $tree : [],
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
			'title'      => $this->title,
			'tree'       => $this->tree,
			'created_at' => $this->created_at,
			'updated_at' => $this->updated_at,
		];
	}
}
