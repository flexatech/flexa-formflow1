<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Workflows;

use Flexa\FormFlow\Concerns\HasInstance;
use Flexa\FormFlow\Domain\Entries\Entry;
use Flexa\FormFlow\Domain\Entries\EntryRepository;
use Flexa\FormFlow\Domain\Forms\Form;
use Flexa\FormFlow\Domain\Workflows\Workflow;
use Flexa\FormFlow\Domain\Workflows\WorkflowRepository;
use Flexa\FormFlow\Domain\Workflows\WorkflowRunRepository;
use Flexa\FormFlow\Emails\Notifications;
use Flexa\FormFlow\Emails\Render\DefaultTemplates;
use Flexa\FormFlow\Emails\Render\RenderContext;
use Flexa\FormFlow\Emails\Render\Renderer;
use Flexa\FormFlow\Emails\Tokens;

defined( 'ABSPATH' ) || exit;

/**
 * Runs active workflows when a form is submitted. A workflow is a trigger plus
 * an ordered action chain (send email, webhook, set status, note). Actions run
 * top to bottom against the new entry; the same run() path backs the editor's
 * test-run button.
 */
final class Engine {
	use HasInstance;

	public function register(): void {
		// Priority 20: after the built-in notification dispatch (priority 10).
		add_action( 'flexa_formflow.entry.created', [ $this, 'handle_entry' ], 20, 2 );
	}

	public function handle_entry( int $entry_id, Form $form ): void {
		$entry = EntryRepository::instance()->find( $entry_id );
		if ( null === $entry ) {
			return;
		}

		foreach ( WorkflowRepository::instance()->active() as $workflow ) {
			$trigger = $workflow->trigger();
			if ( 0 !== $trigger['form_id'] && $trigger['form_id'] !== $form->id ) {
				continue;
			}
			$this->run( $workflow, $form, $entry );
		}
	}

	/**
	 * Run every action in order and return a per-action log. Also used by the
	 * test-run endpoint, so it never assumes an admin request. `$record` is false
	 * for test runs so the Logs tab only shows runs the live form actually fired.
	 *
	 * @return list<array{type: string, status: string, detail: string}>
	 */
	public function run( Workflow $workflow, Form $form, Entry $entry, bool $record = true ): array {
		$ctx = new RenderContext( form: $form, entry: $entry, type: 'admin' );
		$log = [];

		$condition = $workflow->condition();
		if ( [] !== $condition ) {
			$met   = $this->condition_met( $condition, $entry );
			$log[] = $this->result(
				'condition',
				$met ? 'ok' : 'skipped',
				$met
					? __( 'Condition met.', 'flexa-formflow' )
					: __( 'Condition not met; actions skipped.', 'flexa-formflow' )
			);

			if ( ! $met ) {
				return $this->finish( $workflow, $form, $entry, $log, $record );
			}
		}

		foreach ( $workflow->actions() as $action ) {
			$log[] = $this->run_action( $action['type'], $action['config'], $form, $entry, $ctx );
		}

		return $this->finish( $workflow, $form, $entry, $log, $record );
	}

	/**
	 * Single exit point: persist the run (live runs only) and fire the extension
	 * hook, then return the log. Both the condition-skip path and the full-chain
	 * path funnel through here so recording never drifts between them.
	 *
	 * @param list<array{type: string, status: string, detail: string}> $log
	 * @return list<array{type: string, status: string, detail: string}>
	 */
	private function finish( Workflow $workflow, Form $form, Entry $entry, array $log, bool $record ): array {
		if ( $record ) {
			WorkflowRunRepository::instance()->record(
				$workflow->id,
				$entry->id,
				$form->id,
				$this->overall_status( $log ),
				$log
			);
		}

		do_action( 'flexa_formflow.workflow.ran', $workflow->id, $entry->id, $log );

		return $log;
	}

	/**
	 * Collapse the per-step statuses into one run outcome: any error wins; a
	 * short log led by a skipped condition is a skip; otherwise the run is ok.
	 *
	 * @param list<array{type: string, status: string, detail: string}> $log
	 */
	private function overall_status( array $log ): string {
		foreach ( $log as $step ) {
			if ( 'error' === $step['status'] ) {
				return 'error';
			}
		}
		if ( isset( $log[0] ) && 'condition' === $log[0]['type'] && 'skipped' === $log[0]['status'] ) {
			return 'skipped';
		}

		return 'ok';
	}

