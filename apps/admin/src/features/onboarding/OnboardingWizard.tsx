import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    FileText,
    Mail,
    PartyPopper,
    ShoppingCart,
    Sparkles,
    type LucideProps,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { __, _n, sprintf } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { getPluginGlobal } from "@/lib/wp";
import { useUiStore } from "@/lib/store";
import { useStats } from "@/features/dashboard/useStats";
import { useOnboarding, useSetOnboardingStatus } from "./useOnboarding";

interface Step {
    icon: ComponentType<LucideProps>;
    title: string;
    body: string;
    /** A step that points at real work closes the guide and navigates there. */
    cta?: { label: string; href: string };
}

/**
 * First-run guided tour. Greets once on a pending install, then flips the
 * server status to in_progress so a reload never nags. Reachable again anytime
 * from the dashboard "Setup guide" action (the `guideOpen` UI flag).
 */
export function OnboardingWizard() {
    const forcedOpen = useUiStore((s) => s.guideOpen);
    const setGuideOpen = useUiStore((s) => s.setGuideOpen);
    const { data: onboarding } = useOnboarding();
    const { data: stats } = useStats();
    const setStatus = useSetOnboardingStatus();
    const hasWoo = getPluginGlobal().hasWooCommerce;

    const [autoOpen, setAutoOpen] = useState(false);
    const [step, setStep] = useState(0);

    // Greet exactly once, then move pending → in_progress so it won't re-open
    // on the next load. The Plugins-screen notice keys off pending too, so this
    // quietly retires it as well.
    useEffect(() => {
        if (onboarding?.status === "pending") {
            setStep(0);
            setAutoOpen(true);
            setStatus.mutate("in_progress");
        }
    }, [onboarding?.status, setStatus]);

    // Re-entry from the dashboard always starts at the top.
    useEffect(() => {
        if (forcedOpen) {
            setStep(0);
        }
    }, [forcedOpen]);

    const steps = useMemo<Step[]>(() => {
        const list: Step[] = [
            {
                icon: Sparkles,
                title: __("Welcome to FormFlow"),
                body: __(
                    "FormFlow pairs a form builder with a visual email builder. A field someone fills in becomes a token you can drop straight into the email they receive. This short guide points you at the pieces to set up.",
                ),
            },
            {
                icon: FileText,
                title: __("Start with a form"),
                body: __(
                    "Drag fields onto the canvas, mark the ones you need as required, then place the form on any page with its shortcode or block.",
                ),
                cta: { label: __("Open the form builder"), href: "#/forms" },
            },
            {
                icon: Mail,
                title: __("Design the email it sends"),
                body: __(
                    "Every form field becomes a token you can insert into the notification email. Save designs to the template library and send yourself a test before going live.",
                ),
                cta: { label: __("Open the email builder"), href: "#/emails" },
            },
        ];

        if (hasWoo) {
            list.push({
                icon: ShoppingCart,
                title: __("Take over WooCommerce emails"),
                body: __(
                    "Replace WooCommerce's order emails with your own designs, one email at a time. The per-email toggles live under the WooCommerce tab.",
                ),
                cta: { label: __("Open WooCommerce"), href: "#/woocommerce" },
            });
        }

        list.push({
            icon: PartyPopper,
            title: __("You're all set"),
            body: __("That's the tour. You can reopen this guide anytime from the dashboard."),
        });

        return list;
    }, [hasWoo]);

    const open = forcedOpen || autoOpen;
    const total = steps.length;
    const index = Math.min(step, total - 1);
    const current = steps[index];
    const isLast = index === total - 1;
    const Icon = current.icon;

    function close() {
        setAutoOpen(false);
        setGuideOpen(false);
    }

    function skip() {
        setStatus.mutate("dismissed");
        close();
    }

    function finish() {
        setStatus.mutate("completed");
        close();
    }

    const recap = sprintf(
        // translators: 1: a form count phrase, 2: an entry count phrase.
        __("You have %1$s and %2$s so far."),
        sprintf(_n("%s form", "%s forms", stats?.forms ?? 0), stats?.forms ?? 0),
        sprintf(_n("%s entry", "%s entries", stats?.entries ?? 0), stats?.entries ?? 0),
    );

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!next) {
                    close();
                }
            }}
        >
            <DialogContent className="ff:max-w-lg ff:gap-0 ff:overflow-hidden ff:p-0">
                <div className="ff:flex ff:items-start ff:gap-4 ff:border-b ff:border-slate-200 ff:px-6 ff:py-5">
                    <div className="ff:flex ff:h-10 ff:w-10 ff:shrink-0 ff:items-center ff:justify-center ff:rounded-xl ff:bg-brand-50 ff:text-brand-700">
                        <Icon aria-hidden className="ff:h-5 ff:w-5" />
                    </div>
                    <div className="ff:min-w-0 ff:pr-6">
                        <DialogTitle className="ff:text-slate-900">{current.title}</DialogTitle>
                        <DialogDescription className="ff:mt-1.5">{current.body}</DialogDescription>
                    </div>
                </div>

                <div className="ff:px-6 ff:py-5">
                    {current.cta ? (
                        <Button asChild className="ff:w-full" onClick={close}>
                            <a href={current.cta.href}>
                                {current.cta.label}
                                <ArrowRight aria-hidden className="ff:h-4 ff:w-4" />
                            </a>
                        </Button>
                    ) : isLast ? (
                        <div className="ff:flex ff:items-center ff:gap-2 ff:rounded-lg ff:bg-slate-50 ff:px-4 ff:py-3 ff:text-sm ff:font-medium ff:text-slate-700">
                            <CheckCircle2 aria-hidden className="ff:h-4 ff:w-4 ff:shrink-0 ff:text-brand-600" />
                            {recap}
                        </div>
                    ) : (
                        <p className="ff:text-sm ff:text-slate-500">
                            {__("Take the tour, or jump straight in. Nothing here is required.")}
                        </p>
                    )}
                </div>

                <div className="ff:flex ff:items-center ff:justify-between ff:gap-3 ff:border-t ff:border-slate-200 ff:px-6 ff:py-4">
                    <Button variant="ghost" size="sm" className="ff:text-slate-500" onClick={skip}>
                        {__("Skip")}
                    </Button>
                    <div className="ff:flex ff:items-center ff:gap-1.5">
                        {steps.map((s, i) => (
                            <span
                                key={s.title}
                                className={cn(
                                    "ff:h-1.5 ff:rounded-full ff:transition-all",
                                    i === index ? "ff:w-5 ff:bg-brand-600" : "ff:w-1.5 ff:bg-slate-300",
                                )}
                            />
                        ))}
                    </div>
                    <div className="ff:flex ff:items-center ff:gap-2">
                        {index > 0 && (
                            <Button variant="ghost" size="sm" onClick={() => setStep(index - 1)}>
                                <ArrowLeft aria-hidden className="ff:h-4 ff:w-4" />
                                {__("Back")}
                            </Button>
                        )}
                        {isLast ? (
                            <Button size="sm" onClick={finish}>
                                {__("Finish")}
                            </Button>
                        ) : (
                            <Button size="sm" onClick={() => setStep(index + 1)}>
                                {__("Next")}
                                <ArrowRight aria-hidden className="ff:h-4 ff:w-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
