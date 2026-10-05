<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails;

defined( 'ABSPATH' ) || exit;

/**
 * Curated email patterns: small, ready-made block groups (Header, Footer,
 * Banner, Intro, Order summary, Offer) the editor offers so a user can drop a
 * whole section in and edit it afterwards. Each block reuses the same block
 * types the builder already renders, so a dropped pattern is just normal
 * elements with fresh ids on the canvas.
 *
 * The payload carries no ids; the client assigns them on drop. Add-ons and packs
 * add more through the `flexa_formflow.emails.patterns` filter, the same
 * describe-as-data seam the rest of the plugin uses, so no add-on code ships
 * in the Free bundle.
 */
final class Patterns {

	/**
	 * @return list<array{id: string, name: string, category: string, blocks: list<array<string, mixed>>}>
	 */
	public static function all(): array {
		$patterns = [
			[
				'id'       => 'header-logo',
				'name'     => __( 'Centered logo', 'flexa-formflow' ),
				'category' => __( 'Header', 'flexa-formflow' ),
				'blocks'   => [
					[
						'type'  => 'logo',
						'props' => [
							'align' => 'center',
							'width' => 160,
						],
					],
					[
						'type'  => 'spacer',
						'props' => [ 'height' => 16 ],
					],
				],
			],
			[
				'id'       => 'header-logo-rule',
				'name'     => __( 'Logo with divider', 'flexa-formflow' ),
				'category' => __( 'Header', 'flexa-formflow' ),
				'blocks'   => [
					[
						'type'  => 'logo',
						'props' => [
							'align' => 'center',
							'width' => 150,
						],
					],
					[
						'type'  => 'divider',
						'props' => [
							'color'     => '#e6e6e6',
							'thickness' => 1,
							'paddingY'  => 12,
						],
					],
				],
			],
			[
				'id'       => 'intro-greeting',
				'name'     => __( 'Greeting', 'flexa-formflow' ),
				'category' => __( 'Intro', 'flexa-formflow' ),
				'blocks'   => [
					[
						'type'  => 'heading',
						'props' => [
							'text'     => __( 'Thanks for your order!', 'flexa-formflow' ),
							'align'    => 'left',
							'fontSize' => 24,
						],
					],
					[
						'type'  => 'text',
						'props' => [
							'html'     => __( 'Hi {billing_first_name}, we are getting your order ready. Here are the details.', 'flexa-formflow' ),
							'align'    => 'left',
							'fontSize' => 15,
						],
					],
				],
			],
			[
				'id'       => 'banner-image',
				'name'     => __( 'Full-width image', 'flexa-formflow' ),
				'category' => __( 'Banner', 'flexa-formflow' ),
				'blocks'   => [
					[
						'type'  => 'image',
						'props' => [
							'url'   => '',
							'width' => 0,
							'align' => 'center',
							'alt'   => __( 'Banner', 'flexa-formflow' ),
						],
					],
				],
			],
			[
				'id'       => 'order-summary',
				'name'     => __( 'Order summary', 'flexa-formflow' ),
				'category' => __( 'Order', 'flexa-formflow' ),
				'blocks'   => [
					[
						'type'  => 'heading',
						'props' => [
							'text'     => __( 'Order summary', 'flexa-formflow' ),
							'align'    => 'left',
							'fontSize' => 20,
						],
					],
					[
						'type'  => 'order_details',
						'props' => [
							'title'       => __( 'Your order', 'flexa-formflow' ),
							'borderColor' => '#e6e6e6',
						],
					],
				],
			],
			[
				'id'       => 'offer-cta',
				'name'     => __( 'Offer with button', 'flexa-formflow' ),
				'category' => __( 'Offer', 'flexa-formflow' ),
				'blocks'   => [
					[
						'type'  => 'heading',
						'props' => [
							'text'     => __( 'A little something for next time', 'flexa-formflow' ),
							'align'    => 'center',
							'fontSize' => 20,
						],
					],
					[
						'type'  => 'text',
						'props' => [
							'html'     => __( 'Use this code at checkout on your next visit.', 'flexa-formflow' ),
							'align'    => 'center',
							'fontSize' => 15,
						],
					],
					[
						'type'  => 'button',
						'props' => [
							'text'  => __( 'Shop now', 'flexa-formflow' ),
							'url'   => '{site_url}',
							'align' => 'center',
						],
					],
				],
			],
			[
				'id'       => 'footer-social',
				'name'     => __( 'Social and small print', 'flexa-formflow' ),
				'category' => __( 'Footer', 'flexa-formflow' ),
				'blocks'   => [
					[
						'type'  => 'divider',
						'props' => [
							'color'     => '#e6e6e6',
							'thickness' => 1,
							'paddingY'  => 12,
						],
					],
					[
						'type'  => 'social',
						'props' => [ 'align' => 'center' ],
					],
					[
						'type'  => 'footer_text',
						'props' => [
							'html'  => '',
							'align' => 'center',
							'color' => '#8a8a8a',
						],
					],
				],
			],
			[
				'id'       => 'footer-simple',
				'name'     => __( 'Simple footer', 'flexa-formflow' ),
				'category' => __( 'Footer', 'flexa-formflow' ),
				'blocks'   => [
					[
						'type'  => 'divider',
						'props' => [
							'color'     => '#e6e6e6',
							'thickness' => 1,
							'paddingY'  => 12,
						],
					],
					[
						'type'  => 'footer_text',
						'props' => [
							'html'  => '',
							'align' => 'center',
							'color' => '#8a8a8a',
						],
					],
				],
			],
		];

		/**
		 * Register more email patterns (add-on sections, pack content). Each entry is
		 * `id`, `name`, `category` and a `blocks` list of `{type, props}` (a
		 * `columns` block additionally carries a `columns` list of block lists).
		 *
		 * @param list<array{id: string, name: string, category: string, blocks: list<array<string, mixed>>}> $patterns
		 */
		return apply_filters( 'flexa_formflow.emails.patterns', $patterns );
	}
}
