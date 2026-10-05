<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Api;

use Flexa\FormFlow\Domain\Forms\FormRepository;
use Flexa\FormFlow\Emails\Tokens;
use Flexa\FormFlow\WooCommerce\OrderTokens;
use WP_REST_Request;
use WP_REST_Response;

defined( 'ABSPATH' ) || exit;

/**
 * The email builder's Dynamic Data browser (PRODUCT_DESIGN.md section I): the
 * data sources a template can pull from, grouped into categories, each source
 * carrying its token and a live sample value. Samples are resolved through the
 * same preview render context the editor uses, so the picker and the preview
 * never disagree.
 */
final class EmailDynamicDataEndpoint extends Endpoint {
	/** Which globals belong to which category (everything else is submission data). */
	private const SITE_TOKENS = [ '{site_title}', '{site_url}', '{admin_email}', '{year}' ];

	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/emails/dynamic-data',
			[
				[
					'methods'             => 'GET',
					'callback'            => [ $this, 'index' ],
					'permission_callback' => [ $this, 'manage_permission' ],
					'args'                => [ 'form_id' => [ 'sanitize_callback' => 'absint' ] ],
				],
			]
		);
	}

	public function index( WP_REST_Request $request ): WP_REST_Response {
		$form_id = (int) $request->get_param( 'form_id' );
		$ctx     = EmailPreviewEndpoint::build_context( [ 'form_id' => $form_id ], true );

		$site       = [];
		$submission = [];
		foreach ( Tokens::catalog() as $meta ) {
			$item = [
				'token'  => $meta['token'],
				'label'  => $meta['label'],
				'sample' => Tokens::resolve( $meta['token'], $ctx ),
			];
			if ( in_array( $meta['token'], self::SITE_TOKENS, true ) ) {
				$site[] = $item;
			} else {
				$submission[] = $item;
			}
		}

		$categories = [
			[
				'key'   => 'submission',
				'label' => __( 'Submission', 'flexa-formflow' ),
				'items' => $submission,
			],
			[
				'key'   => 'site',
				'label' => __( 'Site', 'flexa-formflow' ),
				'items' => $site,
			],
		];

		$fields = $this->field_items( $form_id, $ctx );
		if ( [] !== $fields ) {
			// Form fields sit first: they are what most templates reach for.
			array_unshift(
				$categories,
				[
					'key'   => 'fields',
					'label' => __( 'Form fields', 'flexa-formflow' ),
					'items' => $fields,
				]
			);
		}

		if ( class_exists( \WooCommerce::class ) ) {
			$order = [];
			foreach ( OrderTokens::catalog() as $meta ) {
				$order[] = [
					'token'  => $meta['token'],
					'label'  => $meta['label'],
					'sample' => Tokens::resolve( $meta['token'], $ctx ),
				];
			}
			$categories[] = [
				'key'   => 'order',
				'label' => __( 'Order data', 'flexa-formflow' ),
				'items' => $order,
			];
		}

		/**
		 * Filter the Dynamic Data categories (add-ons contribute their own
		 * sources). Each category is `{key, label, items: [{token, label, sample}]}`.
		 *
		 * @param list<array<string, mixed>>                    $categories
		 * @param \Flexa\FormFlow\Emails\Render\RenderContext $ctx
		 */
		$categories = apply_filters( 'flexa_formflow.emails.dynamic_data', $categories, $ctx );

		return new WP_REST_Response( [ 'categories' => $categories ], 200 );
	}

	/**
	 * The linked form's fields as `{field:ID}` sources with sample values.
	 *
	 * @return list<array{token: string, label: string, sample: string}>
	 */
	private function field_items( int $form_id, \Flexa\FormFlow\Emails\Render\RenderContext $ctx ): array {
		if ( $form_id <= 0 ) {
			return [];
		}

		$form = FormRepository::instance()->find( $form_id );
		if ( null === $form ) {
			return [];
		}

		$items = [];
		foreach ( $form->fields() as $field ) {
			$field_id = (string) ( $field['id'] ?? '' );
			if ( '' === $field_id ) {
				continue;
			}
			$token   = '{field:' . $field_id . '}';
			$items[] = [
				'token'  => $token,
				'label'  => (string) ( $field['label'] ?? $field_id ),
				'sample' => Tokens::resolve( $token, $ctx ),
			];
		}

		return $items;
	}
}
