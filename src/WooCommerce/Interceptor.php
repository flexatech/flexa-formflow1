<?php

declare(strict_types=1);

namespace Flexa\FormFlow\WooCommerce;

use Flexa\FormFlow\Concerns\HasInstance;
use Flexa\FormFlow\Emails\Render\RenderContext;
use Flexa\FormFlow\Emails\Tokens;

defined( 'ABSPATH' ) || exit;

/**
 * Takes WooCommerce transactional emails over at three points: it swaps the
 * core template file for our renderer, blanks WooCommerce's own CSS (our HTML
 * is fully inline), and resolves the custom subject line. Every hook is a
 * no-op unless the matching email is enabled in settings, so takeover is
 * strictly opt-in and WooCommerce keeps its defaults for everything else.
 */
final class Interceptor {
	use HasInstance;

	public function register(): void {
		add_filter( 'wc_get_template', [ $this, 'swap_template' ], 99, 3 );
		add_filter( 'woocommerce_email_styles', [ $this, 'strip_styles' ], 99, 2 );
		// Catalog::emails() translates its labels, so it must not run before
		// init (WP 6.7+ warns about early textdomain loading). Emails are
		// always sent after init, so the subject filters are still in place.
		add_action( 'init', [ $this, 'register_subject_filters' ] );
	}

	public function register_subject_filters(): void {
		foreach ( array_keys( Catalog::emails() ) as $email_id ) {
			add_filter( 'woocommerce_email_subject_' . $email_id, [ $this, 'filter_subject' ], 99, 3 );
		}
	}

	/**
	 * Point WooCommerce at our renderer template when this email is enabled.
	 *
	 * @param array<string, mixed> $args
	 */
	public function swap_template( string $located, string $template_name, array $args ): string {
		// Plain-text variants live under emails/plain/ and are not in the map;
		// they fall through so text recipients still get a readable email.
		$email_id = Catalog::template_map()[ $template_name ] ?? '';
		if ( '' === $email_id || ! WooEmailRepository::instance()->is_enabled( $email_id ) ) {
			return $located;
		}

		unset( $args );

		return FLEXA_FORMFLOW_PATH . 'templates/woo-email.php';
	}

	/**
	 * Blank WooCommerce's stylesheet for taken-over emails: our document is
	 * already fully inline-styled and the WC reset would fight it.
	 */
	public function strip_styles( string $css, mixed $email = null ): string {
		if ( $email instanceof \WC_Email && WooEmailRepository::instance()->is_enabled( (string) $email->id ) ) {
			return '';
		}

		return $css;
	}

	/**
	 * Resolve the custom subject line (with tokens) when one is set.
	 */
	public function filter_subject( string $subject, mixed $object, mixed $email = null ): string {
		if ( ! $email instanceof \WC_Email ) {
			return $subject;
		}

		$email_id = (string) $email->id;
		$repo     = WooEmailRepository::instance();
		if ( ! $repo->is_enabled( $email_id ) ) {
			return $subject;
		}

		$custom = $repo->find( $email_id )['subject'];
		if ( '' === $custom ) {
			return $subject;
		}

		$ctx = new RenderContext(
			type: $email_id,
			order: $object instanceof \WC_Order ? $object : null,
			email: $email,
		);

		return Tokens::resolve( $custom, $ctx );
	}
}
