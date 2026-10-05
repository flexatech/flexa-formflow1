<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Packs;

use Flexa\FormFlow\Domain\Packs\PackManifest;

defined( 'ABSPATH' ) || exit;

/**
 * The set of packs FormFlow knows how to install. Free ships one authored pack;
 * add-ons register more through the `flexa_formflow.packs` filter (the same
 * describe-as-data seam the catalog and integrations use), so no add-on code
 * ships into the Free bundle.
 */
final class Registry {

	/**
	 * @return list<PackManifest>
	 */
	public static function all(): array {
		$packs = [
			CateringPack::manifest(),
			LeadCapturePack::manifest(),
			EventRsvpPack::manifest(),
		];

		/**
		 * Register additional packs. Each entry must be a PackManifest.
		 *
		 * @param list<PackManifest> $packs
		 */
		return apply_filters( 'flexa_formflow.packs', $packs );
	}

	public static function find( string $id ): ?PackManifest {
		foreach ( self::all() as $pack ) {
			if ( $pack->id === $id ) {
				return $pack;
			}
		}

		return null;
	}
}
