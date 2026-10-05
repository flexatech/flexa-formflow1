import { type ReactNode } from "react";
import { FileText, LayoutGrid, Mail, ShoppingCart, Workflow, type LucideIcon } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { __ } from "@/lib/i18n";
import type { AssetKind, AssetType, LibraryAsset } from "@/features/library/types";

const TYPE_LABEL: Record<AssetType, () => string> = {
    template: () => __("Template"),
    pattern: () => __("Pattern"),
    recipe: () => __("Recipe"),
    pack: () => __("Pack"),
};

const KIND_ICON: Record<AssetKind, LucideIcon> = {
    form: FileText,
    email: Mail,
    workflow: Workflow,
    woocommerce: ShoppingCart,
};

/**
 * The single ownership chip (PRODUCT_DESIGN.md section N). Installed wins over
 * every other state; then update, then Free.
 */
export function ownershipChip(asset: LibraryAsset): { variant: BadgeProps["variant"]; label: string } {
    if (asset.installed) {
        return { variant: "installed", label: __("Installed") };
    }
    if (asset.updateAvailable) {
        return { variant: "update", label: __("Update") };
    }
    return { variant: "free", label: __("Free") };
}

interface AssetCardProps {
    asset: LibraryAsset;
    /** Called when the card body is activated (opens preview). */
    onSelect?: (asset: LibraryAsset) => void;
    /** Optional footer action, e.g. an Install / Insert button. */
    action?: ReactNode;
}

export function AssetCard({ asset, onSelect, action }: AssetCardProps) {
    const Icon = KIND_ICON[asset.kind] ?? LayoutGrid;
    const chip = ownershipChip(asset);

    return (
        <div className="ff:flex ff:flex-col ff:gap-3 ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:p-4 ff:transition-shadow ff:hover:shadow-sm">
            <button
                type="button"
                onClick={() => onSelect?.(asset)}
                className="ff:flex ff:cursor-pointer ff:flex-col ff:gap-2 ff:border-0 ff:bg-transparent ff:p-0 ff:text-left"
            >
                <div className="ff:flex ff:items-start ff:justify-between ff:gap-2">
                    <span className="ff:flex ff:h-9 ff:w-9 ff:shrink-0 ff:items-center ff:justify-center ff:rounded-lg ff:bg-slate-100 ff:text-slate-500">
                        <Icon aria-hidden className="ff:h-4 ff:w-4" />
                    </span>
                    <Badge variant={chip.variant}>{chip.label}</Badge>
                </div>
                <div className="ff:flex ff:flex-col ff:gap-1">
                    <div className="ff:flex ff:items-center ff:gap-2">
                        <span className="ff:text-sm ff:font-semibold ff:text-slate-900">{asset.name}</span>
                        <span className="ff:text-[11px] ff:uppercase ff:tracking-wide ff:text-slate-400">
                            {TYPE_LABEL[asset.type]()}
                        </span>
                    </div>
                    <p className="ff:m-0 ff:text-xs ff:leading-relaxed ff:text-slate-500">
                        {asset.description}
                    </p>
                </div>
            </button>
            {action && <div className="ff:flex ff:items-center ff:justify-end ff:gap-2">{action}</div>}
        </div>
    );
}
