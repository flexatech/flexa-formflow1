import { useState } from "react";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { __ } from "@/lib/i18n";
import { useUiStore } from "@/lib/store";
import { useSaveToLibrary } from "./useLibrary";
import type { AssetKind, AssetType } from "./types";

interface SaveToLibraryButtonProps {
    /** The reusable-asset flavour: a whole document is a template, a workflow a recipe. */
    type: AssetType;
    /** What the payload represents, so My Library can route it back to a builder. */
    kind: AssetKind;
    /** Pre-fills the name field with the document's current title. */
    defaultName: string;
    /** Read the builder's live document at save time (the builder owns it whole). */
    getPayload: () => Record<string, unknown>;
}

/**
 * Header action shared by the form, email and workflow builders. Opens a small
 * name dialog and saves the builder's current document to My Library as a
 * reusable asset. Gated behind SHOW_UPCOMING by the caller.
 */
export function SaveToLibraryButton({ type, kind, defaultName, getPayload }: SaveToLibraryButtonProps) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const save = useSaveToLibrary();
    const showToast = useUiStore((s) => s.showToast);

    const start = () => {
        setName(defaultName.trim());
        setOpen(true);
    };

    const onSave = () => {
        const trimmed = name.trim();
        if (trimmed === "") {
            return;
        }
        save.mutate(
            { type, kind, name: trimmed, payload: getPayload() },
            {
                onSuccess: () => {
                    showToast(__("Saved to your library"));
                    setOpen(false);
                },
                onError: () => showToast(__("Could not save to the library."), "error"),
            },
        );
    };

    return (
        <>
            <Button variant="outline" size="sm" onClick={start}>
                <Bookmark aria-hidden className="ff:h-4 ff:w-4" />
                {__("Save to Library")}
            </Button>

            <Dialog open={open} onOpenChange={(next) => !next && setOpen(false)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{__("Save to your library")}</DialogTitle>
                        <DialogDescription>
                            {__("Keep this as a reusable asset. You can insert it into any form, email or workflow later.")}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="ff:py-2">
                        <Label htmlFor="ff-save-library-name" className="ff:mb-1.5 ff:block">
                            {__("Name")}
                        </Label>
                        <Input
                            id="ff-save-library-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={__("Name this asset")}
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    onSave();
                                }
                            }}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>
                            {__("Cancel")}
                        </Button>
                        <Button onClick={onSave} disabled={save.isPending || name.trim() === ""}>
                            {save.isPending ? __("Saving…") : __("Save")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
