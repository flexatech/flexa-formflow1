<?php

declare(strict_types=1);

namespace Flexa\FormFlow\WooCommerce;

defined( 'ABSPATH' ) || exit;

/**
 * The canonical list of WooCommerce transactional emails FormFlow can take
 * over, keyed by the WooCommerce email id. Each entry knows the core template
 * file it ships as (so the Interceptor can swap it) and whether an order is
 * available when it sends (password-reset and new-account emails have none).
 */
final class Catalog {
	/**
	 * @return array<string, array{template: string, title: string, description: string, recipient: string, has_order: bool}>
	 */
	public static function emails(): array {
		$emails = [
			'new_order'                 => [
				'template'    => 'emails/admin-new-order.php',
				'title'       => __( 'New order', 'flexa-formflow' ),
				'description' => __( 'Sent to the store admin when a new order arrives.', 'flexa-formflow' ),
				'recipient'   => 'admin',
				'has_order'   => true,
			],
			'cancelled_order'           => [
				'template'    => 'emails/admin-cancelled-order.php',
				'title'       => __( 'Cancelled order', 'flexa-formflow' ),
				'description' => __( 'Sent to the store admin when an order is cancelled.', 'flexa-formflow' ),
				'recipient'   => 'admin',
				'has_order'   => true,
			],
			'failed_order'              => [
				'template'    => 'emails/admin-failed-order.php',
				'title'       => __( 'Failed order', 'flexa-formflow' ),
				'description' => __( 'Sent to the store admin when payment fails.', 'flexa-formflow' ),
				'recipient'   => 'admin',
				'has_order'   => true,
			],
			'customer_on_hold_order'    => [
				'template'    => 'emails/customer-on-hold-order.php',
				'title'       => __( 'Order on hold', 'flexa-formflow' ),
				'description' => __( 'Sent to the customer when an order is set on hold.', 'flexa-formflow' ),
				'recipient'   => 'customer',
				'has_order'   => true,
			],
			'customer_processing_order' => [
				'template'    => 'emails/customer-processing-order.php',
				'title'       => __( 'Processing order', 'flexa-formflow' ),
				'description' => __( 'Sent to the customer after payment, while the order is processed.', 'flexa-formflow' ),
				'recipient'   => 'customer',
				'has_order'   => true,
			],
			'customer_completed_order'  => [
				'template'    => 'emails/customer-completed-order.php',
				'title'       => __( 'Completed order', 'flexa-formflow' ),
				'description' => __( 'Sent to the customer when the order is complete.', 'flexa-formflow' ),
				'recipient'   => 'customer',
				'has_order'   => true,
			],
			'customer_refunded_order'   => [
				'template'    => 'emails/customer-refunded-order.php',
				'title'       => __( 'Refunded order', 'flexa-formflow' ),
				'description' => __( 'Sent to the customer when an order is refunded.', 'flexa-formflow' ),
				'recipient'   => 'customer',
				'has_order'   => true,
			],
			'customer_invoice'          => [
				'template'    => 'emails/customer-invoice.php',
				'title'       => __( 'Invoice / order details', 'flexa-formflow' ),
				'description' => __( 'Order details sent to the customer on request or for unpaid orders.', 'flexa-formflow' ),
				'recipient'   => 'customer',
				'has_order'   => true,
			],
			'customer_note'             => [
				'template'    => 'emails/customer-note.php',
				'title'       => __( 'Customer note', 'flexa-formflow' ),
				'description' => __( 'Sent to the customer when a note is added to their order.', 'flexa-formflow' ),
				'recipient'   => 'customer',
				'has_order'   => true,
			],
			'customer_reset_password'   => [
				'template'    => 'emails/customer-reset-password.php',
				'title'       => __( 'Reset password', 'flexa-formflow' ),
				'description' => __( 'Sent to the customer when they request a password reset.', 'flexa-formflow' ),
				'recipient'   => 'customer',
				'has_order'   => false,
			],
			'customer_new_account'      => [
				'template'    => 'emails/customer-new-account.php',
				'title'       => __( 'New account', 'flexa-formflow' ),
				'description' => __( 'Sent to the customer when their account is created.', 'flexa-formflow' ),
				'recipient'   => 'customer',
				'has_order'   => false,
			],
		];

		/**
		 * Filter the WooCommerce email catalog (addons register more emails).
		 *
		 * @param array<string, array{template: string, title: string, description: string, recipient: string, has_order: bool}> $emails
		 */
		return apply_filters( 'flexa_formflow.woo.catalog', $emails );
	}

	/**
	 * Reverse lookup: core template file path to our email id.
	 *
	 * @return array<string, string>
	 */
	public static function template_map(): array {
		$map = [];
		foreach ( self::emails() as $id => $meta ) {
			$map[ $meta['template'] ] = $id;
		}

		return $map;
	}

	public static function exists( string $email_id ): bool {
		return array_key_exists( $email_id, self::emails() );
	}

	public static function has_order( string $email_id ): bool {
		$emails = self::emails();

		return ! empty( $emails[ $email_id ]['has_order'] );
	}
}
