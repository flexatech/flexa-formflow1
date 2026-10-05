import {
    ArrowLeft,
    Blocks,
    ChevronLeft,
    ChevronRight,
    LayoutTemplate,
    Monitor,
    Send,
    Smartphone,
    Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { EditorSkeleton } from "@/components/custom/Skeletons";
import { AiWritingDialog } from "@/features/ai/AiWritingDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { __ } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { navigate } from "@/lib/router";
import { SHOW_UPCOMING } from "@/lib/flags";
import { useUiStore } from "@/lib/store";
import { SaveToLibraryButton } from "@/features/library/SaveToLibrary";
import { useFormsList } from "@/features/forms/useForms";
import { LayerList } from "./LayerList";
import { PatternPalette } from "./PatternPalette";
import { PreviewPane } from "./PreviewPane";
import { PropsPanel } from "./PropsPanel";
import type { ConditionSet } from "@/components/custom/SchemaFields";
import { useEmailPatterns, useEmailTemplate, useSaveEmailTemplate, useTestSend } from "../useEmailTemplates";
import {
    emptyTree,
    findInTree,
    insertInTree,
    insertManyInTree,
    materializePattern,
    moveInTree,
    newElement,
    removeFromTree,
    resizeColumns,
    updateInTree,
    type DropTarget,
    type EmailElement,
    type EmailTree,
    type TreeSettings,
} from "../types";

/** Deep-copy an element (and any column children) with fresh ids. */
function cloneWithIds(source: EmailElement): EmailElement {
    const copy: EmailElement = { ...newElement(source.type), props: { ...source.props } };
    if (source.columns) {
        copy.columns = source.columns.map((col) => col.map(cloneWithIds));
    }
    if (source.visibility) {
        copy.visibility = { match: source.visibility.match, rules: source.visibility.rules.map((r) => ({ ...r })) };
    }
    return copy;
}

interface Draft {
    title: string;
    tree: EmailTree;
}

/**
 * Full-area takeover (no sidebar). Autosaves the whole draft 800ms after the
 * last change; the tree document is owned by this one screen, so it is always
 * sent whole.
 */
export function EmailEditorPage({ id }: { id: number }) {
    const { data: template, isLoading } = useEmailTemplate(id);
    const save = useSaveEmailTemplate(id);
    const showToast = useUiStore((s) => s.showToast);
    const selectedId = useUiStore((s) => s.selectedElementId);
    const setSelectedElement = useUiStore((s) => s.setSelectedElement);
    const [draft, setDraft] = useState<Draft | null>(null);
    const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
    const [leftTab, setLeftTab] = useState<"blocks" | "patterns">("blocks");
    const [leftCollapsed, setLeftCollapsed] = useState(false);
    const [rightCollapsed, setRightCollapsed] = useState(false);
    const [previewFormId, setPreviewFormId] = useState(0);
    const [testOpen, setTestOpen] = useState(false);
    const [aiOpen, setAiOpen] = useState(false);
    const lastSaved = useRef("");

    const { data: formsData } = useFormsList({ per_page: 100 });
    const forms = formsData?.items ?? [];
    const { data: patterns = [], isLoading: patternsLoading } = useEmailPatterns();

    useEffect(() => {
        if (template && draft === null) {
            const initial: Draft = { title: template.title, tree: template.tree ?? emptyTree() };
            setDraft(initial);
            lastSaved.current = JSON.stringify(initial);
        }
    }, [template, draft]);

    // Leaving the editor clears the layer selection.
    useEffect(() => () => setSelectedElement(null), [setSelectedElement]);

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

    // Condition subjects for the visibility panel: the preview form's fields.
    // A template is reusable, so the subjects follow whichever form is picked
    // for preview; the stored rules key off field ids, which are stable.
    const conditionFields = useMemo(() => {
        const form = forms.find((f) => f.id === previewFormId);
        if (!form) return [];
        return form.config.fields.map((field) => ({
            id: field.id,
            label: field.label || field.id,
            type: field.type,
        }));
    }, [forms, previewFormId]);

    if (isLoading || !template || !draft) {
        return <EditorSkeleton />;
    }

    const dirty = JSON.stringify(draft) !== lastSaved.current;
    const elements = draft.tree.elements;
    const selected = selectedId ? findInTree(elements, selectedId) : null;

    const setTree = (next: EmailTree) => setDraft((prev) => (prev ? { ...prev, tree: next } : prev));
    const setElements = (next: EmailElement[]) => setTree({ ...draft.tree, elements: next });

    const onAdd = (type: string) => {
        const element = newElement(type);
        setElements([...elements, element]);
        setSelectedElement(element.id);
    };
    const onInsertAt = (type: string, target: DropTarget) => {
        const element = newElement(type);
        setElements(insertInTree(elements, target, element));
        setSelectedElement(element.id);
    };
    const onInsertPatternAt = (patternId: string, target: DropTarget) => {
        const pattern = patterns.find((p) => p.id === patternId);
        if (!pattern) return;
        const blocks = materializePattern(pattern.blocks);
        setElements(insertManyInTree(elements, target, blocks));
        setSelectedElement(blocks[0]?.id ?? null);
    };
    const onAddPattern = (patternId: string) => {
        const pattern = patterns.find((p) => p.id === patternId);
        if (!pattern) return;
        const blocks = materializePattern(pattern.blocks);
        setElements([...elements, ...blocks]);
        setSelectedElement(blocks[0]?.id ?? null);
    };
    const onMove = (id: string, target: DropTarget) => {
        setElements(moveInTree(elements, id, target));
    };
    const onDuplicate = (elId: string) => {
        const source = findInTree(elements, elId);
        const { from } = removeFromTree(elements, elId);
        if (!source || !from) return;
        const clone = cloneWithIds(source);
        setElements(insertInTree(elements, { ...from, index: from.index + 1 }, clone));
        setSelectedElement(clone.id);
    };
    const onDelete = (elId: string) => {
        setElements(removeFromTree(elements, elId).elements);
        if (selectedId === elId) setSelectedElement(null);
    };
    const onChangeProps = (elId: string, props: Record<string, unknown>) =>
        setElements(updateInTree(elements, elId, (el) => ({ ...el, props })));
    const onChangeVisibility = (elId: string, visibility: ConditionSet) =>
        setElements(
            updateInTree(elements, elId, (el) => {
                if (visibility.rules.length === 0) {
                    const { visibility: _drop, ...rest } = el;
                    return rest;
                }
                return { ...el, visibility };
            }),
        );
    const onChangeColumnCount = (elId: string, count: number) =>
        setElements(updateInTree(elements, elId, (el) => resizeColumns(el, count)));
    const onChangeSettings = (settings: TreeSettings) => setTree({ ...draft.tree, settings });

    return (
        <div className="ff:flex ff:h-[calc(100vh-2rem)] ff:min-w-0 ff:flex-1 ff:flex-col ff:bg-slate-50">
            <header className="ff:flex ff:items-center ff:gap-3 ff:border-b ff:border-slate-200 ff:bg-white ff:px-4 ff:py-2.5">
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={__("Back to emails")}
                    onClick={() => navigate("/emails")}
                >
                    <ArrowLeft aria-hidden className="ff:h-4 ff:w-4" />
                </Button>
                <input
                    value={draft.title}
                    onChange={(e) => setDraft((prev) => (prev ? { ...prev, title: e.target.value } : prev))}
                    placeholder={__("Untitled template")}
                    aria-label={__("Template title")}
                    className={cn(
                        "flexa-formflow-bare-input",
                        "ff:min-w-0 ff:flex-1 ff:border-0 ff:bg-transparent ff:text-base ff:font-semibold ff:text-slate-900 ff:outline-none ff:placeholder:text-slate-400",
                    )}
                    spellCheck={false}
                />
                <SaveStatus state={save.isPending ? "saving" : dirty ? "dirty" : "saved"} />
                <div className="ff:flex ff:items-center ff:gap-1 ff:rounded-md ff:border ff:border-slate-200 ff:p-0.5">
                    <Button
                        variant={viewport === "desktop" ? "default" : "ghost"}
                        size="icon"
                        onClick={() => setViewport("desktop")}
                        aria-label={__("Desktop preview")}
                    >
                        <Monitor className="ff:h-4 ff:w-4" />
                    </Button>
                    <Button
                        variant={viewport === "mobile" ? "default" : "ghost"}
                        size="icon"
                        onClick={() => setViewport("mobile")}
                        aria-label={__("Mobile preview")}
                    >
                        <Smartphone className="ff:h-4 ff:w-4" />
                    </Button>
                </div>
                {SHOW_UPCOMING && (
                    <SaveToLibraryButton
                        type="template"
                        kind="email"
                        defaultName={draft.title}
                        getPayload={() => draft.tree as unknown as Record<string, unknown>}
                    />
                )}
                <Button variant="outline" size="sm" onClick={() => setAiOpen(true)}>
                    <Sparkles aria-hidden className="ff:h-4 ff:w-4" />
                    {__("Writing assistant")}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setTestOpen(true)}>
                    <Send aria-hidden className="ff:h-4 ff:w-4" />
                    {__("Send test")}
                </Button>
            </header>

            <div className="ff:flex ff:min-h-0 ff:flex-1">
                <SidePanel
                    side="left"
                    collapsed={leftCollapsed}
                    onToggle={() => setLeftCollapsed((v) => !v)}
                >
                <aside className="ff:flex ff:h-full ff:w-64 ff:shrink-0 ff:flex-col ff:border-r ff:border-slate-200 ff:bg-white">
                    <div className="ff:flex ff:shrink-0 ff:items-center ff:gap-1 ff:border-b ff:border-slate-200 ff:p-2">
                        <LeftTab
                            icon={Blocks}
                            label={__("Blocks")}
                            active={leftTab === "blocks"}
                            onClick={() => setLeftTab("blocks")}
                        />
                        <LeftTab
                            icon={LayoutTemplate}
                            label={__("Patterns")}
                            active={leftTab === "patterns"}
                            onClick={() => setLeftTab("patterns")}
                        />
                    </div>
                    <div className="ff:min-h-0 ff:flex-1">
                        {leftTab === "blocks" ? (
                            <LayerList
                                elements={elements}
                                selectedId={selectedId}
                                onSelect={setSelectedElement}
                                onAdd={onAdd}
                                onReorder={setElements}
                                onDuplicate={onDuplicate}
                                onDelete={onDelete}
                            />
                        ) : (
                            <PatternPalette
                                patterns={patterns}
                                isLoading={patternsLoading}
                                onAdd={onAddPattern}
                            />
                        )}
                    </div>
                </aside>
                </SidePanel>
                <PreviewPane
                    tree={draft.tree}
                    formId={previewFormId}
                    forms={forms}
                    onFormChange={setPreviewFormId}
                    viewport={viewport}
                    selectedId={selectedId}
                    onSelect={setSelectedElement}
                    onInsert={onInsertAt}
                    onInsertPattern={onInsertPatternAt}
                    onMove={onMove}
                />
                <SidePanel
                    side="right"
                    collapsed={rightCollapsed}
                    onToggle={() => setRightCollapsed((v) => !v)}
                >
                <aside className="ff:h-full ff:w-72 ff:shrink-0 ff:overflow-y-auto ff:border-l ff:border-slate-200 ff:bg-white ff:p-4">
                    <PropsPanel
                        element={selected}
                        settings={draft.tree.settings}
                        formId={previewFormId}
                        conditionFields={conditionFields}
                        hasPreviewForm={previewFormId > 0}
                        onChangeProps={onChangeProps}
                        onChangeVisibility={onChangeVisibility}
                        onChangeColumnCount={onChangeColumnCount}
                        onDuplicate={onDuplicate}
                        onDelete={onDelete}
                        onChangeSettings={onChangeSettings}
                    />
                </aside>
                </SidePanel>
            </div>

            <TestDialog
                open={testOpen}
                onClose={() => setTestOpen(false)}
                tree={draft.tree}
                formId={previewFormId}
                forms={forms}
                onFormChange={setPreviewFormId}
            />

            <AiWritingDialog open={aiOpen} onClose={() => setAiOpen(false)} />
        </div>
    );
}

