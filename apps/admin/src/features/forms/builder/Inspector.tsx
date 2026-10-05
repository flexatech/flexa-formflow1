import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import { __ } from "@/lib/i18n";
import {
    fieldTypeMeta,
    LOGIC_OPERATORS,
    RESPONSIVE_WIDTH_OPTIONS,
    WIDTH_OPTIONS,
    type FieldLogic,
    type FieldWidth,
    type FormConfig,
    type FormField,
    type LogicOperator,
    type ResponsiveWidth,
} from "../types";

interface InspectorProps {
    config: FormConfig;
    field: FormField | null;
    onChange: (config: FormConfig) => void;
    onFieldChange: (patch: Partial<FormField>) => void;
}

type InspectorTab = "settings" | "validation" | "logic" | "style";

const TABS: { value: InspectorTab; label: () => string }[] = [
    { value: "settings", label: () => __("Settings") },
    { value: "validation", label: () => __("Validation") },
    { value: "logic", label: () => __("Logic") },
    { value: "style", label: () => __("Style") },
];

/**
 * Right column: bound to the selected field with a Settings / Validation / Logic
 * / Style tab strip; with nothing selected it edits the form-level settings.
 */
export function Inspector({ config, field, onChange, onFieldChange }: InspectorProps) {
    const [tab, setTab] = useState<InspectorTab>("settings");

    if (!field) {
        return (
            <div className="ff:flex ff:flex-col ff:gap-4">
                <p className="ff:text-xs ff:font-semibold ff:uppercase ff:tracking-wide ff:text-slate-400">
                    {__("Form settings")}
                </p>
                <Row label={__("Submit button label")} htmlFor="ff-submit-label">
                    <Input
                        id="ff-submit-label"
                        value={config.settings.submit_label}
                        placeholder={__("Send")}
                        onChange={(e) =>
                            onChange({
                                ...config,
                                settings: { ...config.settings, submit_label: e.target.value },
                            })
                        }
                    />
                </Row>
                <Row label={__("Success message")} htmlFor="ff-success-message">
                    <Textarea
                        id="ff-success-message"
                        value={config.settings.success_message}
                        placeholder={__("Thanks, we got your message.")}
                        onChange={(e) =>
                            onChange({
                                ...config,
                                settings: { ...config.settings, success_message: e.target.value },
                            })
                        }
                    />
                </Row>
                <p className="ff:text-xs ff:text-slate-400">
                    {__("Select a field on the canvas to edit its options.")}
                </p>
            </div>
        );
    }

    const meta = fieldTypeMeta(field.type);
    const isHidden = field.type === "hidden";

    return (
        <div className="ff:flex ff:flex-col ff:gap-4">
            <p className="ff:text-xs ff:font-semibold ff:uppercase ff:tracking-wide ff:text-slate-400">
                {meta.label()}
            </p>

            <div className="ff:flex ff:gap-1 ff:border-b ff:border-slate-200">
                {TABS.map((t) => (
                    <TabButton key={t.value} active={tab === t.value} onClick={() => setTab(t.value)}>
                        {t.label()}
                    </TabButton>
                ))}
            </div>

            {tab === "settings" && (
                <SettingsTab field={field} isHidden={isHidden} hasOptions={meta.hasOptions} onFieldChange={onFieldChange} />
            )}
            {tab === "validation" && <ValidationTab field={field} isHidden={isHidden} onFieldChange={onFieldChange} />}
            {tab === "logic" && <LogicTab config={config} field={field} onFieldChange={onFieldChange} />}
            {tab === "style" && <StyleTab field={field} isHidden={isHidden} onFieldChange={onFieldChange} />}
        </div>
    );
}

