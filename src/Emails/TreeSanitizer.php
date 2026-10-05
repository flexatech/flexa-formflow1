<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails;

use Flexa\FormFlow\Support\Css;

defined( 'ABSPATH' ) || exit;

/**
 * Validates and sanitizes an incoming element tree before it hits the database.
 * Strings pass through wp_kses_post (rich text survives, scripts do not);
 * unknown keys and malformed nodes are dropped. Always returns the canonical
 * v1 shape.
 */
final class TreeSanitizer {
	private const MAX_ELEMENTS = 100;

	private const SETTINGS_STRING_KEYS = [ 'backgroundColor', 'contentBackground', 'textColor', 'headingColor', 'linkColor', 'brandColor', 'fontFamily' ];

	/**
	 * @param array<string, mixed> $tree
	 * @return array<string, mixed>
	 */
	public static function sanitize( array $tree ): array {
		$settings = [];
		$incoming = isset( $tree['settings'] ) && is_array( $tree['settings'] ) ? $tree['settings'] : [];
		// These land in inline styles: keep only a valid hex color / font stack.
		// An invalid value is dropped so the global setting applies instead.
		foreach ( self::SETTINGS_STRING_KEYS as $key ) {
			if ( isset( $incoming[ $key ] ) && is_string( $incoming[ $key ] ) ) {
				$value = 'fontFamily' === $key ? Css::font_stack( $incoming[ $key ] ) : Css::hex_color( $incoming[ $key ] );
				if ( '' !== $value ) {
					$settings[ $key ] = $value;
				}
			}
		}
		if ( isset( $incoming['width'] ) && is_numeric( $incoming['width'] ) ) {
			$settings['width'] = max( 320, min( 800, (int) $incoming['width'] ) );
		}
		if ( isset( $incoming['direction'] ) && 'rtl' === $incoming['direction'] ) {
			$settings['direction'] = 'rtl';
		}

		$nodes = isset( $tree['elements'] ) && is_array( $tree['elements'] ) ? $tree['elements'] : [];

		return [
			'version'  => 1,
			'settings' => $settings,
			'elements' => self::sanitize_elements( $nodes, true ),
		];
	}

	/**
	 * Sanitize a list of element nodes. Column children are sanitized the same
	 * way but with `$allow_columns` off, so nesting stays one level deep.
	 *
	 * @param array<int, mixed> $nodes
	 * @return list<array<string, mixed>>
	 */
	private static function sanitize_elements( array $nodes, bool $allow_columns ): array {
		$elements = [];
		foreach ( array_slice( $nodes, 0, self::MAX_ELEMENTS ) as $node ) {
			if ( ! is_array( $node ) || ! isset( $node['type'] ) || ! is_string( $node['type'] ) ) {
				continue;
			}

			$type    = sanitize_key( $node['type'] );
			$element = [
				'id'    => isset( $node['id'] ) && is_string( $node['id'] ) ? sanitize_key( $node['id'] ) : 'el_' . wp_generate_password( 8, false ),
				'type'  => $type,
				'props' => self::sanitize_props( isset( $node['props'] ) && is_array( $node['props'] ) ? $node['props'] : [] ),
			];

			$visibility = self::sanitize_visibility( isset( $node['visibility'] ) && is_array( $node['visibility'] ) ? $node['visibility'] : [] );
			if ( [] !== $visibility['rules'] ) {
				$element['visibility'] = $visibility;
			}

			if ( 'columns' === $type && $allow_columns ) {
				$raw_columns = isset( $node['columns'] ) && is_array( $node['columns'] ) ? $node['columns'] : [ [], [] ];
				$columns     = [];
				foreach ( array_slice( array_values( $raw_columns ), 0, 4 ) as $col ) {
					$columns[] = self::sanitize_elements( is_array( $col ) ? $col : [], false );
				}
				$element['columns'] = [] === $columns ? [ [], [] ] : $columns;
			}

			$elements[] = $element;
		}

		return $elements;
	}

	/**
	 * A block's form-entry visibility rule set: the shared {match, rules} shape
	 * used by the workflow conditions builder. Evaluated at send time by
	 * {@see \Flexa\FormFlow\Emails\Render\Visibility}. Unknown keys are dropped;
	 * an empty rule list means the block is always visible.
	 *
	 * @param array<string, mixed> $visibility
	 * @return array{match: 'all'|'any', rules: list<array{field: string, op: string, value: string}>}
	 */
	private static function sanitize_visibility( array $visibility ): array {
		$match = ( ( $visibility['match'] ?? 'all' ) === 'any' ) ? 'any' : 'all';
		$rules = isset( $visibility['rules'] ) && is_array( $visibility['rules'] ) ? $visibility['rules'] : [];

		$clean = [];
		foreach ( array_slice( $rules, 0, 20 ) as $rule ) {
			if ( ! is_array( $rule ) ) {
				continue;
			}
			$field = sanitize_key( (string) ( $rule['field'] ?? '' ) );
			if ( '' === $field ) {
				continue;
			}
			$clean[] = [
				'field' => $field,
				'op'    => sanitize_key( (string) ( $rule['op'] ?? 'is' ) ),
				'value' => sanitize_text_field( (string) ( $rule['value'] ?? '' ) ),
			];
		}

		return [
			'match' => $match,
			'rules' => $clean,
		];
	}

	/**
	 * @param array<mixed> $props
	 * @return array<string, mixed>
	 */
	private static function sanitize_props( array $props, int $depth = 0 ): array {
		if ( $depth > 3 ) {
			return [];
		}

		$out = [];
		foreach ( $props as $key => $value ) {
			if ( is_string( $value ) ) {
				$out[ $key ] = wp_kses_post( $value );
			} elseif ( is_int( $value ) || is_float( $value ) || is_bool( $value ) ) {
				$out[ $key ] = $value;
			} elseif ( is_array( $value ) ) {
				$out[ $key ] = self::sanitize_props( $value, $depth + 1 );
			}
		}

		return $out;
	}
}