/**
 * Wraps a builder side panel with a collapse/expand pill on the edge facing the
 * canvas. Collapsed, the panel shrinks to a thin rail so the preview gets the
 * room; the pill flips its arrow to expand it again.
 */
function SidePanel({
    side,
    collapsed,
    onToggle,
    children,
}: {
    side: "left" | "right";
    collapsed: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}) {
    // The pill sits on the border between the panel and the canvas: the right
    // edge of a left panel, the left edge of a right panel.
    const pillOnRight = side === "left";
    const Icon =
        side === "left"
            ? collapsed
                ? ChevronRight
                : ChevronLeft
            : collapsed
              ? ChevronLeft
              : ChevronRight;

    return (
        <div className="ff:relative ff:shrink-0">
            {collapsed ? (
                <div
                    className={cn(
                        "ff:h-full ff:w-7 ff:bg-white",
                        side === "left" ? "ff:border-r" : "ff:border-l",
                        "ff:border-slate-200",
                    )}
                />
            ) : (
                children
            )}
            <button
                type="button"
                onClick={onToggle}
                aria-label={collapsed ? __("Expand panel") : __("Collapse panel")}
                aria-expanded={!collapsed}
                className={cn(
                    "ff:absolute ff:top-1/2 ff:z-10 ff:flex ff:h-10 ff:w-5 ff:-translate-y-1/2 ff:cursor-pointer ff:items-center ff:justify-center ff:rounded-full ff:border ff:border-slate-200 ff:bg-white ff:text-slate-500 ff:shadow-sm ff:transition-colors ff:hover:text-slate-800",
                    pillOnRight ? "ff:right-0 ff:translate-x-1/2" : "ff:left-0 ff:-translate-x-1/2",
                )}
            >
                <Icon aria-hidden className="ff:h-4 ff:w-4" />
            </button>
        </div>
    );
}

