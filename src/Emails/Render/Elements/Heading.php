<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails\Render\Elements;

use Flexa\FormFlow\Emails\Render\BaseElement;
use Flexa\FormFlow\Emails\Render\RenderContext;

defined( 'ABSPATH' ) || exit;

final class Heading extends BaseElement {
	public function type(): string {
		return 'heading';
	}

	public function defaults(): array {
		return [
			'text'     => '',
			'align'    => 'left',
			'fontSize' => 24,
			'color'    => '',
		];
	}

	public function render( array $props, RenderContext $ctx, array $design ): string {
		$align   = esc_attr( $this->str( $props, 'align', 'left' ) );
		$size    = max( 12, min( 48, $this->int( $props, 'fontSize', 24 ) ) );
		$heading = isset( $design['headingColor'] ) ? (string) $design['headingColor'] : (string) $design['textColor'];
		$color   = esc_attr( $this->color( $props, 'color', $heading ) );
		$text    = $this->rich_text( $this->str( $props, 'text' ), $ctx, (string) ( $design['linkColor'] ?? '' ) );

		return '<tr><td align="' . $align . '" style="padding:16px 40px 8px;">'
			. '<h1 style="margin:0;font-size:' . $size . 'px;line-height:1.3;font-weight:700;color:' . $color . ';">' . $text . '</h1>'
			. '</td></tr>';
	}
}
