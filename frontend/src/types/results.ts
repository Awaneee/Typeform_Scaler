export interface ResultColumn {
  id: string;
  title: string;
  type: string;
  removed: boolean;
}

export interface SubmissionRow {
  id: string;
  number: number;
  submitted_at: string;
  version_number: number;
  answers: Record<string, string>;
}

export interface SubmissionPage {
  columns: ResultColumn[];
  items: SubmissionRow[];
  total: number;
  page: number;
  page_size: number;
}

export interface PartialRow {
  id: string;
  started_at: string;
  last_activity_at: string;
  version_number: number;
  answered: number;
  answers: Record<string, string>;
}

export interface PartialPage {
  columns: ResultColumn[];
  items: PartialRow[];
  total: number;
  page: number;
  page_size: number;
}

export interface SubmissionDetail {
  id: string;
  number: number;
  submitted_at: string;
  version_number: number;
  answers: {
    question_id: string;
    title: string;
    type: string;
    value: unknown;
    display: string | null;
    file_url: string | null;
  }[];
}

export interface ChoiceCount {
  label: string;
  count: number;
  percent: number;
}

export interface QuestionAnalytics {
  question_id: string;
  title: string;
  type: string;
  removed: boolean;
  answered: number;
  skipped: number;
  kind: "choices" | "rating" | "number" | "text";
  choices: ChoiceCount[] | null;
  average: number | null;
  minimum: number | null;
  maximum: number | null;
  recent: string[] | null;
}

export interface FormAnalytics {
  views: number;
  starts: number;
  submissions: number;
  partials: number;
  completion_rate: number | null;
  avg_completion_seconds: number | null;
  daily: { date: string; count: number }[];
  questions: QuestionAnalytics[];
}
