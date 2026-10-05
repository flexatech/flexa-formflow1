import { useMemo, useState, type ReactNode } from "react";
import { Bookmark, Search, Trash2, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AssetCard } from "@/components/custom/AssetCard";
import { PackCard } from "@/components/custom/PackCard";
import { EmptyState } from "@/components/custom/EmptyState";
import { __ } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { navigate } from "@/lib/router";
import { useUiStore } from "@/lib/store";
import { useCatalog, useDeleteLibraryAsset, useMyLibrary, useReuseAsset } from "./useLibrary";
import { LibraryPreviewDialog } from "./LibraryPreviewDialog";
import type { LibraryAsset, LibraryTab, OwnershipFacet, Pack, SavedAsset, TypeFacet } from "./types";

const TYPE_FACETS: { value: TypeFacet; label: () => string }[] = [
    { value: "all", label: () => __("All") },
    { value: "template", label: () => __("Templates") },
    { value: "pattern", label: () => __("Patterns") },
    { value: "recipe", label: () => __("Workflows") },
    { value: "pack", label: () => __("Packs") },
];

const OWNERSHIP_FACETS: { value: OwnershipFacet; label: () => string }[] = [
    { value: "all", label: () => __("All") },
    { value: "installed", label: () => __("Installed") },
];

function matchesOwnership(asset: LibraryAsset, facet: OwnershipFacet): boolean {
    switch (facet) {
        case "all":
            return true;
        case "installed":
            return Boolean(asset.installed);
        default:
            return true;
    }
}

