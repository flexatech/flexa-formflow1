<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Domain\Library;

use Flexa\FormFlow\Concerns\HasInstance;
use Flexa\FormFlow\Database\Schema;

defined( 'ABSPATH' ) || exit;

// phpcs:disable WordPress.DB.DirectDatabaseQuery -- data-access class for our own tables; every query goes through $wpdb->prepare() (table names via %i).

final class LibraryRepository {
	use HasInstance;

	public const TYPES = [ 'pattern', 'template', 'recipe' ];
	public const KINDS = [ 'form', 'email', 'workflow', 'woocommerce' ];

	public function find( int $id ): ?LibraryAsset {
		global $wpdb;

		$table = Schema::library_table();
		$row   = $wpdb->get_row( $wpdb->prepare( 'SELECT * FROM %i WHERE id = %d', $table, $id ), ARRAY_A );

		return is_array( $row ) ? LibraryAsset::from_row( $row ) : null;
	}

	/**
	 * @return list<LibraryAsset>
	 */
	public function all(): array {
		global $wpdb;

		$table = Schema::library_table();
		$rows  = $wpdb->get_results( $wpdb->prepare( 'SELECT * FROM %i ORDER BY updated_at DESC, id DESC', $table ), ARRAY_A );

		$items = [];
		foreach ( is_array( $rows ) ? $rows : [] as $row ) {
			$items[] = LibraryAsset::from_row( $row );
		}

		return $items;
	}

	/**
	 * The provenance lookup a Pack import uses to link (not duplicate) a shared
	 * pattern that another pack already installed.
	 */
	public function find_by_source( string $pack, string $content_id ): ?LibraryAsset {
		global $wpdb;

		if ( '' === $pack || '' === $content_id ) {
			return null;
		}

		$table = Schema::library_table();
		$row   = $wpdb->get_row(
			$wpdb->prepare(
				'SELECT * FROM %i WHERE source_pack = %s AND source_content_id = %s LIMIT 1',
				$table,
				$pack,
				$content_id
			),
			ARRAY_A
		);

		return is_array( $row ) ? LibraryAsset::from_row( $row ) : null;
	}

	/**
	 * Dedupe lookup by content id alone: a shared pattern keeps the same content
	 * id across packs, so once any pack has installed it we link rather than
	 * duplicate. Distinct from {@see find_by_source}, which is pack-scoped.
	 */
	public function find_by_content_id( string $content_id ): ?LibraryAsset {
		global $wpdb;

		if ( '' === $content_id ) {
			return null;
		}

		$table = Schema::library_table();
		$row   = $wpdb->get_row(
			$wpdb->prepare(
				'SELECT * FROM %i WHERE source_content_id = %s LIMIT 1',
				$table,
				$content_id
			),
			ARRAY_A
		);

		return is_array( $row ) ? LibraryAsset::from_row( $row ) : null;
	}

	/**
	 * @param array<string, mixed> $payload
	 * @param array{pack?: string, contentId?: string, version?: string} $source
	 */
	public function create( string $type, string $name, string $kind, array $payload, array $source = [] ): int {
		global $wpdb;

		$now  = current_time( 'mysql', true );
		$pack = sanitize_text_field( (string) ( $source['pack'] ?? '' ) );
		$wpdb->insert(
			Schema::library_table(),
			[
				'uuid'              => wp_generate_uuid4(),
				'type'              => self::normalize_type( $type ),
				'name'              => sanitize_text_field( $name ),
				'kind'              => self::normalize_kind( $kind ),
				'payload'           => (string) wp_json_encode( $payload ),
				'source_pack'       => $pack,
				'source_content_id' => sanitize_text_field( (string) ( $source['contentId'] ?? '' ) ),
				'source_version'    => sanitize_text_field( (string) ( $source['version'] ?? '' ) ),
				// Stamp the install-time payload hash only for pack content, so a
				// later Pack update can tell an untouched copy from a modified one.
				'source_hash'       => '' !== $pack ? self::hash( $payload ) : '',
				'created_at'        => $now,
				'updated_at'        => $now,
			],
			[ '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s' ]
		);

		return (int) $wpdb->insert_id;
	}

