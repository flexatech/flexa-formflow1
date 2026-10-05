<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Integrations;

use Flexa\FormFlow\Extensions\Registry;

defined( 'ABSPATH' ) || exit;

/**
 * Stored connection values for integration connect forms. Free owns the
 * storage; an add-on describes the fields (via the extension registry) and
 * reads the saved values at runtime with {@see self::get()}.
 *
 * Values are keyed by integration id (a Catalog card id) then by field key.
 * Secret fields (API keys) are never returned to the client: {@see
 * self::public_view()} strips them and reports only whether each is set, and a
 * save with an empty secret keeps the previously stored value.
 */
final class Connections {
	private const OPTION = 'flexa_formflow_connections';

	/**
	 * Raw stored values for one integration (secrets included). For runtime use
	 * by an add-on, not for the client.
	 *
	 * @return array<string, mixed>
	 */
	public static function get( string $id ): array {
		$all = self::all();

		return $all[ $id ] ?? [];
	}

	/**
	 * @return array<string, array<string, mixed>>
	 */
	public static function all(): array {
		$stored = get_option( self::OPTION, [] );
		if ( ! is_array( $stored ) ) {
			return [];
		}

		$out = [];
		foreach ( $stored as $id => $values ) {
			if ( is_string( $id ) && is_array( $values ) ) {
				$out[ $id ] = $values;
			}
		}

		return $out;
	}

	/**
	 * Merge incoming values over the stored connection, deep-sanitizing and
	 * preserving any secret the client left blank. Returns the client-safe view.
	 *
	 * @param array<string, mixed> $incoming
	 * @return array<string, mixed>
	 */
	public static function save( string $id, array $incoming ): array {
		$stored  = self::get( $id );
		$secrets = self::secret_keys( $id );
		$allowed = self::field_keys( $id );

		$merged = $stored;
		foreach ( $incoming as $key => $value ) {
			$key = sanitize_key( (string) $key );

			// Only accept keys the integration actually declares.
			if ( '' === $key || ! in_array( $key, $allowed, true ) ) {
				continue;
			}

			// A blank secret means "keep what is stored"; never overwrite with empty.
			if ( in_array( $key, $secrets, true ) && '' === self::flatten( $value ) ) {
				continue;
			}

			$merged[ $key ] = self::sanitize_value( $value );
		}

		$all         = self::all();
		$all[ $id ]  = $merged;
		update_option( self::OPTION, $all );

		return self::public_view( $id );
	}

	/**
	 * Client-safe view: non-secret values verbatim, secrets replaced by a
	 * boolean in `secrets`, and a `connected` flag when anything is stored.
	 *
	 * @return array{connected: bool, values: array<string, mixed>, secrets: array<string, bool>}
	 */
	public static function public_view( string $id ): array {
		$stored  = self::get( $id );
		$secrets = self::secret_keys( $id );

		$values      = [];
		$secret_flags = [];
		foreach ( $stored as $key => $value ) {
			if ( in_array( $key, $secrets, true ) ) {
				$secret_flags[ $key ] = '' !== self::flatten( $value );
				continue;
			}
			$values[ $key ] = $value;
		}
		foreach ( $secrets as $key ) {
			$secret_flags[ $key ] = $secret_flags[ $key ] ?? false;
		}

		return [
			'connected' => [] !== $stored,
			'values'    => $values,
			'secrets'   => $secret_flags,
		];
	}

	/**
	 * The keys of the integration's secret fields, from its descriptor.
	 *
	 * @return list<string>
	 */
	private static function secret_keys( string $id ): array {
		$fields = Registry::connection_fields( $id );
		if ( null === $fields ) {
			return [];
		}

		$keys = [];
		foreach ( $fields as $field ) {
			if ( ! empty( $field['secret'] ) && isset( $field['key'] ) ) {
				$keys[] = (string) $field['key'];
			}
		}

		return $keys;
	}

	/**
	 * Every field key the integration declares, so a save cannot smuggle in keys
	 * the descriptor never defined.
	 *
	 * @return list<string>
	 */
	private static function field_keys( string $id ): array {
		$fields = Registry::connection_fields( $id );
		if ( null === $fields ) {
			return [];
		}

		$keys = [];
		foreach ( $fields as $field ) {
			if ( isset( $field['key'] ) ) {
				$keys[] = (string) $field['key'];
			}
		}

		return $keys;
	}

	/**
	 * @param mixed $value
	 * @return mixed
	 */
	private static function sanitize_value( $value ) {
		if ( is_array( $value ) ) {
			$out = [];
			foreach ( $value as $k => $v ) {
				$out[ is_string( $k ) ? sanitize_key( $k ) : (int) $k ] = self::sanitize_value( $v );
			}

			return $out;
		}
		if ( is_bool( $value ) || is_int( $value ) || is_float( $value ) ) {
			return $value;
		}

		return sanitize_textarea_field( (string) $value );
	}

	/**
	 * @param mixed $value
	 */
	private static function flatten( $value ): string {
		if ( is_array( $value ) ) {
			return trim( implode( '', array_map( 'strval', $value ) ) );
		}

		return trim( (string) $value );
	}
}
