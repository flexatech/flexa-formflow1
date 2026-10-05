import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { FormConfig, FormDetail, FormSummary } from "./types";

export interface FormsListParams {
    search?: string;
    status?: string;
    page?: number;
    per_page?: number;
}

interface FormsListResponse {
    items: FormSummary[];
    total: number;
}

interface FormResponse {
    form: FormDetail;
}

function listPath(params: FormsListParams): string {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.status) query.set("status", params.status);
    query.set("page", String(params.page ?? 1));
    query.set("per_page", String(params.per_page ?? 20));
    return `/forms?${query.toString()}`;
}

export function useFormsList(params: FormsListParams = {}) {
    return useQuery({
        queryKey: ["forms", params],
        queryFn: async () => api.get<FormsListResponse>(listPath(params)),
    });
}

export function useForm(id: number) {
    return useQuery({
        queryKey: ["form", id],
        queryFn: async () => (await api.get<FormResponse>(`/forms/${id}`)).form,
        enabled: id > 0,
    });
}

export function useCreateForm() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (title: string) => (await api.post<FormResponse>("/forms", { title })).form,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["forms"] });
            void queryClient.invalidateQueries({ queryKey: ["stats"] });
        },
    });
}

/**
 * Builder autosave. The `config` document is sent whole (one editor owns it);
 * `title`/`status` ride along when changed.
 */
export function useSaveForm(id: number) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (fields: Partial<Pick<FormDetail, "title" | "status" | "config">>) =>
            (await api.put<FormResponse>(`/forms/${id}`, fields)).form,
        onSuccess: (form) => {
            queryClient.setQueryData(["form", id], form);
            void queryClient.invalidateQueries({ queryKey: ["forms"] });
        },
    });
}

/**
 * Render the current draft config to frontend HTML for the quick preview. Sent
 * on demand (not autosaved), so the preview reflects unsaved changes.
 */
export function useFormPreview() {
    return useMutation({
        mutationFn: async ({ config, title }: { config: FormConfig; title: string }) =>
            (
                await api.post<{ html: string }>("/forms/preview", {
                    config: config as unknown as Record<string, unknown>,
                    title,
                })
            ).html,
    });
}

export function useDeleteForm() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => api.delete<{ deleted: boolean }>(`/forms/${id}`),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["forms"] });
            void queryClient.invalidateQueries({ queryKey: ["stats"] });
        },
    });
}

export function useDuplicateForm() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => (await api.post<FormResponse>(`/forms/${id}/duplicate`)).form,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["forms"] });
        },
    });
}