	/**
	 * Evaluate the single Free condition against the entry. String comparison
	 * throughout; array values (checkboxes) collapse to a comma-joined string
	 * so `contains` and equality behave predictably.
	 *
	 * @param array{field: string, operator: string, value: string} $condition
	 */
	private function condition_met( array $condition, Entry $entry ): bool {
		$raw    = $entry->data[ $condition['field'] ] ?? '';
		$actual = is_array( $raw ) ? implode( ', ', array_map( 'strval', $raw ) ) : (string) $raw;
		$value  = $condition['value'];

		switch ( $condition['operator'] ) {
			case 'equals':
				return $actual === $value;
			case 'not_equals':
				return $actual !== $value;
			case 'contains':
				return '' !== $value && false !== stripos( $actual, $value );
			case 'not_empty':
				return '' !== trim( $actual );
			case 'is_empty':
				return '' === trim( $actual );
			default:
				return true;
		}
	}

	/**
	 * @param array<string, mixed> $config
	 * @return array{type: string, status: string, detail: string}
	 */
	private function run_action( string $type, array $config, Form $form, Entry $entry, RenderContext $ctx ): array {
		switch ( $type ) {
			case 'send_email':
				return $this->do_send_email( $config, $form, $entry, $ctx );
			case 'webhook':
				return $this->do_webhook( $config, $form, $entry );
			case 'set_status':
				return $this->do_set_status( $config, $entry );
			case 'add_note':
				return $this->do_add_note( $config, $entry, $ctx );
			default:
				return $this->run_extension_action( $type, $config, $form, $entry, $ctx );
		}
	}

	/**
	 * Runtime seam for extension-registered action types (add-ons). An
	 * add-on that adds a node via `flexa_formflow.workflows.action_types` handles
	 * it here by returning a result array `{type, status, detail}`. Anything else
	 * (no handler, malformed return) falls back to a skipped log line.
	 *
	 * @param array<string, mixed> $config
	 * @return array{type: string, status: string, detail: string}
	 */
	private function run_extension_action( string $type, array $config, Form $form, Entry $entry, RenderContext $ctx ): array {
		// Handlers return a result array {type, status, detail}, or null to pass.
		$result = apply_filters( 'flexa_formflow.workflows.run_action', null, $type, $config, $form, $entry, $ctx );

		if ( is_array( $result ) && isset( $result['type'], $result['status'], $result['detail'] ) ) {
			return [
				'type'   => (string) $result['type'],
				'status' => (string) $result['status'],
				'detail' => (string) $result['detail'],
			];
		}

		return $this->result( $type, 'skipped', __( 'Unknown action.', 'flexa-formflow' ) );
	}

	/**
	 * @param array<string, mixed> $config
	 * @return array{type: string, status: string, detail: string}
	 */
	private function do_send_email( array $config, Form $form, Entry $entry, RenderContext $ctx ): array {
		$to = $this->resolve_recipient( $config, $entry );
		if ( '' === $to || ! is_email( $to ) ) {
			return $this->result( 'send_email', 'skipped', __( 'No valid recipient.', 'flexa-formflow' ) );
		}

		$subject = (string) ( $config['subject'] ?? '' );
		if ( '' === $subject ) {
			/* translators: %s: form title. */
			$subject = sprintf( __( 'New submission: %s', 'flexa-formflow' ), $form->title );
		}
		$subject = Tokens::resolve( $subject, $ctx );

		$tree = $this->email_tree( $config );
		$body = Renderer::instance()->render_tree( $tree, $ctx );

		$sent = Notifications::instance()->send( $to, $subject, $body, 'workflow', $entry->id );

		return $sent
			? $this->result( 'send_email', 'ok', sprintf( /* translators: %s: email address. */ __( 'Sent to %s.', 'flexa-formflow' ), $to ) )
			: $this->result( 'send_email', 'error', __( 'wp_mail() returned false.', 'flexa-formflow' ) );
	}

