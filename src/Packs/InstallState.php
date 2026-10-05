<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Packs;

defined( 'ABSPATH' ) || exit;

/**
 * Records which packs have been installed, at what version, and which rows each
 * one created. The stamp drives the catalog's Installed / Update chip and lets
 * the importer refuse a duplicate install; the recorded ids let {@see Restorer}
 * tell "already installed" apart from "installed, then deleted", so a missing
 * item can be put back without duplicating what survived.
 *
 * Patterns are absent from the id map on purpose: they already carry provenance
 * in the library table and are found by their content id.
 *
 * One option, a flat map of pack id to install metadata.
 */
final class InstallState {
	public const OPTION_KEY = 'flexa_formflow_installed_packs';

	/**
	 * @return array<string, array<string, mixed>>
	 */
	public static function all(): array {
		$stored = get_option( self::OPTION_KEY, [] );

		return is_array( $stored ) ? $stored : [];
	}

	public static function is_installed( string $pack_id ): bool {
		return array_key_exists( $pack_id, self::all() );
	}

	public static function version_of( string $pack_id ): string {
		return (string) ( self::all()[ $pack_id ]['version'] ?? '' );
	}

	/**
	 * The rows this pack created, grouped by content group ("forms", "emails",
	 * "workflows") and keyed by the manifest ref. Empty for packs installed
	 * before ids were recorded; the Restorer back-fills those by name.
	 *
	 * @return array<string, array<string, int>>
	 */
	public static function items_of( string $pack_id ): array {
		$items = self::all()[ $pack_id ]['items'] ?? [];
		if ( ! is_array( $items ) ) {
			return [];
		}

		$out = [];
		foreach ( $items as $group => $refs ) {
			if ( ! is_array( $refs ) ) {
				continue;
			}
			foreach ( $refs as $ref => $id ) {
				$out[ (string) $group ][ (string) $ref ] = (int) $id;
			}
		}

		return $out;
	}

	/**
	 * Stamp the installed version. Passing no ids keeps the ones already
	 * recorded, so an update (which creates no rows) never erases the map, and
	 * `installed_at` is kept from the first install.
	 *
	 * @param array<string, array<string, int>> $items
	 */
	public static function mark( string $pack_id, string $version, array $items = [] ): void {
		$state = self::all();

		$state[ $pack_id ] = [
			'version'      => $version,
			'installed_at' => (string) ( $state[ $pack_id ]['installed_at'] ?? current_time( 'mysql', true ) ),
			'items'        => self::merge_items( self::items_of( $pack_id ), $items ),
		];

		update_option( self::OPTION_KEY, $state );
	}

	/**
	 * Drop the install stamp entirely, so the pack reads as never-installed
	 * (the catalog offers "Install pack" again, and a later re-import does not
	 * refuse itself). Used after {@see \Flexa\FormFlow\Packs\Uninstaller} has
	 * removed (or found already gone) every row it created.
	 */
	public static function forget( string $pack_id ): void {
		$state = self::all();
		if ( ! array_key_exists( $pack_id, $state ) ) {
			return;
		}

		unset( $state[ $pack_id ] );
		update_option( self::OPTION_KEY, $state );
	}

	/**
	 * Add or correct recorded ids without touching the version stamp. Used by
	 * the back-fill and after a restore creates replacements.
	 *
	 * @param array<string, array<string, int>> $items
	 */
	public static function record_items( string $pack_id, array $items ): void {
		if ( [] === $items || ! self::is_installed( $pack_id ) ) {
			return;
		}

		$state                      = self::all();
		$state[ $pack_id ]['items'] = self::merge_items( self::items_of( $pack_id ), $items );

		update_option( self::OPTION_KEY, $state );
	}

	/**
	 * @param array<string, array<string, int>> $current
	 * @param array<string, array<string, int>> $incoming
	 * @return array<string, array<string, int>>
	 */
	private static function merge_items( array $current, array $incoming ): array {
		foreach ( $incoming as $group => $refs ) {
			foreach ( $refs as $ref => $id ) {
				if ( (int) $id > 0 ) {
					$current[ (string) $group ][ (string) $ref ] = (int) $id;
				}
			}
		}

		return $current;
	}
}
