<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Api;

use Flexa\FormFlow\Emails\Notifications;
use Flexa\FormFlow\Emails\Render\Renderer;
use Flexa\FormFlow\Emails\TreeSanitizer;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

defined( 'ABSPATH' ) || exit;

final class EmailTestEndpoint extends Endpoint {
	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/email-test',
			[
				[
					'methods'             => 'POST',
					'callback'            => [ $this, 'send' ],
					'permission_callback' => [ $this, 'manage_permission' ],
				],
			]
		);
	}

	public function send( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$params = (array) $request->get_json_params();
		$to     = sanitize_email( (string) ( $params['to'] ?? '' ) );
		if ( ! is_email( $to ) ) {
			return new WP_Error( 'flexa_formflow_invalid_email', __( 'Please enter a valid email address.', 'flexa-formflow' ), [ 'status' => 400 ] );
		}

		$tree = TreeSanitizer::sanitize( is_array( $params['tree'] ?? null ) ? $params['tree'] : [] );
		$ctx  = EmailPreviewEndpoint::build_context( $params, true );
		$html = Renderer::instance()->render_tree( $tree, $ctx );

		/* translators: %s: site name. */
		$subject = sprintf( __( '[Test] %s email preview', 'flexa-formflow' ), get_bloginfo( 'name' ) );

		$sent = Notifications::instance()->send( $to, $subject, $html, $ctx->type );

		return new WP_REST_Response( [ 'sent' => $sent ], 200 );
	}
}
