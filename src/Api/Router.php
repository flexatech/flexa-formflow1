<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Api;

use Flexa\FormFlow\Concerns\HasInstance;

defined( 'ABSPATH' ) || exit;

/**
 * Registers every REST endpoint in one place. Extensions add their own
 * endpoints by hooking the `flexa_formflow.rest.register_routes` action.
 *
 * Every endpoint class MUST be newed up here — an endpoint that exists but is
 * never added to this list is silently dead.
 */
final class Router {
	use HasInstance;

	public function register(): void {
		add_action( 'rest_api_init', [ $this, 'register_routes' ] );
	}

	public function register_routes(): void {
		( new SettingsEndpoint() )->register_routes();
		( new OnboardingEndpoint() )->register_routes();
		( new FormsEndpoint() )->register_routes();
		( new FormPreviewEndpoint() )->register_routes();
		( new EntriesEndpoint() )->register_routes();
		( new StatsEndpoint() )->register_routes();
		( new SubmitEndpoint() )->register_routes();
		( new EmailTemplatesEndpoint() )->register_routes();
		( new EmailPreviewEndpoint() )->register_routes();
		( new EmailDynamicDataEndpoint() )->register_routes();
		( new EmailPatternsEndpoint() )->register_routes();
		( new EmailTestEndpoint() )->register_routes();
		( new WooEmailsEndpoint() )->register_routes();
		( new WorkflowsEndpoint() )->register_routes();
		( new IntegrationsEndpoint() )->register_routes();
		( new AiEndpoint() )->register_routes();
		( new LibraryEndpoint() )->register_routes();

		do_action( 'flexa_formflow.rest.register_routes' );
	}
}
