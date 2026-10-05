import { useEffect, useRef, useState } from "react";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { __ } from "@/lib/i18n";
import type { FormSummary } from "@/features/forms/types";
import { useEmailPreview } from "../useEmailTemplates";
import { PREVIEW_RESET_CSS } from "../previewFrame";
import {
    BLOCK_DRAG_TYPE,
    BLOCK_MOVE_TYPE,
    BLOCK_PATTERN_TYPE,
    findInTree,
    isLayout,
    type DropTarget,
    type EmailTree,
} from "../types";

interface PreviewPaneProps {
    tree: EmailTree;
    formId: number;
    forms: FormSummary[];
    onFormChange: (id: number) => void;
    viewport: "desktop" | "mobile";
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    onInsert: (type: string, target: DropTarget) => void;
    onInsertPattern: (patternId: string, target: DropTarget) => void;
    onMove: (id: string, target: DropTarget) => void;
}

interface DropLine {
    top: number;
    left: number;
    width: number;
}

const EDITOR_STYLE =
    PREVIEW_RESET_CSS +
    "[data-ff-el]{cursor:pointer}" +
    "[data-ff-el]:hover>tr>td{box-shadow:inset 0 0 0 1px #badeff}" +
    "tbody.ff-selected>tr>td{box-shadow:inset 0 0 0 2px #0f92f7!important}";