function SettingsTab({
    field,
    isHidden,
    hasOptions,
    onFieldChange,
}: {
    field: FormField;
    isHidden: boolean;
    hasOptions: boolean;
    onFieldChange: (patch: Partial<FormField>) => void;
}) {
    return (
        <div className="ff:flex ff:flex-col ff:gap-4">
            <Row label={__("Label")} htmlFor="ff-field-label">
                <Input
                    id="ff-field-label"
                    value={field.label}
                    onChange={(e) => onFieldChange({ label: e.target.value })}
                />
            </Row>

            {!isHidden && !hasOptions ? (
                <Row label={__("Placeholder")} htmlFor="ff-field-placeholder">
                    <Input
                        id="ff-field-placeholder"
                        value={field.placeholder}
                        onChange={(e) => onFieldChange({ placeholder: e.target.value })}
                    />
                </Row>
            ) : null}

            {isHidden ? (
                <Row label={__("Value")} htmlFor="ff-field-value">
                    <Input
                        id="ff-field-value"
                        value={field.placeholder}
                        onChange={(e) => onFieldChange({ placeholder: e.target.value })}
                    />
                </Row>
            ) : null}

            {hasOptions ? (
                <Row label={__("Options (one per line)")} htmlFor="ff-field-options">
                    <Textarea
                        id="ff-field-options"
                        value={field.options.join("\n")}
                        rows={Math.max(3, field.options.length + 1)}
                        onChange={(e) => onFieldChange({ options: e.target.value.split("\n") })}
                        onBlur={(e) =>
                            onFieldChange({
                                options: e.target.value
                                    .split("\n")
                                    .map((o) => o.trim())
                                    .filter(Boolean),
                            })
                        }
                    />
                </Row>
            ) : null}
        </div>
    );
}

function ValidationTab({
    field,
    isHidden,
    onFieldChange,
}: {
    field: FormField;
    isHidden: boolean;
    onFieldChange: (patch: Partial<FormField>) => void;
}) {
    if (isHidden) {
        return <p className="ff:text-xs ff:text-slate-400">{__("Hidden fields have nothing to validate.")}</p>;
    }
    return (
        <div className="ff:flex ff:flex-col ff:gap-4">
            <div className="ff:flex ff:items-center ff:justify-between">
                <Label htmlFor="ff-field-required" className="ff:text-sm ff:font-medium ff:text-slate-700">
                    {__("Required")}
                </Label>
                <Switch
                    id="ff-field-required"
                    checked={field.required}
                    onCheckedChange={(next) => onFieldChange({ required: next })}
                />
            </div>
            <p className="ff:text-xs ff:text-slate-400">
                {__("A required field must be filled in before the form can be submitted.")}
            </p>
        </div>
    );
}

function LogicTab({
    config,
    field,
    onFieldChange,
}: {
    config: FormConfig;
    field: FormField;
    onFieldChange: (patch: Partial<FormField>) => void;
}) {
    const logic = field.logic && "field" in field.logic ? (field.logic as FieldLogic) : null;
    const others = config.fields.filter((f) => f.id !== field.id);
    const op = LOGIC_OPERATORS.find((o) => o.value === logic?.operator) ?? LOGIC_OPERATORS[0];

    const setLogic = (patch: Partial<FieldLogic>) => {
        if (!logic) {
            return;
        }
        onFieldChange({ logic: { ...logic, ...patch } });
    };

    if (others.length === 0) {
        return (
            <p className="ff:text-xs ff:text-slate-400">
                {__("Add another field first, then this field can show or hide based on its answer.")}
            </p>
        );
    }

    if (!logic) {
        return (
            <div className="ff:flex ff:flex-col ff:gap-3">
                <p className="ff:text-xs ff:text-slate-500">
                    {__("Show or hide this field based on another field's answer.")}
                </p>
                <button
                    type="button"
                    onClick={() =>
                        onFieldChange({
                            logic: { action: "show", field: others[0].id, operator: "equals", value: "" },
                        })
                    }
                    className="ff:cursor-pointer ff:rounded-lg ff:border ff:border-slate-200 ff:bg-white ff:px-3 ff:py-2 ff:text-sm ff:font-medium ff:text-slate-700 ff:transition-colors ff:hover:border-brand-300 ff:hover:bg-brand-50 ff:hover:text-brand-700"
                >
                    {__("Add a rule")}
                </button>
            </div>
        );
    }

    return (
        <div className="ff:flex ff:flex-col ff:gap-4">
            <Row label={__("This field should")} htmlFor="ff-logic-action">
                <Select
                    id="ff-logic-action"
                    value={logic.action}
                    options={[
                        { value: "show", label: __("Show") },
                        { value: "hide", label: __("Hide") },
                    ]}
                    onChange={(e) => setLogic({ action: e.target.value as FieldLogic["action"] })}
                />
            </Row>
            <Row label={__("When field")} htmlFor="ff-logic-field">
                <Select
                    id="ff-logic-field"
                    value={logic.field}
                    options={others.map((f) => ({ value: f.id, label: f.label || f.id }))}
                    onChange={(e) => setLogic({ field: e.target.value })}
                />
            </Row>
            <Row label={__("Condition")} htmlFor="ff-logic-operator">
                <Select
                    id="ff-logic-operator"
                    value={logic.operator}
                    options={LOGIC_OPERATORS.map((o) => ({ value: o.value, label: o.label() }))}
                    onChange={(e) => setLogic({ operator: e.target.value as LogicOperator })}
                />
            </Row>
            {op.needsValue && (
                <Row label={__("Value")} htmlFor="ff-logic-value">
                    <Input
                        id="ff-logic-value"
                        value={logic.value}
                        onChange={(e) => setLogic({ value: e.target.value })}
                    />
                </Row>
            )}
            <button
                type="button"
                onClick={() => onFieldChange({ logic: {} })}
                className="ff:cursor-pointer ff:self-start ff:rounded ff:bg-transparent ff:text-xs ff:font-medium ff:text-red-600 ff:hover:underline"
            >
                {__("Remove rule")}
            </button>
        </div>
    );
}

