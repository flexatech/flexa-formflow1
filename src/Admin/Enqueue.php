<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Admin;

use Flexa\FormFlow\Concerns\HasInstance;
use Flexa\FormFlow\Extensions\Registry;
use Flexa\FormFlow\Support\Capabilities;
use Flexa\FormFlow\Support\OnboardingState;

defined( 'ABSPATH' ) || exit;

/**
 * Reads the Vite manifest and enqueues the built admin bundle on the plugin
 * page, then publishes the `flexaFormFlow` global the React app boots from.
 */
final class Enqueue {
	use HasInstance;

	private const HANDLE = 'flexa-formflow-admin';

	public function register(): void {
		add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_admin' ] );
	}

	public function enqueue_admin( string $hook_suffix ): void {
		if ( 'toplevel_page_' . Menu::SLUG !== $hook_suffix ) {
			return;
		}

		$this->enqueue_prod( self::HANDLE, 'src/main.tsx' );

		if ( function_exists( 'wp_set_script_translations' ) ) {
			wp_set_script_translations(
				self::HANDLE,
				FLEXA_FORMFLOW_TEXT_DOMAIN,
				FLEXA_FORMFLOW_PATH . 'i18n/languages'
			);
		}

		wp_localize_script(
			self::HANDLE,
			'flexaFormFlow',
			[
				'restUrl'           => esc_url_raw( rest_url( FLEXA_FORMFLOW_REST_NAMESPACE . '/' ) ),
				'restNonce'         => wp_create_nonce( 'wp_rest' ),
				'namespace'         => FLEXA_FORMFLOW_REST_NAMESPACE,
				'version'           => FLEXA_FORMFLOW_VERSION,
				'pluginUrl'         => esc_url_raw( FLEXA_FORMFLOW_URL ),
				'adminUrl'          => esc_url_raw( admin_url( 'admin.php?page=' . Menu::SLUG ) ),
				'locale'            => determine_locale(),
				'theme'             => $this->detect_admin_theme(),
				'canManageSettings' => Capabilities::can_manage_settings(),
				'hasWooCommerce'    => class_exists( \WooCommerce::class ),
				'onboarding'        => OnboardingState::all(),
				'extensions'        => Registry::all(),
			]
		);
	}

	private function detect_admin_theme(): string {
		$scheme = (string) get_user_option( 'admin_color' );
		if ( '' === $scheme ) {
			$scheme = 'fresh';
		}
		$dark = [ 'midnight', 'ectoplasm', 'ocean', 'coffee' ];

		return in_array( $scheme, $dark, true ) ? 'dark' : 'light';
	}

	private function enqueue_prod( string $handle, string $entry ): void {
		$manifest_path = FLEXA_FORMFLOW_PATH . 'assets/dist/.vite/manifest.json';
		if ( ! is_readable( $manifest_path ) ) {
			$manifest_path = FLEXA_FORMFLOW_PATH . 'assets/dist/manifest.json';
		}
		if ( ! is_readable( $manifest_path ) ) {
			return;
		}

		$manifest_raw = file_get_contents( $manifest_path );
		if ( false === $manifest_raw ) {
			return;
		}
		$manifest = json_decode( $manifest_raw, true );
		if ( ! is_array( $manifest ) || ! isset( $manifest[ $entry ] ) || ! is_array( $manifest[ $entry ] ) ) {
			return;
		}

		$item     = $manifest[ $entry ];
		$dist_url = FLEXA_FORMFLOW_URL . 'assets/dist/';

		foreach ( $this->collect_manifest_css( $manifest, $entry ) as $i => $css_file ) {
			wp_enqueue_style( $handle . '-css-' . $i, $dist_url . $css_file, [], FLEXA_FORMFLOW_VERSION );
		}

		wp_enqueue_script(
			$handle,
			$dist_url . ( is_string( $item['file'] ?? null ) ? $item['file'] : '' ),
			[ 'wp-i18n' ],
			FLEXA_FORMFLOW_VERSION,
			true
		);

		add_filter(
			'script_loader_tag',
			static function ( string $tag, string $h ) use ( $handle ): string {
				return $h === $handle ? str_replace( '<script ', '<script type="module" ', $tag ) : $tag;
			},
			10,
			2
		);
	}

	/**
	 * @param array<string, mixed> $manifest
	 * @param array<string, true>  $seen
	 * @return list<string>
	 */
	private function collect_manifest_css( array $manifest, string $key, array &$seen = [] ): array {
		if ( isset( $seen[ $key ] ) || ! isset( $manifest[ $key ] ) || ! is_array( $manifest[ $key ] ) ) {
			return [];
		}
		$seen[ $key ] = true;

		$item = $manifest[ $key ];
		$css  = ! empty( $item['css'] ) && is_array( $item['css'] ) ? $item['css'] : [];

		if ( ! empty( $item['imports'] ) && is_array( $item['imports'] ) ) {
			foreach ( $item['imports'] as $import_key ) {
				$css = array_merge( $css, $this->collect_manifest_css( $manifest, (string) $import_key, $seen ) );
			}
		}

		return array_values( array_unique( $css ) );
	}
}
