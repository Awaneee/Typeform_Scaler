import type { Theme } from "@/lib/themes";
import type { AnswerValue, Question } from "@/types/form";

export interface AnswerProps {
  question: Question;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
  theme: Theme;
  /** Builder canvas: show the respondent's look but don't accept input. */
  preview?: boolean;
  /** This question is the one on screen (enables focus and keyboard shortcuts). */
  active?: boolean;
  /** Enter pressed in a text answer. */
  onSubmit?: () => void;
  /** A selection finished (single choice, yes/no, rating, dropdown) — the flow may auto-advance. */
  onCommit?: () => void;
}

/** Letter key shown next to each choice: A, B, C... */
export const choiceKey = (index: number) => String.fromCharCode(65 + index);

/** True when a keyboard event comes from a text field (so global shortcuts must not fire). */
export const isTyping = (e: KeyboardEvent) => {
  const el = e.target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
};
