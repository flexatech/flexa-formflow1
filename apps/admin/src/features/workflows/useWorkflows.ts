import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface WorkflowTrigger {
    type: string;
    form_id: number;
}

export interface WorkflowAction {
    id: string;
    type: string;
    config: Record<string, unknown>;
}

/** Single Free gate on the action chain; operators match the engine. */
export type ConditionOperator = "equals" | "not_equals" | "contains" | "not_empty" | "is_empty";

export interface WorkflowCondition {
    field: string;
    operator: ConditionOperator;
    value: string;
}

export interface Workflow {
    id: number;
    title: string;
    status: "active" | "inactive";
    trigger: WorkflowTrigger;
    /** Empty object when the workflow has no condition (always runs). */
    condition: WorkflowCondition | Record<string, never>;
    actions: WorkflowAction[];
    created_at: string;
    updated_at: string;
}

export interface FormFieldOption {
    id: string;
    label: string;
    type: string;
}

export interface FormOption {
    id: number;
    title: string;
    fields: FormFieldOption[];
}

export interface TemplateOption {
    id: number;
    title: string;
}

export interface WorkflowsIndex {
    items: Workflow[];
    forms: FormOption[];
    templates: TemplateOption[];
}

export interface ActionResult {
    type: string;
    status: "ok" | "error" | "skipped";
    detail: string;
}

export interface TestResult {
    ran: boolean;
    log: ActionResult[];
    note?: string;
}

/** One recorded live run, as returned by GET /workflows/{id}/runs. */
export interface WorkflowRun {
    id: number;
    workflow_id: number;
    entry_id: number;
    form_id: number;
    status: "ok" | "error" | "skipped";
    log: ActionResult[];
    created_at: string;
}

export interface WorkflowRunsPage {
    items: WorkflowRun[];
    total: number;
}

export interface WorkflowConfig {
    trigger: WorkflowTrigger;
    condition?: WorkflowCondition | Record<string, never>;
    actions: WorkflowAction[];
}

export function useWorkflows() {
    return useQuery({
        queryKey: ["workflows"],
        queryFn: async () => api.get<WorkflowsIndex>("/workflows"),
    });
}

export function useWorkflow(id: number) {
    return useQuery({
        queryKey: ["workflow", id],
        queryFn: async () => (await api.get<{ workflow: Workflow }>(`/workflows/${id}`)).workflow,
        enabled: id > 0,
    });
}

export function useCreateWorkflow() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (title: string) =>
            (await api.post<{ workflow: Workflow }>("/workflows", { title })).workflow,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["workflows"] });
        },
    });
}

export interface WorkflowPatch {
    title?: string;
    status?: "active" | "inactive";
    config?: WorkflowConfig;
}

export function useSaveWorkflow(id: number) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (patch: WorkflowPatch) =>
            (await api.put<{ workflow: Workflow }>(`/workflows/${id}`, patch as unknown as Record<string, unknown>))
                .workflow,
        onSuccess: (workflow) => {
            queryClient.setQueryData(["workflow", id], workflow);
            void queryClient.invalidateQueries({ queryKey: ["workflows"] });
        },
    });
}

export function useDeleteWorkflow() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => api.delete<{ deleted: boolean }>(`/workflows/${id}`),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["workflows"] });
        },
    });
}

export function useTestWorkflow(id: number) {
    return useMutation({
        mutationFn: async () => api.post<TestResult>(`/workflows/${id}/test`),
    });
}

/** Live run history for the Logs tab. Enabled only while the tab is open. */
export function useWorkflowRuns(id: number, enabled: boolean) {
    return useQuery({
        queryKey: ["workflow", id, "runs"],
        queryFn: async () => api.get<WorkflowRunsPage>(`/workflows/${id}/runs`),
        enabled: id > 0 && enabled,
    });
}
