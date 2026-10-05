import { Inbox } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/custom/EmptyState";
import { TableSkeleton } from "@/components/custom/Skeletons";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { __ } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { navigate } from "@/lib/router";
import { useFormsList } from "@/features/forms/useForms";
import { formatDate } from "@/features/forms/FormsListPage";
import type { FormSummary } from "@/features/forms/types";
import { useEntriesList, useEntry } from "./useEntries";
import { EntryFields, entryExcerpt } from "./EntryFields";

export function EntriesPage() {
    const [formId, setFormId] = useState(0);
    const [status, setStatus] = useState("");
    const [peekId, setPeekId] = useState(0);

    const { data: formsData } = useFormsList({ per_page: 100 });
    const forms = formsData?.items ?? [];
    const { data, isLoading } = useEntriesList({
        form_id: formId || undefined,
        status: status || undefined,
        per_page: 50,
    });

    const items = data?.items ?? [];
    const filtered = formId !== 0 || status !== "";
    const formById = new Map(forms.map((f) => [f.id, f]));

    return (
        <div className="ff:flex ff:flex-col ff:gap-6 ff:p-6">
            <div className="ff:flex ff:items-center ff:justify-between ff:gap-4">
                <h1 className="ff:text-2xl ff:font-semibold ff:text-slate-900">{__("Entries")}</h1>
                <div className="ff:flex ff:items-center ff:gap-2">
                    <Select
                        aria-label={__("Filter by form")}
                        value={String(formId)}
                        options={[
                            { value: "0", label: __("All forms") },
                            ...forms.map((f) => ({ value: String(f.id), label: f.title || __("Untitled form") })),
                        ]}
                        onChange={(e) => setFormId(parseInt(e.target.value, 10) || 0)}
                    />
                    <Select
                        aria-label={__("Filter by status")}
                        value={status}
                        options={[
                            { value: "", label: __("All statuses") },
                            { value: "unread", label: __("Unread") },
                            { value: "read", label: __("Read") },
                        ]}
                        onChange={(e) => setStatus(e.target.value)}
                    />
                </div>
            </div>

            {isLoading ? (
                <TableSkeleton columns={3} />
            ) : items.length === 0 ? (
                filtered ? (
                    <EmptyState
                        icon={Inbox}
                        title={__("Nothing matches these filters.")}
                        description={__("Try a different form or status.")}
                        action={
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setFormId(0);
                                    setStatus("");
                                }}
                            >
                                {__("Clear filters")}
                            </Button>
                        }
                    />
                ) : (
                    <EmptyState
                        icon={Inbox}
                        title={__("Submissions will land here")}
                        description={__("Share or embed a published form to start collecting entries.")}
                    />
                )
            ) : (
                <div className="ff:overflow-hidden ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white">
                    <table className="ff:w-full ff:border-collapse ff:text-sm">
                        <thead>
                            <tr className="ff:border-b ff:border-slate-200 ff:text-left ff:text-xs ff:uppercase ff:tracking-wide ff:text-slate-500">
                                <th className="ff:px-5 ff:py-3 ff:font-medium">{__("Entry")}</th>
                                <th className="ff:px-5 ff:py-3 ff:font-medium">{__("Form")}</th>
                                <th className="ff:px-5 ff:py-3 ff:font-medium">{__("Received")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((entry) => (
                                <tr
                                    key={entry.id}
                                    onClick={() => setPeekId(entry.id)}
                                    className={cn(
                                        "ff:cursor-pointer ff:border-b ff:border-slate-100 ff:transition-colors ff:last:border-0 ff:hover:bg-slate-50",
                                        entry.status === "unread" && "ff:bg-brand-50/30",
                                    )}
                                >
                                    <td className="ff:px-5 ff:py-3.5">
                                        <div className="ff:flex ff:items-center ff:gap-2">
                                            {entry.status === "unread" ? (
                                                <span
                                                    aria-label={__("Unread")}
                                                    className="ff:h-2 ff:w-2 ff:shrink-0 ff:rounded-full ff:bg-brand-600"
                                                />
                                            ) : (
                                                <span className="ff:h-2 ff:w-2 ff:shrink-0" />
                                            )}
                                            <span
                                                className={cn(
                                                    "ff:truncate ff:text-slate-900",
                                                    entry.status === "unread" && "ff:font-semibold",
                                                )}
                                            >
                                                {entryExcerpt(entry, formById.get(entry.form_id))}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="ff:px-5 ff:py-3.5 ff:text-slate-600">
                                        {formById.get(entry.form_id)?.title ?? "#" + entry.form_id}
                                    </td>
                                    <td className="ff:px-5 ff:py-3.5 ff:text-slate-500">
                                        {formatDate(entry.created_at)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <PeekPanel entryId={peekId} form={undefined} forms={forms} onClose={() => setPeekId(0)} />
        </div>
    );
}

function PeekPanel({
    entryId,
    forms,
    onClose,
}: {
    entryId: number;
    form?: FormSummary;
    forms: FormSummary[];
    onClose: () => void;
}) {
    const { data: entry } = useEntry(entryId);
    const form = entry ? forms.find((f) => f.id === entry.form_id) : undefined;

    return (
        <Dialog open={entryId > 0} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                className={cn(
                    "ff:left-auto ff:right-0 ff:top-0 ff:h-full ff:max-w-md ff:translate-x-0 ff:translate-y-0 ff:gap-0 ff:overflow-y-auto ff:rounded-none ff:border-y-0 ff:border-r-0 ff:p-0",
                )}
            >
                <div className="ff:border-b ff:border-slate-200 ff:px-6 ff:py-4">
                    <DialogTitle>
                        {form ? form.title || __("Untitled form") : __("Entry")}
                    </DialogTitle>
                    <p className="ff:mt-0.5 ff:text-xs ff:text-slate-500">
                        {entry ? formatDate(entry.created_at) : ""}
                    </p>
                </div>
                <div className="ff:px-6 ff:py-5">
                    {entry ? (
                        <EntryFields entry={entry} form={form} />
                    ) : (
                        <div className="ff:h-32 ff:animate-pulse ff:rounded-lg ff:bg-slate-100" />
                    )}
                </div>
                <div className="ff:border-t ff:border-slate-200 ff:px-6 ff:py-4">
                    <Button
                        variant="outline"
                        onClick={() => {
                            onClose();
                            navigate(`/entries/${entryId}`);
                        }}
                    >
                        {__("Open full view")}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
