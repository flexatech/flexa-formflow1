<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Integrations;

defined( 'ABSPATH' ) || exit;

/**
 * The integrations directory: what FormFlow can connect to and the live status
 * of each. Some are built in and active (webhooks via workflows, the delivery
 * bridge health surface); others are explorable placeholders for later.
 */
final class Catalog {
	/**
	 * @return list<array{id: string, title: string, description: string, category: string, status: string, detail: string}>
	 */
	public static function all(): array {
		$bridge = BridgeDetector::detect();

		$items = [
			[
				'id'          => 'webhooks',
				'title'       => __( 'Webhooks', 'flexa-formflow' ),
				'description' => __( 'POST every submission to another app. Add a webhook action to any workflow.', 'flexa-formflow' ),
				'category'    => 'automation',
				'status'      => 'active',
				'detail'      => __( 'Available now in Workflows.', 'flexa-formflow' ),
			],
			[
				'id'          => 'delivery_bridge',
				'title'       => __( 'Email delivery', 'flexa-formflow' ),
				'description' => __( 'FormFlow hands mail to WordPress. A delivery plugin adds SMTP routing, logs, and open tracking.', 'flexa-formflow' ),
				'category'    => 'delivery',
				'status'      => $bridge['active'] ? 'active' : 'available',
				'detail'      => $bridge['active']
					/* translators: %s: delivery plugin name. */
					? sprintf( __( 'Connected through %s.', 'flexa-formflow' ), $bridge['label'] )
					: __( 'No delivery plugin detected. Install one such as Flexa MailBridge.', 'flexa-formflow' ),
			],
			[
				'id'          => 'woocommerce',
				'title'       => __( 'WooCommerce', 'flexa-formflow' ),
				'description' => __( 'Design WooCommerce order emails with the FormFlow email builder.', 'flexa-formflow' ),
				'category'    => 'commerce',
				'status'      => class_exists( \WooCommerce::class ) ? 'active' : 'available',
				'detail'      => class_exists( \WooCommerce::class )
					? __( 'Active. See the WooCommerce tab.', 'flexa-formflow' )
					: __( 'Activate WooCommerce to enable order email takeover.', 'flexa-formflow' ),
			],
			[
				'id'          => 'zapier',
				'title'       => __( 'Zapier & Make', 'flexa-formflow' ),
				'description' => __( 'Push submissions into thousands of apps. Use the webhook action with a catch hook today.', 'flexa-formflow' ),
				'category'    => 'automation',
				'status'      => 'available',
				'detail'      => __( 'Point a webhook action at your Zap or scenario URL.', 'flexa-formflow' ),
			],
			[
				'id'          => 'crm',
				'title'       => __( 'CRM & marketing', 'flexa-formflow' ),
				'description' => __( 'Native connectors for popular CRM and email marketing tools.', 'flexa-formflow' ),
				'category'    => 'automation',
				'status'      => 'soon',
				'detail'      => __( 'Planned for a future release.', 'flexa-formflow' ),
			],
		];

		/**
		 * Filter the integrations directory (addons add their own cards).
		 *
		 * @param list<array{id: string, title: string, description: string, category: string, status: string, detail: string}> $items
		 */
		return apply_filters( 'flexa_formflow.integrations.catalog', $items );
	}
}
