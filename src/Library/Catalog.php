<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Library;

use Flexa\FormFlow\Packs\InstallState;
use Flexa\FormFlow\Packs\Registry;

defined( 'ABSPATH' ) || exit;

/**
 * The Flexa Library catalog: discoverable templates, patterns, recipes and
 * packs. The plugin ships a small set of free content here. Add-ons extend it
 * through the `flexa_formflow.library.catalog` filter (the same
 * describe-as-data seam the rest of the plugin uses), so no add-on code ships
 * into the Free bundle. This is a first-party feed today; the shape is kept
 * flat so it can later come from a remote feed unchanged.
 */
final class Catalog {

	/**
	 * @return list<array<string, mixed>>
	 */
	public static function items(): array {
		$items = array_merge( self::free_content(), self::packs() );

		/**
		 * Add catalog entries (recipes, packs). Each entry is a flat
		 * array; packs additionally carry `contents`, `version` and
		 * `compatibility`.
		 *
		 * @param list<array<string, mixed>> $items
		 */
		return apply_filters( 'flexa_formflow.library.catalog', $items );
	}

	/**
	 * Pack listings, from the pack registry, with install state merged in so the
	 * card can show an Installed or Update chip. Content counts come straight
	 * from each manifest, so the catalog and the importer never disagree.
	 *
	 * @return list<array<string, mixed>>
	 */
	private static function packs(): array {
		$items = [];
		foreach ( Registry::all() as $pack ) {
			$entry     = $pack->to_catalog_array();
			$installed = InstallState::is_installed( $pack->id );
			if ( $installed ) {
				$entry['installed']       = true;
				$entry['updateAvailable'] = InstallState::version_of( $pack->id ) !== $pack->version;
			}
			$items[] = $entry;
		}

		return $items;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	private static function free_content(): array {
		return [
			[
				'id'          => 'tpl-contact',
				'type'        => 'template',
				'name'        => __( 'Contact form', 'flexa-formflow' ),
				'description' => __( 'A clean contact form with name, email and message.', 'flexa-formflow' ),
				'category'    => __( 'General', 'flexa-formflow' ),
				'kind'        => 'form',
				'ownership'   => 'free',
			],
			[
				'id'          => 'pat-customer-info',
				'type'        => 'pattern',
				'name'        => __( 'Customer information', 'flexa-formflow' ),
				'description' => __( 'Name, email, phone and company: the field group every pack reuses.', 'flexa-formflow' ),
				'category'    => __( 'General', 'flexa-formflow' ),
				'kind'        => 'form',
				'ownership'   => 'free',
			],
			[
				'id'          => 'tpl-quote-received',
				'type'        => 'template',
				'name'        => __( 'Quote request received', 'flexa-formflow' ),
				'description' => __( 'Confirmation email sent the moment a quote request lands.', 'flexa-formflow' ),
				'category'    => __( 'Sales', 'flexa-formflow' ),
				'kind'        => 'email',
				'ownership'   => 'free',
			],
		];
	}
}
