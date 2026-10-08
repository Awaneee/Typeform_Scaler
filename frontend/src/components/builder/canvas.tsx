"use client";

import { AnswerField } from "@/components/questions/answers/answer-field";
import { OkButton } from "@/components/questions/ok-button";
import { QuestionNumber } from "@/components/questions/question-number";
import { withAlpha } from "@/lib/color";
import { getTheme, type Theme } from "@/lib/themes";
import { cn } from "@/lib/utils";
import { useBuilder } from "@/store/builder-store";
import type { Question } from "@/types/form";
import { AutoTextarea } from "./auto-textarea";
import { ChoiceEditor } from "./choice-editor";

export type Device = "desktop" | "mobile";

/** The centre column. It *is* the live preview: the selected question is drawn
 *  with the same components respondents get, but its texts are editable in place. */
export function Canvas({ device, onAdd }: { device: Device; onAdd: () => void }) {
  const themeName = useBuilder((s) => s.settings.theme);
  const selected = useBuilder((s) => s.selected);
  const questions = useBuilder((s) => s.questions);
  const theme = getTheme(themeName);
  const index = questions.findIndex((q) => q.id === selected);
  const question = index === -1 ? null : questions[index];

  return (
    <div className="flex min-h-0 flex-1 items-stretch justify-center overflow-hidden">
      <div
        className={cn(
          "relative flex w-full overflow-y-auto rounded-xl border border-line shadow-sm transition-[max-width] duration-300",
          device === "mobile" ? "max-w-[375px]" : "max-w-none",
        )}
        style={{ background: theme.background, fontFamily: theme.font }}
      >
        <div className={cn("m-auto w-full py-12", device === "mobile" ? "px-6" : "max-w-[720px] px-10")}>
          {selected === "ending" ? (
            <EndingEditor theme={theme} />
          ) : question ? (
            <QuestionEditor key={question.id} question={question} number={index + 1} theme={theme} />
          ) : (
            <div className="text-center" style={{ color: theme.question }}>
              <p className="text-xl">Your form has no questions yet.</p>
              <button
                onClick={onAdd}
                className="mt-4 rounded-[4px] px-4 py-2 text-base font-semibold"
                style={{ background: theme.button, color: theme.buttonText }}
              >
                Add a question
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuestionEditor({ question, number, theme }: { question: Question; number: number; theme: Theme }) {
  const update = useBuilder((s) => s.updateQuestion);
  const error = useBuilder((s) => s.publishErrors[question.id]);

  return (
    <div>
      <div className="flex gap-2">
        <QuestionNumber number={number} theme={theme} />
        <div className="min-w-0 flex-1">
          {/* The hidden copy underneath has the same text and wrapping as the textarea, so the
              required asterisk lands right after the last word, like on the public form. */}
          <div className="grid text-xl leading-snug sm:text-2xl">
            <div aria-hidden className="pointer-events-none col-start-1 row-start-1 break-words whitespace-pre-wrap text-transparent select-none">
              {question.title || "Your question here."}
              {question.required && <span style={{ color: theme.question }}> *</span>}
            </div>
            <AutoTextarea
              value={question.title}
              onChange={(e) => update(question.id, { title: e.target.value.replace(/\n/g, " ") })}
              placeholder="Your question here."
              aria-label="Question title"
              autoFocus={!question.title}
              className="col-start-1 row-start-1 break-words placeholder:text-[var(--ph)] placeholder:italic"
              style={{ color: theme.question, ["--ph" as string]: withAlpha(theme.question, 0.35) }}
            />
            {question.required && <span className="sr-only" aria-label="required" />}
          </div>
          <AutoTextarea
            value={question.description}
            onChange={(e) => update(question.id, { description: e.target.value })}
            placeholder="Description (optional)"
            aria-label="Question description"
            className="mt-2 text-base leading-snug sm:text-lg placeholder:text-[var(--ph)] placeholder:italic"
            style={{ color: withAlpha(theme.question, 0.7), ["--ph" as string]: withAlpha(theme.question, 0.3) }}
          />
          {error && <p className="mt-2 text-sm font-medium text-danger">{error}</p>}

          <div className="mt-8">
            {question.type === "multiple_choice" ? (
              <ChoiceEditor question={question} theme={theme} />
            ) : (
              <div className="pointer-events-none">
                <AnswerField question={question} value={undefined} onChange={() => {}} theme={theme} preview />
              </div>
            )}
          </div>

          <OkButton theme={theme} />
        </div>
      </div>
    </div>
  );
}

function EndingEditor({ theme }: { theme: Theme }) {
  const thankYou = useBuilder((s) => s.settings.thank_you);
  const updateSettings = useBuilder((s) => s.updateSettings);
  const set = (patch: Partial<typeof thankYou>) => updateSettings({ thank_you: { ...thankYou, ...patch } });

  return (
    <div className="mx-auto max-w-xl text-center">
      <AutoTextarea
        value={thankYou.title}
        onChange={(e) => set({ title: e.target.value.replace(/\n/g, " ") })}
        placeholder="Thanks for completing this form"
        aria-label="Thank you title"
        className="text-center text-2xl leading-snug sm:text-3xl placeholder:text-[var(--ph)]"
        style={{ color: theme.question, ["--ph" as string]: withAlpha(theme.question, 0.35) }}
      />
      <AutoTextarea
        value={thankYou.description}
        onChange={(e) => set({ description: e.target.value })}
        placeholder="Description (optional)"
        aria-label="Thank you description"
        className="mt-3 text-center text-lg placeholder:text-[var(--ph)]"
        style={{ color: withAlpha(theme.question, 0.7), ["--ph" as string]: withAlpha(theme.question, 0.3) }}
      />
      <span
        className="mt-8 inline-flex rounded-[4px] px-5 py-2.5 text-lg font-bold"
        style={{ background: theme.button, color: theme.buttonText }}
      >
        {thankYou.button_text || "Create a typeform"}
      </span>
    </div>
  );
}
