import {
    AlignLeft,
    Code,
    Columns3,
    Heading1,
    Image,
    ImagePlus,
    Minus,
    MousePointerClick,
    MoveVertical,
    Receipt,
    Share2,
    Table,
    Text,
    type LucideIcon,
} from "lucide-react";
import { __ } from "@/lib/i18n";
import type { ConditionSet } from "@/components/custom/SchemaFields";

/**
 * TS mirror of the email tree contract (see docs/M2_PLAN.md) and of the PHP
 * render pipeline in src/Emails/. The block set is flexa-mail's minus the Woo
 * blocks, plus `fields_table`. Add a block in both places or nowhere.
 */

export interface TreeSettings {
    backgroundColor?: string;
    contentBackground?: string;
    textColor?: string;
    /** Falls back to textColor when blank. */
    headingColor?: string;
    /** Falls back to brandColor when blank. */
    linkColor?: string;
    brandColor?: string;
    fontFamily?: string;
    width?: number;
    /** Text direction of the whole email; defaults to ltr. */
    direction?: "ltr" | "rtl";
}

export interface EmailElement {
    id: string;
    type: string;
    props: Record<string, unknown>;
    /**
     * Present only on the `columns` layout block: one child list per column.
     * Nesting is one level deep (a column cannot itself hold a `columns` block).
     */
    columns?: EmailElement[][];
    /**
     * Optional form-entry visibility rules. When present with rules, the block
     * is hidden at send time unless the entry matches (see src/Emails/Render/
     * Visibility.php). Absent or empty means the block is always shown.
     */
    visibility?: ConditionSet;
}

/** The block type that holds columns of child blocks. */
export const LAYOUT_TYPE = "columns";

export function isLayout(type: string): boolean {
    return type === LAYOUT_TYPE;
}

export interface EmailTree {
    version: number;
    settings: TreeSettings;
    elements: EmailElement[];
}

export interface EmailTemplate {
    id: number;
    title: string;
    tree: EmailTree;
    created_at: string;
    updated_at: string;
}

/** One dynamic-data source: a token, its label and a live sample value. */
export interface DynamicDataItem {
    token: string;
    label: string;
    sample: string;
}

/** A group of dynamic-data sources (Form fields, Submission, Site, Order data). */
export interface DynamicDataCategory {
    key: string;
    label: string;
    items: DynamicDataItem[];
}

export interface FieldSpec {
    key: string;
    label: string;
    type: "text" | "textarea" | "number" | "color" | "select" | "url";
    options?: Array<{ value: string; label: string }>;
    min?: number;
    max?: number;
    placeholder?: string;
}

export interface ElementDef {
    type: string;
    label: string;
    description: string;
    icon: LucideIcon;
    fields: FieldSpec[];
    defaults: Record<string, unknown>;
}

const ALIGN: FieldSpec = {
    key: "align",
    label: __("Alignment"),
    type: "select",
    options: [
        { value: "left", label: __("Left") },
        { value: "center", label: __("Center") },
        { value: "right", label: __("Right") },
    ],
};

