import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type IntegrationStatus = "active" | "available" | "soon";

export interface IntegrationCard {
    id: string;
    title: string;
    description: string;
    category: string;
    status: IntegrationStatus;
    detail: string;
}

export interface DeliveryStatus {
    active: boolean;
    label: string;
}

export interface IntegrationsResponse {
    integrations: IntegrationCard[];
    delivery: DeliveryStatus;
}

export function useIntegrations() {
    return useQuery({
        queryKey: ["integrations"],
        queryFn: async () => api.get<IntegrationsResponse>("/integrations"),
    });
}

/** Client-safe connection state: secret values are never returned, only whether set. */
export interface ConnectionView {
    connected: boolean;
    values: Record<string, unknown>;
    secrets: Record<string, boolean>;
}

export function useConnection(id: string, enabled: boolean) {
    return useQuery({
        queryKey: ["integrations", "connection", id],
        queryFn: async () => api.get<ConnectionView>(`/integrations/${id}/connection`),
        enabled,
    });
}

export function useSaveConnection(id: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (values: Record<string, unknown>) =>
            api.post<ConnectionView>(`/integrations/${id}/connection`, { values }),
        onSuccess: (data) => {
            qc.setQueryData(["integrations", "connection", id], data);
            void qc.invalidateQueries({ queryKey: ["integrations"] });
        },
    });
}
