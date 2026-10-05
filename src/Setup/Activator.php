<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Setup;

use Flexa\FormFlow\Admin\ActivationRedirect;
use Flexa\FormFlow\Database\Schema;
use Flexa\FormFlow\Support\OnboardingState;
use Flexa\FormFlow\Support\Settings;

defined( 'ABSPATH' ) || exit;

final class Activator {
	public static function activate(): void {
		Schema::migrate();

		if ( false === get_option( Settings::OPTION_KEY, false ) ) {
			add_option( Settings::OPTION_KEY, Settings::defaults() );
		}

		// One-shot, user-scoped: only greets whoever activated, and only while
		// the welcome guide was never finished or dismissed.
		if ( ! OnboardingState::is_finished() ) {
			set_transient( ActivationRedirect::REDIRECT_TRANSIENT, get_current_user_id(), MINUTE_IN_SECONDS );
		}
	}
}
