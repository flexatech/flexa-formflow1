import { cn } from "@/lib/cn";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Placeholder that mirrors the list tables (Forms, Entries, Templates,
 * WooCommerce): a bordered card with a header row and a few body rows. The
 * first column is wider so it reads as a real table while data loads.
 */
export function TableSkeleton({ columns = 4, rows = 6 }: { columns?: number; rows?: number }) {
    return (
        <div className="ff:overflow-hidden ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white">
            <div className="ff:flex ff:gap-4 ff:border-b ff:border-slate-200 ff:px-5 ff:py-3.5">
                {Array.from({ length: columns }).map((_, c) => (
                    <Skeleton key={c} className={cn("ff:h-3", c === 0 ? "ff:flex-1" : "ff:w-16")} />
                ))}
            </div>
            {Array.from({ length: rows }).map((_, r) => (
                <div
                    key={r}
                    className="ff:flex ff:items-center ff:gap-4 ff:border-b ff:border-slate-100 ff:px-5 ff:py-4 ff:last:border-0"
                >
                    {Array.from({ length: columns }).map((_, c) => (
                        <Skeleton key={c} className={cn("ff:h-4", c === 0 ? "ff:flex-1" : "ff:w-16")} />
                    ))}
                </div>
            ))}
        </div>
    );
}

/**
 * Placeholder for stacked card lists (Workflows). Each row is a bordered card
 * with a title bar and a shorter subtitle bar.
 */
export function CardListSkeleton({ rows = 4 }: { rows?: number }) {
    return (
        <div className="ff:flex ff:flex-col ff:gap-3">
            {Array.from({ length: rows }).map((_, r) => (
                <div
                    key={r}
                    className="ff:flex ff:items-center ff:gap-4 ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:px-5 ff:py-4"
                >
                    <Skeleton className="ff:h-9 ff:w-9 ff:shrink-0 ff:rounded-lg" />
                    <div className="ff:flex ff:flex-1 ff:flex-col ff:gap-2">
                        <Skeleton className="ff:h-4 ff:w-48" />
                        <Skeleton className="ff:h-3 ff:w-72 ff:max-w-full" />
                    </div>
                    <Skeleton className="ff:h-8 ff:w-16 ff:shrink-0 ff:rounded-md" />
                </div>
            ))}
        </div>
    );
}

/**
 * Placeholder for card grids (Integrations, dashboard-style tiles). Renders
 * `count` bordered tiles, each with an icon chip and two text bars.
 */
export function CardGridSkeleton({ count = 4, columns = 2 }: { count?: number; columns?: 2 | 3 }) {
    return (
        <div className={cn("ff:grid ff:gap-4", columns === 3 ? "ff:md:grid-cols-3" : "ff:md:grid-cols-2")}>
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className="ff:flex ff:items-center ff:gap-3 ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:p-5"
                >
                    <Skeleton className="ff:h-10 ff:w-10 ff:shrink-0 ff:rounded-lg" />
                    <div className="ff:flex ff:flex-1 ff:flex-col ff:gap-2">
                        <Skeleton className="ff:h-4 ff:w-32" />
                        <Skeleton className="ff:h-3 ff:w-full ff:max-w-56" />
                    </div>
                </div>
            ))}
        </div>
    );
}

/**
 * Placeholder for the settings-style stacked rows: a bordered card holding a
 * few icon + label + control rows.
 */
export function SettingsSkeleton({ rows = 4 }: { rows?: number }) {
    return (
        <div className="ff:overflow-hidden ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white">
            {Array.from({ length: rows }).map((_, r) => (
                <div
                    key={r}
                    className="ff:flex ff:items-center ff:gap-3 ff:border-b ff:border-slate-100 ff:px-5 ff:py-4 ff:last:border-0"
                >
                    <Skeleton className="ff:h-9 ff:w-9 ff:shrink-0 ff:rounded-lg" />
                    <div className="ff:flex ff:flex-1 ff:flex-col ff:gap-2">
                        <Skeleton className="ff:h-4 ff:w-40" />
                        <Skeleton className="ff:h-3 ff:w-64 ff:max-w-full" />
                    </div>
                    <Skeleton className="ff:h-9 ff:w-28 ff:shrink-0 ff:rounded-md" />
                </div>
            ))}
        </div>
    );
}

/**
 * Placeholder for the full-screen builders (form builder, email editor): a
 * toolbar bar plus a three-column canvas so the shell does not flash empty.
 */
export function EditorSkeleton() {
    return (
        <div className="ff:flex ff:h-screen ff:flex-col">
            <div className="ff:flex ff:items-center ff:justify-between ff:gap-4 ff:border-b ff:border-slate-200 ff:bg-white ff:px-4 ff:py-3">
                <Skeleton className="ff:h-5 ff:w-48" />
                <div className="ff:flex ff:gap-2">
                    <Skeleton className="ff:h-8 ff:w-20 ff:rounded-md" />
                    <Skeleton className="ff:h-8 ff:w-20 ff:rounded-md" />
                </div>
            </div>
            <div className="ff:grid ff:flex-1 ff:grid-cols-[240px_1fr_280px] ff:gap-0">
                <div className="ff:flex ff:flex-col ff:gap-3 ff:border-r ff:border-slate-200 ff:bg-white ff:p-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="ff:h-9 ff:w-full ff:rounded-md" />
                    ))}
                </div>
                <div className="ff:flex ff:flex-col ff:items-center ff:gap-4 ff:bg-slate-50 ff:p-8">
                    <Skeleton className="ff:h-40 ff:w-full ff:max-w-lg ff:rounded-lg" />
                    <Skeleton className="ff:h-24 ff:w-full ff:max-w-lg ff:rounded-lg" />
                </div>
                <div className="ff:flex ff:flex-col ff:gap-3 ff:border-l ff:border-slate-200 ff:bg-white ff:p-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="ff:h-9 ff:w-full ff:rounded-md" />
                    ))}
                </div>
            </div>
        </div>
    );
}
