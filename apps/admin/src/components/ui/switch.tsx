import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
    checked: boolean;
    onCheckedChange: (next: boolean) => void;
}

/**
 * Minimal CSS-only toggle - no extra Radix package needed. The hidden input
 * is what the form/keyboard interacts with; the visual is two divs that
 * follow the `peer-checked:` state.
 */
export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
    ({ checked, onCheckedChange, className, disabled, id, ...rest }, ref) => {
        return (
            <label
                className={cn(
                    "ff:relative ff:inline-flex ff:h-5 ff:w-9 ff:cursor-pointer ff:items-center",
                    disabled && "ff:cursor-not-allowed ff:opacity-60",
                    className,
                )}
            >
                <input
                    ref={ref}
                    id={id}
                    type="checkbox"
                    role="switch"
                    checked={checked}
                    disabled={disabled}
                    onChange={(e) => onCheckedChange(e.target.checked)}
                    className="ff:peer ff:sr-only"
                    {...rest}
                />
                <span
                    aria-hidden
                    className="ff:h-5 ff:w-9 ff:rounded-full ff:bg-slate-300 ff:transition-colors ff:peer-checked:bg-brand-600 ff:peer-focus-visible:ring-2 ff:peer-focus-visible:ring-brand-500 ff:peer-focus-visible:ring-offset-2"
                />
                <span
                    aria-hidden
                    className="ff:absolute ff:left-0.5 ff:h-4 ff:w-4 ff:rounded-full ff:bg-white ff:shadow ff:transition-transform ff:peer-checked:translate-x-4"
                />
            </label>
        );
    },
);
Switch.displayName = "Switch";
