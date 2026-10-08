"use client";

import { Check, ChevronDown, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { withAlpha } from "@/lib/color";
import type { AnswerProps } from "./types";

/** Typeform's dropdown is a type-to-filter combobox with an inline list. */
export function DropdownAnswer({ question, value, onChange, theme, preview, active, onSubmit, onCommit }: AnswerProps) {
  const selected = question.options.find((o) => o.id === value);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? question.options.filter((o) => o.label.toLowerCase().includes(q)) : question.options;
  }, [query, question.options]);

  useEffect(() => {
    if (active && !preview) inputRef.current?.focus({ preventScroll: true });
  }, [active, preview]);

  function choose(id: string) {
    onChange(id);
    setQuery("");
    setOpen(false);
    onCommit?.();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && open && matches[highlight]) {
      e.preventDefault();
      e.stopPropagation();
      choose(matches[highlight].id);
    } else if (e.key === "Enter") {
      // List closed (or nothing matches): Enter means "OK", like other questions.
      e.preventDefault();
      setOpen(false);
      onSubmit?.();
    } else if (e.key === "Escape" && open) {
      e.stopPropagation();
      setOpen(false);
    }
  }

  const line = withAlpha(theme.answer, 0.3);

  return (
    <div className="w-full max-w-xl">
      <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: open ? theme.answer : line }}>
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-label={question.title || "Select an option"}
          value={open ? query : (selected?.label ?? "")}
          placeholder={question.settings.placeholder || "Type or select an option"}
          onFocus={() => !preview && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlight(0);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          disabled={preview}
          tabIndex={preview ? -1 : undefined}
          className="min-w-0 flex-1 bg-transparent text-[22px] outline-none placeholder:text-[var(--ph)] sm:text-[28px]"
          style={{ color: theme.answer, ["--ph" as string]: withAlpha(theme.answer, 0.35) }}
        />
        {selected && !preview ? (
          <button type="button" aria-label="Clear" onClick={() => onChange(null)} style={{ color: theme.answer }}>
            <X size={22} />
          </button>
        ) : (
          <ChevronDown size={26} style={{ color: theme.answer }} aria-hidden />
        )}
      </div>

      {open && (
        <ul id={listId} role="listbox" className="mt-2 max-h-60 space-y-1.5 overflow-y-auto pr-1">
          {matches.length === 0 && (
            <li className="py-2 text-sm" style={{ color: withAlpha(theme.answer, 0.7) }}>
              No suggestions found
            </li>
          )}
          {matches.map((o, i) => (
            <li
              key={o.id}
              role="option"
              aria-selected={o.id === value}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(o.id)}
              onMouseEnter={() => setHighlight(i)}
              className="flex cursor-pointer items-center justify-between rounded-[4px] border px-3 py-2 text-base"
              style={{
                color: theme.answer,
                borderColor: withAlpha(theme.answer, 0.6),
                background: withAlpha(theme.answer, i === highlight ? 0.25 : 0.1),
              }}
            >
              {o.label}
              {o.id === value && <Check size={18} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
