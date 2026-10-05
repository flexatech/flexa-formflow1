<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Api;

use Flexa\FormFlow\Support\Settings;
use WP_REST_Request;
use WP_REST_Response;

defined( 'ABSPATH' ) || exit;

final class SettingsEndpoint extends Endpoint {
	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/settings',
			[
				[
					'methods'             => 'GET',
					'callback'            => [ $this, 'show' ],
					'permission_callback' => [ $this, 'settings_permission' ],
				],
				[
					'methods'             => 'POST',
					'callback'            => [ $this, 'update' ],
					'permission_callback' => [ $this, 'settings_permission' ],
				],
			]
		);
	}

	public function show( WP_REST_Request $request ): WP_REST_Response {
		unset( $request );

		return new WP_REST_Response( [ 'settings' => Settings::for_rest() ], 200 );
	}

	public function update( WP_REST_Request $request ): WP_REST_Response {
		$incoming = (array) $request->get_json_params();
		Settings::save( $incoming );

		return new WP_REST_Response( [ 'settings' => Settings::for_rest() ], 200 );
	}
}
