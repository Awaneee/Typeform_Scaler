"use client";

import type { QuestionType } from "@/types/form";
import { MultipleChoiceAnswer, YesNoAnswer } from "./choice-answer";
import { DropdownAnswer } from "./dropdown-answer";
import { RatingAnswer } from "./rating-answer";
import { LongTextAnswer, TextAnswer } from "./text-answer";
import type { AnswerProps } from "./types";

const RENDERERS: Record<QuestionType, (props: AnswerProps) => React.ReactNode> = {
  short_text: TextAnswer,
  email: TextAnswer,
  number: TextAnswer,
  long_text: LongTextAnswer,
  multiple_choice: MultipleChoiceAnswer,
  dropdown: DropdownAnswer,
  yes_no: YesNoAnswer,
  rating: RatingAnswer,
};

/** Renders the answer control for any question type. Shared by the builder canvas and respondent flow. */
export function AnswerField(props: AnswerProps) {
  const Renderer = RENDERERS[props.question.type];
  return <Renderer {...props} />;
}
