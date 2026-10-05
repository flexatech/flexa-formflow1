import {
    CalendarClock,
    Compass,
    FileText,
    Inbox,
    Library,
    Mail,
    MailWarning,
    Plug,
    Plus,
    ShoppingCart,
    Workflow,
    type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { __ } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { SHOW_UPCOMING } from "@/lib/flags";
import { useUiStore } from "@/lib/store";
import { PackCard } from "@/components/custom/PackCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useEntriesList } from "@/features/entries/useEntries";
import { entryExcerpt } from "@/features/entries/EntryFields";
import { useFormsList } from "@/features/forms/useForms";
import { formatDate } from "@/features/forms/FormsListPage";
import { usePacks } from "@/features/library/useLibrary";
import { navigate } from "@/lib/router";
import { useStats } from "./useStats";

export function DashboardPage() {
    const setGuideOpen = useUiStore((s) => s.setGuideOpen);
    const { data: stats } = useStats();
    const { data: recent, isLoading: recentLoading } = useEntriesList({ per_page: 5 });
    const { data: formsData } = useFormsList({ per_page: 100 });
    const formById = new Map((formsData?.items ?? []).map((f) => [f.id, f]));
    const { data: packs } = usePacks();
    const hasWoo = window.flexaFormFlow?.hasWooCommerce ?? false;

    const cards = [
        { label: __("Forms"), icon: FileText, value: stats?.forms },
        { label: __("Entries"), icon: Inbox, value: stats?.entries },
        { label: __("Unread"), icon: MailWarning, value: stats?.unread },
        { label: __("Last 7 days"), icon: CalendarClock, value: stats?.entries_last_7_days },
    ];

    return (
        <div className="ff:flex ff:flex-col ff:gap-6 ff:p-6">
            <div className="ff:flex ff:flex-col ff:gap-1">
                <h1 className="ff:text-2xl ff:font-semibold ff:text-slate-900">{__("Welcome to FormFlow")}</h1>
                <p className="ff:m-0 ff:text-sm ff:text-slate-500">
                    {__("Build forms, design the emails they send, and automate what happens next.")}
                </p>
            </div>

            <div className="ff:grid ff:grid-cols-2 ff:gap-3 ff:lg:grid-cols-4">
                <QuickAction href="#/forms" icon={Plus} label={__("Create form")} />
                <QuickAction href="#/emails" icon={Mail} label={__("Create email")} />
                <QuickAction href="#/workflows" icon={Workflow} label={__("Create workflow")} />
                {SHOW_UPCOMING ? (
                    <QuickAction href="#/library" icon={Library} label={__("Browse Library")} />
                ) : (
                    <QuickAction href="#/entries" icon={Inbox} label={__("View entries")} />
                )}
            </div>

            <div className="ff:grid ff:grid-cols-2 ff:gap-4 ff:lg:grid-cols-4">
                {cards.map(({ label, icon: Icon, value }) => (
                    <div
                        key={label}
                        className="ff:flex ff:flex-col ff:gap-3 ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:p-5"
                    >
                        <div className="ff:flex ff:items-center ff:gap-2 ff:text-slate-500">
                            <Icon aria-hidden className="ff:h-4 ff:w-4" />
                            <span className="ff:text-xs ff:font-medium ff:uppercase ff:tracking-wide">{label}</span>
                        </div>
                        <span
                            className={cn(
                                "ff:text-3xl ff:font-semibold ff:tabular-nums ff:text-slate-900",
                                value === undefined && "ff:animate-pulse ff:text-slate-300",
                            )}
                        >
                            {value ?? "–"}
                        </span>
                    </div>
                ))}
            </div>

            <div className="ff:grid ff:gap-4 ff:lg:grid-cols-[2fr_1fr]">
                <div className="ff:flex ff:flex-col ff:gap-3 ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:p-5">
                    <h2 className="ff:text-sm ff:font-semibold ff:text-slate-900">{__("Recent entries")}</h2>
                    {recentLoading ? (
                        <ul className="ff:flex ff:flex-col ff:gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <li key={i} className="ff:flex ff:items-center ff:justify-between ff:gap-3 ff:px-2 ff:py-2">
                                    <Skeleton className="ff:h-4 ff:w-56 ff:max-w-full" />
                                    <Skeleton className="ff:h-3 ff:w-16 ff:shrink-0" />
                                </li>
                            ))}
                        </ul>
                    ) : !recent || recent.items.length === 0 ? (
                        <p className="ff:text-sm ff:text-slate-500">
                            {__("Submissions will show up here once a published form is shared.")}
                        </p>
                    ) : (
                        <ul className="ff:flex ff:flex-col">
                            {recent.items.map((entry) => (
                                <li key={entry.id}>
                                    <a
                                        href={`#/entries/${entry.id}`}
                                        className="ff:flex ff:items-center ff:justify-between ff:gap-3 ff:rounded-lg ff:px-2 ff:py-2 ff:no-underline ff:transition-colors ff:hover:bg-slate-50"
                                    >
                                        <span className="ff:flex ff:min-w-0 ff:items-center ff:gap-2">
                                            {entry.status === "unread" ? (
                                                <span className="ff:h-2 ff:w-2 ff:shrink-0 ff:rounded-full ff:bg-brand-600" />
                                            ) : (
                                                <span className="ff:h-2 ff:w-2 ff:shrink-0" />
                                            )}
                                            <span
                                                className={cn(
                                                    "ff:truncate ff:text-sm ff:text-slate-800",
                                                    entry.status === "unread" && "ff:font-semibold",
                                                )}
                                            >
                                                {entryExcerpt(entry, formById.get(entry.form_id))}
                                            </span>
                                        </span>
                                        <span className="ff:shrink-0 ff:text-xs ff:text-slate-400">
                                            {formatDate(entry.created_at)}
                                        </span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="ff:flex ff:h-fit ff:flex-col ff:gap-3 ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:p-5">
                    <h2 className="ff:text-sm ff:font-semibold ff:text-slate-900">{__("System")}</h2>
                    <dl className="ff:m-0 ff:flex ff:flex-col ff:gap-2 ff:text-sm">
                        <StatusRow label={__("Version")} value={window.flexaFormFlow?.version ?? "–"} />
                        <StatusRow
                            label={__("WooCommerce")}
                            value={hasWoo ? __("Active") : __("Not detected")}
                            tone={hasWoo ? "ok" : "muted"}
                        />
                    </dl>
                    <a
                        href="#/integrations"
                        className="ff:mt-1 ff:inline-flex ff:items-center ff:gap-1.5 ff:text-xs ff:font-medium ff:text-brand-700 ff:no-underline ff:hover:underline"
                    >
                        <Plug aria-hidden className="ff:h-3.5 ff:w-3.5" />
                        {__("Check delivery and integrations")}
                    </a>
                    <Button variant="outline" className="ff:mt-1 ff:justify-start" onClick={() => setGuideOpen(true)}>
                        <Compass aria-hidden className="ff:h-4 ff:w-4" />
                        {__("Setup guide")}
                    </Button>
                    {hasWoo && (
                        <a
                            href="#/woocommerce"
                            className="ff:inline-flex ff:items-center ff:gap-1.5 ff:text-xs ff:font-medium ff:text-slate-500 ff:no-underline ff:hover:text-slate-800"
                        >
                            <ShoppingCart aria-hidden className="ff:h-3.5 ff:w-3.5" />
                            {__("Customize WooCommerce emails")}
                        </a>
                    )}
                </div>
            </div>

            {SHOW_UPCOMING && (
                <div className="ff:flex ff:flex-col ff:gap-3">
                    <div className="ff:flex ff:items-center ff:justify-between">
                        <h2 className="ff:text-sm ff:font-semibold ff:text-slate-900">{__("From the Library")}</h2>
                        <a
                            href="#/library"
                            className="ff:text-xs ff:font-medium ff:text-brand-700 ff:no-underline ff:hover:underline"
                        >
                            {__("Browse all")}
                        </a>
                    </div>
                    <div className="ff:grid ff:gap-4 ff:md:grid-cols-2">
                        {packs.map((pack) => (
                            <PackCard key={pack.id} pack={pack} onSelect={(p) => navigate(`/library/pack/${p.id}`)} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function QuickAction({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
    return (
        <a
            href={href}
            className="ff:group ff:flex ff:items-center ff:gap-3 ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:px-4 ff:py-3 ff:no-underline ff:transition-colors ff:hover:border-brand-200 ff:hover:bg-brand-50"
        >
            <span className="ff:flex ff:h-9 ff:w-9 ff:shrink-0 ff:items-center ff:justify-center ff:rounded-lg ff:bg-slate-100 ff:text-slate-500 ff:transition-colors ff:group-hover:bg-white ff:group-hover:text-brand-600">
                <Icon aria-hidden className="ff:h-4 ff:w-4" />
            </span>
            <span className="ff:text-sm ff:font-medium ff:text-slate-800">{label}</span>
        </a>
    );
}

function StatusRow({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "ok" | "muted" }) {
    return (
        <div className="ff:flex ff:items-center ff:justify-between ff:gap-3">
            <dt className="ff:text-slate-500">{label}</dt>
            <dd
                className={cn(
                    "ff:m-0 ff:font-medium",
                    tone === "ok" && "ff:text-emerald-600",
                    tone === "muted" && "ff:text-slate-400",
                    tone === "default" && "ff:text-slate-800",
                )}
            >
                {value}
            </dd>
        </div>
    );
}
