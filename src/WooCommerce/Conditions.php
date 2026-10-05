<?php

declare(strict_types=1);

namespace Flexa\FormFlow\WooCommerce;

use Flexa\FormFlow\Concerns\HasInstance;
use Flexa\FormFlow\Emails\Render\RenderContext;

defined( 'ABSPATH' ) || exit;

/**
 * Evaluates a block's conditions against the order at render time. A block with
 * no conditions always shows; with conditions, every one must pass (AND). The
 * editor preview shows everything so the designer sees all blocks.
 */
final class Conditions {
	use HasInstance;

	public function register(): void {
		add_filter( 'flexa_formflow.emails.node_visible', [ $this, 'node_visible' ], 10, 3 );
	}

	/**
	 * @param array<string, mixed> $node
	 */
	public function node_visible( bool $visible, array $node, RenderContext $ctx ): bool {
		if ( ! $visible ) {
			return false;
		}

		$conditions = isset( $node['conditions'] ) && is_array( $node['conditions'] ) ? $node['conditions'] : [];
		if ( [] === $conditions ) {
			return true;
		}

		// No order to test against (preview, or a no-order email): show the block.
		if ( $ctx->is_preview || ! $ctx->order instanceof \WC_Order ) {
			return true;
		}

		foreach ( $conditions as $condition ) {
			if ( ! is_array( $condition ) ) {
				continue;
			}
			$subject  = (string) ( $condition['subject'] ?? '' );
			$operator = (string) ( $condition['operator'] ?? 'eq' );
			$value    = (string) ( $condition['value'] ?? '' );

			if ( ! $this->check( $subject, $operator, $value, $ctx->order ) ) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Condition subjects for the editor UI.
	 *
	 * @return list<array{value: string, label: string, type: string}>
	 */
	public static function subjects(): array {
		return [
			[
				'value' => 'order_total',
				'label' => __( 'Order total', 'flexa-formflow' ),
				'type'  => 'number',
			],
			[
				'value' => 'items_count',
				'label' => __( 'Number of items', 'flexa-formflow' ),
				'type'  => 'number',
			],
			[
				'value' => 'payment_method',
				'label' => __( 'Payment method', 'flexa-formflow' ),
				'type'  => 'text',
			],
			[
				'value' => 'shipping_country',
				'label' => __( 'Shipping country', 'flexa-formflow' ),
				'type'  => 'text',
			],
			[
				'value' => 'billing_country',
				'label' => __( 'Billing country', 'flexa-formflow' ),
				'type'  => 'text',
			],
		];
	}

	/**
	 * Operators for the editor UI.
	 *
	 * @return list<array{value: string, label: string}>
	 */
	public static function operators(): array {
		return [
			[
				'value' => 'eq',
				'label' => __( 'is', 'flexa-formflow' ),
			],
			[
				'value' => 'neq',
				'label' => __( 'is not', 'flexa-formflow' ),
			],
			[
				'value' => 'gt',
				'label' => __( 'greater than', 'flexa-formflow' ),
			],
			[
				'value' => 'gte',
				'label' => __( 'at least', 'flexa-formflow' ),
			],
			[
				'value' => 'lt',
				'label' => __( 'less than', 'flexa-formflow' ),
			],
			[
				'value' => 'lte',
				'label' => __( 'at most', 'flexa-formflow' ),
			],
			[
				'value' => 'contains',
				'label' => __( 'contains', 'flexa-formflow' ),
			],
		];
	}

	private function check( string $subject, string $operator, string $value, \WC_Order $order ): bool {
		$actual = $this->subject_value( $subject, $order );

		if ( in_array( $subject, [ 'order_total', 'items_count' ], true ) ) {
			return $this->compare_number( (float) $actual, $operator, (float) $value );
		}

		return $this->compare_string( strtolower( (string) $actual ), $operator, strtolower( $value ) );
	}

	private function subject_value( string $subject, \WC_Order $order ): string|float {
		switch ( $subject ) {
			case 'order_total':
				return (float) $order->get_total();
			case 'items_count':
				return (float) $order->get_item_count();
			case 'payment_method':
				return (string) $order->get_payment_method();
			case 'shipping_country':
				return (string) $order->get_shipping_country();
			case 'billing_country':
				return (string) $order->get_billing_country();
			default:
				return '';
		}
	}

	private function compare_number( float $actual, string $operator, float $value ): bool {
		switch ( $operator ) {
			case 'gt':
				return $actual > $value;
			case 'gte':
				return $actual >= $value;
			case 'lt':
				return $actual < $value;
			case 'lte':
				return $actual <= $value;
			case 'neq':
				return abs( $actual - $value ) >= 0.0001;
			case 'eq':
			default:
				return abs( $actual - $value ) < 0.0001;
		}
	}

	private function compare_string( string $actual, string $operator, string $value ): bool {
		switch ( $operator ) {
			case 'neq':
				return $actual !== $value;
			case 'contains':
				return '' !== $value && str_contains( $actual, $value );
			case 'eq':
			default:
				return $actual === $value;
		}
	}
}