function LeftTab({
    icon: Icon,
    label,
    active,
    onClick,
}: {
    icon: typeof Blocks;
    label: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={cn(
                "ff:flex ff:flex-1 ff:items-center ff:justify-center ff:gap-1.5 ff:rounded-md ff:px-2 ff:py-1.5 ff:text-xs ff:font-medium ff:transition-colors",
                active
                    ? "ff:bg-brand-50 ff:text-brand-700"
                    : "ff:text-slate-600 ff:hover:bg-slate-50 ff:hover:text-slate-900",
            )}
        >
            <Icon aria-hidden className="ff:h-3.5 ff:w-3.5" />
            {label}
        </button>
    );
}

function TestDialog({
    open,
    onClose,
    tree,
    formId,
    forms,
    onFormChange,
}: {
    open: boolean;
    onClose: () => void;
    tree: EmailTree;
    formId: number;
    forms: { id: number; title: string }[];
    onFormChange: (id: number) => void;
}) {
    const testSend = useTestSend();
    const showToast = useUiStore((s) => s.showToast);
    const [to, setTo] = useState("");

    const onSend = () => {
        testSend.mutate(
            { tree, to, form_id: formId || undefined },
            {
                onSuccess: (sent) => {
                    showToast(sent ? __("Test email sent.") : __("Could not send. Check your mail setup."), sent ? "success" : "error");
                    if (sent) onClose();
                },
                onError: () => showToast(__("Please enter a valid email address."), "error"),
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{__("Send a test email")}</DialogTitle>
                    <DialogDescription>
                        {__("We render this template with sample or real form data and send it once.")}
                    </DialogDescription>
                </DialogHeader>
                <div className="ff:flex ff:flex-col ff:gap-4 ff:py-2">
                    <div>
                        <Label htmlFor="ff-test-to" className="ff:mb-1.5 ff:block">
                            {__("Send to")}
                        </Label>
                        <Input
                            id="ff-test-to"
                            type="email"
                            value={to}
                            placeholder="you@example.com"
                            onChange={(e) => setTo(e.target.value)}
                        />
                    </div>
                    <div>
                        <Label htmlFor="ff-test-form" className="ff:mb-1.5 ff:block">
                            {__("Use data from")}
                        </Label>
                        <Select
                            id="ff-test-form"
                            value={String(formId)}
                            onChange={(e) => onFormChange(Number(e.target.value))}
                            options={[
                                { value: "0", label: __("Sample data") },
                                ...forms.map((f) => ({ value: String(f.id), label: f.title || __("Untitled form") })),
                            ]}
                            className="ff:w-full"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        {__("Cancel")}
                    </Button>
                    <Button onClick={onSend} disabled={testSend.isPending || to === ""}>
                        {testSend.isPending ? __("Sending…") : __("Send test")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
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
