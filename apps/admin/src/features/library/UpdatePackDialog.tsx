import { useEffect, useState } from "react";
import { AlertTriangle, ArrowUpCircle, Check, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/cn";
import { __, sprintf } from "@/lib/i18n";
import { useUiStore } from "@/lib/store";
import { usePackDiff, useUpdatePack } from "./useLibrary";
import type { PackDetail, PackDiffItem, UpdateAction, UpdateSummary } from "./types";

type Step = "review" | "done";

/**
 * Pack update (PRODUCT_DESIGN.md section L): the diff of what changed, the
 * changelog, and a per-item choice that protects the user's edits. Unmodified
 * items default to taking the update; items the user has changed default to
 * keeping theirs. Nothing is written until Apply. Only the reusable patterns a
 * pack installed are diffed; the user's forms, emails and workflows are untouched.
 */
export function UpdatePackDialog({
    pack,
    open,
    onClose,
}: {
    pack: PackDetail;
    open: boolean;
    onClose: () => void;
}) {
    const { data: diff, isLoading } = usePackDiff(pack.id, open);
    const update = useUpdatePack(pack.id);
    const showToast = useUiStore((s) => s.showToast);
    const [step, setStep] = useState<Step>("review");
    const [summary, setSummary] = useState<UpdateSummary | null>(null);
    const [decisions, setDecisions] = useState<Record<string, UpdateAction>>({});

    // Seed the per-item choices from the protective defaults once the diff loads.
    useEffect(() => {
        if (!diff) return;
        const seed: Record<string, UpdateAction> = {};
        for (const item of diff.items) {
            if (item.status === "unchanged" || item.status === "removed") continue;
            seed[item.ref] = item.action;
        }
        setDecisions(seed);
    }, [diff]);

    const close = () => {
        onClose();
        window.setTimeout(() => {
            setStep("review");
            setSummary(null);
        }, 200);
    };

    const onApply = () => {
        update.mutate(decisions, {
            onSuccess: (result) => {
                setSummary(result);
                setStep("done");
            },
            onError: (error) =>
                showToast(error instanceof Error ? error.message : __("Update failed."), "error"),
        });
    };

    const actionable = diff?.items.filter((i) => i.status !== "unchanged" && i.status !== "removed") ?? [];
    const modifiedCount = diff?.summary.conflict ?? 0;

    return (
        <Dialog open={open} onOpenChange={(next) => !next && close()}>
            <DialogContent>
                {step === "done" ? (
                    <>
                        <DialogHeader>
                            <DialogTitle className="ff:flex ff:items-center ff:gap-2">
                                <Check aria-hidden className="ff:h-5 ff:w-5 ff:text-emerald-600" />
                                {__("Pack updated")}
                            </DialogTitle>
                            <DialogDescription>
                                {sprintf(__("%s is now up to date."), pack.name)}
                            </DialogDescription>
                        </DialogHeader>
                        {summary && (
                            <ul className="ff:m-0 ff:flex ff:flex-col ff:gap-1.5 ff:py-2 ff:p-0 ff:text-sm ff:text-slate-700">
                                <SummaryRow n={summary.applied.updated} label={__("updated to the new version")} />
                                <SummaryRow n={summary.applied.added} label={__("added")} />
                                <SummaryRow n={summary.applied.kept} label={__("kept as yours")} />
                            </ul>
                        )}
                        <DialogFooter>
                            <Button onClick={close}>{__("Done")}</Button>
                        </DialogFooter>
                    </>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle className="ff:flex ff:items-center ff:gap-2">
                                <ArrowUpCircle aria-hidden className="ff:h-5 ff:w-5 ff:text-brand-600" />
                                {sprintf(__("Update %s"), pack.name)}
                            </DialogTitle>
                            <DialogDescription>
                                {diff
                                    ? sprintf(
                                          __("Version %1$s → %2$s. Choose what to do with each saved pattern; your forms, emails and workflows are never touched."),
                                          diff.fromVersion || "—",
                                          diff.toVersion,
                                      )
                                    : __("Checking what changed…")}
                            </DialogDescription>
                        </DialogHeader>

                        {isLoading || !diff ? (
                            <div className="ff:flex ff:items-center ff:gap-2 ff:py-6 ff:text-sm ff:text-slate-400">
                                <Loader2 aria-hidden className="ff:h-4 ff:w-4 ff:animate-spin" />
                                {__("Loading…")}
                            </div>
                        ) : actionable.length === 0 ? (
                            <p className="ff:m-0 ff:rounded-lg ff:bg-slate-50 ff:px-3 ff:py-6 ff:text-center ff:text-sm ff:text-slate-500">
                                {__("Your saved patterns already match the newest version. Applying just refreshes the version stamp.")}
                            </p>
                        ) : (
                            <div className="ff:flex ff:max-h-[22rem] ff:flex-col ff:gap-3 ff:overflow-y-auto ff:py-2">
                                {modifiedCount > 0 && (
                                    <p className="ff:m-0 ff:flex ff:items-start ff:gap-2 ff:rounded-lg ff:bg-amber-50 ff:px-3 ff:py-2 ff:text-xs ff:text-amber-700">
                                        <AlertTriangle aria-hidden className="ff:mt-0.5 ff:h-3.5 ff:w-3.5 ff:shrink-0" />
                                        {sprintf(
                                            __("%1$d of these you have modified, so they default to keeping yours."),
                                            modifiedCount,
                                        )}
                                    </p>
                                )}
                                {actionable.map((item) => (
                                    <ItemRow
                                        key={item.ref}
                                        item={item}
                                        value={decisions[item.ref] ?? item.action}
                                        onChange={(action) => setDecisions((d) => ({ ...d, [item.ref]: action }))}
                                    />
                                ))}
                                {diff.changelog.length > 0 && <Changelog entries={diff.changelog} />}
                            </div>
                        )}

                        <DialogFooter>
                            <Button variant="outline" onClick={close}>
                                {__("Cancel")}
                            </Button>
                            <Button onClick={onApply} disabled={update.isPending || isLoading || !diff}>
                                {update.isPending ? (
                                    <>
                                        <Loader2 aria-hidden className="ff:h-4 ff:w-4 ff:animate-spin" />
                                        {__("Applying…")}
                                    </>
                                ) : (
                                    __("Apply update")
                                )}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}

/** The choices offered depend on the item's status. */
function choicesFor(status: string): { value: UpdateAction; label: string }[] {
    if (status === "new") {
        return [
            { value: "take_update", label: __("Add") },
            { value: "keep_mine", label: __("Skip") },
        ];
    }
    if (status === "conflict") {
        return [
            { value: "keep_mine", label: __("Keep mine") },
            { value: "take_update", label: __("Take update") },
            { value: "keep_both", label: __("Keep both") },
        ];
    }
    return [
        { value: "take_update", label: __("Take update") },
        { value: "keep_mine", label: __("Keep mine") },
    ];
}

function statusLabel(item: PackDiffItem): string {
    if (item.status === "new") return __("New in this version");
    if (item.status === "conflict") return __("You have edited this");
    return __("Updated in this version");
}

function ItemRow({
    item,
    value,
    onChange,
}: {
    item: PackDiffItem;
    value: UpdateAction;
    onChange: (action: UpdateAction) => void;
}) {
    const choices = choicesFor(item.status);
    return (
        <div className="ff:flex ff:flex-col ff:gap-2 ff:rounded-lg ff:border ff:border-slate-200 ff:p-3">
            <div className="ff:flex ff:items-center ff:justify-between ff:gap-2">
                <span className="ff:text-sm ff:font-medium ff:text-slate-800">{item.name}</span>
                <span
                    className={cn(
                        "ff:rounded-full ff:px-2 ff:py-0.5 ff:text-[11px] ff:font-medium",
                        item.status === "conflict"
                            ? "ff:bg-amber-50 ff:text-amber-700"
                            : "ff:bg-slate-100 ff:text-slate-500",
                    )}
                >
                    {statusLabel(item)}
                </span>
            </div>
            <div className="ff:flex ff:gap-1">
                {choices.map((choice) => (
                    <button
                        key={choice.value}
                        type="button"
                        onClick={() => onChange(choice.value)}
                        className={cn(
                            "ff:flex-1 ff:cursor-pointer ff:rounded-md ff:border ff:px-2 ff:py-1.5 ff:text-xs ff:font-medium ff:transition-colors",
                            value === choice.value
                                ? "ff:border-brand-500 ff:bg-brand-50 ff:text-brand-700"
                                : "ff:border-slate-200 ff:bg-white ff:text-slate-600 ff:hover:border-slate-300",
                        )}
                    >
                        {choice.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

function Changelog({ entries }: { entries: { version: string; notes: string[] }[] }) {
    return (
        <details className="ff:rounded-lg ff:border ff:border-slate-200 ff:bg-slate-50/60 ff:p-3">
            <summary className="ff:flex ff:cursor-pointer ff:items-center ff:gap-1.5 ff:text-xs ff:font-medium ff:text-slate-600">
                <RefreshCw aria-hidden className="ff:h-3.5 ff:w-3.5" />
                {__("What's changed")}
            </summary>
            <div className="ff:mt-2 ff:flex ff:flex-col ff:gap-2">
                {entries.map((entry) => (
                    <div key={entry.version}>
                        <p className="ff:m-0 ff:text-xs ff:font-semibold ff:text-slate-700">{entry.version}</p>
                        <ul className="ff:m-0 ff:mt-0.5 ff:list-disc ff:pl-4 ff:text-xs ff:text-slate-500">
                            {entry.notes.map((note, i) => (
                                <li key={i}>{note}</li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </details>
    );
}

function SummaryRow({ n, label }: { n: number; label: string }) {
    if (n <= 0) return null;
    return (
        <li className="ff:flex ff:items-center ff:gap-2">
            <Check aria-hidden className="ff:h-4 ff:w-4 ff:text-emerald-500" />
            <span className="ff:font-semibold ff:tabular-nums">{n}</span>
            <span>{label}</span>
        </li>
    );
}
