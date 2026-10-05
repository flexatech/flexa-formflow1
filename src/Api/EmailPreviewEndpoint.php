<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Api;

use Flexa\FormFlow\Domain\Entries\EntryRepository;
use Flexa\FormFlow\Domain\Forms\FormRepository;
use Flexa\FormFlow\Emails\Render\RenderContext;
use Flexa\FormFlow\Emails\Render\Renderer;
use Flexa\FormFlow\Emails\TreeSanitizer;
use WP_REST_Request;
use WP_REST_Response;

defined( 'ABSPATH' ) || exit;

final class EmailPreviewEndpoint extends Endpoint {
	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/email-preview',
			[
				[
					'methods'             => 'POST',
					'callback'            => [ $this, 'render' ],
					'permission_callback' => [ $this, 'manage_permission' ],
				],
			]
		);
	}

	public function render( WP_REST_Request $request ): WP_REST_Response {
		$params = (array) $request->get_json_params();
		$tree   = TreeSanitizer::sanitize( is_array( $params['tree'] ?? null ) ? $params['tree'] : [] );
		$ctx    = self::build_context( $params, true );

		$html = Renderer::instance()->render_tree( $tree, $ctx );

		return new WP_REST_Response( [ 'html' => $html ], 200 );
	}

	/**
	 * Build a preview/test render context from request params: the chosen form
	 * (if any) and its most recent entry, so field tokens show real data.
	 *
	 * @param array<string, mixed> $params
	 */
	public static function build_context( array $params, bool $is_preview ): RenderContext {
		$form_id = (int) ( $params['form_id'] ?? 0 );
		$type    = 'confirmation' === ( $params['type'] ?? '' ) ? 'confirmation' : 'admin';

		$form  = $form_id > 0 ? FormRepository::instance()->find( $form_id ) : null;
		$entry = null;
		if ( null !== $form ) {
			$recent = EntryRepository::instance()->all(
				[
					'form_id'  => $form->id,
					'per_page' => 1,
				]
			);
			$entry  = $recent['items'][0] ?? null;
		}

		return new RenderContext( form: $form, entry: $entry, type: $type, is_preview: $is_preview );
	}
}
