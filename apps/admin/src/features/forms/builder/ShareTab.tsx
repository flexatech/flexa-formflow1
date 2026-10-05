import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { __ } from "@/lib/i18n";
import type { FormDetail, FormStatus } from "../types";

interface ShareTabProps {
    form: FormDetail;
    status: FormStatus;
}

/** navigator.clipboard only exists on secure contexts (https/localhost); plain-http dev sites need the execCommand fallback. */
async function copyText(text: string): Promise<boolean> {
    if (navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // fall through to execCommand
        }
    }
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    let ok = false;
    try {
        ok = document.execCommand("copy");
    } catch {
        ok = false;
    }
    document.body.removeChild(el);
    return ok;
}

export function ShareTab({ form, status }: ShareTabProps) {
    const shortcode = `[flexa_formflow id="${form.id}"]`;
    const [copied, setCopied] = useState(false);

    const copy = () => {
        void copyText(shortcode).then((ok) => {
            if (!ok) {
                return;
            }
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
        });
    };

    return (
        <div className="ff:mx-auto ff:flex ff:max-w-2xl ff:flex-col ff:gap-6 ff:p-6">
            {status !== "published" ? (
                <p className="ff:rounded-lg ff:bg-amber-50 ff:px-4 ff:py-3 ff:text-sm ff:text-amber-800">
                    {__("This form is a draft. Publish it (toggle in the top bar) before sharing, or visitors will see nothing.")}
                </p>
            ) : null}

            <section className="ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:p-5">
                <h2 className="ff:mb-1 ff:text-sm ff:font-semibold ff:text-slate-900">{__("Shortcode")}</h2>
                <p className="ff:mb-3 ff:text-sm ff:text-slate-500">
                    {__("Paste this into any post, page, or widget.")}
                </p>
                <div className="ff:flex ff:items-center ff:gap-2">
                    <code className="ff:flex-1 ff:rounded-lg ff:border ff:border-slate-200 ff:bg-slate-50 ff:px-3 ff:py-2 ff:font-mono ff:text-sm ff:text-slate-800">
                        {shortcode}
                    </code>
                    <Button variant="outline" onClick={copy}>
                        {copied ? (
                            <Check aria-hidden className="ff:h-4 ff:w-4 ff:text-emerald-600" />
                        ) : (
                            <Copy aria-hidden className="ff:h-4 ff:w-4" />
                        )}
                        {copied ? __("Copied") : __("Copy")}
                    </Button>
                </div>
            </section>

            <section className="ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:p-5">
                <h2 className="ff:mb-1 ff:text-sm ff:font-semibold ff:text-slate-900">{__("Block")}</h2>
                <p className="ff:text-sm ff:text-slate-500">
                    {__('In the block editor, add the "FormFlow Form" block and pick this form from the dropdown.')}
                </p>
            </section>
        </div>
    );
}
