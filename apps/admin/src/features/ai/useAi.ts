import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { FormDetail } from "@/features/forms/types";

export type TextAction = "rewrite" | "shorten" | "tone" | "subject";

export interface GenerateTextParams {
    action: TextAction;
    text: string;
    tone?: string;
}

export function useGenerateText() {
    return useMutation({
        mutationFn: async (params: GenerateTextParams) =>
            (await api.post<{ text: string }>("/ai/generate", params as unknown as Record<string, unknown>)).text,
    });
}

export function useGenerateForm() {
    return useMutation({
        mutationFn: async (prompt: string) =>
            (await api.post<{ form: FormDetail }>("/ai/form", { prompt })).form,
    });
}
