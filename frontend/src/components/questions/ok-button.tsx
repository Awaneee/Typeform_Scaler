import type { Theme } from "@/lib/themes";

interface OkButtonProps {
  theme: Theme;
  label?: string;
  onClick?: () => void;
  disabled?: boolean;
  /** Typeform dims the button until the question has an answer (it stays clickable). */
  dimmed?: boolean;
}

/** Typeform's plain "OK" / "Submit" button under each question. */
export function OkButton({ theme, label = "OK", onClick, disabled, dimmed }: OkButtonProps) {
  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        tabIndex={onClick ? undefined : -1}
        className={`rounded-md px-4 py-2 text-lg font-semibold transition-opacity hover:opacity-90 disabled:opacity-60 ${dimmed ? "opacity-60" : ""}`}
        style={{ background: theme.button, color: theme.buttonText }}
      >
        {label}
      </button>
    </div>
  );
}
