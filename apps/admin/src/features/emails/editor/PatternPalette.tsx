import { useMemo, useState } from "react";
import { LayoutTemplate, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { __ } from "@/lib/i18n";
import { BLOCK_PATTERN_TYPE, type EmailPattern } from "../types";

interface PatternPaletteProps {
    patterns: EmailPattern[];
    isLoading: boolean;
    /** Append the pattern's blocks to the end of the canvas (click to use). */
    onAdd: (patternId: string) => void;
}

/**
 * The Patterns tab of the email builder's left rail: curated block groups
 * grouped by category. Drag a card onto the canvas to drop it at a spot, or
 * click it to append. Either way the blocks land as normal, editable elements.
 */
export function PatternPalette({ patterns, isLoading, onAdd }: PatternPaletteProps) {
    const [query, setQuery] = useState("");

    const groups = useMemo(() => {
        const q = query.trim().toLowerCase();
        const matched = q === ""
            ? patterns
            : patterns.filter(
                  (p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q),
              );
        const byCategory = new Map<string, EmailPattern[]>();
        for (const pattern of matched) {
            const list = byCategory.get(pattern.category) ?? [];
            list.push(pattern);
            byCategory.set(pattern.category, list);
        }
        return Array.from(byCategory, ([category, items]) => ({ category, items }));
    }, [patterns, query]);

    return (
        <div className="ff:flex ff:h-full ff:flex-col">
            <div className="ff:border-b ff:border-slate-200 ff:p-3">
                <div className="ff:relative">
                    <Search
                        aria-hidden
                        className="ff:pointer-events-none ff:absolute ff:left-2.5 ff:top-1/2 ff:h-3.5 ff:w-3.5 ff:-translate-y-1/2 ff:text-slate-400"
                    />
                    <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={__("Search patterns")}
                        aria-label={__("Search patterns")}
                        // Inline left padding: WP-admin's unlayered `input { padding }`
                        // beats the layered `ff:pl-8` utility, so the icon and text
                        // would overlap. An inline style outranks WP's rule.
                        style={{ paddingLeft: "2rem" }}
                    />
                </div>
            </div>

            <div className="ff:flex-1 ff:overflow-y-auto ff:p-3">
                {isLoading ? (
                    <div className="ff:h-24 ff:animate-pulse ff:rounded-lg ff:border ff:border-slate-200 ff:bg-slate-50" />
                ) : groups.length === 0 ? (
                    <p className="ff:rounded-lg ff:border ff:border-dashed ff:border-slate-300 ff:p-4 ff:text-center ff:text-xs ff:text-slate-500">
                        {__("No patterns match your search.")}
                    </p>
                ) : (
                    <div className="ff:flex ff:flex-col ff:gap-4">
                        {groups.map((group) => (
                            <section key={group.category}>
                                <p className="ff:mb-2 ff:text-xs ff:font-semibold ff:uppercase ff:tracking-wide ff:text-slate-500">
                                    {group.category}
                                </p>
                                <div className="ff:flex ff:flex-col ff:gap-1.5">
                                    {group.items.map((pattern) => (
                                        <PatternCard key={pattern.id} pattern={pattern} onAdd={onAdd} />
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function PatternCard({ pattern, onAdd }: { pattern: EmailPattern; onAdd: (id: string) => void }) {
    return (
        <button
            type="button"
            draggable
            onDragStart={(e) => {
                e.dataTransfer.setData(BLOCK_PATTERN_TYPE, pattern.id);
                e.dataTransfer.effectAllowed = "copy";
            }}
            onClick={() => onAdd(pattern.id)}
            title={__("Drag onto the canvas, or click to add")}
            className="ff:flex ff:cursor-grab ff:items-center ff:gap-2 ff:rounded-md ff:border ff:border-slate-200 ff:bg-white ff:px-2.5 ff:py-2 ff:text-left ff:text-xs ff:font-medium ff:text-slate-700 ff:transition-colors ff:hover:border-brand-300 ff:hover:bg-brand-50 ff:hover:text-brand-700 ff:active:cursor-grabbing"
        >
            <LayoutTemplate aria-hidden className="ff:h-3.5 ff:w-3.5 ff:shrink-0 ff:text-slate-400" />
            <span className="ff:min-w-0 ff:flex-1 ff:truncate">{pattern.name}</span>
            <Plus aria-hidden className="ff:h-3 ff:w-3 ff:shrink-0 ff:text-slate-400" />
        </button>
    );
}
