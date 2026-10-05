<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Admin;

use Flexa\FormFlow\Concerns\HasInstance;
use Flexa\FormFlow\Support\Capabilities;
use Flexa\FormFlow\Support\OnboardingState;

defined( 'ABSPATH' ) || exit;

/**
 * Lands a newly-activating admin on the plugin page exactly once so the
 * welcome guide can greet them. The transient is consumed BEFORE any guard
 * can bail, so a blocked redirect never re-fires. A dismissible notice on the
 * Plugins screen covers the paths the redirect cannot (WP-CLI, bulk
 * activation, a different admin).
 */
final class ActivationRedirect {
	use HasInstance;

	public const REDIRECT_TRANSIENT = 'flexa_formflow_activation_redirect';

	private const NOTICE_NONCE = 'flexa_formflow_dismiss_welcome';

	public function register(): void {
		add_action( 'admin_init', [ $this, 'maybe_redirect' ] );
		add_action( 'admin_init', [ $this, 'maybe_dismiss_notice' ] );
		add_action( 'admin_notices', [ $this, 'maybe_render_notice' ] );
	}

	public function maybe_redirect(): void {
		$user_id = get_transient( self::REDIRECT_TRANSIENT );
		if ( false === $user_id ) {
			return;
		}
		delete_transient( self::REDIRECT_TRANSIENT );

		if ( wp_doing_ajax() || is_network_admin() ) {
			return;
		}
		// Bulk activation: never steal the user away from the Plugins screen.
		// Nonce-free read is fine - this only skips a convenience redirect.
		if ( isset( $_GET['activate-multi'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			return;
		}
		if ( (int) $user_id !== get_current_user_id() || ! Capabilities::can_manage() ) {
			return;
		}
		if ( OnboardingState::is_finished() ) {
			return;
		}

		wp_safe_redirect( admin_url( 'admin.php?page=' . Menu::SLUG ) );
		exit;
	}

	public function maybe_dismiss_notice(): void {
		if ( ! isset( $_GET['flexa_formflow_dismiss_welcome'] ) ) {
			return;
		}
		check_admin_referer( self::NOTICE_NONCE );
		if ( ! Capabilities::can_manage() ) {
			return;
		}

		OnboardingState::update( [ 'status' => 'dismissed' ] );

		wp_safe_redirect( remove_query_arg( [ 'flexa_formflow_dismiss_welcome', '_wpnonce' ] ) );
		exit;
	}

	public function maybe_render_notice(): void {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( null === $screen || 'plugins' !== $screen->id ) {
			return;
		}
		if ( ! Capabilities::can_manage() || 'pending' !== OnboardingState::all()['status'] ) {
			return;
		}

		$start_url   = admin_url( 'admin.php?page=' . Menu::SLUG );
		$dismiss_url = wp_nonce_url(
			add_query_arg( 'flexa_formflow_dismiss_welcome', '1' ),
			self::NOTICE_NONCE
		);

		echo '<div class="notice notice-info"><p>';
		echo '<strong>' . esc_html__( 'Flexa FormFlow is ready.', 'flexa-formflow' ) . '</strong> ';
		echo esc_html__( 'Build your first form and its emails in a couple of minutes.', 'flexa-formflow' );
		echo '</p><p>';
		echo '<a class="button button-primary" href="' . esc_url( $start_url ) . '">' . esc_html__( 'Open the guide', 'flexa-formflow' ) . '</a> ';
		echo '<a class="button" href="' . esc_url( $dismiss_url ) . '">' . esc_html__( 'Dismiss', 'flexa-formflow' ) . '</a>';
		echo '</p></div>';
	}
}
