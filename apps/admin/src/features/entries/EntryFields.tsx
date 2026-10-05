import { __ } from "@/lib/i18n";
import type { EntryRow, FormSummary } from "@/features/forms/types";

/** First non-empty value, used as the list-row excerpt. */
export function entryExcerpt(entry: EntryRow, form?: FormSummary): string {
    const fields = form?.config.fields ?? [];
    for (const field of fields) {
        const value = formatValue(entry.data[field.id]);
        if (value !== "") return value;
    }
    const first = Object.values(entry.data)
        .map(formatValue)
        .find((v) => v !== "");
    return first ?? __("(empty entry)");
}

function formatValue(value: unknown): string {
    if (Array.isArray(value)) return value.map(String).join(", ");
    if (value === null || value === undefined) return "";
    return String(value).trim();
}

/**
 * Label → value table for one entry. Field labels come from the form config;
 * fields that no longer exist on the form fall back to their raw id.
 */
export function EntryFields({ entry, form }: { entry: EntryRow; form?: FormSummary }) {
    const fields = form?.config.fields ?? [];
    const known = new Set(fields.map((f) => f.id));
    const orphans = Object.keys(entry.data).filter((key) => !known.has(key));

    const rows: Array<{ key: string; label: string; value: string }> = [
        ...fields.map((field) => ({
            key: field.id,
            label: field.label || field.id,
            value: formatValue(entry.data[field.id]),
        })),
        ...orphans.map((key) => ({ key, label: key, value: formatValue(entry.data[key]) })),
    ];

    return (
        <dl className="ff:flex ff:flex-col ff:gap-3">
            {rows.map((row) => (
                <div key={row.key} className="ff:rounded-lg ff:border ff:border-slate-100 ff:px-3.5 ff:py-2.5">
                    <dt className="ff:text-xs ff:font-medium ff:uppercase ff:tracking-wide ff:text-slate-400">
                        {row.label}
                    </dt>
                    <dd className="ff:mt-0.5 ff:whitespace-pre-wrap ff:break-words ff:text-sm ff:text-slate-900">
                        {row.value || <span className="ff:text-slate-300">–</span>}
                    </dd>
                </div>
            ))}
        </dl>
    );
}
