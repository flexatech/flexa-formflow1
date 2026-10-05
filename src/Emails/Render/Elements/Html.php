<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails\Render\Elements;

use Flexa\FormFlow\Emails\Render\BaseElement;
use Flexa\FormFlow\Emails\Render\RenderContext;

defined( 'ABSPATH' ) || exit;

final class Html extends BaseElement {
	public function type(): string {
		return 'html';
	}

	public function defaults(): array {
		return [
			'code' => '',
		];
	}

	public function render( array $props, RenderContext $ctx, array $design ): string {
		unset( $design );
		$code = $this->str( $props, 'code' );
		if ( '' === trim( $code ) ) {
			return '';
		}

		// Post-level HTML only: scripts/iframes are stripped, tokens work.
		$code = wp_kses_post( $this->resolve_text( $code, $ctx ) );

		return '<tr><td style="padding:8px 40px;">' . $code . '</td></tr>';
	}
}
