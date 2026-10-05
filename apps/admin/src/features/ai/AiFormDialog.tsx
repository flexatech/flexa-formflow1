import { useState } from "react";
import { Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { __ } from "@/lib/i18n";
import { navigate } from "@/lib/router";
import { useUiStore } from "@/lib/store";
import { SECRET_MASK, useSettings } from "@/features/settings/useSettings";
import { useGenerateForm } from "./useAi";

/**
 * "Generate with AI" for forms (PRODUCT_DESIGN.md section C: AI is a verb inside
 * the builders, not a destination). Drafts a whole form from a description and
 * opens it in the builder. Uses the site's own provider key configured in
 * Settings; with no key it points there instead of failing silently.
 */
export function AiFormDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const { data: settings } = useSettings();
    const hasKey = settings?.ai_api_key === SECRET_MASK;
    const generate = useGenerateForm();
    const showToast = useUiStore((s) => s.showToast);
    const [prompt, setPrompt] = useState("");

    const close = () => {
        onClose();
        window.setTimeout(() => setPrompt(""), 200);
    };

    const onGenerate = () => {
        generate.mutate(prompt.trim(), {
            onSuccess: (form) => {
                showToast(__("Form drafted. Review and publish it."));
                close();
                navigate(`/forms/${form.id}/edit`);
            },
            onError: (error) =>
                showToast(error instanceof Error ? error.message : __("Could not generate the form."), "error"),
        });
    };

    return (
        <Dialog open={open} onOpenChange={(next) => !next && close()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="ff:flex ff:items-center ff:gap-2">
                        <Wand2 aria-hidden className="ff:h-5 ff:w-5 ff:text-brand-600" />
                        {__("Generate a form with AI")}
                    </DialogTitle>
                    <DialogDescription>
                        {__("Describe what you need. A draft form opens in the builder for you to review.")}
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
                    <textarea
                        className="flexa-formflow-control ff:min-h-28 ff:w-full ff:rounded-md ff:border ff:border-slate-300 ff:bg-white ff:px-3 ff:py-2 ff:text-sm ff:shadow-sm"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder={__("e.g. A contact form for a dentist: name, email, phone, preferred appointment date, and a message.")}
                        disabled={!hasKey}
                    />
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={close}>
                        {__("Cancel")}
                    </Button>
                    <Button onClick={onGenerate} disabled={!hasKey || generate.isPending || prompt.trim() === ""}>
                        <Sparkles aria-hidden className="ff:h-4 ff:w-4" />
                        {generate.isPending ? __("Drafting…") : __("Generate form")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
