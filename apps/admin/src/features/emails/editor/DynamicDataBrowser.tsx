import { useMemo, useState } from "react";
import { Braces, Plus, Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { __ } from "@/lib/i18n";
import { useDynamicData } from "../useEmailTemplates";

/**
 * The Dynamic Data browser (PRODUCT_DESIGN.md section I): a browsable, searchable
 * list of the data a template can pull from, grouped by source, each row showing
 * a live sample value. Clicking a row inserts its token at the cursor of the
 * text field being edited (the parent owns where it lands). This replaces the old
 * passive token cheat-sheet; the picker is the friendly surface, so the raw
 * `{token}` only shows on the chip, not in the body.
 */
export function DynamicDataBrowser({
    formId,
    canInsert,
    onInsert,
}: {
    formId: number;
    canInsert: boolean;
    onInsert: (token: string) => void;
}) {
    const { data: categories, isLoading } = useDynamicData(formId);
    const [search, setSearch] = useState("");

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        const source = categories ?? [];
        if (!term) return source;
        return source
            .map((cat) => ({
                ...cat,
                items: cat.items.filter(
                    (i) => `${i.label} ${i.token} ${i.sample}`.toLowerCase().includes(term),
                ),
            }))
            .filter((cat) => cat.items.length > 0);
    }, [categories, search]);

    return (
        <details className="ff:rounded-md ff:border ff:border-slate-200 ff:bg-white" open>
            <summary className="ff:flex ff:cursor-pointer ff:items-center ff:gap-1.5 ff:px-2 ff:py-2 ff:text-xs ff:font-semibold ff:text-slate-600">
                <Braces aria-hidden className="ff:h-3.5 ff:w-3.5" />
                {__("Dynamic data")}
            </summary>
            <div className="ff:flex ff:flex-col ff:gap-2 ff:border-t ff:border-slate-100 ff:p-2">
                <p className="ff:m-0 ff:text-[11px] ff:text-slate-500">
                    {canInsert
                        ? __("Click a value to drop it into the field you are editing.")
                        : __("Select a text block, then click a value to insert it.")}
                </p>
                <span className="ff:relative">
                    <Search
                        aria-hidden
                        className="ff:pointer-events-none ff:absolute ff:left-2 ff:top-1/2 ff:h-3.5 ff:w-3.5 ff:-translate-y-1/2 ff:text-slate-400"
                    />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={__("Search data")}
                        aria-label={__("Search dynamic data")}
                        className={cn(
                            "flexa-formflow-control",
                            "ff:w-full ff:rounded-md ff:py-1 ff:pl-7 ff:pr-2 ff:text-xs ff:text-slate-700 ff:outline-none",
                        )}
                    />
                </span>

                {isLoading ? (
                    <p className="ff:m-0 ff:px-1 ff:py-2 ff:text-xs ff:text-slate-400">{__("Loading…")}</p>
                ) : filtered.length === 0 ? (
                    <p className="ff:m-0 ff:px-1 ff:py-2 ff:text-xs ff:text-slate-400">{__("No matching data.")}</p>
                ) : (
                    <div className="ff:flex ff:max-h-72 ff:flex-col ff:gap-3 ff:overflow-y-auto">
                        {filtered.map((cat) => (
                            <div key={cat.key} className="ff:flex ff:flex-col ff:gap-1">
                                <p className="ff:m-0 ff:px-1 ff:text-[10px] ff:font-semibold ff:uppercase ff:tracking-wide ff:text-slate-400">
                                    {cat.label}
                                </p>
                                {cat.items.map((item) => (
                                    <button
                                        key={item.token}
                                        type="button"
                                        // Keep the field's focus + selection while inserting.
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => onInsert(item.token)}
                                        disabled={!canInsert}
                                        title={item.token}
                                        className="ff:group ff:flex ff:cursor-pointer ff:items-center ff:gap-2 ff:rounded-md ff:border ff:border-transparent ff:px-1.5 ff:py-1 ff:text-left ff:transition-colors ff:hover:border-brand-200 ff:hover:bg-brand-50 disabled:ff:cursor-not-allowed disabled:ff:opacity-50"
                                    >
                                        <span className="ff:flex ff:min-w-0 ff:flex-1 ff:flex-col">
                                            <span className="ff:truncate ff:text-xs ff:font-medium ff:text-slate-700">
                                                {item.label}
                                            </span>
                                            {item.sample !== "" && (
                                                <span className="ff:truncate ff:text-[11px] ff:text-slate-400">
                                                    {item.sample}
                                                </span>
                                            )}
                                        </span>
                                        <Plus
                                            aria-hidden
                                            className="ff:h-3.5 ff:w-3.5 ff:shrink-0 ff:text-slate-300 ff:group-hover:text-brand-600"
                                        />
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </details>
    );
}
