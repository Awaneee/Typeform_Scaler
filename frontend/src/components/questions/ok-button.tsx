import { Check, CornerDownLeft } from "lucide-react";
import { withAlpha } from "@/lib/color";
import type { Theme } from "@/lib/themes";

interface OkButtonProps {
  theme: Theme;
  label?: string;
  onClick?: () => void;
  disabled?: boolean;
  showCheck?: boolean;
}

/** Typeform's "OK ✓  press Enter ↵" row. */
export function OkButton({ theme, label = "OK", onClick, disabled, showCheck = true }: OkButtonProps) {
  return (
    <div className="mt-6 flex items-center gap-3">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        tabIndex={onClick ? undefined : -1}
        className="flex items-center gap-1.5 rounded-md px-4 py-2 text-lg font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ background: theme.button, color: theme.buttonText }}
      >
        {label} {showCheck && <Check size={18} strokeWidth={3} />}
      </button>
      <span
        className={`items-center gap-1 text-xs ${label === "OK" ? "hidden sm:flex" : "hidden"}`}
        style={{ color: withAlpha(theme.question, 0.7) }}
      >
        press <strong>Enter</strong> <CornerDownLeft size={12} />
      </span>
    </div>
  );
}
