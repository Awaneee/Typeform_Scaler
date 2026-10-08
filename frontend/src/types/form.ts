// Mirrors backend/app/schemas. Keep in sync when the API changes.

export const QUESTION_TYPES = [
  "short_text",
  "long_text",
  "multiple_choice",
  "dropdown",
  "email",
  "number",
  "yes_no",
  "rating",
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export type ThemeName = "classic" | "lavender" | "ocean" | "midnight";
export type FormStatus = "draft" | "published";

export interface Option {
  id: string;
  label: string;
}

export interface QuestionSettings {
  placeholder?: string;
  max_length?: number;
  min?: number;
  max?: number;
  allow_multiple?: boolean;
  steps?: number;
  shape?: "star";
}

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  description: string;
  required: boolean;
  settings: QuestionSettings;
  options: Option[];
}

export interface FormSettings {
  theme: ThemeName;
  welcome: { enabled: boolean; title: string; description: string; button_text: string };
  thank_you: { title: string; description: string; button_text: string };
}

export interface FormSummary {
  id: string;
  title: string;
  status: FormStatus;
  slug: string | null;
  response_count: number;
  question_count: number;
  has_unpublished_changes: boolean;
  theme: ThemeName;
  created_at: string;
  updated_at: string;
}

export interface FormDetail {
  id: string;
  title: string;
  status: FormStatus;
  slug: string | null;
  revision: number;
  settings: FormSettings;
  questions: Question[];
  published_version_number: number | null;
  published_at: string | null;
  has_unpublished_changes: boolean;
  response_count: number;
  created_at: string;
  updated_at: string;
}

export interface DraftSaved {
  revision: number;
  updated_at: string;
  has_unpublished_changes: boolean;
}

export type FormSort = "updated" | "created" | "title" | "responses";

export interface Me {
  id: string;
  name: string;
  email: string;
  workspaces: { id: string; name: string; form_count: number }[];
  response_count: number;
}

export interface PublicForm {
  slug: string;
  title: string;
  version_number: number;
  settings: FormSettings;
  questions: Question[];
}

/** Raw answer values, keyed by question id. */
export type AnswerValue = string | number | boolean | string[] | null;
export type Answers = Record<string, AnswerValue>;
