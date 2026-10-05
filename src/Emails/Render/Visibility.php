<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails\Render;

use Flexa\FormFlow\Concerns\HasInstance;

defined( 'ABSPATH' ) || exit;

/**
 * Form-entry visibility rules for email blocks. A block may carry a
 * `visibility` rule set (the shared {match, rules} shape used by the workflow
 * conditions builder); at send time each block is hidden when its rules fail
 * against the submitted entry.
 *
 * This hooks the same `flexa_formflow.emails.node_visible` seam as the
 * WooCommerce order conditions ({@see \Flexa\FormFlow\WooCommerce\Conditions}),
 * but keys off a separate `visibility` node key so the two never collide: Woo
 * owns `conditions` (order subjects), Free owns `visibility` (entry fields).
 * The editor preview always shows every block so the designer sees the layout.
 */
final class Visibility {
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

		$rule_set = isset( $node['visibility'] ) && is_array( $node['visibility'] ) ? $node['visibility'] : [];
		$rules    = isset( $rule_set['rules'] ) && is_array( $rule_set['rules'] ) ? $rule_set['rules'] : [];
		if ( [] === $rules ) {
			return true;
		}

		// No entry to test against (preview, or a no-entry email): show the block.
		if ( $ctx->is_preview || null === $ctx->entry ) {
			return true;
		}

		$match   = ( ( $rule_set['match'] ?? 'all' ) === 'any' ) ? 'any' : 'all';
		$data    = $ctx->entry->data;
		$results = [];

		foreach ( $rules as $rule ) {
			if ( ! is_array( $rule ) ) {
				continue;
			}
			$field    = (string) ( $rule['field'] ?? '' );
			$operator = (string) ( $rule['op'] ?? 'is' );
			$expected = (string) ( $rule['value'] ?? '' );

			$raw       = $data[ $field ] ?? '';
			$actual    = is_array( $raw ) ? implode( ', ', array_map( 'strval', $raw ) ) : (string) $raw;
			$results[] = $this->test_rule( $operator, $actual, $expected );
		}

		if ( [] === $results ) {
			return true;
		}

		return 'any' === $match ? in_array( true, $results, true ) : ! in_array( false, $results, true );
	}

	private function test_rule( string $operator, string $actual, string $expected ): bool {
		switch ( $operator ) {
			case 'is':
				return $actual === $expected;
			case 'is_not':
				return $actual !== $expected;
			case 'contains':
				return '' !== $expected && str_contains( $actual, $expected );
			case 'not_contains':
				return '' === $expected || ! str_contains( $actual, $expected );
			case 'is_empty':
				return '' === $actual;
			case 'is_not_empty':
				return '' !== $actual;
			default:
				return true;
		}
	}
}
