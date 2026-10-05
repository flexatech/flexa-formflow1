import { Eye, Monitor, Send, ShoppingCart, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/custom/EmptyState";
import { TableSkeleton } from "@/components/custom/Skeletons";
import { withPreviewReset } from "@/features/emails/previewFrame";
import { __ } from "@/lib/i18n";
import { useUiStore } from "@/lib/store";
import {
    useSaveWooEmail,
    useSendWooTestEmail,
    useWooEmailPreview,
    useWooEmails,
    type TokenHint,
    type WooEmailRow,
    type WooOrderOption,
    type WooTemplateOption,
} from "./useWooEmails";

/**
 * The "WooCommerce" tab body of the Emails screen: take over WooCommerce order
 * emails and design them with the FormFlow builder. Rendered only when the
 * WooCommerce tab is active (EmailsPage gates it on Woo being present).
 */
export function WooEmailsTab() {
    const { data, isLoading } = useWooEmails();
    const [preview, setPreview] = useState<{ id: string; title: string } | null>(null);

    if (isLoading || !data) {
        return <TableSkeleton columns={3} />;
    }

    if (!data.hasWooCommerce) {
        return (
            <EmptyState
                icon={ShoppingCart}
                title={__("WooCommerce is not active")}
                description={__(
                    "Install and activate WooCommerce to design its order emails with the FormFlow builder. FormFlow keeps working without it.",
                )}
            />
        );
    }

    return (
        <>
            <TokensHint tokens={data.tokens} />
            <div className="ff:flex ff:flex-col ff:gap-3">
                {data.emails.map((email) => (
                    <EmailCard
                        key={email.id}
                        email={email}
                        templates={data.templates}
                        onPreview={(id, title) => setPreview({ id, title })}
                    />
                ))}
            </div>

            <WooPreviewDialog email={preview} orders={data.orders} onClose={() => setPreview(null)} />
        </>
    );
}

/**
 * Preview one Woo email against a chosen data source. "Sample order" (id 0)
 * renders consistent sample data; picking a real order renders that order so
 * merge tags can be checked against live values. The picker mirrors the Free
 * editor's "Preview with data from" selector.
 */
function WooPreviewDialog({
    email,
    orders,
    onClose,
}: {
    email: { id: string; title: string } | null;
    orders: WooOrderOption[];
    onClose: () => void;
}) {
    const [orderId, setOrderId] = useState(0);
    const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
    const [to, setTo] = useState("");
    const preview = useWooEmailPreview(email?.id ?? null, orderId);
    const testSend = useSendWooTestEmail(email?.id ?? "");
    const showToast = useUiStore((s) => s.showToast);

    // Reset the data source, viewport, and test address whenever a different
    // email opens.
    useEffect(() => {
        setOrderId(0);
        setViewport("desktop");
        setTo("");
    }, [email?.id]);

    const onSendTest = () => {
        testSend.mutate(
            { to, orderId },
            {
                onSuccess: (sent) =>
                    showToast(
                        sent ? __("Test email sent.") : __("Could not send. Check your mail setup."),
                        sent ? "success" : "error",
                    ),
                onError: () => showToast(__("Please enter a valid email address."), "error"),
            },
        );
    };

    const orderOptions = [
        { value: "0", label: __("Sample order") },
        ...orders.map((o) => ({ value: String(o.id), label: o.label })),
    ];

    return (
        <Dialog open={email !== null} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="ff:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{email?.title ?? __("Preview")}</DialogTitle>
                    <DialogDescription>
                        {__("Choose the order this email renders with, or use sample data.")}
                    </DialogDescription>
                </DialogHeader>
                <div className="ff:flex ff:flex-wrap ff:items-center ff:gap-2">
                    <span className="ff:text-xs ff:font-medium ff:text-slate-600">{__("Preview with")}</span>
                    <Select
                        aria-label={__("Preview data source")}
                        value={String(orderId)}
                        options={orderOptions}
                        onChange={(e) => setOrderId(Number(e.target.value))}
                        className="ff:min-w-52"
                    />
                    {preview.isFetching && (
                        <span className="ff:text-xs ff:text-slate-400">{__("Rendering…")}</span>
                    )}
                    {/* Toggle the recipient's view (desktop vs. mobile inbox), mirroring
                        the Free editor's viewport switch. */}
                    <div className="ff:ml-auto ff:flex ff:items-center ff:gap-1 ff:rounded-md ff:border ff:border-slate-200 ff:p-0.5">
                        <Button
                            variant={viewport === "desktop" ? "default" : "ghost"}
                            size="icon"
                            onClick={() => setViewport("desktop")}
                            aria-label={__("Desktop preview")}
                        >
                            <Monitor aria-hidden className="ff:h-4 ff:w-4" />
                        </Button>
                        <Button
                            variant={viewport === "mobile" ? "default" : "ghost"}
                            size="icon"
                            onClick={() => setViewport("mobile")}
                            aria-label={__("Mobile preview")}
                        >
                            <Smartphone aria-hidden className="ff:h-4 ff:w-4" />
                        </Button>
                    </div>
                </div>
                {preview.isError ? (
                    <div className="ff:flex ff:h-[60vh] ff:items-center ff:justify-center ff:rounded-md ff:border ff:border-slate-200 ff:bg-white ff:px-6 ff:text-center ff:text-sm ff:text-slate-500">
                        {__("Could not render the preview.")}
                    </div>
                ) : (
                    <div className="ff:flex ff:h-[60vh] ff:justify-center ff:overflow-auto ff:rounded-md ff:bg-slate-100 ff:p-4">
                        <iframe
                            title={__("Email preview")}
                            srcDoc={preview.data ? withPreviewReset(preview.data) : ""}
                            className={
                                viewport === "desktop"
                                    ? "ff:h-full ff:w-full ff:rounded-md ff:border ff:border-slate-200 ff:bg-white"
                                    : "ff:h-full ff:w-[390px] ff:shrink-0 ff:rounded-md ff:border ff:border-slate-200 ff:bg-white"
                            }
                        />
                    </div>
                )}
                {/* Send this email once to a real inbox, using the same data
                    source selected above, to check how it actually lands. */}
                <DialogFooter className="ff:items-end">
                    <div className="ff:mr-auto ff:flex ff:flex-1 ff:flex-col ff:gap-1.5 ff:text-left">
                        <Label htmlFor="ff-woo-test-to" className="ff:block">
                            {__("Send a test to")}
                        </Label>
                        <Input
                            id="ff-woo-test-to"
                            type="email"
                            value={to}
                            placeholder="you@example.com"
                            onChange={(e) => setTo(e.target.value)}
                            className="ff:max-w-72"
                        />
                    </div>
                    <Button onClick={onSendTest} disabled={testSend.isPending || to === ""}>
                        <Send aria-hidden className="ff:h-4 ff:w-4" />
                        {testSend.isPending ? __("Sending…") : __("Send test")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function TokensHint({ tokens }: { tokens: TokenHint[] }) {
    if (tokens.length === 0) {
        return null;
    }
    return (
        <div className="ff:rounded-lg ff:border ff:border-slate-200 ff:bg-slate-50 ff:px-4 ff:py-3">
            <p className="ff:mb-1 ff:text-xs ff:font-medium ff:text-slate-500">
                {__("Order tokens you can drop into any assigned template or subject line:")}
            </p>
            <div className="ff:flex ff:flex-wrap ff:gap-1.5">
                {tokens.map((t) => (
                    <code
                        key={t.token}
                        title={t.label}
                        className="ff:rounded ff:bg-white ff:px-1.5 ff:py-0.5 ff:text-[11px] ff:text-slate-600 ff:ring-1 ff:ring-slate-200"
                    >
                        {t.token}
                    </code>
                ))}
            </div>
        </div>
    );
}

function EmailCard({
    email,
    templates,
    onPreview,
}: {
    email: WooEmailRow;
    templates: WooTemplateOption[];
    onPreview: (id: string, title: string) => void;
}) {
    const save = useSaveWooEmail(email.id);
    const showToast = useUiStore((s) => s.showToast);

    const templateOptions = [
        { value: "0", label: __("Default design") },
        ...templates.map((t) => ({ value: String(t.id), label: t.title })),
    ];

    const patch = (fields: Parameters<typeof save.mutate>[0]) => {
        save.mutate(fields, {
            onError: (error) =>
                showToast(error instanceof Error ? error.message : __("Could not save."), "error"),
        });
    };

    return (
        <section className="ff:overflow-hidden ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white">
            <div className="ff:flex ff:items-start ff:gap-3 ff:px-5 ff:py-4">
                <div className="ff:min-w-0 ff:flex-1">
                    <div className="ff:flex ff:items-center ff:gap-2">
                        <h2 className="ff:text-sm ff:font-semibold ff:text-slate-900">{email.title}</h2>
                        <span className="ff:rounded ff:bg-slate-100 ff:px-1.5 ff:py-0.5 ff:text-[11px] ff:text-slate-500">
                            {email.recipient === "admin" ? __("Admin") : __("Customer")}
                        </span>
                    </div>
                    <p className="ff:mt-0.5 ff:text-xs ff:text-slate-500">{email.description}</p>
                </div>
                <Switch
                    checked={email.enabled}
                    onCheckedChange={(next) => patch({ enabled: next })}
                    aria-label={__("Take over this email")}
                />
            </div>

            {email.enabled ? (
                <div className="ff:flex ff:flex-col ff:gap-3 ff:border-t ff:border-slate-100 ff:bg-slate-50/60 ff:px-5 ff:py-4">
                    <div className="ff:flex ff:flex-col ff:gap-1.5">
                        <label className="ff:text-xs ff:font-medium ff:text-slate-600">
                            {__("Subject line")}
                        </label>
                        <Input
                            defaultValue={email.subject}
                            placeholder={__("Leave blank to keep the WooCommerce default")}
                            onBlur={(e) => {
                                if (e.target.value !== email.subject) {
                                    patch({ subject: e.target.value });
                                }
                            }}
                            spellCheck={false}
                        />
                    </div>
                    <div className="ff:flex ff:items-end ff:gap-3">
                        <div className="ff:flex ff:flex-1 ff:flex-col ff:gap-1.5">
                            <label className="ff:text-xs ff:font-medium ff:text-slate-600">
                                {__("Template")}
                            </label>
                            <Select
                                options={templateOptions}
                                value={String(email.templateId)}
                                onChange={(e) => patch({ template_id: parseInt(e.target.value, 10) })}
                            />
                        </div>
                        <Button variant="outline" onClick={() => onPreview(email.id, email.title)}>
                            <Eye aria-hidden className="ff:h-4 ff:w-4" />
                            {__("Preview")}
                        </Button>
                    </div>
                </div>
            ) : null}
        </section>
    );
}
