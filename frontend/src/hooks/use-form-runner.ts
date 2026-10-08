"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { publicApi } from "@/lib/api/public";
import { isEmptyAnswer, toPayload, validateAnswer } from "@/lib/validation";
import type { AnswerValue, Answers, FormSettings, Question } from "@/types/form";

export interface RunnerForm {
  title: string;
  settings: FormSettings;
  questions: Question[];
}

/** "live" submits to the API; "preview" runs the same flow but never saves anything. */
export type RunnerMode = { kind: "live"; slug: string } | { kind: "preview" };

export type Screen = { kind: "welcome" } | { kind: "question"; index: number } | { kind: "thankyou" };

const AUTO_ADVANCE_MS = 350;

/** All respondent-flow logic: navigation, validation, auto-advance, submission, session tracking. */
export function useFormRunner(form: RunnerForm, mode: RunnerMode) {
  const { questions } = form;
  const [screen, setScreen] = useState<Screen>(
    form.settings.welcome.enabled ? { kind: "welcome" } : questions.length ? { kind: "question", index: 0 } : { kind: "thankyou" },
  );
  const [direction, setDirection] = useState<1 | -1>(1);
  const [answers, setAnswers] = useState<Answers>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // One id per fill: a retried or double-clicked submit is recognised by the server.
  const submissionId = useRef(crypto.randomUUID());
  const sessionId = useRef(crypto.randomUUID());
  const started = useRef(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (mode.kind === "live") publicApi.trackSession(mode.slug, sessionId.current, "view").catch(() => {});
    return () => clearTimeout(advanceTimer.current);
  }, [mode]);

  const index = screen.kind === "question" ? screen.index : -1;
  const current = index >= 0 ? questions[index] : undefined;
  const answeredCount = questions.filter((q) => !isEmptyAnswer(answers[q.id])).length;

  const go = useCallback((next: Screen, dir: 1 | -1) => {
    clearTimeout(advanceTimer.current);
    setDirection(dir);
    setScreen(next);
  }, []);

  const setAnswer = useCallback(
    (questionId: string, value: AnswerValue) => {
      setAnswers((a) => ({ ...a, [questionId]: value }));
      setErrors((e) => {
        const rest = { ...e };
        delete rest[questionId];
        return rest;
      });
      setSubmitError(null);
      if (!started.current && mode.kind === "live") {
        started.current = true;
        publicApi.trackSession(mode.slug, sessionId.current, "start").catch(() => {});
      }
    },
    [mode],
  );

  const submit = useCallback(async () => {
    // Re-check everything (a respondent can skip ahead with the arrows).
    const all: Record<string, string> = {};
    for (const q of questions) {
      const err = validateAnswer(q, answers[q.id]);
      if (err) all[q.id] = err;
    }
    const firstBad = questions.findIndex((q) => all[q.id]);
    if (firstBad !== -1) {
      setErrors(all);
      go({ kind: "question", index: firstBad }, firstBad < index ? -1 : 1);
      return;
    }

    if (mode.kind === "preview") {
      go({ kind: "thankyou" }, 1);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      await publicApi.submit(mode.slug, {
        client_submission_id: submissionId.current,
        client_session_id: sessionId.current,
        answers: toPayload(questions, answers),
      });
      go({ kind: "thankyou" }, 1);
    } catch (e) {
      if (e instanceof ApiError && e.status === 422 && e.fields) {
        // Server found something the client missed: show it on the right question.
        setErrors(e.fields);
        const bad = questions.findIndex((q) => e.fields?.[q.id]);
        if (bad !== -1) go({ kind: "question", index: bad }, bad < index ? -1 : 1);
        else setSubmitError(e.message);
      } else {
        // Answers stay in state, so the respondent can simply try again.
        setSubmitError(e instanceof ApiError ? e.message : "Couldn't submit. Check your connection and try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }, [answers, go, index, mode, questions]);

  /** OK / Enter / ↓ : validate the current question, then move on (or submit on the last one). */
  const next = useCallback(() => {
    if (screen.kind === "welcome") return go(questions.length ? { kind: "question", index: 0 } : { kind: "thankyou" }, 1);
    if (!current || submitting) return;
    const err = validateAnswer(current, answers[current.id]);
    if (err) {
      setErrors((e) => ({ ...e, [current.id]: err }));
      return;
    }
    if (index === questions.length - 1) void submit();
    else go({ kind: "question", index: index + 1 }, 1);
  }, [answers, current, go, index, questions.length, screen.kind, submit, submitting]);

  const previous = useCallback(() => {
    if (index > 0) go({ kind: "question", index: index - 1 }, -1);
    else if (index === 0 && form.settings.welcome.enabled) go({ kind: "welcome" }, -1);
  }, [form.settings.welcome.enabled, go, index]);

  /** Single-choice style answers advance on their own after a short pause, like Typeform. */
  const commit = useCallback(() => {
    clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => nextRef.current(), AUTO_ADVANCE_MS);
  }, []);
  const nextRef = useRef(next);
  useEffect(() => {
    nextRef.current = next;
  }, [next]);

  const restart = useCallback(() => {
    submissionId.current = crypto.randomUUID();
    setAnswers({});
    setErrors({});
    go(form.settings.welcome.enabled ? { kind: "welcome" } : { kind: "question", index: 0 }, -1);
  }, [form.settings.welcome.enabled, go]);

  return {
    screen,
    direction,
    current,
    index,
    answers,
    errors,
    answeredCount,
    submitting,
    submitError,
    isLast: index === questions.length - 1,
    canGoBack: index > 0 || (index === 0 && form.settings.welcome.enabled),
    setAnswer,
    next,
    previous,
    commit,
    restart,
  };
}
