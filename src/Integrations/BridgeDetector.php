<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Integrations;

defined( 'ABSPATH' ) || exit;

/**
 * Detects an active mail-delivery plugin. FormFlow hands every message to
 * wp_mail(), so a delivery/SMTP plugin is what actually routes, logs, and
 * tracks it. This surfaces whether one is present so we can nudge the user and
 * never duplicate its settings.
 */
final class BridgeDetector {
	/**
	 * Known delivery plugins, in preference order. The first that matches wins.
	 *
	 * @return list<array{id: string, label: string, check: callable(): bool}>
	 */
	private static function providers(): array {
		return [
			[
				'id'    => 'flexa_mailbridge',
				'label' => __( 'Flexa MailBridge', 'flexa-formflow' ),
				'check' => static fn(): bool => defined( 'FLEXA_MAILBRIDGE_VERSION' ),
			],
			[
				'id'    => 'wp_mail_smtp',
				'label' => __( 'WP Mail SMTP', 'flexa-formflow' ),
				'check' => static fn(): bool => class_exists( '\WPMailSMTP\Core' ) || defined( 'WPMS_PLUGIN_VER' ),
			],
			[
				'id'    => 'fluent_smtp',
				'label' => __( 'FluentSMTP', 'flexa-formflow' ),
				'check' => static fn(): bool => defined( 'FLUENTMAIL' ) || defined( 'FLUENTMAIL_PLUGIN_VERSION' ),
			],
			[
				'id'    => 'post_smtp',
				'label' => __( 'Post SMTP', 'flexa-formflow' ),
				'check' => static fn(): bool => defined( 'POST_SMTP_VER' ) || class_exists( '\PostmanOptions' ),
			],
			[
				'id'    => 'easy_wp_smtp',
				'label' => __( 'Easy WP SMTP', 'flexa-formflow' ),
				'check' => static fn(): bool => defined( 'EASY_WP_SMTP_VERSION' ) || class_exists( '\EasyWPSMTP\Core' ),
			],
		];
	}

	/**
	 * @return array{active: bool, id: string, label: string}
	 */
	public static function detect(): array {
		foreach ( self::providers() as $provider ) {
			if ( ( $provider['check'] )() ) {
				$result = [
					'active' => true,
					'id'     => $provider['id'],
					'label'  => $provider['label'],
				];

				/**
				 * Filter the detected delivery bridge.
				 *
				 * @param array{active: bool, id: string, label: string} $result
				 */
				return apply_filters( 'flexa_formflow.integrations.bridge', $result );
			}
		}

		/** This filter documented above. */
		return apply_filters(
			'flexa_formflow.integrations.bridge',
			[
				'active' => false,
				'id'     => '',
				'label'  => '',
			]
		);
	}
}
