import type { FormAnalytics, PartialPage, SubmissionDetail, SubmissionPage } from "@/types/results";
import { request } from "./client";

export const resultsApi = {
  submissions: (formId: string, page = 1, pageSize = 25) =>
    request<SubmissionPage>(`/forms/${formId}/submissions?page=${page}&page_size=${pageSize}`),
  partials: (formId: string, page = 1, pageSize = 25) =>
    request<PartialPage>(`/forms/${formId}/partials?page=${page}&page_size=${pageSize}`),
  submission: (formId: string, submissionId: string) =>
    request<SubmissionDetail>(`/forms/${formId}/submissions/${submissionId}`),
  analytics: (formId: string) => request<FormAnalytics>(`/forms/${formId}/analytics`),
  csvUrl: (formId: string) => `/api/v1/forms/${formId}/export.csv`,
};
