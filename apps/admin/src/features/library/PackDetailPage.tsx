import { useState } from "react";
import {
    ArrowLeft,
    ArrowUpCircle,
    Check,
    FileText,
    LayoutGrid,
    Mail,
    Package,
    RotateCcw,
    Trash2,
    Workflow,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/custom/EmptyState";
import { ownershipChip } from "@/components/custom/AssetCard";
import { Skeleton } from "@/components/ui/skeleton";
import { __, sprintf } from "@/lib/i18n";
import { useUiStore } from "@/lib/store";
import { usePackDetail, usePackStatus, useRestorePack, useUninstallPack } from "./useLibrary";
import { ImportPackDialog } from "./ImportPackDialog";
import { UpdatePackDialog } from "./UpdatePackDialog";
import type { PackGroup, PackItem } from "./types";

/**
 * Pack detail (PRODUCT_DESIGN.md section L): header, the named content list,
 * and the Install action that opens the 3-step import. Reads the
 * live pack manifest, so what it lists is exactly what the importer installs.
 */
export function PackDetailPage({ id }: { id: string }) {
    const { data: pack, isLoading } = usePackDetail(id);
    const { data: status } = usePackStatus(id, Boolean(pack?.installed));
    const restore = useRestorePack(id);
    const uninstall = useUninstallPack(id);
    const showToast = useUiStore((s) => s.showToast);
    const [importOpen, setImportOpen] = useState(false);
    const [updateOpen, setUpdateOpen] = useState(false);
    const [uninstallOpen, setUninstallOpen] = useState(false);

    const onRestore = () => {
        restore.mutate(undefined, {
            onSuccess: (summary) => {
                const count = Object.values(summary.restored).reduce((a, b) => a + b, 0);
                showToast(sprintf(__("Put back %d items."), count));
            },
            onError: () => showToast(__("Could not restore this pack."), "error"),
        });
    };

    const onUninstall = () => {
        uninstall.mutate(undefined, {
            onSuccess: () => {
                setUninstallOpen(false);
                showToast(__("Pack uninstalled."));
            },
            onError: () => showToast(__("Could not uninstall this pack."), "error"),
        });
    };

    if (!pack && isLoading) {
        return (
            <div className="ff:flex ff:flex-col ff:gap-6 ff:p-6">
                <Skeleton className="ff:h-4 ff:w-24" />
                <div className="ff:flex ff:items-center ff:gap-4">
                    <Skeleton className="ff:h-12 ff:w-12 ff:rounded-lg" />
                    <div className="ff:flex ff:flex-col ff:gap-2">
                        <Skeleton className="ff:h-6 ff:w-56" />
                        <Skeleton className="ff:h-3 ff:w-72 ff:max-w-full" />
                    </div>
                </div>
                <Skeleton className="ff:h-48 ff:rounded-xl" />
            </div>
        );
    }

    if (!pack) {
        return (
            <div className="ff:p-6">
                <BackLink />
                <EmptyState
                    icon={Package}
                    title={__("Pack not found.")}
                    description={__("This pack is not in the catalog. It may have been removed.")}
                />
            </div>
        );
    }

    const chip = ownershipChip(pack);
    const groups: { key: PackGroup; icon: typeof FileText; label: string; items: PackItem[] }[] = [
        { key: "forms", icon: FileText, label: __("Forms"), items: pack.items.forms },
        { key: "emails", icon: Mail, label: __("Email templates"), items: pack.items.emails },
        { key: "workflows", icon: Workflow, label: __("Workflows"), items: pack.items.workflows },
        { key: "patterns", icon: LayoutGrid, label: __("Patterns"), items: pack.items.patterns },
    ];

    const missingCount = status?.summary.missing ?? 0;
    const missingRefs = new Set(
        (status?.items ?? []).filter((i) => !i.present).map((i) => `${i.group}:${i.ref}`),
    );
    // What an uninstall would actually remove: every present form/email/workflow,
    // plus a present pattern only when this is the last installed pack still
    // declaring it (server-computed `willBeDeleted`, mirrors Uninstaller exactly).
    const toDelete = (status?.items ?? []).filter(
        (i) => i.present && (i.group !== "patterns" || i.willBeDeleted),
    );
    // A present pattern kept out of toDelete because another installed pack
    // still shares it - worth a line in the dialog so "why isn't X listed" is
    // never a surprise.
    const keptPatterns = (status?.items ?? []).filter(
        (i) => i.group === "patterns" && i.present && !i.willBeDeleted,
    );

    return (
        <div className="ff:flex ff:flex-col ff:gap-6 ff:p-6">
            <BackLink />

            <div className="ff:flex ff:flex-col ff:gap-4 ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:p-6 ff:md:flex-row ff:md:items-start ff:md:justify-between">
                <div className="ff:flex ff:max-w-xl ff:flex-col ff:gap-2">
                    <span className="ff:text-xs ff:uppercase ff:tracking-wide ff:text-slate-400">{pack.category}</span>
                    <h1 className="ff:text-2xl ff:font-semibold ff:text-slate-900">{pack.name}</h1>
                    <p className="ff:m-0 ff:text-sm ff:leading-relaxed ff:text-slate-600">{pack.description}</p>
                    <div className="ff:mt-1 ff:flex ff:items-center ff:gap-2">
                        <Badge variant={chip.variant}>{chip.label}</Badge>
                    </div>
                </div>
                <div className="ff:flex ff:shrink-0 ff:flex-col ff:items-start ff:gap-2 ff:md:items-end">
                    {pack.installed ? (
                        <Badge variant="installed">{__("Installed")}</Badge>
                    ) : (
                        <Button onClick={() => setImportOpen(true)}>{__("Install pack")}</Button>
                    )}
                    {pack.installed && pack.updateAvailable && (
                        <Button variant="outline" size="sm" onClick={() => setUpdateOpen(true)}>
                            <ArrowUpCircle aria-hidden className="ff:h-4 ff:w-4" />
                            {__("Update available")}
                        </Button>
                    )}
                    {pack.installed && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="ff:text-red-600 ff:hover:bg-red-50"
                            onClick={() => setUninstallOpen(true)}
                        >
                            <Trash2 aria-hidden className="ff:h-4 ff:w-4" />
                            {__("Uninstall pack")}
                        </Button>
                    )}
                </div>
            </div>

            {missingCount > 0 && (
                <div className="ff:flex ff:flex-col ff:gap-3 ff:rounded-xl ff:border ff:border-amber-200 ff:bg-amber-50 ff:p-5 ff:md:flex-row ff:md:items-center ff:md:justify-between">
                    <div className="ff:flex ff:items-start ff:gap-3">
                        <RotateCcw aria-hidden className="ff:mt-0.5 ff:h-5 ff:w-5 ff:shrink-0 ff:text-amber-600" />
                        <div className="ff:flex ff:flex-col ff:gap-1">
                            <p className="ff:m-0 ff:text-sm ff:font-medium ff:text-amber-900">
                                {sprintf(
                                    /* translators: %d: number of deleted pack items. */
                                    __("%d items from this pack are no longer on your site."),
                                    missingCount,
                                )}
                            </p>
                            <p className="ff:m-0 ff:text-xs ff:leading-relaxed ff:text-amber-800">
                                {__("Putting them back creates fresh copies of the missing items only. Everything you still have is left exactly as it is, including your edits.")}
                            </p>
                        </div>
                    </div>
                    <Button className="ff:shrink-0" onClick={onRestore} disabled={restore.isPending}>
                        {restore.isPending ? __("Putting back…") : __("Put missing items back")}
                    </Button>
                </div>
            )}

            <div className="ff:grid ff:gap-4 ff:md:grid-cols-2">
                <div className="ff:flex ff:flex-col ff:gap-3 ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:p-5">
                    <h2 className="ff:text-sm ff:font-semibold ff:text-slate-900">{__("What's inside")}</h2>
                    <div className="ff:flex ff:flex-col ff:gap-4">
                        {groups
                            .filter((g) => g.items.length > 0)
                            .map(({ key, icon: Icon, label, items }) => (
                                <div key={label} className="ff:flex ff:flex-col ff:gap-1.5">
                                    <div className="ff:flex ff:items-center ff:gap-2 ff:text-xs ff:font-semibold ff:uppercase ff:tracking-wide ff:text-slate-400">
                                        <Icon aria-hidden className="ff:h-3.5 ff:w-3.5" />
                                        {label}
                                    </div>
                                    <ul className="ff:m-0 ff:flex ff:flex-col ff:gap-1 ff:p-0">
                                        {items.map((item) => (
                                            <li
                                                key={item.ref}
                                                className="ff:flex ff:items-center ff:gap-2 ff:text-sm ff:text-slate-700"
                                            >
                                                {item.name}
                                                {missingRefs.has(`${key}:${item.ref}`) && (
                                                    <Badge variant="update">{__("Deleted")}</Badge>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                    </div>
                </div>
                <div className="ff:flex ff:flex-col ff:gap-3 ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:p-5">
                    <h2 className="ff:text-sm ff:font-semibold ff:text-slate-900">{__("What it solves")}</h2>
                    <p className="ff:m-0 ff:text-sm ff:leading-relaxed ff:text-slate-600">
                        {__("A ready-made pipeline for the industry: the form, the emails it sends, and the workflow that ties them together, all editable after import.")}
                    </p>
                    <div className="ff:mt-2 ff:flex ff:flex-col ff:gap-1 ff:text-xs ff:text-slate-500">
                        <span className="ff:flex ff:items-center ff:gap-1.5">
                            <Check aria-hidden className="ff:h-3.5 ff:w-3.5 ff:text-emerald-500" />
                            {sprintf(__("Compatibility: %s"), pack.compatibility)}
                        </span>
                        <span className="ff:flex ff:items-center ff:gap-1.5">
                            <Check aria-hidden className="ff:h-3.5 ff:w-3.5 ff:text-emerald-500" />
                            {sprintf(__("Version %s"), pack.version)}
                        </span>
                    </div>
                </div>
            </div>

            <ImportPackDialog pack={pack} open={importOpen} onClose={() => setImportOpen(false)} />
            <UpdatePackDialog pack={pack} open={updateOpen} onClose={() => setUpdateOpen(false)} />
            <Dialog open={uninstallOpen} onOpenChange={(open) => !open && setUninstallOpen(false)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{sprintf(__('Uninstall "%s"?'), pack.name)}</DialogTitle>
                        <DialogDescription>
                            {toDelete.length > 0
                                ? __("This deletes the items below, including any pattern no longer used by another installed pack.")
                                : __("Nothing this pack created is still on your site, so this only clears its Installed status.")}
                        </DialogDescription>
                    </DialogHeader>
                    {toDelete.length > 0 && (
                        <div className="ff:flex ff:flex-col ff:gap-3 ff:rounded-lg ff:bg-red-50 ff:p-3">
                            {groups
                                .map((g) => ({ ...g, items: toDelete.filter((i) => i.group === g.key) }))
                                .filter((g) => g.items.length > 0)
                                .map(({ key, icon: Icon, label, items }) => (
                                    <div key={key} className="ff:flex ff:flex-col ff:gap-1">
                                        <div className="ff:flex ff:items-center ff:gap-2 ff:text-xs ff:font-semibold ff:uppercase ff:tracking-wide ff:text-red-400">
                                            <Icon aria-hidden className="ff:h-3.5 ff:w-3.5" />
                                            {label}
                                        </div>
                                        <ul className="ff:m-0 ff:flex ff:flex-col ff:gap-0.5 ff:p-0 ff:text-sm ff:text-red-900">
                                            {items.map((item) => (
                                                <li key={item.ref}>{item.name}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                        </div>
                    )}
                    {keptPatterns.length > 0 && (
                        <p className="ff:m-0 ff:text-xs ff:text-slate-500">
                            {sprintf(
                                /* translators: %s: comma-separated pattern names. */
                                __("Kept: %s (another installed pack still uses it)."),
                                keptPatterns.map((i) => i.name).join(", "),
                            )}
                        </p>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setUninstallOpen(false)}>
                            {__("Cancel")}
                        </Button>
                        <Button variant="destructive" onClick={onUninstall} disabled={uninstall.isPending}>
                            {uninstall.isPending ? __("Uninstalling…") : __("Uninstall pack")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function BackLink() {
    return (
        <a
            href="#/library"
            className="ff:inline-flex ff:w-fit ff:items-center ff:gap-1.5 ff:text-sm ff:font-medium ff:text-slate-500 ff:no-underline ff:transition-colors ff:hover:text-slate-800"
        >
            <ArrowLeft aria-hidden className="ff:h-4 ff:w-4" />
            {__("Back to Library")}
        </a>
    );
}
