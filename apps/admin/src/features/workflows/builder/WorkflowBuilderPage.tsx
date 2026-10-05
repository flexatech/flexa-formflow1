import {
    ArrowDown,
    ArrowLeft,
    ArrowUp,
    BookMarked,
    CheckCheck,
    Filter,
    History,
    Mail,
    Play,
    Plus,
    StickyNote,
    Trash2,
    Webhook,
    Zap,
    type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SchemaFields } from "@/components/custom/SchemaFields";
import { Skeleton } from "@/components/ui/skeleton";
import { __, sprintf } from "@/lib/i18n";
import { extensionIcon, integrationConnections, workflowActionTypes } from "@/lib/extensions";
import { navigate } from "@/lib/router";
import { SHOW_UPCOMING } from "@/lib/flags";
import { useUiStore } from "@/lib/store";
import { SaveToLibraryButton } from "@/features/library/SaveToLibrary";
import type { ExtensionWorkflowAction } from "@/lib/wp";
import {
    useSaveWorkflow,
    useTestWorkflow,
    useWorkflow,
    useWorkflowRuns,
    useWorkflows,
    type ActionResult,
    type ConditionOperator,
    type FormOption,
    type TemplateOption,
    type WorkflowAction,
    type WorkflowCondition,
    type WorkflowRun,
} from "../useWorkflows";

interface Draft {
    title: string;
    status: "active" | "inactive";
    triggerFormId: number;
    /** Null when the workflow has no gate; Free allows exactly one. */
    condition: WorkflowCondition | null;
    actions: WorkflowAction[];
}

/** Plain-language operator labels for the single Free condition. */
const OPERATORS: { value: ConditionOperator; label: () => string; needsValue: boolean }[] = [
    { value: "equals", label: () => __("is"), needsValue: true },
    { value: "not_equals", label: () => __("is not"), needsValue: true },
    { value: "contains", label: () => __("contains"), needsValue: true },
    { value: "not_empty", label: () => __("is filled in"), needsValue: false },
    { value: "is_empty", label: () => __("is empty"), needsValue: false },
];

const ACTION_META: Record<string, { label: string; icon: LucideIcon; defaults: Record<string, unknown> }> = {
    send_email: {
        label: __("Send email"),
        icon: Mail,
        defaults: { to_mode: "admin", to: "", subject: "", template_id: 0, message: "" },
    },
    webhook: {
        label: __("Send webhook"),
        icon: Webhook,
        defaults: { url: "" },
    },
    set_status: {
        label: __("Set entry status"),
        icon: CheckCheck,
        defaults: { status: "read" },
    },
    add_note: {
        label: __("Add note"),
        icon: StickyNote,
        defaults: { note: "" },
    },
};

const ACTION_ORDER = ["send_email", "webhook", "set_status", "add_note"];

/** Extension-registered node type (an add-on), or undefined for a built-in. */
function extActionByType(type: string): ExtensionWorkflowAction | undefined {
    return workflowActionTypes().find((a) => a.type === type);
}

/** Label + icon for any node type, built-in or extension, with a safe fallback. */
function metaFor(type: string): { label: string; icon: LucideIcon } {
    if (type === "condition") return { label: __("Condition"), icon: Filter };
    const builtin = ACTION_META[type];
    if (builtin) return { label: builtin.label, icon: builtin.icon };
    const ext = extActionByType(type);
    if (ext) return { label: ext.label, icon: extensionIcon(ext.icon) };
    return { label: type, icon: Mail };
}

/** A plain-language title for an action card, built from its config. */
function describeAction(action: WorkflowAction): string {
    const cfg = action.config;
    const str = (key: string) => (typeof cfg[key] === "string" ? (cfg[key] as string) : "");
    switch (action.type) {
        case "send_email": {
            const subject = str("subject").trim();
            return subject ? sprintf(__('Send email: "%s"'), subject) : __("Send email");
        }
        case "webhook": {
            const url = str("url").trim();
            return url ? sprintf(__("Send webhook to %s"), hostOf(url)) : __("Send webhook");
        }
        case "set_status":
            return sprintf(__("Mark entry as %s"), str("status") || __("read"));
        case "add_note":
            return __("Add an internal note");
        default:
            return metaFor(action.type).label;
    }
}

/** Best-effort host for the webhook sentence; falls back to the raw string. */
function hostOf(url: string): string {
    try {
        return new URL(url).host || url;
    } catch {
        return url;
    }
}

function extDefaults(ext: ExtensionWorkflowAction | undefined): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const field of ext?.fields ?? []) {
        if (field.default !== undefined) out[field.key] = field.default;
    }
    return out;
}