export function PreviewPane({
    tree,
    formId,
    forms,
    onFormChange,
    viewport,
    selectedId,
    onSelect,
    onInsert,
    onInsertPattern,
    onMove,
}: PreviewPaneProps) {
    const preview = useEmailPreview();
    const [html, setHtml] = useState("");
    const [frameHeight, setFrameHeight] = useState(600);
    const [dragging, setDragging] = useState(false);
    const [line, setLine] = useState<DropLine | null>(null);
    const timer = useRef<number>();
    const frameRef = useRef<HTMLIFrameElement>(null);

    // Drag bookkeeping. `kind` distinguishes a palette insert (block flies in
    // from the sidebar) from a canvas move (an existing block is dragged). The
    // resolved drop position lives in `target`.
    const kind = useRef<"insert" | "pattern" | "move" | null>(null);
    const insertType = useRef("");
    const patternId = useRef("");
    const moveId = useRef<string | null>(null);
    const target = useRef<DropTarget | null>(null);

    // Live refs so listeners attached once (or per iframe load) never go stale.
    const treeRef = useRef(tree);
    treeRef.current = tree;
    const selectedRef = useRef(selectedId);
    selectedRef.current = selectedId;
    const onInsertRef = useRef(onInsert);
    onInsertRef.current = onInsert;
    const onInsertPatternRef = useRef(onInsertPattern);
    onInsertPatternRef.current = onInsertPattern;
    const onMoveRef = useRef(onMove);
    onMoveRef.current = onMove;
    const onSelectRef = useRef(onSelect);
    onSelectRef.current = onSelect;

    const runPreview = preview.mutate;

    const iframeDoc = () => frameRef.current?.contentDocument ?? null;

    // Size the iframe to its own content so it never grows an inner scrollbar.
    const measureFrame = () => {
        const doc = iframeDoc();
        if (!doc) return;
        const next = Math.max(doc.documentElement?.scrollHeight ?? 0, doc.body?.scrollHeight ?? 0);
        if (next > 0) setFrameHeight(next);
    };

    const applySelection = (doc: Document, id: string | null) => {
        doc.querySelectorAll("tbody.ff-selected").forEach((el) => el.classList.remove("ff-selected"));
        if (id) doc.querySelector(`[data-ff-el="${id}"]`)?.classList.add("ff-selected");
    };

    const draggedType = (): string => {
        if (kind.current === "insert") return insertType.current;
        if (kind.current === "move" && moveId.current) {
            return findInTree(treeRef.current.elements, moveId.current)?.type ?? "";
        }
        return "";
    };

    // A column can't hold a layout block, and a block can't be dropped into its
    // own column.
    const columnInvalid = (colId: string): boolean => {
        if (isLayout(draggedType())) return true;
        return kind.current === "move" && moveId.current === colId;
    };

    const pickIndex = (blocks: HTMLElement[], localY: number, scope?: DOMRect) => {
        let index = blocks.length;
        let boundary = 0;
        for (let i = 0; i < blocks.length; i++) {
            const r = blocks[i].getBoundingClientRect();
            if (localY < r.top + r.height / 2) {
                index = i;
                boundary = r.top;
                break;
            }
        }
        if (index === blocks.length) {
            const last = blocks[blocks.length - 1];
            boundary = last ? last.getBoundingClientRect().bottom : (scope?.top ?? 0) + 8;
        }
        return { index, boundary };
    };

    // Given a cursor in parent-viewport coordinates, resolve the drop position,
    // stash it in `target`, and draw the insertion line (also in parent coords).
    const resolveDrop = (px: number, py: number) => {
        const frame = frameRef.current;
        const doc = iframeDoc();
        if (!frame || !doc) return;
        const fr = frame.getBoundingClientRect();
        const localX = px - fr.left;
        const localY = py - fr.top;

        // Is the cursor inside a column? Patterns are top-level groups, so they
        // only ever drop at the document root.
        const cols =
            kind.current === "pattern" ? [] : Array.from(doc.querySelectorAll<HTMLElement>("[data-ff-col]"));
        for (const col of cols) {
            const r = col.getBoundingClientRect();
            const inside = localX >= r.left && localX <= r.right && localY >= r.top && localY <= r.bottom;
            if (!inside) continue;
            const colId = col.getAttribute("data-ff-parent") ?? "";
            if (columnInvalid(colId)) break; // fall through to the top level
            const colIndex = Number(col.getAttribute("data-ff-col") ?? 0);
            const kids = Array.from(col.querySelectorAll<HTMLElement>("tbody[data-ff-el]"));
            const { index, boundary } = pickIndex(kids, localY, r);
            target.current = { colId, colIndex, index };
            setLine({ top: fr.top + boundary, left: fr.left + r.left + 4, width: Math.max(0, r.width - 8) });
            return;
        }

        // Top level.
        const container = doc.querySelector<HTMLElement>(".ff-container");
        const tops = Array.from(doc.querySelectorAll<HTMLElement>(".ff-container > tbody[data-ff-el]"));
        const cr = container?.getBoundingClientRect();
        const { index, boundary } = pickIndex(tops, localY, cr);
        target.current = { colId: null, colIndex: 0, index };
        setLine({ top: fr.top + boundary, left: fr.left + (cr?.left ?? 0), width: cr?.width ?? fr.width });
    };

    const commitDrop = () => {
        const t = target.current;
        if (t) {
            if (kind.current === "insert" && insertType.current) onInsertRef.current(insertType.current, t);
            else if (kind.current === "pattern" && patternId.current) onInsertPatternRef.current(patternId.current, t);
            else if (kind.current === "move" && moveId.current) onMoveRef.current(moveId.current, t);
        }
        resetDrag();
    };

    const resetDrag = () => {
        setDragging(false);
        setLine(null);
        kind.current = null;
        insertType.current = "";
        patternId.current = "";
        moveId.current = null;
        target.current = null;
    };

    const hasDrag = (types: DataTransfer["types"]) =>
        Array.prototype.indexOf.call(types, BLOCK_DRAG_TYPE) !== -1 ||
        Array.prototype.indexOf.call(types, BLOCK_PATTERN_TYPE) !== -1 ||
        Array.prototype.indexOf.call(types, BLOCK_MOVE_TYPE) !== -1;

    const handleFrameLoad = () => {
        measureFrame();
        window.requestAnimationFrame(measureFrame);

        const doc = iframeDoc();
        if (!doc) return;

        // Editor affordances: hover/selection outlines and grabbable blocks.
        if (!doc.getElementById("ff-editor-style")) {
            const style = doc.createElement("style");
            style.id = "ff-editor-style";
            style.textContent = EDITOR_STYLE;
            doc.head?.appendChild(style);
        }
        doc.querySelectorAll<HTMLElement>("[data-ff-el]").forEach((el) => (el.draggable = true));
        applySelection(doc, selectedRef.current);

        // Reorder is same-document DnD (reliable): the block is both the source
        // and the events fire inside this iframe. Palette inserts arrive through
        // the parent pane instead (see the container handlers below).
        doc.addEventListener("dragstart", (e) => {
            const el = (e.target as HTMLElement | null)?.closest?.("[data-ff-el]");
            const id = el?.getAttribute("data-ff-el");
            if (!id || !e.dataTransfer) return;
            e.dataTransfer.setData(BLOCK_MOVE_TYPE, id);
            e.dataTransfer.effectAllowed = "move";
            kind.current = "move";
            moveId.current = id;
        });
        doc.addEventListener("dragover", (e) => {
            if (kind.current !== "move") return;
            e.preventDefault();
            if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
            const fr = frameRef.current?.getBoundingClientRect();
            if (fr) resolveDrop(fr.left + e.clientX, fr.top + e.clientY);
        });
        doc.addEventListener("drop", (e) => {
            if (kind.current !== "move") return;
            e.preventDefault();
            commitDrop();
        });
        doc.addEventListener("dragend", resetDrag);
        doc.addEventListener("click", (e) => {
            const el = (e.target as HTMLElement | null)?.closest?.("[data-ff-el]");
            onSelectRef.current(el?.getAttribute("data-ff-el") ?? null);
        });
    };

    useEffect(() => {
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => {
            runPreview(
                { tree, form_id: formId || undefined },
                { onSuccess: (result) => setHtml(result) },
            );
        }, 500);
        return () => window.clearTimeout(timer.current);
        // runPreview is referentially stable.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tree, formId]);

    // Switching viewport reflows the iframe to a new height; re-measure.
    useEffect(() => {
        const id = window.requestAnimationFrame(measureFrame);
        return () => window.cancelAnimationFrame(id);
    }, [viewport, html]);

    // Reflect selection changes coming from the layer list into the iframe.
    useEffect(() => {
        const doc = iframeDoc();
        if (doc) applySelection(doc, selectedId);
    }, [selectedId, html]);

    // A palette-block drag starts in the parent document (the sidebar button).
    // Flip the iframe to pointer-events:none for its duration so the drag lands
    // on the pane container, and clean up when any drag ends.
    useEffect(() => {
        const onStart = (e: DragEvent) => {
            const types = e.dataTransfer?.types;
            if (types && Array.prototype.indexOf.call(types, BLOCK_DRAG_TYPE) !== -1) {
                kind.current = "insert";
                insertType.current = e.dataTransfer?.getData(BLOCK_DRAG_TYPE) ?? "";
                setDragging(true);
            } else if (types && Array.prototype.indexOf.call(types, BLOCK_PATTERN_TYPE) !== -1) {
                kind.current = "pattern";
                patternId.current = e.dataTransfer?.getData(BLOCK_PATTERN_TYPE) ?? "";
                setDragging(true);
            }
        };
        window.addEventListener("dragstart", onStart);
        window.addEventListener("dragend", resetDrag);
        window.addEventListener("drop", resetDrag);
        return () => {
            window.removeEventListener("dragstart", onStart);
            window.removeEventListener("dragend", resetDrag);
            window.removeEventListener("drop", resetDrag);
        };
        // Handlers use stable refs and setters only.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Pane-level drop target for palette inserts (and for moves that stray onto
    // the padding around the iframe).
    const handlePaneDragOver = (e: React.DragEvent) => {
        if (!hasDrag(e.dataTransfer.types)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = kind.current === "move" ? "move" : "copy";
        resolveDrop(e.clientX, e.clientY);
    };
    const handlePaneDrop = (e: React.DragEvent) => {
        if (!hasDrag(e.dataTransfer.types)) return;
        e.preventDefault();
        if (kind.current === "insert" && !insertType.current) {
            insertType.current = e.dataTransfer.getData(BLOCK_DRAG_TYPE);
        }
        if (kind.current === "pattern" && !patternId.current) {
            patternId.current = e.dataTransfer.getData(BLOCK_PATTERN_TYPE);
        }
        commitDrop();
    };

    return (
        <div className="ff:flex ff:h-full ff:min-w-0 ff:flex-1 ff:flex-col ff:bg-slate-100">
            <div className="ff:flex ff:items-center ff:justify-end ff:gap-2 ff:border-b ff:border-slate-200 ff:bg-white ff:px-4 ff:py-2">
                {preview.isPending && (
                    <span className="ff:mr-auto ff:text-xs ff:text-slate-400">{__("Rendering…")}</span>
                )}
                <span className="ff:text-xs ff:text-slate-500">{__("Preview with data from")}</span>
                <Select
                    aria-label={__("Preview form")}
                    value={String(formId)}
                    onChange={(e) => onFormChange(Number(e.target.value))}
                    options={[
                        { value: "0", label: __("Sample data") },
                        ...forms.map((f) => ({ value: String(f.id), label: f.title || __("Untitled form") })),
                    ]}
                />
            </div>
            <div
                className="ff:relative ff:flex ff:flex-1 ff:items-start ff:justify-center ff:overflow-auto ff:p-4"
                onDragOver={handlePaneDragOver}
                onDrop={handlePaneDrop}
            >
                <iframe
                    ref={frameRef}
                    title={__("Email preview")}
                    srcDoc={html}
                    onLoad={handleFrameLoad}
                    scrolling="no"
                    style={{ height: frameHeight, pointerEvents: dragging ? "none" : undefined }}
                    className={cn(
                        "ff:rounded-lg ff:border ff:border-slate-200 ff:bg-white ff:shadow-sm",
                        viewport === "desktop" ? "ff:w-full ff:max-w-3xl" : "ff:w-[390px]",
                    )}
                />
                {line && (
                    <div
                        aria-hidden
                        className="ff:pointer-events-none ff:fixed ff:z-[160003] ff:rounded-full ff:border-t-2 ff:border-brand-500"
                        style={{
                            top: line.top,
                            left: line.left,
                            width: line.width,
                            boxShadow: "0 0 0 3px rgba(0,123,234,0.15)",
                        }}
                    />
                )}
            </div>
        </div>
    );
}
