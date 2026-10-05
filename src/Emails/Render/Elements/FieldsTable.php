<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails\Render\Elements;

use Flexa\FormFlow\Domain\Forms\FieldTypes;
use Flexa\FormFlow\Emails\Render\BaseElement;
use Flexa\FormFlow\Emails\Render\RenderContext;

defined( 'ABSPATH' ) || exit;

/**
 * A label/value table of the form's submitted fields, in config order. Reads
 * the entry data; in editor preview with no entry it fills sample values so the
 * design never renders blank.
 */
final class FieldsTable extends BaseElement {
	public function type(): string {
		return 'fields_table';
	}

	public function defaults(): array {
		return [
			'title'       => '',
			'borderColor' => '#e6e6e6',
		];
	}

	public function render( array $props, RenderContext $ctx, array $design ): string {
		$form = $ctx->form;
		if ( null === $form ) {
			return '';
		}

		$border = esc_attr( $this->color( $props, 'borderColor', '#e6e6e6' ) );
		$text   = esc_attr( (string) $design['textColor'] );
		$data   = null !== $ctx->entry ? $ctx->entry->data : [];

		$rows = '';
		foreach ( $form->fields() as $field ) {
			$field_id = (string) ( $field['id'] ?? '' );
			if ( '' === $field_id ) {
				continue;
			}

			// An entry that answered this field, even blank (array_key_exists is
			// true for '' and []), still counts as "no real value" here: preview
			// falls back to a sample the same as when the entry has no answer at
			// all, so the design never renders blank (see Tokens::field_values()).
			$raw   = array_key_exists( $field_id, $data ) ? $data[ $field_id ] : null;
			$value = is_array( $raw ) ? implode( ', ', array_map( 'strval', $raw ) ) : (string) ( $raw ?? '' );

			if ( '' === $value ) {
				$value = $ctx->is_preview ? FieldTypes::sample_value( $field ) : '';
			}

			// Hidden fields with no value are noise in a summary; skip them.
			if ( 'hidden' === ( $field['type'] ?? '' ) && '' === $value ) {
				continue;
			}

			$label = (string) ( $field['label'] ?? $field_id );
			$cell  = 'padding:10px 12px;border-bottom:1px solid ' . $border . ';font-size:14px;';
			$rows .= '<tr>'
				. '<td align="left" valign="top" style="' . $cell . 'color:#667085;white-space:nowrap;">' . esc_html( $label ) . '</td>'
				. '<td align="left" valign="top" style="' . $cell . 'color:' . $text . ';">' . nl2br( esc_html( $value ) ) . '</td>'
				. '</tr>';
		}

		if ( '' === $rows ) {
			return '';
		}

		$title      = $this->resolve_text( $this->str( $props, 'title' ), $ctx );
		$title_html = '' !== $title
			? '<p style="margin:0 0 10px;font-size:16px;font-weight:600;color:' . $text . ';">' . esc_html( $title ) . '</p>'
			: '';

		return '<tr><td style="padding:12px 40px;">'
			. $title_html
			. '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border:1px solid ' . $border . ';border-radius:6px;">'
			. $rows
			. '</table>'
			. '</td></tr>';
	}
}
