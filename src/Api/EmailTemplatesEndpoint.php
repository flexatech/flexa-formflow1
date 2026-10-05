<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Api;

use Flexa\FormFlow\Domain\EmailTemplates\EmailTemplateRepository;
use Flexa\FormFlow\Emails\Render\DefaultTemplates;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

defined( 'ABSPATH' ) || exit;

final class EmailTemplatesEndpoint extends Endpoint {
	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/email-templates',
			[
				[
					'methods'             => 'GET',
					'callback'            => [ $this, 'index' ],
					'permission_callback' => [ $this, 'manage_permission' ],
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
			'/email-templates/(?P<id>\d+)',
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
			'/email-templates/(?P<id>\d+)/duplicate',
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

	public function index(): WP_REST_Response {
		$items = array_map(
			static fn( $template ) => $template->to_array(),
			EmailTemplateRepository::instance()->all()
		);

		return new WP_REST_Response( [ 'items' => $items ], 200 );
	}

	public function create( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$params = (array) $request->get_json_params();
		$title  = sanitize_text_field( (string) ( $params['title'] ?? '' ) );
		if ( '' === $title ) {
			$title = __( 'Untitled template', 'flexa-formflow' );
		}

		$tree = is_array( $params['tree'] ?? null ) ? $params['tree'] : DefaultTemplates::tree_for( 'admin' );

		$id = EmailTemplateRepository::instance()->create( $title, $tree );
		if ( $id <= 0 ) {
			return new WP_Error( 'flexa_formflow_create_failed', __( 'The template could not be created.', 'flexa-formflow' ), [ 'status' => 500 ] );
		}

		$template = EmailTemplateRepository::instance()->find( $id );

		return new WP_REST_Response( [ 'template' => $template?->to_array() ], 201 );
	}

	public function show( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$template = EmailTemplateRepository::instance()->find( (int) $request->get_param( 'id' ) );
		if ( null === $template ) {
			return $this->not_found();
		}

		return new WP_REST_Response( [ 'template' => $template->to_array() ], 200 );
	}

	public function update( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$id   = (int) $request->get_param( 'id' );
		$repo = EmailTemplateRepository::instance();
		if ( null === $repo->find( $id ) ) {
			return $this->not_found();
		}

		$params = (array) $request->get_json_params();
		$fields = array_intersect_key( $params, array_flip( [ 'title', 'tree' ] ) );
		$repo->update( $id, $fields );

		$template = $repo->find( $id );

		return new WP_REST_Response( [ 'template' => $template->to_array() ], 200 );
	}

	public function destroy( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$id   = (int) $request->get_param( 'id' );
		$repo = EmailTemplateRepository::instance();
		if ( null === $repo->find( $id ) ) {
			return $this->not_found();
		}

		$repo->delete( $id );

		return new WP_REST_Response( [ 'deleted' => true ], 200 );
	}

	public function duplicate( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$new_id = EmailTemplateRepository::instance()->duplicate( (int) $request->get_param( 'id' ) );
		if ( $new_id <= 0 ) {
			return $this->not_found();
		}

		$template = EmailTemplateRepository::instance()->find( $new_id );

		return new WP_REST_Response( [ 'template' => $template?->to_array() ], 201 );
	}

	private function not_found(): WP_Error {
		return new WP_Error( 'flexa_formflow_not_found', __( 'Template not found.', 'flexa-formflow' ), [ 'status' => 404 ] );
	}
}
