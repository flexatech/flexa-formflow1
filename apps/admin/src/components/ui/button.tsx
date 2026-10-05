import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
    "ff:inline-flex ff:cursor-pointer ff:items-center ff:justify-center ff:gap-2 ff:whitespace-nowrap ff:rounded-md ff:text-sm ff:font-medium ff:transition-colors ff:focus-visible:outline-none ff:focus-visible:ring-2 ff:focus-visible:ring-offset-2 ff:disabled:pointer-events-none ff:disabled:opacity-50",
    {
        variants: {
            variant: {
                default:
                    "ff:bg-brand-600 ff:text-white ff:hover:bg-brand-700 ff:focus-visible:ring-brand-500",
                ghost: "ff:bg-transparent ff:hover:bg-slate-100 ff:text-slate-900",
                outline:
                    "ff:border ff:border-slate-300 ff:bg-white ff:hover:bg-slate-50 ff:text-slate-900",
                destructive:
                    "ff:bg-red-600 ff:text-white ff:hover:bg-red-700 ff:focus-visible:ring-red-500",
            },
            size: {
                default: "ff:h-9 ff:px-4 ff:py-2",
                sm: "ff:h-8 ff:rounded-md ff:px-3 ff:text-xs",
                lg: "ff:h-10 ff:rounded-md ff:px-6",
                icon: "ff:h-9 ff:w-9",
            },
        },
        defaultVariants: { variant: "default", size: "default" },
    },
);

export interface ButtonProps
    extends ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {
    asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild, ...props }, ref) => {
        const Comp = asChild ? Slot : "button";
        return (
            <Comp
                ref={ref}
                className={cn(buttonVariants({ variant, size }), className)}
                {...props}
            />
        );
    },
);
Button.displayName = "Button";

export { buttonVariants };
