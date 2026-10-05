<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Packs;

use Flexa\FormFlow\Concerns\HasInstance;
use Flexa\FormFlow\Domain\EmailTemplates\EmailTemplateRepository;
use Flexa\FormFlow\Domain\Forms\FormRepository;
use Flexa\FormFlow\Domain\Library\LibraryRepository;
use Flexa\FormFlow\Domain\Packs\PackManifest;
use Flexa\FormFlow\Domain\Workflows\WorkflowRepository;

defined( 'ABSPATH' ) || exit;

/**
 * Materializes a pack into the real tables. Forms and emails are created first
 * so their new ids are known; the workflow's `form_ref` / `template_ref` are
 * then resolved to those ids before it is created. Workflows arrive inactive
 * (the repository forces it), so nothing runs until the user reviews and turns
 * it on. Shared patterns are deduped by content id and stamped with provenance.
 */
final class Installer {
	use HasInstance;

	/**
	 * @return array{
	 *     pack: string,
	 *     created: array{forms: int, emails: int, workflows: int, patterns: int}
	 * }
	 */
	public function import( PackManifest $manifest ): array {
		$created = [
			'forms'     => 0,
			'emails'    => 0,
			'workflows' => 0,
			'patterns'  => 0,
		];

		/** @var array<string, int> $form_ids */
		$form_ids = [];
		/** @var array<string, int> $email_ids */
		$email_ids = [];
		/** @var array<string, int> $workflow_ids */
		$workflow_ids = [];

		foreach ( $manifest->forms as $content ) {
			$form_ids[ $content->ref ] = FormRepository::instance()->create( $content->name, $content->payload );
			++$created['forms'];
		}

		foreach ( $manifest->emails as $content ) {
			$email_ids[ $content->ref ] = EmailTemplateRepository::instance()->create( $content->name, $content->payload );
			++$created['emails'];
		}

		foreach ( $manifest->workflows as $content ) {
			$config                        = WorkflowRefs::resolve( $content->payload, $form_ids, $email_ids );
			$workflow_ids[ $content->ref ] = WorkflowRepository::instance()->create( $content->name, $config );
			++$created['workflows'];
		}

		foreach ( $manifest->patterns as $content ) {
			// A shared pattern keeps its content id across packs: install it once.
			if ( null !== LibraryRepository::instance()->find_by_content_id( $content->ref ) ) {
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
			++$created['patterns'];
		}

		// Remember what this install created, so a later delete reads as
		// "missing" rather than "never installed" (see Restorer).
		InstallState::mark(
			$manifest->id,
			$manifest->version,
			[
				'forms'     => $form_ids,
				'emails'    => $email_ids,
				'workflows' => $workflow_ids,
			]
		);

		return [
			'pack'    => $manifest->id,
			'created' => $created,
		];
	}

	/**
	 * Compare a pack's patterns against the copies already in My Library and
	 * classify each so the update screen can protect the user's edits. Only
	 * patterns carry provenance, so only patterns are diffed; the forms, emails
	 * and workflows a pack created are the user's own copies and are left alone.
	 *
	 * Statuses: `new` (not installed yet), `unchanged` (already matches the new
	 * version), `update` (the pack changed it and the user has not), `conflict`
	 * (both the pack and the user changed it), `removed` (the user has a copy the
	 * new version no longer ships).
	 *
	 * @return array{
	 *     pack: string,
	 *     name: string,
	 *     fromVersion: string,
	 *     toVersion: string,
	 *     changelog: list<array{version: string, notes: list<string>}>,
	 *     summary: array{new: int, update: int, conflict: int, unchanged: int, removed: int},
	 *     items: list<array{ref: string, name: string, kind: string, status: string, action: string, modified: bool}>
	 * }
	 */
	public function diff( PackManifest $manifest ): array {
		$repo    = LibraryRepository::instance();
		$items   = [];
		$summary = [
			'new'       => 0,
			'update'    => 0,
			'conflict'  => 0,
			'unchanged' => 0,
			'removed'   => 0,
		];

		$known_refs = [];
		foreach ( $manifest->patterns as $content ) {
			$known_refs[ $content->ref ] = true;
			$asset                       = $repo->find_by_content_id( $content->ref );
			$target_hash                 = LibraryRepository::hash( $content->payload );

			if ( null === $asset ) {
				$status = 'new';
				$action = 'take_update';
			} else {
				$current_hash = LibraryRepository::hash( $asset->payload );
				if ( $current_hash === $target_hash ) {
					$status = 'unchanged';
					$action = 'keep_mine';
				} else {
					$modified = '' !== $asset->source_hash && $current_hash !== $asset->source_hash;
					$status   = $modified ? 'conflict' : 'update';
					$action   = $modified ? 'keep_mine' : 'take_update';
				}
			}

			++$summary[ $status ];
			$items[] = [
				'ref'      => $content->ref,
				'name'     => $content->name,
				'kind'     => $content->kind,
				'status'   => $status,
				'action'   => $action,
				'modified' => 'conflict' === $status,
			];
		}

		// A pattern the user has from this pack that the new version dropped.
		foreach ( $repo->all_by_source_pack( $manifest->id ) as $asset ) {
			if ( '' === $asset->source_content_id || isset( $known_refs[ $asset->source_content_id ] ) ) {
				continue;
			}
			++$summary['removed'];
			$items[] = [
				'ref'      => $asset->source_content_id,
				'name'     => $asset->name,
				'kind'     => $asset->kind,
				'status'   => 'removed',
				'action'   => 'keep_mine',
				'modified' => false,
			];
		}

		return [
			'pack'        => $manifest->id,
			'name'        => $manifest->name,
			'fromVersion' => InstallState::version_of( $manifest->id ),
			'toVersion'   => $manifest->version,
			'changelog'   => $manifest->changelog,
			'summary'     => $summary,
			'items'       => $items,
		];
	}

	/**
	 * Apply an update. Each pattern is resolved to an action (the caller's choice
	 * or the protective default from {@see diff()}): `take_update` overwrites the
	 * saved copy with the new version, `keep_mine` keeps the user's copy but
	 * re-baselines it so it stops reading as out of date, and `keep_both` keeps
	 * the user's copy and drops a fresh copy of the new version beside it. The
	 * user's forms / emails / workflows are never touched. Finishes by stamping
	 * the newly-installed version.
	 *
	 * @param array<string, string> $decisions Content ref to action.
	 * @return array{pack: string, applied: array{updated: int, kept: int, added: int, unchanged: int}}
	 */
	public function update( PackManifest $manifest, array $decisions = [] ): array {
		$repo    = LibraryRepository::instance();
		$applied = [
			'updated'   => 0,
			'kept'      => 0,
			'added'     => 0,
			'unchanged' => 0,
		];

		foreach ( $manifest->patterns as $content ) {
			$asset       = $repo->find_by_content_id( $content->ref );
			$target_hash = LibraryRepository::hash( $content->payload );

			if ( null === $asset ) {
				// Newly-shipped pattern: keep_mine means the user opted out.
				if ( 'keep_mine' === ( $decisions[ $content->ref ] ?? 'take_update' ) ) {
					continue;
				}
				$repo->create(
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
				++$applied['added'];
				continue;
			}

			$current_hash = LibraryRepository::hash( $asset->payload );
			if ( $current_hash === $target_hash ) {
				// Already matches; just make sure the stamp is current.
				$repo->update(
					$asset->id,
					[
						'source_version' => $manifest->version,
						'source_hash'    => $target_hash,
					]
				);
				++$applied['unchanged'];
				continue;
			}

			$modified = '' !== $asset->source_hash && $current_hash !== $asset->source_hash;
			$action   = $decisions[ $content->ref ] ?? ( $modified ? 'keep_mine' : 'take_update' );

			if ( 'take_update' === $action ) {
				$repo->update(
					$asset->id,
					[
						'name'           => $content->name,
						'payload'        => $content->payload,
						'source_version' => $manifest->version,
						'source_hash'    => $target_hash,
					]
				);
				++$applied['updated'];
				continue;
			}

			if ( 'keep_both' === $action ) {
				// Fresh, untracked copy of the new version for the user to compare.
				$repo->create(
					'pattern',
					$content->name . ' ' . __( '(updated)', 'flexa-formflow' ),
					$content->kind,
					$content->payload,
					[ 'pack' => $manifest->id ]
				);
				++$applied['added'];
			}

			// keep_mine (and the kept side of keep_both): re-baseline so the user's
			// copy stops nagging, keyed to their current payload.
			$repo->update(
				$asset->id,
				[
					'source_version' => $manifest->version,
					'source_hash'    => $current_hash,
				]
			);
			++$applied['kept'];
		}

		InstallState::mark( $manifest->id, $manifest->version );

		return [
			'pack'    => $manifest->id,
			'applied' => $applied,
		];
	}

}
