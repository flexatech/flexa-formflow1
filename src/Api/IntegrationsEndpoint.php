<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Api;

use Flexa\FormFlow\Extensions\Registry;
use Flexa\FormFlow\Integrations\BridgeDetector;
use Flexa\FormFlow\Integrations\Catalog;
use Flexa\FormFlow\Integrations\Connections;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

defined( 'ABSPATH' ) || exit;

/**
 * Integrations status for the Integrations screen and the delivery card: the
 * directory of connectors plus the detected delivery bridge. Connect forms
 * described by an add-on (see the extension registry) are read and stored
 * through the per-integration `/connection` route.
 */
final class IntegrationsEndpoint extends Endpoint {
	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/integrations',
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
			'/integrations/(?P<id>[a-z0-9_\-]+)/connection',
			[
				[
					'methods'             => 'GET',
					'callback'            => [ $this, 'get_connection' ],
					'permission_callback' => [ $this, 'manage_permission' ],
				],
				[
					'methods'             => 'POST',
					'callback'            => [ $this, 'save_connection' ],
					'permission_callback' => [ $this, 'manage_permission' ],
				],
			]
		);
	}

	public function get_connection( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$id = $this->connection_id( $request );
		if ( $id instanceof WP_Error ) {
			return $id;
		}

		return new WP_REST_Response( Connections::public_view( $id ), 200 );
	}

	public function save_connection( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$id = $this->connection_id( $request );
		if ( $id instanceof WP_Error ) {
			return $id;
		}

		$body   = (array) $request->get_json_params();
		$values = isset( $body['values'] ) && is_array( $body['values'] ) ? $body['values'] : [];

		return new WP_REST_Response( Connections::save( $id, $values ), 200 );
	}

	/**
	 * Validate that the requested id is a described integration connect form.
	 */
	private function connection_id( WP_REST_Request $request ): string|WP_Error {
		$id = sanitize_key( (string) $request->get_param( 'id' ) );
		if ( ! in_array( $id, Registry::integration_connection_ids(), true ) ) {
			return new WP_Error(
				'flexa_formflow_unknown_connection',
				__( 'That integration does not accept a connection.', 'flexa-formflow' ),
				[ 'status' => 404 ]
			);
		}

		return $id;
	}

	public function index(): WP_REST_Response {
		$bridge = BridgeDetector::detect();

		return new WP_REST_Response(
			[
				'integrations' => Catalog::all(),
				'delivery'     => [
					'active' => $bridge['active'],
					'label'  => $bridge['label'],
				],
			],
			200
		);
	}
}
