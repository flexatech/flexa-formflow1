<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails\Render\Elements;

use Flexa\FormFlow\Emails\Render\BaseElement;
use Flexa\FormFlow\Emails\Render\RenderContext;
use Flexa\FormFlow\Support\Settings;

defined( 'ABSPATH' ) || exit;

final class FooterText extends BaseElement {
	private const DEFAULT_HTML = '© {year} {site_title}';

	public function type(): string {
		return 'footer_text';
	}

	public function defaults(): array {
		// Left empty on purpose: an unset footer inherits the site-wide
		// "Footer text" setting at render time (see {@see render()}).
		return [
			'html'  => '',
			'align' => 'center',
			'color' => '#8a8a8a',
		];
	}

	public function render( array $props, RenderContext $ctx, array $design ): string {
		$align = esc_attr( $this->str( $props, 'align', 'center' ) );
		$color = esc_attr( $this->color( $props, 'color', '#8a8a8a' ) );

		// Three tiers: an explicit per-template override on the element wins;
		// otherwise the site-wide setting applies; an empty setting falls back
		// to the built-in default.
		$global   = Settings::get( 'footer_text' );
		$fallback = is_string( $global ) && '' !== $global ? $global : self::DEFAULT_HTML;
		$html     = $this->rich_text( $this->str( $props, 'html', $fallback ), $ctx, (string) ( $design['linkColor'] ?? '' ) );

		return '<tr><td align="' . $align . '" style="padding:20px 40px 28px;font-size:12px;line-height:1.6;color:' . $color . ';">' . $html . '</td></tr>';
	}
}
