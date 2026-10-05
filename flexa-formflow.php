<?php
/**
 * Plugin Name:       Flexa FormFlow
 * Plugin URI:        https://github.com/flexatech/flexa-formflow
 * Description:       Build forms, collect entries, and design the emails they trigger. Every form field becomes a token you can drop into a visual email.
 * Version:           1.1.0
 * Requires at least: 6.5
 * Requires PHP:      8.1
 * Author:            FlexaTech
 * Author URI:        https://github.com/flexatech
 * License:           GPL v2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       flexa-formflow
 * Domain Path:       /i18n/languages
 */

declare(strict_types=1);

defined( 'ABSPATH' ) || exit;

if ( version_compare( PHP_VERSION, '8.1', '<' ) ) {
	add_action(
		'admin_notices',
		static function (): void {
			echo '<div class="notice notice-error"><p>';
			echo esc_html__( 'Flexa FormFlow requires PHP 8.1 or higher. The plugin has been disabled.', 'flexa-formflow' );
			echo '</p></div>';
		}
	);
	return;
}

define( 'FLEXA_FORMFLOW_VERSION', '1.1.0' );
define( 'FLEXA_FORMFLOW_FILE', __FILE__ );
define( 'FLEXA_FORMFLOW_PATH', plugin_dir_path( __FILE__ ) );
define( 'FLEXA_FORMFLOW_URL', plugin_dir_url( __FILE__ ) );
define( 'FLEXA_FORMFLOW_BASENAME', plugin_basename( __FILE__ ) );
define( 'FLEXA_FORMFLOW_REST_NAMESPACE', 'flexa-formflow/v1' );
define( 'FLEXA_FORMFLOW_TEXT_DOMAIN', 'flexa-formflow' );

if ( file_exists( FLEXA_FORMFLOW_PATH . 'vendor/autoload.php' ) ) {
	require_once FLEXA_FORMFLOW_PATH . 'vendor/autoload.php';
} else {
	spl_autoload_register(
		static function ( string $class ): void {
			$prefix = 'Flexa\FormFlow\\';
			if ( ! str_starts_with( $class, $prefix ) ) {
				return;
			}
			$relative = substr( $class, strlen( $prefix ) );
			$file     = FLEXA_FORMFLOW_PATH . 'src/' . str_replace( '\\', '/', $relative ) . '.php';
			if ( is_readable( $file ) ) {
				require $file;
			}
		}
	);
}

register_activation_hook( __FILE__, [ \Flexa\FormFlow\Setup\Activator::class, 'activate' ] );
register_deactivation_hook( __FILE__, [ \Flexa\FormFlow\Setup\Deactivator::class, 'deactivate' ] );

add_action(
	'plugins_loaded',
	static function (): void {
		\Flexa\FormFlow\Plugin::instance()->boot();
	}
);
