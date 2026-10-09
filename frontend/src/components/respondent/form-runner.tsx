"use client";

import { AlertTriangle, ChevronDown, ChevronUp, CircleCheck } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import Link from "next/link";
import { useEffect } from "react";
import { AnswerField } from "@/components/questions/answers/answer-field";
import { isTyping } from "@/components/questions/answers/types";
import { OkButton } from "@/components/questions/ok-button";
import { QuestionNumber } from "@/components/questions/question-number";
import { useFormRunner, type RunnerForm, type RunnerMode } from "@/hooks/use-form-runner";
import { withAlpha } from "@/lib/color";
import { getTheme, type Theme } from "@/lib/themes";
import type { Question } from "@/types/form";

interface FormRunnerProps {
  form: RunnerForm;
  mode: RunnerMode;
}

/** The conversational respondent experience: one full-screen question at a time. */
export function FormRunner({ form, mode }: FormRunnerProps) {
  const theme = getTheme(form.settings.theme);
  const runner = useFormRunner(form, mode);
  const reduceMotion = useReducedMotion();
  const { screen, current, next, previous } = runner;
  const total = form.questions.length;

  // Global keys when focus isn't in a text field: Enter / ↓ = next, ↑ = back.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (screen.kind === "thankyou" || e.metaKey || e.altKey) return;
      // Text fields keep their keys, except ↑/↓ in single-line inputs (they have no use there).
      // Long text and the dropdown combobox still use arrows to move the caret / highlight.
      const el = e.target as HTMLElement;
      const singleLine = el.tagName === "INPUT" && el.getAttribute("role") !== "combobox";
      if (isTyping(e) && !(singleLine && (e.key === "ArrowDown" || e.key === "ArrowUp"))) return;
      if (e.key === "Enter" || e.key === "ArrowDown") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        previous();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, previous, screen.kind]);

  // Timings measured on Typeform: the old question shoots ~150px away and is gone in ~0.15s,
  // then the next one settles the last ~40px while fading in. Reduced motion: fade only.
  const motionScale = reduceMotion ? 0 : 1;
  const variants: Variants = {
    enter: (dir: number) => ({ opacity: 0, y: dir * 40 * motionScale }),
    center: { opacity: 1, y: 0, transition: { duration: reduceMotion ? 0.15 : 0.5, ease: [0.22, 1, 0.36, 1] } },
    exit: (dir: number) => ({
      opacity: 0,
      y: -dir * 150 * motionScale,
      transition: { y: { duration: 0.3, ease: [0.33, 1, 0.68, 1] }, opacity: { duration: 0.15, ease: "easeOut" } },
    }),
  };
  const key = screen.kind === "question" ? current!.id : screen.kind;
  const progress = total ? runner.answeredCount / total : 0;

  return (
    <div
      className="relative flex h-dvh flex-col overflow-hidden"
      style={{ background: theme.background, fontFamily: theme.font }}
    >
      {/* Progress: thin bar along the top. */}
      {screen.kind !== "thankyou" && total > 0 && (
        <div
          className="absolute inset-x-0 top-0 z-10 h-1"
          style={{ background: withAlpha(theme.answer, 0.15) }}
          role="progressbar"
          aria-label="Form progress"
          aria-valuenow={runner.answeredCount}
          aria-valuemin={0}
          aria-valuemax={total}
        >
          <div
            className="h-full transition-[width] duration-500 ease-out"
            style={{ width: `${progress * 100}%`, background: theme.answer }}
          />
        </div>
      )}

      <AnimatePresence mode="wait" custom={runner.direction} initial={false}>
        <motion.main
          key={key}
          custom={runner.direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          className="flex min-h-0 flex-1 overflow-y-auto"
        >
          <div className="m-auto w-full max-w-[720px] px-6 py-16 sm:px-10">
            {screen.kind === "welcome" && <WelcomeScreen form={form} theme={theme} onStart={next} />}
            {screen.kind === "question" && current && (
              <QuestionScreen
                question={current}
                number={runner.index + 1}
                theme={theme}
                value={runner.answers[current.id]}
                error={runner.errors[current.id]}
                onChange={(v) => runner.setAnswer(current.id, v)}
                onSubmit={next}
                onCommit={runner.commit}
                upload={current.type === "file_upload" ? runner.uploadFor(current.id) : undefined}
                okLabel={runner.isLast ? "Submit" : "OK"}
                submitting={runner.submitting}
                submitError={runner.isLast ? runner.submitError : null}
              />
            )}
            {screen.kind === "thankyou" && (
              <ThankYouScreen
                form={form}
                theme={theme}
                onRestart={mode.kind === "preview" ? runner.restart : undefined}
              />
            )}
          </div>
        </motion.main>
      </AnimatePresence>

      {screen.kind === "question" && (
        <footer className="pointer-events-none absolute right-4 bottom-4 flex items-center gap-2 sm:right-6 sm:bottom-6">
          {/* Progress for screen readers; sighted users get the bar along the top. */}
          <span className="sr-only">
            {runner.answeredCount} of {total} answered
          </span>
          <div className="pointer-events-auto flex gap-px">
            {[
              { label: "Previous question", icon: ChevronUp, onClick: previous, disabled: !runner.canGoBack },
              { label: "Next question", icon: ChevronDown, onClick: next, disabled: false },
            ].map(({ label, icon: Icon, onClick, disabled }, i) => (
              <button
                key={label}
                onClick={onClick}
                disabled={disabled}
                aria-label={label}
                className={`p-1.5 transition-opacity hover:opacity-80 disabled:opacity-40 ${i === 0 ? "rounded-l-md" : "rounded-r-md"}`}
                style={{ background: withAlpha(theme.answer, 0.12), color: theme.answer }}
              >
                <Icon size={20} />
              </button>
            ))}
          </div>
          <PoweredBy />
        </footer>
      )}
    </div>
  );
}