function StyleTab({
    field,
    isHidden,
    onFieldChange,
}: {
    field: FormField;
    isHidden: boolean;
    onFieldChange: (patch: Partial<FormField>) => void;
}) {
    if (isHidden) {
        return <p className="ff:text-xs ff:text-slate-400">{__("Hidden fields are never shown, so they have no layout.")}</p>;
    }
    return (
        <div className="ff:flex ff:flex-col ff:gap-4">
            <Row label={__("Width (desktop)")} htmlFor="ff-field-width">
                <Select
                    id="ff-field-width"
                    value={field.width}
                    options={WIDTH_OPTIONS.map((w) => ({ value: w.value, label: w.label() }))}
                    onChange={(e) => onFieldChange({ width: e.target.value as FieldWidth })}
                />
            </Row>
            <Row label={__("Width (tablet ≤ 1024px)")} htmlFor="ff-field-width-tablet">
                <Select
                    id="ff-field-width-tablet"
                    value={field.widthTablet ?? "inherit"}
                    options={RESPONSIVE_WIDTH_OPTIONS.map((w) => ({ value: w.value, label: w.label() }))}
                    onChange={(e) => onFieldChange({ widthTablet: e.target.value as ResponsiveWidth })}
                />
            </Row>
            <Row label={__("Width (mobile ≤ 640px)")} htmlFor="ff-field-width-mobile">
                <Select
                    id="ff-field-width-mobile"
                    value={field.widthMobile ?? "inherit"}
                    options={RESPONSIVE_WIDTH_OPTIONS.map((w) => ({ value: w.value, label: w.label() }))}
                    onChange={(e) => onFieldChange({ widthMobile: e.target.value as ResponsiveWidth })}
                />
            </Row>
            <p className="ff:text-xs ff:text-slate-400">
                {__("Inherit keeps the width of the larger screen. Fields flow into columns and wrap when they no longer fit.")}
            </p>
        </div>
    );
}

function TabButton({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "ff:-mb-px ff:cursor-pointer ff:border-0 ff:border-b-2 ff:bg-transparent ff:px-2 ff:py-1.5 ff:text-xs ff:font-medium ff:transition-colors",
                active
                    ? "ff:border-brand-600 ff:text-brand-700"
                    : "ff:border-transparent ff:text-slate-500 ff:hover:text-slate-800",
            )}
        >
            {children}
        </button>
    );
}

function Row({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
    return (
        <div>
            <Label htmlFor={htmlFor} className="ff:mb-1.5 ff:block ff:text-sm ff:font-medium ff:text-slate-700">
                {label}
            </Label>
            {children}
        </div>
    );
}
