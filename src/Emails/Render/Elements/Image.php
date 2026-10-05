<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails\Render\Elements;

use Flexa\FormFlow\Emails\Render\BaseElement;
use Flexa\FormFlow\Emails\Render\RenderContext;

defined( 'ABSPATH' ) || exit;

final class Image extends BaseElement {
	public function type(): string {
		return 'image';
	}

	public function defaults(): array {
		return [
			'url'   => '',
			'width' => 0,
			'align' => 'center',
			'alt'   => '',
			'link'  => '',
		];
	}

	public function render( array $props, RenderContext $ctx, array $design ): string {
		$src = esc_url( $this->str( $props, 'url' ) );
		if ( '' === $src ) {
			if ( ! $ctx->is_preview ) {
				return '';
			}
			$width = (int) $design['width'] - 80;

			return '<tr><td align="center" style="padding:8px 40px;"><div style="width:100%;max-width:' . $width . 'px;background:#ececec;color:#9a9a9a;padding:40px 0;text-align:center;font-size:13px;border-radius:4px;">'
				. esc_html__( 'Choose an image', 'flexa-formflow' ) . '</div></td></tr>';
		}

		$align     = esc_attr( $this->str( $props, 'align', 'center' ) );
		$width     = $this->int( $props, 'width', 0 );
		$width_att = $width > 0 ? ' width="' . min( 800, $width ) . '"' : ' width="100%"';
		$alt       = esc_attr( $this->str( $props, 'alt' ) );

		$img  = '<img src="' . $src . '"' . $width_att . ' alt="' . $alt . '" style="display:block;max-width:100%;height:auto;border:0;border-radius:4px;">';
		$link = esc_url( $this->resolve_text( $this->str( $props, 'link' ), $ctx ) );
		if ( '' !== $link ) {
			$img = '<a href="' . $link . '">' . $img . '</a>';
		}

		return '<tr><td align="' . $align . '" style="padding:8px 40px;">' . $img . '</td></tr>';
	}
}
