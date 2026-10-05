<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Packs;

use Flexa\FormFlow\Domain\Packs\PackContent;
use Flexa\FormFlow\Domain\Packs\PackManifest;

defined( 'ABSPATH' ) || exit;

/**
 * An event RSVP pipeline: an RSVP form, a confirmation email, and a workflow
 * that confirms each guest. Free capabilities only (send email, set status), so
 * the whole pack installs on Free.
 */
final class EventRsvpPack {
	public const ID = 'pack-event-rsvp';

	public static function manifest(): PackManifest {
		return new PackManifest(
			id: self::ID,
			name: __( 'Event RSVP Pack', 'flexa-formflow' ),
			description: __( 'Run an event without spreadsheets: an RSVP form, a confirmation email with the details, and a workflow that confirms each guest.', 'flexa-formflow' ),
			category: __( 'Events', 'flexa-formflow' ),
			version: '1.0.0',
			compatibility: 'FormFlow 1.x',
			forms: [ self::rsvp_form() ],
			emails: [ self::confirmation_email() ],
			workflows: [ self::confirm_workflow() ],
			patterns: [ self::guest_details_pattern() ],
			changelog: [
				[
					'version' => '1.0.0',
					'notes'   => [ __( 'First release: RSVP form, confirmation email, confirm workflow.', 'flexa-formflow' ) ],
				],
			],
		);
	}

	private static function rsvp_form(): PackContent {
		return PackContent::make(
			[
				'ref'     => 'rsvp',
				'name'    => __( 'Event RSVP', 'flexa-formflow' ),
				'kind'    => 'form',
				'payload' => [
					'fields'   => [
						[
							'id'       => 'name',
							'type'     => 'text',
							'label'    => __( 'Your name', 'flexa-formflow' ),
							'required' => true,
							'width'    => 'half',
						],
						[
							'id'       => 'email',
							'type'     => 'email',
							'label'    => __( 'Email', 'flexa-formflow' ),
							'required' => true,
							'width'    => 'half',
						],
						[
							'id'       => 'attending',
							'type'     => 'radio',
							'label'    => __( 'Will you attend?', 'flexa-formflow' ),
							'required' => true,
							'options'  => [
								__( 'Yes, I will be there', 'flexa-formflow' ),
								__( 'Sorry, I cannot make it', 'flexa-formflow' ),
							],
						],
						[
							'id'    => 'party_size',
							'type'  => 'number',
							'label' => __( 'How many guests (including you)?', 'flexa-formflow' ),
							'width' => 'half',
						],
						[
							'id'    => 'dietary',
							'type'  => 'text',
							'label' => __( 'Dietary requirements', 'flexa-formflow' ),
							'width' => 'half',
						],
						[
							'id'    => 'note',
							'type'  => 'textarea',
							'label' => __( 'Anything we should know?', 'flexa-formflow' ),
						],
					],
					'settings' => [
						'submit_label'    => __( 'Send RSVP', 'flexa-formflow' ),
						'success_message' => __( 'Thanks for your RSVP! Check your inbox for the details.', 'flexa-formflow' ),
					],
				],
			]
		);
	}

	private static function confirmation_email(): PackContent {
		return PackContent::make(
			[
				'ref'     => 'rsvp-confirmation',
				'name'    => __( 'RSVP confirmed', 'flexa-formflow' ),
				'kind'    => 'email',
				'payload' => [
					'version'  => 1,
					'settings' => [],
					'elements' => [
						[
							'id'    => 'el_logo',
							'type'  => 'logo',
							'props' => [],
						],
						[
							'id'    => 'el_head',
							'type'  => 'heading',
							'props' => [ 'text' => __( 'Your RSVP is confirmed', 'flexa-formflow' ) ],
						],
						[
							'id'    => 'el_body',
							'type'  => 'text',
							'props' => [ 'html' => __( 'Thanks for letting us know. We have you down as below. If anything changes, just reply to this email and we will update your RSVP.', 'flexa-formflow' ) ],
						],
						[
							'id'    => 'el_table',
							'type'  => 'fields_table',
							'props' => [ 'title' => __( 'Your RSVP', 'flexa-formflow' ) ],
						],
						[
							'id'    => 'el_div',
							'type'  => 'divider',
							'props' => [],
						],
						[
							'id'    => 'el_foot',
							'type'  => 'footer_text',
							'props' => [],
						],
					],
				],
			]
		);
	}

	private static function confirm_workflow(): PackContent {
		return PackContent::make(
			[
				'ref'     => 'rsvp-confirm',
				'name'    => __( 'Confirm RSVP', 'flexa-formflow' ),
				'kind'    => 'workflow',
				'payload' => [
					'trigger' => [
						'type'     => 'form_submitted',
						'form_ref' => 'rsvp',
					],
					'actions' => [
						[
							'type'   => 'send_email',
							'config' => [
								'to_mode'      => 'field',
								'to'           => 'email',
								'subject'      => __( 'Your RSVP is confirmed', 'flexa-formflow' ),
								'template_ref' => 'rsvp-confirmation',
							],
						],
						[
							'type'   => 'set_status',
							'config' => [ 'status' => 'read' ],
						],
					],
				],
			]
		);
	}

	private static function guest_details_pattern(): PackContent {
		return PackContent::make(
			[
				'ref'     => 'pat-guest-details',
				'name'    => __( 'Guest details', 'flexa-formflow' ),
				'kind'    => 'form',
				'payload' => [
					'fields' => [
						[
							'id'       => 'name',
							'type'     => 'text',
							'label'    => __( 'Guest name', 'flexa-formflow' ),
							'required' => true,
							'width'    => 'half',
						],
						[
							'id'       => 'email',
							'type'     => 'email',
							'label'    => __( 'Email', 'flexa-formflow' ),
							'required' => true,
							'width'    => 'half',
						],
						[
							'id'    => 'party_size',
							'type'  => 'number',
							'label' => __( 'Party size', 'flexa-formflow' ),
							'width' => 'half',
						],
						[
							'id'    => 'dietary',
							'type'  => 'text',
							'label' => __( 'Dietary requirements', 'flexa-formflow' ),
							'width' => 'half',
						],
					],
				],
			]
		);
	}
}
