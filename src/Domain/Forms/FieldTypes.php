<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Domain\Forms;

defined( 'ABSPATH' ) || exit;

/**
 * The single field-type registry. PHP validation, config sanitizing, and the
 * REST layer all read from here; the admin app mirrors it in
 * features/forms/types.ts. Add a type in both places or nowhere.
 */
final class FieldTypes {
	/**
	 * @return array<string, array{label: string, has_options: bool}>
	 */
	public static function all(): array {
		return [
			'text'     => [
				'label'       => __( 'Text', 'flexa-formflow' ),
				'has_options' => false,
			],
			'email'    => [
				'label'       => __( 'Email', 'flexa-formflow' ),
				'has_options' => false,
			],
			'textarea' => [
				'label'       => __( 'Paragraph', 'flexa-formflow' ),
				'has_options' => false,
			],
			'select'   => [
				'label'       => __( 'Dropdown', 'flexa-formflow' ),
				'has_options' => true,
			],
			'radio'    => [
				'label'       => __( 'Radio choice', 'flexa-formflow' ),
				'has_options' => true,
			],
			'checkbox' => [
				'label'       => __( 'Checkboxes', 'flexa-formflow' ),
				'has_options' => true,
			],
			'number'   => [
				'label'       => __( 'Number', 'flexa-formflow' ),
				'has_options' => false,
			],
			'date'     => [
				'label'       => __( 'Date', 'flexa-formflow' ),
				'has_options' => false,
			],
			'hidden'   => [
				'label'       => __( 'Hidden', 'flexa-formflow' ),
				'has_options' => false,
			],
		];
	}

	public static function is_valid( string $type ): bool {
		return array_key_exists( $type, self::all() );
	}

	public static function has_options( string $type ): bool {
		return self::all()[ $type ]['has_options'] ?? false;
	}

	/**
	 * Sanitize + validate one submitted value against its field definition.
	 * Returns the clean value, or a WP_Error-free error string via $error.
	 *
	 * @param array<string, mixed> $field
	 */
	public static function sanitize_value( array $field, mixed $value, ?string &$error = null ): mixed {
		$type     = (string) ( $field['type'] ?? 'text' );
		$required = ! empty( $field['required'] );
		$options  = self::option_values( $field );

		if ( 'checkbox' === $type ) {
			$values = is_array( $value ) ? $value : ( '' === $value || null === $value ? [] : [ $value ] );
			$clean  = [];
			foreach ( $values as $one ) {
				if ( is_scalar( $one ) && in_array( (string) $one, $options, true ) ) {
					$clean[] = (string) $one;
				}
			}
			if ( $required && [] === $clean ) {
				$error = __( 'This field is required.', 'flexa-formflow' );
			}
			return $clean;
		}

		$raw = is_scalar( $value ) ? trim( (string) $value ) : '';

		if ( '' === $raw ) {
			if ( $required ) {
				$error = __( 'This field is required.', 'flexa-formflow' );
			}
			return '';
		}

		switch ( $type ) {
			case 'email':
				$clean = sanitize_email( $raw );
				if ( ! is_email( $clean ) ) {
					$error = __( 'Please enter a valid email address.', 'flexa-formflow' );
					return '';
				}
				return $clean;

			case 'textarea':
				return sanitize_textarea_field( $raw );

			case 'number':
				if ( ! is_numeric( $raw ) ) {
					$error = __( 'Please enter a number.', 'flexa-formflow' );
					return '';
				}
				return (float) $raw;

			case 'date':
				if ( 1 !== preg_match( '/^\d{4}-\d{2}-\d{2}$/', $raw ) ) {
					$error = __( 'Please enter a valid date.', 'flexa-formflow' );
					return '';
				}
				return $raw;

			case 'select':
			case 'radio':
				if ( ! in_array( $raw, $options, true ) ) {
					$error = __( 'Please pick one of the offered options.', 'flexa-formflow' );
					return '';
				}
				return $raw;

			case 'text':
			case 'hidden':
			default:
				return sanitize_text_field( $raw );
		}
	}

