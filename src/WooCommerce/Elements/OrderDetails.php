<?php

declare(strict_types=1);

namespace Flexa\FormFlow\WooCommerce\Elements;

use Flexa\FormFlow\Emails\Render\BaseElement;
use Flexa\FormFlow\Emails\Render\RenderContext;

defined( 'ABSPATH' ) || exit;

/**
 * The order line items and totals as an email table. Reads the live order from
 * the render context; in editor preview with no order it shows sample rows so
 * the design never renders blank. Registered only when WooCommerce is active.
 */
final class OrderDetails extends BaseElement {
	public function type(): string {
		return 'order_details';
	}

	public function defaults(): array {
		return [
			'title'       => __( 'Order summary', 'flexa-formflow' ),
			'borderColor' => '#e6e6e6',
		];
	}

	public function render( array $props, RenderContext $ctx, array $design ): string {
		$border = esc_attr( $this->str( $props, 'borderColor', '#e6e6e6' ) );
		$text   = esc_attr( (string) $design['textColor'] );
		$cell   = 'padding:10px 12px;border-bottom:1px solid ' . $border . ';font-size:14px;';

		$rows = $ctx->order instanceof \WC_Order
			? $this->order_rows( $ctx->order, $cell, $text )
			: ( $ctx->is_preview ? $this->sample_rows( $cell, $text ) : '' );

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

	private function order_rows( \WC_Order $order, string $cell, string $text ): string {
		$rows = '';
		foreach ( $order->get_items() as $item ) {
			if ( ! $item instanceof \WC_Order_Item_Product ) {
				continue;
			}
			$name  = $item->get_name();
			$qty   = $item->get_quantity();
			$total = wp_strip_all_tags( wc_price( (float) $order->get_line_total( $item, true ), [ 'currency' => $order->get_currency() ] ) );

			$rows .= '<tr>'
				. '<td align="left" valign="top" style="' . $cell . 'color:' . $text . ';">' . esc_html( $name ) . ' &times; ' . esc_html( (string) $qty ) . '</td>'
				. '<td align="right" valign="top" style="' . $cell . 'color:' . $text . ';white-space:nowrap;">' . esc_html( $total ) . '</td>'
				. '</tr>';
		}

		foreach ( $order->get_order_item_totals() as $total_row ) {
			if ( ! is_array( $total_row ) ) {
				continue;
			}
			$label = wp_strip_all_tags( (string) ( $total_row['label'] ?? '' ) );
			$value = wp_strip_all_tags( (string) ( $total_row['value'] ?? '' ) );
			$rows .= '<tr>'
				. '<td align="left" valign="top" style="' . $cell . 'color:#667085;font-weight:600;">' . esc_html( $label ) . '</td>'
				. '<td align="right" valign="top" style="' . $cell . 'color:' . $text . ';white-space:nowrap;">' . esc_html( $value ) . '</td>'
				. '</tr>';
		}

		return $rows;
	}

	private function sample_rows( string $cell, string $text ): string {
		$items = [
			[ __( 'Sample product', 'flexa-formflow' ) . ' &times; 1', '$96.00' ],
			[ __( 'Another item', 'flexa-formflow' ) . ' &times; 2', '$32.50' ],
			[ __( 'Subtotal', 'flexa-formflow' ), '$128.50' ],
			[ __( 'Total', 'flexa-formflow' ), '$128.50' ],
		];

		$rows = '';
		foreach ( $items as $item ) {
			$rows .= '<tr>'
				. '<td align="left" valign="top" style="' . $cell . 'color:' . $text . ';">' . esc_html( $item[0] ) . '</td>'
				. '<td align="right" valign="top" style="' . $cell . 'color:' . $text . ';white-space:nowrap;">' . esc_html( $item[1] ) . '</td>'
				. '</tr>';
		}

		return $rows;
	}
}
