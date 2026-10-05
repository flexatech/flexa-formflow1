<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails\Render\Elements;

use Flexa\FormFlow\Emails\Render\BaseElement;
use Flexa\FormFlow\Emails\Render\RenderContext;

defined( 'ABSPATH' ) || exit;

final class Spacer extends BaseElement {
	public function type(): string {
		return 'spacer';
	}

	public function defaults(): array {
		return [
			'height' => 24,
		];
	}

	public function render( array $props, RenderContext $ctx, array $design ): string {
		unset( $ctx, $design );
		$height = max( 4, min( 160, $this->int( $props, 'height', 24 ) ) );

		return '<tr><td style="height:' . $height . 'px;line-height:' . $height . 'px;font-size:0;">&nbsp;</td></tr>';
	}
}
