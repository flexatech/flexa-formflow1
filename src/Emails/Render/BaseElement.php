<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails\Render;

use Flexa\FormFlow\Emails\Tokens;
use Flexa\FormFlow\Support\Css;

defined( 'ABSPATH' ) || exit;

/**
 * One builder block. Elements emit table rows (`<tr><td>…</td></tr>`) with
 * fully inline styles — the only markup that renders consistently across
 * Gmail, Outlook, and Apple Mail.
 */
abstract class BaseElement {
	abstract public function type(): string;

	/**
	 * @return array<string, mixed>
	 */
	abstract public function defaults(): array;

	/**
	 * @param array<string, mixed> $props  Already merged over {@see defaults()}.
	 * @param array<string, string|int> $design Merged design tokens (backgroundColor,
	 *                                    contentBackground, textColor, brandColor,
	 *                                    width, fontFamily).
	 */
	abstract public function render( array $props, RenderContext $ctx, array $design ): string;

	/**
	 * @param array<string, mixed> $props
	 * @return array<string, mixed>
	 */
	public function merge_props( array $props ): array {
		return array_merge( $this->defaults(), $props );
	}

	protected function resolve_text( string $text, RenderContext $ctx ): string {
		return Tokens::resolve( $text, $ctx );
	}

	/**
	 * Resolve tokens then allow only email-safe inline HTML. When a link color
	 * is given, it is applied to any anchor that does not already declare one, so
	 * the template's "Text link color" reaches inline links.
	 */
	protected function rich_text( string $text, RenderContext $ctx, string $link_color = '' ): string {
		$allowed = [
			'a'      => [
				'href'   => true,
				'style'  => true,
				'target' => true,
			],
			'strong' => [ 'style' => true ],
			'b'      => [],
			'em'     => [ 'style' => true ],
			'i'      => [],
			'u'      => [],
			'span'   => [ 'style' => true ],
			'br'     => [],
		];

		$html = wp_kses( $this->resolve_text( $text, $ctx ), $allowed );

		return '' === $link_color ? $html : $this->apply_link_color( $html, $link_color );
	}

	/**
	 * Prepend a color to every anchor that has no inline color of its own. An
	 * author-set color always wins.
	 */
	private function apply_link_color( string $html, string $color ): string {
		$color = esc_attr( $color );

		return (string) preg_replace_callback(
			'/<a\b([^>]*)>/i',
			static function ( array $m ) use ( $color ): string {
				$attrs = $m[1];
				if ( preg_match( '/\bstyle\s*=\s*"([^"]*)"/i', $attrs, $sm ) ) {
					if ( false !== stripos( $sm[1], 'color:' ) ) {
						return '<a' . $attrs . '>';
					}
					$attrs = str_replace( $sm[0], 'style="color:' . $color . ';' . $sm[1] . '"', $attrs );
					return '<a' . $attrs . '>';
				}
				return '<a' . $attrs . ' style="color:' . $color . ';">';
			},
			$html
		);
	}

	protected function row( string $inner, string $padding = '12px 40px' ): string {
		return '<tr><td style="padding:' . esc_attr( $padding ) . ';">' . $inner . '</td></tr>';
	}

	/**
	 * @param array<string, mixed> $props
	 */
	protected function str( array $props, string $key, string $fallback = '' ): string {
		return isset( $props[ $key ] ) && is_string( $props[ $key ] ) && '' !== $props[ $key ] ? $props[ $key ] : $fallback;
	}

	/**
	 * A color prop for an inline style: a hex value, or $fallback.
	 *
	 * @param array<string, mixed> $props
	 */
	protected function color( array $props, string $key, string $fallback ): string {
		return Css::hex_color( $props[ $key ] ?? '', $fallback );
	}

	/**
	 * @param array<string, mixed> $props
	 */
	protected function int( array $props, string $key, int $fallback = 0 ): int {
		return isset( $props[ $key ] ) && is_numeric( $props[ $key ] ) ? (int) $props[ $key ] : $fallback;
	}
}
