<?php

declare(strict_types=1);

namespace Flexa\FormFlow\WooCommerce;

use Flexa\FormFlow\Concerns\HasInstance;

defined( 'ABSPATH' ) || exit;

/**
 * Per-WooCommerce-email settings: whether FormFlow takes the email over, the
 * custom subject line, and which saved email template renders it. Stored as a
 * single option keyed by email id so no extra table is needed; the template
 * body itself lives in the email_templates table (the visual builder owns it).
 */
final class WooEmailRepository {
	use HasInstance;

	public const OPTION_KEY = 'flexa_formflow_woo_emails';

	/**
	 * @return array{enabled: bool, subject: string, template_id: int}
	 */
	public function find( string $email_id ): array {
		$all = $this->all();

		return $all[ $email_id ] ?? $this->blank();
	}

	public function is_enabled( string $email_id ): bool {
		return $this->find( $email_id )['enabled'];
	}

	/**
	 * The saved settings for every configured email id.
	 *
	 * @return array<string, array{enabled: bool, subject: string, template_id: int}>
	 */
	public function all(): array {
		$stored = get_option( self::OPTION_KEY, [] );
		if ( ! is_array( $stored ) ) {
			return [];
		}

		$clean = [];
		foreach ( $stored as $id => $row ) {
			if ( ! is_string( $id ) || ! is_array( $row ) ) {
				continue;
			}
			$clean[ $id ] = [
				'enabled'     => ! empty( $row['enabled'] ),
				'subject'     => sanitize_text_field( (string) ( $row['subject'] ?? '' ) ),
				'template_id' => max( 0, (int) ( $row['template_id'] ?? 0 ) ),
			];
		}

		return $clean;
	}

	/**
	 * Partial update: only the passed keys change. Returns the stored row.
	 *
	 * @param array<string, mixed> $fields
	 * @return array{enabled: bool, subject: string, template_id: int}
	 */
	public function save( string $email_id, array $fields ): array {
		$all = $this->all();
		$row = $all[ $email_id ] ?? $this->blank();

		if ( array_key_exists( 'enabled', $fields ) ) {
			$row['enabled'] = (bool) $fields['enabled'];
		}
		if ( array_key_exists( 'subject', $fields ) ) {
			$row['subject'] = sanitize_text_field( (string) $fields['subject'] );
		}
		if ( array_key_exists( 'template_id', $fields ) ) {
			$row['template_id'] = max( 0, (int) $fields['template_id'] );
		}

		$all[ $email_id ] = $row;
		update_option( self::OPTION_KEY, $all );

		do_action( 'flexa_formflow.woo.email_saved', $email_id, $row );

		return $row;
	}

	/**
	 * @return array{enabled: bool, subject: string, template_id: int}
	 */
	private function blank(): array {
		return [
			'enabled'     => false,
			'subject'     => '',
			'template_id' => 0,
		];
	}
}
