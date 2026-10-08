import type { Answers, PublicForm } from "@/types/form";
import { request } from "./client";

export const publicApi = {
  getForm: (slug: string) => request<PublicForm>(`/public/forms/${encodeURIComponent(slug)}`),
  submit: (slug: string, body: { client_submission_id: string; client_session_id?: string; answers: Answers }) =>
    request<{ id: string; submitted_at: string }>(`/public/forms/${encodeURIComponent(slug)}/submissions`, {
      method: "POST",
      json: body,
    }),
  upload: (slug: string, questionId: string, file: File) => {
    const body = new FormData();
    body.append("question_id", questionId);
    body.append("file", file);
    return request<{ id: string; filename: string; size_bytes: number }>(
      `/public/forms/${encodeURIComponent(slug)}/uploads`,
      { method: "POST", body },
    );
  },
  trackSession: (slug: string, clientSessionId: string, event: "view" | "start") =>
    request<void>(`/public/forms/${encodeURIComponent(slug)}/sessions`, {
      method: "POST",
      json: { client_session_id: clientSessionId, event },
    }),
};
