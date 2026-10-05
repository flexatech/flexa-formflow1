import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DynamicDataCategory, EmailPattern, EmailTemplate, EmailTree } from "./types";

interface TemplatesListResponse {
    items: EmailTemplate[];
}

interface TemplateResponse {
    template: EmailTemplate;
}

export function useEmailTemplatesList() {
    return useQuery({
        queryKey: ["email-templates"],
        queryFn: async () => (await api.get<TemplatesListResponse>("/email-templates")).items,
    });
}

export function useEmailTemplate(id: number) {
    return useQuery({
        queryKey: ["email-template", id],
        queryFn: async () => (await api.get<TemplateResponse>(`/email-templates/${id}`)).template,
        enabled: id > 0,
    });
}

export function useCreateEmailTemplate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (title: string) =>
            (await api.post<TemplateResponse>("/email-templates", { title })).template,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["email-templates"] });
        },
    });
}

/**
 * Editor autosave. The `tree` document is sent whole (one editor owns it);
 * `title` rides along when changed.
 */
export function useSaveEmailTemplate(id: number) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (fields: Partial<Pick<EmailTemplate, "title" | "tree">>) =>
            (await api.put<TemplateResponse>(`/email-templates/${id}`, fields)).template,
        onSuccess: (template) => {
            queryClient.setQueryData(["email-template", id], template);
            void queryClient.invalidateQueries({ queryKey: ["email-templates"] });
        },
    });
}

export function useDeleteEmailTemplate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => api.delete<{ deleted: boolean }>(`/email-templates/${id}`),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["email-templates"] });
        },
    });
}

export function useDuplicateEmailTemplate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) =>
            (await api.post<TemplateResponse>(`/email-templates/${id}/duplicate`)).template,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["email-templates"] });
        },
    });
}

/**
 * The Dynamic Data browser's sources for the current preview form. Samples are
 * resolved server-side through the same render context the preview uses, so the
 * picker and the preview never disagree.
 */
export function useDynamicData(formId: number) {
    return useQuery<DynamicDataCategory[]>({
        queryKey: ["email-dynamic-data", formId],
        queryFn: async () =>
            (await api.get<{ categories: DynamicDataCategory[] }>(`/emails/dynamic-data?form_id=${formId}`)).categories,
        staleTime: 60_000,
    });
}

/**
 * Curated block groups the builder's Patterns tab offers. Static payloads, so
 * cache them for the session.
 */
export function useEmailPatterns() {
    return useQuery<EmailPattern[]>({
        queryKey: ["email-patterns"],
        queryFn: async () => (await api.get<{ patterns: EmailPattern[] }>("/emails/patterns")).patterns,
        staleTime: Infinity,
    });
}

export interface PreviewParams {
    tree: EmailTree;
    form_id?: number;
    type?: "admin" | "confirmation";
}

export function useEmailPreview() {
    return useMutation({
        mutationFn: async (params: PreviewParams) =>
            (await api.post<{ html: string }>("/email-preview", params as unknown as Record<string, unknown>)).html,
    });
}

export interface TestSendParams extends PreviewParams {
    to: string;
}

export function useTestSend() {
    return useMutation({
        mutationFn: async (params: TestSendParams) =>
            (await api.post<{ sent: boolean }>("/email-test", params as unknown as Record<string, unknown>)).sent,
    });
}
