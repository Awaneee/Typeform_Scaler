import type { AnswerValue, Answers, LogicRule, Question } from "@/types/form";
import { toPayload } from "./validation";

/** Logic jumps. Same algorithm as backend/app/validators/logic.py:
 *  first matching rule wins, jumps only go forward, otherwise go to the next question. */

export function ruleMatches(q: Question, rule: LogicRule, value: AnswerValue | undefined): boolean {
  if (value === null || value === undefined) return false;
  if (q.type === "multiple_choice") {
    const hit = Array.isArray(value) && value.includes(rule.value as string);
    return rule.op === "is" ? hit : !hit;
  }
  if (rule.op === "gt" || rule.op === "lt") {
    if (typeof value !== "number" || typeof rule.value !== "number") return false;
    return rule.op === "gt" ? value > rule.value : value < rule.value;
  }
  const equal = value === rule.value;
  return rule.op === "is" ? equal : !equal;
}

/** Index of the next question, or null when the form should end. */
export function nextIndex(questions: Question[], index: number, value: AnswerValue | undefined): number | null {
  const q = questions[index];
  for (const rule of q.logic ?? []) {
    if (!ruleMatches(q, rule, value)) continue;
    if (rule.goto === "end") return null;
    const target = questions.findIndex((x) => x.id === rule.goto);
    if (target > index) return target;
  }
  return index + 1 < questions.length ? index + 1 : null;
}

/** Answers as the server will see them (numbers parsed), for routing decisions. */
export function routingValue(questions: Question[], answers: Answers, q: Question): AnswerValue | undefined {
  return toPayload([q], answers)[q.id];
}

/** Ids of the questions on the respondent's current path (what will be validated and submitted). */
export function visitedPath(questions: Question[], answers: Answers): Set<string> {
  const path = new Set<string>();
  let i: number | null = questions.length ? 0 : null;
  while (i !== null) {
    const q = questions[i];
    path.add(q.id);
    i = nextIndex(questions, i, routingValue(questions, answers, q));
  }
  return path;
}
