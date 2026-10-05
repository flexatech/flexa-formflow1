import { type ReactNode } from "react";
import { FileText, Mail, Workflow, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { __, sprintf } from "@/lib/i18n";
import { fieldTypeMeta, type FieldType } from "@/features/forms/types";
import { elementDef, isLayout } from "@/features/emails/types";
import type { SavedAsset } from "./types";

/** Built-in workflow action labels; unknown types fall back to the raw slug. */
const ACTION_LABEL: Record<string, () => string> = {
    send_email: () => __("Send email"),
    webhook: () => __("Send webhook"),
    set_status: () => __("Set entry status"),
    add_note: () => __("Add note"),
};

interface LibraryPreviewDialogProps {
    asset: SavedAsset | null;
    onClose: () => void;
    /** Opens a fresh builder seeded from this asset. */
    onUse: (asset: SavedAsset) => void;
    /** True while the reuse round-trip is materializing the new document. */
    isUsing: boolean;
}

/**
 * Read-only look at a saved asset before reusing it: the same structure the
 * builder would show (form fields, email blocks, workflow steps), listed
 * without any editing chrome. "Use this" round-trips it into a fresh builder.
 */
export function LibraryPreviewDialog({ asset, onClose, onUse, isUsing }: LibraryPreviewDialogProps) {
    return (
        <Dialog open={asset !== null} onOpenChange={(next) => !next && onClose()}>
            <DialogContent className="ff:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="ff:flex ff:items-center ff:gap-2">
                        {asset ? <KindIcon kind={asset.kind} /> : null}
                        {asset?.name}
                    </DialogTitle>
                    <DialogDescription>
                        {__("A read-only look at what you saved. Use it to start a fresh form, email or workflow.")}
                    </DialogDescription>
                </DialogHeader>

                <div className="ff:max-h-80 ff:overflow-y-auto ff:py-1">
                    {asset ? <PreviewBody asset={asset} /> : null}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        {__("Close")}
                    </Button>
                    <Button onClick={() => asset && onUse(asset)} disabled={!asset || isUsing}>
                        <Zap aria-hidden className="ff:h-4 ff:w-4" />
                        {isUsing ? __("Opening…") : __("Use this")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function KindIcon({ kind }: { kind: SavedAsset["kind"] }) {
    const Icon = kind === "workflow" ? Workflow : kind === "form" ? FileText : Mail;
    return (
        <span className="ff:flex ff:h-7 ff:w-7 ff:items-center ff:justify-center ff:rounded-lg ff:bg-slate-100 ff:text-slate-500">
            <Icon aria-hidden className="ff:h-4 ff:w-4" />
        </span>
    );
}

function PreviewBody({ asset }: { asset: SavedAsset }) {
    if (asset.kind === "form") {
        return <FormPreview payload={asset.payload} />;
    }
    if (asset.kind === "workflow") {
        return <WorkflowPreview payload={asset.payload} />;
    }
    return <EmailPreview payload={asset.payload} />;
}

function Row({ index, title, meta }: { index: number; title: string; meta?: ReactNode }) {
    return (
        <li className="ff:flex ff:items-center ff:gap-3 ff:border-b ff:border-slate-100 ff:py-2 ff:last:border-0">
            <span className="ff:flex ff:h-6 ff:w-6 ff:shrink-0 ff:items-center ff:justify-center ff:rounded-full ff:bg-slate-100 ff:text-[11px] ff:font-medium ff:text-slate-500 ff:tabular-nums">
                {index}
            </span>
            <span className="ff:min-w-0 ff:flex-1 ff:truncate ff:text-sm ff:text-slate-800">{title}</span>
            {meta}
        </li>
    );
}

function Empty({ children }: { children: ReactNode }) {
    return <p className="ff:m-0 ff:py-6 ff:text-center ff:text-sm ff:text-slate-400">{children}</p>;
}

function FormPreview({ payload }: { payload: Record<string, unknown> }) {
    const fields = Array.isArray(payload.fields) ? (payload.fields as Record<string, unknown>[]) : [];
    if (fields.length === 0) {
        return <Empty>{__("This template has no fields yet.")}</Empty>;
    }
    return (
        <ol className="ff:m-0 ff:list-none ff:p-0">
            {fields.map((field, i) => {
                const type = String(field.type ?? "text") as FieldType;
                return (
                    <Row
                        key={String(field.id ?? i)}
                        index={i + 1}
                        title={String(field.label ?? __("Untitled field"))}
                        meta={
                            <span className="ff:flex ff:items-center ff:gap-2">
                                {field.required ? <Badge variant="neutral">{__("Required")}</Badge> : null}
                                <span className="ff:text-xs ff:text-slate-400">{fieldTypeMeta(type).label()}</span>
                            </span>
                        }
                    />
                );
            })}
        </ol>
    );
}

function EmailPreview({ payload }: { payload: Record<string, unknown> }) {
    const elements = Array.isArray(payload.elements) ? (payload.elements as Record<string, unknown>[]) : [];
    if (elements.length === 0) {
        return <Empty>{__("This template has no blocks yet.")}</Empty>;
    }
    return (
        <ol className="ff:m-0 ff:list-none ff:p-0">
            {elements.map((el, i) => {
                const type = String(el.type ?? "");
                const label = elementDef(type)?.label ?? type;
                const cols = isLayout(type) && Array.isArray(el.columns) ? el.columns.length : 0;
                return (
                    <Row
                        key={String(el.id ?? i)}
                        index={i + 1}
                        title={label}
                        meta={
                            cols > 0 ? (
                                <span className="ff:text-xs ff:text-slate-400">
                                    {sprintf(
                                        /* translators: %d: number of columns. */
                                        __("%d columns"),
                                        cols,
                                    )}
                                </span>
                            ) : undefined
                        }
                    />
                );
            })}
        </ol>
    );
}

function WorkflowPreview({ payload }: { payload: Record<string, unknown> }) {
    const actions = Array.isArray(payload.actions) ? (payload.actions as Record<string, unknown>[]) : [];
    return (
        <div className="ff:flex ff:flex-col ff:gap-3">
            <div className="ff:rounded-lg ff:border ff:border-slate-200 ff:bg-slate-50 ff:px-3 ff:py-2">
                <span className="ff:text-[11px] ff:uppercase ff:tracking-wide ff:text-slate-400">
                    {__("Trigger")}
                </span>
                <p className="ff:m-0 ff:text-sm ff:text-slate-800">{__("When a form is submitted")}</p>
            </div>
            {actions.length === 0 ? (
                <Empty>{__("This recipe has no steps yet.")}</Empty>
            ) : (
                <ol className="ff:m-0 ff:list-none ff:p-0">
                    {actions.map((action, i) => {
                        const type = String(action.type ?? "");
                        const label = (ACTION_LABEL[type] ?? (() => type))();
                        return <Row key={i} index={i + 1} title={label} />;
                    })}
                </ol>
            )}
        </div>
    );
}
