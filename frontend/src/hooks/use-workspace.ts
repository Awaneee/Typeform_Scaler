"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { formsApi } from "@/lib/api/forms";
import { publicFormUrl } from "@/lib/format";
import type { FormSort, FormSummary, Me } from "@/types/form";
import { useDebouncedValue } from "./use-debounced-value";

const errorMessage = (e: unknown) => (e instanceof ApiError ? e.message : "Something went wrong.");

/** Workspace data (forms list + account info) and the actions that change it. */
export function useWorkspace() {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<FormSort>("updated");
  const [forms, setForms] = useState<FormSummary[] | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const debouncedQuery = useDebouncedValue(query.trim(), 250);

  useEffect(() => {
    let cancelled = false;
    Promise.all([formsApi.list({ q: debouncedQuery, sort }), formsApi.me()]).then(
      ([list, account]) => {
        if (cancelled) return;
        setForms(list);
        setMe(account);
        setError(null);
      },
      (e) => !cancelled && setError(errorMessage(e)),
    );
    // Ignore responses from superseded requests (e.g. fast typing in search).
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, sort, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  /** Runs an API call, toasts the outcome and refreshes the list. */
  const run = useCallback(
    async <T,>(action: () => Promise<T>, success: string): Promise<T | undefined> => {
      try {
        const result = await action();
        toast.success(success);
        reload();
        return result;
      } catch (e) {
        toast.error(errorMessage(e));
        return undefined;
      }
    },
    [reload],
  );

  const actions = {
    rename: (form: FormSummary, title: string) => run(() => formsApi.rename(form.id, title), "Form renamed"),
    duplicate: (form: FormSummary) => run(() => formsApi.duplicate(form.id), `"${form.title}" duplicated`),
    remove: (form: FormSummary) => run(() => formsApi.remove(form.id), "Form deleted"),
    publish: (form: FormSummary) => run(() => formsApi.publish(form.id), "Form published. It's live!"),
    unpublish: (form: FormSummary) =>
      run(() => formsApi.unpublish(form.id), "Form unpublished. It no longer accepts responses."),
    copyLink: async (form: FormSummary) => {
      if (!form.slug) return;
      try {
        await navigator.clipboard.writeText(publicFormUrl(form.slug));
        toast.success("Link copied to clipboard");
      } catch {
        toast.error("Couldn't access the clipboard.");
      }
    },
  };

  return { forms, me, error, query, setQuery, sort, setSort, reload, actions };
}

export type WorkspaceActions = ReturnType<typeof useWorkspace>["actions"];
