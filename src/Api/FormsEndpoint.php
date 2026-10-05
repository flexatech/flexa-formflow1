<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Api;

use Flexa\FormFlow\Domain\Forms\FormRepository;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

defined( 'ABSPATH' ) || exit;

final class FormsEndpoint extends Endpoint {
	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/forms',
			[
				[
					'methods'             => 'GET',
					'callback'            => [ $this, 'index' ],
					'permission_callback' => [ $this, 'manage_permission' ],
					'args'                => [
						'search'   => [ 'sanitize_callback' => 'sanitize_text_field' ],
						'status'   => [ 'sanitize_callback' => 'sanitize_key' ],
						'page'     => [ 'sanitize_callback' => 'absint' ],
						'per_page' => [ 'sanitize_callback' => 'absint' ],
					],
				],
				[
					'methods'             => 'POST',
					'callback'            => [ $this, 'create' ],
					'permission_callback' => [ $this, 'manage_permission' ],
				],
			]
		);

		register_rest_route(
			self::NAMESPACE,
			'/forms/(?P<id>\d+)',
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

		register_rest_route(
			self::NAMESPACE,
			'/forms/(?P<id>\d+)/duplicate',
			[
				[
					'methods'             => 'POST',
					'callback'            => [ $this, 'duplicate' ],
					'permission_callback' => [ $this, 'manage_permission' ],
					'args'                => [ 'id' => [ 'sanitize_callback' => 'absint' ] ],
				],
			]
		);
	}

	public function index( WP_REST_Request $request ): WP_REST_Response {
		$repo   = FormRepository::instance();
		$result = $repo->all(
			[
				'search'   => (string) $request->get_param( 'search' ),
				'status'   => (string) $request->get_param( 'status' ),
				'page'     => (int) ( $request->get_param( 'page' ) ?? 1 ),
				'per_page' => (int) ( $request->get_param( 'per_page' ) ?? 20 ),
			]
		);

		$counts = $repo->entry_counts( array_map( static fn( $form ) => $form->id, $result['items'] ) );
		$items  = [];
		foreach ( $result['items'] as $form ) {
			$item                  = $form->to_array();
			$item['entries_count'] = $counts[ $form->id ] ?? 0;
			$items[]               = $item;
		}

		return new WP_REST_Response(
			[
				'items' => $items,
				'total' => $result['total'],
			],
			200
		);
	}

	public function create( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$params = (array) $request->get_json_params();
		$title  = sanitize_text_field( (string) ( $params['title'] ?? '' ) );
		if ( '' === $title ) {
			$title = __( 'Untitled form', 'flexa-formflow' );
		}

		$id = FormRepository::instance()->create( $title, is_array( $params['config'] ?? null ) ? $params['config'] : [] );
		if ( $id <= 0 ) {
			return new WP_Error( 'flexa_formflow_create_failed', __( 'The form could not be created.', 'flexa-formflow' ), [ 'status' => 500 ] );
		}

		$form = FormRepository::instance()->find( $id );

		return new WP_REST_Response( [ 'form' => $form?->to_array() ], 201 );
	}

	public function show( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$form = FormRepository::instance()->find( (int) $request->get_param( 'id' ) );
		if ( null === $form ) {
			return $this->not_found();
		}

		return new WP_REST_Response( [ 'form' => $form->to_array() ], 200 );
	}

	public function update( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$id   = (int) $request->get_param( 'id' );
		$repo = FormRepository::instance();
		if ( null === $repo->find( $id ) ) {
			return $this->not_found();
		}

		$params = (array) $request->get_json_params();
		$fields = array_intersect_key( $params, array_flip( [ 'title', 'status', 'config' ] ) );
		$repo->update( $id, $fields );

		$form = $repo->find( $id );

		return new WP_REST_Response( [ 'form' => $form->to_array() ], 200 );
	}

	public function destroy( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$id   = (int) $request->get_param( 'id' );
		$repo = FormRepository::instance();
		if ( null === $repo->find( $id ) ) {
			return $this->not_found();
		}

		$repo->delete( $id );

		return new WP_REST_Response( [ 'deleted' => true ], 200 );
	}

	public function duplicate( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$new_id = FormRepository::instance()->duplicate( (int) $request->get_param( 'id' ) );
		if ( $new_id <= 0 ) {
			return $this->not_found();
		}

		$form = FormRepository::instance()->find( $new_id );

		return new WP_REST_Response( [ 'form' => $form?->to_array() ], 201 );
	}

	private function not_found(): WP_Error {
		return new WP_Error( 'flexa_formflow_not_found', __( 'Form not found.', 'flexa-formflow' ), [ 'status' => 404 ] );
	}
}
