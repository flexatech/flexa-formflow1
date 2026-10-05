<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Database;

defined( 'ABSPATH' ) || exit;

/**
 * Owns the custom tables. `migrate()` runs on activation; `maybe_upgrade()`
 * runs on admin_init and re-migrates when DB_VERSION moves, so updates never
 * need a manual re-activation.
 */
final class Schema {
	public const DB_VERSION  = 6;
	public const VERSION_KEY = 'flexa_formflow_db_version';

	public static function forms_table(): string {
		global $wpdb;
		return $wpdb->prefix . 'flexa_formflow_forms';
	}

	public static function entries_table(): string {
		global $wpdb;
		return $wpdb->prefix . 'flexa_formflow_entries';
	}

	public static function email_templates_table(): string {
		global $wpdb;
		return $wpdb->prefix . 'flexa_formflow_email_templates';
	}

	public static function workflows_table(): string {
		global $wpdb;
		return $wpdb->prefix . 'flexa_formflow_workflows';
	}

	public static function library_table(): string {
		global $wpdb;
		return $wpdb->prefix . 'flexa_formflow_library';
	}

	public static function workflow_runs_table(): string {
		global $wpdb;
		return $wpdb->prefix . 'flexa_formflow_workflow_runs';
	}

	public static function maybe_upgrade(): void {
		if ( (int) get_option( self::VERSION_KEY, 0 ) < self::DB_VERSION || ! self::tables_present() ) {
			self::migrate();
		}
	}

	/**
	 * Guards against a stuck upgrade: if the version option says we are current
	 * but the newest table never got created (an interrupted or in-place update),
	 * `maybe_upgrade()` re-migrates instead of trusting the version alone.
	 */
	private static function tables_present(): bool {
		global $wpdb;

		$table = self::workflow_runs_table();
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, PluginCheck.Security.DirectDB.UnescapedDBParameter -- schema probe on our own table name; value is escaped with esc_like + prepare.
		$found = $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $wpdb->esc_like( $table ) ) );

		return null !== $found;
	}

	public static function migrate(): void {
		global $wpdb;

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		$charset_collate = $wpdb->get_charset_collate();
		$forms           = self::forms_table();
		$entries         = self::entries_table();
		$email_templates = self::email_templates_table();
		$workflows       = self::workflows_table();
		$library         = self::library_table();
		$workflow_runs   = self::workflow_runs_table();

		dbDelta(
			"CREATE TABLE {$forms} (
				id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
				uuid CHAR(36) NOT NULL,
				title VARCHAR(190) NOT NULL DEFAULT '',
				status VARCHAR(20) NOT NULL DEFAULT 'draft',
				config LONGTEXT NOT NULL,
				created_at DATETIME NOT NULL,
				updated_at DATETIME NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				KEY status (status)
			) {$charset_collate};"
		);

		dbDelta(
			"CREATE TABLE {$entries} (
				id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
				form_id BIGINT UNSIGNED NOT NULL,
				status VARCHAR(20) NOT NULL DEFAULT 'unread',
				data LONGTEXT NOT NULL,
				meta LONGTEXT NOT NULL,
				created_at DATETIME NOT NULL,
				PRIMARY KEY  (id),
				KEY form_status (form_id, status),
				KEY created_at (created_at)
			) {$charset_collate};"
		);

		dbDelta(
			"CREATE TABLE {$email_templates} (
				id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
				title VARCHAR(190) NOT NULL DEFAULT '',
				tree LONGTEXT NOT NULL,
				created_at DATETIME NOT NULL,
				updated_at DATETIME NOT NULL,
				PRIMARY KEY  (id)
			) {$charset_collate};"
		);

		dbDelta(
			"CREATE TABLE {$workflows} (
				id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
				title VARCHAR(190) NOT NULL DEFAULT '',
				status VARCHAR(20) NOT NULL DEFAULT 'inactive',
				config LONGTEXT NOT NULL,
				created_at DATETIME NOT NULL,
				updated_at DATETIME NOT NULL,
				PRIMARY KEY  (id),
				KEY status (status)
			) {$charset_collate};"
		);

		// My Library: user-saved reusable assets (patterns, templates, recipes).
		// The source_* columns carry pack provenance so a Pack update can tell
		// which saved items came from it; source_hash is the payload hash at
		// install time, so the diff can tell an untouched copy from a modified one.
		dbDelta(
			"CREATE TABLE {$library} (
				id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
				uuid CHAR(36) NOT NULL,
				type VARCHAR(20) NOT NULL DEFAULT 'pattern',
				name VARCHAR(190) NOT NULL DEFAULT '',
				kind VARCHAR(20) NOT NULL DEFAULT 'form',
				payload LONGTEXT NOT NULL,
				source_pack VARCHAR(100) NOT NULL DEFAULT '',
				source_content_id VARCHAR(100) NOT NULL DEFAULT '',
				source_version VARCHAR(20) NOT NULL DEFAULT '',
				source_hash VARCHAR(64) NOT NULL DEFAULT '',
				created_at DATETIME NOT NULL,
				updated_at DATETIME NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY uuid (uuid),
				KEY type_kind (type, kind)
			) {$charset_collate};"
		);

		// Workflow run history: one row per fired workflow, holding the same
		// per-step log the engine returns to the test runner. Powers the Logs
		// tab; the engine prunes to the newest rows per workflow so it never
		// grows without bound.
		dbDelta(
			"CREATE TABLE {$workflow_runs} (
				id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
				workflow_id BIGINT UNSIGNED NOT NULL,
				entry_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
				form_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
				status VARCHAR(20) NOT NULL DEFAULT 'ok',
				log LONGTEXT NOT NULL,
				created_at DATETIME NOT NULL,
				PRIMARY KEY  (id),
				KEY workflow_created (workflow_id, created_at)
			) {$charset_collate};"
		);

		update_option( self::VERSION_KEY, self::DB_VERSION );
	}

	public static function drop(): void {
		global $wpdb;

		// phpcs:disable WordPress.DB.DirectDatabaseQuery, WordPress.DB.DirectDatabaseQuery.SchemaChange -- destructive teardown of our own tables.
		$wpdb->query( $wpdb->prepare( 'DROP TABLE IF EXISTS %i', self::workflow_runs_table() ) );
		$wpdb->query( $wpdb->prepare( 'DROP TABLE IF EXISTS %i', self::library_table() ) );
		$wpdb->query( $wpdb->prepare( 'DROP TABLE IF EXISTS %i', self::workflows_table() ) );
		$wpdb->query( $wpdb->prepare( 'DROP TABLE IF EXISTS %i', self::email_templates_table() ) );
		$wpdb->query( $wpdb->prepare( 'DROP TABLE IF EXISTS %i', self::entries_table() ) );
		$wpdb->query( $wpdb->prepare( 'DROP TABLE IF EXISTS %i', self::forms_table() ) );
		// phpcs:enable

		delete_option( self::VERSION_KEY );
	}
}
