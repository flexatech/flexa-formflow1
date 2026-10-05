import { ArrowLeft, Eye, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { __ } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { navigate } from "@/lib/router";
import { SHOW_UPCOMING } from "@/lib/flags";
import { useUiStore } from "@/lib/store";
import { SaveToLibraryButton } from "@/features/library/SaveToLibrary";
import { EditorSkeleton } from "@/components/custom/Skeletons";
import { useForm, useSaveForm } from "../useForms";
import type { FormConfig, FormStatus } from "../types";
import { BuildTab } from "./BuildTab";
import { FormPreviewDialog } from "./FormPreviewDialog";
import { NotificationsTab } from "./NotificationsTab";
import { ShareTab } from "./ShareTab";

interface Draft {
    title: string;
    status: FormStatus;
    config: FormConfig;
}

type TabName = "build" | "notifications" | "share";

/**
 * Full-area takeover (no sidebar). Autosaves the whole draft 800ms after the
 * last change; the config document is owned by this one screen, so it is
 * always sent whole (unlike Settings' partial-merge).
 */
export function BuilderPage({ id }: { id: number }) {
    const { data: form, isLoading } = useForm(id);
    const save = useSaveForm(id);
    const showToast = useUiStore((s) => s.showToast);
    const setSelectedField = useUiStore((s) => s.setSelectedField);
    const [draft, setDraft] = useState<Draft | null>(null);
    const [tab, setTab] = useState<TabName>("build");
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewViewport, setPreviewViewport] = useState<"desktop" | "mobile">("desktop");
    const lastSaved = useRef("");

    useEffect(() => {
        if (form && draft === null) {
            const initial: Draft = { title: form.title, status: form.status, config: form.config };
            setDraft(initial);
            lastSaved.current = JSON.stringify(initial);
        }
    }, [form, draft]);

    // Leaving the builder clears the canvas selection.
    useEffect(() => () => setSelectedField(null), [setSelectedField]);

    useEffect(() => {
        if (!draft) return;
        const snapshot = JSON.stringify(draft);
        if (snapshot === lastSaved.current) return;
        const timer = window.setTimeout(() => {
            save.mutate(draft, {
                onSuccess: () => {
                    lastSaved.current = snapshot;
                },
                onError: () => showToast(__("Autosave failed. Your latest change is not stored yet."), "error"),
            });
        }, 800);
        return () => window.clearTimeout(timer);
        // save.mutate and showToast are referentially stable.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draft]);

    if (isLoading || !form || !draft) {
        return <EditorSkeleton />;
    }

    const dirty = JSON.stringify(draft) !== lastSaved.current;
    const patch = (partial: Partial<Draft>) => setDraft((prev) => (prev ? { ...prev, ...partial } : prev));
    const patchConfig = (config: FormConfig) => patch({ config });

    return (
        <div className="ff:flex ff:h-[calc(100vh-2rem)] ff:min-w-0 ff:flex-1 ff:flex-col ff:bg-slate-50">
            <header className="ff:flex ff:items-center ff:gap-3 ff:border-b ff:border-slate-200 ff:bg-white ff:px-4 ff:py-2.5">
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={__("Back to forms")}
                    onClick={() => navigate("/forms")}
                >
                    <ArrowLeft aria-hidden className="ff:h-4 ff:w-4" />
                </Button>
                <input
                    value={draft.title}
                    onChange={(e) => patch({ title: e.target.value })}
                    placeholder={__("Untitled form")}
                    aria-label={__("Form title")}
                    className={cn(
                        "flexa-formflow-bare-input",
                        "ff:min-w-0 ff:flex-1 ff:border-0 ff:bg-transparent ff:text-base ff:font-semibold ff:text-slate-900 ff:outline-none ff:placeholder:text-slate-400",
                    )}
                    spellCheck={false}
                />
                <SaveStatus state={save.isPending ? "saving" : dirty ? "dirty" : "saved"} />
                <label className="ff:flex ff:items-center ff:gap-2 ff:text-sm ff:font-medium ff:text-slate-700">
                    <Switch
                        checked={draft.status === "published"}
                        onCheckedChange={(next) => patch({ status: next ? "published" : "draft" })}
                    />
                    {draft.status === "published" ? __("Published") : __("Draft")}
                </label>
                {SHOW_UPCOMING && (
                    <SaveToLibraryButton
                        type="template"
                        kind="form"
                        defaultName={draft.title}
                        getPayload={() => draft.config as unknown as Record<string, unknown>}
                    />
                )}
                <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
                    <Eye aria-hidden className="ff:h-4 ff:w-4" />
                    {__("Preview")}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setTab("share")}>
                    <Share2 aria-hidden className="ff:h-4 ff:w-4" />
                    {__("Share")}
                </Button>
            </header>

            <nav className="ff:flex ff:gap-1 ff:border-b ff:border-slate-200 ff:bg-white ff:px-4">
                <TabButton active={tab === "build"} onClick={() => setTab("build")}>
                    {__("Build")}
                </TabButton>
                <TabButton active={tab === "notifications"} onClick={() => setTab("notifications")}>
                    {__("Notifications")}
                </TabButton>
                <TabButton active={tab === "share"} onClick={() => setTab("share")}>
                    {__("Share")}
                </TabButton>
            </nav>

            <div className="ff:min-h-0 ff:flex-1 ff:overflow-y-auto">
                {tab === "build" && <BuildTab config={draft.config} onChange={patchConfig} />}
                {tab === "notifications" && (
                    <NotificationsTab config={draft.config} onChange={patchConfig} />
                )}
                {tab === "share" && <ShareTab form={form} status={draft.status} />}
            </div>

            <FormPreviewDialog
                open={previewOpen}
                onOpenChange={setPreviewOpen}
                config={draft.config}
                title={draft.title}
                viewport={previewViewport}
                onViewportChange={setPreviewViewport}
            />
        </div>
    );
}

function SaveStatus({ state }: { state: "saving" | "dirty" | "saved" }) {
    return (
        <span
            className={cn(
                "ff:flex ff:items-center ff:gap-1.5 ff:whitespace-nowrap ff:text-xs ff:font-medium",
                state === "saved" ? "ff:text-emerald-600" : "ff:text-amber-600",
            )}
        >
            <span
                className={cn(
                    "ff:h-1.5 ff:w-1.5 ff:rounded-full",
                    state === "saved" ? "ff:bg-emerald-500" : "ff:animate-pulse ff:bg-amber-500",
                )}
            />
            {state === "saving" ? __("Saving…") : state === "dirty" ? __("Unsaved changes") : __("Saved")}
        </span>
    );
}

function TabButton({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "ff:-mb-px ff:cursor-pointer ff:border-b-2 ff:bg-transparent ff:px-3 ff:py-2.5 ff:text-sm ff:font-medium ff:transition-colors",
                active
                    ? "ff:border-brand-600 ff:text-brand-700"
                    : "ff:border-transparent ff:text-slate-500 ff:hover:text-slate-800",
            )}
        >
            {children}
        </button>
    );
}