export function LibraryPage() {
    const [tab, setTab] = useState<LibraryTab>("catalog");
    const [typeFacet, setTypeFacet] = useState<TypeFacet>("all");
    const [ownershipFacet, setOwnershipFacet] = useState<OwnershipFacet>("all");
    const [search, setSearch] = useState("");

    const { data: catalog } = useCatalog();
    const { data: mineRows } = useMyLibrary();
    const removeAsset = useDeleteLibraryAsset();
    const reuseAsset = useReuseAsset();
    const showToast = useUiStore((s) => s.showToast);
    const [preview, setPreview] = useState<SavedAsset | null>(null);

    const rawById = useMemo(
        () => new Map((mineRows ?? []).map((r) => [r.display.id, r.raw])),
        [mineRows],
    );
    const source: LibraryAsset[] =
        tab === "catalog" ? catalog ?? [] : (mineRows ?? []).map((r) => r.display);

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        return source.filter((a) => {
            if (typeFacet !== "all" && a.type !== typeFacet) {
                return false;
            }
            if (tab === "catalog" && !matchesOwnership(a, ownershipFacet)) {
                return false;
            }
            if (term && !`${a.name} ${a.description} ${a.category}`.toLowerCase().includes(term)) {
                return false;
            }
            return true;
        });
    }, [source, tab, typeFacet, ownershipFacet, search]);

    const onDelete = (asset: LibraryAsset) => {
        const raw = rawById.get(asset.id);
        if (!raw) {
            return;
        }
        removeAsset.mutate(raw.id, {
            onSuccess: () => showToast(__("Removed from your library")),
        });
    };

    const openPreview = (asset: LibraryAsset) => {
        const raw = rawById.get(asset.id);
        if (raw) {
            setPreview(raw);
        }
    };

    const onUse = (raw: SavedAsset) => {
        reuseAsset.mutate(raw, {
            onSuccess: ({ route }) => {
                setPreview(null);
                showToast(__("Opened a copy in the builder"));
                navigate(route);
            },
            onError: () => showToast(__("Could not open a copy. Please try again."), "error"),
        });
    };

    return (
        <div className="ff:flex ff:flex-col ff:gap-6 ff:p-6">
            <div className="ff:flex ff:flex-col ff:gap-1">
                <h1 className="ff:text-2xl ff:font-semibold ff:text-slate-900">{__("Library")}</h1>
                <p className="ff:m-0 ff:text-sm ff:text-slate-500">
                    {__("Ready-made forms, emails, workflows and industry packs.")}
                </p>
            </div>

            <div className="ff:flex ff:items-center ff:gap-1 ff:border-b ff:border-slate-200">
                <TabButton active={tab === "catalog"} onClick={() => setTab("catalog")}>
                    {__("Flexa Library")}
                </TabButton>
                <TabButton active={tab === "mine"} onClick={() => setTab("mine")}>
                    {__("My Library")}
                </TabButton>
            </div>

            <div className="ff:flex ff:flex-col ff:gap-3">
                <div className="ff:flex ff:flex-wrap ff:items-center ff:gap-2">
                    {TYPE_FACETS.map((f) => (
                        <FacetPill key={f.value} active={typeFacet === f.value} onClick={() => setTypeFacet(f.value)}>
                            {f.label()}
                        </FacetPill>
                    ))}
                    <span className="ff:relative ff:ml-auto ff:w-56">
                        <Search
                            aria-hidden
                            className="ff:pointer-events-none ff:absolute ff:left-2.5 ff:top-1/2 ff:h-4 ff:w-4 ff:-translate-y-1/2 ff:text-slate-400"
                        />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={__("Search the library")}
                            // Inline left padding: WP-admin's unlayered `input { padding }`
                            // beats the layered `ff:pl-8` utility, so the icon and text
                            // would overlap. An inline style outranks WP's rule.
                            style={{ paddingLeft: "2rem" }}
                        />
                    </span>
                </div>
                {tab === "catalog" && (
                    <div className="ff:flex ff:flex-wrap ff:items-center ff:gap-2">
                        <span className="ff:text-xs ff:font-medium ff:text-slate-400">{__("Show:")}</span>
                        {OWNERSHIP_FACETS.map((f) => (
                            <FacetPill
                                key={f.value}
                                active={ownershipFacet === f.value}
                                onClick={() => setOwnershipFacet(f.value)}
                            >
                                {f.label()}
                            </FacetPill>
                        ))}
                    </div>
                )}
            </div>

            {tab === "mine" && (!mineRows || mineRows.length === 0) ? (
                <EmptyState
                    icon={Bookmark}
                    title={__("Anything you save from a builder lands here.")}
                    description={__("Save a field group, an email section or a workflow as a reusable asset, then insert it anywhere.")}
                />
            ) : filtered.length === 0 ? (
                <EmptyState
                    icon={Search}
                    title={__("Nothing matches those filters.")}
                    description={__("Try a different type, filter or search term.")}
                />
            ) : (
                <div className="ff:grid ff:grid-cols-1 ff:gap-4 ff:md:grid-cols-2 ff:xl:grid-cols-3">
                    {filtered.map((asset) =>
                        asset.type === "pack" ? (
                            <PackCard
                                key={asset.id}
                                pack={asset as Pack}
                                onSelect={(p) => navigate(`/library/pack/${p.id}`)}
                            />
                        ) : (
                            <AssetCard
                                key={asset.id}
                                asset={asset}
                                onSelect={tab === "mine" ? openPreview : undefined}
                                action={
                                    tab === "mine" ? (
                                        <div className="ff:flex ff:items-center ff:gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onDelete(asset)}
                                                disabled={removeAsset.isPending}
                                            >
                                                <Trash2 aria-hidden className="ff:h-4 ff:w-4" />
                                                {__("Remove")}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openPreview(asset)}
                                            >
                                                <Zap aria-hidden className="ff:h-4 ff:w-4" />
                                                {__("Use")}
                                            </Button>
                                        </div>
                                    ) : undefined
                                }
                            />
                        ),
                    )}
                </div>
            )}

            <LibraryPreviewDialog
                asset={preview}
                onClose={() => setPreview(null)}
                onUse={onUse}
                isUsing={reuseAsset.isPending}
            />
        </div>
    );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "ff:-mb-px ff:cursor-pointer ff:border-0 ff:border-b-2 ff:bg-transparent ff:px-3 ff:py-2 ff:text-sm ff:font-medium ff:transition-colors",
                active
                    ? "ff:border-brand-600 ff:text-brand-700"
                    : "ff:border-transparent ff:text-slate-500 ff:hover:text-slate-800",
            )}
        >
            {children}
        </button>
    );
}

function FacetPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "ff:cursor-pointer ff:rounded-full ff:border ff:px-3 ff:py-1 ff:text-xs ff:font-medium ff:transition-colors",
                active
                    ? "ff:border-brand-200 ff:bg-brand-50 ff:text-brand-700"
                    : "ff:border-slate-200 ff:bg-white ff:text-slate-600 ff:hover:bg-slate-50",
            )}
        >
            {children}
        </button>
    );
}
