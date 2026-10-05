import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, ...props }, ref) => (
        <textarea
            ref={ref}
            className={cn(
                "flexa-formflow-control",
                "ff:flex ff:min-h-20 ff:w-full ff:rounded-md ff:border ff:border-slate-300 ff:bg-white ff:px-3 ff:py-2 ff:text-sm ff:shadow-sm ff:transition-colors",
                "ff:placeholder:text-slate-400",
                "ff:focus-visible:outline-none ff:focus-visible:ring-2 ff:focus-visible:ring-brand-500 ff:focus-visible:ring-offset-1",
                "ff:disabled:cursor-not-allowed ff:disabled:opacity-50",
                className,
            )}
            {...props}
        />
    ),
);
Textarea.displayName = "Textarea";
