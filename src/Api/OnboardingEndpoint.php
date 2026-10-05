<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Api;

use Flexa\FormFlow\Support\OnboardingState;
use WP_REST_Request;
use WP_REST_Response;

defined( 'ABSPATH' ) || exit;

/**
 * First-run guide state. Gated on the same capability as the plugin page:
 * whoever can customize emails may progress or dismiss their guide.
 */
final class OnboardingEndpoint extends Endpoint {
	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/onboarding',
			[
				[
					'methods'             => 'GET',
					'callback'            => [ $this, 'get_state' ],
					'permission_callback' => [ $this, 'manage_permission' ],
				],
				[
					'methods'             => 'POST',
					'callback'            => [ $this, 'update_state' ],
					'permission_callback' => [ $this, 'manage_permission' ],
				],
			]
		);
	}

	public function get_state( WP_REST_Request $request ): WP_REST_Response {
		unset( $request );

		return new WP_REST_Response( [ 'onboarding' => OnboardingState::all() ], 200 );
	}

	public function update_state( WP_REST_Request $request ): WP_REST_Response {
		$state = OnboardingState::update( (array) $request->get_json_params() );

		return new WP_REST_Response( [ 'onboarding' => $state ], 200 );
	}
}
