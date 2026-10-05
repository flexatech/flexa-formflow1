import { Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { useUiStore } from "@/lib/store";

const AUTO_DISMISS_MS = 2500;

let activeClaim: symbol | null = null;

/**
 * The admin app can mount more than one React root in a page. A module-level
 * claim ensures only the first-mounted Toaster renders, so we don't get
 * duplicate portal'd toasts stacked on top of one another.
 */
export function Toaster() {
    const toast = useUiStore((s) => s.toast);
    const dismiss = useUiStore((s) => s.dismissToast);
    const [owns, setOwns] = useState(false);

    useEffect(() => {
        if (activeClaim !== null) {
            return;
        }
        const claim = Symbol("toaster");
        activeClaim = claim;
        setOwns(true);
        return () => {
            if (activeClaim === claim) {
                activeClaim = null;
            }
            setOwns(false);
        };
    }, []);

    useEffect(() => {
        if (!owns || !toast) {
            return;
        }
        const timer = window.setTimeout(dismiss, AUTO_DISMISS_MS);
        return () => window.clearTimeout(timer);
    }, [owns, toast, dismiss]);

    if (!owns || !toast) {
        return null;
    }

    return createPortal(
        <div
            key={toast.id}
            role="status"
            aria-live="polite"
            className="ff:pointer-events-none ff:fixed ff:left-1/2 ff:top-6 ff:z-[160003] ff:-translate-x-1/2"
        >
            <div
                className={cn(
                    "ff:pointer-events-auto ff:flex ff:items-center ff:gap-2 ff:rounded-full ff:px-4 ff:py-2 ff:text-sm ff:shadow-lg ff:ring-1",
                    toast.tone === "error"
                        ? "ff:bg-red-50 ff:text-red-700 ff:ring-red-200"
                        : "ff:bg-emerald-50 ff:text-emerald-800 ff:ring-emerald-200",
                )}
            >
                {toast.tone === "error" ? (
                    <X aria-hidden className="ff:h-4 ff:w-4" />
                ) : (
                    <Check aria-hidden className="ff:h-4 ff:w-4" />
                )}
                <span>{toast.message}</span>
            </div>
        </div>,
        document.body,
    );
}
