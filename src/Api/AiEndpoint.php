<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Api;

use Flexa\FormFlow\Domain\Forms\FieldTypes;
use Flexa\FormFlow\Domain\Forms\FormRepository;
use Flexa\FormFlow\Support\Settings;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

defined( 'ABSPATH' ) || exit;

/**
 * AI assistance. Proxies exactly the text the admin submitted to the provider
 * configured in settings (Anthropic, OpenAI, or Google Gemini) using the site's
 * own API key. Two tools: a writing assistant for email/form copy, and a form
 * generator that turns a plain-English description into fields. Nothing is sent
 * automatically and no visitor data is included — disclosed in readme.txt under
 * "External services".
 */
final class AiEndpoint extends Endpoint {
	private const ACTIONS = [ 'rewrite', 'shorten', 'tone', 'subject' ];

	private const DEFAULT_ANTHROPIC_MODEL = 'claude-opus-4-8';
	private const DEFAULT_OPENAI_MODEL    = 'gpt-4o-mini';
	private const DEFAULT_GEMINI_MODEL    = 'gemini-2.5-flash';

	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/ai/generate',
			[
				'methods'             => 'POST',
				'callback'            => [ $this, 'generate' ],
				'permission_callback' => [ $this, 'manage_permission' ],
			]
		);

		register_rest_route(
			self::NAMESPACE,
			'/ai/form',
			[
				'methods'             => 'POST',
				'callback'            => [ $this, 'generate_form' ],
				'permission_callback' => [ $this, 'manage_permission' ],
			]
		);
	}

	public function generate( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$body   = (array) $request->get_json_params();
		$action = isset( $body['action'] ) && is_string( $body['action'] ) ? sanitize_key( $body['action'] ) : '';
		$text   = isset( $body['text'] ) && is_string( $body['text'] ) ? trim( $body['text'] ) : '';

		if ( ! in_array( $action, self::ACTIONS, true ) ) {
			return new WP_Error( 'flexa_formflow_bad_action', __( 'Unknown AI action.', 'flexa-formflow' ), [ 'status' => 400 ] );
		}
		if ( '' === $text ) {
			return new WP_Error( 'flexa_formflow_empty_text', __( 'There is no text to work with yet.', 'flexa-formflow' ), [ 'status' => 400 ] );
		}
		if ( strlen( $text ) > 8000 ) {
			return new WP_Error( 'flexa_formflow_text_too_long', __( 'The text is too long for the AI assistant.', 'flexa-formflow' ), [ 'status' => 400 ] );
		}

		$api_key = $this->api_key();
		if ( is_wp_error( $api_key ) ) {
			return $api_key;
		}

		$tone   = isset( $body['tone'] ) && is_string( $body['tone'] ) ? sanitize_text_field( $body['tone'] ) : '';
		$prompt = $this->build_prompt( $action, $text, $tone );
		$result = $this->call_provider( $api_key, $prompt );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return new WP_REST_Response( [ 'text' => trim( $result ) ], 200 );
	}

	public function generate_form( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$body   = (array) $request->get_json_params();
		$prompt = isset( $body['prompt'] ) && is_string( $body['prompt'] ) ? trim( $body['prompt'] ) : '';

		if ( '' === $prompt ) {
			return new WP_Error( 'flexa_formflow_empty_prompt', __( 'Describe the form you want to build.', 'flexa-formflow' ), [ 'status' => 400 ] );
		}
		if ( strlen( $prompt ) > 2000 ) {
			return new WP_Error( 'flexa_formflow_prompt_too_long', __( 'That description is too long.', 'flexa-formflow' ), [ 'status' => 400 ] );
		}

		$api_key = $this->api_key();
		if ( is_wp_error( $api_key ) ) {
			return $api_key;
		}

		$result = $this->call_provider( $api_key, $this->build_form_prompt( $prompt ) );
		if ( is_wp_error( $result ) ) {
			return $result;
		}

		$spec = $this->parse_form_json( $result );
		if ( null === $spec || [] === $spec['fields'] ) {
			return new WP_Error( 'flexa_formflow_ai_no_fields', __( 'The assistant did not return any usable fields. Try describing the form differently.', 'flexa-formflow' ), [ 'status' => 422 ] );
		}

		$id   = FormRepository::instance()->create( $spec['title'], [ 'fields' => $spec['fields'] ] );
		$form = FormRepository::instance()->find( $id );

		return new WP_REST_Response( [ 'form' => $form?->to_array() ], 201 );
	}

	/**
	 * @return string|WP_Error The decrypted key, or an error if none is set.
	 */
	private function api_key(): string|WP_Error {
		$settings = Settings::all();
		$api_key  = is_string( $settings['ai_api_key'] ) ? $settings['ai_api_key'] : '';
		if ( '' === $api_key ) {
			return new WP_Error(
				'flexa_formflow_no_api_key',
				__( 'Add your AI provider API key in FormFlow settings to use the assistant.', 'flexa-formflow' ),
				[ 'status' => 400 ]
			);
		}

		return $api_key;
	}

	private function call_provider( string $api_key, string $prompt ): string|WP_Error {
		$settings = Settings::all();
		$model    = (string) $settings['ai_model'];

		return match ( $settings['ai_provider'] ) {
			'openai' => $this->call_openai( $api_key, $model, $prompt ),
			'gemini' => $this->call_gemini( $api_key, $model, $prompt ),
			default  => $this->call_anthropic( $api_key, $model, $prompt ),
		};
	}

	private function build_prompt( string $action, string $text, string $tone ): string {
		$context = sprintf(
			'You are a copywriter for the website "%s", helping with form and email copy. Placeholders in curly braces like {field:name} or {form_title} must be kept exactly as-is. Reply with ONLY the resulting text, no preamble, no quotes, no markdown.',
			wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES )
		);

		switch ( $action ) {
			case 'shorten':
				$instruction = 'Rewrite the following text to be roughly half as long while keeping the meaning:';
				break;
			case 'tone':
				$instruction = sprintf( 'Rewrite the following text in a %s tone:', '' !== $tone ? $tone : 'friendly' );
				break;
			case 'subject':
				$instruction = 'Write 5 subject line ideas (one per line, no numbering) for an email containing the following text. Keep each under 60 characters:';
				break;
			case 'rewrite':
			default:
				$instruction = 'Improve the following text: fix grammar, make it clear and engaging, keep it about the same length:';
				break;
		}

		return $context . "\n\n" . $instruction . "\n\n" . $text;
	}

	private function build_form_prompt( string $description ): string {
		$types = implode( ', ', array_keys( FieldTypes::all() ) );

		return 'You design web forms. From the description, output ONLY a JSON object, no markdown fences, no commentary, shaped exactly like: '
			. '{"title": string, "fields": [{"type": string, "label": string, "required": boolean, "placeholder": string, "options": string[]}]}. '
			. 'Allowed field "type" values are: ' . $types . '. '
			. 'Use "options" only for select, radio, and checkbox (empty array otherwise). Keep it to the fields a real form needs, 3 to 10 of them. '
			. "\n\nDescription:\n" . $description;
	}

	/**
	 * Parse the model's JSON into a sanitized form spec.
	 *
	 * @return array{title: string, fields: list<array<string, mixed>>}|null
	 */
	private function parse_form_json( string $raw ): ?array {
		$json = trim( $raw );
		// Strip a ```json … ``` fence if the model added one.
		$json = (string) preg_replace( '/^```(?:json)?\s*|\s*```$/i', '', $json );

		$start = strpos( $json, '{' );
		$end   = strrpos( $json, '}' );
		if ( false === $start || false === $end || $end < $start ) {
			return null;
		}
		$json = substr( $json, $start, $end - $start + 1 );

		$data = json_decode( $json, true );
		if ( ! is_array( $data ) || ! is_array( $data['fields'] ?? null ) ) {
			return null;
		}

		$title  = sanitize_text_field( (string) ( $data['title'] ?? '' ) );
		$title  = '' !== $title ? $title : __( 'AI form', 'flexa-formflow' );
		$fields = [];
		$seen   = [];
		foreach ( $data['fields'] as $i => $field ) {
			if ( ! is_array( $field ) ) {
				continue;
			}
			$type = (string) ( $field['type'] ?? '' );
			if ( ! FieldTypes::is_valid( $type ) ) {
				continue;
			}
			$label = sanitize_text_field( (string) ( $field['label'] ?? '' ) );
			$id    = $this->unique_id( $label, (int) $i, $seen );

			$fields[] = [
				'id'          => $id,
				'type'        => $type,
				'label'       => '' !== $label ? $label : $id,
				'required'    => ! empty( $field['required'] ),
				'placeholder' => sanitize_text_field( (string) ( $field['placeholder'] ?? '' ) ),
				'options'     => FieldTypes::has_options( $type ) && is_array( $field['options'] ?? null )
					? array_values( array_map( static fn( $o ): string => sanitize_text_field( (string) $o ), array_filter( $field['options'], 'is_scalar' ) ) )
					: [],
			];
		}

		return [
			'title'  => $title,
			'fields' => $fields,
		];
	}

	/**
	 * @param array<string, true> $seen
	 */
	private function unique_id( string $label, int $index, array &$seen ): string {
		$base = sanitize_key( $label );
		if ( '' === $base ) {
			$base = 'field_' . ( $index + 1 );
		}
		$id  = $base;
		$try = 2;
		while ( isset( $seen[ $id ] ) ) {
			$id = $base . '_' . $try;
			++$try;
		}
		$seen[ $id ] = true;

		return $id;
	}

	private function call_anthropic( string $api_key, string $model, string $prompt ): string|WP_Error {
		$response = wp_remote_post(
			'https://api.anthropic.com/v1/messages',
			[
				'timeout' => 60,
				'headers' => [
					'x-api-key'         => $api_key,
					'anthropic-version' => '2023-06-01',
					'content-type'      => 'application/json',
				],
				'body'    => wp_json_encode(
					[
						'model'      => '' !== $model ? $model : self::DEFAULT_ANTHROPIC_MODEL,
						'max_tokens' => 1500,
						'messages'   => [
							[
								'role'    => 'user',
								'content' => $prompt,
							],
						],
					]
				),
			]
		);

		$data = $this->parse_response( $response );
		if ( is_wp_error( $data ) ) {
			return $data;
		}

		if ( isset( $data['content'] ) && is_array( $data['content'] ) ) {
			foreach ( $data['content'] as $block ) {
				if ( is_array( $block ) && 'text' === ( $block['type'] ?? '' ) && is_string( $block['text'] ?? null ) ) {
					return $block['text'];
				}
			}
		}

		return $this->provider_error( $data );
	}

	private function call_openai( string $api_key, string $model, string $prompt ): string|WP_Error {
		$response = wp_remote_post(
			'https://api.openai.com/v1/chat/completions',
			[
				'timeout' => 60,
				'headers' => [
					'Authorization' => 'Bearer ' . $api_key,
					'Content-Type'  => 'application/json',
				],
				'body'    => wp_json_encode(
					[
						'model'    => '' !== $model ? $model : self::DEFAULT_OPENAI_MODEL,
						'messages' => [
							[
								'role'    => 'user',
								'content' => $prompt,
							],
						],
					]
				),
			]
		);

		$data = $this->parse_response( $response );
		if ( is_wp_error( $data ) ) {
			return $data;
		}

		$text = $data['choices'][0]['message']['content'] ?? null;
		if ( is_string( $text ) ) {
			return $text;
		}

		return $this->provider_error( $data );
	}

	private function call_gemini( string $api_key, string $model, string $prompt ): string|WP_Error {
		$model    = '' !== $model ? $model : self::DEFAULT_GEMINI_MODEL;
		$response = wp_remote_post(
			'https://generativelanguage.googleapis.com/v1beta/models/' . rawurlencode( $model ) . ':generateContent',
			[
				'timeout' => 60,
				'headers' => [
					'x-goog-api-key' => $api_key,
					'Content-Type'   => 'application/json',
				],
				'body'    => wp_json_encode(
					[
						'contents' => [
							[
								'parts' => [
									[ 'text' => $prompt ],
								],
							],
						],
					]
				),
			]
		);

		$data = $this->parse_response( $response );
		if ( is_wp_error( $data ) ) {
			return $data;
		}

		$text = $data['candidates'][0]['content']['parts'][0]['text'] ?? null;
		if ( is_string( $text ) ) {
			return $text;
		}

		return $this->provider_error( $data );
	}

	/**
	 * @param array<string, mixed>|WP_Error $response
	 * @return array<string, mixed>|WP_Error
	 */
	private function parse_response( array|WP_Error $response ): array|WP_Error {
		if ( is_wp_error( $response ) ) {
			return new WP_Error( 'flexa_formflow_ai_unreachable', __( 'Could not reach the AI provider. Check your connection.', 'flexa-formflow' ), [ 'status' => 502 ] );
		}

		$data = json_decode( (string) wp_remote_retrieve_body( $response ), true );

		return is_array( $data ) ? $data : new WP_Error( 'flexa_formflow_ai_bad_response', __( 'The AI provider returned an unreadable response.', 'flexa-formflow' ), [ 'status' => 502 ] );
	}

	/**
	 * @param array<string, mixed> $data
	 */
	private function provider_error( array $data ): WP_Error {
		$message = $data['error']['message'] ?? null;

		return new WP_Error(
			'flexa_formflow_ai_error',
			is_string( $message ) ? $message : __( 'The AI provider returned an error.', 'flexa-formflow' ),
			[ 'status' => 502 ]
		);
	}
}
