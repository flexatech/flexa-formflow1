import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/**
 * A shimmering placeholder bar. Compose these to mirror the shape of content
 * while a query is loading so the layout does not flash from empty to full.
 */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            aria-hidden
            className={cn("ff:animate-pulse ff:rounded-md ff:bg-slate-200/70", className)}
            {...props}
        />
    );
}
