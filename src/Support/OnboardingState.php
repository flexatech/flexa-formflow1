<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Support;

defined( 'ABSPATH' ) || exit;

/**
 * First-run guide state: one option, status plus server-stamped timestamps.
 * The client only ever submits a status; the clock is never trusted from the
 * request. `coerce()` repairs a hand-edited or corrupt option on read.
 */
final class OnboardingState {
	public const OPTION_KEY = 'flexa_formflow_onboarding';

	private const VERSION = 1;

	private const STATUSES = [ 'pending', 'in_progress', 'completed', 'dismissed' ];

	/**
	 * @return array<string, mixed>
	 */
	public static function defaults(): array {
		return [
			'version'      => self::VERSION,
			'status'       => 'pending',
			'started_at'   => null,
			'completed_at' => null,
			'dismissed_at' => null,
		];
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function all(): array {
		$stored = get_option( self::OPTION_KEY, [] );

		return self::coerce( is_array( $stored ) ? $stored : [] );
	}

	public static function is_finished(): bool {
		return in_array( self::all()['status'], [ 'completed', 'dismissed' ], true );
	}

	/**
	 * @param array<string, mixed> $partial
	 * @return array<string, mixed>
	 */
	public static function update( array $partial ): array {
		$next  = self::all();
		$clean = self::sanitize( $partial );
		if ( isset( $clean['status'] ) ) {
			$next['status'] = $clean['status'];
		}

		// Timestamps stamp once per transition and never re-stamp.
		if ( 'in_progress' === $next['status'] && null === $next['started_at'] ) {
			$next['started_at'] = time();
		}
		if ( 'completed' === $next['status'] && null === $next['completed_at'] ) {
			$next['completed_at'] = time();
		}
		if ( 'dismissed' === $next['status'] && null === $next['dismissed_at'] ) {
			$next['dismissed_at'] = time();
		}

		$next['version'] = self::VERSION;
		update_option( self::OPTION_KEY, $next );

		return self::coerce( $next );
	}

	/**
	 * Allowlist: only a recognised status survives; everything else is dropped.
	 *
	 * @param array<string, mixed> $incoming
	 * @return array<string, mixed>
	 */
	public static function sanitize( array $incoming ): array {
		$clean = [];
		if ( array_key_exists( 'status', $incoming ) ) {
			$status = is_scalar( $incoming['status'] ) ? (string) $incoming['status'] : '';
			if ( in_array( $status, self::STATUSES, true ) ) {
				$clean['status'] = $status;
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
		if ( isset( $stored['status'] ) && in_array( $stored['status'], self::STATUSES, true ) ) {
			$out['status'] = $stored['status'];
		}
		foreach ( [ 'started_at', 'completed_at', 'dismissed_at' ] as $ts ) {
			if ( isset( $stored[ $ts ] ) && is_numeric( $stored[ $ts ] ) ) {
				$out[ $ts ] = (int) $stored[ $ts ];
			}
		}
		$out['version'] = self::VERSION;

		return $out;
	}
}
