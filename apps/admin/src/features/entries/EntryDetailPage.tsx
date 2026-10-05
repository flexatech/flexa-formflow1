import { ArrowLeft, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { __ } from "@/lib/i18n";
import { navigate } from "@/lib/router";
import { useUiStore } from "@/lib/store";
import { useFormsList } from "@/features/forms/useForms";
import { formatDate } from "@/features/forms/FormsListPage";
import { useDeleteEntry, useEntry } from "./useEntries";
import { EntryFields } from "./EntryFields";
import type { ActivityEvent } from "@/features/forms/types";

export function EntryDetailPage({ id }: { id: number }) {
    const { data: entry, isLoading } = useEntry(id);
    const { data: formsData } = useFormsList({ per_page: 100 });
    const deleteEntry = useDeleteEntry();
    const showToast = useUiStore((s) => s.showToast);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const form = entry ? formsData?.items.find((f) => f.id === entry.form_id) : undefined;

    const onDelete = () => {
        deleteEntry.mutate(id, {
            onSuccess: () => {
                showToast(__("Entry deleted."));
                navigate("/entries");
            },
            onError: () => showToast(__("Could not delete the entry."), "error"),
        });
    };

    if (isLoading || !entry) {
        return (
            <div className="ff:flex ff:flex-col ff:gap-6 ff:p-6">
                <div className="ff:flex ff:items-center ff:gap-2">
                    <Skeleton className="ff:h-9 ff:w-9 ff:rounded-md" />
                    <div className="ff:flex ff:flex-col ff:gap-2">
                        <Skeleton className="ff:h-6 ff:w-48" />
                        <Skeleton className="ff:h-3 ff:w-32" />
                    </div>
                </div>
                <div className="ff:grid ff:gap-4 ff:lg:grid-cols-[2fr_1fr]">
                    <div className="ff:flex ff:flex-col ff:gap-4 ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:p-5">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="ff:flex ff:flex-col ff:gap-2">
                                <Skeleton className="ff:h-3 ff:w-24" />
                                <Skeleton className="ff:h-4 ff:w-full ff:max-w-md" />
                            </div>
                        ))}
                    </div>
                    <div className="ff:flex ff:h-fit ff:flex-col ff:gap-3 ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:p-5">
                        <Skeleton className="ff:h-4 ff:w-24" />
                        <Skeleton className="ff:h-3 ff:w-full" />
                        <Skeleton className="ff:h-3 ff:w-2/3" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="ff:flex ff:flex-col ff:gap-6 ff:p-6">
            <div className="ff:flex ff:items-center ff:justify-between ff:gap-4">
                <div className="ff:flex ff:items-center ff:gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={__("Back to entries")}
                        onClick={() => navigate("/entries")}
                    >
                        <ArrowLeft aria-hidden className="ff:h-4 ff:w-4" />
                    </Button>
                    <div>
                        <h1 className="ff:text-2xl ff:font-semibold ff:text-slate-900">
                            {form ? form.title || __("Untitled form") : __("Entry")}
                        </h1>
                        <p className="ff:text-sm ff:text-slate-500">{formatDate(entry.created_at)}</p>
                    </div>
                </div>
                <Button variant="outline" className="ff:text-red-600" onClick={() => setConfirmOpen(true)}>
                    <Trash2 aria-hidden className="ff:h-4 ff:w-4" />
                    {__("Delete")}
                </Button>
            </div>

            <div className="ff:grid ff:gap-4 ff:lg:grid-cols-[2fr_1fr]">
                <div className="ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:p-5">
                    <EntryFields entry={entry} form={form} />
                </div>
                <div className="ff:flex ff:h-fit ff:flex-col ff:gap-4">
                    <div className="ff:flex ff:flex-col ff:gap-3 ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:p-5">
                        <h2 className="ff:text-sm ff:font-semibold ff:text-slate-900">{__("Details")}</h2>
                        <MetaRow label={__("Received")} value={formatDate(entry.created_at)} />
                        {entry.meta.referer ? <MetaRow label={__("Page")} value={entry.meta.referer} /> : null}
                        {entry.meta.user_agent ? (
                            <MetaRow label={__("Browser")} value={entry.meta.user_agent} />
                        ) : null}
                    </div>
                    <ActivityTimeline events={entry.meta.activity ?? []} />
                </div>
            </div>

            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{__("Delete this entry?")}</DialogTitle>
                        <DialogDescription>
                            {__("The submission and its data will be permanently deleted.")}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                            {__("Cancel")}
                        </Button>
                        <Button variant="destructive" onClick={onDelete} disabled={deleteEntry.isPending}>
                            {deleteEntry.isPending ? __("Deleting…") : __("Delete entry")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function ActivityTimeline({ events }: { events: ActivityEvent[] }) {
    return (
        <div className="ff:flex ff:flex-col ff:gap-3 ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:p-5">
            <h2 className="ff:text-sm ff:font-semibold ff:text-slate-900">{__("Activity")}</h2>
            {events.length === 0 ? (
                <p className="ff:text-sm ff:text-slate-500">{__("No delivery activity recorded yet.")}</p>
            ) : (
                <ol className="ff:flex ff:flex-col ff:gap-3">
                    {events
                        .slice()
                        .reverse()
                        .map((event, i) => (
                            <li key={i} className="ff:flex ff:gap-3">
                                <span className="ff:mt-1.5 ff:h-2 ff:w-2 ff:shrink-0 ff:rounded-full ff:bg-brand-400" aria-hidden />
                                <div className="ff:min-w-0">
                                    <p className="ff:text-sm ff:text-slate-700">{event.label}</p>
                                    <p className="ff:text-xs ff:text-slate-400">{formatDate(event.at)}</p>
                                </div>
                            </li>
                        ))}
                </ol>
            )}
        </div>
    );
}

function MetaRow({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="ff:text-xs ff:font-medium ff:uppercase ff:tracking-wide ff:text-slate-400">{label}</p>
            <p className="ff:mt-0.5 ff:break-words ff:text-sm ff:text-slate-700">{value}</p>
        </div>
    );
}
