<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Integrations;

use Flexa\FormFlow\Concerns\HasInstance;
use Flexa\FormFlow\Domain\Entries\EntryRepository;

defined( 'ABSPATH' ) || exit;

/**
 * Writes a delivery row to an entry's activity timeline whenever a notification
 * is sent (the built-in admin/confirmation emails and workflow emails all fire
 * flexa_formflow.notification.sent). The entry detail screen renders these.
 */
final class ActivityRecorder {
	use HasInstance;

	public function register(): void {
		add_action( 'flexa_formflow.notification.sent', [ $this, 'record_sent' ], 10, 2 );
	}

	public function record_sent( string $type, int $entry_id ): void {
		if ( $entry_id <= 0 ) {
			return;
		}

		EntryRepository::instance()->append_activity(
			$entry_id,
			[
				'kind'  => 'email',
				'type'  => $type,
				'label' => $this->label_for( $type ),
				'at'    => current_time( 'mysql', true ),
			]
		);
	}

	private function label_for( string $type ): string {
		switch ( $type ) {
			case 'admin':
				return __( 'Admin notification sent', 'flexa-formflow' );
			case 'confirmation':
				return __( 'Confirmation email sent', 'flexa-formflow' );
			case 'workflow':
				return __( 'Workflow email sent', 'flexa-formflow' );
			default:
				return __( 'Email sent', 'flexa-formflow' );
		}
	}
}
