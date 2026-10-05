import { Copy, FileText, Pencil, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/custom/EmptyState";
import { TableSkeleton } from "@/components/custom/Skeletons";
import { AiFormDialog } from "@/features/ai/AiFormDialog";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { __, sprintf } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { useUiStore } from "@/lib/store";
import { navigate } from "@/lib/router";
import { useCreateForm, useDeleteForm, useDuplicateForm, useFormsList } from "./useForms";
import type { FormSummary } from "./types";

export function FormsListPage() {
    const [search, setSearch] = useState("");
    const { data, isLoading } = useFormsList({ search, per_page: 50 });
    const createForm = useCreateForm();
    const duplicateForm = useDuplicateForm();
    const deleteForm = useDeleteForm();
    const showToast = useUiStore((s) => s.showToast);
    const [confirmDelete, setConfirmDelete] = useState<FormSummary | null>(null);
    const [aiOpen, setAiOpen] = useState(false);

    const onCreate = () => {
        createForm.mutate(__("Untitled form"), {
            onSuccess: (form) => navigate(`/forms/${form.id}/edit`),
            onError: () => showToast(__("Could not create the form."), "error"),
        });
    };

    const onDuplicate = (form: FormSummary) => {
        duplicateForm.mutate(form.id, {
            onSuccess: () => showToast(__("Form duplicated.")),
            onError: () => showToast(__("Could not duplicate the form."), "error"),
        });
    };

    const onDelete = () => {
        if (!confirmDelete) return;
        deleteForm.mutate(confirmDelete.id, {
            onSuccess: () => {
                setConfirmDelete(null);
                showToast(__("Form deleted."));
            },
            onError: () => showToast(__("Could not delete the form."), "error"),
        });
    };

    const items = data?.items ?? [];
    const hasAnything = items.length > 0 || search !== "";

    return (
        <div className="ff:flex ff:flex-col ff:gap-6 ff:p-6">
            <div className="ff:flex ff:items-center ff:justify-between ff:gap-4">
                <h1 className="ff:text-2xl ff:font-semibold ff:text-slate-900">{__("Forms")}</h1>
                <div className="ff:flex ff:items-center ff:gap-2">
                    <div className="ff:relative">
                        <Search
                            aria-hidden
                            className="ff:pointer-events-none ff:absolute ff:left-2.5 ff:top-1/2 ff:h-4 ff:w-4 ff:-translate-y-1/2 ff:text-slate-400"
                        />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={__("Search forms…")}
                            className="ff:w-56"
                            // Inline left padding: WP-admin's unlayered `input { padding }`
                            // beats the layered `ff:pl-8` utility, so the icon and text
                            // would overlap. An inline style outranks WP's rule.
                            style={{ paddingLeft: "2rem" }}
                            spellCheck={false}
                        />
                    </div>
                    <Button variant="outline" onClick={() => setAiOpen(true)}>
                        <Sparkles aria-hidden className="ff:h-4 ff:w-4" />
                        {__("Generate with AI")}
                    </Button>
                    <Button onClick={onCreate} disabled={createForm.isPending}>
                        <Plus aria-hidden className="ff:h-4 ff:w-4" />
                        {__("Create Form")}
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <TableSkeleton columns={5} />
            ) : !hasAnything ? (
                <EmptyState
                    icon={FileText}
                    title={__("Every flow starts with a form")}
                    description={__("Build one in about two minutes. Its fields become data you can use in emails and workflows.")}
                    action={
                        <Button onClick={onCreate} disabled={createForm.isPending}>
                            <Plus aria-hidden className="ff:h-4 ff:w-4" />
                            {__("Create Form")}
                        </Button>
                    }
                />
            ) : (
                <div className="ff:overflow-hidden ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white">
                    <table className="ff:w-full ff:border-collapse ff:text-sm">
                        <thead>
                            <tr className="ff:border-b ff:border-slate-200 ff:text-left ff:text-xs ff:uppercase ff:tracking-wide ff:text-slate-500">
                                <th className="ff:px-5 ff:py-3 ff:font-medium">{__("Form")}</th>
                                <th className="ff:px-5 ff:py-3 ff:font-medium">{__("Status")}</th>
                                <th className="ff:px-5 ff:py-3 ff:font-medium">{__("Entries")}</th>
                                <th className="ff:px-5 ff:py-3 ff:font-medium">{__("Updated")}</th>
                                <th className="ff:px-5 ff:py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="ff:px-5 ff:py-10 ff:text-center ff:text-slate-500">
                                        {__("Nothing matches this search.")}
                                    </td>
                                </tr>
                            ) : (
                                items.map((form) => (
                                    <tr
                                        key={form.id}
                                        className="ff:group ff:cursor-pointer ff:border-b ff:border-slate-100 ff:transition-colors ff:last:border-0 ff:hover:bg-slate-50"
                                        onClick={() => navigate(`/forms/${form.id}/edit`)}
                                    >
                                        <td className="ff:px-5 ff:py-3.5 ff:font-medium ff:text-slate-900">
                                            {form.title || __("Untitled form")}
                                        </td>
                                        <td className="ff:px-5 ff:py-3.5">
                                            <StatusPill status={form.status} />
                                        </td>
                                        <td className="ff:px-5 ff:py-3.5 ff:tabular-nums ff:text-slate-600">
                                            {form.entries_count}
                                        </td>
                                        <td className="ff:px-5 ff:py-3.5 ff:text-slate-500">
                                            {formatDate(form.updated_at)}
                                        </td>
                                        <td className="ff:px-5 ff:py-3.5">
                                            <div
                                                className="ff:flex ff:justify-end ff:gap-1 ff:opacity-0 ff:transition-opacity ff:group-hover:opacity-100"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label={__("Edit form")}
                                                    onClick={() => navigate(`/forms/${form.id}/edit`)}
                                                >
                                                    <Pencil aria-hidden className="ff:h-4 ff:w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label={__("Duplicate form")}
                                                    onClick={() => onDuplicate(form)}
                                                >
                                                    <Copy aria-hidden className="ff:h-4 ff:w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label={__("Delete form")}
                                                    className="ff:text-red-600 ff:hover:bg-red-50"
                                                    onClick={() => setConfirmDelete(form)}
                                                >
                                                    <Trash2 aria-hidden className="ff:h-4 ff:w-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            <Dialog open={confirmDelete !== null} onOpenChange={(open) => !open && setConfirmDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{__("Delete this form?")}</DialogTitle>
                        <DialogDescription>
                            {confirmDelete
                                ? sprintf(
                                      /* translators: 1: form title, 2: number of entries. */
                                      __('"%1$s" and its %2$d entries will be permanently deleted.'),
                                      confirmDelete.title || __("Untitled form"),
                                      confirmDelete.entries_count,
                                  )
                                : ""}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmDelete(null)}>
                            {__("Cancel")}
                        </Button>
                        <Button variant="destructive" onClick={onDelete} disabled={deleteForm.isPending}>
                            {deleteForm.isPending ? __("Deleting…") : __("Delete form")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AiFormDialog open={aiOpen} onClose={() => setAiOpen(false)} />
        </div>
    );
}

export function StatusPill({ status }: { status: "draft" | "published" }) {
    return (
        <span
            className={cn(
                "ff:inline-flex ff:items-center ff:rounded-full ff:px-2 ff:py-0.5 ff:text-xs ff:font-medium",
                status === "published"
                    ? "ff:bg-emerald-50 ff:text-emerald-700"
                    : "ff:bg-slate-100 ff:text-slate-600",
            )}
        >
            {status === "published" ? __("Published") : __("Draft")}
        </span>
    );
}

export function formatDate(mysqlDate: string): string {
    if (!mysqlDate) return "";
    const date = new Date(mysqlDate.replace(" ", "T") + "Z");
    if (Number.isNaN(date.getTime())) return mysqlDate;
    return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
