"use client";

import { Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { choiceKey } from "@/components/questions/answers/types";
import { withAlpha } from "@/lib/color";
import type { Theme } from "@/lib/themes";
import { useBuilder } from "@/store/builder-store";
import type { Question } from "@/types/form";

/** Inline-editable multiple choice options on the canvas.
 *  Enter adds a choice below, Backspace on an empty choice removes it. */
export function ChoiceEditor({ question, theme }: { question: Question; theme: Theme }) {
  const addOption = useBuilder((s) => s.addOption);
  const updateOption = useBuilder((s) => s.updateOption);
  const removeOption = useBuilder((s) => s.removeOption);
  const [focusId, setFocusId] = useState<string | null>(null);
  const refs = useRef(new Map<string, HTMLInputElement>());

  useEffect(() => {
    if (focusId) refs.current.get(focusId)?.focus();
  }, [focusId, question.options.length]);

  function remove(index: number) {
    const option = question.options[index];
    removeOption(question.id, option.id);
    setFocusId(question.options[index - 1]?.id ?? question.options[index + 1]?.id ?? null);
  }

  return (
    <div className="inline-flex max-w-full min-w-[220px] flex-col gap-2 sm:max-w-md">
      {question.settings.allow_multiple && (
        <p className="text-sm" style={{ color: withAlpha(theme.question, 0.7) }}>
          Choose as many as you like
        </p>
      )}
      {question.options.map((option, i) => (
        <div
          key={option.id}
          className="group flex items-center gap-2.5 rounded-md px-2.5 py-2"
          style={{ color: theme.question, background: withAlpha(theme.answer, 0.08) }}
        >
          <span
            className="flex h-6 min-w-6 items-center justify-center rounded-[4px] border text-xs font-semibold"
            style={{ borderColor: withAlpha(theme.answer, 0.3), background: theme.background, color: theme.answer }}
          >
            {choiceKey(i)}
          </span>
          <input
            ref={(el) => {
              if (el) refs.current.set(option.id, el);
              else refs.current.delete(option.id);
            }}
            value={option.label}
            onChange={(e) => updateOption(question.id, option.id, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                setFocusId(addOption(question.id));
              } else if (e.key === "Backspace" && option.label === "" && question.options.length > 1) {
                e.preventDefault();
                remove(i);
              }
            }}
            placeholder={`Choice ${choiceKey(i)}`}
            aria-label={`Choice ${choiceKey(i)}`}
            className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[var(--ph)] sm:text-lg"
            style={{ ["--ph" as string]: withAlpha(theme.question, 0.4) }}
          />
          {question.options.length > 1 && (
            <button
              onClick={() => remove(i)}
              className="rounded p-0.5 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
              aria-label={`Remove choice ${choiceKey(i)}`}
            >
              <X size={16} />
            </button>
          )}
        </div>
      ))}
      <button
        onClick={() => setFocusId(addOption(question.id))}
        className="flex w-fit items-center gap-1 px-1 py-1 text-sm underline underline-offset-4"
        style={{ color: theme.question }}
      >
        <Plus size={15} /> Add choice
      </button>
    </div>
  );
}
