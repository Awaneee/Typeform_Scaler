"use client";

import { Star } from "lucide-react";
import { useEffect, useState } from "react";
import { withAlpha } from "@/lib/color";
import { isTyping, type AnswerProps } from "./types";

export function RatingAnswer({ question, value, onChange, theme, preview, active, onCommit }: AnswerProps) {
  const steps = question.settings.steps ?? 5;
  const current = typeof value === "number" ? value : 0;
  const [hover, setHover] = useState(0);
  const shown = hover || current;

  function pick(n: number) {
    onChange(n);
    onCommit?.();
  }

  useEffect(() => {
    if (!active || preview) return;
    function onKey(e: KeyboardEvent) {
      if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      const n = e.key === "0" ? 10 : Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= steps) {
        e.preventDefault();
        pick(n);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    // Sized by the space it actually gets (container query), so 5 stars fit on the narrow builder canvas too.
    <div className="@container">
    <div className="flex flex-wrap gap-1 @md:gap-2" role="radiogroup" aria-label={question.title || "Rating"} onMouseLeave={() => setHover(0)}>
      {Array.from({ length: steps }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={current === n}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          disabled={preview}
          tabIndex={preview ? -1 : undefined}
          onMouseEnter={() => !preview && setHover(n)}
          onClick={() => pick(n)}
          className="flex flex-col items-center gap-1 rounded-md p-1 transition-transform hover:scale-105 disabled:cursor-default disabled:hover:scale-100"
        >
          <Star
            className="h-9 w-9 @md:h-11 @md:w-11"
            strokeWidth={1.25}
            stroke={theme.answer}
            fill={n <= shown ? theme.answer : withAlpha(theme.answer, 0.08)}
          />
          <span className="text-sm tabular-nums" style={{ color: theme.answer }}>
            {n}
          </span>
        </button>
      ))}
    </div>
    </div>
  );
}
