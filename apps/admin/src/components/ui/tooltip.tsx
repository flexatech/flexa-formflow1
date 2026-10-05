import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import {
    forwardRef,
    type ComponentPropsWithoutRef,
    type ElementRef,
} from "react";
import { cn } from "@/lib/cn";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = forwardRef<
    ElementRef<typeof TooltipPrimitive.Content>,
    ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
    <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
            ref={ref}
            sideOffset={sideOffset}
            className={cn(
                "ff:z-[160003] ff:overflow-hidden ff:rounded-md ff:bg-slate-900 ff:px-2.5 ff:py-1.5 ff:text-xs ff:font-medium ff:text-slate-50 ff:shadow-md ff:animate-in ff:fade-in-0 ff:zoom-in-95 ff:data-[state=closed]:animate-out ff:data-[state=closed]:fade-out-0 ff:data-[state=closed]:zoom-out-95 ff:data-[side=bottom]:slide-in-from-top-1 ff:data-[side=left]:slide-in-from-right-1 ff:data-[side=right]:slide-in-from-left-1 ff:data-[side=top]:slide-in-from-bottom-1",
                className,
            )}
            {...props}
        />
    </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;
