<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails\Render\Elements;

use Flexa\FormFlow\Emails\Render\BaseElement;
use Flexa\FormFlow\Emails\Render\RenderContext;

defined( 'ABSPATH' ) || exit;

final class Button extends BaseElement {
	public function type(): string {
		return 'button';
	}

	public function defaults(): array {
		return [
			'text'      => '',
			'url'       => '',
			'align'     => 'center',
			'bgColor'   => '',
			'textColor' => '#ffffff',
			'radius'    => 6,
			'fontSize'  => 15,
		];
	}

	public function render( array $props, RenderContext $ctx, array $design ): string {
		$align  = esc_attr( $this->str( $props, 'align', 'center' ) );
		$url    = esc_url( $this->resolve_text( $this->str( $props, 'url' ), $ctx ) );
		$bg     = esc_attr( $this->color( $props, 'bgColor', (string) $design['brandColor'] ) );
		$color  = esc_attr( $this->color( $props, 'textColor', '#ffffff' ) );
		$radius = max( 0, min( 30, $this->int( $props, 'radius', 6 ) ) );
		$size   = max( 11, min( 24, $this->int( $props, 'fontSize', 15 ) ) );
		$text   = esc_html( $this->resolve_text( $this->str( $props, 'text' ), $ctx ) );

		// Padded <a> inside a colored <td>: the only button pattern Outlook
		// renders with the full area clickable-looking.
		return '<tr><td align="' . $align . '" style="padding:16px 40px;">'
			. '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>'
			. '<td bgcolor="' . $bg . '" style="border-radius:' . $radius . 'px;">'
			. '<a href="' . $url . '" style="display:inline-block;padding:12px 28px;font-size:' . $size . 'px;font-weight:600;color:' . $color . ';text-decoration:none;border-radius:' . $radius . 'px;">' . $text . '</a>'
			. '</td></tr></table>'
			. '</td></tr>';
	}
}
