"use client";

import { ArrowRight, GitBranch, Plus, X } from "lucide-react";
import { QuestionTypeBadge } from "@/components/questions/question-icon";
import { LOGIC_OPS } from "@/components/questions/registry";
import { cn } from "@/lib/utils";
import { useBuilder } from "@/store/builder-store";
import type { LogicOp, LogicRule, Question } from "@/types/form";

const OP_LABELS: Record<LogicOp, string> = { is: "is", is_not: "is not", gt: "is greater than", lt: "is lower than" };

const selectClass =
  "h-9 min-w-0 rounded-lg border border-line bg-surface px-2 text-sm outline-none focus:border-plum focus:ring-1 focus:ring-plum";

/** Workflow tab: "If <answer> <op> <value> then go to <question / end>" rules per question. */
export function LogicEditor() {
  const questions = useBuilder((s) => s.questions);
  const errors = useBuilder((s) => s.publishErrors);
  const withLogic = questions.filter((q) => LOGIC_OPS[q.type]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <GitBranch size={18} /> Logic
          </h2>
          <p className="text-muted mt-1 text-sm">
            Send people to different questions based on their answers. Rules are checked top to bottom; jumps can only
            go forward. Without a matching rule, people continue to the next question.
          </p>
        </div>
        {withLogic.length === 0 ? (
          <p className="border-line bg-surface text-muted rounded-xl border border-dashed p-8 text-center text-sm">
            Add a multiple choice, dropdown, yes/no, rating or number question to use logic jumps.
          </p>
        ) : (
          withLogic.map((q) => <QuestionLogic key={q.id} question={q} questions={questions} error={errors[q.id]} />)
        )}
      </div>
    </div>
  );
}

function defaultValue(q: Question): LogicRule["value"] {
  if (q.type === "yes_no") return true;
  if (q.type === "rating" || q.type === "number") return q.type === "rating" ? 3 : 0;
  return q.options[0]?.id ?? "";
}

function QuestionLogic({ question, questions, error }: { question: Question; questions: Question[]; error?: string }) {
  const setLogic = useBuilder((s) => s.setLogic);
  const index = questions.findIndex((q) => q.id === question.id);
  const later = questions.slice(index + 1);
  const ops = LOGIC_OPS[question.type] ?? [];
  const rules = question.logic;
  const update = (i: number, patch: Partial<LogicRule>) =>
    setLogic(
      question.id,
      rules.map((r, j) => (j === i ? { ...r, ...patch } : r)),
    );
  const nextTitle = later[0] ? `${index + 2}. ${later[0].title || "Untitled"}` : "End of form";

  return (
    <section className={cn("bg-surface rounded-xl border p-5", error ? "border-danger" : "border-line")}>
      <div className="mb-4 flex items-center gap-2.5">
        <QuestionTypeBadge type={question.type} number={index + 1} />
        <h3 className="truncate font-medium">{question.title || "Untitled question"}</h3>
      </div>
      {error && <p className="text-danger mb-3 text-sm">{error}</p>}

      <ul className="space-y-2">
        {rules.map((rule, i) => (
          <li key={i} className="bg-bg flex flex-wrap items-center gap-2 rounded-lg p-2 text-sm">
            <span className="px-1 font-medium">If answer</span>
            <select
              aria-label="Condition"
              value={rule.op}
              onChange={(e) => update(i, { op: e.target.value as LogicOp })}
              className={selectClass}
            >
              {ops.map((op) => (
                <option key={op} value={op}>
                  {OP_LABELS[op]}
                </option>
              ))}
            </select>
            <ValueInput question={question} value={rule.value} onChange={(value) => update(i, { value })} />
            <ArrowRight size={16} className="text-muted" />
            <select
              aria-label="Go to"
              value={rule.goto}
              onChange={(e) => update(i, { goto: e.target.value })}
              className={cn(selectClass, "max-w-56")}
            >
              {later.map((q, j) => (
                <option key={q.id} value={q.id}>
                  {index + j + 2}. {q.title || "Untitled"}
                </option>
              ))}
              <option value="end">End of form</option>
            </select>
            <button
              onClick={() =>
                setLogic(
                  question.id,
                  rules.filter((_, j) => j !== i),
                )
              }
              className="text-muted hover:bg-selected hover:text-ink ml-auto rounded p-1.5"
              aria-label="Remove rule"
            >
              <X size={15} />
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <button
          onClick={() =>
            setLogic(question.id, [
              ...rules,
              { op: ops[0], value: defaultValue(question), goto: later[0]?.id ?? "end" },
            ])
          }
          className="text-teal flex items-center gap-1 font-medium hover:underline"
        >
          <Plus size={15} /> Add rule
        </button>
        <span className="text-muted">
          All other cases go to <strong className="text-ink font-medium">{nextTitle}</strong>
        </span>
      </div>
    </section>
  );
}

function ValueInput({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: LogicRule["value"];
  onChange: (v: LogicRule["value"]) => void;
}) {
  if (question.type === "yes_no") {
    return (
      <select
        aria-label="Value"
        value={String(value)}
        onChange={(e) => onChange(e.target.value === "true")}
        className={selectClass}
      >
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  }
  if (question.type === "rating" || question.type === "number") {
    return (
      <input
        type="number"
        aria-label="Value"
        value={typeof value === "number" ? value : 0}
        min={question.type === "rating" ? 1 : undefined}
        max={question.type === "rating" ? (question.settings.steps ?? 5) : undefined}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(selectClass, "w-20")}
      />
    );
  }
  return (
    <select
      aria-label="Value"
      value={String(value)}
      onChange={(e) => onChange(e.target.value)}
      className={cn(selectClass, "max-w-48")}
    >
      {question.options.map((o, i) => (
        <option key={o.id} value={o.id}>
          {o.label || `Choice ${i + 1}`}
        </option>
      ))}
    </select>
  );
}