export const ELEMENT_TYPES: ElementDef[] = [
    {
        type: "logo",
        label: __("Logo"),
        description: __("Your brand logo, links to the site"),
        icon: Image,
        defaults: { image: "", width: 160, align: "center", alt: "", link: "{site_url}" },
        fields: [
            { key: "image", label: __("Image URL"), type: "url", placeholder: "https://…/logo.png" },
            { key: "width", label: __("Width (px)"), type: "number", min: 40, max: 600 },
            ALIGN,
            { key: "link", label: __("Link"), type: "text" },
            { key: "alt", label: __("Alt text"), type: "text" },
        ],
    },
    {
        type: "heading",
        label: __("Heading"),
        description: __("Large title text"),
        icon: Heading1,
        defaults: { text: __("Thanks for reaching out!"), align: "left", fontSize: 24, color: "" },
        fields: [
            { key: "text", label: __("Text"), type: "textarea" },
            ALIGN,
            { key: "fontSize", label: __("Font size"), type: "number", min: 12, max: 48 },
            { key: "color", label: __("Color"), type: "color" },
        ],
    },
    {
        type: "text",
        label: __("Text"),
        description: __("Paragraph with tokens"),
        icon: Text,
        defaults: { html: __("Hi there,"), align: "left", fontSize: 15, color: "" },
        fields: [
            { key: "html", label: __("Text"), type: "textarea" },
            ALIGN,
            { key: "fontSize", label: __("Font size"), type: "number", min: 10, max: 32 },
            { key: "color", label: __("Color"), type: "color" },
        ],
    },
    {
        type: "button",
        label: __("Button"),
        description: __("Call-to-action button"),
        icon: MousePointerClick,
        defaults: {
            text: __("Visit our site"),
            url: "{site_url}",
            align: "center",
            bgColor: "",
            textColor: "#ffffff",
            radius: 6,
            fontSize: 15,
        },
        fields: [
            { key: "text", label: __("Label"), type: "text" },
            { key: "url", label: __("URL"), type: "text" },
            ALIGN,
            { key: "bgColor", label: __("Background"), type: "color" },
            { key: "textColor", label: __("Text color"), type: "color" },
            { key: "radius", label: __("Corner radius"), type: "number", min: 0, max: 30 },
        ],
    },
    {
        type: "image",
        label: __("Image"),
        description: __("Banner or content image"),
        icon: ImagePlus,
        defaults: { url: "", width: 0, align: "center", alt: "", link: "" },
        fields: [
            { key: "url", label: __("Image URL"), type: "url" },
            { key: "width", label: __("Width (px, 0 = full)"), type: "number", min: 0, max: 800 },
            ALIGN,
            { key: "link", label: __("Link"), type: "text" },
            { key: "alt", label: __("Alt text"), type: "text" },
        ],
    },
    {
        type: "divider",
        label: __("Divider"),
        description: __("Horizontal line"),
        icon: Minus,
        defaults: { color: "#e6e6e6", thickness: 1, paddingY: 8 },
        fields: [
            { key: "color", label: __("Color"), type: "color" },
            { key: "thickness", label: __("Thickness"), type: "number", min: 1, max: 8 },
            { key: "paddingY", label: __("Vertical padding"), type: "number", min: 0, max: 60 },
        ],
    },
    {
        type: "spacer",
        label: __("Spacer"),
        description: __("Vertical empty space"),
        icon: MoveVertical,
        defaults: { height: 24 },
        fields: [{ key: "height", label: __("Height (px)"), type: "number", min: 4, max: 160 }],
    },
    {
        type: LAYOUT_TYPE,
        label: __("Columns"),
        description: __("A grid row: drop blocks into each column"),
        icon: Columns3,
        defaults: { gap: 16 },
        // Column count is edited with a dedicated control (it resizes the child
        // lists), so it is not a plain prop field here.
        fields: [{ key: "gap", label: __("Gap between columns (px)"), type: "number", min: 0, max: 40 }],
    },
    {
        type: "social",
        label: __("Social links"),
        description: __("Links to your social profiles"),
        icon: Share2,
        defaults: {
            align: "center",
            facebook: "",
            instagram: "",
            x: "",
            tiktok: "",
            youtube: "",
            pinterest: "",
            website: "",
        },
        fields: [
            ALIGN,
            { key: "facebook", label: "Facebook", type: "url" },
            { key: "instagram", label: "Instagram", type: "url" },
            { key: "x", label: "X", type: "url" },
            { key: "tiktok", label: "TikTok", type: "url" },
            { key: "youtube", label: "YouTube", type: "url" },
            { key: "pinterest", label: "Pinterest", type: "url" },
            { key: "website", label: __("Website"), type: "url" },
        ],
    },
    {
        type: "fields_table",
        label: __("Submitted fields"),
        description: __("A table of the form's answers"),
        icon: Table,
        defaults: { title: __("Submission"), borderColor: "#e6e6e6" },
        fields: [
            { key: "title", label: __("Title"), type: "text" },
            { key: "borderColor", label: __("Border color"), type: "color" },
        ],
    },
    {
        type: "order_details",
        label: __("Order details"),
        description: __("WooCommerce line items and totals"),
        icon: Receipt,
        defaults: { title: __("Order summary"), borderColor: "#e6e6e6" },
        fields: [
            { key: "title", label: __("Title"), type: "text" },
            { key: "borderColor", label: __("Border color"), type: "color" },
        ],
    },
    {
        type: "footer_text",
        label: __("Footer"),
        description: __("Small print at the bottom"),
        icon: AlignLeft,
        defaults: { html: "", align: "center", color: "#8a8a8a" },
        fields: [
            {
                key: "html",
                label: __("Text"),
                type: "textarea",
                placeholder: __("Leave empty to use the site-wide footer from Settings"),
            },
            ALIGN,
            { key: "color", label: __("Color"), type: "color" },
        ],
    },
    {
        type: "html",
        label: __("Custom HTML"),
        description: __("Your own markup (email-safe subset)"),
        icon: Code,
        defaults: { code: "" },
        fields: [{ key: "code", label: __("HTML"), type: "textarea" }],
    },
];

