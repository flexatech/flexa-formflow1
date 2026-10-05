import {
    DndContext,
    DragOverlay,
    PointerSensor,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
    Bookmark,
    Check,
    GripVertical,
    MousePointerClick,
    Sparkles,
    Trash2,
} from "lucide-react";
import { useState } from "react";
import { __, sprintf } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useUiStore } from "@/lib/store";
import { useMyLibrary, useSaveToLibrary } from "@/features/library/useLibrary";
import type { SavedAsset } from "@/features/library/types";
import {
    FIELD_CATEGORIES,
    FIELD_TYPES,
    fieldTypeMeta,
    newField,
    widthLabel,
    type FieldLogic,
    type FieldType,
    type FormConfig,
    type FormField,
} from "../types";
import { Inspector } from "./Inspector";

interface BuildTabProps {
    config: FormConfig;
    onChange: (config: FormConfig) => void;
}

/**
 * Palette · canvas · inspector. Palette items add on click and drag onto the
 * canvas; canvas cards reorder with dnd-kit sortable.
 */
export function BuildTab({ config, onChange }: BuildTabProps) {
    const selectedFieldId = useUiStore((s) => s.selectedFieldId);
    const setSelectedField = useUiStore((s) => s.setSelectedField);
    const [paletteDrag, setPaletteDrag] = useState<FieldType | null>(null);
    // Multi-select for "Save as pattern"; independent of the single inspector
    // selection (selectedFieldId). Holds the checked field ids.
    const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

    const fields = config.fields;
    const setFields = (next: FormField[]) => onChange({ ...config, fields: next });

    const addField = (type: FieldType, index?: number) => {
        const field = newField(type);
        const next = [...fields];
        next.splice(index ?? fields.length, 0, field);
        setFields(next);
        setSelectedField(field.id);
    };

    // Drop a saved pattern's fields into the canvas. Ids are regenerated so a
    // pattern can be inserted more than once; intra-pattern logic references are
    // remapped to the new ids so a rule inside the pattern keeps working.
    const insertPattern = (raw: SavedAsset) => {
        const payload = raw.payload as { fields?: unknown };
        const rawFields = Array.isArray(payload.fields) ? (payload.fields as FormField[]) : [];
        if (rawFields.length === 0) {
            return;
        }
        const idMap = new Map<string, string>();
        rawFields.forEach((f) => idMap.set(f.id, "f_" + Math.random().toString(36).slice(2, 8)));
        const remapped: FormField[] = rawFields.map((f) => ({
            ...f,
            id: idMap.get(f.id) as string,
            logic: remapLogic(f.logic, idMap),
        }));
        setFields([...fields, ...remapped]);
    };

    const toggleChecked = (id: string) =>
        setCheckedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });

    const clearChecked = () => setCheckedIds(new Set());

    // Selected fields in canvas order, so a saved pattern preserves layout.
    const checkedFields = fields.filter((f) => checkedIds.has(f.id));

    const onDragStart = (event: DragStartEvent) => {
        const data = event.active.data.current;
        if (data?.fromPalette) {
            setPaletteDrag(data.type as FieldType);
        }
    };

    const onDragEnd = (event: DragEndEvent) => {
        setPaletteDrag(null);
        const { active, over } = event;
        if (!over) return;

        if (active.data.current?.fromPalette) {
            const type = active.data.current.type as FieldType;
            const overIndex = fields.findIndex((f) => f.id === over.id);
            addField(type, overIndex === -1 ? undefined : overIndex);
            return;
        }

        if (active.id !== over.id) {
            const from = fields.findIndex((f) => f.id === active.id);
            const to = fields.findIndex((f) => f.id === over.id);
            if (from === -1 || to === -1) return;
            const next = [...fields];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            setFields(next);
        }
    };

    const selected = fields.find((f) => f.id === selectedFieldId) ?? null;

    return (
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div className="ff:grid ff:h-full ff:grid-cols-[13rem_1fr_17rem] ff:gap-0">
                <aside className="ff:flex ff:flex-col ff:gap-4 ff:overflow-y-auto ff:border-r ff:border-slate-200 ff:bg-white ff:p-3">
                    {FIELD_CATEGORIES.map((cat) => {
                        const items = FIELD_TYPES.filter((m) => m.category === cat.value);
                        if (items.length === 0) {
                            return null;
                        }
                        return (
                            <PaletteSection key={cat.value} label={cat.label()}>
                                {items.map((meta) => (
                                    <PaletteItem key={meta.type} type={meta.type} onAdd={() => addField(meta.type)} />
                                ))}
                            </PaletteSection>
                        );
                    })}

                    <PatternsSection onInsert={insertPattern} />
                </aside>

                <Canvas
                    fields={fields}
                    selectedId={selectedFieldId}
                    checkedIds={checkedIds}
                    onSelect={setSelectedField}
                    onToggleChecked={toggleChecked}
                    onRemove={(id) => {
                        setFields(fields.filter((f) => f.id !== id));
                        if (selectedFieldId === id) setSelectedField(null);
                        setCheckedIds((prev) => {
                            if (!prev.has(id)) return prev;
                            const next = new Set(prev);
                            next.delete(id);
                            return next;
                        });
                    }}
                />

                <aside className="ff:overflow-y-auto ff:border-l ff:border-slate-200 ff:bg-white ff:p-4">
                    <Inspector
                        config={config}
                        field={selected}
                        onChange={onChange}
                        onFieldChange={(patch) =>
                            selected &&
                            setFields(fields.map((f) => (f.id === selected.id ? { ...f, ...patch } : f)))
                        }
                    />
                </aside>
            </div>

            <SelectionBar fields={checkedFields} onClear={clearChecked} />

            <DragOverlay>
                {paletteDrag ? <PaletteGhost type={paletteDrag} /> : null}
            </DragOverlay>
        </DndContext>
    );
}

