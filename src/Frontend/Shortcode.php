<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Frontend;

use Flexa\FormFlow\Concerns\HasInstance;
use Flexa\FormFlow\Domain\Forms\Form;
use Flexa\FormFlow\Domain\Forms\FormRepository;
use Flexa\FormFlow\Support\Capabilities;
use Flexa\FormFlow\Support\Settings;

defined( 'ABSPATH' ) || exit;

final class Shortcode {
	use HasInstance;

	public const TAG = 'flexa_formflow';

	/** Handle shared by the frontend form stylesheet and submit script. */
	public const ASSET_HANDLE = 'flexa-formflow-form';

	public function register(): void {
		add_shortcode( self::TAG, [ $this, 'render_shortcode' ] );
		add_action( 'wp_enqueue_scripts', [ $this, 'register_assets' ] );
	}

	public function register_assets(): void {
		wp_register_style(
			self::ASSET_HANDLE,
			FLEXA_FORMFLOW_URL . 'assets/frontend/form.css',
			[],
			FLEXA_FORMFLOW_VERSION
		);
		wp_register_script(
			self::ASSET_HANDLE,
			FLEXA_FORMFLOW_URL . 'assets/frontend/form.js',
			[],
			FLEXA_FORMFLOW_VERSION,
			[ 'in_footer' => true ]
		);
		wp_localize_script(
			self::ASSET_HANDLE,
			'flexaFormFlowFront',
			[
				'restUrl' => esc_url_raw( rest_url( FLEXA_FORMFLOW_REST_NAMESPACE . '/submit/' ) ),
			]
		);
	}

	/**
	 * @param array<string, mixed>|string $atts
	 */
	public function render_shortcode( array|string $atts ): string {
		$atts = shortcode_atts( [ 'id' => 0 ], is_array( $atts ) ? $atts : [] );
		$form = FormRepository::instance()->find( (int) $atts['id'] );

		return $this->render( $form );
	}

	public function render( ?Form $form ): string {
		if ( null === $form || ! $form->is_published() || [] === $form->fields() ) {
			// Managers get a hint; visitors get nothing.
			if ( null !== $form && Capabilities::can_manage() ) {
				return '<p><em>' . esc_html__( 'Flexa FormFlow: this form is not published or has no fields, so visitors see nothing here.', 'flexa-formflow' ) . '</em></p>';
			}
			return '';
		}

		wp_enqueue_style( self::ASSET_HANDLE );
		wp_enqueue_script( self::ASSET_HANDLE );

		$brand = (string) Settings::get( 'brand_color' );

		return $this->render_markup( $form, $brand );
	}

	/**
	 * Render just the form markup for a given brand color, with no publish guard
	 * and no asset enqueue. The frontend path and the admin preview share this so
	 * the two never drift; each caller enqueues the assets its own page needs.
	 */
	public function render_markup( Form $form, string $brand ): string {
		ob_start();
		include FLEXA_FORMFLOW_PATH . 'templates/form.php';

		return (string) ob_get_clean();
	}
}
