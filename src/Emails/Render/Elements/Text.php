<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails\Render\Elements;

use Flexa\FormFlow\Emails\Render\BaseElement;
use Flexa\FormFlow\Emails\Render\RenderContext;

defined( 'ABSPATH' ) || exit;

final class Text extends BaseElement {
	public function type(): string {
		return 'text';
	}

	public function defaults(): array {
		return [
			'html'     => '',
			'align'    => 'left',
			'fontSize' => 15,
			'color'    => '',
		];
	}

	public function render( array $props, RenderContext $ctx, array $design ): string {
		$align = esc_attr( $this->str( $props, 'align', 'left' ) );
		$size  = max( 10, min( 32, $this->int( $props, 'fontSize', 15 ) ) );
		$color = esc_attr( $this->color( $props, 'color', (string) $design['textColor'] ) );
		$html  = nl2br( $this->rich_text( $this->str( $props, 'html' ), $ctx, (string) ( $design['linkColor'] ?? '' ) ) );

		return '<tr><td align="' . $align . '" style="padding:8px 40px;font-size:' . $size . 'px;line-height:1.6;color:' . $color . ';">' . $html . '</td></tr>';
	}
}
