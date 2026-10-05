<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails;

use Flexa\FormFlow\Domain\Forms\FieldTypes;
use Flexa\FormFlow\Emails\Render\RenderContext;

defined( 'ABSPATH' ) || exit;

/**
 * Replaces `{token}` and `{field:ID}` tokens in element text. In preview mode,
 * tokens with no live data resolve to sample values so the design never renders
 * blank; in real sends, missing data resolves to an empty string.
 */
final class Tokens {
	public static function resolve( string $text, RenderContext $ctx ): string {
		if ( ! str_contains( $text, '{' ) ) {
			return $text;
		}

		$values = self::values( $ctx );
		$fields = self::field_values( $ctx );

		return (string) preg_replace_callback(
			'/\{([a-z0-9_:]+)\}/',
			static function ( array $match ) use ( $values, $fields ): string {
				$token = $match[1];

				if ( str_starts_with( $token, 'field:' ) ) {
					$field_id = substr( $token, 6 );
					return array_key_exists( $field_id, $fields ) ? $fields[ $field_id ] : $match[0];
				}

				return array_key_exists( $token, $values ) ? (string) $values[ $token ] : $match[0];
			},
			$text
		);
	}

	/**
	 * Global (non-field) token metadata for the editor hint list.
	 *
	 * @return list<array{token: string, label: string}>
	 */
	public static function catalog(): array {
		return [
			[
				'token' => '{site_title}',
				'label' => __( 'Site title', 'flexa-formflow' ),
			],
			[
				'token' => '{site_url}',
				'label' => __( 'Site URL', 'flexa-formflow' ),
			],
			[
				'token' => '{admin_email}',
				'label' => __( 'Admin email', 'flexa-formflow' ),
			],
			[
				'token' => '{year}',
				'label' => __( 'Current year', 'flexa-formflow' ),
			],
			[
				'token' => '{form_title}',
				'label' => __( 'Form title', 'flexa-formflow' ),
			],
			[
				'token' => '{entry_id}',
				'label' => __( 'Entry ID', 'flexa-formflow' ),
			],
			[
				'token' => '{entry_date}',
				'label' => __( 'Submission date', 'flexa-formflow' ),
			],
			[
				'token' => '{page_url}',
				'label' => __( 'Submission page URL', 'flexa-formflow' ),
			],
		];
	}

	/**
	 * @return array<string, string>
	 */
	private static function values( RenderContext $ctx ): array {
		$values = [
			'site_title'  => wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES ),
			'site_url'    => home_url(),
			'admin_email' => (string) get_option( 'admin_email' ),
			'year'        => (string) gmdate( 'Y' ),
			'form_title'  => null !== $ctx->form ? $ctx->form->title : '',
			'entry_id'    => null !== $ctx->entry ? (string) $ctx->entry->id : '',
			'entry_date'  => null !== $ctx->entry
				? date_i18n( get_option( 'date_format' ) . ' ' . get_option( 'time_format' ), strtotime( $ctx->entry->created_at . ' UTC' ) ?: null )
				: '',
			'page_url'    => null !== $ctx->entry ? (string) ( $ctx->entry->meta['referer'] ?? '' ) : '',
		];

		if ( $ctx->is_preview ) {
			$values['form_title'] = '' !== $values['form_title'] ? $values['form_title'] : __( 'Contact form', 'flexa-formflow' );
			$values['entry_id']   = '' !== $values['entry_id'] ? $values['entry_id'] : '123';
			$values['entry_date'] = '' !== $values['entry_date'] ? $values['entry_date'] : date_i18n( get_option( 'date_format' ) . ' ' . get_option( 'time_format' ) );
			$values['page_url']   = '' !== $values['page_url'] ? $values['page_url'] : home_url( '/contact/' );
		}

		/**
		 * Filter the resolved global token values (addons add their own tokens).
		 *
		 * @param array<string, string> $values
		 * @param RenderContext         $ctx
		 */
		return apply_filters( 'flexa_formflow.emails.tokens', $values, $ctx );
	}

	/**
	 * Per-field values keyed by field id, for {field:ID} tokens.
	 *
	 * @return array<string, string>
	 */
	private static function field_values( RenderContext $ctx ): array {
		if ( null === $ctx->form ) {
			return [];
		}

		$data   = null !== $ctx->entry ? $ctx->entry->data : [];
		$values = [];
		foreach ( $ctx->form->fields() as $field ) {
			$field_id = (string) ( $field['id'] ?? '' );
			if ( '' === $field_id ) {
				continue;
			}

			// An entry that answered this field, even blank (array_key_exists is
			// true for '' and []), still counts as "no real value" here: preview
			// falls back to a sample the same as when the entry has no answer at
			// all, so the design never renders blank (see OrderTokens::sample_values()).
			$value    = array_key_exists( $field_id, $data ) ? $data[ $field_id ] : null;
			$resolved = is_array( $value ) ? implode( ', ', array_map( 'strval', $value ) ) : (string) ( $value ?? '' );

			if ( '' !== $resolved ) {
				$values[ $field_id ] = $resolved;
			} elseif ( $ctx->is_preview ) {
				$values[ $field_id ] = FieldTypes::sample_value( $field );
			} else {
				$values[ $field_id ] = '';
			}
		}

		return $values;
	}
}