interface QuestionScreenProps {
  question: Question;
  number: number;
  theme: Theme;
  value: Parameters<typeof AnswerField>[0]["value"];
  error?: string;
  onChange: Parameters<typeof AnswerField>[0]["onChange"];
  onSubmit: () => void;
  onCommit: () => void;
  okLabel: string;
  submitting: boolean;
  submitError: string | null;
  upload?: Parameters<typeof AnswerField>[0]["upload"];
}

function QuestionScreen({
  question,
  number,
  theme,
  value,
  error,
  onChange,
  onSubmit,
  onCommit,
  okLabel,
  submitting,
  submitError,
  upload,
}: QuestionScreenProps) {
  const headingId = `q-${question.id}`;
  return (
    <section aria-labelledby={headingId} className="flex gap-2 sm:gap-3">
      <QuestionNumber number={number} theme={theme} />
      <div className="min-w-0 flex-1">
        <h1 id={headingId} className="text-xl leading-snug sm:text-2xl" style={{ color: theme.question }}>
          {question.title}
          {question.required && <span aria-label="required"> *</span>}
        </h1>
        {question.description && (
          <p
            className="mt-2 text-base leading-snug whitespace-pre-line sm:text-lg"
            style={{ color: withAlpha(theme.question, 0.7) }}
          >
            {question.description}
          </p>
        )}
        <div className="mt-8">
          <AnswerField
            question={question}
            value={value}
            onChange={onChange}
            theme={theme}
            active
            onSubmit={onSubmit}
            onCommit={onCommit}
            upload={upload}
          />
        </div>

        <div aria-live="assertive">
          {(error || submitError) && (
            <p className="mt-4 inline-flex items-center gap-2 rounded-[4px] bg-[#F7E6E6] px-2.5 py-1.5 text-sm text-[#AF0404]">
              <AlertTriangle size={16} /> {error ?? submitError}
            </p>
          )}
        </div>

        {!error && (
          <OkButton
            theme={theme}
            label={submitting ? "Submitting…" : okLabel}
            onClick={onSubmit}
            disabled={submitting}
            showCheck={okLabel === "OK"}
          />
        )}
      </div>
    </section>
  );
}

function WelcomeScreen({ form, theme, onStart }: { form: RunnerForm; theme: Theme; onStart: () => void }) {
  const w = form.settings.welcome;
  return (
    <div className="text-center">
      <h1 className="text-2xl leading-snug sm:text-3xl" style={{ color: theme.question }}>
        {w.title || form.title}
      </h1>
      {w.description && (
        <p className="mt-3 text-lg" style={{ color: withAlpha(theme.question, 0.7) }}>
          {w.description}
        </p>
      )}
      <div className="flex justify-center">
        <OkButton theme={theme} label={w.button_text || "Start"} onClick={onStart} showCheck={false} />
      </div>
    </div>
  );
}

function ThankYouScreen({ form, theme, onRestart }: { form: RunnerForm; theme: Theme; onRestart?: () => void }) {
  const t = form.settings.thank_you;
  return (
    <>
      <div className="text-center">
        <CircleCheck
          className="mx-auto mb-6 h-20 w-20"
          strokeWidth={1.25}
          style={{ color: theme.question }}
          aria-hidden
        />
        <h1 className="text-2xl leading-snug sm:text-3xl" style={{ color: theme.question }}>
          {t.title || "Thanks for completing this typeform"}
        </h1>
        {t.description && (
          <p className="mt-3 text-lg whitespace-pre-line" style={{ color: withAlpha(theme.question, 0.7) }}>
            {t.description}
          </p>
        )}
        {onRestart && (
          <button
            onClick={onRestart}
            className="mt-8 rounded-md px-5 py-2.5 text-lg font-semibold"
            style={{ background: theme.button, color: theme.buttonText }}
          >
            Restart preview
          </button>
        )}
      </div>
      {/* Typeform-style footer bar on the ending screen. */}
      <div
        className="fixed inset-x-0 bottom-0 flex items-center justify-end gap-3 px-4 py-3 text-sm sm:px-6"
        style={{ background: withAlpha(theme.question, 0.06), color: theme.question }}
      >
        How you ask is everything
        <Link
          href="/forms/new"
          className="rounded-md px-2.5 py-1 text-xs font-semibold"
          style={{ background: theme.button, color: theme.buttonText }}
        >
          {t.button_text || "Create a typeform"}
        </Link>
      </div>
    </>
  );
}

function PoweredBy() {
  return (
    <a
      href="/workspace"
      className="pointer-events-auto hidden items-center gap-1 rounded-md bg-[#29232B] px-2.5 py-1.5 text-xs text-white sm:flex"
    >
      Powered by <strong className="font-semibold">Typeform</strong>
    </a>
  );
}
