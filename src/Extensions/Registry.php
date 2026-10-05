<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Extensions;

use Flexa\FormFlow\Integrations\Connections;

defined( 'ABSPATH' ) || exit;

/**
 * The declarative extension registry. Add-ons describe new UI
 * as data through filter seams; this class collects those descriptors, coerces
 * them to a safe shape, and hands the result to the admin app via localization.
 *
 * The contract is one-directional and data-only: an add-on never ships React
 * into the Free bundle. It declares a node's fields with the control vocabulary
 * the Free app owns (text, select, switch, field-map, conditions, ...) and runs
 * the node's behavior in PHP on the matching runtime seam. Free renders the
 * form; the add-on owns the logic. That keeps a single React instance and lets
 * the two plugins ship on independent build pipelines.
 */
final class Registry {
	/** Controls the Free admin app knows how to render. */
	private const CONTROLS = [
		'text',
		'textarea',
		'email',
		'url',
		'number',
		'select',
		'switch',
		'token-text',
		'field-map',
		'conditions',
		'connection',
	];

	/**
	 * The full extension payload, localized into `flexaFormFlow.extensions`.
	 *
	 * @return array{workflowActions: list<array<string, mixed>>, integrations: list<array<string, mixed>>}
	 */
	public static function all(): array {
		// Enrich each connect descriptor with a `connected` snapshot so the
		// workflow `connection` control can show status without a round-trip.
		// Read straight from the store (Connections::get touches no filter, so
		// there is no recursion back into the connect_fields seam).
		$integrations = self::integration_connections();
		foreach ( $integrations as &$integration ) {
			$id                       = (string) ( $integration['id'] ?? '' );
			$integration['connected'] = '' !== $id && [] !== Connections::get( $id );
		}
		unset( $integration );

		return [
			'workflowActions' => self::workflow_action_types(),
			'integrations'    => $integrations,
		];
	}

	/**
	 * Extension-provided workflow action node types, sanitized for the client.
	 *
	 * @return list<array<string, mixed>>
	 */
	public static function workflow_action_types(): array {
		// Register workflow action node types (filter): each descriptor renders as
		// a node in the builder; the matching runtime handler hooks
		// `flexa_formflow.workflows.run_action`. Filtered value is mixed by design.
		$types = apply_filters( 'flexa_formflow.workflows.action_types', [] );
		if ( ! is_array( $types ) ) {
			return [];
		}

		$out = [];
		foreach ( $types as $type ) {
			if ( ! is_array( $type ) ) {
				continue;
			}
			$descriptor = self::sanitize_action_type( $type );
			if ( null !== $descriptor ) {
				$out[] = $descriptor;
			}
		}

		return $out;
	}

	/**
	 * The set of registered extension action type identifiers, used by the
	 * sanitizer to let their config through storage (Free cannot know the shape
	 * of an add-on's config, so it deep-sanitizes generically instead).
	 *
	 * @return list<string>
	 */
	public static function workflow_action_type_ids(): array {
		return array_values(
			array_filter(
				array_map(
					static fn( array $descriptor ) => (string) ( $descriptor['type'] ?? '' ),
					self::workflow_action_types()
				)
			)
		);
	}

	/**
	 * Extension-provided integration connect forms, keyed to a catalog card id
	 * ({@see \Flexa\FormFlow\Integrations\Catalog}). An add-on describes the
	 * connect form's fields; the Free Integrations screen renders them in a
	 * drawer and stores the values (see \Flexa\FormFlow\Integrations\Connections).
	 *
	 * @return list<array<string, mixed>>
	 */
	public static function integration_connections(): array {
		// Register integration connect forms (filter): each descriptor adds a
		// "Connect" drawer to the matching catalog card. Filtered value is mixed.
		$connections = apply_filters( 'flexa_formflow.integrations.connect_fields', [] );
		if ( ! is_array( $connections ) ) {
			return [];
		}

		$out = [];
		foreach ( $connections as $connection ) {
			if ( ! is_array( $connection ) ) {
				continue;
			}
			$descriptor = self::sanitize_connection( $connection );
			if ( null !== $descriptor ) {
				$out[] = $descriptor;
			}
		}

		return $out;
	}

	/**
	 * The registered integration connect ids, used by the REST layer to accept
	 * a connection save only for a described integration.
	 *
	 * @return list<string>
	 */
	public static function integration_connection_ids(): array {
		return array_values(
			array_filter(
				array_map(
					static fn( array $descriptor ) => (string) ( $descriptor['id'] ?? '' ),
					self::integration_connections()
				)
			)
		);
	}

	/**
	 * The field schema for one integration connect form, or null if unknown.
	 *
	 * @return list<array<string, mixed>>|null
	 */
	public static function connection_fields( string $id ): ?array {
		foreach ( self::integration_connections() as $connection ) {
			if ( ( $connection['id'] ?? '' ) === $id ) {
				$fields = $connection['fields'] ?? [];

				return is_array( $fields ) ? array_values( $fields ) : [];
			}
		}

		return null;
	}