	/**
	 * @param array<string, mixed> $config
	 * @return array{type: string, status: string, detail: string}
	 */
	private function do_webhook( array $config, Form $form, Entry $entry ): array {
		$url = (string) ( $config['url'] ?? '' );
		if ( '' === $url ) {
			return $this->result( 'webhook', 'skipped', __( 'No URL set.', 'flexa-formflow' ) );
		}

		$payload = [
			'form_id'    => $form->id,
			'form_title' => $form->title,
			'entry_id'   => $entry->id,
			'created_at' => $entry->created_at,
			'data'       => $entry->data,
		];

		// wp_safe_remote_post() refuses local and private-network hosts, so a
		// webhook URL cannot be pointed at the server's own internal services.
		$response = wp_safe_remote_post(
			$url,
			[
				'timeout' => 15,
				'headers' => [ 'Content-Type' => 'application/json' ],
				'body'    => (string) wp_json_encode( $payload ),
			]
		);

		if ( is_wp_error( $response ) ) {
			return $this->result( 'webhook', 'error', $response->get_error_message() );
		}

		$code = (int) wp_remote_retrieve_response_code( $response );

		return $code >= 200 && $code < 300
			? $this->result( 'webhook', 'ok', sprintf( /* translators: %d: HTTP status code. */ __( 'POST returned %d.', 'flexa-formflow' ), $code ) )
			: $this->result( 'webhook', 'error', sprintf( /* translators: %d: HTTP status code. */ __( 'POST returned %d.', 'flexa-formflow' ), $code ) );
	}

	/**
	 * @param array<string, mixed> $config
	 * @return array{type: string, status: string, detail: string}
	 */
	private function do_set_status( array $config, Entry $entry ): array {
		$status = in_array( $config['status'] ?? '', [ 'read', 'unread' ], true ) ? (string) $config['status'] : 'read';
		EntryRepository::instance()->set_status( $entry->id, $status );

		return $this->result( 'set_status', 'ok', sprintf( /* translators: %s: entry status. */ __( 'Marked %s.', 'flexa-formflow' ), $status ) );
	}

	/**
	 * @param array<string, mixed> $config
	 * @return array{type: string, status: string, detail: string}
	 */
	private function do_add_note( array $config, Entry $entry, RenderContext $ctx ): array {
		$note = Tokens::resolve( (string) ( $config['note'] ?? '' ), $ctx );
		if ( '' === $note ) {
			return $this->result( 'add_note', 'skipped', __( 'Empty note.', 'flexa-formflow' ) );
		}

		do_action( 'flexa_formflow.entry.note', $entry->id, $note );

		return $this->result( 'add_note', 'ok', __( 'Note recorded.', 'flexa-formflow' ) );
	}

	/**
	 * @param array<string, mixed> $config
	 */
	private function resolve_recipient( array $config, Entry $entry ): string {
		$mode = (string) ( $config['to_mode'] ?? 'admin' );
		$to   = (string) ( $config['to'] ?? '' );

		switch ( $mode ) {
			case 'field':
				$value = $entry->data[ $to ] ?? '';
				return is_string( $value ) ? sanitize_email( $value ) : '';
			case 'fixed':
				return sanitize_email( $to );
			case 'admin':
			default:
				return (string) get_option( 'admin_email' );
		}
	}

	/**
	 * @param array<string, mixed> $config
	 * @return array<string, mixed>
	 */
	private function email_tree( array $config ): array {
		$template_id = (int) ( $config['template_id'] ?? 0 );
		if ( $template_id > 0 ) {
			$template = \Flexa\FormFlow\Domain\EmailTemplates\EmailTemplateRepository::instance()->find( $template_id );
			if ( null !== $template ) {
				return $template->tree;
			}
		}

		$message = (string) ( $config['message'] ?? '' );
		if ( '' === $message ) {
			return DefaultTemplates::tree_for( 'admin' );
		}

		// A custom message: keep the submission table but lead with the message.
		return [
			'version'  => 1,
			'settings' => [],
			'elements' => [
				$this->el( 'logo' ),
				$this->el( 'heading', [ 'text' => '{form_title}' ] ),
				$this->el( 'text', [ 'html' => $message ] ),
				$this->el( 'fields_table', [ 'title' => __( 'Submission', 'flexa-formflow' ) ] ),
				$this->el( 'divider' ),
				$this->el( 'footer_text' ),
			],
		];
	}

	/**
	 * @param array<string, mixed> $props
	 * @return array<string, mixed>
	 */
	private function el( string $type, array $props = [] ): array {
		return [
			'id'    => 'el_' . substr( md5( uniqid( $type, true ) ), 0, 10 ),
			'type'  => $type,
			'props' => $props,
		];
	}

	/**
	 * @return array{type: string, status: string, detail: string}
	 */
	private function result( string $type, string $status, string $detail ): array {
		return [
			'type'   => $type,
			'status' => $status,
			'detail' => $detail,
		];
	}
}
