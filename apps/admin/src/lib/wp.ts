/**
 * Bridge to the `flexaFormFlow` global published by Enqueue.php via
 * wp_localize_script.
 */

export type AppTheme = "light" | "dark";

export type OnboardingStatus = "pending" | "in_progress" | "completed" | "dismissed";

export interface OnboardingState {
    version: number;
    status: OnboardingStatus;
    started_at: number | null;
    completed_at: number | null;
    dismissed_at: number | null;
}

/**
 * One field in an extension node's config form. The Free app owns the control
 * vocabulary; an extension (an add-on) only names which control to render
 * and its options. See src/Extensions/Registry.php for the PHP-side contract.
 */
export interface ExtensionField {
    key: string;
    control:
        | "text"
        | "textarea"
        | "email"
        | "url"
        | "number"
        | "select"
        | "switch"
        | "token-text"
        | "field-map"
        | "conditions"
        | "connection";
    label?: string;
    placeholder?: string;
    help?: string;
    default?: unknown;
    options?: { value: string; label: string }[];
    /** Destination rows for a `field-map` control (e.g. CRM fields). */
    mapKeys?: { value: string; label: string }[];
    /** Show this field only when another field equals a value. */
    showIf?: { key: string; equals: string | number | boolean };
    /** A secret (API key): masked input, never returned by the server once set. */
    secret?: boolean;
    /** For a `connection` control: which integration connect form this references. */
    connectionId?: string;
}

/** An extension-registered workflow action node type. */
export interface ExtensionWorkflowAction {
    type: string;
    label: string;
    icon: string;
    group: string;
    summary?: string;
    fields: ExtensionField[];
}

/** An extension-registered integration connect form, keyed to a catalog card id. */
export interface ExtensionIntegration {
    id: string;
    label: string;
    summary?: string;
    fields: ExtensionField[];
    /** Whether values are currently stored for this connection (status snapshot). */
    connected?: boolean;
}

export interface Extensions {
    workflowActions: ExtensionWorkflowAction[];
    integrations: ExtensionIntegration[];
}

export interface PluginGlobal {
    restUrl: string;
    restNonce: string;
    namespace: string;
    version: string;
    pluginUrl: string;
    adminUrl: string;
    locale: string;
    theme: AppTheme;
    /** Whether the current user may change settings (manage_options). */
    canManageSettings: boolean;
    /** Whether WooCommerce is active (the WooCommerce emails tab needs it). */
    hasWooCommerce: boolean;
    /** First-run guide state, localized so the guide renders on first paint. */
    onboarding?: OnboardingState;
    /** Declarative UI registered by add-ons. Empty when none is active. */
    extensions?: Extensions;
}

declare global {
    interface Window {
        flexaFormFlow?: PluginGlobal;
    }
}

export function getPluginGlobal(): PluginGlobal {
    if (!window.flexaFormFlow) {
        throw new Error(
            "flexaFormFlow global missing - make sure Enqueue::enqueue_admin ran before this script.",
        );
    }
    return window.flexaFormFlow;
}
