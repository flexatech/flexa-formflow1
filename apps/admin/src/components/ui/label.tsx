import * as LabelPrimitive from "@radix-ui/react-label";
import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

export const Label = forwardRef<
    HTMLLabelElement,
    ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
    <LabelPrimitive.Root
        ref={ref}
        className={cn(
            "ff:text-sm ff:font-medium ff:leading-none ff:text-slate-800 ff:peer-disabled:cursor-not-allowed ff:peer-disabled:opacity-70",
            className,
        )}
        {...props}
    />
));
Label.displayName = "Label";
