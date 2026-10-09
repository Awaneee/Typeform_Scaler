import type { AnswerValue, Answers, Question } from "@/types/form";

/** Client-side answer checks. They mirror backend/app/validators/answers.py so respondents
 *  get instant feedback; the server repeats every check and stays authoritative. */

// Same idea as the backend's format check: something@domain.tld, no spaces.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isEmptyAnswer(value: AnswerValue | undefined) {
  return (
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.trim() === "") ||
    (Array.isArray(value) && value.length === 0)
  );
}

/** Returns an error message, or null when the answer is acceptable. */
export function validateAnswer(q: Question, value: AnswerValue | undefined): string | null {
  if (isEmptyAnswer(value)) return q.required ? "Please fill this in." : null;
  const s = q.settings;

  switch (q.type) {
    case "short_text":
    case "long_text": {
      const text = String(value).trim();
      return s.max_length && text.length > s.max_length ? `Must be at most ${s.max_length} characters.` : null;
    }
    case "email":
      return EMAIL_RE.test(String(value).trim()) ? null : "Hmm... that email doesn't look right.";
    case "number": {
      const n = toNumber(value);
      if (n === null) return "Numbers only please.";
      if (s.min !== undefined && n < s.min) return `Must be at least ${s.min}.`;
      if (s.max !== undefined && n > s.max) return `Must be at most ${s.max}.`;
      return null;
    }
    case "multiple_choice": {
      const ids = value as string[];
      if (!ids.every((id) => q.options.some((o) => o.id === id))) return "Unknown choice.";
      return ids.length > 1 && !s.allow_multiple ? "Only one choice is allowed." : null;
    }
    case "dropdown":
      return q.options.some((o) => o.id === value) ? null : "Please select an option from the list.";
    case "yes_no":
      return typeof value === "boolean" ? null : "Please choose yes or no.";
    case "file_upload":
      return typeof value === "string" ? null : "Please upload a file.";
    case "rating": {
      const steps = s.steps ?? 5;
      return typeof value === "number" && value >= 1 && value <= steps
        ? null
        : `Rating must be between 1 and ${steps}.`;
    }
  }
}

function toNumber(value: AnswerValue | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const text = value.trim().replace(",", ".");
  if (!/^[-+]?\d*\.?\d+(e[-+]?\d+)?$/i.test(text)) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

/** Converts what the inputs hold into the API payload (numbers as numbers, blanks dropped). */
export function toPayload(questions: Question[], answers: Answers): Answers {
  const payload: Answers = {};
  for (const q of questions) {
    const value = answers[q.id];
    if (isEmptyAnswer(value)) continue;
    if (q.type === "number") payload[q.id] = toNumber(value);
    else if (typeof value === "string") payload[q.id] = value.trim();
    else payload[q.id] = value;
  }
  return payload;
}
