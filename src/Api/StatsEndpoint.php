<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Api;

use Flexa\FormFlow\Domain\Entries\EntryRepository;
use Flexa\FormFlow\Domain\Forms\FormRepository;
use WP_REST_Request;
use WP_REST_Response;

defined( 'ABSPATH' ) || exit;

final class StatsEndpoint extends Endpoint {
	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/stats',
			[
				[
					'methods'             => 'GET',
					'callback'            => [ $this, 'show' ],
					'permission_callback' => [ $this, 'manage_permission' ],
				],
			]
		);
	}

	public function show( WP_REST_Request $request ): WP_REST_Response {
		unset( $request );

		$entry_counts = EntryRepository::instance()->counts();

		return new WP_REST_Response(
			[
				'forms'               => FormRepository::instance()->count(),
				'entries'             => $entry_counts['total'],
				'unread'              => $entry_counts['unread'],
				'entries_last_7_days' => $entry_counts['last_7_days'],
			],
			200
		);
	}
}
