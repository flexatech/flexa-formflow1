import { useState } from "react";
import { Check, FileText, Loader2, Mail, PartyPopper, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { __, sprintf } from "@/lib/i18n";
import { navigate } from "@/lib/router";
import { useUiStore } from "@/lib/store";
import { useImportPack } from "./useLibrary";
import type { ImportSummary, PackDetail } from "./types";

type Step = "review" | "done";

/**
 * The 3-step pack import (PRODUCT_DESIGN.md section N): review what will be
 * added, import (nothing is written before this), then a done summary. Workflows
 * arrive inactive, so the review says so up front and the summary repeats it.
 */
export function ImportPackDialog({
    pack,
    open,
    onClose,
}: {
    pack: PackDetail;
    open: boolean;
    onClose: () => void;
}) {
    const [step, setStep] = useState<Step>("review");
    const [summary, setSummary] = useState<ImportSummary | null>(null);
    const importPack = useImportPack(pack.id);
    const showToast = useUiStore((s) => s.showToast);

    const close = () => {
        onClose();
        // Reset for the next open once the dialog has animated out.
        window.setTimeout(() => {
            setStep("review");
            setSummary(null);
        }, 200);
    };

    const onImport = () => {
        importPack.mutate(undefined, {
            onSuccess: (result) => {
                setSummary(result);
                setStep("done");
            },
            onError: (error) =>
                showToast(error instanceof Error ? error.message : __("Import failed."), "error"),
        });
    };

    const c = pack.contents;

    return (
        <Dialog open={open} onOpenChange={(next) => !next && close()}>
            <DialogContent>
                {step === "review" ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>{sprintf(__("Import %s"), pack.name)}</DialogTitle>
                            <DialogDescription>
                                {__("This adds the pack's content to your site. Nothing is written until you confirm.")}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="ff:flex ff:flex-col ff:gap-3 ff:py-2">
                            <ul className="ff:m-0 ff:flex ff:flex-col ff:gap-2 ff:p-0">
                                <ReviewRow icon={FileText} n={c.forms} label={__("forms")} />
                                <ReviewRow icon={Mail} n={c.emails} label={__("email templates")} />
                                <ReviewRow icon={Workflow} n={c.workflows} label={__("workflows")} />
                                <ReviewRow icon={Check} n={c.patterns} label={__("saved patterns")} />
                            </ul>
                            <p className="ff:m-0 ff:rounded-lg ff:bg-slate-50 ff:px-3 ff:py-2 ff:text-xs ff:text-slate-500">
                                {__("Workflows are added turned off. Review each one, then activate it when you are ready.")}
                            </p>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={close}>
                                {__("Cancel")}
                            </Button>
                            <Button onClick={onImport} disabled={importPack.isPending}>
                                {importPack.isPending ? (
                                    <>
                                        <Loader2 aria-hidden className="ff:h-4 ff:w-4 ff:animate-spin" />
                                        {__("Importing…")}
                                    </>
                                ) : (
                                    __("Import pack")
                                )}
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle className="ff:flex ff:items-center ff:gap-2">
                                <PartyPopper aria-hidden className="ff:h-5 ff:w-5 ff:text-brand-600" />
                                {__("Pack imported")}
                            </DialogTitle>
                            <DialogDescription>
                                {__("Everything is in place. Workflows are turned off until you activate them.")}
                            </DialogDescription>
                        </DialogHeader>
                        {summary && (
                            <div className="ff:py-2">
                                <ul className="ff:m-0 ff:flex ff:flex-col ff:gap-2 ff:p-0">
                                    <ReviewRow icon={FileText} n={summary.created.forms} label={__("forms added")} />
                                    <ReviewRow icon={Mail} n={summary.created.emails} label={__("email templates added")} />
                                    <ReviewRow icon={Workflow} n={summary.created.workflows} label={__("workflows added")} />
                                    <ReviewRow icon={Check} n={summary.created.patterns} label={__("saved patterns added")} />
                                </ul>
                            </div>
                        )}
                        <DialogFooter>
                            <Button variant="outline" onClick={close}>
                                {__("Close")}
                            </Button>
                            <Button
                                onClick={() => {
                                    close();
                                    navigate("/workflows");
                                }}
                            >
                                {__("Review workflows")}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}

function ReviewRow({ icon: Icon, n, label }: { icon: typeof FileText; n: number; label: string }) {
    return (
        <li className="ff:flex ff:items-center ff:gap-2 ff:text-sm ff:text-slate-700">
            <Icon aria-hidden className="ff:h-4 ff:w-4 ff:text-slate-400" />
            <span className="ff:font-semibold ff:tabular-nums">{n}</span>
            <span>{label}</span>
        </li>
    );
}
