import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/**
 * The Library ownership-chip taxonomy (PRODUCT_DESIGN.md section N). One tone
 * per meaning, no gradients, no animation. Rule enforced by callers: at most
 * one chip per card, and `installed` wins over every other state.
 */
const badgeVariants = cva(
    "ff:inline-flex ff:items-center ff:gap-1 ff:whitespace-nowrap ff:rounded-full ff:px-2 ff:py-0.5 ff:text-[11px] ff:font-medium ff:leading-none",
    {
        variants: {
            variant: {
                free: "ff:bg-slate-100 ff:text-slate-600 ff:ring-1 ff:ring-inset ff:ring-slate-200",
                installed: "ff:bg-emerald-50 ff:text-emerald-700 ff:ring-1 ff:ring-inset ff:ring-emerald-200",
                update: "ff:bg-amber-50 ff:text-amber-700 ff:ring-1 ff:ring-inset ff:ring-amber-200",
                neutral: "ff:bg-slate-100 ff:text-slate-600",
            },
        },
        defaultVariants: { variant: "neutral" },
    },
);

export interface BadgeProps
    extends HTMLAttributes<HTMLSpanElement>,
        VariantProps<typeof badgeVariants> {}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
    ({ className, variant, ...props }, ref) => (
        <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />
    ),
);
Badge.displayName = "Badge";

export { badgeVariants };
