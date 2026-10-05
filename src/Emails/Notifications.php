<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails;

use Flexa\FormFlow\Concerns\HasInstance;
use Flexa\FormFlow\Domain\EmailTemplates\EmailTemplateRepository;
use Flexa\FormFlow\Domain\Entries\Entry;
use Flexa\FormFlow\Domain\Entries\EntryRepository;
use Flexa\FormFlow\Domain\Forms\Form;
use Flexa\FormFlow\Emails\Render\DefaultTemplates;
use Flexa\FormFlow\Emails\Render\RenderContext;
use Flexa\FormFlow\Emails\Render\Renderer;

defined( 'ABSPATH' ) || exit;

/**
 * Sends the admin notification and visitor confirmation on every new entry.
 * Both go through the one render pipeline: a picked email template's tree, or a
 * runtime default when none is picked. Delivery is wp_mail() so whatever
 * SMTP/bridge plugin is active (flexa-mailbridge included) handles it.
 */
final class Notifications {
	use HasInstance;

	public function register(): void {
		add_action( 'flexa_formflow.entry.created', [ $this, 'dispatch' ], 10, 2 );
	}

	public function dispatch( int $entry_id, Form $form ): void {
		$entry = EntryRepository::instance()->find( $entry_id );
		if ( null === $entry ) {
			return;
		}

		$notifications = $form->notifications();
		$admin         = is_array( $notifications['admin'] ?? null ) ? $notifications['admin'] : [];
		$confirmation  = is_array( $notifications['confirmation'] ?? null ) ? $notifications['confirmation'] : [];

		if ( ! empty( $admin['enabled'] ) ) {
			$this->send_admin_notification( $form, $entry, $admin );
		}

		if ( ! empty( $confirmation['enabled'] ) ) {
			$this->send_confirmation( $form, $entry, $confirmation );
		}
	}

	/**
	 * @param array<string, mixed> $config
	 */
	private function send_admin_notification( Form $form, Entry $entry, array $config ): void {
		$to = sanitize_email( (string) ( $config['to'] ?? '' ) );
		if ( '' === $to ) {
			$to = (string) get_option( 'admin_email' );
		}

		$ctx = new RenderContext( form: $form, entry: $entry, type: 'admin', is_preview: false );

		$subject = (string) ( $config['subject'] ?? '' );
		if ( '' === $subject ) {
			/* translators: 1: site name, 2: form title. */
			$subject = sprintf( __( '[%1$s] New submission: %2$s', 'flexa-formflow' ), get_bloginfo( 'name' ), $form->title );
		}
		$subject = Tokens::resolve( $subject, $ctx );

		$body = Renderer::instance()->render_tree( $this->tree_for( (int) ( $config['template_id'] ?? 0 ), 'admin' ), $ctx );

		$this->send( $to, $subject, $body, 'admin', $entry->id );
	}

	/**
	 * @param array<string, mixed> $config
	 */
	private function send_confirmation( Form $form, Entry $entry, array $config ): void {
		$email_field = (string) ( $config['email_field'] ?? '' );
		$to          = sanitize_email( (string) ( $entry->data[ $email_field ] ?? '' ) );
		if ( '' === $email_field || ! is_email( $to ) ) {
			return;
		}

		$ctx = new RenderContext( form: $form, entry: $entry, type: 'confirmation', is_preview: false );

		$subject = (string) ( $config['subject'] ?? '' );
		if ( '' === $subject ) {
			/* translators: %s: site name. */
			$subject = sprintf( __( 'We received your message, %s', 'flexa-formflow' ), get_bloginfo( 'name' ) );
		}
		$subject = Tokens::resolve( $subject, $ctx );

		$tree = $this->tree_for( (int) ( $config['template_id'] ?? 0 ), 'confirmation', (string) ( $config['message'] ?? '' ) );
		$body = Renderer::instance()->render_tree( $tree, $ctx );

		$this->send( $to, $subject, $body, 'confirmation', $entry->id );
	}

	/**
	 * The picked template's tree, or the runtime default. A dangling template id
	 * (deleted after a form referenced it) falls back to the default: no error.
	 *
	 * @param 'admin'|'confirmation' $type
	 * @return array<string, mixed>
	 */
	private function tree_for( int $template_id, string $type, string $message = '' ): array {
		if ( $template_id > 0 ) {
			$template = EmailTemplateRepository::instance()->find( $template_id );
			if ( null !== $template ) {
				return $template->tree;
			}
		}

		return DefaultTemplates::tree_for( $type, $message );
	}

	/**
	 * Shared send path (also used by the test-send endpoint). A mail failure is
	 * logged, never surfaced, so it can never block a form submission response.
	 */
	public function send( string $to, string $subject, string $body, string $type, int $entry_id = 0 ): bool {
		$sent = wp_mail( $to, $subject, $body, [ 'Content-Type: text/html; charset=UTF-8' ] );

		if ( $sent ) {
			do_action( 'flexa_formflow.notification.sent', $type, $entry_id );
			return true;
		}

		error_log( sprintf( 'Flexa FormFlow: %s notification for entry %d failed to send.', $type, $entry_id ) ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log

		return false;
	}
}
