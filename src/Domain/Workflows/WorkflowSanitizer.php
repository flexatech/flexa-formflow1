<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Domain\Workflows;

use Flexa\FormFlow\Extensions\Registry;

defined( 'ABSPATH' ) || exit;

/**
 * Normalizes the workflow config document (trigger + actions) on the way into
 * storage. Built-in action types are coerced to their known shape; types added
 * by an extension (registered via `flexa_formflow.workflows.action_types`) pass
 * through with a generic deep-sanitize, since Free cannot know their config
 * shape. Any type that is neither is dropped, so a malformed or spoofed payload
 * can never reach the engine.
 */
final class WorkflowSanitizer {
	private const ACTION_TYPES = [ 'send_email', 'webhook', 'set_status', 'add_note' ];

	private const CONDITION_OPERATORS = [ 'equals', 'not_equals', 'contains', 'not_empty', 'is_empty' ];

	/**
	 * @param array<string, mixed> $config
	 * @return array{trigger: array{type: string, form_id: int}, condition: array<string, string>, actions: list<array{id: string, type: string, config: array<string, mixed>}>}
	 */
	public static function sanitize( array $config ): array {
		$trigger_in = is_array( $config['trigger'] ?? null ) ? $config['trigger'] : [];
		$trigger    = [
			'type'    => 'form_submitted',
			'form_id' => max( 0, (int) ( $trigger_in['form_id'] ?? 0 ) ),
		];

		$condition = self::sanitize_condition( $config['condition'] ?? null );

		$extension_types = Registry::workflow_action_type_ids();
		$allowed_types   = array_merge( self::ACTION_TYPES, $extension_types );

		$actions_in = is_array( $config['actions'] ?? null ) ? $config['actions'] : [];
		$actions    = [];
		$index      = 0;
		foreach ( $actions_in as $action ) {
			if ( ! is_array( $action ) ) {
				continue;
			}
			$type = (string) ( $action['type'] ?? '' );
			if ( ! in_array( $type, $allowed_types, true ) ) {
				continue;
			}
			++$index;
			$actions[] = [
				'id'     => self::action_id( $action, $index ),
				'type'   => $type,
				'config' => self::action_config( $type, is_array( $action['config'] ?? null ) ? $action['config'] : [] ),
			];
		}

		return [
			'trigger'   => $trigger,
			'condition' => $condition,
			'actions'   => $actions,
		];
	}

	/**
	 * A single gate on the action chain. Returns an empty array when there is
	 * no field or no known operator, which the engine reads as "always run".
	 *
	 * @param mixed $raw
	 * @return array<string, string>
	 */
	private static function sanitize_condition( $raw ): array {
		if ( ! is_array( $raw ) ) {
			return [];
		}

		$field    = sanitize_text_field( (string) ( $raw['field'] ?? '' ) );
		$operator = (string) ( $raw['operator'] ?? '' );
		if ( '' === $field || ! in_array( $operator, self::CONDITION_OPERATORS, true ) ) {
			return [];
		}

		return [
			'field'    => $field,
			'operator' => $operator,
			'value'    => sanitize_text_field( (string) ( $raw['value'] ?? '' ) ),
		];
	}

	/**
	 * @param array<string, mixed> $action
	 */
	private static function action_id( array $action, int $index ): string {
		$id = sanitize_key( (string) ( $action['id'] ?? '' ) );

		return '' !== $id ? $id : 'a' . $index;
	}

	/**
	 * @param array<string, mixed> $config
	 * @return array<string, mixed>
	 */
	private static function action_config( string $type, array $config ): array {
		if ( ! in_array( $type, self::ACTION_TYPES, true ) ) {
			// Extension-registered type: Free does not know its shape, so deep
			// sanitize generically. The add-on's runtime re-validates its own config.
			return self::sanitize_deep( $config );
		}

		switch ( $type ) {
			case 'send_email':
				$to_mode = in_array( $config['to_mode'] ?? '', [ 'admin', 'field', 'fixed' ], true )
					? (string) $config['to_mode']
					: 'admin';
				return [
					'to_mode'     => $to_mode,
					'to'          => sanitize_text_field( (string) ( $config['to'] ?? '' ) ),
					'subject'     => sanitize_text_field( (string) ( $config['subject'] ?? '' ) ),
					'template_id' => max( 0, (int) ( $config['template_id'] ?? 0 ) ),
					'message'     => wp_kses_post( (string) ( $config['message'] ?? '' ) ),
				];
			case 'webhook':
				return [
					'url' => esc_url_raw( (string) ( $config['url'] ?? '' ) ),
				];
			case 'set_status':
				return [
					'status' => in_array( $config['status'] ?? '', [ 'read', 'unread' ], true )
						? (string) $config['status']
						: 'read',
				];
			case 'add_note':
				return [
					'note' => sanitize_textarea_field( (string) ( $config['note'] ?? '' ) ),
				];
			default:
				return [];
		}
	}

	/**
	 * Generic recursive sanitize for extension action config: scalars are kept
	 * as-is (bool/int/float) or run through sanitize_textarea_field (strings),
	 * arrays recurse with sanitized keys.
	 *
	 * @param mixed $value
	 * @return mixed
	 */
	private static function sanitize_deep( $value ) {
		if ( is_array( $value ) ) {
			$out = [];
			foreach ( $value as $key => $item ) {
				$out[ is_string( $key ) ? sanitize_key( $key ) : (int) $key ] = self::sanitize_deep( $item );
			}
			return $out;
		}
		if ( is_bool( $value ) || is_int( $value ) || is_float( $value ) ) {
			return $value;
		}

		return sanitize_textarea_field( (string) $value );
	}
}
