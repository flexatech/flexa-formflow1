import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type AiProvider = "anthropic" | "openai" | "gemini";

/** Server sentinel: a key is stored but never sent to the browser. */
export const SECRET_MASK = "__ff_secret__";

export interface PluginSettings {
    delete_data_on_uninstall: boolean;
    brand_color: string;
    background_color: string;
    content_background: string;
    text_color: string;
    footer_text: string;
    font_family: string;
    container_width: number;
    ai_provider: AiProvider;
    ai_model: string;
    /** Masked sentinel ("__ff_secret__") when a key is stored, else "". */
    ai_api_key: string;
}

interface SettingsResponse {
    settings: PluginSettings;
}

export function useSettings() {
    return useQuery({
        queryKey: ["settings"],
        queryFn: async () => (await api.get<SettingsResponse>("/settings")).settings,
    });
}

/**
 * Sends only the changed fields; the server sanitizes the partial payload and
 * merges it over the stored option (never send the whole blob back).
 */
export function useSaveSettings() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (partial: Partial<PluginSettings>) =>
            (await api.post<SettingsResponse>("/settings", partial)).settings,
        onSuccess: (settings) => {
            queryClient.setQueryData(["settings"], settings);
        },
        onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: ["settings"] });
        },
    });
}
