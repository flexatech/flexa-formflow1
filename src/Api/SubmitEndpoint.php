<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Api;

use Flexa\FormFlow\Domain\Entries\EntryRepository;
use Flexa\FormFlow\Domain\Forms\FieldTypes;
use Flexa\FormFlow\Domain\Forms\FormRepository;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

defined( 'ABSPATH' ) || exit;

/**
 * The one public route. Spam defenses are silent: a filled honeypot or a
 * too-fast submit returns the generic success shape so bots learn nothing.
 */
final class SubmitEndpoint extends Endpoint {
	private const MIN_SECONDS = 3;

	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/submit/(?P<uuid>[a-f0-9-]{36})',
			[
				[
					'methods'             => 'POST',
					'callback'            => [ $this, 'submit' ],
					// Intentionally public: logged-out visitors submit forms here. The
					// route only creates an entry for a published form, reads nothing
					// back, and sanitizes every value against the form's field schema.
					// All admin routes use a capability check instead.
					'permission_callback' => '__return_true',
					'args'                => [
						'uuid' => [ 'sanitize_callback' => 'sanitize_text_field' ],
					],
				],
			]
		);
	}

	public function submit( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$form = FormRepository::instance()->find_by_uuid( (string) $request->get_param( 'uuid' ) );
		if ( null === $form || ! $form->is_published() ) {
			return new WP_Error( 'flexa_formflow_not_found', __( 'This form is not available.', 'flexa-formflow' ), [ 'status' => 404 ] );
		}

		$params   = (array) $request->get_json_params();
		$settings = $form->settings();
		$success  = (string) ( $settings['success_message'] ?? '' );
		if ( '' === $success ) {
			$success = __( 'Thanks, we got your message.', 'flexa-formflow' );
		}

		// Honeypot and time trap: pretend success, store nothing.
		$honeypot = (string) ( $params['ff_website'] ?? '' );
		$rendered = (int) ( $params['_ff_ts'] ?? 0 );
		if ( '' !== $honeypot || $rendered <= 0 || ( time() - $rendered ) < self::MIN_SECONDS ) {
			return new WP_REST_Response( [ 'message' => $success ], 200 );
		}

		$values = is_array( $params['fields'] ?? null ) ? $params['fields'] : [];
		$data   = [];
		$errors = [];
		foreach ( $form->fields() as $field ) {
			$field_id = (string) ( $field['id'] ?? '' );
			if ( '' === $field_id ) {
				continue;
			}
			$error             = null;
			$data[ $field_id ] = FieldTypes::sanitize_value( $field, $values[ $field_id ] ?? '', $error );
			if ( null !== $error ) {
				$errors[ $field_id ] = $error;
			}
		}

		/**
		 * Extension seam: add or clear validation errors before the verdict.
		 *
		 * @param array<string, string>              $errors field_id => message
		 * @param array<string, mixed>               $data   sanitized values
		 * @param \Flexa\FormFlow\Domain\Forms\Form  $form
		 */
		$errors = (array) apply_filters( 'flexa_formflow.submission.validate', $errors, $data, $form );

		if ( [] !== $errors ) {
			return new WP_Error(
				'flexa_formflow_validation',
				__( 'Please fix the highlighted fields.', 'flexa-formflow' ),
				[
					'status' => 400,
					'errors' => $errors,
				]
			);
		}

		$entry_id = EntryRepository::instance()->create(
			$form->id,
			$data,
			[
				'user_agent' => sanitize_text_field( wp_unslash( (string) ( $_SERVER['HTTP_USER_AGENT'] ?? '' ) ) ),
				'referer'    => esc_url_raw( (string) wp_get_referer() ),
			]
		);

		do_action( 'flexa_formflow.entry.created', $entry_id, $form );

		return new WP_REST_Response( [ 'message' => $success ], 200 );
	}
}