/**
 * Floating bar shown while one or more canvas fields are checked. Saves the
 * checked fields (in canvas order) as a form pattern in My Library, so a group
 * of fields can be reused without saving the whole form.
 */
function SelectionBar({ fields, onClear }: { fields: FormField[]; onClear: () => void }) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const save = useSaveToLibrary();
    const showToast = useUiStore((s) => s.showToast);
    const count = fields.length;

    if (count === 0) {
        return null;
    }

    const start = () => {
        setName("");
        setOpen(true);
    };

    const onSave = () => {
        const trimmed = name.trim();
        if (trimmed === "") {
            return;
        }
        save.mutate(
            { type: "pattern", kind: "form", name: trimmed, payload: { fields } },
            {
                onSuccess: () => {
                    showToast(__("Saved to your library"));
                    setOpen(false);
                    onClear();
                },
                onError: () => showToast(__("Could not save to the library."), "error"),
            },
        );
    };

    return (
        <>
            <div className="ff:fixed ff:bottom-6 ff:left-1/2 ff:z-[120] ff:flex ff:-translate-x-1/2 ff:items-center ff:gap-3 ff:rounded-full ff:border ff:border-slate-200 ff:bg-white ff:py-2 ff:pe-2 ff:ps-4 ff:shadow-lg">
                <span className="ff:text-sm ff:font-medium ff:text-slate-700">
                    {sprintf(__("%d selected"), count)}
                </span>
                <button
                    type="button"
                    onClick={onClear}
                    className="ff:cursor-pointer ff:rounded ff:bg-transparent ff:px-2 ff:py-1 ff:text-sm ff:text-slate-500 ff:transition-colors ff:hover:text-slate-800"
                >
                    {__("Clear")}
                </button>
                <Button size="sm" onClick={start}>
                    <Bookmark aria-hidden className="ff:h-4 ff:w-4" />
                    {__("Save as pattern")}
                </Button>
            </div>

            <Dialog open={open} onOpenChange={(next) => !next && setOpen(false)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{__("Save selection as a pattern")}</DialogTitle>
                        <DialogDescription>
                            {sprintf(
                                __("These %d fields become a reusable pattern you can drop into any form later."),
                                count,
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="ff:py-2">
                        <Label htmlFor="ff-save-pattern-name" className="ff:mb-1.5 ff:block">
                            {__("Name")}
                        </Label>
                        <Input
                            id="ff-save-pattern-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={__("Name this pattern")}
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    onSave();
                                }
                            }}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>
                            {__("Cancel")}
                        </Button>
                        <Button onClick={onSave} disabled={save.isPending || name.trim() === ""}>
                            {save.isPending ? __("Saving…") : __("Save pattern")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

/** Repoint a field's logic rule (if any) at the pattern's new field ids. */
function remapLogic(logic: FormField["logic"], idMap: Map<string, string>): FieldLogic | undefined {
    if (!logic || typeof (logic as FieldLogic).field !== "string" || !("operator" in logic)) {
        return undefined;
    }
    const rule = logic as FieldLogic;
    return { ...rule, field: idMap.get(rule.field) ?? rule.field };
}

function PaletteSection({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="ff:mb-1.5 ff:px-1 ff:text-xs ff:font-semibold ff:uppercase ff:tracking-wide ff:text-slate-400">
                {label}
            </p>
            <div className="ff:flex ff:flex-col ff:gap-1">{children}</div>
        </div>
    );
}

/**
 * Patterns are a first-class insert category. Only saved form assets carry real
 * field payloads (catalog entries are marketing metadata), so this lists My
 * Library form patterns; pack patterns land here once imported.
 */
function PatternsSection({ onInsert }: { onInsert: (raw: SavedAsset) => void }) {
    const { data: mine } = useMyLibrary();
    const patterns = (mine ?? []).filter((r) => r.raw.kind === "form");
    if (patterns.length === 0) {
        return null;
    }
    return (
        <PaletteSection label={__("Patterns")}>
            {patterns.map(({ raw }) => {
                const count = Array.isArray((raw.payload as { fields?: unknown }).fields)
                    ? (raw.payload as { fields: unknown[] }).fields.length
                    : 0;
                return (
                    <button
                        key={raw.id}
                        type="button"
                        onClick={() => onInsert(raw)}
                        className="ff:flex ff:cursor-pointer ff:items-center ff:gap-2.5 ff:rounded-lg ff:border ff:border-transparent ff:bg-transparent ff:px-2.5 ff:py-2 ff:text-left ff:text-sm ff:font-medium ff:text-slate-700 ff:transition-colors ff:hover:border-slate-200 ff:hover:bg-slate-50"
                    >
                        <Sparkles aria-hidden className="ff:h-4 ff:w-4 ff:text-slate-400" />
                        <span className="ff:min-w-0 ff:flex-1 ff:truncate">{raw.name}</span>
                        <span className="ff:text-xs ff:text-slate-400 ff:tabular-nums">{count}</span>
                    </button>
                );
            })}
        </PaletteSection>
    );
}

function PaletteItem({ type, onAdd }: { type: FieldType; onAdd: () => void }) {
    const meta = fieldTypeMeta(type);
    const { attributes, listeners, setNodeRef } = useDraggable({
        id: `palette-${type}`,
        data: { fromPalette: true, type },
    });
    const Icon = meta.icon;

    return (
        <button
            ref={setNodeRef}
            type="button"
            onClick={onAdd}
            className="ff:flex ff:cursor-grab ff:items-center ff:gap-2.5 ff:rounded-lg ff:border ff:border-transparent ff:bg-transparent ff:px-2.5 ff:py-2 ff:text-left ff:text-sm ff:font-medium ff:text-slate-700 ff:transition-colors ff:hover:border-slate-200 ff:hover:bg-slate-50"
            {...attributes}
            {...listeners}
        >
            <Icon aria-hidden className="ff:h-4 ff:w-4 ff:text-slate-400" />
            {meta.label()}
        </button>
    );
}

function PaletteGhost({ type }: { type: FieldType }) {
    const meta = fieldTypeMeta(type);
    const Icon = meta.icon;
    return (
        <div className="ff:flex ff:rotate-2 ff:items-center ff:gap-2.5 ff:rounded-lg ff:border ff:border-slate-200 ff:bg-white ff:px-2.5 ff:py-2 ff:text-sm ff:font-medium ff:text-slate-700 ff:shadow-lg">
            <Icon aria-hidden className="ff:h-4 ff:w-4 ff:text-slate-400" />
            {meta.label()}
        </div>
    );
}

function Canvas({
    fields,
    selectedId,
    checkedIds,
    onSelect,
    onToggleChecked,
    onRemove,
}: {
    fields: FormField[];
    selectedId: string | null;
    checkedIds: Set<string>;
    onSelect: (id: string | null) => void;
    onToggleChecked: (id: string) => void;
    onRemove: (id: string) => void;
}) {
    const { setNodeRef, isOver } = useDroppable({ id: "canvas" });

    return (
        <div className="ff:overflow-y-auto ff:p-6" onClick={() => onSelect(null)}>
            <div
                ref={setNodeRef}
                className={cn(
                    "ff:mx-auto ff:flex ff:max-w-xl ff:flex-col ff:gap-2 ff:rounded-xl ff:border ff:bg-white ff:p-5 ff:shadow-sm",
                    isOver && fields.length === 0 ? "ff:border-brand-500" : "ff:border-slate-200",
                )}
            >
                {fields.length === 0 ? (
                    <div className="ff:flex ff:min-h-48 ff:flex-col ff:items-center ff:justify-center ff:gap-2 ff:rounded-lg ff:border-2 ff:border-dashed ff:border-slate-200 ff:text-center">
                        <MousePointerClick aria-hidden className="ff:h-5 ff:w-5 ff:text-slate-400" />
                        <p className="ff:text-sm ff:text-slate-500">
                            {__("Click or drag a field from the left to start.")}
                        </p>
                    </div>
                ) : (
                    <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                        {fields.map((field) => (
                            <FieldCard
                                key={field.id}
                                field={field}
                                selected={field.id === selectedId}
                                checked={checkedIds.has(field.id)}
                                onSelect={() => onSelect(field.id)}
                                onToggleChecked={() => onToggleChecked(field.id)}
                                onRemove={() => onRemove(field.id)}
                            />
                        ))}
                    </SortableContext>
                )}
            </div>
        </div>
    );
}

function FieldCard({
    field,
    selected,
    checked,
    onSelect,
    onToggleChecked,
    onRemove,
}: {
    field: FormField;
    selected: boolean;
    checked: boolean;
    onSelect: () => void;
    onToggleChecked: () => void;
    onRemove: () => void;
}) {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
        useSortable({ id: field.id });
    const meta = fieldTypeMeta(field.type);
    const Icon = meta.icon;

    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            className={cn(
                "ff:group ff:flex ff:items-center ff:gap-2 ff:rounded-lg ff:border ff:bg-white ff:px-3 ff:py-2.5 ff:transition-colors",
                selected
                    ? "ff:border-brand-500 ff:bg-brand-50/40 ff:ring-1 ff:ring-brand-500"
                    : checked
                      ? "ff:border-brand-300 ff:bg-brand-50/30"
                      : "ff:border-slate-200 ff:hover:border-slate-300",
                isDragging && "ff:opacity-40",
            )}
            onClick={(e) => {
                e.stopPropagation();
                onSelect();
            }}
        >
            <button
                type="button"
                aria-label={checked ? __("Deselect field") : __("Select field")}
                aria-pressed={checked}
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleChecked();
                }}
                className={cn(
                    "ff:flex ff:h-4 ff:w-4 ff:shrink-0 ff:cursor-pointer ff:items-center ff:justify-center ff:rounded ff:border ff:transition-all",
                    checked
                        ? "ff:border-brand-500 ff:bg-brand-500 ff:text-white ff:opacity-100"
                        : "ff:border-slate-300 ff:bg-white ff:text-transparent ff:opacity-0 ff:group-hover:opacity-100",
                )}
            >
                <Check aria-hidden className="ff:h-3 ff:w-3" />
            </button>
            <button
                ref={setActivatorNodeRef}
                type="button"
                aria-label={__("Reorder field")}
                className="ff:cursor-grab ff:touch-none ff:rounded ff:bg-transparent ff:p-1 ff:text-slate-300 ff:hover:text-slate-500"
                {...attributes}
                {...listeners}
            >
                <GripVertical aria-hidden className="ff:h-4 ff:w-4" />
            </button>
            <Icon aria-hidden className="ff:h-4 ff:w-4 ff:shrink-0 ff:text-slate-400" />
            <div className="ff:min-w-0 ff:flex-1">
                <p className="ff:truncate ff:text-sm ff:font-medium ff:text-slate-900">
                    {field.label || meta.label()}
                    {field.required ? <span className="ff:ml-1 ff:text-red-500">*</span> : null}
                </p>
                <p className="ff:text-xs ff:text-slate-400">
                    {meta.label()}
                    {widthLabel(field.width) ? " · " + widthLabel(field.width) : ""}
                    {(field.widthTablet && field.widthTablet !== "inherit") ||
                    (field.widthMobile && field.widthMobile !== "inherit")
                        ? " · " + __("responsive")
                        : ""}
                </p>
            </div>
            <button
                type="button"
                aria-label={__("Delete field")}
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                }}
                className="ff:cursor-pointer ff:rounded ff:bg-transparent ff:p-1 ff:text-slate-300 ff:opacity-0 ff:transition-opacity ff:hover:text-red-600 ff:group-hover:opacity-100"
            >
                <Trash2 aria-hidden className="ff:h-4 ff:w-4" />
            </button>
        </div>
    );
}
