<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails\Render;

use Flexa\FormFlow\Concerns\HasInstance;

defined( 'ABSPATH' ) || exit;

final class ElementRegistry {
	use HasInstance;

	/**
	 * @var array<string, BaseElement>|null
	 */
	private ?array $elements = null;

	public function get( string $type ): ?BaseElement {
		return $this->all()[ $type ] ?? null;
	}

	/**
	 * @return array<string, BaseElement>
	 */
	public function all(): array {
		if ( null !== $this->elements ) {
			return $this->elements;
		}

		$classes = [
			Elements\Logo::class,
			Elements\Heading::class,
			Elements\Text::class,
			Elements\Button::class,
			Elements\Image::class,
			Elements\Divider::class,
			Elements\Spacer::class,
			Elements\Social::class,
			Elements\FieldsTable::class,
			Elements\FooterText::class,
			Elements\Html::class,
		];

		$elements = [];
		foreach ( $classes as $class ) {
			$element                      = new $class();
			$elements[ $element->type() ] = $element;
		}

		/**
		 * Filter registered elements. Addons add their own BaseElement
		 * instances keyed by type.
		 *
		 * @param array<string, BaseElement> $elements
		 */
		$this->elements = apply_filters( 'flexa_formflow.emails.elements', $elements );

		return $this->elements;
	}
}
