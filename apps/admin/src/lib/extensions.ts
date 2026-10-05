/**
 * Client access to the declarative extension registry localized by
 * Enqueue.php (`flexaFormFlow.extensions`). Add-ons describe
 * nodes and panels as data on the PHP side; the Free app reads them here and
 * renders them with the control vocabulary it owns (see SchemaFields). No
 * add-on React runs in this bundle, so there is always exactly one React
 * instance and one query client.
 */

import {
    Braces,
    Clock,
    Database,
    Filter,
    GitBranch,
    MessageSquare,
    Puzzle,
    Send,
    Sparkles,
    Split,
    Tag,
    Users,
    Zap,
    type LucideIcon,
} from "lucide-react";
import type { Extensions, ExtensionIntegration, ExtensionWorkflowAction } from "./wp";

const EMPTY: Extensions = { workflowActions: [], integrations: [] };

/** The registry as localized, or an empty registry when no add-on is active. */
export function extensions(): Extensions {
    return window.flexaFormFlow?.extensions ?? EMPTY;
}

export function workflowActionTypes(): ExtensionWorkflowAction[] {
    return extensions().workflowActions ?? [];
}

export function integrationConnections(): ExtensionIntegration[] {
    return extensions().integrations ?? [];
}

/** The connect form for one catalog card id, if an add-on describes one. */
export function integrationConnection(id: string): ExtensionIntegration | undefined {
    return integrationConnections().find((c) => c.id === id);
}

/**
 * Map an add-on's icon name (a lucide key) to a component. Add-ons pick from
 * this shared set so the core bundle stays the single source of icons; unknown
 * names fall back to a neutral puzzle piece.
 */
const ICONS: Record<string, LucideIcon> = {
    branch: GitBranch,
    "git-branch": GitBranch,
    split: Split,
    filter: Filter,
    clock: Clock,
    delay: Clock,
    users: Users,
    crm: Users,
    database: Database,
    tag: Tag,
    send: Send,
    message: MessageSquare,
    "message-square": MessageSquare,
    braces: Braces,
    sparkles: Sparkles,
    zap: Zap,
    puzzle: Puzzle,
};

export function extensionIcon(name: string): LucideIcon {
    return ICONS[name] ?? Puzzle;
}
