import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, type = "text", ...props }, ref) => {
        return (
            <input
                ref={ref}
                type={type}
                className={cn(
                    "flexa-formflow-control",
                    "ff:flex ff:h-9 ff:w-full ff:rounded-md ff:border ff:border-slate-300 ff:bg-white ff:px-3 ff:py-1 ff:text-sm ff:shadow-sm ff:transition-colors",
                    "ff:placeholder:text-slate-400",
                    "ff:focus-visible:outline-none ff:focus-visible:ring-2 ff:focus-visible:ring-brand-500 ff:focus-visible:ring-offset-1",
                    "ff:disabled:cursor-not-allowed ff:disabled:opacity-50",
                    className,
                )}
                {...props}
            />
        );
    },
);
Input.displayName = "Input";
