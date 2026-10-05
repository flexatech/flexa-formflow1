import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface WooEmailRow {
    id: string;
    title: string;
    description: string;
    recipient: string;
    hasOrder: boolean;
    enabled: boolean;
    subject: string;
    templateId: number;
}

export interface WooTemplateOption {
    id: number;
    title: string;
}

export interface TokenHint {
    token: string;
    label: string;
}

export interface WooOrderOption {
    id: number;
    label: string;
}

export interface WooEmailsResponse {
    emails: WooEmailRow[];
    templates: WooTemplateOption[];
    tokens: TokenHint[];
    orders: WooOrderOption[];
    conditionSubjects: Array<{ value: string; label: string; type: string }>;
    conditionOps: Array<{ value: string; label: string }>;
    hasWooCommerce: boolean;
}

export interface WooEmailPatch {
    enabled?: boolean;
    subject?: string;
    template_id?: number;
}

export function useWooEmails() {
    return useQuery({
        queryKey: ["woo-emails"],
        queryFn: async () => api.get<WooEmailsResponse>("/woo-emails"),
    });
}

export function useSaveWooEmail(id: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (patch: WooEmailPatch) =>
            (await api.put<{ email: { id: string; enabled: boolean; subject: string; templateId: number } }>(
                `/woo-emails/${id}`,
                patch as unknown as Record<string, unknown>,
            )).email,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["woo-emails"] });
            // The preview is cached by (email id, order id) only, so a saved
            // subject/template change never appears in the key: without this,
            // an open preview keeps rendering whatever was cached before the
            // save, even though the row above now shows the new template.
            void queryClient.invalidateQueries({ queryKey: ["woo-email-preview", id] });
        },
    });
}

/**
 * The rendered preview for one Woo email against a chosen data source. An
 * `orderId` of 0 renders sample data; a positive id renders that order. Kept as
 * a query so switching the order in the picker refetches and caches per pair.
 */
export function useWooEmailPreview(id: string | null, orderId: number) {
    return useQuery({
        queryKey: ["woo-email-preview", id, orderId],
        enabled: id !== null,
        queryFn: async () =>
            (
                await api.post<{ html: string; orderId: number }>(`/woo-emails/${id}/preview`, {
                    order_id: orderId,
                })
            ).html,
    });
}

/**
 * Send one Woo email to a chosen address, rendered with the same data source as
 * the preview (`orderId` 0 = sample data). Returns whether wp_mail accepted it.
 */
export function useSendWooTestEmail(id: string) {
    return useMutation({
        mutationFn: async ({ to, orderId }: { to: string; orderId: number }) =>
            (
                await api.post<{ sent: boolean }>(`/woo-emails/${id}/test`, {
                    to,
                    order_id: orderId,
                })
            ).sent,
    });
}
