<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Frontend;

use Flexa\FormFlow\Concerns\HasInstance;
use Flexa\FormFlow\Domain\Forms\FormRepository;

defined( 'ABSPATH' ) || exit;

final class Block {
	use HasInstance;

	public function register(): void {
		add_action( 'init', [ $this, 'register_block' ] );
	}

	public function register_block(): void {
		wp_register_script(
			'flexa-formflow-block-editor',
			FLEXA_FORMFLOW_URL . 'assets/blocks/form/editor.js',
			[ 'wp-blocks', 'wp-element', 'wp-components', 'wp-block-editor', 'wp-server-side-render', 'wp-api-fetch', 'wp-i18n' ],
			FLEXA_FORMFLOW_VERSION,
			true
		);

		register_block_type(
			FLEXA_FORMFLOW_PATH . 'assets/blocks/form',
			[ 'render_callback' => [ $this, 'render' ] ]
		);
	}

	/**
	 * @param array<string, mixed> $attributes
	 */
	public function render( array $attributes ): string {
		$form = FormRepository::instance()->find( (int) ( $attributes['formId'] ?? 0 ) );

		return Shortcode::instance()->render( $form );
	}
}
