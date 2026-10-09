"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { buttonStyles } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/client";
import { formsApi } from "@/lib/api/forms";
import { resultsApi } from "@/lib/api/results";
import { cn } from "@/lib/utils";
import type { FormDetail } from "@/types/form";
import type { FormAnalytics, PartialPage, SubmissionPage } from "@/types/results";
import { PartialsTable } from "./partials-table";
import { ResponseDrawer } from "./response-drawer";
import { ResponsesTab } from "./responses-tab";
import { ResultsTopBar } from "./results-top-bar";
import { PerformanceTab, SummaryTab } from "./summary-tab";

type Tab = "performance" | "summary" | "responses";
const PAGE_SIZE = 25;
const message = (e: unknown) => (e instanceof ApiError ? e.message : "Couldn't load results.");

export function ResultsView({ formId }: { formId: string }) {
  const [form, setForm] = useState<FormDetail | null>(null);
  const [analytics, setAnalytics] = useState<FormAnalytics | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionPage | null>(null);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<Tab>("performance");
  const [openId, setOpenId] = useState<string | null>(null);
  const [show, setShow] = useState<"completed" | "partial">("completed");
  const [partials, setPartials] = useState<PartialPage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([formsApi.get(formId), resultsApi.analytics(formId)]).then(
      ([f, a]) => {
        setForm(f);
        setAnalytics(a);
      },
      (e) => setError(message(e)),
    );
  }, [formId]);

  useEffect(() => {
    let cancelled = false;
    resultsApi.submissions(formId, page, PAGE_SIZE).then(
      (p) => !cancelled && setSubmissions(p),
      (e) => !cancelled && setError(message(e)),
    );
    return () => {
      cancelled = true;
    };
  }, [formId, page]);

  useEffect(() => {
    if (show !== "partial") return;
    resultsApi.partials(formId).then(setPartials, (e) => setError(message(e)));
  }, [formId, show]);

  return (
    <div className="bg-surface flex min-h-dvh flex-col">
      <ResultsTopBar formId={formId} title={form?.title ?? ""} />
      <div className="bg-panel mx-3 mb-3 flex min-h-0 flex-1 flex-col rounded-2xl sm:mx-4 sm:mb-4">
        <div className="border-line flex items-center justify-between gap-4 border-b px-4 sm:px-8">
          <nav className="flex [scrollbar-width:none] gap-6 overflow-x-auto" aria-label="Results views">
            <button
              onClick={() => toast("Smart Insights are coming soon")}
              className="text-muted hover:text-ink -mb-px flex items-center gap-1.5 border-b-2 border-transparent py-3.5 text-sm font-medium whitespace-nowrap"
            >
              Smart Insights <span className="bg-lavender text-ink rounded px-1 text-[9px] font-semibold">SOON</span>
            </button>
            {(
              [
                ["performance", "Form performance"],
                ["summary", "Response summary"],
                ["responses", "Responses"],
              ] as const
            ).map(([t, label]) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                aria-current={tab === t ? "page" : undefined}
                className={cn(
                  "-mb-px border-b-2 py-3.5 text-sm font-medium whitespace-nowrap",
                  tab === t ? "border-ink text-ink" : "text-muted hover:text-ink border-transparent",
                )}
              >
                {label}
                {t === "responses" && submissions && (
                  <span className="bg-hover-strong ml-1.5 rounded-full px-1.5 text-xs tabular-nums">
                    {submissions.total}
                  </span>
                )}
              </button>
            ))}
          </nav>
          <a href={resultsApi.csvUrl(formId)} download className={buttonStyles({ variant: "secondary", size: "sm" })}>
            <Download size={15} /> Download CSV
          </a>
        </div>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-8">
          {error ? (
            <p className="border-danger/30 bg-danger/5 text-danger rounded-lg border p-4 text-sm">{error}</p>
          ) : tab === "performance" ? (
            analytics ? (
              <PerformanceTab data={analytics} />
            ) : (
              <LoadingBlocks />
            )
          ) : tab === "summary" ? (
            analytics ? (
              <SummaryTab data={analytics} />
            ) : (
              <LoadingBlocks />
            )
          ) : (
            <div className="space-y-4">
              <div
                className="border-line bg-surface flex w-fit rounded-lg border p-0.5 text-sm"
                role="group"
                aria-label="Response type"
              >
                {(["completed", "partial"] as const).map((kind) => (
                  <button
                    key={kind}
                    onClick={() => setShow(kind)}
                    aria-pressed={show === kind}
                    className={cn(
                      "rounded-md px-3 py-1.5 capitalize",
                      show === kind ? "bg-hover-strong font-medium" : "text-muted hover:text-ink",
                    )}
                  >
                    {kind}{" "}
                    <span className="tabular-nums">
                      ({kind === "completed" ? (submissions?.total ?? "…") : (analytics?.partials ?? "…")})
                    </span>
                  </button>
                ))}
              </div>
              {show === "completed" ? (
                submissions ? (
                  <ResponsesTab page={submissions} onPage={setPage} onOpen={setOpenId} />
                ) : (
                  <LoadingBlocks />
                )
              ) : partials ? (
                <PartialsTable page={partials} />
              ) : (
                <LoadingBlocks />
              )}
            </div>
          )}
        </main>
      </div>

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
