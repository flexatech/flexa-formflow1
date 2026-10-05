<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Admin;

use Flexa\FormFlow\Concerns\HasInstance;

defined( 'ABSPATH' ) || exit;

final class Menu {
	use HasInstance;

	public const SLUG = 'flexa-formflow';

	public function register(): void {
		add_action( 'admin_menu', [ $this, 'register_menu' ] );
		add_filter( 'plugin_action_links_' . FLEXA_FORMFLOW_BASENAME, [ $this, 'action_links' ] );
	}

	/**
	 * @param array<int|string, string> $links
	 * @return array<int|string, string>
	 */
	public function action_links( array $links ): array {
		$settings = sprintf(
			'<a href="%s">%s</a>',
			esc_url( admin_url( 'admin.php?page=' . self::SLUG ) ),
			esc_html__( 'Open FormFlow', 'flexa-formflow' )
		);

		array_unshift( $links, $settings );

		return $links;
	}

	public function register_menu(): void {
		add_menu_page(
			__( 'Flexa FormFlow', 'flexa-formflow' ),
			__( 'Flexa FormFlow', 'flexa-formflow' ),
			'manage_options',
			self::SLUG,
			[ $this, 'render_page' ],
			'dashicons-forms'
		);
	}

	public function render_page(): void {
		$template = FLEXA_FORMFLOW_PATH . 'templates/admin-app.php';
		if ( is_readable( $template ) ) {
			require $template;
		}
	}
}
