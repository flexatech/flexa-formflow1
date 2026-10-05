<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Support;

defined( 'ABSPATH' ) || exit;

/**
 * Authenticated symmetric encryption (AES-256-GCM) for the AI provider API key
 * before it lands in the `flexa_formflow_settings` option.
 *
 * GCM (not CBC) so a tampered ciphertext fails to decrypt instead of returning
 * garbage. The key is derived from the site's WordPress salts unless the host
 * defines FLEXA_FORMFLOW_ENCRYPTION_KEY; either way it never ships in the DB, so
 * a database-only leak does not expose the secret.
 *
 * Ciphertext format: "ffg1:" . base64( iv[12] . tag[16] . ciphertext ).
 */
final class Encryption {
	private const PREFIX  = 'ffg1:';
	private const CIPHER  = 'aes-256-gcm';
	private const IV_LEN  = 12;
	private const TAG_LEN = 16;

	public static function is_encrypted( string $value ): bool {
		return str_starts_with( $value, self::PREFIX );
	}

	public static function encrypt( string $plain ): string {
		if ( '' === $plain ) {
			return '';
		}

		$iv  = random_bytes( self::IV_LEN );
		$tag = '';
		$out = openssl_encrypt( $plain, self::CIPHER, self::key(), OPENSSL_RAW_DATA, $iv, $tag, '', self::TAG_LEN );

		if ( false === $out ) {
			return '';
		}

		return self::PREFIX . base64_encode( $iv . $tag . $out );
	}

	public static function decrypt( string $payload ): string {
		if ( ! self::is_encrypted( $payload ) ) {
			// Not encrypted (a value written before encryption, or a raw
			// default) — hand it back unchanged.
			return $payload;
		}

		// Decodes our own AES-256-GCM ciphertext (stored API keys), not code.
		$raw = base64_decode( substr( $payload, strlen( self::PREFIX ) ), true );
		if ( false === $raw || strlen( $raw ) <= self::IV_LEN + self::TAG_LEN ) {
			return '';
		}

		$iv     = substr( $raw, 0, self::IV_LEN );
		$tag    = substr( $raw, self::IV_LEN, self::TAG_LEN );
		$cipher = substr( $raw, self::IV_LEN + self::TAG_LEN );

		$out = openssl_decrypt( $cipher, self::CIPHER, self::key(), OPENSSL_RAW_DATA, $iv, $tag );

		return false === $out ? '' : $out;
	}

	private static function key(): string {
		if ( defined( 'FLEXA_FORMFLOW_ENCRYPTION_KEY' ) && is_string( FLEXA_FORMFLOW_ENCRYPTION_KEY ) && '' !== FLEXA_FORMFLOW_ENCRYPTION_KEY ) {
			return hash( 'sha256', FLEXA_FORMFLOW_ENCRYPTION_KEY, true );
		}

		$salt = function_exists( 'wp_salt' ) ? wp_salt( 'secure_auth' ) : 'flexa-formflow-insecure-fallback';

		// 32 raw bytes for AES-256.
		return hash( 'sha256', 'flexa-formflow|' . $salt, true );
	}
}
