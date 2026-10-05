<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Packs;

use Flexa\FormFlow\Domain\Packs\PackContent;
use Flexa\FormFlow\Domain\Packs\PackManifest;

defined( 'ABSPATH' ) || exit;

/**
 * A marketing lead-capture pipeline. Like Catering, every workflow uses only
 * Free capabilities (send email, set status), so the whole pack installs on
 * Free. It ships the shared `pat-customer-info` pattern too, so installing more
 * than one pack links that pattern rather than duplicating it.
 */
final class LeadCapturePack {
	public const ID = 'pack-lead-capture';

	public static function manifest(): PackManifest {
		return new PackManifest(
			id: self::ID,
			name: __( 'Lead Capture Pack', 'flexa-formflow' ),
			description: __( 'Turn visitors into leads: a short lead form, an instant thank-you email, and a workflow that files each lead for follow-up.', 'flexa-formflow' ),
			category: __( 'Marketing', 'flexa-formflow' ),
			version: '1.0.0',
			compatibility: 'FormFlow 1.x',
			forms: [ self::lead_form() ],
			emails: [ self::thank_you_email() ],
			workflows: [ self::intake_workflow() ],
			patterns: [ self::customer_info_pattern(), self::consent_pattern() ],
			changelog: [
				[
					'version' => '1.0.0',
					'notes'   => [ __( 'First release: lead form, thank-you email, intake workflow.', 'flexa-formflow' ) ],
				],
			],
		);
	}

	private static function lead_form(): PackContent {
		return PackContent::make(
			[
				'ref'     => 'lead',
				'name'    => __( 'Get in touch', 'flexa-formflow' ),
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
							'label'    => __( 'Work email', 'flexa-formflow' ),
							'required' => true,
							'width'    => 'half',
						],
						[
							'id'    => 'company',
							'type'  => 'text',
							'label' => __( 'Company', 'flexa-formflow' ),
							'width' => 'half',
						],
						[
							'id'       => 'interest',
							'type'     => 'select',
							'label'    => __( 'What can we help with?', 'flexa-formflow' ),
							'required' => true,
							'width'    => 'half',
							'options'  => [
								__( 'A quote', 'flexa-formflow' ),
								__( 'A demo', 'flexa-formflow' ),
								__( 'A partnership', 'flexa-formflow' ),
								__( 'Something else', 'flexa-formflow' ),
							],
						],
						[
							'id'    => 'message',
							'type'  => 'textarea',
							'label' => __( 'How can we help?', 'flexa-formflow' ),
						],
						[
							'id'      => 'consent',
							'type'    => 'checkbox',
							'label'   => __( 'Keep me posted with occasional updates', 'flexa-formflow' ),
							'options' => [ __( 'Yes, that is fine', 'flexa-formflow' ) ],
						],
					],
					'settings' => [
						'submit_label'    => __( 'Send message', 'flexa-formflow' ),
						'success_message' => __( 'Thanks! We have your message and will be in touch shortly.', 'flexa-formflow' ),
					],
				],
			]
		);
	}

	private static function thank_you_email(): PackContent {
		return PackContent::make(
			[
				'ref'     => 'thank-you',
				'name'    => __( 'Thanks for reaching out', 'flexa-formflow' ),
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
							'props' => [ 'text' => __( 'Thanks, we got your message', 'flexa-formflow' ) ],
						],
						[
							'id'    => 'el_body',
							'type'  => 'text',
							'props' => [ 'html' => __( 'A member of our team will read this and reply personally, usually within one business day. Here is a copy of what you sent us.', 'flexa-formflow' ) ],
						],
						[
							'id'    => 'el_table',
							'type'  => 'fields_table',
							'props' => [ 'title' => __( 'Your message', 'flexa-formflow' ) ],
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

	private static function intake_workflow(): PackContent {
		return PackContent::make(
			[
				'ref'     => 'lead-intake',
				'name'    => __( 'Lead intake', 'flexa-formflow' ),
				'kind'    => 'workflow',
				'payload' => [
					'trigger' => [
						'type'     => 'form_submitted',
						'form_ref' => 'lead',
					],
					'actions' => [
						[
							'type'   => 'send_email',
							'config' => [
								'to_mode'      => 'field',
								'to'           => 'email',
								'subject'      => __( 'Thanks for reaching out', 'flexa-formflow' ),
								'template_ref' => 'thank-you',
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

	private static function consent_pattern(): PackContent {
		return PackContent::make(
			[
				'ref'     => 'pat-marketing-consent',
				'name'    => __( 'Marketing consent', 'flexa-formflow' ),
				'kind'    => 'form',
				'payload' => [
					'fields' => [
						[
							'id'      => 'consent',
							'type'    => 'checkbox',
							'label'   => __( 'Keep me posted with occasional updates', 'flexa-formflow' ),
							'options' => [ __( 'Yes, that is fine', 'flexa-formflow' ) ],
						],
					],
				],
			]
		);
	}
}
