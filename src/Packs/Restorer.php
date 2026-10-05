<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Packs;

use Flexa\FormFlow\Concerns\HasInstance;
use Flexa\FormFlow\Domain\EmailTemplates\EmailTemplateRepository;
use Flexa\FormFlow\Domain\Forms\FormRepository;
use Flexa\FormFlow\Domain\Library\LibraryRepository;
use Flexa\FormFlow\Domain\Packs\PackContent;
use Flexa\FormFlow\Domain\Packs\PackManifest;
use Flexa\FormFlow\Domain\Workflows\WorkflowRepository;

defined( 'ABSPATH' ) || exit;

/**
 * Puts back what a pack installed and the user has since deleted.
 *
 * An install stamp on its own cannot tell "already installed" from "installed,
 * then deleted", which is why a pack could never be re-installed after losing
 * one of its forms. This reads the ids recorded at install time, reports which
 * items are gone, and recreates only those: anything still on the site is left
 * untouched, so a restore can never duplicate content or discard an edit.
 *
 * Recreated rows get new ids, so surviving pack content that pointed at the old
 * ones is repointed afterwards ({@see repoint()}) and does not silently fall
 * back to "any form" / "default design".
 */
final class Restorer {
	use HasInstance;

	/**
	 * What the pack installed and what is missing right now.
	 *
	 * @return array{
	 *     pack: string,
	 *     name: string,
	 *     summary: array{present: int, missing: int},
	 *     items: list<array{ref: string, name: string, group: string, present: bool}>
	 * }
	 */
	public function status( PackManifest $manifest ): array {
		$ids     = $this->resolved_ids( $manifest );
		$items   = [];
		$summary = [
			'present' => 0,
			'missing' => 0,
		];

		foreach ( $this->groups( $manifest ) as $group => $contents ) {
			foreach ( $contents as $content ) {
				$present = $this->exists( $group, $content, $ids );
				++$summary[ $present ? 'present' : 'missing' ];
				$items[] = [
					'ref'     => $content->ref,
					'name'    => $content->name,
					'group'   => $group,
					'present' => $present,
				];
			}
		}

		return [
			'pack'    => $manifest->id,
			'name'    => $manifest->name,
			'summary' => $summary,
			'items'   => $items,
		];
	}

	/**
	 * Recreate the missing items and rewire whatever pointed at them.
	 *
	 * @return array{
	 *     pack: string,
	 *     restored: array{forms: int, emails: int, workflows: int, patterns: int},
	 *     repointed: int
	 * }
	 */
	public function restore( PackManifest $manifest ): array {
		$ids      = $this->resolved_ids( $manifest );
		$restored = [
			'forms'     => 0,
			'emails'    => 0,
			'workflows' => 0,
			'patterns'  => 0,
		];

		/** @var array<string, array<string, int>> $created Group to ref to new id. */
		$created = [];
		/** @var array<int, int> $remap_forms Old form id to the id that replaced it. */
		$remap_forms = [];
		/** @var array<int, int> $remap_emails Old template id to the id that replaced it. */
		$remap_emails = [];

		foreach ( $manifest->forms as $content ) {
			if ( $this->exists( 'forms', $content, $ids ) ) {
				continue;
			}
			$new_id = FormRepository::instance()->create( $content->name, $content->payload );
			$old_id = $ids['forms'][ $content->ref ] ?? 0;
			if ( $old_id > 0 ) {
				$remap_forms[ $old_id ] = $new_id;
			}
			$created['forms'][ $content->ref ] = $new_id;
			$ids['forms'][ $content->ref ]     = $new_id;
			++$restored['forms'];
		}

		foreach ( $manifest->emails as $content ) {
			if ( $this->exists( 'emails', $content, $ids ) ) {
				continue;
			}
			$new_id = EmailTemplateRepository::instance()->create( $content->name, $content->payload );
			$old_id = $ids['emails'][ $content->ref ] ?? 0;
			if ( $old_id > 0 ) {
				$remap_emails[ $old_id ] = $new_id;
			}
			$created['emails'][ $content->ref ] = $new_id;
			$ids['emails'][ $content->ref ]     = $new_id;
			++$restored['emails'];
		}

		// Runs after forms and emails so a rebuilt workflow points at the ids
		// that exist now, exactly as a fresh import would wire it.
		foreach ( $manifest->workflows as $content ) {
			if ( $this->exists( 'workflows', $content, $ids ) ) {
				continue;
			}
			$config = WorkflowRefs::resolve(
				$content->payload,
				$ids['forms'] ?? [],
				$ids['emails'] ?? []
			);
			$new_id                                = WorkflowRepository::instance()->create( $content->name, $config );
			$created['workflows'][ $content->ref ] = $new_id;
			$ids['workflows'][ $content->ref ]     = $new_id;
			++$restored['workflows'];
		}

		foreach ( $manifest->patterns as $content ) {
			if ( $this->exists( 'patterns', $content, $ids ) ) {
				continue;
			}
			LibraryRepository::instance()->create(
				'pattern',
				$content->name,
				$content->kind,
				$content->payload,
				[
					'pack'      => $manifest->id,
					'contentId' => $content->ref,
					'version'   => $manifest->version,
				]
			);
			++$restored['patterns'];
		}

		InstallState::record_items( $manifest->id, $created );

		return [
			'pack'      => $manifest->id,
			'restored'  => $restored,
			'repointed' => $this->repoint( $manifest, $ids, $remap_forms, $remap_emails ),
		];
	}

