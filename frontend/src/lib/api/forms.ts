import type { DraftSaved, FormDetail, FormSettings, FormSort, FormSummary, Me, Question } from "@/types/form";
import { request } from "./client";

export const formsApi = {
  me: () => request<Me>("/me"),
  list: (params: { q?: string; sort?: FormSort } = {}) => {
    const search = new URLSearchParams();
    if (params.q) search.set("q", params.q);
    if (params.sort) search.set("sort", params.sort);
    const qs = search.toString();
    return request<FormSummary[]>(`/forms${qs ? `?${qs}` : ""}`);
  },
  get: (id: string) => request<FormDetail>(`/forms/${id}`),
  create: (title?: string) => request<FormDetail>("/forms", { method: "POST", json: title ? { title } : {} }),
  rename: (id: string, title: string) => request<FormDetail>(`/forms/${id}`, { method: "PATCH", json: { title } }),
  remove: (id: string) => request<void>(`/forms/${id}`, { method: "DELETE" }),
  duplicate: (id: string) => request<FormDetail>(`/forms/${id}/duplicate`, { method: "POST" }),
  saveDraft: (
    id: string,
    draft: { revision: number; title: string; settings: FormSettings; questions: Question[] },
    signal?: AbortSignal,
  ) => request<DraftSaved>(`/forms/${id}/draft`, { method: "PUT", json: draft, signal }),
  publish: (id: string) => request<FormDetail>(`/forms/${id}/publish`, { method: "POST" }),
  unpublish: (id: string) => request<FormDetail>(`/forms/${id}/unpublish`, { method: "POST" }),
};
