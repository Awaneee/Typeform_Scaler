"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { buttonStyles } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/client";
import { formsApi } from "@/lib/api/forms";
import { resultsApi } from "@/lib/api/results";
import { cn } from "@/lib/utils";
import type { FormDetail } from "@/types/form";
import type { FormAnalytics, SubmissionPage } from "@/types/results";
import { ResponseDrawer } from "./response-drawer";
import { ResponsesTab } from "./responses-tab";
import { ResultsTopBar } from "./results-top-bar";
import { SummaryTab } from "./summary-tab";

type Tab = "summary" | "responses";
const PAGE_SIZE = 25;
const message = (e: unknown) => (e instanceof ApiError ? e.message : "Couldn't load results.");

export function ResultsView({ formId }: { formId: string }) {
  const [form, setForm] = useState<FormDetail | null>(null);
  const [analytics, setAnalytics] = useState<FormAnalytics | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionPage | null>(null);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<Tab>("summary");
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([formsApi.get(formId), resultsApi.analytics(formId)]).then(([f, a]) => {
      setForm(f);
      setAnalytics(a);
    }, (e) => setError(message(e)));
  }, [formId]);

  useEffect(() => {
    let cancelled = false;
    resultsApi.submissions(formId, page, PAGE_SIZE).then((p) => !cancelled && setSubmissions(p), (e) => !cancelled && setError(message(e)));
    return () => {
      cancelled = true;
    };
  }, [formId, page]);

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <ResultsTopBar formId={formId} title={form?.title ?? ""} />
      <div className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <nav className="flex gap-6" aria-label="Results views">
            {(["summary", "responses"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                aria-current={tab === t ? "page" : undefined}
                className={cn(
                  "-mb-px border-b-2 py-3 text-sm font-medium capitalize",
                  tab === t ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink",
                )}
              >
                {t}
                {t === "responses" && submissions && <span className="ml-1.5 rounded-full bg-selected px-1.5 text-xs tabular-nums">{submissions.total}</span>}
              </button>
            ))}
          </nav>
          <a href={resultsApi.csvUrl(formId)} download className={buttonStyles({ variant: "secondary", size: "sm" })}>
            <Download size={15} /> Download CSV
          </a>
        </div>
      </div>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
        {error ? (
          <p className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger">{error}</p>
        ) : tab === "summary" ? (
          analytics ? <SummaryTab data={analytics} /> : <LoadingBlocks />
        ) : submissions ? (
          <ResponsesTab page={submissions} onPage={setPage} onOpen={setOpenId} />
        ) : (
          <LoadingBlocks />
        )}
      </main>

      <ResponseDrawer formId={formId} submissionId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

function LoadingBlocks() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading results">
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-56 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}
