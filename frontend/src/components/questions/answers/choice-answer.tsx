"use client";

import { useEffect } from "react";
import { withAlpha } from "@/lib/color";
import type { Theme } from "@/lib/themes";
import { choiceKey, isTyping, type AnswerProps } from "./types";

interface ChoiceButtonProps {
  label: string;
  keyHint: string;
  selected: boolean;
  theme: Theme;
  preview?: boolean;
  onClick?: () => void;
}

/** One Typeform-style choice: tinted box, letter key on the left, check when selected. */
export function ChoiceButton({ label, keyHint, selected, theme, preview, onClick }: ChoiceButtonProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={onClick}
      disabled={preview}
      tabIndex={preview ? -1 : undefined}
      className="group flex w-full min-w-0 items-center gap-2.5 rounded-md py-2 pr-6 pl-2.5 text-left text-base transition-[background-color,box-shadow] sm:text-lg disabled:cursor-default"
      style={{
        color: theme.question,
        background: selected ? theme.background : withAlpha(theme.answer, 0.08),
        boxShadow: selected ? `inset 0 0 0 2px ${theme.answer}` : undefined,
      }}
      onMouseEnter={(e) => !selected && !preview && (e.currentTarget.style.background = withAlpha(theme.answer, 0.14))}
      onMouseLeave={(e) => !selected && (e.currentTarget.style.background = withAlpha(theme.answer, 0.08))}
    >
      <span
        className="flex h-6 min-w-6 items-center justify-center rounded-[4px] border px-1 text-xs font-semibold"
        style={{
          borderColor: selected ? theme.answer : withAlpha(theme.answer, 0.3),
          background: selected ? theme.answer : theme.background,
          color: selected ? theme.background : theme.answer,
        }}
      >
        {keyHint}
      </span>
      <span className="min-w-0 flex-1 break-words">{label}</span>
    </button>
  );
}

/** Press a choice's letter key to toggle it (only while this question is on screen). */
export function useLetterKeys(enabled: boolean, count: number, onPick: (index: number) => void) {
  useEffect(() => {
    if (!enabled) return;
    function onKey(e: KeyboardEvent) {
      if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1) return;
      const index = e.key.toUpperCase().charCodeAt(0) - 65;
      if (index >= 0 && index < count) {
        e.preventDefault();
        onPick(index);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, count, onPick]);
}

export function MultipleChoiceAnswer({ question, value, onChange, theme, preview, active, onCommit }: AnswerProps) {
  const selected = Array.isArray(value) ? value : [];
  const multi = !!question.settings.allow_multiple;

  function toggle(id: string) {
    if (multi) {
      onChange(selected.includes(id) ? selected.filter((v) => v !== id) : [...selected, id]);
    } else {
      onChange(selected.includes(id) ? [] : [id]);
      if (!selected.includes(id)) onCommit?.();
    }
  }

  useLetterKeys(!!active && !preview, question.options.length, (i) => toggle(question.options[i].id));

  return (
    <div>
      {multi && (
        <p className="mb-3 text-sm" style={{ color: withAlpha(theme.question, 0.7) }}>
          Choose as many as you like
        </p>
      )}
      <div className="inline-flex max-w-full min-w-[200px] flex-col gap-2 sm:max-w-md">
        {question.options.map((option, i) => (
          <ChoiceButton
            key={option.id}
            label={option.label || `Choice ${choiceKey(i)}`}
            keyHint={choiceKey(i)}
            selected={selected.includes(option.id)}
            theme={theme}
            preview={preview}
            onClick={() => toggle(option.id)}
          />
        ))}
      </div>
    </div>
  );
}

export function YesNoAnswer({ value, onChange, theme, preview, active, onCommit }: AnswerProps) {
  const pick = (v: boolean) => {
    onChange(value === v ? null : v);
    if (value !== v) onCommit?.();
  };

  useEffect(() => {
    if (!active || preview) return;
    function onKey(e: KeyboardEvent) {
      if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "y" || k === "n") {
        e.preventDefault();
        pick(k === "y");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="inline-flex min-w-[160px] flex-col gap-2">
      <ChoiceButton label="Yes" keyHint="Y" selected={value === true} theme={theme} preview={preview} onClick={() => pick(true)} />
      <ChoiceButton label="No" keyHint="N" selected={value === false} theme={theme} preview={preview} onClick={() => pick(false)} />
    </div>
  );
}
