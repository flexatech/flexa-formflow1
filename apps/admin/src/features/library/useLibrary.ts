import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { __ } from "@/lib/i18n";
import type {
    AssetKind,
    AssetType,
    ImportSummary,
    LibraryAsset,
    Pack,
    PackDetail,
    PackDiff,
    PackStatus,
    RestoreSummary,
    SavedAsset,
    UninstallSummary,
    UpdateAction,
    UpdateSummary,
} from "./types";

interface CatalogResponse {
    items: LibraryAsset[];
}

interface PackResponse {
    pack: PackDetail;
}

interface ImportResponse {
    summary: ImportSummary;
}

interface MineResponse {
    items: SavedAsset[];
}

interface SaveResponse {
    asset: SavedAsset;
}

/** The discoverable Flexa Library catalog (templates, patterns, recipes, packs). */
export function useCatalog() {
    return useQuery<LibraryAsset[]>({
        queryKey: ["library", "catalog"],
        queryFn: async () => (await api.get<CatalogResponse>("/library/catalog")).items,
        staleTime: 5 * 60_000,
    });
}

/** Packs derived from the catalog, for the Dashboard row and the pack detail page. */
export function usePacks() {
    const query = useCatalog();
    return {
        ...query,
        data: (query.data ?? []).filter((a): a is Pack => a.type === "pack"),
    };
}

/** Full pack detail (named contents + changelog) for the pack page. */
export function usePackDetail(id: string) {
    return useQuery<PackDetail>({
        queryKey: ["library", "pack", id],
        queryFn: async () => (await api.get<PackResponse>(`/library/packs/${id}`)).pack,
        staleTime: 60_000,
    });
}

/** Import a pack: materializes its contents, then refreshes the catalog + My Library. */
export function useImportPack(id: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => (await api.post<ImportResponse>(`/library/packs/${id}/import`, {})).summary,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["library"] });
            void queryClient.invalidateQueries({ queryKey: ["forms"] });
            void queryClient.invalidateQueries({ queryKey: ["workflows"] });
            void queryClient.invalidateQueries({ queryKey: ["email-templates"] });
            void queryClient.invalidateQueries({ queryKey: ["stats"] });
        },
    });
}

/** The diff between an installed pack and its newest version, for the update screen. */
export function usePackDiff(id: string, enabled: boolean) {
    return useQuery<PackDiff>({
        queryKey: ["library", "pack", id, "diff"],
        queryFn: async () => (await api.get<{ diff: PackDiff }>(`/library/packs/${id}/diff`)).diff,
        enabled: enabled && id !== "",
        staleTime: 0,
    });
}

/** Apply a pack update with the user's per-item decisions, then refresh everything. */
export function useUpdatePack(id: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (decisions: Record<string, UpdateAction>) =>
            (await api.post<{ summary: UpdateSummary }>(`/library/packs/${id}/update`, { decisions })).summary,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["library"] });
        },
    });
}

/**
 * Which of an installed pack's items are still on the site. Never cached: the
 * user can delete a form in another tab, and a stale "nothing missing" would
 * hide the Restore action exactly when it is needed.
 */
export function usePackStatus(id: string, enabled: boolean) {
    return useQuery<PackStatus>({
        queryKey: ["library", "pack", id, "status"],
        queryFn: async () => (await api.get<{ status: PackStatus }>(`/library/packs/${id}/status`)).status,
        enabled: enabled && id !== "",
        staleTime: 0,
    });
}

/** Put back the pack items the user deleted. Leaves surviving content untouched. */
export function useRestorePack(id: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () =>
            (await api.post<{ summary: RestoreSummary }>(`/library/packs/${id}/restore`, {})).summary,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["library"] });
            void queryClient.invalidateQueries({ queryKey: ["forms"] });
            void queryClient.invalidateQueries({ queryKey: ["workflows"] });
            void queryClient.invalidateQueries({ queryKey: ["email-templates"] });
            void queryClient.invalidateQueries({ queryKey: ["stats"] });
        },
    });
}

/**
 * Remove exactly what this pack's install (and any later restore) created -
 * never the patterns it shares with My Library. Clears the install stamp, so
 * the catalog offers "Install pack" again instead of a stuck "Installed" chip.
 */
export function useUninstallPack(id: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => (await api.delete<{ summary: UninstallSummary }>(`/library/packs/${id}`)).summary,
        onSuccess: () => {
            // usePackStatus disables itself once pack.installed flips to false, and
            // a disabled query keeps serving its last cached result instead of
            // clearing it - invalidating alone leaves the "N items missing / Put
            // back" banner stuck showing stale data forever. Drop the cache entry
            // outright so there is nothing stale left to render.
            queryClient.removeQueries({ queryKey: ["library", "pack", id, "status"] });
            void queryClient.invalidateQueries({ queryKey: ["library"] });
            void queryClient.invalidateQueries({ queryKey: ["forms"] });
            void queryClient.invalidateQueries({ queryKey: ["workflows"] });
            void queryClient.invalidateQueries({ queryKey: ["email-templates"] });
            void queryClient.invalidateQueries({ queryKey: ["stats"] });
        },
    });
}

/** My Library: the user's saved reusable assets, mapped to the card display shape. */
export function useMyLibrary() {
    return useQuery<{ display: LibraryAsset; raw: SavedAsset }[]>({
        queryKey: ["library", "mine"],
        queryFn: async () => {
            const items = (await api.get<MineResponse>("/library/mine")).items;
            return items.map((raw) => ({ raw, display: savedToDisplay(raw) }));
        },
        staleTime: 30_000,
    });
}