export function elementDef(type: string): ElementDef | undefined {
    return ELEMENT_TYPES.find((def) => def.type === type);
}

/**
 * dataTransfer MIME used when dragging a palette block onto the preview canvas.
 * The payload is the block `type`. Custom subtype so the drop target can tell a
 * block drag from any other drag entering the iframe.
 */
export const BLOCK_DRAG_TYPE = "application/x-ff-block";

/**
 * dataTransfer MIME used when dragging an existing block already on the canvas
 * to a new position. The payload is the element `id`.
 */
export const BLOCK_MOVE_TYPE = "application/x-ff-move";

/**
 * dataTransfer MIME used when dragging a curated pattern onto the canvas. The
 * payload is the pattern `id`; the editor resolves it to its blocks and drops
 * the whole group at the target.
 */
export const BLOCK_PATTERN_TYPE = "application/x-ff-pattern";

/**
 * One block inside a curated pattern (served by GET /emails/patterns). It has
 * no id: the editor assigns fresh ids when the pattern is dropped, so the
 * dropped blocks are normal, editable elements.
 */
export interface PatternBlock {
    type: string;
    props: Record<string, unknown>;
    columns?: PatternBlock[][];
}

/** A curated group of blocks a user can drop in and edit afterwards. */
export interface EmailPattern {
    id: string;
    name: string;
    category: string;
    blocks: PatternBlock[];
}

/** Turn a pattern's id-less blocks into editable elements with fresh ids. */
export function materializePattern(blocks: PatternBlock[]): EmailElement[] {
    return blocks.map(materializeBlock);
}

function materializeBlock(block: PatternBlock): EmailElement {
    const element = newElement(block.type);
    element.props = { ...element.props, ...block.props };
    if (block.columns) {
        element.columns = block.columns.map((col) => col.map(materializeBlock));
    }
    return element;
}

/**
 * A drop position in the tree. `colId === null` means the top level; otherwise
 * it points inside the column `colIndex` of the layout block `colId`.
 */
export interface DropTarget {
    colId: string | null;
    colIndex: number;
    index: number;
}

/** Insert `element` at `target`, returning a new elements array. */
export function insertInTree(
    elements: EmailElement[],
    target: DropTarget,
    element: EmailElement,
): EmailElement[] {
    if (target.colId === null) {
        const next = [...elements];
        next.splice(clampIndex(target.index, next.length), 0, element);
        return next;
    }
    return elements.map((el) => {
        if (el.id !== target.colId || !el.columns) return el;
        const columns = el.columns.map((col) => [...col]);
        const col = columns[target.colIndex] ?? (columns[target.colIndex] = []);
        col.splice(clampIndex(target.index, col.length), 0, element);
        return { ...el, columns };
    });
}

/** Insert several elements at `target`, keeping their given order. */
export function insertManyInTree(
    elements: EmailElement[],
    target: DropTarget,
    newElements: EmailElement[],
): EmailElement[] {
    let next = elements;
    let index = target.index;
    for (const element of newElements) {
        next = insertInTree(next, { ...target, index }, element);
        index += 1;
    }
    return next;
}

