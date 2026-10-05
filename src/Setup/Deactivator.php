<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Setup;

defined( 'ABSPATH' ) || exit;

final class Deactivator {
	public static function deactivate(): void {
		// Templates and settings are kept; WooCommerce falls back to its
		// default emails while the plugin is inactive.
	}
}