export interface SaveToLibraryInput {
    type: AssetType;
    name: string;
    kind: AssetKind;
    payload: Record<string, unknown>;
}

/** Save-as-pattern/template/recipe. The builder sends the payload it already holds. */
export function useSaveToLibrary() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (input: SaveToLibraryInput) =>
            (await api.post<SaveResponse>("/library/mine", input as unknown as Record<string, unknown>)).asset,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["library", "mine"] });
        },
    });
}

export function useDeleteLibraryAsset() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => api.delete<{ deleted: boolean }>(`/library/mine/${id}`),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["library", "mine"] });
        },
    });
}

/** Where a reused asset lands: a fresh builder document seeded from the payload. */
export interface ReuseResult {
    route: string;
}

/**
 * Round-trip a saved asset back into a builder. We create a fresh document
 * (which comes seeded with a complete default config/tree), merge the saved
 * payload's meaningful parts over that default, then save the whole document
 * so the new builder opens on the reused content. Workflows arrive inactive,
 * matching pack import: nothing fires until the user reviews and enables it.
 */
export function useReuseAsset() {
    const queryClient = useQueryClient();
    return useMutation<ReuseResult, Error, SavedAsset>({
        mutationFn: async (raw) => {
            const payload = raw.payload as Record<string, unknown>;
            const title = raw.name;

            if (raw.kind === "form") {
                const { form } = await api.post<{ form: { id: number; config: Record<string, unknown> } }>(
                    "/forms",
                    { title },
                );
                const config = mergeFormConfig(form.config, payload);
                await api.put(`/forms/${form.id}`, { config });
                return { route: `/forms/${form.id}/edit` };
            }

            if (raw.kind === "email" || raw.kind === "woocommerce") {
                const { template } = await api.post<{
                    template: { id: number; tree: Record<string, unknown> };
                }>("/email-templates", { title });
                const tree = mergeEmailTree(template.tree, payload);
                await api.put(`/email-templates/${template.id}`, { tree });
                return { route: `/emails/${template.id}/edit` };
            }

            // Workflow recipe.
            const { workflow } = await api.post<{
                workflow: { id: number; trigger: Record<string, unknown>; actions: unknown[] };
            }>("/workflows", { title });
            const config = mergeWorkflowConfig(workflow, payload);
            await api.put(`/workflows/${workflow.id}`, { config, status: "inactive" });
            return { route: `/workflows/${workflow.id}/edit` };
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["forms"] });
            void queryClient.invalidateQueries({ queryKey: ["workflows"] });
            void queryClient.invalidateQueries({ queryKey: ["email-templates"] });
            void queryClient.invalidateQueries({ queryKey: ["stats"] });
        },
    });
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Fill the created form's default config with the saved fields/settings/notifications. */
function mergeFormConfig(base: Record<string, unknown>, payload: Record<string, unknown>): Record<string, unknown> {
    const baseSettings = isRecord(base.settings) ? base.settings : {};
    return {
        ...base,
        fields: Array.isArray(payload.fields) ? payload.fields : base.fields,
        settings: isRecord(payload.settings) ? { ...baseSettings, ...payload.settings } : base.settings,
        notifications: isRecord(payload.notifications) ? payload.notifications : base.notifications,
    };
}

/** Fill the created template's default tree with the saved elements/settings. */
function mergeEmailTree(base: Record<string, unknown>, payload: Record<string, unknown>): Record<string, unknown> {
    const baseSettings = isRecord(base.settings) ? base.settings : {};
    return {
        version: typeof payload.version === "number" ? payload.version : base.version,
        settings: isRecord(payload.settings) ? { ...baseSettings, ...payload.settings } : base.settings,
        elements: Array.isArray(payload.elements) ? payload.elements : base.elements,
    };
}

/**
 * Seed the new workflow's trigger + actions from the recipe. A pack recipe
 * references its trigger form symbolically (`form_ref`), so only a numeric
 * `form_id` carries over; otherwise the trigger stays empty for the user to set.
 */
function mergeWorkflowConfig(
    base: { trigger: Record<string, unknown>; actions: unknown[] },
    payload: Record<string, unknown>,
): Record<string, unknown> {
    const savedTrigger = isRecord(payload.trigger) ? payload.trigger : {};
    const formId = typeof savedTrigger.form_id === "number" ? savedTrigger.form_id : 0;
    return {
        trigger: { type: "form_submitted", form_id: formId },
        actions: Array.isArray(payload.actions) ? payload.actions : base.actions,
    };
}

const TYPE_NOUN: Record<AssetType, () => string> = {
    template: () => __("Saved template"),
    pattern: () => __("Saved pattern"),
    recipe: () => __("Saved recipe"),
    pack: () => __("Saved pack"),
};

/** A saved asset has no marketing copy, so present it as an installed, free item. */
function savedToDisplay(raw: SavedAsset): LibraryAsset {
    return {
        id: `mine-${raw.id}`,
        type: raw.type,
        name: raw.name,
        description: raw.source.pack
            ? __("From a pack. Yours to edit and reuse.")
            : TYPE_NOUN[raw.type](),
        category: __("Saved"),
        kind: raw.kind,
        ownership: "free",
        installed: true,
    };
}
