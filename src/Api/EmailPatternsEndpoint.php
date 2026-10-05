<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Api;

use Flexa\FormFlow\Emails\Patterns;
use WP_REST_Response;

defined( 'ABSPATH' ) || exit;

/**
 * Serves the curated email patterns the builder's Patterns tab offers. Read
 * only: the payloads are static, describe-as-data block groups (see
 * Emails\Patterns), and the client assigns fresh ids when a pattern is dropped.
 */
final class EmailPatternsEndpoint extends Endpoint {
	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/emails/patterns',
			[
				[
					'methods'             => 'GET',
					'callback'            => [ $this, 'index' ],
					'permission_callback' => [ $this, 'manage_permission' ],
				],
			]
		);
	}

	public function index(): WP_REST_Response {
		return new WP_REST_Response( [ 'patterns' => Patterns::all() ], 200 );
	}
}
