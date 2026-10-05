<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Api;

use Flexa\FormFlow\Domain\Library\LibraryRepository;
use Flexa\FormFlow\Library\Catalog;
use Flexa\FormFlow\Packs\InstallState;
use Flexa\FormFlow\Packs\Installer;
use Flexa\FormFlow\Packs\Registry;
use Flexa\FormFlow\Packs\Restorer;
use Flexa\FormFlow\Packs\Uninstaller;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

defined( 'ABSPATH' ) || exit;

/**
 * The Library REST surface: the discoverable catalog (read-only) and My Library
 * (the user's saved reusable assets). Save-from-builder posts the payload the
 * builder already holds client-side, so there is one generic create primitive
 * rather than one endpoint per source type.
 */
final class LibraryEndpoint extends Endpoint {
	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/library/catalog',
			[
				[
					'methods'             => 'GET',
					'callback'            => [ $this, 'catalog' ],
					'permission_callback' => [ $this, 'manage_permission' ],
				],
			]
		);

		register_rest_route(
			self::NAMESPACE,
			'/library/packs/(?P<id>[a-z0-9-]+)',
			[
				[
					'methods'             => 'GET',
					'callback'            => [ $this, 'pack' ],
					'permission_callback' => [ $this, 'manage_permission' ],
					'args'                => [ 'id' => [ 'sanitize_callback' => 'sanitize_key' ] ],
				],
			]
		);

		register_rest_route(
			self::NAMESPACE,
			'/library/packs/(?P<id>[a-z0-9-]+)/import',
			[
				[
					'methods'             => 'POST',
					'callback'            => [ $this, 'import' ],
					'permission_callback' => [ $this, 'manage_permission' ],
					'args'                => [ 'id' => [ 'sanitize_callback' => 'sanitize_key' ] ],
				],
			]
		);

		register_rest_route(
			self::NAMESPACE,
			'/library/packs/(?P<id>[a-z0-9-]+)/diff',
			[
				[
					'methods'             => 'GET',
					'callback'            => [ $this, 'diff' ],
					'permission_callback' => [ $this, 'manage_permission' ],
					'args'                => [ 'id' => [ 'sanitize_callback' => 'sanitize_key' ] ],
				],
			]
		);

		register_rest_route(
			self::NAMESPACE,
			'/library/packs/(?P<id>[a-z0-9-]+)/update',
			[
				[
					'methods'             => 'POST',
					'callback'            => [ $this, 'update_pack' ],
					'permission_callback' => [ $this, 'manage_permission' ],
					'args'                => [ 'id' => [ 'sanitize_callback' => 'sanitize_key' ] ],
				],
			]
		);

		register_rest_route(
			self::NAMESPACE,
			'/library/packs/(?P<id>[a-z0-9-]+)/status',
			[
				[
					'methods'             => 'GET',
					'callback'            => [ $this, 'pack_status' ],
					'permission_callback' => [ $this, 'manage_permission' ],
					'args'                => [ 'id' => [ 'sanitize_callback' => 'sanitize_key' ] ],
				],
			]
		);

		register_rest_route(
			self::NAMESPACE,
			'/library/packs/(?P<id>[a-z0-9-]+)',
			[
				[
					'methods'             => 'DELETE',
					'callback'            => [ $this, 'uninstall' ],
					'permission_callback' => [ $this, 'manage_permission' ],
					'args'                => [ 'id' => [ 'sanitize_callback' => 'sanitize_key' ] ],
				],
			]
		);

		register_rest_route(
			self::NAMESPACE,
			'/library/packs/(?P<id>[a-z0-9-]+)/restore',
			[
				[
					'methods'             => 'POST',
					'callback'            => [ $this, 'restore' ],
					'permission_callback' => [ $this, 'manage_permission' ],
					'args'                => [ 'id' => [ 'sanitize_callback' => 'sanitize_key' ] ],
				],
			]
		);

		register_rest_route(
			self::NAMESPACE,
			'/library/mine',
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
			'/library/mine/(?P<id>\d+)',
			[
				[
					'methods'             => 'DELETE',
					'callback'            => [ $this, 'destroy' ],
					'permission_callback' => [ $this, 'manage_permission' ],
					'args'                => [ 'id' => [ 'sanitize_callback' => 'absint' ] ],
				],
			]
		);
	}

	public function catalog(): WP_REST_Response {
		return new WP_REST_Response( [ 'items' => Catalog::items() ], 200 );
	}

	public function pack( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$manifest = Registry::find( (string) $request->get_param( 'id' ) );
		if ( null === $manifest ) {
			return new WP_Error( 'flexa_formflow_pack_not_found', __( 'Pack not found.', 'flexa-formflow' ), [ 'status' => 404 ] );
		}

		$detail                    = $manifest->to_detail_array();
		$detail['installed']       = InstallState::is_installed( $manifest->id );
		$detail['updateAvailable'] = $detail['installed'] && InstallState::version_of( $manifest->id ) !== $manifest->version;

		return new WP_REST_Response( [ 'pack' => $detail ], 200 );
	}

	public function diff( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$manifest = Registry::find( (string) $request->get_param( 'id' ) );
		if ( null === $manifest ) {
			return new WP_Error( 'flexa_formflow_pack_not_found', __( 'Pack not found.', 'flexa-formflow' ), [ 'status' => 404 ] );
		}
		if ( ! InstallState::is_installed( $manifest->id ) ) {
			return new WP_Error( 'flexa_formflow_pack_not_installed', __( 'This pack is not installed.', 'flexa-formflow' ), [ 'status' => 409 ] );
		}

		return new WP_REST_Response( [ 'diff' => Installer::instance()->diff( $manifest ) ], 200 );
	}

	public function update_pack( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$manifest = Registry::find( (string) $request->get_param( 'id' ) );
		if ( null === $manifest ) {
			return new WP_Error( 'flexa_formflow_pack_not_found', __( 'Pack not found.', 'flexa-formflow' ), [ 'status' => 404 ] );
		}
		if ( ! InstallState::is_installed( $manifest->id ) ) {
			return new WP_Error( 'flexa_formflow_pack_not_installed', __( 'This pack is not installed.', 'flexa-formflow' ), [ 'status' => 409 ] );
		}

		$params    = (array) $request->get_json_params();
		$raw       = is_array( $params['decisions'] ?? null ) ? $params['decisions'] : [];
		$allowed   = [ 'take_update', 'keep_mine', 'keep_both' ];
		$decisions = [];
		foreach ( $raw as $ref => $action ) {
			$action = sanitize_text_field( (string) $action );
			if ( in_array( $action, $allowed, true ) ) {
				$decisions[ sanitize_text_field( (string) $ref ) ] = $action;
			}
		}

		$summary = Installer::instance()->update( $manifest, $decisions );

		return new WP_REST_Response( [ 'summary' => $summary ], 200 );
	}

	public function import( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$manifest = Registry::find( (string) $request->get_param( 'id' ) );
		if ( null === $manifest ) {
			return new WP_Error( 'flexa_formflow_pack_not_found', __( 'Pack not found.', 'flexa-formflow' ), [ 'status' => 404 ] );
		}
		if ( InstallState::is_installed( $manifest->id ) ) {
			return new WP_Error( 'flexa_formflow_pack_installed', __( 'This pack is already installed.', 'flexa-formflow' ), [ 'status' => 409 ] );
		}

		$summary = Installer::instance()->import( $manifest );

		return new WP_REST_Response( [ 'summary' => $summary ], 201 );
	}

	/**
	 * Which of an installed pack's items are still on the site. Backs the
	 * "N items missing" line and its Restore action, and (for patterns) the
	 * uninstall confirm dialog: a present pattern is flagged `willBeDeleted`
	 * when this is the last currently-installed pack that still declares it,
	 * mirroring exactly what {@see Uninstaller::uninstall()} would do.
	 */
	public function pack_status( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$manifest = Registry::find( (string) $request->get_param( 'id' ) );
		if ( null === $manifest ) {
			return new WP_Error( 'flexa_formflow_pack_not_found', __( 'Pack not found.', 'flexa-formflow' ), [ 'status' => 404 ] );
		}
		if ( ! InstallState::is_installed( $manifest->id ) ) {
			return new WP_Error( 'flexa_formflow_pack_not_installed', __( 'This pack is not installed.', 'flexa-formflow' ), [ 'status' => 409 ] );
		}

		$status = Restorer::instance()->status( $manifest );
		foreach ( $status['items'] as &$item ) {
			$item['willBeDeleted'] = 'patterns' === $item['group'] && $item['present']
				&& ! Uninstaller::still_needed_elsewhere( $item['ref'], $manifest->id );
		}
		unset( $item );

		return new WP_REST_Response( [ 'status' => $status ], 200 );
	}

	/**
	 * Recreate the deleted items of an installed pack. Untouched items are left
	 * alone, so this is safe to run when nothing is missing.
	 */
	public function restore( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$manifest = Registry::find( (string) $request->get_param( 'id' ) );
		if ( null === $manifest ) {
			return new WP_Error( 'flexa_formflow_pack_not_found', __( 'Pack not found.', 'flexa-formflow' ), [ 'status' => 404 ] );
		}
		if ( ! InstallState::is_installed( $manifest->id ) ) {
			return new WP_Error( 'flexa_formflow_pack_not_installed', __( 'This pack is not installed.', 'flexa-formflow' ), [ 'status' => 409 ] );
		}

		return new WP_REST_Response( [ 'summary' => Restorer::instance()->restore( $manifest ) ], 200 );
	}

	/**
	 * Delete exactly the rows this pack's install (and any later restore) is
	 * recorded to have created, then clear the install stamp. A row already
	 * missing is skipped, not an error, so this also cleans up a pack stuck in
	 * the same "installed, partly deleted" state {@see restore()} exists to fix.
	 */
	public function uninstall( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$manifest = Registry::find( (string) $request->get_param( 'id' ) );
		if ( null === $manifest ) {
			return new WP_Error( 'flexa_formflow_pack_not_found', __( 'Pack not found.', 'flexa-formflow' ), [ 'status' => 404 ] );
		}
		if ( ! InstallState::is_installed( $manifest->id ) ) {
			return new WP_Error( 'flexa_formflow_pack_not_installed', __( 'This pack is not installed.', 'flexa-formflow' ), [ 'status' => 409 ] );
		}

		return new WP_REST_Response( [ 'summary' => Uninstaller::instance()->uninstall( $manifest ) ], 200 );
	}

	public function index(): WP_REST_Response {
		$items = array_map(
			static fn( $asset ) => $asset->to_array(),
			LibraryRepository::instance()->all()
		);

		return new WP_REST_Response( [ 'items' => $items ], 200 );
	}

	public function create( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$params  = (array) $request->get_json_params();
		$type    = sanitize_text_field( (string) ( $params['type'] ?? 'pattern' ) );
		$kind    = sanitize_text_field( (string) ( $params['kind'] ?? 'form' ) );
		$name    = sanitize_text_field( (string) ( $params['name'] ?? '' ) );
		$payload = is_array( $params['payload'] ?? null ) ? $params['payload'] : [];
		$source  = is_array( $params['source'] ?? null ) ? $params['source'] : [];

		if ( '' === $name ) {
			$name = __( 'Untitled', 'flexa-formflow' );
		}
		if ( [] === $payload ) {
			return new WP_Error( 'flexa_formflow_empty_payload', __( 'There is nothing to save.', 'flexa-formflow' ), [ 'status' => 400 ] );
		}

		$id = LibraryRepository::instance()->create( $type, $name, $kind, $payload, $source );
		if ( $id <= 0 ) {
			return new WP_Error( 'flexa_formflow_create_failed', __( 'The item could not be saved.', 'flexa-formflow' ), [ 'status' => 500 ] );
		}

		$asset = LibraryRepository::instance()->find( $id );

		return new WP_REST_Response( [ 'asset' => $asset?->to_array() ], 201 );
	}

	public function destroy( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$id   = (int) $request->get_param( 'id' );
		$repo = LibraryRepository::instance();
		if ( null === $repo->find( $id ) ) {
			return new WP_Error( 'flexa_formflow_not_found', __( 'Item not found.', 'flexa-formflow' ), [ 'status' => 404 ] );
		}

		$repo->delete( $id );

		return new WP_REST_Response( [ 'deleted' => true ], 200 );
	}
}
