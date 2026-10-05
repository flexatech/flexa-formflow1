import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    options: Array<{ value: string; label: string }>;
}

/**
 * Lightweight native `<select>`. We deliberately avoid the Radix Select for
 * the settings page - native renders correctly inside the WP admin frame
 * and is fully a11y/keyboard-conformant out of the box.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ options, className, ...rest }, ref) => (
        <select
            ref={ref}
            className={cn(
                "flexa-formflow-control",
                "ff:h-9 ff:rounded-md ff:border ff:border-slate-300 ff:bg-white ff:px-2 ff:text-sm ff:text-slate-900 ff:shadow-sm ff:transition-colors",
                "ff:focus-visible:outline-none ff:focus-visible:ring-2 ff:focus-visible:ring-brand-500 ff:focus-visible:ring-offset-1",
                "ff:disabled:cursor-not-allowed ff:disabled:opacity-60",
                className,
            )}
            {...rest}
        >
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
    ),
);
Select.displayName = "Select";
