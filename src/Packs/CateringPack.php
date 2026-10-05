<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Packs;

use Flexa\FormFlow\Domain\Packs\PackContent;
use Flexa\FormFlow\Domain\Packs\PackManifest;

defined( 'ABSPATH' ) || exit;

/**
 * The first authored pack: a ready-made pipeline built only from core workflow
 * actions (send email, set status). The content payloads are minimal
 * but real; the repositories sanitize them on import, and the workflow's
 * form/template references are resolved to the new ids by the Installer.
 */
final class CateringPack {
	public const ID = 'pack-catering';

	public static function manifest(): PackManifest {
		return new PackManifest(
			id: self::ID,
			name: __( 'Catering Business Pack', 'flexa-formflow' ),
			description: __( 'A ready-made catering inquiry pipeline: an inquiry form, a branded confirmation email, and a workflow that ties them together.', 'flexa-formflow' ),
			category: __( 'Hospitality', 'flexa-formflow' ),
			version: '1.0.0',
			compatibility: 'FormFlow 1.x',
			forms: [ self::inquiry_form() ],
			emails: [ self::confirmation_email() ],
			workflows: [ self::follow_up_workflow() ],
			patterns: [ self::customer_info_pattern() ],
			changelog: [
				[
					'version' => '1.0.0',
					'notes'   => [ __( 'First release: inquiry form, confirmation email, follow-up workflow.', 'flexa-formflow' ) ],
				],
			],
		);
	}

	private static function inquiry_form(): PackContent {
		return PackContent::make(
			[
				'ref'     => 'inquiry',
				'name'    => __( 'Catering inquiry', 'flexa-formflow' ),
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
							'id'    => 'phone',
							'type'  => 'text',
							'label' => __( 'Phone', 'flexa-formflow' ),
							'width' => 'half',
						],
						[
							'id'       => 'event_date',
							'type'     => 'date',
							'label'    => __( 'Event date', 'flexa-formflow' ),
							'required' => true,
							'width'    => 'half',
						],
						[
							'id'       => 'guest_count',
							'type'     => 'number',
							'label'    => __( 'Number of guests', 'flexa-formflow' ),
							'required' => true,
							'width'    => 'half',
						],
						[
							'id'       => 'event_type',
							'type'     => 'select',
							'label'    => __( 'Event type', 'flexa-formflow' ),
							'required' => true,
							'width'    => 'half',
							'options'  => [
								__( 'Wedding', 'flexa-formflow' ),
								__( 'Corporate', 'flexa-formflow' ),
								__( 'Birthday', 'flexa-formflow' ),
								__( 'Other', 'flexa-formflow' ),
							],
						],
						[
							'id'    => 'details',
							'type'  => 'textarea',
							'label' => __( 'Tell us about your event', 'flexa-formflow' ),
						],
					],
					'settings' => [
						'submit_label'    => __( 'Request a quote', 'flexa-formflow' ),
						'success_message' => __( 'Thanks! We have your inquiry and will reply with a quote shortly.', 'flexa-formflow' ),
					],
				],
			]
		);
	}

	private static function confirmation_email(): PackContent {
		return PackContent::make(
			[
				'ref'     => 'confirmation',
				'name'    => __( 'Catering inquiry received', 'flexa-formflow' ),
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
							'props' => [ 'text' => __( 'Thanks for your catering inquiry', 'flexa-formflow' ) ],
						],
						[
							'id'    => 'el_body',
							'type'  => 'text',
							'props' => [ 'html' => __( 'We received the details below and will get back to you with a tailored quote. If anything changes, just reply to this email.', 'flexa-formflow' ) ],
						],
						[
							'id'    => 'el_table',
							'type'  => 'fields_table',
							'props' => [ 'title' => __( 'Your inquiry', 'flexa-formflow' ) ],
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

	private static function follow_up_workflow(): PackContent {
		return PackContent::make(
			[
				'ref'     => 'follow-up',
				'name'    => __( 'Catering inquiry follow-up', 'flexa-formflow' ),
				'kind'    => 'workflow',
				'payload' => [
					'trigger' => [
						'type'     => 'form_submitted',
						'form_ref' => 'inquiry',
					],
					'actions' => [
						[
							'type'   => 'send_email',
							'config' => [
								'to_mode'      => 'field',
								'to'           => 'email',
								'subject'      => __( 'We received your catering inquiry', 'flexa-formflow' ),
								'template_ref' => 'confirmation',
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

	private static function customer_info_pattern(): PackContent {
		return PackContent::make(
			[
				'ref'     => 'pat-customer-info',
				'name'    => __( 'Customer information', 'flexa-formflow' ),
				'kind'    => 'form',
				'payload' => [
					'fields' => [
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
							'id'    => 'phone',
							'type'  => 'text',
							'label' => __( 'Phone', 'flexa-formflow' ),
							'width' => 'half',
						],
						[
							'id'    => 'company',
							'type'  => 'text',
							'label' => __( 'Company', 'flexa-formflow' ),
							'width' => 'half',
						],
					],
				],
			]
		);
	}
}
