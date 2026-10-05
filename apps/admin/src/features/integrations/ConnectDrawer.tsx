import { useEffect, useState } from "react";
import { SchemaFields } from "@/components/custom/SchemaFields";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { __ } from "@/lib/i18n";
import { useUiStore } from "@/lib/store";
import type { ExtensionIntegration } from "@/lib/wp";
import { useConnection, useSaveConnection } from "./useIntegrations";

/**
 * The connect drawer for one integration. The fields are described by an add-on
 * (see src/Extensions/Registry.php); this renders them with the shared schema
 * controls and stores the values through the Free connection endpoint. Secret
 * fields are masked and never round-trip: a blank secret keeps the stored one.
 */
export function ConnectDrawer({
    integration,
    open,
    onClose,
}: {
    integration: ExtensionIntegration;
    open: boolean;
    onClose: () => void;
}) {
    const connection = useConnection(integration.id, open);
    const save = useSaveConnection(integration.id);
    const showToast = useUiStore((s) => s.showToast);
    const [values, setValues] = useState<Record<string, unknown>>({});

    // Seed the form from field defaults, then overlay the stored non-secret
    // values once the connection loads. Secrets stay blank (masked placeholder).
    useEffect(() => {
        if (!open) return;
        const defaults: Record<string, unknown> = {};
        for (const field of integration.fields) {
            if (field.default !== undefined) defaults[field.key] = field.default;
        }
        setValues({ ...defaults, ...(connection.data?.values ?? {}) });
    }, [open, integration.fields, connection.data]);

    const onSave = () => {
        save.mutate(values, {
            onSuccess: () => {
                showToast(__("Connection saved."), "success");
                onClose();
            },
            onError: () => showToast(__("Could not save the connection."), "error"),
        });
    };

    return (
        <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{integration.label}</DialogTitle>
                    {integration.summary && <DialogDescription>{integration.summary}</DialogDescription>}
                </DialogHeader>

                <SchemaFields
                    fields={integration.fields}
                    values={values}
                    onChange={(patch) => setValues((prev) => ({ ...prev, ...patch }))}
                    context={{ savedSecrets: connection.data?.secrets }}
                />

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>
                        {__("Cancel")}
                    </Button>
                    <Button onClick={onSave} disabled={save.isPending}>
                        {save.isPending ? __("Saving…") : __("Save connection")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
