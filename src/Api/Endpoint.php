<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Api;

use Flexa\FormFlow\Support\Capabilities;
use WP_Error;
use WP_REST_Request;

defined( 'ABSPATH' ) || exit;

/**
 * Base class for REST endpoints. Provides the permission callbacks shared by
 * every route so individual endpoints never forget the gate.
 */
abstract class Endpoint {
	public const NAMESPACE = FLEXA_FORMFLOW_REST_NAMESPACE;

	abstract public function register_routes(): void;

	public function manage_permission( WP_REST_Request $request ): bool|WP_Error {
		unset( $request );
		if ( ! Capabilities::can_manage() ) {
			return new WP_Error(
				'flexa_formflow_forbidden',
				__( 'You do not have permission to perform this action.', 'flexa-formflow' ),
				[ 'status' => rest_authorization_required_code() ]
			);
		}
		return true;
	}

	public function settings_permission( WP_REST_Request $request ): bool|WP_Error {
		unset( $request );
		if ( ! Capabilities::can_manage_settings() ) {
			return new WP_Error(
				'flexa_formflow_forbidden',
				__( 'You do not have permission to update settings.', 'flexa-formflow' ),
				[ 'status' => rest_authorization_required_code() ]
			);
		}
		return true;
	}
}
