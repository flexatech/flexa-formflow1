import { FileText, Mail, Package, Workflow, LayoutGrid } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { __ } from "@/lib/i18n";
import type { Pack } from "@/features/library/types";
import { ownershipChip } from "./AssetCard";

/**
 * Pack cards are visually senior to asset cards (PRODUCT_DESIGN.md section L):
 * a cover band, a contents summary, and the state chip.
 * Presentational; the parent supplies the click and the primary action.
 */
export function PackCard({ pack, onSelect }: { pack: Pack; onSelect?: (pack: Pack) => void }) {
    const chip = ownershipChip(pack);
    const counts = [
        { icon: FileText, n: pack.contents.forms, label: __("Forms") },
        { icon: Mail, n: pack.contents.emails, label: __("Emails") },
        { icon: Workflow, n: pack.contents.workflows, label: __("Workflows") },
        { icon: LayoutGrid, n: pack.contents.patterns, label: __("Patterns") },
    ];

    return (
        <div className="ff:flex ff:flex-col ff:overflow-hidden ff:rounded-xl ff:border ff:border-slate-200 ff:bg-white ff:transition-shadow ff:hover:shadow-md">
            <div className="ff:flex ff:items-center ff:gap-3 ff:bg-gradient-to-br ff:from-brand-500 ff:to-brand-700 ff:px-5 ff:py-4 ff:text-white">
                <div className="ff:flex ff:items-center ff:gap-3">
                    <span className="ff:flex ff:h-10 ff:w-10 ff:items-center ff:justify-center ff:rounded-xl ff:bg-white/15">
                        <Package aria-hidden className="ff:h-5 ff:w-5" />
                    </span>
                    <div className="ff:flex ff:flex-col">
                        <span className="ff:text-[11px] ff:uppercase ff:tracking-wide ff:text-white/70">
                            {pack.category}
                        </span>
                        <span className="ff:text-base ff:font-semibold ff:leading-tight">{pack.name}</span>
                    </div>
                </div>
            </div>

            <div className="ff:flex ff:flex-1 ff:flex-col ff:gap-4 ff:p-5">
                <p className="ff:m-0 ff:text-sm ff:leading-relaxed ff:text-slate-600">{pack.description}</p>

                <div className="ff:grid ff:grid-cols-4 ff:gap-2">
                    {counts.map(({ icon: Icon, n, label }) => (
                        <div
                            key={label}
                            className="ff:flex ff:flex-col ff:items-center ff:gap-1 ff:rounded-lg ff:bg-slate-50 ff:py-2"
                        >
                            <Icon aria-hidden className="ff:h-4 ff:w-4 ff:text-slate-400" />
                            <span className="ff:text-sm ff:font-semibold ff:tabular-nums ff:text-slate-900">{n}</span>
                            <span className="ff:text-[10px] ff:text-slate-400">{label}</span>
                        </div>
                    ))}
                </div>

                <div className="ff:mt-auto ff:flex ff:items-center ff:justify-between ff:gap-3">
                    <Badge variant={chip.variant}>{chip.label}</Badge>
                    <Button variant="outline" size="sm" onClick={() => onSelect?.(pack)}>
                        {__("View pack")}
                    </Button>
                </div>
            </div>
        </div>
    );
}
