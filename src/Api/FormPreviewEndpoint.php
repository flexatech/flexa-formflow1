<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Api;

use Flexa\FormFlow\Domain\Forms\FieldTypes;
use Flexa\FormFlow\Domain\Forms\Form;
use Flexa\FormFlow\Frontend\Shortcode;
use Flexa\FormFlow\Support\Settings;
use WP_REST_Request;
use WP_REST_Response;

defined( 'ABSPATH' ) || exit;

/**
 * Renders a form's current draft config to the same markup a visitor sees, so
 * the builder can show a quick preview of unsaved changes. The document loads
 * the frontend stylesheet plus a small preview layer, and submission is blocked:
 * this is a look-and-feel preview, not a live form.
 */
final class FormPreviewEndpoint extends Endpoint {
	/** Handle for the preview-only stylesheet and submit guard. */
	private const ASSET_HANDLE = 'flexa-formflow-form-preview';

	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/forms/preview',
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
		$config = FieldTypes::sanitize_config( is_array( $params['config'] ?? null ) ? $params['config'] : [] );
		$title  = sanitize_text_field( (string) ( $params['title'] ?? '' ) );

		// A throwaway Form for rendering only: status is forced to published so
		// the template renders regardless of the draft's real state, and the
		// uuid is a fixed preview marker (never persisted).
		$form = new Form(
			id: 0,
			uuid: 'preview',
			title: $title,
			status: 'published',
			config: $config,
			created_at: '',
			updated_at: '',
		);

		$brand  = (string) Settings::get( 'brand_color' );
		$markup = Shortcode::instance()->render_markup( $form, $brand );
		$html   = $this->document( $markup );

		return new WP_REST_Response( [ 'html' => $html ], 200 );
	}

	/**
	 * Wrap the form markup in a standalone HTML document for the preview iframe:
	 * a neutral page background, the form on a card, and a guard that stops the
	 * preview form from actually submitting. Both the CSS and the guard are real
	 * files registered with WordPress, and the tags come from wp_print_styles()
	 * and wp_print_scripts() rather than being written by hand.
	 */
	private function document( string $markup ): string {
		$this->register_assets();

		$note = esc_html__( 'This is a preview. The form does not submit here.', 'flexa-formflow' );

		return '<!DOCTYPE html><html ' . get_language_attributes() . '><head><meta charset="utf-8" />'
			. '<meta name="viewport" content="width=device-width, initial-scale=1" />'
			. $this->printed( static fn () => wp_print_styles( [ self::ASSET_HANDLE ] ) )
			. '</head><body>'
			. '<div class="flexa-formflow-preview-wrap">' . $markup . '</div>'
			. '<span hidden>' . $note . '</span>'
			. $this->printed( static fn () => wp_print_scripts( [ self::ASSET_HANDLE ] ) )
			. '</body></html>';
	}

	/**
	 * Register what the preview document loads. A REST request never fires
	 * wp_enqueue_scripts, so the frontend handles are registered on demand (a
	 * repeat registration is a no-op) and the preview layer is declared on top
	 * of the form stylesheet. The frontend submit script is deliberately left
	 * out: the preview never talks to the submit endpoint.
	 */
	private function register_assets(): void {
		Shortcode::instance()->register_assets();

		wp_register_style(
			self::ASSET_HANDLE,
			FLEXA_FORMFLOW_URL . 'assets/admin/preview.css',
			[ Shortcode::ASSET_HANDLE ],
			FLEXA_FORMFLOW_VERSION
		);
		wp_register_script(
			self::ASSET_HANDLE,
			FLEXA_FORMFLOW_URL . 'assets/admin/preview.js',
			[],
			FLEXA_FORMFLOW_VERSION,
			[ 'in_footer' => true ]
		);
	}

	/**
	 * Capture what a WordPress print function echoes, so the tags can be placed
	 * in the document this endpoint returns.
	 */
	private function printed( callable $print ): string {
		ob_start();
		$print();

		return (string) ob_get_clean();
	}
}
