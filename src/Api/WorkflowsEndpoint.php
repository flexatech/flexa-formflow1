<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Api;

use Flexa\FormFlow\Database\Schema;
use Flexa\FormFlow\Domain\EmailTemplates\EmailTemplateRepository;
use Flexa\FormFlow\Domain\Entries\EntryRepository;
use Flexa\FormFlow\Domain\Forms\FormRepository;
use Flexa\FormFlow\Domain\Workflows\WorkflowRepository;
use Flexa\FormFlow\Domain\Workflows\WorkflowRunRepository;
use Flexa\FormFlow\Workflows\Engine;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

defined( 'ABSPATH' ) || exit;

/**
 * CRUD for workflows plus a test-run route. The index also ships the pickers
 * the builder needs (forms with their fields, and assignable email templates),
 * so the editor loads in one request.
 */
final class WorkflowsEndpoint extends Endpoint {
	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/workflows',
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
			'/workflows/(?P<id>\d+)',
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
			'/workflows/(?P<id>\d+)/runs',
			[
				[
					'methods'             => 'GET',
					'callback'            => [ $this, 'runs' ],
					'permission_callback' => [ $this, 'manage_permission' ],
					'args'                => [ 'id' => [ 'sanitize_callback' => 'absint' ] ],
				],
			]
		);

		register_rest_route(
			self::NAMESPACE,
			'/workflows/(?P<id>\d+)/test',
			[
				[
					'methods'             => 'POST',
					'callback'            => [ $this, 'test' ],
					'permission_callback' => [ $this, 'manage_permission' ],
					'args'                => [ 'id' => [ 'sanitize_callback' => 'absint' ] ],
				],
			]
		);
	}

	public function index(): WP_REST_Response {
		$items = array_map(
			static fn( $workflow ) => $workflow->to_array(),
			WorkflowRepository::instance()->all()
		);

		$forms = array_map(
			static fn( $form ) => [
				'id'     => $form->id,
				'title'  => $form->title,
				'fields' => array_map(
					static fn( $field ) => [
						'id'    => (string) ( $field['id'] ?? '' ),
						'label' => (string) ( $field['label'] ?? ( $field['id'] ?? '' ) ),
						'type'  => (string) ( $field['type'] ?? 'text' ),
					],
					$form->fields()
				),
			],
			FormRepository::instance()->all( [ 'per_page' => 100 ] )['items']
		);

		$templates = array_map(
			static fn( $template ) => [
				'id'    => $template->id,
				'title' => $template->title,
			],
			EmailTemplateRepository::instance()->all()
		);

		return new WP_REST_Response(
			[
				'items'     => $items,
				'forms'     => $forms,
				'templates' => $templates,
			],
			200
		);
	}

	public function create( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		// REST requests do not fire admin_init, so heal a missing table here too.
		Schema::maybe_upgrade();

		$params = (array) $request->get_json_params();
		$title  = sanitize_text_field( (string) ( $params['title'] ?? '' ) );
		if ( '' === $title ) {
			$title = __( 'Untitled workflow', 'flexa-formflow' );
		}
		$config = is_array( $params['config'] ?? null ) ? $params['config'] : [];

		$id       = WorkflowRepository::instance()->create( $title, $config );
		$workflow = $id > 0 ? WorkflowRepository::instance()->find( $id ) : null;

		if ( null === $workflow ) {
			return new WP_Error(
				'flexa_formflow_workflow_create_failed',
				__( 'The workflow could not be created. Please reload the page and try again.', 'flexa-formflow' ),
				[ 'status' => 500 ]
			);
		}

		return new WP_REST_Response( [ 'workflow' => $workflow->to_array() ], 201 );
	}

	public function show( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$workflow = WorkflowRepository::instance()->find( (int) $request->get_param( 'id' ) );
		if ( null === $workflow ) {
			return $this->not_found();
		}

		return new WP_REST_Response( [ 'workflow' => $workflow->to_array() ], 200 );
	}

	public function update( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$id   = (int) $request->get_param( 'id' );
		$repo = WorkflowRepository::instance();
		if ( null === $repo->find( $id ) ) {
			return $this->not_found();
		}

		$params = (array) $request->get_json_params();
		$fields = array_intersect_key( $params, array_flip( [ 'title', 'status', 'config' ] ) );
		$repo->update( $id, $fields );

		$workflow = $repo->find( $id );

		return new WP_REST_Response( [ 'workflow' => $workflow->to_array() ], 200 );
	}

	public function destroy( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$id   = (int) $request->get_param( 'id' );
		$repo = WorkflowRepository::instance();
		if ( null === $repo->find( $id ) ) {
			return $this->not_found();
		}

		$repo->delete( $id );
		WorkflowRunRepository::instance()->delete_for_workflow( $id );

		return new WP_REST_Response( [ 'deleted' => true ], 200 );
	}

	public function test( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$workflow = WorkflowRepository::instance()->find( (int) $request->get_param( 'id' ) );
		if ( null === $workflow ) {
			return $this->not_found();
		}

		$form_id = $workflow->trigger()['form_id'];
		$entries = EntryRepository::instance()->all(
			array_merge( [ 'per_page' => 1 ], $form_id > 0 ? [ 'form_id' => $form_id ] : [] )
		);
		$entry   = $entries['items'][0] ?? null;
		if ( null === $entry ) {
			return new WP_REST_Response(
				[
					'ran'  => false,
					'log'  => [],
					'note' => __( 'No entries yet to test against. Submit the form once, then run the test.', 'flexa-formflow' ),
				],
				200
			);
		}

		$form = FormRepository::instance()->find( $entry->form_id );
		if ( null === $form ) {
			return $this->not_found();
		}

		// Test runs never persist: the Logs tab shows only runs the live form fired.
		$log = Engine::instance()->run( $workflow, $form, $entry, false );

		return new WP_REST_Response(
			[
				'ran' => true,
				'log' => $log,
			],
			200
		);
	}

	public function runs( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$id = (int) $request->get_param( 'id' );
		if ( null === WorkflowRepository::instance()->find( $id ) ) {
			return $this->not_found();
		}

		$page   = max( 1, (int) $request->get_param( 'page' ) );
		$result = WorkflowRunRepository::instance()->for_workflow( $id, [ 'page' => $page ] );

		return new WP_REST_Response(
			[
				'items' => array_map(
					static fn( $run ) => $run->to_array(),
					$result['items']
				),
				'total' => $result['total'],
			],
			200
		);
	}

	private function not_found(): WP_Error {
		return new WP_Error( 'flexa_formflow_not_found', __( 'Workflow not found.', 'flexa-formflow' ), [ 'status' => 404 ] );
	}
}