	/**
	 * Point surviving pack content back at the rows that replaced the deleted
	 * ones: a workflow's trigger form and its send_email template, and a form's
	 * two notification templates. Only ids that are actually in a remap are
	 * touched, so a reference the user deliberately changed is left alone.
	 *
	 * @param array<string, array<string, int>> $ids
	 * @param array<int, int>                   $remap_forms
	 * @param array<int, int>                   $remap_emails
	 */
	private function repoint( PackManifest $manifest, array $ids, array $remap_forms, array $remap_emails ): int {
		if ( [] === $remap_forms && [] === $remap_emails ) {
			return 0;
		}

		$touched = 0;

		foreach ( $manifest->workflows as $content ) {
			$id       = $ids['workflows'][ $content->ref ] ?? 0;
			$workflow = $id > 0 ? WorkflowRepository::instance()->find( $id ) : null;
			if ( null === $workflow ) {
				continue;
			}
			$config = $this->repoint_workflow( $workflow->config, $remap_forms, $remap_emails );
			if ( $config === $workflow->config ) {
				continue;
			}
			WorkflowRepository::instance()->update( $id, [ 'config' => $config ] );
			++$touched;
		}

		if ( [] === $remap_emails ) {
			return $touched;
		}

		foreach ( $manifest->forms as $content ) {
			$id   = $ids['forms'][ $content->ref ] ?? 0;
			$form = $id > 0 ? FormRepository::instance()->find( $id ) : null;
			if ( null === $form ) {
				continue;
			}
			$config = $this->repoint_form( $form->config, $remap_emails );
			if ( $config === $form->config ) {
				continue;
			}
			FormRepository::instance()->update( $id, [ 'config' => $config ] );
			++$touched;
		}

		return $touched;
	}

	/**
	 * @param array<string, mixed> $config
	 * @param array<int, int>      $remap_forms
	 * @param array<int, int>      $remap_emails
	 * @return array<string, mixed>
	 */
	private function repoint_workflow( array $config, array $remap_forms, array $remap_emails ): array {
		$trigger = is_array( $config['trigger'] ?? null ) ? $config['trigger'] : [];
		$form_id = (int) ( $trigger['form_id'] ?? 0 );
		if ( isset( $remap_forms[ $form_id ] ) ) {
			$trigger['form_id'] = $remap_forms[ $form_id ];
			$config['trigger']  = $trigger;
		}

		$actions = is_array( $config['actions'] ?? null ) ? $config['actions'] : [];
		foreach ( $actions as $index => $action ) {
			if ( ! is_array( $action ) || ! is_array( $action['config'] ?? null ) ) {
				continue;
			}
			$template_id = (int) ( $action['config']['template_id'] ?? 0 );
			if ( ! isset( $remap_emails[ $template_id ] ) ) {
				continue;
			}
			$action['config']['template_id'] = $remap_emails[ $template_id ];
			$actions[ $index ]               = $action;
			$config['actions']               = $actions;
		}

		return $config;
	}