	/**
	 * Update a saved asset's name and/or payload. When the payload changes on a
	 * pack-sourced item, the caller also passes the new source_version / source_hash
	 * so the item stops reading as out of date. Only whitelisted columns are written.
	 *
	 * @param array{name?: string, payload?: array<string, mixed>, source_version?: string, source_hash?: string} $fields
	 */
	public function update( int $id, array $fields ): bool {
		global $wpdb;

		$data    = [ 'updated_at' => current_time( 'mysql', true ) ];
		$formats = [ '%s' ];

		if ( array_key_exists( 'name', $fields ) ) {
			$data['name'] = sanitize_text_field( (string) $fields['name'] );
			$formats[]    = '%s';
		}
		if ( array_key_exists( 'payload', $fields ) ) {
			$data['payload'] = (string) wp_json_encode( $fields['payload'] );
			$formats[]       = '%s';
		}
		if ( array_key_exists( 'source_version', $fields ) ) {
			$data['source_version'] = sanitize_text_field( (string) $fields['source_version'] );
			$formats[]              = '%s';
		}
		if ( array_key_exists( 'source_hash', $fields ) ) {
			$data['source_hash'] = sanitize_text_field( (string) $fields['source_hash'] );
			$formats[]           = '%s';
		}

		return false !== $wpdb->update( Schema::library_table(), $data, [ 'id' => $id ], $formats, [ '%d' ] );
	}

	/**
	 * Every saved asset installed by a given pack, for the update diff.
	 *
	 * @return list<LibraryAsset>
	 */
	public function all_by_source_pack( string $pack ): array {
		global $wpdb;

		if ( '' === $pack ) {
			return [];
		}

		$table = Schema::library_table();
		$rows  = $wpdb->get_results(
			$wpdb->prepare( 'SELECT * FROM %i WHERE source_pack = %s ORDER BY id ASC', $table, $pack ),
			ARRAY_A
		);

		$items = [];
		foreach ( is_array( $rows ) ? $rows : [] as $row ) {
			$items[] = LibraryAsset::from_row( $row );
		}

		return $items;
	}

	/**
	 * Canonical payload hash for modified-vs-untouched detection. Keys are
	 * sorted so a re-ordered but otherwise identical payload still matches.
	 *
	 * @param array<string, mixed> $payload
	 */
	public static function hash( array $payload ): string {
		return hash( 'sha256', (string) wp_json_encode( self::normalize_for_hash( $payload ) ) );
	}

	/**
	 * Recursively sort array keys so hashing is order-insensitive for maps while
	 * keeping list order (lists are already positional and meaningful).
	 *
	 * @param array<array-key, mixed> $value
	 * @return array<array-key, mixed>
	 */
	private static function normalize_for_hash( array $value ): array {
		$is_list = array_is_list( $value );
		if ( ! $is_list ) {
			ksort( $value );
		}
		foreach ( $value as $key => $item ) {
			if ( is_array( $item ) ) {
				$value[ $key ] = self::normalize_for_hash( $item );
			}
		}

		return $value;
	}

	public function delete( int $id ): bool {
		global $wpdb;

		return false !== $wpdb->delete( Schema::library_table(), [ 'id' => $id ], [ '%d' ] );
	}

	public function count(): int {
		global $wpdb;

		$table = Schema::library_table();

		return (int) $wpdb->get_var( $wpdb->prepare( 'SELECT COUNT(*) FROM %i', $table ) );
	}

	private static function normalize_type( string $type ): string {
		return in_array( $type, self::TYPES, true ) ? $type : 'pattern';
	}

	private static function normalize_kind( string $kind ): string {
		return in_array( $kind, self::KINDS, true ) ? $kind : 'form';
	}
}