let actionCounter = 0;
function newAction(type: string): WorkflowAction {
    actionCounter += 1;
    const builtin = ACTION_META[type];
    return {
        id: `a_${Date.now().toString(36)}${actionCounter}`,
        type,
        config: builtin ? { ...builtin.defaults } : extDefaults(extActionByType(type)),
    };
}

export function WorkflowBuilderPage({ id }: { id: number }) {
    const { data: workflow, isLoading } = useWorkflow(id);
    const { data: index } = useWorkflows();
    const save = useSaveWorkflow(id);
    const test = useTestWorkflow(id);
    const showToast = useUiStore((s) => s.showToast);

    const [draft, setDraft] = useState<Draft | null>(null);
    const [testLog, setTestLog] = useState<ActionResult[] | null>(null);
    const [testNote, setTestNote] = useState<string>("");
    const [tab, setTab] = useState<"build" | "logs">("build");
    // Destination held back by the unsaved-changes guard; null means no prompt.
    const [pendingNav, setPendingNav] = useState<string | null>(null);

    useEffect(() => {
        if (workflow && draft === null) {
            const cond = workflow.condition;
            setDraft({
                title: workflow.title,
                status: workflow.status,
                triggerFormId: workflow.trigger.form_id,
                condition: cond && "field" in cond ? (cond as WorkflowCondition) : null,
                actions: workflow.actions,
            });
        }
    }, [workflow, draft]);

    const forms = index?.forms ?? [];
    const templates = index?.templates ?? [];

    const dirty = useMemo(() => {
        if (!workflow || !draft) return false;
        const savedCondition = workflow.condition && "field" in workflow.condition ? workflow.condition : null;
        return (
            draft.title !== workflow.title ||
            draft.status !== workflow.status ||
            draft.triggerFormId !== workflow.trigger.form_id ||
            JSON.stringify(draft.condition) !== JSON.stringify(savedCondition) ||
            JSON.stringify(draft.actions) !== JSON.stringify(workflow.actions)
        );
    }, [workflow, draft]);

    if (isLoading || !draft) {
        return (
            <div className="ff:flex ff:min-h-screen ff:flex-1 ff:flex-col ff:bg-slate-50">
                <header className="ff:flex ff:items-center ff:gap-3 ff:border-b ff:border-slate-200 ff:bg-white ff:px-5 ff:py-3">
                    <Skeleton className="ff:h-9 ff:w-9 ff:rounded-md" />
                    <Skeleton className="ff:h-5 ff:w-48" />
                    <div className="ff:flex ff:flex-1 ff:justify-end ff:gap-2">
                        <Skeleton className="ff:h-8 ff:w-20 ff:rounded-md" />
                        <Skeleton className="ff:h-8 ff:w-24 ff:rounded-md" />
                    </div>
                </header>
                <div className="ff:mx-auto ff:w-full ff:max-w-2xl ff:px-4 ff:py-8">
                    <div className="ff:flex ff:flex-col ff:gap-4 ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:p-6">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="ff:flex ff:flex-col ff:gap-2">
                                <Skeleton className="ff:h-3 ff:w-28" />
                                <Skeleton className="ff:h-9 ff:w-full ff:rounded-md" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const persist = (next: Draft) =>
        save.mutateAsync({
            title: next.title,
            status: next.status,
            config: {
                trigger: { type: "form_submitted", form_id: next.triggerFormId },
                condition: next.condition ?? {},
                actions: next.actions,
            },
        });

    const onSave = () => {
        persist(draft)
            .then(() => showToast(__("Workflow saved.")))
            .catch((error) =>
                showToast(error instanceof Error ? error.message : __("Could not save."), "error"),
            );
    };

    // Route through the unsaved-changes prompt before leaving the builder.
    const guardedNavigate = (to: string) => {
        if (dirty) {
            setPendingNav(to);
        } else {
            navigate(to);
        }
    };

    const leaveWithoutSaving = () => {
        const to = pendingNav;
        setPendingNav(null);
        if (to) navigate(to);
    };

    const saveThenLeave = () => {
        const to = pendingNav;
        persist(draft)
            .then(() => {
                setPendingNav(null);
                if (to) navigate(to);
            })
            .catch((error) =>
                showToast(error instanceof Error ? error.message : __("Could not save."), "error"),
            );
    };

    const onTest = async () => {
        try {
            if (dirty) {
                await persist(draft);
            }
            const result = await test.mutateAsync();
            setTestLog(result.log);
            setTestNote(result.ran ? "" : result.note ?? "");
        } catch (error) {
            showToast(error instanceof Error ? error.message : __("Test run failed."), "error");
        }
    };

    const updateAction = (actionId: string, configPatch: Record<string, unknown>) =>
        setDraft({
            ...draft,
            actions: draft.actions.map((a) =>
                a.id === actionId ? { ...a, config: { ...a.config, ...configPatch } } : a,
            ),
        });

    const removeAction = (actionId: string) =>
        setDraft({ ...draft, actions: draft.actions.filter((a) => a.id !== actionId) });

    const moveAction = (indexAt: number, delta: number) => {
        const target = indexAt + delta;
        if (target < 0 || target >= draft.actions.length) return;
        const actions = [...draft.actions];
        const [moved] = actions.splice(indexAt, 1);
        actions.splice(target, 0, moved);
        setDraft({ ...draft, actions });
    };

    const addAction = (type: string) => setDraft({ ...draft, actions: [...draft.actions, newAction(type)] });

    const triggerForm = forms.find((f) => f.id === draft.triggerFormId);

    const addCondition = () => {
        const first = triggerForm?.fields[0];
        setDraft({
            ...draft,
            condition: { field: first?.id ?? "", operator: "equals", value: "" },
        });
    };

    const updateCondition = (patch: Partial<WorkflowCondition>) =>
        setDraft({ ...draft, condition: draft.condition ? { ...draft.condition, ...patch } : draft.condition });

    const removeCondition = () => setDraft({ ...draft, condition: null });

    // Align the flat run log back onto the nodes so each step shows its result.
    const run = testLog ? mapRun(testLog, draft) : null;

    return (
        <div className="ff:flex ff:min-h-screen ff:flex-1 ff:flex-col ff:bg-slate-50">
            <header className="ff:sticky ff:top-8 ff:z-10 ff:flex ff:items-center ff:gap-3 ff:border-b ff:border-slate-200 ff:bg-white ff:px-5 ff:py-3">
                <Button variant="ghost" size="icon" aria-label={__("Back")} onClick={() => guardedNavigate("/workflows")}>
                    <ArrowLeft aria-hidden className="ff:h-4 ff:w-4" />
                </Button>
                <Input
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    className="ff:max-w-xs ff:font-medium"
                    placeholder={__("Workflow name")}
                />
                <div className="ff:flex ff:flex-1 ff:items-center ff:justify-end ff:gap-3">
                    <label className="ff:flex ff:items-center ff:gap-2 ff:text-sm ff:text-slate-600">
                        {draft.status === "active" ? __("Active") : __("Inactive")}
                        <Switch
                            checked={draft.status === "active"}
                            onCheckedChange={(on) => setDraft({ ...draft, status: on ? "active" : "inactive" })}
                        />
                    </label>
                    {SHOW_UPCOMING && (
                        <SaveToLibraryButton
                            type="recipe"
                            kind="workflow"
                            defaultName={draft.title}
                            getPayload={() => ({
                                trigger: { type: "form_submitted", form_id: draft.triggerFormId },
                                actions: draft.actions,
                            })}
                        />
                    )}
                    <Button variant="outline" onClick={onTest} disabled={test.isPending || save.isPending}>
                        <Play aria-hidden className="ff:h-4 ff:w-4" />
                        {test.isPending ? __("Running…") : __("Run test")}
                    </Button>
                    <Button onClick={onSave} disabled={!dirty || save.isPending}>
                        {save.isPending ? __("Saving…") : __("Save")}
                    </Button>
                </div>
            </header>

            <nav className="ff:flex ff:gap-1 ff:border-b ff:border-slate-200 ff:bg-white ff:px-5">
                <TabButton active={tab === "build"} onClick={() => setTab("build")}>
                    {__("Build")}
                </TabButton>
                <TabButton active={tab === "logs"} onClick={() => setTab("logs")}>
                    {__("Logs")}
                </TabButton>
            </nav>

            {tab === "logs" ? (
                <LogsPanel workflowId={id} active={tab === "logs"} />
            ) : (
            <div className="ff:mx-auto ff:flex ff:w-full ff:max-w-xl ff:flex-col ff:items-stretch ff:gap-0 ff:px-4 ff:py-8">
                <TriggerNode
                    forms={forms}
                    formId={draft.triggerFormId}
                    onChange={(formId) => setDraft({ ...draft, triggerFormId: formId })}
                />

                {draft.condition && (
                    <div className="ff:flex ff:flex-col ff:items-stretch">
                        <Connector />
                        <ConditionNode
                            condition={draft.condition}
                            triggerForm={triggerForm}
                            result={run?.condition ?? null}
                            onChange={updateCondition}
                            onRemove={removeCondition}
                        />
                    </div>
                )}

                {draft.actions.map((action, i) => (
                    <div key={action.id} className="ff:flex ff:flex-col ff:items-stretch">
                        <Connector />
                        <ActionNode
                            action={action}
                            forms={forms}
                            templates={templates}
                            triggerFormId={draft.triggerFormId}
                            result={run?.actions[i] ?? null}
                            isFirst={i === 0}
                            isLast={i === draft.actions.length - 1}
                            onUp={() => moveAction(i, -1)}
                            onDown={() => moveAction(i, 1)}
                            onRemove={() => removeAction(action.id)}
                            onChange={(patch) => updateAction(action.id, patch)}
                        />
                    </div>
                ))}

                <Connector />
                <Palette
                    onAdd={addAction}
                    onAddCondition={addCondition}
                    canAddCondition={draft.condition === null}
                    onBrowseRecipes={() => guardedNavigate("/library")}
                />

                {testNote !== "" && (
                    <div className="ff:mt-8 ff:rounded-xl ff:border ff:border-amber-200 ff:bg-amber-50 ff:p-4 ff:text-sm ff:text-amber-800">
                        {testNote}
                    </div>
                )}
                {testLog !== null && testNote === "" && (
                    <p className="ff:mt-6 ff:text-center ff:text-xs ff:text-slate-400">
                        {testLog.length === 0
                            ? __("Test run complete. This workflow has no steps to run yet.")
                            : __("Test run complete. Each step above shows its result.")}
                    </p>
                )}
            </div>
            )}

            <Dialog open={pendingNav !== null} onOpenChange={(open) => !open && setPendingNav(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{__("Unsaved changes")}</DialogTitle>
                        <DialogDescription>
                            {__("You have changes that are not saved yet. Leave this workflow anyway?")}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setPendingNav(null)}>
                            {__("Stay")}
                        </Button>
                        <Button variant="outline" onClick={leaveWithoutSaving}>
                            {__("Leave without saving")}
                        </Button>
                        <Button onClick={saveThenLeave} disabled={save.isPending}>
                            {save.isPending ? __("Saving…") : __("Save and leave")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
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
            className={
                active
                    ? "ff:-mb-px ff:cursor-pointer ff:border-b-2 ff:border-brand-600 ff:bg-transparent ff:px-3 ff:py-2.5 ff:text-sm ff:font-medium ff:text-brand-700"
                    : "ff:-mb-px ff:cursor-pointer ff:border-b-2 ff:border-transparent ff:bg-transparent ff:px-3 ff:py-2.5 ff:text-sm ff:font-medium ff:text-slate-500 ff:transition-colors ff:hover:text-slate-800"
            }
        >
            {children}
        </button>
    );
}

/** Live run history (the Logs tab). Newest first; each run expands to its steps. */
function LogsPanel({ workflowId, active }: { workflowId: number; active: boolean }) {
    const { data, isLoading } = useWorkflowRuns(workflowId, active);
    const runs = data?.items ?? [];

    if (isLoading) {
        return (
            <div className="ff:mx-auto ff:flex ff:w-full ff:max-w-2xl ff:flex-col ff:gap-3 ff:px-4 ff:py-8">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        className="ff:flex ff:items-center ff:gap-3 ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:px-4 ff:py-3"
                    >
                        <Skeleton className="ff:h-8 ff:w-8 ff:shrink-0 ff:rounded-full" />
                        <Skeleton className="ff:h-4 ff:flex-1" />
                        <Skeleton className="ff:h-3 ff:w-20 ff:shrink-0" />
                    </div>
                ))}
            </div>
        );
    }

    if (runs.length === 0) {
        return (
            <div className="ff:mx-auto ff:w-full ff:max-w-2xl ff:px-4 ff:py-16 ff:text-center">
                <span className="ff:mx-auto ff:mb-3 ff:flex ff:h-11 ff:w-11 ff:items-center ff:justify-center ff:rounded-full ff:bg-slate-100 ff:text-slate-400">
                    <History aria-hidden className="ff:h-5 ff:w-5" />
                </span>
                <p className="ff:text-sm ff:font-medium ff:text-slate-700">{__("No runs yet")}</p>
                <p className="ff:mx-auto ff:mt-1 ff:max-w-sm ff:text-sm ff:text-slate-500">
                    {__("Each time the live form fires this workflow, the run is logged here. Test runs are not recorded.")}
                </p>
            </div>
        );
    }

    return (
        <div className="ff:mx-auto ff:flex ff:w-full ff:max-w-2xl ff:flex-col ff:gap-2 ff:px-4 ff:py-8">
            <p className="ff:mb-1 ff:text-xs ff:text-slate-400">
                {sprintf(__("Showing the %d most recent runs."), runs.length)}
            </p>
            {runs.map((run) => (
                <RunRow key={run.id} run={run} />
            ))}
        </div>
    );
}

const RUN_STATUS: Record<WorkflowRun["status"], { label: () => string; dot: string; text: string }> = {
    ok: { label: () => __("Ran"), dot: "ff:bg-emerald-500", text: "ff:text-emerald-700" },
    skipped: { label: () => __("Skipped"), dot: "ff:bg-slate-400", text: "ff:text-slate-600" },
    error: { label: () => __("Error"), dot: "ff:bg-red-500", text: "ff:text-red-700" },
};

function RunRow({ run }: { run: WorkflowRun }) {
    const [open, setOpen] = useState(false);
    const meta = RUN_STATUS[run.status] ?? RUN_STATUS.ok;
    const steps = run.log.filter((s) => s.type !== "condition");

    return (
        <section className="ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:shadow-sm">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="ff:flex ff:w-full ff:cursor-pointer ff:items-center ff:gap-3 ff:bg-transparent ff:px-4 ff:py-3 ff:text-left"
            >
                <span className={`ff:h-2 ff:w-2 ff:shrink-0 ff:rounded-full ${meta.dot}`} aria-hidden />
                <span className={`ff:text-sm ff:font-medium ${meta.text}`}>{meta.label()}</span>
                <span className="ff:min-w-0 ff:flex-1 ff:truncate ff:text-sm ff:text-slate-500">
                    {formatRunTime(run.created_at)}
                </span>
                <span className="ff:text-xs ff:text-slate-400 ff:tabular-nums">
                    {sprintf(__("%d steps"), steps.length)}
                </span>
            </button>
            {open && (
                <div className="ff:flex ff:flex-col ff:gap-2 ff:border-t ff:border-slate-100 ff:px-4 ff:py-3">
                    {run.log.length === 0 ? (
                        <p className="ff:text-xs ff:text-slate-400">{__("No steps ran.")}</p>
                    ) : (
                        run.log.map((step, i) => (
                            <div key={i} className="ff:flex ff:items-start ff:gap-2">
                                <span className="ff:mt-1">
                                    <StatusDot status={step.status} />
                                </span>
                                <div className="ff:min-w-0 ff:flex-1">
                                    <span className="ff:text-xs ff:font-medium ff:text-slate-600">
                                        {metaFor(step.type).label}
                                    </span>
                                    <p className="ff:text-xs ff:text-slate-500">{step.detail}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </section>
    );
}

/** Format a UTC "YYYY-MM-DD HH:MM:SS" run timestamp in the browser's locale. */
function formatRunTime(mysqlUtc: string): string {
    const iso = mysqlUtc.replace(" ", "T") + "Z";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return mysqlUtc;
    }
    return date.toLocaleString();
}

function Connector() {
    return <div className="ff:mx-auto ff:h-6 ff:w-px ff:bg-slate-300" />;
}

function StatusDot({ status }: { status: ActionResult["status"] }) {
    const color =
        status === "ok" ? "ff:bg-emerald-500" : status === "error" ? "ff:bg-red-500" : "ff:bg-slate-300";
    return <span className={`ff:h-2 ff:w-2 ff:shrink-0 ff:rounded-full ${color}`} aria-hidden />;
}

/**
 * Realign the flat run log onto the canvas nodes. The engine logs the condition
 * (when present) first, then each action in order, so a single cursor walks the
 * log alongside the draft. A short log (condition not met) leaves later actions
 * with no result, which the nodes render as "not run".
 */
function mapRun(log: ActionResult[], draft: Draft): { condition: ActionResult | null; actions: (ActionResult | null)[] } {
    let cursor = 0;
    const condition = draft.condition && log[0]?.type === "condition" ? log[cursor++] : null;
    const actions = draft.actions.map((_, i) => log[cursor + i] ?? null);
    return { condition, actions };
}

/** The per-node result badge shown on the canvas after a test run. */
function NodeStatus({ result }: { result: ActionResult | null }) {
    if (!result) {
        return null;
    }
    return (
        <span className="ff:flex ff:items-center ff:gap-1.5 ff:text-xs ff:text-slate-500">
            <StatusDot status={result.status} />
            {result.detail}
        </span>
    );
}

function TriggerNode({
    forms,
    formId,
    onChange,
}: {
    forms: FormOption[];
    formId: number;
    onChange: (formId: number) => void;
}) {
    const options = [
        { value: "0", label: __("Any form") },
        ...forms.map((f) => ({ value: String(f.id), label: f.title || __("Untitled form") })),
    ];
    return (
        <section className="ff:rounded-xl ff:border ff:border-brand-200 ff:bg-white ff:p-4 ff:shadow-sm">
            <div className="ff:mb-3 ff:flex ff:items-center ff:gap-2">
                <span className="ff:flex ff:h-8 ff:w-8 ff:items-center ff:justify-center ff:rounded-lg ff:bg-brand-50 ff:text-brand-600">
                    <Zap aria-hidden className="ff:h-4 ff:w-4" />
                </span>
                <div>
                    <div className="ff:text-sm ff:font-semibold ff:text-slate-900">{__("When a form is submitted")}</div>
                    <div className="ff:text-xs ff:text-slate-500">{__("The trigger that starts this workflow")}</div>
                </div>
            </div>
            <label className="ff:mb-1.5 ff:block ff:text-xs ff:font-medium ff:text-slate-600">{__("Form")}</label>
            <Select
                options={options}
                value={String(formId)}
                onChange={(e) => onChange(parseInt(e.target.value, 10))}
                className="ff:w-full"
            />
        </section>
    );
}

function ActionNode({
    action,
    forms,
    templates,
    triggerFormId,
    result,
    isFirst,
    isLast,
    onUp,
    onDown,
    onRemove,
    onChange,
}: {
    action: WorkflowAction;
    forms: FormOption[];
    templates: TemplateOption[];
    triggerFormId: number;
    result: ActionResult | null;
    isFirst: boolean;
    isLast: boolean;
    onUp: () => void;
    onDown: () => void;
    onRemove: () => void;
    onChange: (patch: Record<string, unknown>) => void;
}) {
    const Icon = metaFor(action.type).icon;

    return (
        <section className="ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:p-4 ff:shadow-sm">
            <div className="ff:mb-3 ff:flex ff:items-center ff:gap-2">
                <span className="ff:flex ff:h-8 ff:w-8 ff:items-center ff:justify-center ff:rounded-lg ff:bg-slate-100 ff:text-slate-600">
                    <Icon aria-hidden className="ff:h-4 ff:w-4" />
                </span>
                <div className="ff:flex ff:min-w-0 ff:flex-1 ff:flex-col">
                    <span className="ff:truncate ff:text-sm ff:font-semibold ff:text-slate-900">
                        {describeAction(action)}
                    </span>
                    <NodeStatus result={result} />
                </div>
                <div className="ff:flex ff:gap-0.5">
                    <Button variant="ghost" size="icon" aria-label={__("Move up")} onClick={onUp} disabled={isFirst}>
                        <ArrowUp aria-hidden className="ff:h-4 ff:w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={__("Move down")} onClick={onDown} disabled={isLast}>
                        <ArrowDown aria-hidden className="ff:h-4 ff:w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={__("Remove action")}
                        className="ff:text-red-600 ff:hover:bg-red-50"
                        onClick={onRemove}
                    >
                        <Trash2 aria-hidden className="ff:h-4 ff:w-4" />
                    </Button>
                </div>
            </div>
            <ActionConfig
                action={action}
                forms={forms}
                templates={templates}
                triggerFormId={triggerFormId}
                onChange={onChange}
            />
        </section>
    );
}

function ActionConfig({
    action,
    forms,
    templates,
    triggerFormId,
    onChange,
}: {
    action: WorkflowAction;
    forms: FormOption[];
    templates: TemplateOption[];
    triggerFormId: number;
    onChange: (patch: Record<string, unknown>) => void;
}) {
    const cfg = action.config;
    const str = (key: string) => (typeof cfg[key] === "string" ? (cfg[key] as string) : "");
    const num = (key: string) => (typeof cfg[key] === "number" ? (cfg[key] as number) : 0);

    if (action.type === "send_email") {
        const toMode = str("to_mode") || "admin";
        const triggerForm = forms.find((f) => f.id === triggerFormId);
        const emailFields = (triggerForm?.fields ?? []).filter((fld) => fld.type === "email" || fld.type === "text");
        const templateOptions = [
            { value: "0", label: __("Default design") },
            ...templates.map((t) => ({ value: String(t.id), label: t.title })),
        ];
        return (
            <div className="ff:flex ff:flex-col ff:gap-3">
                <Field label={__("Send to")}>
                    <Select
                        options={[
                            { value: "admin", label: __("Site admin") },
                            { value: "field", label: __("A form field") },
                            { value: "fixed", label: __("A fixed address") },
                        ]}
                        value={toMode}
                        onChange={(e) => onChange({ to_mode: e.target.value })}
                        className="ff:w-full"
                    />
                </Field>
                {toMode === "field" &&
                    (triggerFormId > 0 ? (
                        <Field label={__("Email field")}>
                            <Select
                                options={
                                    emailFields.length > 0
                                        ? emailFields.map((f) => ({ value: f.id, label: f.label }))
                                        : [{ value: "", label: __("No suitable fields") }]
                                }
                                value={str("to")}
                                onChange={(e) => onChange({ to: e.target.value })}
                                className="ff:w-full"
                            />
                        </Field>
                    ) : (
                        <Field label={__("Field ID")}>
                            <Input value={str("to")} onChange={(e) => onChange({ to: e.target.value })} />
                        </Field>
                    ))}
                {toMode === "fixed" && (
                    <Field label={__("Email address")}>
                        <Input
                            type="email"
                            value={str("to")}
                            onChange={(e) => onChange({ to: e.target.value })}
                            placeholder="name@example.com"
                        />
                    </Field>
                )}
                <Field label={__("Subject")}>
                    <Input
                        value={str("subject")}
                        onChange={(e) => onChange({ subject: e.target.value })}
                        placeholder={__("Leave blank for a default subject")}
                    />
                </Field>
                <Field label={__("Template")}>
                    <Select
                        options={templateOptions}
                        value={String(num("template_id"))}
                        onChange={(e) => onChange({ template_id: parseInt(e.target.value, 10) })}
                        className="ff:w-full"
                    />
                </Field>
                {num("template_id") === 0 && (
                    <Field label={__("Message")}>
                        <textarea
                            className="flexa-formflow-control ff:min-h-20 ff:w-full ff:rounded-md ff:border ff:border-slate-300 ff:bg-white ff:px-3 ff:py-2 ff:text-sm ff:shadow-sm"
                            value={str("message")}
                            onChange={(e) => onChange({ message: e.target.value })}
                            placeholder={__("Optional intro text above the submission table. Tokens like {form_title} work.")}
                        />
                    </Field>
                )}
            </div>
        );
    }

    if (action.type === "webhook") {
        return (
            <Field label={__("POST URL")}>
                <Input
                    type="url"
                    value={str("url")}
                    onChange={(e) => onChange({ url: e.target.value })}
                    placeholder="https://example.com/hook"
                    spellCheck={false}
                />
            </Field>
        );
    }

    if (action.type === "set_status") {
        return (
            <Field label={__("Mark entry as")}>
                <Select
                    options={[
                        { value: "read", label: __("Read") },
                        { value: "unread", label: __("Unread") },
                    ]}
                    value={str("status") || "read"}
                    onChange={(e) => onChange({ status: e.target.value })}
                    className="ff:w-full"
                />
            </Field>
        );
    }

    if (action.type === "add_note") {
        return (
            <Field label={__("Note")}>
                <textarea
                    className="flexa-formflow-control ff:min-h-16 ff:w-full ff:rounded-md ff:border ff:border-slate-300 ff:bg-white ff:px-3 ff:py-2 ff:text-sm ff:shadow-sm"
                    value={str("note")}
                    onChange={(e) => onChange({ note: e.target.value })}
                    placeholder={__("Internal note. Tokens like {field:ID} work.")}
                />
            </Field>
        );
    }

    const ext = extActionByType(action.type);
    if (ext) {
        const triggerForm = forms.find((f) => f.id === triggerFormId);
        return (
            <SchemaFields
                fields={ext.fields}
                values={cfg}
                onChange={onChange}
                context={{ formFields: triggerForm?.fields, connections: integrationConnections() }}
            />
        );
    }

    return null;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="ff:flex ff:flex-col ff:gap-1.5">
            <span className="ff:text-xs ff:font-medium ff:text-slate-600">{label}</span>
            {children}
        </label>
    );
}

function ConditionNode({
    condition,
    triggerForm,
    result,
    onChange,
    onRemove,
}: {
    condition: WorkflowCondition;
    triggerForm: FormOption | undefined;
    result: ActionResult | null;
    onChange: (patch: Partial<WorkflowCondition>) => void;
    onRemove: () => void;
}) {
    const op = OPERATORS.find((o) => o.value === condition.operator) ?? OPERATORS[0];
    const fieldOptions = (triggerForm?.fields ?? []).map((f) => ({ value: f.id, label: f.label }));

    return (
        <section className="ff:rounded-xl ff:border ff:border-amber-200 ff:bg-white ff:p-4 ff:shadow-sm">
            <div className="ff:mb-3 ff:flex ff:items-center ff:gap-2">
                <span className="ff:flex ff:h-8 ff:w-8 ff:items-center ff:justify-center ff:rounded-lg ff:bg-amber-50 ff:text-amber-600">
                    <Filter aria-hidden className="ff:h-4 ff:w-4" />
                </span>
                <div className="ff:min-w-0 ff:flex-1">
                    <div className="ff:text-sm ff:font-semibold ff:text-slate-900">{__("Only continue if…")}</div>
                    {result ? (
                        <NodeStatus result={result} />
                    ) : (
                        <div className="ff:text-xs ff:text-slate-500">
                            {__("One condition gates every step below.")}
                        </div>
                    )}
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={__("Remove condition")}
                    className="ff:text-red-600 ff:hover:bg-red-50"
                    onClick={onRemove}
                >
                    <Trash2 aria-hidden className="ff:h-4 ff:w-4" />
                </Button>
            </div>
            <div className="ff:flex ff:flex-col ff:gap-3">
                <Field label={__("Field")}>
                    {triggerForm ? (
                        <Select
                            options={
                                fieldOptions.length > 0
                                    ? fieldOptions
                                    : [{ value: "", label: __("No fields on this form") }]
                            }
                            value={condition.field}
                            onChange={(e) => onChange({ field: e.target.value })}
                            className="ff:w-full"
                        />
                    ) : (
                        <Input
                            value={condition.field}
                            onChange={(e) => onChange({ field: e.target.value })}
                            placeholder={__("Field ID")}
                        />
                    )}
                </Field>
                <Field label={__("Condition")}>
                    <Select
                        options={OPERATORS.map((o) => ({ value: o.value, label: o.label() }))}
                        value={condition.operator}
                        onChange={(e) => onChange({ operator: e.target.value as ConditionOperator })}
                        className="ff:w-full"
                    />
                </Field>
                {op.needsValue && (
                    <Field label={__("Value")}>
                        <Input value={condition.value} onChange={(e) => onChange({ value: e.target.value })} />
                    </Field>
                )}
            </div>
        </section>
    );
}

function Palette({
    onAdd,
    onAddCondition,
    canAddCondition,
    onBrowseRecipes,
}: {
    onAdd: (type: string) => void;
    onAddCondition: () => void;
    canAddCondition: boolean;
    onBrowseRecipes: () => void;
}) {
    const extras = workflowActionTypes();
    return (
        <section className="ff:rounded-xl ff:border ff:border-dashed ff:border-slate-300 ff:bg-white ff:p-4">
            <div className="ff:mb-3 ff:flex ff:items-center ff:gap-1.5 ff:text-xs ff:font-medium ff:text-slate-500">
                <Plus aria-hidden className="ff:h-3.5 ff:w-3.5" />
                {__("Add a step")}
            </div>

            <div className="ff:flex ff:flex-col ff:gap-3">
                {canAddCondition && (
                    <PaletteGroup label={__("Conditions")}>
                        <PaletteButton icon={Filter} label={__("Only continue if…")} onClick={onAddCondition} />
                    </PaletteGroup>
                )}

                <PaletteGroup label={__("Actions")}>
                    {ACTION_ORDER.map((type) => (
                        <PaletteButton
                            key={type}
                            icon={ACTION_META[type].icon}
                            label={ACTION_META[type].label}
                            onClick={() => onAdd(type)}
                        />
                    ))}
                    {extras.map((ext) => (
                        <PaletteButton
                            key={ext.type}
                            icon={extensionIcon(ext.icon)}
                            label={ext.label}
                            onClick={() => onAdd(ext.type)}
                        />
                    ))}
                </PaletteGroup>

                <PaletteGroup label={__("Recipes")}>
                    <PaletteButton
                        icon={BookMarked}
                        label={__("Browse recipes")}
                        onClick={onBrowseRecipes}
                    />
                </PaletteGroup>
            </div>
        </section>
    );
}

function PaletteGroup({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="ff:mb-1.5 ff:text-[11px] ff:font-semibold ff:uppercase ff:tracking-wide ff:text-slate-400">
                {label}
            </p>
            <div className="ff:flex ff:flex-wrap ff:gap-2">{children}</div>
        </div>
    );
}

function PaletteButton({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="ff:flex ff:items-center ff:gap-1.5 ff:rounded-lg ff:border ff:border-slate-200 ff:bg-white ff:px-3 ff:py-1.5 ff:text-sm ff:text-slate-700 ff:transition-colors ff:hover:border-brand-300 ff:hover:bg-brand-50 ff:hover:text-brand-700"
        >
            <Icon aria-hidden className="ff:h-4 ff:w-4" />
            {label}
        </button>
    );
}
