import { Copy, Mail, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/custom/EmptyState";
import { TableSkeleton } from "@/components/custom/Skeletons";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { __, sprintf } from "@/lib/i18n";
import { useUiStore } from "@/lib/store";
import { navigate } from "@/lib/router";
import { formatDate } from "@/features/forms/FormsListPage";
import {
    useCreateEmailTemplate,
    useDeleteEmailTemplate,
    useDuplicateEmailTemplate,
    useEmailTemplatesList,
} from "./useEmailTemplates";
import type { EmailTemplate } from "./types";

/**
 * The "Form Emails" tab body of the Emails screen. The page title and the
 * primary "New template" action live on the parent EmailsPage; this owns the
 * list, its row actions, and the empty state.
 */
export function FormEmailsTab() {
    const { data, isLoading } = useEmailTemplatesList();
    const createTemplate = useCreateEmailTemplate();
    const duplicateTemplate = useDuplicateEmailTemplate();
    const deleteTemplate = useDeleteEmailTemplate();
    const showToast = useUiStore((s) => s.showToast);
    const [confirmDelete, setConfirmDelete] = useState<EmailTemplate | null>(null);

    const onCreate = () => {
        createTemplate.mutate(__("Untitled template"), {
            onSuccess: (template) => navigate(`/emails/${template.id}/edit`),
            onError: () => showToast(__("Could not create the template."), "error"),
        });
    };

    const onDuplicate = (template: EmailTemplate) => {
        duplicateTemplate.mutate(template.id, {
            onSuccess: () => showToast(__("Template duplicated.")),
            onError: () => showToast(__("Could not duplicate the template."), "error"),
        });
    };

    const onDelete = () => {
        if (!confirmDelete) return;
        deleteTemplate.mutate(confirmDelete.id, {
            onSuccess: () => {
                setConfirmDelete(null);
                showToast(__("Template deleted."));
            },
            onError: () => showToast(__("Could not delete the template."), "error"),
        });
    };

    const items = data ?? [];

    return (
        <>
            {isLoading ? (
                <TableSkeleton columns={3} />
            ) : items.length === 0 ? (
                <EmptyState
                    icon={Mail}
                    title={__("Design emails once")}
                    description={__("Build a template here, then pick it in a form's Notifications tab. Forms without a template use a clean default design.")}
                    action={
                        <Button onClick={onCreate} disabled={createTemplate.isPending}>
                            <Plus aria-hidden className="ff:h-4 ff:w-4" />
                            {__("New template")}
                        </Button>
                    }
                />
            ) : (
                <div className="ff:overflow-hidden ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white">
                    <table className="ff:w-full ff:border-collapse ff:text-sm">
                        <thead>
                            <tr className="ff:border-b ff:border-slate-200 ff:text-left ff:text-xs ff:uppercase ff:tracking-wide ff:text-slate-500">
                                <th className="ff:px-5 ff:py-3 ff:font-medium">{__("Template")}</th>
                                <th className="ff:px-5 ff:py-3 ff:font-medium">{__("Updated")}</th>
                                <th className="ff:px-5 ff:py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((template) => (
                                <tr
                                    key={template.id}
                                    className="ff:group ff:cursor-pointer ff:border-b ff:border-slate-100 ff:transition-colors ff:last:border-0 ff:hover:bg-slate-50"
                                    onClick={() => navigate(`/emails/${template.id}/edit`)}
                                >
                                    <td className="ff:px-5 ff:py-3.5 ff:font-medium ff:text-slate-900">
                                        {template.title || __("Untitled template")}
                                    </td>
                                    <td className="ff:px-5 ff:py-3.5 ff:text-slate-500">
                                        {formatDate(template.updated_at)}
                                    </td>
                                    <td className="ff:px-5 ff:py-3.5">
                                        <div
                                            className="ff:flex ff:justify-end ff:gap-1 ff:opacity-0 ff:transition-opacity ff:group-hover:opacity-100"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                aria-label={__("Edit template")}
                                                onClick={() => navigate(`/emails/${template.id}/edit`)}
                                            >
                                                <Pencil aria-hidden className="ff:h-4 ff:w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                aria-label={__("Duplicate template")}
                                                onClick={() => onDuplicate(template)}
                                            >
                                                <Copy aria-hidden className="ff:h-4 ff:w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                aria-label={__("Delete template")}
                                                className="ff:text-red-600 ff:hover:bg-red-50"
                                                onClick={() => setConfirmDelete(template)}
                                            >
                                                <Trash2 aria-hidden className="ff:h-4 ff:w-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Dialog open={confirmDelete !== null} onOpenChange={(open) => !open && setConfirmDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{__("Delete this template?")}</DialogTitle>
                        <DialogDescription>
                            {confirmDelete
                                ? sprintf(
                                      /* translators: %s: template title. */
                                      __('"%s" will be permanently deleted. Forms using it fall back to the default design.'),
                                      confirmDelete.title || __("Untitled template"),
                                  )
                                : ""}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmDelete(null)}>
                            {__("Cancel")}
                        </Button>
                        <Button variant="destructive" onClick={onDelete} disabled={deleteTemplate.isPending}>
                            {deleteTemplate.isPending ? __("Deleting…") : __("Delete template")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
