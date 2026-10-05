import { ExternalLink, Mail, MailCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { __ } from "@/lib/i18n";
import { useEmailTemplatesList } from "@/features/emails/useEmailTemplates";
import type { EmailTemplate } from "@/features/emails/types";
import type { FormConfig } from "../types";

interface NotificationsTabProps {
    config: FormConfig;
    onChange: (config: FormConfig) => void;
}

/**
 * Email notification settings: toggles, recipients, subjects, and the email
 * design each notification uses (a saved template, or the built-in default).
 */
export function NotificationsTab({ config, onChange }: NotificationsTabProps) {
    const { admin, confirmation } = config.notifications;
    const { data: templates } = useEmailTemplatesList();
    const templateList = templates ?? [];
    const patchAdmin = (patch: Partial<typeof admin>) =>
        onChange({
            ...config,
            notifications: { ...config.notifications, admin: { ...admin, ...patch } },
        });
    const patchConfirmation = (patch: Partial<typeof confirmation>) =>
        onChange({
            ...config,
            notifications: { ...config.notifications, confirmation: { ...confirmation, ...patch } },
        });

    const emailFields = config.fields.filter((f) => f.type === "email");

    return (
        <div className="ff:mx-auto ff:flex ff:max-w-2xl ff:flex-col ff:gap-6 ff:p-6">
            <section className="ff:overflow-hidden ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white">
                <div className="ff:flex ff:items-center ff:gap-3 ff:border-b ff:border-slate-100 ff:px-5 ff:py-4">
                    <div className="ff:flex ff:h-9 ff:w-9 ff:shrink-0 ff:items-center ff:justify-center ff:rounded-lg ff:bg-brand-50 ff:text-brand-600">
                        <Mail aria-hidden className="ff:h-4 ff:w-4" />
                    </div>
                    <div className="ff:min-w-0 ff:flex-1">
                        <p className="ff:text-sm ff:font-medium ff:text-slate-900">{__("Notify you")}</p>
                        <p className="ff:text-xs ff:text-slate-500">
                            {__("An email with every submitted field, sent on each new entry.")}
                        </p>
                    </div>
                    <Switch
                        checked={admin.enabled}
                        onCheckedChange={(next) => patchAdmin({ enabled: next })}
                        aria-label={__("Enable the admin notification")}
                    />
                </div>
                {admin.enabled ? (
                    <div className="ff:flex ff:flex-col ff:gap-4 ff:px-5 ff:py-4">
                        <div>
                            <Label htmlFor="ff-admin-to" className="ff:mb-1.5 ff:block ff:text-sm ff:font-medium ff:text-slate-700">
                                {__("Send to")}
                            </Label>
                            <Input
                                id="ff-admin-to"
                                type="email"
                                value={admin.to}
                                placeholder={__("Site admin email")}
                                onChange={(e) => patchAdmin({ to: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor="ff-admin-subject" className="ff:mb-1.5 ff:block ff:text-sm ff:font-medium ff:text-slate-700">
                                {__("Subject")}
                            </Label>
                            <Input
                                id="ff-admin-subject"
                                value={admin.subject}
                                placeholder={__("New submission")}
                                onChange={(e) => patchAdmin({ subject: e.target.value })}
                            />
                        </div>
                        <DesignSelect
                            value={admin.template_id ?? 0}
                            templates={templateList}
                            onChange={(id) => patchAdmin({ template_id: id })}
                        />
                    </div>
                ) : null}
            </section>

            <section className="ff:overflow-hidden ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white">
                <div className="ff:flex ff:items-center ff:gap-3 ff:border-b ff:border-slate-100 ff:px-5 ff:py-4">
                    <div className="ff:flex ff:h-9 ff:w-9 ff:shrink-0 ff:items-center ff:justify-center ff:rounded-lg ff:bg-brand-50 ff:text-brand-600">
                        <MailCheck aria-hidden className="ff:h-4 ff:w-4" />
                    </div>
                    <div className="ff:min-w-0 ff:flex-1">
                        <p className="ff:text-sm ff:font-medium ff:text-slate-900">
                            {__("Confirm to the visitor")}
                        </p>
                        <p className="ff:text-xs ff:text-slate-500">
                            {__("A short reply sent to the email address they entered.")}
                        </p>
                    </div>
                    <Switch
                        checked={confirmation.enabled}
                        onCheckedChange={(next) => patchConfirmation({ enabled: next })}
                        aria-label={__("Enable the confirmation email")}
                    />
                </div>
                {confirmation.enabled ? (
                    <div className="ff:flex ff:flex-col ff:gap-4 ff:px-5 ff:py-4">
                        {emailFields.length === 0 ? (
                            <p className="ff:rounded-lg ff:bg-amber-50 ff:px-3 ff:py-2 ff:text-sm ff:text-amber-800">
                                {__("Add an Email field to the form first, so there is an address to reply to.")}
                            </p>
                        ) : (
                            <div>
                                <Label htmlFor="ff-conf-field" className="ff:mb-1.5 ff:block ff:text-sm ff:font-medium ff:text-slate-700">
                                    {__("Email field")}
                                </Label>
                                <Select
                                    id="ff-conf-field"
                                    value={confirmation.email_field}
                                    options={[
                                        { value: "", label: __("Choose a field…") },
                                        ...emailFields.map((f) => ({ value: f.id, label: f.label || f.id })),
                                    ]}
                                    onChange={(e) => patchConfirmation({ email_field: e.target.value })}
                                    className="ff:w-full"
                                />
                            </div>
                        )}
                        <div>
                            <Label htmlFor="ff-conf-subject" className="ff:mb-1.5 ff:block ff:text-sm ff:font-medium ff:text-slate-700">
                                {__("Subject")}
                            </Label>
                            <Input
                                id="ff-conf-subject"
                                value={confirmation.subject}
                                placeholder={__("We received your message")}
                                onChange={(e) => patchConfirmation({ subject: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor="ff-conf-message" className="ff:mb-1.5 ff:block ff:text-sm ff:font-medium ff:text-slate-700">
                                {__("Message")}
                            </Label>
                            <Textarea
                                id="ff-conf-message"
                                value={confirmation.message}
                                placeholder={__("Thanks for reaching out. We will get back to you soon.")}
                                onChange={(e) => patchConfirmation({ message: e.target.value })}
                            />
                            <p className="ff:mt-1.5 ff:text-xs ff:text-slate-500">
                                {__("Used as the body when the design is set to Default. A template ignores this.")}
                            </p>
                        </div>
                        <DesignSelect
                            value={confirmation.template_id ?? 0}
                            templates={templateList}
                            onChange={(id) => patchConfirmation({ template_id: id })}
                        />
                    </div>
                ) : null}
            </section>
        </div>
    );
}

function DesignSelect({
    value,
    templates,
    onChange,
}: {
    value: number;
    templates: EmailTemplate[];
    onChange: (id: number) => void;
}) {
    return (
        <div>
            <Label className="ff:mb-1.5 ff:block ff:text-sm ff:font-medium ff:text-slate-700">
                {__("Design")}
            </Label>
            <div className="ff:flex ff:items-center ff:gap-2">
                <Select
                    value={String(value || 0)}
                    options={[
                        { value: "0", label: __("Default design") },
                        ...templates.map((t) => ({ value: String(t.id), label: t.title || __("Untitled template") })),
                    ]}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className="ff:w-full"
                />
                {value > 0 ? (
                    <a
                        href={`#/emails/${value}/edit`}
                        className="ff:inline-flex ff:shrink-0 ff:items-center ff:gap-1 ff:whitespace-nowrap ff:text-sm ff:font-medium ff:text-brand-600 ff:no-underline ff:hover:text-brand-700"
                    >
                        {__("Edit")}
                        <ExternalLink aria-hidden className="ff:h-3.5 ff:w-3.5" />
                    </a>
                ) : null}
            </div>
            <p className="ff:mt-1.5 ff:text-xs ff:text-slate-500">
                {__("Pick a saved template or leave the clean default.")}{" "}
                <a href="#/emails" className="ff:text-brand-600 ff:no-underline ff:hover:text-brand-700">
                    {__("Manage templates")}
                </a>
            </p>
        </div>
    );
}
