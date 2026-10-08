"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { publicApi } from "@/lib/api/public";
import { nextIndex, routingValue, visitedPath } from "@/lib/logic";
import { isEmptyAnswer, toPayload, validateAnswer } from "@/lib/validation";
import type { UploadedFile } from "@/components/questions/answers/file-answer";
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
export function useFormRunner(form: RunnerForm, modeProp: RunnerMode) {
  const { questions } = form;
  // Callers pass a fresh object each render; key it by value so effects run once per form.
  const slug = modeProp.kind === "live" ? modeProp.slug : null;
  const mode = useMemo<RunnerMode>(() => (slug ? { kind: "live", slug } : { kind: "preview" }), [slug]);
  const [screen, setScreen] = useState<Screen>(
    form.settings.welcome.enabled ? { kind: "welcome" } : questions.length ? { kind: "question", index: 0 } : { kind: "thankyou" },
  );
  const [direction, setDirection] = useState<1 | -1>(1);
  // Indexes visited before the current one, so "back" retraces the path logic jumps took.
  const [history, setHistory] = useState<number[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Uploaded files per question (the answer value itself is just the upload id).
  const [files, setFiles] = useState<Record<string, UploadedFile>>({});

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

  /** Jump back to a question that needs fixing, trimming the back-history to that point. */
  const jumpTo = useCallback(
    (target: number) => {
      setHistory((h) => (h.includes(target) ? h.slice(0, h.indexOf(target)) : h));
      go({ kind: "question", index: target }, target < index ? -1 : 1);
    },
    [go, index],
  );

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
    // Re-check every question on the respondent's path (logic may have skipped some).
    const path = visitedPath(questions, answers);
    const onPath = questions.filter((q) => path.has(q.id));
    const all: Record<string, string> = {};
    for (const q of onPath) {
      const err = validateAnswer(q, answers[q.id]);
      if (err) all[q.id] = err;
    }
    const firstBad = questions.findIndex((q) => all[q.id]);
    if (firstBad !== -1) {
      setErrors(all);
      jumpTo(firstBad);
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
        answers: toPayload(onPath, answers),
      });
      go({ kind: "thankyou" }, 1);
    } catch (e) {
      if (e instanceof ApiError && e.status === 422 && e.fields) {
        // Server found something the client missed: show it on the right question.
        setErrors(e.fields);
        const bad = questions.findIndex((q) => e.fields?.[q.id]);
        if (bad !== -1) jumpTo(bad);
        else setSubmitError(e.message);
      } else {
        // Answers stay in state, so the respondent can simply try again.
        setSubmitError(e instanceof ApiError ? e.message : "Couldn't submit. Check your connection and try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }, [answers, go, jumpTo, mode, questions]);

  /** OK / Enter / ↓ : validate the current question, then move on (or submit on the last one). */
  const next = useCallback(() => {
    if (screen.kind === "welcome") return go(questions.length ? { kind: "question", index: 0 } : { kind: "thankyou" }, 1);
    if (!current || submitting) return;
    const err = validateAnswer(current, answers[current.id]);
    if (err) {
      setErrors((e) => ({ ...e, [current.id]: err }));
      return;
    }
    const target = nextIndex(questions, index, routingValue(questions, answers, current));
    if (target === null) void submit();
    else {
      setHistory((h) => [...h, index]);
      go({ kind: "question", index: target }, 1);
    }
  }, [answers, current, go, index, questions, screen.kind, submit, submitting]);

  const previous = useCallback(() => {
    if (history.length) {
      go({ kind: "question", index: history[history.length - 1] }, -1);
      setHistory((h) => h.slice(0, -1));
    } else if (index === 0 && form.settings.welcome.enabled) go({ kind: "welcome" }, -1);
  }, [form.settings.welcome.enabled, go, history, index]);

  /** Single-choice style answers advance on their own after a short pause, like Typeform. */
  const commit = useCallback(() => {
    clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => nextRef.current(), AUTO_ADVANCE_MS);
  }, []);
  const nextRef = useRef(next);
  useEffect(() => {
    nextRef.current = next;
  }, [next]);

  /** Upload controls for a file question. Preview mode keeps the file local and never uploads. */
  const uploadFor = useCallback(
    (questionId: string) => ({
      current: files[questionId],
      send: async (file: File) => {
        const uploaded =
          mode.kind === "live"
            ? await publicApi.upload(mode.slug, questionId, file)
            : { id: crypto.randomUUID(), filename: file.name, size_bytes: file.size };
        setFiles((f) => ({ ...f, [questionId]: uploaded }));
        setAnswer(questionId, uploaded.id);
      },
      clear: () => {
        setFiles((f) => {
          const rest = { ...f };
          delete rest[questionId];
          return rest;
        });
        setAnswer(questionId, null);
      },
    }),
    [files, mode, setAnswer],
  );

  const restart = useCallback(() => {
    submissionId.current = crypto.randomUUID();
    setAnswers({});
    setErrors({});
    setHistory([]);
    setFiles({});
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
    // "Submit" whenever OK would end the form (last question, or a jump to the end).
    isLast: !!current && nextIndex(questions, index, routingValue(questions, answers, current)) === null,
    canGoBack: history.length > 0 || (index === 0 && form.settings.welcome.enabled),
    setAnswer,
    uploadFor,
    next,
    previous,
    commit,
    restart,
  };
}
