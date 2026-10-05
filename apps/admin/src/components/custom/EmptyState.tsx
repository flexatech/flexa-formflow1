import { type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    /** Usually a primary Button; omit while the area is under construction. */
    action?: ReactNode;
    /** Small gray caption under the action, e.g. a "coming soon" note. */
    caption?: string;
    className?: string;
}

/**
 * The designed empty state from DESIGN.md Part 5.22: tinted icon disc, short
 * explanation, primary CTA. Never a bare "No data found."
 */
export function EmptyState({ icon: Icon, title, description, action, caption, className }: EmptyStateProps) {
    return (
        <div
            className={cn(
                "ff:flex ff:min-h-[420px] ff:flex-col ff:items-center ff:justify-center ff:gap-4 ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:px-8 ff:py-16 ff:text-center",
                className,
            )}
        >
            <div className="ff:flex ff:h-14 ff:w-14 ff:items-center ff:justify-center ff:rounded-2xl ff:bg-brand-50 ff:text-brand-600">
                <Icon aria-hidden className="ff:h-7 ff:w-7" />
            </div>
            <div className="ff:flex ff:max-w-sm ff:flex-col ff:gap-1">
                <h2 className="ff:text-lg ff:font-semibold ff:text-slate-900">{title}</h2>
                <p className="ff:text-sm ff:text-slate-500">{description}</p>
            </div>
            {action}
            {caption ? <p className="ff:text-xs ff:text-slate-400">{caption}</p> : null}
        </div>
    );
}
