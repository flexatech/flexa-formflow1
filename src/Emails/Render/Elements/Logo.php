<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails\Render\Elements;

use Flexa\FormFlow\Emails\Render\BaseElement;
use Flexa\FormFlow\Emails\Render\RenderContext;

defined( 'ABSPATH' ) || exit;

final class Logo extends BaseElement {
	public function type(): string {
		return 'logo';
	}

	public function defaults(): array {
		return [
			'image' => '',
			'width' => 160,
			'align' => 'center',
			'alt'   => '',
			'link'  => '{site_url}',
		];
	}

	public function render( array $props, RenderContext $ctx, array $design ): string {
		$align = esc_attr( $this->str( $props, 'align', 'center' ) );
		$link  = esc_url( $this->resolve_text( $this->str( $props, 'link' ), $ctx ) );
		$image = esc_url( $this->str( $props, 'image' ) );

		if ( '' === $image ) {
			// No logo uploaded yet: fall back to the site title as a wordmark.
			$inner = '<span style="font-size:22px;font-weight:700;color:' . esc_attr( (string) $design['brandColor'] ) . ';">'
				. esc_html( $this->resolve_text( '{site_title}', $ctx ) ) . '</span>';
		} else {
			$width = max( 40, min( 600, $this->int( $props, 'width', 160 ) ) );
			$alt   = esc_attr( $this->str( $props, 'alt' ) );
			$inner = '<img src="' . $image . '" width="' . $width . '" alt="' . $alt . '" style="display:inline-block;max-width:100%;height:auto;border:0;">';
		}

		if ( '' !== $link ) {
			$inner = '<a href="' . $link . '" style="text-decoration:none;">' . $inner . '</a>';
		}

		return '<tr><td align="' . $align . '" style="padding:28px 40px 12px;">' . $inner . '</td></tr>';
	}
}
