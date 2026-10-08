"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { withAlpha } from "@/lib/color";
import type { AnswerProps } from "./types";

const PLACEHOLDERS: Record<string, string> = {
  short_text: "Type your answer here...",
  long_text: "Type your answer here...",
  email: "name@example.com",
  number: "Type your answer here...",
};

function useFieldStyle(theme: AnswerProps["theme"]) {
  return {
    color: theme.answer,
    borderColor: withAlpha(theme.answer, 0.3),
    caretColor: theme.answer,
    ["--ph" as string]: withAlpha(theme.answer, 0.35),
    ["--focus" as string]: theme.answer,
  };
}

const fieldClass =
  "w-full border-0 border-b bg-transparent pb-2 text-[22px] leading-snug outline-none transition-[border-color,box-shadow] sm:text-[28px] " +
  "placeholder:text-[var(--ph)] focus:border-[var(--focus)] focus:shadow-[0_1px_0_0_var(--focus)] disabled:cursor-default";

/** Short text, email and number: one underlined line, Enter to continue. */
export function TextAnswer({ question, value, onChange, theme, preview, active, onSubmit }: AnswerProps) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (active && !preview) ref.current?.focus({ preventScroll: true });
  }, [active, preview]);

  return (
    <input
      ref={ref}
      type={question.type === "email" ? "email" : "text"}
      inputMode={question.type === "number" ? "decimal" : question.type === "email" ? "email" : "text"}
      autoComplete={question.type === "email" ? "email" : "off"}
      value={typeof value === "string" || typeof value === "number" ? String(value) : ""}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.nativeEvent.isComposing) {
          e.preventDefault();
          onSubmit?.();
        }
      }}
      placeholder={question.settings.placeholder || PLACEHOLDERS[question.type]}
      maxLength={question.settings.max_length}
      disabled={preview}
      tabIndex={preview ? -1 : undefined}
      aria-label={question.title || "Your answer"}
      className={fieldClass}
      style={useFieldStyle(theme)}
    />
  );
}

/** Long text: grows with content. Enter continues, Shift+Enter adds a line break (like Typeform). */
export function LongTextAnswer({ question, value, onChange, theme, preview, active, onSubmit }: AnswerProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const text = typeof value === "string" ? value : "";

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);

  useEffect(() => {
    if (active && !preview) ref.current?.focus({ preventScroll: true });
  }, [active, preview]);

  return (
    <div>
      <textarea
        ref={ref}
        rows={1}
        value={text}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            onSubmit?.();
          }
        }}
        placeholder={question.settings.placeholder || PLACEHOLDERS.long_text}
        maxLength={question.settings.max_length}
        disabled={preview}
        tabIndex={preview ? -1 : undefined}
        aria-label={question.title || "Your answer"}
        className={`${fieldClass} resize-none overflow-hidden`}
        style={useFieldStyle(theme)}
      />
      <p className="mt-2 text-xs" style={{ color: withAlpha(theme.answer, 0.7) }}>
        <strong>Shift ⇧ + Enter ↵</strong> to make a line break
      </p>
    </div>
  );
}
