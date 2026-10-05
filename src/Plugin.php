<?php

declare(strict_types=1);

namespace Flexa\FormFlow;

use Flexa\FormFlow\Concerns\HasInstance;

defined( 'ABSPATH' ) || exit;

final class Plugin {
	use HasInstance;

	private bool $booted = false;

	public function boot(): void {
		if ( $this->booted ) {
			return;
		}
		$this->booted = true;

		Api\Router::instance()->register();

		add_action( 'admin_init', [ Database\Schema::class, 'maybe_upgrade' ] );

		Frontend\Shortcode::instance()->register();
		Frontend\Block::instance()->register();
		Emails\Notifications::instance()->register();
		Emails\Render\Visibility::instance()->register();
		Workflows\Engine::instance()->register();
		Integrations\ActivityRecorder::instance()->register();

		// WooCommerce email takeover: only wire the interceptor and render
		// extensions when WooCommerce is active. The plugin keeps working without
		// it; the settings screen still loads and explains the requirement.
		if ( class_exists( \WooCommerce::class ) ) {
			WooCommerce\Bootstrap::instance()->register();
		}

		if ( is_admin() ) {
			Admin\Menu::instance()->register();
			Admin\Enqueue::instance()->register();
			Admin\ActivationRedirect::instance()->register();
		}
	}
}
