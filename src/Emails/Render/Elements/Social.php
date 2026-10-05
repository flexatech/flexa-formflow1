<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails\Render\Elements;

use Flexa\FormFlow\Emails\Render\BaseElement;
use Flexa\FormFlow\Emails\Render\RenderContext;

defined( 'ABSPATH' ) || exit;

final class Social extends BaseElement {
	private const NETWORKS = [
		'facebook'  => 'Facebook',
		'instagram' => 'Instagram',
		'x'         => 'X',
		'tiktok'    => 'TikTok',
		'youtube'   => 'YouTube',
		'pinterest' => 'Pinterest',
		'website'   => 'Website',
	];

	public function type(): string {
		return 'social';
	}

	public function defaults(): array {
		$defaults = [ 'align' => 'center' ];
		foreach ( array_keys( self::NETWORKS ) as $network ) {
			$defaults[ $network ] = '';
		}

		return $defaults;
	}

	public function render( array $props, RenderContext $ctx, array $design ): string {
		$align = esc_attr( $this->str( $props, 'align', 'center' ) );
		// Social labels are links, so they follow the template's link color
		// (which itself falls back to the brand color).
		$link = esc_attr( (string) ( $design['linkColor'] ?? $design['brandColor'] ) );

		$links = [];
		foreach ( self::NETWORKS as $network => $label ) {
			$url = esc_url( $this->str( $props, $network ) );
			if ( '' !== $url ) {
				$links[] = '<a href="' . $url . '" style="display:inline-block;margin:0 8px;font-size:13px;font-weight:600;color:' . $link . ';text-decoration:none;">' . esc_html( $label ) . '</a>';
			}
		}

		if ( [] === $links ) {
			if ( $ctx->is_preview ) {
				return '<tr><td align="' . $align . '" style="padding:12px 40px;font-size:12px;color:#9a9a9a;">'
					. esc_html__( 'Add social profile URLs in the block settings', 'flexa-formflow' ) . '</td></tr>';
			}

			return '';
		}

		return '<tr><td align="' . $align . '" style="padding:12px 40px;">' . implode( '<span style="color:#c9c9c9;">&middot;</span>', $links ) . '</td></tr>';
	}
}
