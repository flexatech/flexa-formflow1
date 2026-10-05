import { Pencil, Plus, Trash2, Workflow as WorkflowIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/custom/EmptyState";
import { CardListSkeleton } from "@/components/custom/Skeletons";
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
    useCreateWorkflow,
    useDeleteWorkflow,
    useSaveWorkflow,
    useWorkflows,
    type Workflow,
} from "./useWorkflows";

export function WorkflowsListPage() {
    const { data, isLoading } = useWorkflows();
    const createWorkflow = useCreateWorkflow();
    const deleteWorkflow = useDeleteWorkflow();
    const showToast = useUiStore((s) => s.showToast);
    const [confirmDelete, setConfirmDelete] = useState<Workflow | null>(null);

    const onCreate = () => {
        createWorkflow.mutate(__("Untitled workflow"), {
            onSuccess: (workflow) => {
                if (workflow?.id) {
                    navigate(`/workflows/${workflow.id}/edit`);
                } else {
                    showToast(__("Could not create the workflow."), "error");
                }
            },
            onError: () => showToast(__("Could not create the workflow."), "error"),
        });
    };

    const onDelete = () => {
        if (!confirmDelete) return;
        deleteWorkflow.mutate(confirmDelete.id, {
            onSuccess: () => {
                setConfirmDelete(null);
                showToast(__("Workflow deleted."));
            },
            onError: () => showToast(__("Could not delete the workflow."), "error"),
        });
    };

    const items = data?.items ?? [];
    const forms = data?.forms ?? [];
    const formTitle = (formId: number) =>
        formId === 0 ? __("Any form") : forms.find((f) => f.id === formId)?.title ?? __("A form");

    return (
        <div className="ff:flex ff:flex-col ff:gap-6 ff:p-6">
            <div className="ff:flex ff:items-center ff:justify-between ff:gap-4">
                <div>
                    <h1 className="ff:text-2xl ff:font-semibold ff:text-slate-900">{__("Workflows")}</h1>
                    <p className="ff:mt-1 ff:text-sm ff:text-slate-500">
                        {__("Run actions automatically when a form is submitted: send an email, call a webhook, mark the entry read.")}
                    </p>
                </div>
                <Button onClick={onCreate} disabled={createWorkflow.isPending}>
                    <Plus aria-hidden className="ff:h-4 ff:w-4" />
                    {__("New workflow")}
                </Button>
            </div>

            {isLoading ? (
                <CardListSkeleton />
            ) : items.length === 0 ? (
                <EmptyState
                    icon={WorkflowIcon}
                    title={__("Automate what happens after a submit")}
                    description={__("A workflow watches for submissions and runs a chain of actions. Start with a notification email or a webhook to another app.")}
                    action={
                        <Button onClick={onCreate} disabled={createWorkflow.isPending}>
                            <Plus aria-hidden className="ff:h-4 ff:w-4" />
                            {__("New workflow")}
                        </Button>
                    }
                />
            ) : (
                <div className="ff:flex ff:flex-col ff:gap-3">
                    {items.map((workflow) => (
                        <WorkflowRow
                            key={workflow.id}
                            workflow={workflow}
                            triggerLabel={formTitle(workflow.trigger.form_id)}
                            onDelete={() => setConfirmDelete(workflow)}
                        />
                    ))}
                </div>
            )}

            <Dialog open={confirmDelete !== null} onOpenChange={(open) => !open && setConfirmDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{__("Delete this workflow?")}</DialogTitle>
                        <DialogDescription>
                            {confirmDelete
                                ? sprintf(
                                      /* translators: %s: workflow title. */
                                      __('"%s" will be permanently deleted.'),
                                      confirmDelete.title || __("Untitled workflow"),
                                  )
                                : ""}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmDelete(null)}>
                            {__("Cancel")}
                        </Button>
                        <Button variant="destructive" onClick={onDelete} disabled={deleteWorkflow.isPending}>
                            {deleteWorkflow.isPending ? __("Deleting…") : __("Delete workflow")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function WorkflowRow({
    workflow,
    triggerLabel,
    onDelete,
}: {
    workflow: Workflow;
    triggerLabel: string;
    onDelete: () => void;
}) {
    const save = useSaveWorkflow(workflow.id);
    const active = workflow.status === "active";

    const toggle = () => {
        save.mutate({ status: active ? "inactive" : "active" });
    };

    return (
        <section className="ff:group ff:flex ff:items-center ff:gap-4 ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:px-5 ff:py-4">
            <button
                type="button"
                onClick={toggle}
                disabled={save.isPending}
                className={
                    active
                        ? "ff:rounded-full ff:bg-emerald-50 ff:px-2.5 ff:py-1 ff:text-xs ff:font-medium ff:text-emerald-700 ff:ring-1 ff:ring-emerald-200"
                        : "ff:rounded-full ff:bg-slate-100 ff:px-2.5 ff:py-1 ff:text-xs ff:font-medium ff:text-slate-500 ff:ring-1 ff:ring-slate-200"
                }
            >
                {active ? __("Active") : __("Inactive")}
            </button>
            <button
                type="button"
                className="ff:min-w-0 ff:flex-1 ff:text-left"
                onClick={() => navigate(`/workflows/${workflow.id}/edit`)}
            >
                <div className="ff:text-sm ff:font-semibold ff:text-slate-900">
                    {workflow.title || __("Untitled workflow")}
                </div>
                <div className="ff:mt-0.5 ff:text-xs ff:text-slate-500">
                    {sprintf(
                        /* translators: 1: form name, 2: number of actions. */
                        __("When %1$s is submitted · %2$d action(s)"),
                        triggerLabel,
                        workflow.actions.length,
                    )}
                    {" · "}
                    {formatDate(workflow.updated_at)}
                </div>
            </button>
            <div className="ff:flex ff:gap-1 ff:opacity-0 ff:transition-opacity ff:group-hover:opacity-100">
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={__("Edit workflow")}
                    onClick={() => navigate(`/workflows/${workflow.id}/edit`)}
                >
                    <Pencil aria-hidden className="ff:h-4 ff:w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={__("Delete workflow")}
                    className="ff:text-red-600 ff:hover:bg-red-50"
                    onClick={onDelete}
                >
                    <Trash2 aria-hidden className="ff:h-4 ff:w-4" />
                </Button>
            </div>
        </section>
    );
}
