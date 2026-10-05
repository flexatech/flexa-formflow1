<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Api;

use Flexa\FormFlow\Domain\EmailTemplates\EmailTemplateRepository;
use Flexa\FormFlow\Emails\Notifications;
use Flexa\FormFlow\Emails\Render\RenderContext;
use Flexa\FormFlow\Emails\Render\Renderer;
use Flexa\FormFlow\WooCommerce\Catalog;
use Flexa\FormFlow\WooCommerce\Conditions;
use Flexa\FormFlow\WooCommerce\OrderTokens;
use Flexa\FormFlow\WooCommerce\WooEmailRepository;
use Flexa\FormFlow\WooCommerce\WooTemplates;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

defined( 'ABSPATH' ) || exit;

/**
 * Drives the WooCommerce email settings screen: the catalog with per-email
 * takeover state, the assignable templates, the WooCommerce tokens/conditions
 * for the editor, and a live preview against a recent order (or sample data).
 */
final class WooEmailsEndpoint extends Endpoint {
	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/woo-emails',
			[
				[
					'methods'             => 'GET',
					'callback'            => [ $this, 'index' ],
					'permission_callback' => [ $this, 'manage_permission' ],
				],
			]
		);

		register_rest_route(
			self::NAMESPACE,
			'/woo-emails/(?P<id>[a-z0-9_]+)',
			[
				[
					'methods'             => 'PUT',
					'callback'            => [ $this, 'update' ],
					'permission_callback' => [ $this, 'manage_permission' ],
					'args'                => [ 'id' => [ 'sanitize_callback' => 'sanitize_key' ] ],
				],
			]
		);

		register_rest_route(
			self::NAMESPACE,
			'/woo-emails/(?P<id>[a-z0-9_]+)/preview',
			[
				[
					'methods'             => 'POST',
					'callback'            => [ $this, 'preview' ],
					'permission_callback' => [ $this, 'manage_permission' ],
					'args'                => [ 'id' => [ 'sanitize_callback' => 'sanitize_key' ] ],
				],
			]
		);

		register_rest_route(
			self::NAMESPACE,
			'/woo-emails/(?P<id>[a-z0-9_]+)/test',
			[
				[
					'methods'             => 'POST',
					'callback'            => [ $this, 'test' ],
					'permission_callback' => [ $this, 'manage_permission' ],
					'args'                => [ 'id' => [ 'sanitize_callback' => 'sanitize_key' ] ],
				],
			]
		);
	}

	public function index(): WP_REST_Response {
		$repo  = WooEmailRepository::instance();
		$items = [];
		foreach ( Catalog::emails() as $id => $meta ) {
			$settings = $repo->find( $id );
			$items[]  = [
				'id'          => $id,
				'title'       => $meta['title'],
				'description' => $meta['description'],
				'recipient'   => $meta['recipient'],
				'hasOrder'    => $meta['has_order'],
				'enabled'     => $settings['enabled'],
				'subject'     => $settings['subject'],
				'templateId'  => $settings['template_id'],
			];
		}

		$templates = array_map(
			static fn( $template ) => [
				'id'    => $template->id,
				'title' => $template->title,
			],
			EmailTemplateRepository::instance()->all()
		);

		return new WP_REST_Response(
			[
				'emails'            => $items,
				'templates'         => $templates,
				'tokens'            => OrderTokens::catalog(),
				'orders'            => $this->recent_orders(),
				'conditionSubjects' => Conditions::subjects(),
				'conditionOps'      => Conditions::operators(),
				'hasWooCommerce'    => class_exists( \WooCommerce::class ),
			],
			200
		);
	}

	public function update( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$id = (string) $request->get_param( 'id' );
		if ( ! Catalog::exists( $id ) ) {
			return new WP_Error( 'flexa_formflow_not_found', __( 'Unknown email.', 'flexa-formflow' ), [ 'status' => 404 ] );
		}

		$params = (array) $request->get_json_params();
		$fields = array_intersect_key( $params, array_flip( [ 'enabled', 'subject', 'template_id' ] ) );
		$row    = WooEmailRepository::instance()->save( $id, $fields );

		return new WP_REST_Response(
			[
				'email' => [
					'id'         => $id,
					'enabled'    => $row['enabled'],
					'subject'    => $row['subject'],
					'templateId' => $row['template_id'],
				],
			],
			200
		);
	}

	public function preview( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$id = (string) $request->get_param( 'id' );
		if ( ! Catalog::exists( $id ) ) {
			return new WP_Error( 'flexa_formflow_not_found', __( 'Unknown email.', 'flexa-formflow' ), [ 'status' => 404 ] );
		}

		// order_id 0 (or an unknown id) renders sample data; a positive id
		// renders that specific order so previews can be checked against real data.
		$params   = (array) $request->get_json_params();
		$order_id = isset( $params['order_id'] ) ? absint( $params['order_id'] ) : 0;
		$order    = $order_id > 0 ? $this->load_order( $order_id ) : null;

		$ctx = new RenderContext(
			type: $id,
			is_preview: true,
			order: $order,
		);

		$tree = WooTemplates::tree_for( $id );
		$html = Renderer::instance()->render_tree( $tree, $ctx );

		return new WP_REST_Response(
			[
				'html'    => $html,
				'orderId' => $order instanceof \WC_Order ? $order->get_id() : 0,
			],
			200
		);
	}

	/**
	 * Send this Woo email once to a chosen address, rendered with the same data
	 * source as the preview (order_id 0 = sample data). Lets an admin confirm the
	 * template lands well in a real inbox before taking the email over.
	 */
	public function test( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$id = (string) $request->get_param( 'id' );
		if ( ! Catalog::exists( $id ) ) {
			return new WP_Error( 'flexa_formflow_not_found', __( 'Unknown email.', 'flexa-formflow' ), [ 'status' => 404 ] );
		}

		$params = (array) $request->get_json_params();
		$to     = sanitize_email( (string) ( $params['to'] ?? '' ) );
		if ( ! is_email( $to ) ) {
			return new WP_Error( 'flexa_formflow_invalid_email', __( 'Please enter a valid email address.', 'flexa-formflow' ), [ 'status' => 400 ] );
		}

		$order_id = isset( $params['order_id'] ) ? absint( $params['order_id'] ) : 0;
		$order    = $order_id > 0 ? $this->load_order( $order_id ) : null;

		$ctx  = new RenderContext( type: $id, is_preview: true, order: $order );
		$tree = WooTemplates::tree_for( $id );
		$html = Renderer::instance()->render_tree( $tree, $ctx );

		$title = (string) ( Catalog::emails()[ $id ]['title'] ?? $id );
		/* translators: %s: email name. */
		$subject = sprintf( __( '[Test] %s', 'flexa-formflow' ), $title );

		$sent = Notifications::instance()->send( $to, $subject, $html, $id );

		return new WP_REST_Response( [ 'sent' => $sent ], 200 );
	}

	private function load_order( int $order_id ): ?\WC_Order {
		if ( ! function_exists( 'wc_get_order' ) ) {
			return null;
		}

		$order = wc_get_order( $order_id );

		return $order instanceof \WC_Order ? $order : null;
	}

	/**
	 * Recent orders offered in the preview data-source picker. The client always
	 * prepends a "Sample order" option, so an empty list still previews fine.
	 *
	 * @return list<array{id: int, label: string}>
	 */
	private function recent_orders(): array {
		if ( ! function_exists( 'wc_get_orders' ) ) {
			return [];
		}

		$orders = wc_get_orders(
			[
				'type'    => 'shop_order',
				'limit'   => 20,
				'orderby' => 'date',
				'order'   => 'DESC',
			]
		);
		if ( ! is_array( $orders ) ) {
			return [];
		}

		$out = [];
		foreach ( $orders as $order ) {
			// Refunds share the order tables/hierarchy but lack billing methods;
			// 'type' => 'shop_order' should exclude them, but skip defensively
			// in case a payment gateway registers another non-order order type.
			if ( ! method_exists( $order, 'get_formatted_billing_full_name' ) ) {
				continue;
			}

			$name  = trim( $order->get_formatted_billing_full_name() );
			$out[] = [
				'id'    => $order->get_id(),
				'label' => '' !== $name
					/* translators: 1: order number, 2: customer name. */
					? sprintf( __( '#%1$s · %2$s', 'flexa-formflow' ), $order->get_order_number(), $name )
					/* translators: %s: order number. */
					: sprintf( __( 'Order #%s', 'flexa-formflow' ), $order->get_order_number() ),
			];
		}

		return $out;
	}
}
