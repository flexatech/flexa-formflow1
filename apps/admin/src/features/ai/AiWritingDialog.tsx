import { useState } from "react";
import { Copy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { __ } from "@/lib/i18n";
import { navigate } from "@/lib/router";
import { useUiStore } from "@/lib/store";
import { SECRET_MASK, useSettings } from "@/features/settings/useSettings";
import { useGenerateText, type TextAction } from "./useAi";

const ACTIONS: Array<{ action: TextAction; label: string }> = [
    { action: "rewrite", label: __("Improve") },
    { action: "shorten", label: __("Shorten") },
    { action: "tone", label: __("Friendlier") },
    { action: "subject", label: __("Subject ideas") },
];

/**
 * The writing assistant, relocated from a top-level page to an in-builder entry
 * point in the email editor (PRODUCT_DESIGN.md section C). Polishes pasted copy
 * with the site's own provider key; the result is copied back into the template
 * rather than written directly, so the editor stays the single source of truth.
 */
export function AiWritingDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const { data: settings } = useSettings();
    const hasKey = settings?.ai_api_key === SECRET_MASK;
    const generate = useGenerateText();
    const showToast = useUiStore((s) => s.showToast);
    const [text, setText] = useState("");
    const [result, setResult] = useState("");

    const close = () => {
        onClose();
        window.setTimeout(() => {
            setText("");
            setResult("");
        }, 200);
    };

    const run = (action: TextAction) => {
        generate.mutate(
            { action, text: text.trim(), tone: action === "tone" ? "warm and friendly" : undefined },
            {
                onSuccess: (out) => setResult(out),
                onError: (error) =>
                    showToast(error instanceof Error ? error.message : __("The assistant could not respond."), "error"),
            },
        );
    };

    const copy = () => {
        void navigator.clipboard?.writeText(result);
        showToast(__("Copied to clipboard."));
    };

    return (
        <Dialog open={open} onOpenChange={(next) => !next && close()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="ff:flex ff:items-center ff:gap-2">
                        <Sparkles aria-hidden className="ff:h-5 ff:w-5 ff:text-brand-600" />
                        {__("Writing assistant")}
                    </DialogTitle>
                    <DialogDescription>
                        {__("Paste email copy, pick an action, then copy the result back into your template.")}
                    </DialogDescription>
                </DialogHeader>

                {settings && !hasKey ? (
                    <div className="ff:flex ff:items-center ff:justify-between ff:gap-4 ff:rounded-lg ff:border ff:border-amber-200 ff:bg-amber-50/60 ff:px-4 ff:py-3">
                        <p className="ff:m-0 ff:text-sm ff:text-amber-800">
                            {__("Add an AI provider API key in Settings to turn this on.")}
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                close();
                                navigate("/settings");
                            }}
                        >
                            {__("Open settings")}
                        </Button>
                    </div>
                ) : (
                    <div className="ff:flex ff:flex-col ff:gap-3">
                        <textarea
                            className="flexa-formflow-control ff:min-h-24 ff:w-full ff:rounded-md ff:border ff:border-slate-300 ff:bg-white ff:px-3 ff:py-2 ff:text-sm ff:shadow-sm"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder={__("Paste your text here. Tokens like {form_title} are preserved.")}
                            disabled={!hasKey}
                        />
                        <div className="ff:flex ff:flex-wrap ff:gap-2">
                            {ACTIONS.map((a) => (
                                <Button
                                    key={a.action}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => run(a.action)}
                                    disabled={!hasKey || generate.isPending || text.trim() === ""}
                                >
                                    {a.label}
                                </Button>
                            ))}
                        </div>
                        {result !== "" && (
                            <div className="ff:rounded-lg ff:border ff:border-slate-200 ff:bg-slate-50 ff:p-3">
                                <div className="ff:mb-2 ff:flex ff:items-center ff:justify-between">
                                    <span className="ff:text-xs ff:font-medium ff:text-slate-500">{__("Result")}</span>
                                    <Button variant="ghost" size="sm" onClick={copy}>
                                        <Copy aria-hidden className="ff:h-3.5 ff:w-3.5" />
                                        {__("Copy")}
                                    </Button>
                                </div>
                                <p className="ff:m-0 ff:whitespace-pre-wrap ff:text-sm ff:text-slate-700">{result}</p>
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
