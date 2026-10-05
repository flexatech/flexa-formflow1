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
 * Removes exactly what a pack's install (or a later restore) is recorded to
 * have created, then clears the install stamp so the catalog offers
 * "Install pack" again instead of showing a permanently stuck "Installed"
 * badge over content that no longer fully exists.
 *
 * Only the ids {@see InstallState} recorded are touched - never a name match
 * or "anything that looks related" - so an uninstall can never reach past
 * what this exact install created. A row already missing (the same situation
 * {@see Restorer} exists to fix) is simply skipped, not an error.
 *
 * A pattern this pack ships is deleted too, but only when no *other*
 * currently-installed pack still declares the same content id ({@see
 * still_needed_elsewhere()}) - patterns are shared by content id across every
 * pack that ships them, so dropping one on the say-so of a single pack could
 * pull it out from under a sibling pack that is still installed. A pattern
 * the user has since edited is still removed: once shared, a pattern behaves
 * like the rest of a pack's content (the user's own copy), not a protected
 * asset - use the "Remove" action on its My Library card beforehand to keep
 * an edited copy that would otherwise go.
 */
final class Uninstaller {
	use HasInstance;

	/**
	 * @return array{pack: string, deleted: array{forms: int, emails: int, workflows: int, patterns: int}}
	 */
	public function uninstall( PackManifest $manifest ): array {
		$ids     = InstallState::items_of( $manifest->id );
		$deleted = [
			'forms'     => 0,
			'emails'    => 0,
			'workflows' => 0,
			'patterns'  => 0,
		];

		foreach ( $ids['forms'] ?? [] as $id ) {
			if ( null !== FormRepository::instance()->find( $id ) ) {
				FormRepository::instance()->delete( $id );
				++$deleted['forms'];
			}
		}

		foreach ( $ids['emails'] ?? [] as $id ) {
			if ( null !== EmailTemplateRepository::instance()->find( $id ) ) {
				EmailTemplateRepository::instance()->delete( $id );
				++$deleted['emails'];
			}
		}

		foreach ( $ids['workflows'] ?? [] as $id ) {
			if ( null !== WorkflowRepository::instance()->find( $id ) ) {
				WorkflowRepository::instance()->delete( $id );
				++$deleted['workflows'];
			}
		}

		foreach ( $manifest->patterns as $content ) {
			if ( self::still_needed_elsewhere( $content->ref, $manifest->id ) ) {
				continue;
			}
			$asset = LibraryRepository::instance()->find_by_content_id( $content->ref );
			if ( null !== $asset ) {
				LibraryRepository::instance()->delete( $asset->id );
				++$deleted['patterns'];
			}
		}

		InstallState::forget( $manifest->id );

		return [
			'pack'    => $manifest->id,
			'deleted' => $deleted,
		];
	}

	/**
	 * Whether a pattern content id is still declared by some other pack that
	 * is currently installed - checked against the full registry, not just
	 * the pack being uninstalled, since a pattern's `source_content_id` only
	 * remembers the one pack that happened to create it first (see
	 * Installer::import()), which is not necessarily every pack that ships it.
	 */
	public static function still_needed_elsewhere( string $content_ref, string $excluding_pack_id ): bool {
		foreach ( Registry::all() as $pack ) {
			if ( $pack->id === $excluding_pack_id || ! InstallState::is_installed( $pack->id ) ) {
				continue;
			}
			foreach ( $pack->patterns as $content ) {
				if ( $content->ref === $content_ref ) {
					return true;
				}
			}
		}

		return false;
	}
}