	/**
	 * Sanitize a whole form config coming from the builder: keep only known
	 * keys, drop unknown field types, coerce every scalar.
	 *
	 * @param array<string, mixed> $config
	 * @return array<string, mixed>
	 */
	public static function sanitize_config( array $config ): array {
		$fields = [];
		$raw    = is_array( $config['fields'] ?? null ) ? $config['fields'] : [];
		foreach ( $raw as $field ) {
			if ( ! is_array( $field ) || ! self::is_valid( (string) ( $field['type'] ?? '' ) ) ) {
				continue;
			}
			$type     = (string) $field['type'];
			$fields[] = [
				'id'          => sanitize_key( (string) ( $field['id'] ?? '' ) ),
				'type'        => $type,
				'label'       => sanitize_text_field( (string) ( $field['label'] ?? '' ) ),
				'required'    => ! empty( $field['required'] ),
				'placeholder' => sanitize_text_field( (string) ( $field['placeholder'] ?? '' ) ),
				'options'     => self::has_options( $type )
					? array_values( array_map( static fn( $o ): string => sanitize_text_field( (string) $o ), array_filter( (array) ( $field['options'] ?? [] ), 'is_scalar' ) ) )
					: [],
				'width'       => in_array( $field['width'] ?? 'full', [ 'full', 'half', 'third', 'two_thirds' ], true ) ? (string) ( $field['width'] ?? 'full' ) : 'full',
				'widthTablet' => in_array( $field['widthTablet'] ?? 'inherit', [ 'inherit', 'full', 'half', 'third', 'two_thirds' ], true ) ? (string) ( $field['widthTablet'] ?? 'inherit' ) : 'inherit',
				'widthMobile' => in_array( $field['widthMobile'] ?? 'inherit', [ 'inherit', 'full', 'half', 'third', 'two_thirds' ], true ) ? (string) ( $field['widthMobile'] ?? 'inherit' ) : 'inherit',
				'logic'       => self::sanitize_logic( $field['logic'] ?? null ),
			];
		}

		$settings      = is_array( $config['settings'] ?? null ) ? $config['settings'] : [];
		$notifications = is_array( $config['notifications'] ?? null ) ? $config['notifications'] : [];
		$admin         = is_array( $notifications['admin'] ?? null ) ? $notifications['admin'] : [];
		$confirmation  = is_array( $notifications['confirmation'] ?? null ) ? $notifications['confirmation'] : [];

		return [
			'fields'        => $fields,
			'settings'      => [
				'submit_label'    => sanitize_text_field( (string) ( $settings['submit_label'] ?? '' ) ),
				'success_message' => sanitize_text_field( (string) ( $settings['success_message'] ?? '' ) ),
			],
			'notifications' => [
				'admin'        => [
					'enabled'     => ! empty( $admin['enabled'] ),
					'to'          => sanitize_text_field( (string) ( $admin['to'] ?? '' ) ),
					'subject'     => sanitize_text_field( (string) ( $admin['subject'] ?? '' ) ),
					'template_id' => absint( $admin['template_id'] ?? 0 ),
				],
				'confirmation' => [
					'enabled'     => ! empty( $confirmation['enabled'] ),
					'email_field' => sanitize_key( (string) ( $confirmation['email_field'] ?? '' ) ),
					'subject'     => sanitize_text_field( (string) ( $confirmation['subject'] ?? '' ) ),
					'message'     => sanitize_textarea_field( (string) ( $confirmation['message'] ?? '' ) ),
					'template_id' => absint( $confirmation['template_id'] ?? 0 ),
				],
			],
		];
	}

	/**
	 * The single Free show/hide rule on a field. Returns an empty array when
	 * there is no target field or no known operator, which the front-end reads
	 * as "always visible". Add-ons can extend this into condition groups.
	 *
	 * @param mixed $raw
	 * @return array<string, string>
	 */
	private static function sanitize_logic( $raw ): array {
		if ( ! is_array( $raw ) ) {
			return [];
		}

		$field    = sanitize_key( (string) ( $raw['field'] ?? '' ) );
		$action   = in_array( $raw['action'] ?? '', [ 'show', 'hide' ], true ) ? (string) $raw['action'] : 'show';
		$operator = (string) ( $raw['operator'] ?? '' );
		if ( '' === $field || ! in_array( $operator, [ 'equals', 'not_equals', 'contains', 'not_empty', 'is_empty' ], true ) ) {
			return [];
		}

		return [
			'action'   => $action,
			'field'    => $field,
			'operator' => $operator,
			'value'    => sanitize_text_field( (string) ( $raw['value'] ?? '' ) ),
		];
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function default_config(): array {
		return self::sanitize_config( [] );
	}

	/**
	 * A believable placeholder value for one field, used by the email preview
	 * (both the fields table and {field:ID} tokens) when no real entry exists.
	 *
	 * @param array<string, mixed> $field
	 */
	public static function sample_value( array $field ): string {
		$type    = (string) ( $field['type'] ?? 'text' );
		$options = self::option_values( $field );

		switch ( $type ) {
			case 'email':
				return 'jane@example.com';
			case 'number':
				return '42';
			case 'date':
				return gmdate( 'Y-m-d' );
			case 'textarea':
				return __( 'This is a sample response from the visitor.', 'flexa-formflow' );
			case 'select':
			case 'radio':
			case 'checkbox':
				return $options[0] ?? __( 'Option 1', 'flexa-formflow' );
			case 'hidden':
				return (string) ( $field['placeholder'] ?? 'hidden-value' );
			case 'text':
			default:
				return 'Jane Doe';
		}
	}

	/**
	 * @param array<string, mixed> $field
	 * @return list<string>
	 */
	private static function option_values( array $field ): array {
		$options = $field['options'] ?? [];
		if ( ! is_array( $options ) ) {
			return [];
		}
		return array_values( array_map( static fn( $o ): string => (string) $o, array_filter( $options, 'is_scalar' ) ) );
	}
}
