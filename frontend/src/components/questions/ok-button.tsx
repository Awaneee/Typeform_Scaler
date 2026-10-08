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
        className="flex items-center gap-1.5 rounded-[4px] px-4 py-2 text-lg font-bold shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ background: theme.button, color: theme.buttonText }}
      >
        {label} {showCheck && <Check size={18} strokeWidth={3} />}
      </button>
      <span className="hidden items-center gap-1 text-xs sm:flex" style={{ color: withAlpha(theme.question, 0.7) }}>
        press <strong>Enter</strong> <CornerDownLeft size={12} />
      </span>
    </div>
  );
}
