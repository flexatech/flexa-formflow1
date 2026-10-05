import { StrictMode, useEffect, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import {
    FileText,
    Inbox,
    LayoutDashboard,
    Library,
    Mail,
    Maximize2,
    Minimize2,
    Plug,
    Settings,
    Workflow,
} from "lucide-react";
import { AppProviders } from "@/app/providers";
import { Toaster } from "@/components/Toaster";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { LibraryPage } from "@/features/library/LibraryPage";
import { PackDetailPage } from "@/features/library/PackDetailPage";
import { IntegrationsPage } from "@/features/integrations/IntegrationsPage";
import { WorkflowsListPage } from "@/features/workflows/WorkflowsListPage";
import { WorkflowBuilderPage } from "@/features/workflows/builder/WorkflowBuilderPage";
import { OnboardingWizard } from "@/features/onboarding/OnboardingWizard";
import { FormsListPage } from "@/features/forms/FormsListPage";
import { BuilderPage } from "@/features/forms/builder/BuilderPage";
import { EntriesPage } from "@/features/entries/EntriesPage";
import { EntryDetailPage } from "@/features/entries/EntryDetailPage";
import { EmailsPage } from "@/features/emails/EmailsPage";
import { EmailEditorPage } from "@/features/emails/editor/EmailEditorPage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { __ } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { currentRoute, type Route } from "@/lib/router";
import { SHOW_UPCOMING } from "@/lib/flags";
import logoUrl from "@/assets/logo.webp";
import "./styles/index.css";

interface NavItem {
    route: string;
    href: string;
    icon: typeof LayoutDashboard;
    label: () => string;
    upcoming?: boolean;
    /** Shown only when WooCommerce is active. */
    wooOnly?: boolean;
    /** Shown only to users who can manage settings. */
    settingsOnly?: boolean;
}

const NAV: NavItem[] = [
    { route: "dashboard", href: "#/", icon: LayoutDashboard, label: () => __("Dashboard") },
    { route: "forms", href: "#/forms", icon: FileText, label: () => __("Forms") },
    { route: "entries", href: "#/entries", icon: Inbox, label: () => __("Entries") },
    { route: "emails", href: "#/emails", icon: Mail, label: () => __("Emails") },
    { route: "workflows", href: "#/workflows", icon: Workflow, label: () => __("Workflows") },
    { route: "library", href: "#/library", icon: Library, label: () => __("Library"), upcoming: true },
    { route: "integrations", href: "#/integrations", icon: Plug, label: () => __("Integrations") },
    { route: "settings", href: "#/settings", icon: Settings, label: () => __("Settings") },
];

/**
 * Toggle the whole plugin root between its normal in-page flow and a fixed,
 * full-viewport overlay (above wp-admin's own bars/menu). Lives here, above
 * the router, so it applies on every screen - including the full-area
 * builder/editor takeovers - instead of being wired into each page.
 */
function useFullscreen(): [boolean, () => void] {
    const [fullscreen, setFullscreen] = useState(false);

    useEffect(() => {
        document.body.classList.toggle("flexa-formflow-fs-lock", fullscreen);
        return () => document.body.classList.remove("flexa-formflow-fs-lock");
    }, [fullscreen]);

    useEffect(() => {
        if (!fullscreen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setFullscreen(false);
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [fullscreen]);

    return [fullscreen, () => setFullscreen((v) => !v)];
}

/**
 * A bottom-right floating action button, not a top-right one: every screen
 * that takes over the full area (the email/form/workflow editors) already
 * puts its own buttons - Save, Send test, Preview - flush against the top
 * edge, and a fixed top-right control would sit on top of them (and, outside
 * fullscreen, on top of wp-admin's own admin bar). Nothing in this app
 * anchors anything to the bottom-right corner, so it is always clear.
 */
function FullscreenToggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
    const Icon = active ? Minimize2 : Maximize2;
    return (
        <button
            type="button"
            onClick={onToggle}
            title={active ? __("Exit fullscreen (Esc)") : __("Fullscreen")}
            aria-label={active ? __("Exit fullscreen") : __("Fullscreen")}
            className="ff:fixed ff:bottom-5 ff:right-5 ff:z-[100000] ff:flex ff:h-11 ff:w-11 ff:items-center ff:justify-center ff:rounded-full ff:border ff:border-slate-200 ff:bg-white ff:text-slate-600 ff:shadow-lg ff:transition-all ff:hover:-translate-y-0.5 ff:hover:text-brand-700 ff:hover:shadow-xl ff:focus-visible:outline-none ff:focus-visible:ring-2 ff:focus-visible:ring-brand-500 ff:focus-visible:ring-offset-2"
        >
            <Icon aria-hidden className="ff:h-[18px] ff:w-[18px]" />
        </button>
    );
}

function useRoute(): Route {
    const [route, setRoute] = useState<Route>(currentRoute);

    useEffect(() => {
        const onChange = () => setRoute(currentRoute());
        window.addEventListener("hashchange", onChange);
        return () => window.removeEventListener("hashchange", onChange);
    }, []);

    return route;
}

/** Builder detail routes group under their list section for nav highlighting. */
function navSection(route: Route): string {
    switch (route.name) {
        case "builder":
            return "forms";
        case "entry":
            return "entries";
        case "emailEditor":
            return "emails";
        case "woocommerce":
            return "emails";
        case "workflowEditor":
            return "workflows";
        case "pack":
            return "library";
        default:
            return route.name;
    }
}

function screenFor(route: Route): ReactNode {
    switch (route.name) {
        case "forms":
            return <FormsListPage />;
        case "builder":
            return <BuilderPage key={route.id} id={route.id} />;
        case "entries":
            return <EntriesPage />;
        case "entry":
            return <EntryDetailPage key={route.id} id={route.id} />;
        case "emails":
            return <EmailsPage tab="form" />;
        case "emailEditor":
            return <EmailEditorPage key={route.id} id={route.id} />;
        case "woocommerce":
            return <EmailsPage tab="woocommerce" />;
        case "workflows":
            return <WorkflowsListPage />;
        case "workflowEditor":
            return <WorkflowBuilderPage key={route.id} id={route.id} />;
        case "integrations":
            return <IntegrationsPage />;
        case "library":
            return <LibraryPage />;
        case "pack":
            return <PackDetailPage key={route.id} id={route.id} />;
        case "settings":
            return <SettingsPage />;
        case "dashboard":
        default:
            return <DashboardPage />;
    }
}

function App() {
    const route = useRoute();
    const section = navSection(route);
    const hasWoo = window.flexaFormFlow?.hasWooCommerce ?? false;
    const canSettings = window.flexaFormFlow?.canManageSettings ?? false;
    const items = NAV.filter(
        (item) =>
            (SHOW_UPCOMING || !item.upcoming) &&
            (!item.wooOnly || hasWoo) &&
            (!item.settingsOnly || canSettings),
    );
    const [fullscreen, toggleFullscreen] = useFullscreen();

    // Fullscreen lifts the whole root out of wp-admin's flow into a fixed
    // overlay above its admin bar/menu, so the sticky sidebar below has to
    // stop reserving room for that 32px bar (top-8 / h-[calc(100vh-2rem)]).
    const rootClass = cn(
        "ff:flex ff:bg-slate-50",
        fullscreen ? "ff:fixed ff:inset-0 ff:z-[100000] ff:h-screen ff:overflow-auto" : "ff:min-h-screen",
    );
    const sidebarTopClass = fullscreen ? "ff:top-0 ff:h-screen" : "ff:top-8 ff:h-[calc(100vh-2rem)]";

    // The builder and editors are full-area takeovers: no sidebar.
    if (route.name === "builder" || route.name === "emailEditor" || route.name === "workflowEditor") {
        return (
            <div className={rootClass}>
                {screenFor(route)}
                <FullscreenToggle active={fullscreen} onToggle={toggleFullscreen} />
                <Toaster />
            </div>
        );
    }

    return (
        <div className={rootClass}>
            <aside
                className={cn(
                    "ff:sticky ff:flex ff:w-56 ff:shrink-0 ff:flex-col ff:border-r ff:border-slate-200 ff:bg-white",
                    sidebarTopClass,
                )}
            >
                <div className="ff:flex ff:items-center ff:gap-3 ff:px-4 ff:py-4">
                    <img
                        src={logoUrl}
                        alt=""
                        aria-hidden
                        className="ff:h-9 ff:w-9 ff:shrink-0 ff:rounded-xl ff:object-contain"
                    />
                    <div className="ff:flex ff:flex-col">
                        <span className="ff:text-sm ff:font-semibold ff:leading-tight ff:text-slate-900">
                            FormFlow
                        </span>
                        <span className="ff:text-[11px] ff:leading-tight ff:text-slate-400">
                            v{window.flexaFormFlow?.version ?? ""}
                        </span>
                    </div>
                </div>
                <nav className="ff:flex ff:flex-1 ff:flex-col ff:gap-0.5 ff:px-2 ff:py-2">
                    {items.map(({ route: r, href, icon: Icon, label }) => (
                        <NavLink key={r} href={href} active={section === r}>
                            <Icon aria-hidden className="ff:h-4 ff:w-4" />
                            {label()}
                        </NavLink>
                    ))}
                </nav>
            </aside>
            <main className="ff:min-w-0 ff:flex-1">{screenFor(route)}</main>
            <FullscreenToggle active={fullscreen} onToggle={toggleFullscreen} />
            <OnboardingWizard />
            <Toaster />
        </div>
    );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
    return (
        <a
            href={href}
            className={cn(
                "ff:flex ff:items-center ff:gap-2.5 ff:rounded-lg ff:px-3 ff:py-2 ff:text-sm ff:font-medium ff:no-underline ff:transition-colors",
                active
                    ? "ff:bg-brand-50 ff:text-brand-700"
                    : "ff:text-slate-600 ff:hover:bg-slate-100 ff:hover:text-slate-900",
            )}
        >
            {children}
        </a>
    );
}

const rootEl = document.getElementById("flexa-formflow-admin-root");
if (rootEl) {
    createRoot(rootEl).render(
        <StrictMode>
            <AppProviders>
                <App />
            </AppProviders>
        </StrictMode>,
    );
}
