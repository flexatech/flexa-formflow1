<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Api;

use Flexa\FormFlow\Domain\Entries\EntryRepository;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

defined( 'ABSPATH' ) || exit;

final class EntriesEndpoint extends Endpoint {
	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/entries',
			[
				[
					'methods'             => 'GET',
					'callback'            => [ $this, 'index' ],
					'permission_callback' => [ $this, 'manage_permission' ],
					'args'                => [
						'form_id'  => [ 'sanitize_callback' => 'absint' ],
						'status'   => [ 'sanitize_callback' => 'sanitize_key' ],
						'page'     => [ 'sanitize_callback' => 'absint' ],
						'per_page' => [ 'sanitize_callback' => 'absint' ],
					],
				],
			]
		);

		register_rest_route(
			self::NAMESPACE,
			'/entries/(?P<id>\d+)',
			[
				[
					'methods'             => 'GET',
					'callback'            => [ $this, 'show' ],
					'permission_callback' => [ $this, 'manage_permission' ],
					'args'                => [ 'id' => [ 'sanitize_callback' => 'absint' ] ],
				],
				[
					'methods'             => 'PUT',
					'callback'            => [ $this, 'update' ],
					'permission_callback' => [ $this, 'manage_permission' ],
					'args'                => [ 'id' => [ 'sanitize_callback' => 'absint' ] ],
				],
				[
					'methods'             => 'DELETE',
					'callback'            => [ $this, 'destroy' ],
					'permission_callback' => [ $this, 'manage_permission' ],
					'args'                => [ 'id' => [ 'sanitize_callback' => 'absint' ] ],
				],
			]
		);
	}

	public function index( WP_REST_Request $request ): WP_REST_Response {
		$result = EntryRepository::instance()->all(
			[
				'form_id'  => (int) ( $request->get_param( 'form_id' ) ?? 0 ),
				'status'   => (string) $request->get_param( 'status' ),
				'page'     => (int) ( $request->get_param( 'page' ) ?? 1 ),
				'per_page' => (int) ( $request->get_param( 'per_page' ) ?? 20 ),
			]
		);

		return new WP_REST_Response(
			[
				'items' => array_map( static fn( $entry ) => $entry->to_array(), $result['items'] ),
				'total' => $result['total'],
			],
			200
		);
	}

	public function show( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$repo  = EntryRepository::instance();
		$entry = $repo->find( (int) $request->get_param( 'id' ) );
		if ( null === $entry ) {
			return $this->not_found();
		}

		// Opening an entry is reading it.
		if ( 'unread' === $entry->status ) {
			$repo->set_status( $entry->id, 'read' );
			$entry = $repo->find( $entry->id );
		}

		return new WP_REST_Response( [ 'entry' => $entry?->to_array() ], 200 );
	}

	public function update( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$repo  = EntryRepository::instance();
		$entry = $repo->find( (int) $request->get_param( 'id' ) );
		if ( null === $entry ) {
			return $this->not_found();
		}

		$params = (array) $request->get_json_params();
		$status = sanitize_key( (string) ( $params['status'] ?? '' ) );
		if ( ! $repo->set_status( $entry->id, $status ) ) {
			return new WP_Error( 'flexa_formflow_invalid_status', __( 'Invalid entry status.', 'flexa-formflow' ), [ 'status' => 400 ] );
		}

		$entry = $repo->find( $entry->id );

		return new WP_REST_Response( [ 'entry' => $entry?->to_array() ], 200 );
	}

	public function destroy( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$repo = EntryRepository::instance();
		if ( null === $repo->find( (int) $request->get_param( 'id' ) ) ) {
			return $this->not_found();
		}

		$repo->delete( (int) $request->get_param( 'id' ) );

		return new WP_REST_Response( [ 'deleted' => true ], 200 );
	}

	private function not_found(): WP_Error {
		return new WP_Error( 'flexa_formflow_not_found', __( 'Entry not found.', 'flexa-formflow' ), [ 'status' => 404 ] );
	}
}
