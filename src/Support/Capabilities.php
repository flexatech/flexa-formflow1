<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Support;

defined( 'ABSPATH' ) || exit;

/**
 * Capability helpers. Extensions (add-ons) can hook the filters
 * below to re-gate access per role.
 */
final class Capabilities {
	public const MANAGE   = 'manage_options';
	public const SETTINGS = 'manage_options';

	public static function can_manage(): bool {
		return current_user_can( apply_filters( 'flexa_formflow.capabilities.manage', self::MANAGE ) );
	}

	public static function can_manage_settings(): bool {
		return current_user_can( apply_filters( 'flexa_formflow.capabilities.settings', self::SETTINGS ) );
	}
}