	/**
	 * @param array<string, mixed> $connection
	 * @return array<string, mixed>|null
	 */
	private static function sanitize_connection( array $connection ): ?array {
		$id = sanitize_key( (string) ( $connection['id'] ?? '' ) );
		if ( '' === $id ) {
			return null;
		}

		$fields = [];
		if ( is_array( $connection['fields'] ?? null ) ) {
			foreach ( $connection['fields'] as $field ) {
				if ( ! is_array( $field ) ) {
					continue;
				}
				$sanitized = self::sanitize_field( $field );
				if ( null !== $sanitized ) {
					$fields[] = $sanitized;
				}
			}
		}

		return [
			'id'      => $id,
			'label'   => sanitize_text_field( (string) ( $connection['label'] ?? '' ) ),
			'summary' => sanitize_text_field( (string) ( $connection['summary'] ?? '' ) ),
			'fields'  => $fields,
		];
	}

	/**
	 * @param array<string, mixed> $type
	 * @return array<string, mixed>|null
	 */
	private static function sanitize_action_type( array $type ): ?array {
		$id = sanitize_key( (string) ( $type['type'] ?? '' ) );
		if ( '' === $id ) {
			return null;
		}

		$fields = [];
		if ( is_array( $type['fields'] ?? null ) ) {
			foreach ( $type['fields'] as $field ) {
				if ( ! is_array( $field ) ) {
					continue;
				}
				$sanitized = self::sanitize_field( $field );
				if ( null !== $sanitized ) {
					$fields[] = $sanitized;
				}
			}
		}

		return [
			'type'    => $id,
			'label'   => sanitize_text_field( (string) ( $type['label'] ?? $id ) ),
			'icon'    => sanitize_key( (string) ( $type['icon'] ?? 'puzzle' ) ),
			'group'   => sanitize_key( (string) ( $type['group'] ?? 'core' ) ),
			'summary' => sanitize_text_field( (string) ( $type['summary'] ?? '' ) ),
			'fields'  => $fields,
		];
	}

	/**
	 * @param array<string, mixed> $field
	 * @return array<string, mixed>|null
	 */
	private static function sanitize_field( array $field ): ?array {
		$key     = sanitize_key( (string) ( $field['key'] ?? '' ) );
		$control = (string) ( $field['control'] ?? 'text' );
		if ( '' === $key || ! in_array( $control, self::CONTROLS, true ) ) {
			return null;
		}

		$out = [
			'key'         => $key,
			'control'     => $control,
			'label'       => sanitize_text_field( (string) ( $field['label'] ?? '' ) ),
			'placeholder' => sanitize_text_field( (string) ( $field['placeholder'] ?? '' ) ),
			'help'        => sanitize_text_field( (string) ( $field['help'] ?? '' ) ),
		];

		// A secret field (API key, token) is masked in the client and never sent
		// back by the connection endpoint; an empty save keeps the stored value.
		if ( ! empty( $field['secret'] ) ) {
			$out['secret'] = true;
		}

		// A `connection` control references a stored integration connect form by id.
		if ( 'connection' === $control && isset( $field['connectionId'] ) ) {
			$out['connectionId'] = sanitize_key( (string) $field['connectionId'] );
		}

		if ( array_key_exists( 'default', $field ) ) {
			$out['default'] = self::sanitize_scalar_or_array( $field['default'] );
		}

		if ( is_array( $field['options'] ?? null ) ) {
			$out['options'] = self::sanitize_options( $field['options'] );
		}

		if ( is_array( $field['mapKeys'] ?? null ) ) {
			$out['mapKeys'] = self::sanitize_options( $field['mapKeys'] );
		}

		if ( is_array( $field['showIf'] ?? null ) ) {
			$out['showIf'] = [
				'key'    => sanitize_key( (string) ( $field['showIf']['key'] ?? '' ) ),
				'equals' => self::sanitize_scalar_or_array( $field['showIf']['equals'] ?? '' ),
			];
		}

		return $out;
	}

	/**
	 * @param array<int|string, mixed> $options
	 * @return list<array{value: string, label: string}>
	 */
	private static function sanitize_options( array $options ): array {
		$out = [];
		foreach ( $options as $option ) {
			if ( ! is_array( $option ) ) {
				continue;
			}
			$out[] = [
				'value' => sanitize_text_field( (string) ( $option['value'] ?? '' ) ),
				'label' => sanitize_text_field( (string) ( $option['label'] ?? '' ) ),
			];
		}

		return $out;
	}

	/**
	 * @param mixed $value
	 * @return scalar|list<scalar>|array<string, scalar>
	 */
	private static function sanitize_scalar_or_array( $value ) {
		if ( is_array( $value ) ) {
			$out = [];
			foreach ( $value as $k => $v ) {
				$out[ is_string( $k ) ? sanitize_key( $k ) : (int) $k ] = self::sanitize_scalar_or_array( $v );
			}
			return $out;
		}
		if ( is_bool( $value ) || is_int( $value ) || is_float( $value ) ) {
			return $value;
		}

		return sanitize_text_field( (string) $value );
	}
}
