import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

interface ColorFieldProps {
    value: string;
    onChange: (value: string) => void;
    /** Placeholder for the hex text input (e.g. "inherit"). */
    placeholder?: string;
    /** id for the hex input, so an external <Label htmlFor> can point at it. */
    id?: string;
    /** Accessible name for the swatch, which has no visible label of its own. */
    swatchLabel?: string;
    /** Extra classes for the hex text input (usually a width). */
    inputClassName?: string;
    className?: string;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

/**
 * A native color swatch paired with a free-text hex field, both bound to one
 * value. The swatch only accepts a valid 6-digit hex; while the text field
 * holds an intermediate or invalid value the swatch falls back to black for
 * display without clobbering what the user is typing.
 */
export function ColorField({
    value,
    onChange,
    placeholder,
    id,
    swatchLabel,
    inputClassName,
    className,
}: ColorFieldProps) {
    return (
        <div className={cn("ff:flex ff:items-center ff:gap-2", className)}>
            <input
                type="color"
                aria-label={swatchLabel}
                value={HEX.test(value) ? value : "#000000"}
                onChange={(e) => onChange(e.target.value)}
                className="ff:h-9 ff:w-10 ff:shrink-0 ff:cursor-pointer ff:rounded ff:border ff:border-slate-300 ff:bg-white ff:p-0.5"
            />
            <Input
                id={id}
                value={value}
                placeholder={placeholder}
                onChange={(e) => onChange(e.target.value)}
                className={inputClassName}
                spellCheck={false}
            />
        </div>
    );
}
