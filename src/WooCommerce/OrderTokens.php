<?php

declare(strict_types=1);

namespace Flexa\FormFlow\WooCommerce;

use Flexa\FormFlow\Concerns\HasInstance;
use Flexa\FormFlow\Emails\Render\RenderContext;

defined( 'ABSPATH' ) || exit;

/**
 * Adds WooCommerce order tokens to the shared token resolver. When a render
 * context carries an order, `{order_number}`, `{customer_first_name}`, etc.
 * resolve against it; in editor preview with no order, they resolve to sample
 * values so the design never renders blank.
 */
final class OrderTokens {
	use HasInstance;

	public function register(): void {
		add_filter( 'flexa_formflow.emails.tokens', [ $this, 'add_tokens' ], 10, 2 );
	}

	/**
	 * @param array<string, string> $values
	 * @return array<string, string>
	 */
	public function add_tokens( array $values, RenderContext $ctx ): array {
		$order = $ctx->order;

		// Independent of any order: every WooCommerce email (account emails
		// included) can link back to the shop or the customer's account.
		$values['shop_url']       = wc_get_page_permalink( 'shop' );
		$values['my_account_url'] = wc_get_page_permalink( 'myaccount' );

		if ( $order instanceof \WC_Order ) {
			$values['order_number']        = (string) $order->get_order_number();
			$values['order_date']          = $order->get_date_created() ? wc_format_datetime( $order->get_date_created() ) : '';
			$values['order_total']         = wp_strip_all_tags( $order->get_formatted_order_total() );
			$values['order_status']        = wc_get_order_status_name( $order->get_status() );
			$values['order_url']           = $order->get_view_order_url();
			$values['payment_method']      = $order->get_payment_method_title();
			$values['shipping_method']     = wp_strip_all_tags( $order->get_shipping_method() );
			$values['customer_first_name'] = $order->get_billing_first_name();
			$values['customer_last_name']  = $order->get_billing_last_name();
			$values['customer_full_name']  = trim( $order->get_formatted_billing_full_name() );
			$values['customer_email']      = $order->get_billing_email();
		} else {
			// Account emails (reset password, new account) have no order, but
			// WooCommerce still hands us the account holder's display name.
			$display_name                  = (string) $ctx->extra( 'user_display_name' );
			$values['customer_first_name'] = $display_name;
			$values['customer_full_name']  = $display_name;
		}

		$values['reset_password_url'] = self::reset_password_url( $ctx );
		$values['set_password_url']   = (string) $ctx->extra( 'set_password_url' );

		$note = $ctx->extra( 'customer_note' );
		if ( is_string( $note ) && '' !== $note ) {
			$values['customer_note'] = $note;
		}

		if ( $ctx->is_preview ) {
			// `+=` alone would not do: customer_first_name/full_name are now
			// always set (possibly to '' when there is no order or account
			// context), so an empty string already "fills" the key and blocks
			// the sample from ever showing. Only truly-empty values fall back.
			foreach ( self::sample_values() as $key => $sample ) {
				if ( ! isset( $values[ $key ] ) || '' === $values[ $key ] ) {
					$values[ $key ] = $sample;
				}
			}
		}

		return $values;
	}

	/**
	 * Token metadata for the editor hint list (WooCommerce-only tokens).
	 *
	 * @return list<array{token: string, label: string}>
	 */
	public static function catalog(): array {
		return [
			[
				'token' => '{order_number}',
				'label' => __( 'Order number', 'flexa-formflow' ),
			],
			[
				'token' => '{order_date}',
				'label' => __( 'Order date', 'flexa-formflow' ),
			],
			[
				'token' => '{order_total}',
				'label' => __( 'Order total', 'flexa-formflow' ),
			],
			[
				'token' => '{order_status}',
				'label' => __( 'Order status', 'flexa-formflow' ),
			],
			[
				'token' => '{order_url}',
				'label' => __( 'Order URL', 'flexa-formflow' ),
			],
			[
				'token' => '{payment_method}',
				'label' => __( 'Payment method', 'flexa-formflow' ),
			],
			[
				'token' => '{shipping_method}',
				'label' => __( 'Shipping method', 'flexa-formflow' ),
			],
			[
				'token' => '{customer_first_name}',
				'label' => __( 'Customer first name', 'flexa-formflow' ),
			],
			[
				'token' => '{customer_last_name}',
				'label' => __( 'Customer last name', 'flexa-formflow' ),
			],
			[
				'token' => '{customer_full_name}',
				'label' => __( 'Customer full name', 'flexa-formflow' ),
			],
			[
				'token' => '{customer_email}',
				'label' => __( 'Customer email', 'flexa-formflow' ),
			],
			[
				'token' => '{reset_password_url}',
				'label' => __( 'Reset password link (Reset password email only)', 'flexa-formflow' ),
			],
			[
				'token' => '{set_password_url}',
				'label' => __( 'Set password link (New account email only)', 'flexa-formflow' ),
			],
		];
	}

	/**
	 * The exact link WooCommerce's own reset-password email builds, from the
	 * reset key/user id the core email class hands the template
	 * (see WC_Email_Customer_Reset_Password::get_content_html()). Empty when
	 * those extras are absent (any email other than customer_reset_password).
	 */
	private static function reset_password_url( RenderContext $ctx ): string {
		$reset_key  = (string) $ctx->extra( 'reset_key' );
		$user_login = (string) $ctx->extra( 'user_login' );
		if ( '' === $reset_key || '' === $user_login || ! function_exists( 'wc_get_endpoint_url' ) ) {
			return '';
		}

		return add_query_arg(
			[
				'key'   => $reset_key,
				'id'    => (string) $ctx->extra( 'user_id' ),
				'login' => rawurlencode( $user_login ),
			],
			wc_get_endpoint_url( 'lost-password', '', wc_get_page_permalink( 'myaccount' ) )
		);
	}

	/**
	 * @return array<string, string>
	 */
	private static function sample_values(): array {
		return [
			'order_number'        => '1234',
			'order_date'          => date_i18n( get_option( 'date_format' ) ),
			'order_total'         => wp_strip_all_tags( wc_price( 128.5 ) ),
			'order_status'        => __( 'Processing', 'flexa-formflow' ),
			'order_url'           => home_url( '/my-account/view-order/1234/' ),
			'payment_method'      => __( 'Credit card', 'flexa-formflow' ),
			'shipping_method'     => __( 'Flat rate', 'flexa-formflow' ),
			'customer_first_name' => 'Alex',
			'customer_last_name'  => 'Nguyen',
			'customer_full_name'  => 'Alex Nguyen',
			'customer_email'      => 'alex@example.com',
			'shop_url'            => home_url( '/shop/' ),
			'my_account_url'      => home_url( '/my-account/' ),
			'customer_note'       => __( 'Thanks, please leave the parcel at the door.', 'flexa-formflow' ),
			'reset_password_url'  => home_url( '/my-account/lost-password/?key=sample&id=1&login=alex' ),
			'set_password_url'    => home_url( '/my-account/lost-password/?action=newaccount&key=sample&login=alex' ),
		];
	}
}
