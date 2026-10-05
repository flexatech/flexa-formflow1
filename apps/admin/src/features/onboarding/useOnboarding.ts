import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getPluginGlobal, type OnboardingState, type OnboardingStatus } from "@/lib/wp";

interface OnboardingResponse {
    onboarding: OnboardingState;
}

/**
 * First-run guide state. Seeded from the value localized by Enqueue.php so the
 * wizard can decide whether to greet on the very first paint, with no fetch.
 */
export function useOnboarding() {
    return useQuery({
        queryKey: ["onboarding"],
        queryFn: async () => (await api.get<OnboardingResponse>("/onboarding")).onboarding,
        initialData: getPluginGlobal().onboarding,
        staleTime: Infinity,
    });
}

/**
 * The client only ever submits a status; the server stamps the timestamps and
 * refuses anything outside its allowlist.
 */
export function useSetOnboardingStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (status: OnboardingStatus) =>
            (await api.post<OnboardingResponse>("/onboarding", { status })).onboarding,
        onMutate: async (status) => {
            await queryClient.cancelQueries({ queryKey: ["onboarding"] });
            const previous = queryClient.getQueryData<OnboardingState>(["onboarding"]);
            if (previous) {
                queryClient.setQueryData<OnboardingState>(["onboarding"], { ...previous, status });
            }
            return { previous };
        },
        onError: (_err, _status, context) => {
            if (context?.previous) {
                queryClient.setQueryData(["onboarding"], context.previous);
            }
        },
        onSuccess: (onboarding) => {
            queryClient.setQueryData(["onboarding"], onboarding);
        },
    });
}
