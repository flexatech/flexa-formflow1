<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Support;

defined( 'ABSPATH' ) || exit;

/**
 * Sanitizers for values that land inside CSS (inline `style=""` attributes
 * and custom properties). esc_attr() only makes a value safe for HTML, so a
 * color like `red;background:url(x)` would still inject declarations. These
 * reduce each value to a shape that cannot leave its CSS property.
 */
final class Css {
	/**
	 * A #rgb or #rrggbb color, or $fallback when the value is anything else.
	 */
	public static function hex_color( mixed $value, string $fallback = '' ): string {
		$color = is_string( $value ) ? sanitize_hex_color( trim( $value ) ) : null;

		return is_string( $color ) && '' !== $color ? $color : $fallback;
	}

	/**
	 * A font-family stack: letters, digits, spaces, commas, hyphens and single
	 * quotes. Anything that could close the property (`;`, `}`, `(`, `"`) is
	 * removed; unquoted multi-word names like Helvetica Neue are valid CSS.
	 */
	public static function font_stack( mixed $value, string $fallback = '' ): string {
		$stack = is_string( $value ) ? trim( (string) preg_replace( '/[^A-Za-z0-9 ,\'-]/', '', $value ) ) : '';

		return '' !== $stack ? $stack : $fallback;
	}
}
