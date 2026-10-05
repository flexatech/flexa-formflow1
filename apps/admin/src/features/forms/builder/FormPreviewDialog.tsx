import { Monitor, Smartphone } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { __ } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { useFormPreview } from "../useForms";
import type { FormConfig } from "../types";

interface FormPreviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    config: FormConfig;
    title: string;
    viewport: "desktop" | "mobile";
    onViewportChange: (viewport: "desktop" | "mobile") => void;
}

/**
 * Quick preview of the form as a visitor sees it. Renders the current draft
 * config (including unsaved changes) to frontend HTML server-side and shows it
 * in an isolated iframe, with a desktop/mobile viewport toggle.
 */
export function FormPreviewDialog({
    open,
    onOpenChange,
    config,
    title,
    viewport,
    onViewportChange,
}: FormPreviewDialogProps) {
    const preview = useFormPreview();
    const render = preview.mutate;
    const hasFields = config.fields.length > 0;

    // Re-render each time the dialog opens so the preview reflects the latest
    // draft. render is referentially stable; config/title are read at open time.
    useEffect(() => {
        if (open && hasFields) {
            render({ config, title });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="ff:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{__("Preview")}</DialogTitle>
                    <DialogDescription>
                        {__("How this form looks to visitors, including your unsaved changes.")}
                    </DialogDescription>
                </DialogHeader>
                <div className="ff:flex ff:items-center ff:gap-2">
                    {preview.isPending && (
                        <span className="ff:text-xs ff:text-slate-400">{__("Rendering…")}</span>
                    )}
                    <div className="ff:ml-auto ff:flex ff:items-center ff:gap-1 ff:rounded-md ff:border ff:border-slate-200 ff:p-0.5">
                        <Button
                            variant={viewport === "desktop" ? "default" : "ghost"}
                            size="icon"
                            onClick={() => onViewportChange("desktop")}
                            aria-label={__("Desktop preview")}
                        >
                            <Monitor aria-hidden className="ff:h-4 ff:w-4" />
                        </Button>
                        <Button
                            variant={viewport === "mobile" ? "default" : "ghost"}
                            size="icon"
                            onClick={() => onViewportChange("mobile")}
                            aria-label={__("Mobile preview")}
                        >
                            <Smartphone aria-hidden className="ff:h-4 ff:w-4" />
                        </Button>
                    </div>
                </div>
                {!hasFields ? (
                    <div className="ff:flex ff:h-[60vh] ff:items-center ff:justify-center ff:rounded-md ff:border ff:border-slate-200 ff:bg-white ff:px-6 ff:text-center ff:text-sm ff:text-slate-500">
                        {__("Add a field to the form to preview it.")}
                    </div>
                ) : preview.isError ? (
                    <div className="ff:flex ff:h-[60vh] ff:items-center ff:justify-center ff:rounded-md ff:border ff:border-slate-200 ff:bg-white ff:px-6 ff:text-center ff:text-sm ff:text-slate-500">
                        {__("Could not render the preview.")}
                    </div>
                ) : (
                    <div className="ff:flex ff:h-[60vh] ff:justify-center ff:overflow-auto ff:rounded-md ff:bg-slate-100 ff:p-4">
                        <iframe
                            title={__("Form preview")}
                            srcDoc={preview.data ?? ""}
                            className={cn(
                                "ff:h-full ff:rounded-md ff:border ff:border-slate-200 ff:bg-white",
                                viewport === "desktop" ? "ff:w-full" : "ff:w-[390px] ff:shrink-0",
                            )}
                        />
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