/**
 * Remove the element with `id` from wherever it sits (top level or inside a
 * column). Returns the pruned array, the removed element, and where it came
 * from so a move can adjust the destination index.
 */
export function removeFromTree(
    elements: EmailElement[],
    id: string,
): { elements: EmailElement[]; removed: EmailElement | null; from: DropTarget | null } {
    const topIndex = elements.findIndex((el) => el.id === id);
    if (topIndex !== -1) {
        const next = [...elements];
        const [removed] = next.splice(topIndex, 1);
        return { elements: next, removed, from: { colId: null, colIndex: 0, index: topIndex } };
    }
    let removed: EmailElement | null = null;
    let from: DropTarget | null = null;
    const next = elements.map((el) => {
        if (removed || !el.columns) return el;
        const columns = el.columns.map((col) => [...col]);
        for (let c = 0; c < columns.length; c++) {
            const i = columns[c].findIndex((child) => child.id === id);
            if (i !== -1) {
                [removed] = columns[c].splice(i, 1);
                from = { colId: el.id, colIndex: c, index: i };
                return { ...el, columns };
            }
        }
        return el;
    });
    return { elements: next, removed, from };
}

/** Move an existing element to `target`, compensating for the index shift. */
export function moveInTree(
    elements: EmailElement[],
    id: string,
    target: DropTarget,
): EmailElement[] {
    const { elements: pruned, removed, from } = removeFromTree(elements, id);
    if (!removed) return elements;
    let index = target.index;
    // Removing an earlier sibling from the same container shifts the target up.
    if (from && from.colId === target.colId && from.colIndex === target.colIndex && from.index < target.index) {
        index -= 1;
    }
    return insertInTree(pruned, { ...target, index }, removed);
}

/**
 * Replace the element with `id` wherever it sits (top level or one column
 * deep) by running it through `patch`. Untouched branches keep their identity.
 */
export function updateInTree(
    elements: EmailElement[],
    id: string,
    patch: (el: EmailElement) => EmailElement,
): EmailElement[] {
    return elements.map((el) => {
        if (el.id === id) return patch(el);
        if (el.columns) {
            let changed = false;
            const columns = el.columns.map((col) =>
                col.map((child) => {
                    if (child.id !== id) return child;
                    changed = true;
                    return patch(child);
                }),
            );
            if (changed) return { ...el, columns };
        }
        return el;
    });
}

/** Find an element anywhere in the tree (top level or one column deep). */
export function findInTree(elements: EmailElement[], id: string): EmailElement | null {
    for (const el of elements) {
        if (el.id === id) return el;
        if (el.columns) {
            for (const col of el.columns) {
                const hit = col.find((child) => child.id === id);
                if (hit) return hit;
            }
        }
    }
    return null;
}

function clampIndex(index: number, length: number): number {
    return Math.max(0, Math.min(index, length));
}

// Token metadata for the editor is now served by the Dynamic Data endpoint
// (GET /emails/dynamic-data), which carries live sample values as well.

let counter = 0;

export function newElement(type: string): EmailElement {
    const def = elementDef(type);
    counter += 1;
    const element: EmailElement = {
        id: `el_${Date.now().toString(36)}${counter}`,
        type,
        props: { ...(def?.defaults ?? {}) },
    };
    if (isLayout(type)) {
        element.columns = [[], []];
    }
    return element;
}

/** Resize a layout block's column count, preserving existing children. */
export function resizeColumns(element: EmailElement, count: number): EmailElement {
    const current = element.columns ?? [[], []];
    if (count === current.length) return element;
    if (count > current.length) {
        const columns = [...current.map((col) => [...col])];
        while (columns.length < count) columns.push([]);
        return { ...element, columns };
    }
    // Shrinking: fold the dropped columns' children into the last kept column.
    const columns = current.slice(0, count).map((col) => [...col]);
    const overflow = current.slice(count).flat();
    columns[count - 1] = [...columns[count - 1], ...overflow];
    return { ...element, columns };
}

export function emptyTree(): EmailTree {
    return { version: 1, settings: {}, elements: [] };
}
