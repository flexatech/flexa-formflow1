import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { EntryRow } from "@/features/forms/types";

export interface EntriesListParams {
    form_id?: number;
    status?: string;
    page?: number;
    per_page?: number;
}

interface EntriesListResponse {
    items: EntryRow[];
    total: number;
}

function listPath(params: EntriesListParams): string {
    const query = new URLSearchParams();
    if (params.form_id) query.set("form_id", String(params.form_id));
    if (params.status) query.set("status", params.status);
    query.set("page", String(params.page ?? 1));
    query.set("per_page", String(params.per_page ?? 20));
    return `/entries?${query.toString()}`;
}

export function useEntriesList(params: EntriesListParams = {}) {
    return useQuery({
        queryKey: ["entries", params],
        queryFn: async () => api.get<EntriesListResponse>(listPath(params)),
    });
}

/** Fetching an entry marks it read server-side, so sibling lists refresh. */
export function useEntry(id: number) {
    const queryClient = useQueryClient();
    return useQuery({
        queryKey: ["entry", id],
        queryFn: async () => {
            const entry = (await api.get<{ entry: EntryRow }>(`/entries/${id}`)).entry;
            void queryClient.invalidateQueries({ queryKey: ["entries"] });
            void queryClient.invalidateQueries({ queryKey: ["stats"] });
            return entry;
        },
        enabled: id > 0,
    });
}

export function useDeleteEntry() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => api.delete<{ deleted: boolean }>(`/entries/${id}`),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["entries"] });
            void queryClient.invalidateQueries({ queryKey: ["stats"] });
        },
    });
}
