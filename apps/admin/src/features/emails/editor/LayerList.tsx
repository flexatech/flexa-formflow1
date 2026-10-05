import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import {
    SortableContext,
    arrayMove,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, GripVertical, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { BLOCK_DRAG_TYPE, ELEMENT_TYPES, elementDef, type EmailElement } from "../types";
import { __ } from "@/lib/i18n";

interface LayerListProps {
    elements: EmailElement[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    onAdd: (type: string) => void;
    onReorder: (elements: EmailElement[]) => void;
    onDuplicate: (id: string) => void;
    onDelete: (id: string) => void;
}

export function LayerList({
    elements,
    selectedId,
    onSelect,
    onAdd,
    onReorder,
    onDuplicate,
    onDelete,
}: LayerListProps) {
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) {
            return;
        }
        const oldIndex = elements.findIndex((el) => el.id === active.id);
        const newIndex = elements.findIndex((el) => el.id === over.id);
        onReorder(arrayMove(elements, oldIndex, newIndex));
    };

    return (
        <div className="ff:flex ff:h-full ff:flex-col">
            <div className="ff:flex-1 ff:overflow-y-auto ff:overflow-x-hidden ff:p-3">
                {elements.length === 0 ? (
                    <p className="ff:rounded-lg ff:border ff:border-dashed ff:border-slate-300 ff:p-4 ff:text-center ff:text-xs ff:text-slate-500">
                        {__("Add blocks below to start building.")}
                    </p>
                ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={elements.map((el) => el.id)} strategy={verticalListSortingStrategy}>
                            <ul className="ff:m-0 ff:flex ff:list-none ff:flex-col ff:gap-1 ff:p-0">
                                {elements.map((el) => (
                                    <LayerRow
                                        key={el.id}
                                        element={el}
                                        selected={el.id === selectedId}
                                        onSelect={() => onSelect(el.id)}
                                        onDuplicate={() => onDuplicate(el.id)}
                                        onDelete={() => onDelete(el.id)}
                                    />
                                ))}
                            </ul>
                        </SortableContext>
                    </DndContext>
                )}
            </div>

            <div className="ff:border-t ff:border-slate-200 ff:p-3">
                <p className="ff:mb-2 ff:text-xs ff:font-semibold ff:uppercase ff:tracking-wide ff:text-slate-500">
                    {__("Add block")}
                </p>
                <div className="ff:grid ff:grid-cols-2 ff:gap-1.5">
                    {ELEMENT_TYPES.map((def) => {
                        const Icon = def.icon;
                        return (
                            <button
                                key={def.type}
                                type="button"
                                draggable
                                onDragStart={(e) => {
                                    e.dataTransfer.setData(BLOCK_DRAG_TYPE, def.type);
                                    e.dataTransfer.effectAllowed = "copy";
                                }}
                                onClick={() => onAdd(def.type)}
                                title={def.description}
                                className="ff:flex ff:cursor-grab ff:items-center ff:gap-2 ff:rounded-md ff:border ff:border-slate-200 ff:bg-white ff:px-2 ff:py-2 ff:text-left ff:text-xs ff:font-medium ff:text-slate-700 ff:transition-colors ff:hover:border-brand-300 ff:hover:bg-brand-50 ff:hover:text-brand-700 ff:active:cursor-grabbing"
                            >
                                <Icon aria-hidden className="ff:h-3.5 ff:w-3.5 ff:shrink-0" />
                                <span className="ff:truncate">{def.label}</span>
                                <Plus aria-hidden className="ff:ml-auto ff:h-3 ff:w-3 ff:shrink-0 ff:text-slate-400" />
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function LayerRow({
    element,
    selected,
    onSelect,
    onDuplicate,
    onDelete,
}: {
    element: EmailElement;
    selected: boolean;
    onSelect: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: element.id,
    });
    const def = elementDef(element.type);

    return (
        <li
            ref={setNodeRef}
            // Lock dragging to the vertical axis: zero the X translate so a
            // reorder never slides sideways and grows a horizontal scrollbar.
            style={{ transform: transform ? CSS.Transform.toString({ ...transform, x: 0 }) : undefined, transition }}
            className={cn(
                "ff:group ff:flex ff:items-center ff:gap-1.5 ff:rounded-md ff:border ff:px-2 ff:py-1.5",
                selected
                    ? "ff:border-brand-500 ff:bg-brand-50"
                    : "ff:border-slate-200 ff:bg-white ff:hover:border-slate-300",
                isDragging && "ff:opacity-60",
            )}
        >
            <button
                type="button"
                {...attributes}
                {...listeners}
                className="ff:cursor-grab ff:border-0 ff:bg-transparent ff:p-0 ff:text-slate-400"
                aria-label={__("Drag to reorder")}
            >
                <GripVertical className="ff:h-4 ff:w-4" />
            </button>
            <button
                type="button"
                onClick={onSelect}
                className="ff:min-w-0 ff:flex-1 ff:cursor-pointer ff:border-0 ff:bg-transparent ff:p-0 ff:text-left ff:text-sm ff:text-slate-800"
            >
                {def?.label ?? element.type}
            </button>
            <button
                type="button"
                onClick={onDuplicate}
                className="ff:invisible ff:cursor-pointer ff:border-0 ff:bg-transparent ff:p-0.5 ff:text-slate-400 ff:hover:text-slate-700 ff:group-hover:visible"
                aria-label={__("Duplicate")}
            >
                <Copy className="ff:h-3.5 ff:w-3.5" />
            </button>
            <button
                type="button"
                onClick={onDelete}
                className="ff:invisible ff:cursor-pointer ff:border-0 ff:bg-transparent ff:p-0.5 ff:text-slate-400 ff:hover:text-red-600 ff:group-hover:visible"
                aria-label={__("Delete")}
            >
                <Trash2 className="ff:h-3.5 ff:w-3.5" />
            </button>
        </li>
    );
}
