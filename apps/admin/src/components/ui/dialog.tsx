import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import {
    forwardRef,
    type ComponentPropsWithoutRef,
    type ElementRef,
    type HTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

const DialogOverlay = forwardRef<
    ElementRef<typeof DialogPrimitive.Overlay>,
    ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay
        ref={ref}
        className={cn(
            "ff:fixed ff:inset-0 ff:z-[160001] ff:bg-black/40 ff:backdrop-blur-sm ff:data-[state=open]:animate-in ff:data-[state=closed]:animate-out ff:data-[state=closed]:fade-out-0 ff:data-[state=open]:fade-in-0",
            className,
        )}
        {...props}
    />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

interface DialogContentProps
    extends ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
    overlayClassName?: string;
}

export const DialogContent = forwardRef<
    ElementRef<typeof DialogPrimitive.Content>,
    DialogContentProps
>(({ className, overlayClassName, children, ...props }, ref) => (
    <DialogPrimitive.Portal>
        <DialogOverlay className={overlayClassName} />
        <DialogPrimitive.Content
            ref={ref}
            className={cn(
                "ff:fixed ff:left-1/2 ff:top-1/2 ff:z-[160002] ff:grid ff:w-full ff:max-w-md ff:-translate-x-1/2 ff:-translate-y-1/2 ff:gap-4 ff:rounded-lg ff:border ff:border-slate-200 ff:bg-white ff:p-6 ff:shadow-xl",
                "ff:data-[state=open]:animate-in ff:data-[state=closed]:animate-out",
                className,
            )}
            {...props}
        >
            {children}
            <DialogPrimitive.Close className="ff:absolute ff:right-4 ff:top-4 ff:rounded-sm ff:opacity-70 ff:transition-opacity ff:hover:opacity-100 ff:focus:outline-none ff:focus:ring-2 ff:focus:ring-brand-500">
                <X className="ff:h-4 ff:w-4" />
                <span className="ff:sr-only">Close</span>
            </DialogPrimitive.Close>
        </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

export const DialogHeader = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("ff:flex ff:flex-col ff:space-y-1.5 ff:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

export const DialogFooter = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("ff:flex ff:justify-end ff:gap-2", className)} {...props} />
);
DialogFooter.displayName = "DialogFooter";

export const DialogTitle = forwardRef<
    ElementRef<typeof DialogPrimitive.Title>,
    ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Title
        ref={ref}
        className={cn("ff:text-lg ff:font-semibold ff:leading-none ff:tracking-tight", className)}
        {...props}
    />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

export const DialogDescription = forwardRef<
    ElementRef<typeof DialogPrimitive.Description>,
    ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Description
        ref={ref}
        className={cn("ff:text-sm ff:text-slate-500", className)}
        {...props}
    />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;
