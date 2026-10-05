/**
 * Dependency-free hash router. Routes:
 *   #/               → dashboard
 *   #/forms          → forms list
 *   #/forms/:id/edit → form builder (full-area takeover, no sidebar)
 *   #/entries        → entries list
 *   #/entries/:id    → entry detail
 *   #/emails         → Emails screen, Form Emails tab
 *   #/emails/woocommerce → Emails screen, WooCommerce tab (Woo-only)
 *   #/emails/:id/edit → email editor (full-area takeover, no sidebar)
 *   #/settings       → settings
 * Upcoming sections (the Library) stay parseable but are only reachable when
 * the SHOW_UPCOMING flag in lib/flags.ts is on. AI is not a route: it lives as
 * entry points inside the builders plus provider config in Settings.
 */

export type Route =
    | { name: "dashboard" }
    | { name: "forms" }
    | { name: "builder"; id: number }
    | { name: "entries" }
    | { name: "entry"; id: number }
    | { name: "emails" }
    | { name: "emailEditor"; id: number }
    | { name: "woocommerce" }
    | { name: "workflows" }
    | { name: "workflowEditor"; id: number }
    | { name: "integrations" }
    | { name: "library" }
    | { name: "pack"; id: string }
    | { name: "settings" };

export function parseHash(hash: string): Route {
    // Drop any query string before matching segments.
    const path = hash.replace(/^#\/?/, "").split("?")[0];
    const segments = path.split("/").filter(Boolean);
    const [head, second, third] = segments;

    switch (head) {
        case "forms":
            if (second && /^\d+$/.test(second) && third === "edit") {
                return { name: "builder", id: parseInt(second, 10) };
            }
            return { name: "forms" };
        case "entries":
            if (second && /^\d+$/.test(second)) {
                return { name: "entry", id: parseInt(second, 10) };
            }
            return { name: "entries" };
        case "emails":
            if (second && /^\d+$/.test(second) && third === "edit") {
                return { name: "emailEditor", id: parseInt(second, 10) };
            }
            if (second === "woocommerce") {
                return { name: "woocommerce" };
            }
            return { name: "emails" };
        case "woocommerce":
            return { name: "woocommerce" };
        case "workflows":
            if (second && /^\d+$/.test(second) && third === "edit") {
                return { name: "workflowEditor", id: parseInt(second, 10) };
            }
            return { name: "workflows" };
        case "integrations":
            return { name: "integrations" };
        case "library":
            if (second === "pack" && third) {
                return { name: "pack", id: third };
            }
            return { name: "library" };
        case "settings":
            return { name: "settings" };
        default:
            return { name: "dashboard" };
    }
}

export function currentRoute(): Route {
    return parseHash(window.location.hash);
}

export function navigate(path: string): void {
    window.location.hash = path.startsWith("/") ? path : `/${path}`;
}