	/**
	 * @param array<string, mixed> $config
	 * @param array<int, int>      $remap_emails
	 * @return array<string, mixed>
	 */
	private function repoint_form( array $config, array $remap_emails ): array {
		$notifications = is_array( $config['notifications'] ?? null ) ? $config['notifications'] : [];

		foreach ( [ 'admin', 'confirmation' ] as $key ) {
			if ( ! is_array( $notifications[ $key ] ?? null ) ) {
				continue;
			}
			$template_id = (int) ( $notifications[ $key ]['template_id'] ?? 0 );
			if ( ! isset( $remap_emails[ $template_id ] ) ) {
				continue;
			}
			$notifications[ $key ]['template_id'] = $remap_emails[ $template_id ];
			$config['notifications']              = $notifications;
		}

		return $config;
	}

	/**
	 * The recorded ref => id map, completed by exact name for packs installed
	 * before ids were recorded (no migration needed). A name matching no row, or
	 * more than one, is left unrecorded: adopting the wrong row would let a
	 * later restore repoint content the pack never created. Any id learned here
	 * is written back, so the guess is made once.
	 *
	 * @return array<string, array<string, int>>
	 */
	private function resolved_ids( PackManifest $manifest ): array {
		$ids    = InstallState::items_of( $manifest->id );
		$learnt = [];
		$groups = $this->groups( $manifest );

		foreach ( [ 'forms', 'emails', 'workflows' ] as $group ) {
			foreach ( $groups[ $group ] as $content ) {
				if ( ( $ids[ $group ][ $content->ref ] ?? 0 ) > 0 ) {
					continue;
				}
				$id = $this->find_by_name( $group, $content->name );
				if ( $id > 0 ) {
					$ids[ $group ][ $content->ref ]    = $id;
					$learnt[ $group ][ $content->ref ] = $id;
				}
			}
		}

		InstallState::record_items( $manifest->id, $learnt );

		return $ids;
	}

	/**
	 * The one row with exactly this title, or 0 when there is none or several.
	 */
	private function find_by_name( string $group, string $name ): int {
		if ( '' === $name ) {
			return 0;
		}

		$matches = [];

		if ( 'forms' === $group ) {
			$page = FormRepository::instance()->all(
				[
					'search'   => $name,
					'per_page' => 100,
				]
			);
			foreach ( $page['items'] as $form ) {
				if ( $form->title === $name ) {
					$matches[] = $form->id;
				}
			}
		} elseif ( 'emails' === $group ) {
			foreach ( EmailTemplateRepository::instance()->all() as $template ) {
				if ( $template->title === $name ) {
					$matches[] = $template->id;
				}
			}
		} else {
			foreach ( WorkflowRepository::instance()->all() as $workflow ) {
				if ( $workflow->title === $name ) {
					$matches[] = $workflow->id;
				}
			}
		}

		return 1 === count( $matches ) ? $matches[0] : 0;
	}

	/**
	 * @param array<string, array<string, int>> $ids
	 */
	private function exists( string $group, PackContent $content, array $ids ): bool {
		if ( 'patterns' === $group ) {
			return null !== LibraryRepository::instance()->find_by_content_id( $content->ref );
		}

		$id = $ids[ $group ][ $content->ref ] ?? 0;

		return $id > 0 && $this->row_exists( $group, $id );
	}

	private function row_exists( string $group, int $id ): bool {
		return match ( $group ) {
			'forms' => null !== FormRepository::instance()->find( $id ),
			'emails' => null !== EmailTemplateRepository::instance()->find( $id ),
			'workflows' => null !== WorkflowRepository::instance()->find( $id ),
			default => false,
		};
	}

	/**
	 * @return array<string, list<PackContent>>
	 */
	private function groups( PackManifest $manifest ): array {
		return [
			'forms'     => $manifest->forms,
			'emails'    => $manifest->emails,
			'workflows' => $manifest->workflows,
			'patterns'  => $manifest->patterns,
		];
	}
}
