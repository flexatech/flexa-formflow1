<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Support;

defined( 'ABSPATH' ) || exit;

/**
 * Single source of truth for the `flexa_formflow_settings` option: typed
 * schema, defaults, coerced reads, and the sanitizer used on every write.
 * REST and renderers both go through here so the schema can never drift.
 * Saves are partial-merge: sanitize the incoming keys, merge over stored.
 *
 * The AI API key is a secret: stored encrypted, decrypted only in all() for
 * outbound calls, and masked in for_rest() so the plaintext never reaches the
 * browser.
 */
final class Settings {
	public const OPTION_KEY = 'flexa_formflow_settings';

	/** Sent to the browser in place of a stored key; ignored on the way back. */
	public const SECRET_MASK = '__ff_secret__';

	private const AI_PROVIDERS = [ 'anthropic', 'openai', 'gemini' ];

	private const BOOL_KEYS = [
		'delete_data_on_uninstall',
	];

	private const STRING_KEYS = [
		'brand_color',
		'background_color',
		'content_background',
		'text_color',
		'footer_text',
		'font_family',
		'ai_model',
	];

	// String keys emitted inside CSS; each is held to a strict shape on save and read.
	private const COLOR_KEYS = [
		'brand_color',
		'background_color',
		'content_background',
		'text_color',
	];

	private const INT_KEYS = [
		'container_width',
	];

	/**
	 * @return array<string, mixed>
	 */
	public static function defaults(): array {
		return [
			'delete_data_on_uninstall' => false,
			'brand_color'              => '#0f92f7',
			'background_color'         => '#f8fafc',
			'content_background'       => '#ffffff',
			'text_color'               => '#101828',
			'footer_text'              => '© {year} {site_title}',
			'font_family'              => 'Helvetica Neue, Helvetica, Arial, sans-serif',
			'container_width'          => 600,
			'ai_provider'              => 'anthropic',
			'ai_model'                 => '',
			'ai_api_key'               => '',
		];
	}

	/**
	 * Typed settings with the API key decrypted (for outbound API calls).
	 *
	 * @return array<string, mixed>
	 */
	public static function all(): array {
		$raw               = self::raw();
		$raw['ai_api_key'] = Encryption::decrypt( (string) $raw['ai_api_key'] );

		return $raw;
	}

	/**
	 * Typed settings exactly as stored (API key still encrypted). The merge base
	 * for save(), so a partial save never rewrites the ciphertext as plaintext.
	 *
	 * @return array<string, mixed>
	 */
	public static function raw(): array {
		$stored = get_option( self::OPTION_KEY, [] );
		if ( ! is_array( $stored ) ) {
			$stored = [];
		}

		return self::coerce( $stored );
	}

	public static function get( string $key ): mixed {
		return self::all()[ $key ] ?? null;
	}

	/**
	 * Browser-safe settings: the API key is masked to a sentinel so the
	 * plaintext never leaves the server, while the UI still knows one is set.
	 *
	 * @return array<string, mixed>
	 */
	public static function for_rest(): array {
		$all               = self::all();
		$all['ai_api_key'] = '' !== (string) $all['ai_api_key'] ? self::SECRET_MASK : '';

		return $all;
	}

	/**
	 * Sanitize a (possibly partial) payload, merge over stored, persist, fire
	 * the update hook. Returns the new settings (browser-safe shape).
	 *
	 * @param array<string, mixed> $incoming
	 * @return array<string, mixed>
	 */
	public static function save( array $incoming ): array {
		$old   = self::all();
		$clean = self::sanitize( $incoming );
		$new   = array_merge( self::raw(), $clean );

		update_option( self::OPTION_KEY, $new );

		do_action( 'flexa_formflow.settings.updated', self::all(), $old );

		return self::for_rest();
	}

	/**
	 * @param array<string, mixed> $incoming
	 * @return array<string, mixed>
	 */
	public static function sanitize( array $incoming ): array {
		$clean = [];

		foreach ( self::BOOL_KEYS as $key ) {
			if ( array_key_exists( $key, $incoming ) ) {
				$clean[ $key ] = self::to_bool( $incoming[ $key ] );
			}
		}
		foreach ( self::STRING_KEYS as $key ) {
			if ( array_key_exists( $key, $incoming ) ) {
				$clean[ $key ] = self::clean_string( $key, is_string( $incoming[ $key ] ) ? sanitize_text_field( $incoming[ $key ] ) : '' );
			}
		}
		foreach ( self::INT_KEYS as $key ) {
			if ( array_key_exists( $key, $incoming ) ) {
				$clean[ $key ] = is_numeric( $incoming[ $key ] ) ? max( 320, min( 800, (int) $incoming[ $key ] ) ) : 600;
			}
		}

		if ( array_key_exists( 'ai_provider', $incoming ) ) {
			$provider             = is_string( $incoming['ai_provider'] ) ? $incoming['ai_provider'] : '';
			$clean['ai_provider'] = in_array( $provider, self::AI_PROVIDERS, true ) ? $provider : 'anthropic';
		}

		if ( array_key_exists( 'ai_api_key', $incoming ) && is_string( $incoming['ai_api_key'] ) ) {
			$value = trim( $incoming['ai_api_key'] );
			// The mask means "unchanged": leave the stored ciphertext alone.
			if ( self::SECRET_MASK !== $value ) {
				$clean['ai_api_key'] = '' === $value ? '' : Encryption::encrypt( $value );
			}
		}

		return $clean;
	}

	/**
	 * @param array<string, mixed> $stored
	 * @return array<string, mixed>
	 */
	private static function coerce( array $stored ): array {
		$out = self::defaults();

		foreach ( self::BOOL_KEYS as $key ) {
			if ( array_key_exists( $key, $stored ) ) {
				$out[ $key ] = self::to_bool( $stored[ $key ] );
			}
		}
		foreach ( self::STRING_KEYS as $key ) {
			if ( isset( $stored[ $key ] ) && is_string( $stored[ $key ] ) ) {
				$out[ $key ] = self::clean_string( $key, $stored[ $key ] );
			}
		}
		foreach ( self::INT_KEYS as $key ) {
			if ( isset( $stored[ $key ] ) && is_numeric( $stored[ $key ] ) ) {
				$out[ $key ] = (int) $stored[ $key ];
			}
		}

		if ( isset( $stored['ai_provider'] ) && in_array( $stored['ai_provider'], self::AI_PROVIDERS, true ) ) {
			$out['ai_provider'] = (string) $stored['ai_provider'];
		}
		if ( isset( $stored['ai_api_key'] ) && is_string( $stored['ai_api_key'] ) ) {
			$out['ai_api_key'] = $stored['ai_api_key'];
		}

		return $out;
	}

	/**
	 * Colors must be hex and the font stack plain names; an invalid value
	 * falls back to the default rather than reaching an inline style.
	 */
	private static function clean_string( string $key, string $value ): string {
		$default = (string) self::defaults()[ $key ];

		if ( in_array( $key, self::COLOR_KEYS, true ) ) {
			return Css::hex_color( $value, $default );
		}
		if ( 'font_family' === $key ) {
			return Css::font_stack( $value, $default );
		}

		return $value;
	}

	private static function to_bool( mixed $value ): bool {
		if ( is_string( $value ) ) {
			$value = strtolower( trim( $value ) );
			if ( in_array( $value, [ 'false', '0', '', 'off', 'no' ], true ) ) {
				return false;
			}
		}

		return (bool) $value;
	}
}
