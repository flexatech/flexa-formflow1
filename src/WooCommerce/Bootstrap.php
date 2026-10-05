<?php

declare(strict_types=1);

namespace Flexa\FormFlow\WooCommerce;

use Flexa\FormFlow\Concerns\HasInstance;
use Flexa\FormFlow\WooCommerce\Elements\OrderDetails;

defined( 'ABSPATH' ) || exit;

/**
 * Wires the WooCommerce email takeover. Only booted when WooCommerce is active
 * (see Plugin::boot), so nothing here runs on a plain WordPress site. The REST
 * endpoint registers separately (the admin screen still loads to explain the
 * feature), but the interceptor and render extensions live behind this gate.
 */
final class Bootstrap {
	use HasInstance;

	public function register(): void {
		Interceptor::instance()->register();
		OrderTokens::instance()->register();
		Conditions::instance()->register();

		add_filter( 'flexa_formflow.emails.elements', [ $this, 'register_elements' ] );
	}

	/**
	 * Add the order-details block to the email builder registry.
	 *
	 * @param array<string, \Flexa\FormFlow\Emails\Render\BaseElement> $elements
	 * @return array<string, \Flexa\FormFlow\Emails\Render\BaseElement>
	 */
	public function register_elements( array $elements ): array {
		$order_details                      = new OrderDetails();
		$elements[ $order_details->type() ] = $order_details;

		return $elements;
	}
}
