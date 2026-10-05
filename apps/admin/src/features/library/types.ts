/**
 * Library object model (PRODUCT_DESIGN.md section B). Patterns compose into
 * Templates and Recipes, which are curated into Packs. All four are the same
 * shape to keep the mental model and the code surface small; a Pack adds a
 * contents summary.
 */

export type AssetType = "template" | "pattern" | "recipe" | "pack";

/** Which builder an asset targets. Drives the "For:" facet. */
export type AssetKind = "form" | "email" | "workflow" | "woocommerce";

/** How a user gets the asset. Everything in the catalog is free to install. */
export type Ownership = "free";

export interface LibraryAsset {
    id: string;
    type: AssetType;
    name: string;
    description: string;
    category: string;
    kind: AssetKind;
    ownership: Ownership;
    /** True once installed / saved into this site's My Library. */
    installed?: boolean;
    /** True when an installed pack has a newer version available. */
    updateAvailable?: boolean;
}

/** A Pack is a LibraryAsset (type "pack") plus a contents breakdown. */
export interface Pack extends LibraryAsset {
    type: "pack";
    contents: {
        forms: number;
        emails: number;
        workflows: number;
        patterns: number;
    };
    version: string;
    /** Requirement line, e.g. "FormFlow 1.x". */
    compatibility: string;
}

/** One named item in a pack, for the detail / import review list. */
export interface PackItem {
    ref: string;
    name: string;
}

/** One changelog entry, newest first, shown on the update screen. */
export interface PackChangelogEntry {
    version: string;
    notes: string[];
}

/** A Pack plus its named content lists and changelog. */
export interface PackDetail extends Pack {
    items: {
        forms: PackItem[];
        emails: PackItem[];
        workflows: PackItem[];
        patterns: PackItem[];
    };
    changelog: PackChangelogEntry[];
}

/** How the user wants to resolve one item in a pack update. */
export type UpdateAction = "take_update" | "keep_mine" | "keep_both";

/** One item's place in a pack update diff. */
export interface PackDiffItem {
    ref: string;
    name: string;
    kind: AssetKind;
    /** new | update | conflict | unchanged | removed. */
    status: string;
    /** The protective default action. */
    action: UpdateAction;
    modified: boolean;
}

/** The full diff between an installed pack and its newest version. */
export interface PackDiff {
    pack: string;
    name: string;
    fromVersion: string;
    toVersion: string;
    changelog: PackChangelogEntry[];
    summary: { new: number; update: number; conflict: number; unchanged: number; removed: number };
    items: PackDiffItem[];
}

/** What an update applied. */
export interface UpdateSummary {
    pack: string;
    applied: { updated: number; kept: number; added: number; unchanged: number };
}

/** What an import created. */
export interface ImportSummary {
    pack: string;
    created: { forms: number; emails: number; workflows: number; patterns: number };
}

/** Which content group an installed pack item belongs to. */
export type PackGroup = "forms" | "emails" | "workflows" | "patterns";

/** One installed pack item and whether it is still on the site. */
export interface PackStatusItem {
    ref: string;
    name: string;
    group: PackGroup;
    present: boolean;
    /** Patterns only: true when uninstalling would delete this one too, because
     *  no other currently-installed pack still declares it. */
    willBeDeleted: boolean;
}

/** What an installed pack still has, and what the user has deleted. */
export interface PackStatus {
    pack: string;
    name: string;
    summary: { present: number; missing: number };
    items: PackStatusItem[];
}

/** What a restore put back. `repointed` counts the rows rewired to the new ids. */
export interface RestoreSummary {
    pack: string;
    restored: { forms: number; emails: number; workflows: number; patterns: number };
    repointed: number;
}

/**
 * What an uninstall removed. `patterns` counts only the ones with no other
 * currently-installed pack still declaring them (see Uninstaller).
 */
export interface UninstallSummary {
    pack: string;
    deleted: { forms: number; emails: number; workflows: number; patterns: number };
}

/** The raw My Library row as stored and returned by the server. */
export interface SavedAsset {
    id: number;
    uuid: string;
    type: AssetType;
    name: string;
    kind: AssetKind;
    payload: Record<string, unknown>;
    source: { pack: string; contentId: string; version: string };
    created_at: string;
    updated_at: string;
}

export type LibraryTab = "catalog" | "mine";
export type TypeFacet = "all" | AssetType;
export type OwnershipFacet = "all" | "installed";
