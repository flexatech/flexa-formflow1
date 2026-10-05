import { AlertCircle, CheckCircle2, ExternalLink, Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { __ } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import type { ExtensionField, ExtensionIntegration } from "@/lib/wp";

/** A form field the current workflow trigger exposes, for token/condition pickers. */
export interface SchemaContextField {
    id: string;
    label: string;
    type: string;
}

export interface SchemaContext {
    /** Fields of the trigger form, offered as tokens and condition subjects. */
    formFields?: SchemaContextField[];
    /** Which `secret` fields already have a stored value (masked, leave blank to keep). */
    savedSecrets?: Record<string, boolean>;
    /** Registered integration connect forms, so a `connection` control can show status. */
    connections?: ExtensionIntegration[];
}

/**
 * Renders an extension node's config form from its declarative field schema.
 * The Free app owns every control here; an add-on only describes which control
 * to use and its options (see src/Extensions/Registry.php). This is the single
 * seam through which add-on nodes (CRM push, ...) get their UI
 * without shipping React into this bundle.
 */
export function SchemaFields({
    fields,
    values,
    onChange,
    context,
    disabled = false,
}: {
    fields: ExtensionField[];
    values: Record<string, unknown>;
    onChange: (patch: Record<string, unknown>) => void;
    context?: SchemaContext;
    disabled?: boolean;
}) {
    const visible = fields.filter((field) => showField(field, values));

    if (visible.length === 0) {
        return <p className="ff:text-xs ff:text-slate-500">{__("This action has no options.")}</p>;
    }

    return (
        <div className="ff:flex ff:flex-col ff:gap-3">
            {visible.map((field) => (
                <SchemaField
                    key={field.key}
                    field={field}
                    value={values[field.key]}
                    onChange={(next) => onChange({ [field.key]: next })}
                    context={context}
                    disabled={disabled}
                />
            ))}
        </div>
    );
}

function showField(field: ExtensionField, values: Record<string, unknown>): boolean {
    if (!field.showIf) return true;
    return values[field.showIf.key] === field.showIf.equals;
}

function SchemaField({
    field,
    value,
    onChange,
    context,
    disabled,
}: {
    field: ExtensionField;
    value: unknown;
    onChange: (next: unknown) => void;
    context?: SchemaContext;
    disabled: boolean;
}) {
    const control = renderControl(field, value, onChange, context, disabled);

    // A switch reads better inline with its label; everything else stacks.
    if (field.control === "switch") {
        return (
            <div className="ff:flex ff:items-center ff:justify-between ff:gap-3">
                <div className="ff:flex ff:flex-col">
                    <span className="ff:text-xs ff:font-medium ff:text-slate-600">{field.label ?? field.key}</span>
                    {field.help && <span className="ff:text-[11px] ff:text-slate-400">{field.help}</span>}
                </div>
                {control}
            </div>
        );
    }

    return (
        <label className="ff:flex ff:flex-col ff:gap-1.5">
            {field.label && <span className="ff:text-xs ff:font-medium ff:text-slate-600">{field.label}</span>}
            {control}
            {field.help && <span className="ff:text-[11px] ff:text-slate-400">{field.help}</span>}
        </label>
    );
}

function renderControl(
    field: ExtensionField,
    value: unknown,
    onChange: (next: unknown) => void,
    context: SchemaContext | undefined,
    disabled: boolean,
) {
    const str = typeof value === "string" ? value : "";

    switch (field.control) {
        case "textarea":
            return (
                <textarea
                    className="flexa-formflow-control ff:min-h-16 ff:w-full ff:rounded-md ff:border ff:border-slate-300 ff:bg-white ff:px-3 ff:py-2 ff:text-sm ff:shadow-sm"
                    value={str}
                    disabled={disabled}
                    placeholder={field.placeholder}
                    onChange={(e) => onChange(e.target.value)}
                />
            );

        case "select":
            return (
                <Select
                    options={field.options ?? []}
                    value={str}
                    disabled={disabled}
                    onChange={(e) => onChange(e.target.value)}
                    className="ff:w-full"
                />
            );

        case "switch":
            return (
                <Switch checked={value === true} disabled={disabled} onCheckedChange={(next) => onChange(next)} />
            );

        case "number":
            return (
                <Input
                    type="number"
                    value={typeof value === "number" ? String(value) : str}
                    disabled={disabled}
                    placeholder={field.placeholder}
                    onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
                />
            );

        case "token-text":
            return (
                <TokenText
                    value={str}
                    placeholder={field.placeholder}
                    disabled={disabled}
                    fields={context?.formFields ?? []}
                    onChange={onChange}
                />
            );

        case "field-map":
            return (
                <FieldMap
                    value={isRecord(value) ? value : {}}
                    rows={field.mapKeys ?? []}
                    disabled={disabled}
                    fields={context?.formFields ?? []}
                    onChange={onChange}
                />
            );

        case "conditions":
            return (
                <ConditionsBuilder
                    value={isConditionSet(value) ? value : { match: "all", rules: [] }}
                    disabled={disabled}
                    fields={context?.formFields ?? []}
                    onChange={onChange}
                />
            );

        case "connection":
            return (
                <ConnectionControl
                    field={field}
                    value={str}
                    disabled={disabled}
                    connections={context?.connections ?? []}
                    onChange={onChange}
                />
            );

        case "email":
        case "url":
        case "text":
        default: {
            if (field.secret) {
                const saved = context?.savedSecrets?.[field.key] === true;
                return (
                    <Input
                        type="password"
                        value={str}
                        disabled={disabled}
                        autoComplete="off"
                        placeholder={saved ? __("Saved. Leave blank to keep it.") : field.placeholder}
                        onChange={(e) => onChange(e.target.value)}
                    />
                );
            }
            return (
                <Input
                    type={field.control === "email" ? "email" : field.control === "url" ? "url" : "text"}
                    value={str}
                    disabled={disabled}
                    placeholder={field.placeholder}
                    spellCheck={field.control === "url" ? false : undefined}
                    onChange={(e) => onChange(e.target.value)}
                />
            );
        }
    }
}

/** Text input with one-click token insertion from the trigger form's fields. */
function TokenText({
    value,
    placeholder,
    disabled,
    fields,
    onChange,
}: {
    value: string;
    placeholder?: string;
    disabled: boolean;
    fields: SchemaContextField[];
    onChange: (next: string) => void;
}) {
    return (
        <div className="ff:flex ff:flex-col ff:gap-1.5">
            <Input
                value={value}
                disabled={disabled}
                placeholder={placeholder ?? __("Type text or insert a {token}")}
                onChange={(e) => onChange(e.target.value)}
            />
            {fields.length > 0 && !disabled && (
                <div className="ff:flex ff:flex-wrap ff:gap-1">
                    {fields.map((f) => (
                        <button
                            key={f.id}
                            type="button"
                            onClick={() => onChange(`${value}{field:${f.id}}`)}
                            className="ff:rounded ff:bg-slate-100 ff:px-1.5 ff:py-0.5 ff:text-[11px] ff:text-slate-600 ff:transition-colors ff:hover:bg-brand-50 ff:hover:text-brand-700"
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/** A destination-to-token mapping table: the CRM/marketing connector UI. */
function FieldMap({
    value,
    rows,
    disabled,
    fields,
    onChange,
}: {
    value: Record<string, unknown>;
    rows: { value: string; label: string }[];
    disabled: boolean;
    fields: SchemaContextField[];
    onChange: (next: Record<string, unknown>) => void;
}) {
    if (rows.length === 0) {
        return <p className="ff:text-xs ff:text-slate-500">{__("No destination fields to map.")}</p>;
    }

    return (
        <div className="ff:flex ff:flex-col ff:gap-2 ff:rounded-lg ff:border ff:border-slate-200 ff:p-3">
            {rows.map((row) => (
                <div key={row.value} className="ff:flex ff:items-start ff:gap-3">
                    <span className="ff:mt-2 ff:w-28 ff:shrink-0 ff:text-xs ff:font-medium ff:text-slate-600">
                        {row.label}
                    </span>
                    <div className="ff:min-w-0 ff:flex-1">
                        <TokenText
                            value={typeof value[row.value] === "string" ? (value[row.value] as string) : ""}
                            disabled={disabled}
                            fields={fields}
                            onChange={(next) => onChange({ ...value, [row.value]: next })}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

export interface ConditionRule {
    field: string;
    op: string;
    value: string;
}
export interface ConditionSet {
    match: "all" | "any";
    rules: ConditionRule[];
}

/** Coerce an unknown stored value into a usable condition set. */
export function toConditionSet(value: unknown): ConditionSet {
    return isConditionSet(value) ? value : { match: "all", rules: [] };
}

const OPERATORS = [
    { value: "is", label: __("is") },
    { value: "is_not", label: __("is not") },
    { value: "contains", label: __("contains") },
    { value: "not_contains", label: __("does not contain") },
    { value: "is_empty", label: __("is empty") },
    { value: "is_not_empty", label: __("is not empty") },
];

const NO_VALUE_OPS = new Set(["is_empty", "is_not_empty"]);

/** AND/OR rule builder: the shared control behind email conditions and workflow branches. */
export function ConditionsBuilder({
    value,
    disabled,
    fields,
    onChange,
}: {
    value: ConditionSet;
    disabled: boolean;
    fields: SchemaContextField[];
    onChange: (next: ConditionSet) => void;
}) {
    const fieldOptions =
        fields.length > 0
            ? fields.map((f) => ({ value: f.id, label: f.label }))
            : [{ value: "", label: __("No form fields") }];

    const setRule = (index: number, patch: Partial<ConditionRule>) =>
        onChange({ ...value, rules: value.rules.map((r, i) => (i === index ? { ...r, ...patch } : r)) });

    const addRule = () =>
        onChange({
            ...value,
            rules: [...value.rules, { field: fields[0]?.id ?? "", op: "is", value: "" }],
        });

    const removeRule = (index: number) =>
        onChange({ ...value, rules: value.rules.filter((_, i) => i !== index) });

    return (
        <div className="ff:flex ff:flex-col ff:gap-2 ff:rounded-lg ff:border ff:border-slate-200 ff:p-3">
            <div className="ff:flex ff:items-center ff:gap-2 ff:text-xs ff:text-slate-600">
                <span>{__("Match")}</span>
                <Select
                    options={[
                        { value: "all", label: __("all") },
                        { value: "any", label: __("any") },
                    ]}
                    value={value.match}
                    disabled={disabled}
                    onChange={(e) => onChange({ ...value, match: e.target.value === "any" ? "any" : "all" })}
                    className="ff:w-24"
                />
                <span>{__("of the following:")}</span>
            </div>

            {value.rules.map((rule, index) => (
                <div key={index} className="ff:flex ff:items-center ff:gap-2">
                    <Select
                        options={fieldOptions}
                        value={rule.field}
                        disabled={disabled}
                        onChange={(e) => setRule(index, { field: e.target.value })}
                        className="ff:min-w-0 ff:flex-1"
                    />
                    <Select
                        options={OPERATORS}
                        value={rule.op}
                        disabled={disabled}
                        onChange={(e) => setRule(index, { op: e.target.value })}
                        className="ff:w-40"
                    />
                    {!NO_VALUE_OPS.has(rule.op) && (
                        <Input
                            value={rule.value}
                            disabled={disabled}
                            onChange={(e) => setRule(index, { value: e.target.value })}
                            className="ff:min-w-0 ff:flex-1"
                        />
                    )}
                    <button
                        type="button"
                        aria-label={__("Remove condition")}
                        disabled={disabled}
                        onClick={() => removeRule(index)}
                        className="ff:shrink-0 ff:rounded ff:p-1 ff:text-slate-400 ff:transition-colors ff:hover:bg-red-50 ff:hover:text-red-600"
                    >
                        <Trash2 aria-hidden className="ff:h-4 ff:w-4" />
                    </button>
                </div>
            ))}

            <button
                type="button"
                disabled={disabled}
                onClick={addRule}
                className={cn(
                    "ff:flex ff:w-fit ff:items-center ff:gap-1 ff:text-xs ff:font-medium ff:text-brand-700 ff:transition-colors ff:hover:text-brand-800",
                    disabled && "ff:opacity-50",
                )}
            >
                <Plus aria-hidden className="ff:h-3.5 ff:w-3.5" />
                {__("Add condition")}
            </button>
        </div>
    );
}

/**
 * A reference to a stored integration connection (connect once on the
 * Integrations page, reuse from any workflow). The control shows the live
 * connection status and links to manage it; the config only stores the
 * connection id, so credentials never live in the workflow. Runtime reads the
 * saved values on the add-on side.
 */
function ConnectionControl({
    field,
    value,
    disabled,
    connections,
    onChange,
}: {
    field: ExtensionField;
    value: string;
    disabled: boolean;
    connections: ExtensionIntegration[];
    onChange: (next: unknown) => void;
}) {
    const targetId = field.connectionId ?? "";

    // Keep the stored config pointing at the referenced connection. Runs once:
    // after onChange the value equals targetId, so the effect no longer fires.
    useEffect(() => {
        if (!disabled && targetId && value !== targetId) onChange(targetId);
    }, [disabled, targetId, value, onChange]);

    const connection = connections.find((c) => c.id === targetId);
    const connected = connection?.connected === true;
    const label = connection?.label ?? targetId;

    return (
        <div className="ff:flex ff:flex-col ff:gap-2 ff:rounded-lg ff:border ff:border-slate-200 ff:p-3">
            <div className="ff:flex ff:items-center ff:gap-2">
                {connected ? (
                    <CheckCircle2 aria-hidden className="ff:h-4 ff:w-4 ff:text-emerald-600" />
                ) : (
                    <AlertCircle aria-hidden className="ff:h-4 ff:w-4 ff:text-amber-500" />
                )}
                <span className="ff:text-sm ff:font-medium ff:text-slate-700">{label}</span>
                <span
                    className={cn(
                        "ff:rounded-full ff:px-2 ff:py-0.5 ff:text-[11px] ff:font-medium",
                        connected
                            ? "ff:bg-emerald-100 ff:text-emerald-700"
                            : "ff:bg-amber-100 ff:text-amber-700",
                    )}
                >
                    {connected ? __("Connected") : __("Not connected")}
                </span>
            </div>
            <p className="ff:m-0 ff:text-[11px] ff:text-slate-500">
                {connected
                    ? __("This action uses the saved connection. Every workflow shares it.")
                    : __("Connect this integration once, then any workflow can reuse it.")}
            </p>
            <a
                href="#/integrations"
                className="ff:flex ff:w-fit ff:items-center ff:gap-1 ff:text-xs ff:font-medium ff:text-brand-700 ff:transition-colors ff:hover:text-brand-800"
            >
                <ExternalLink aria-hidden className="ff:h-3.5 ff:w-3.5" />
                {connected ? __("Manage connection") : __("Go to Integrations")}
            </a>
        </div>
    );
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isConditionSet(value: unknown): value is ConditionSet {
    return isRecord(value) && Array.isArray(value.rules);
}
