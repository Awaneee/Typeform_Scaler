"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import type { SubmissionPage } from "@/types/results";

interface ResponsesTabProps {
  page: SubmissionPage;
  onPage: (page: number) => void;
  onOpen: (submissionId: string) => void;
}

export function ResponsesTab({ page, onPage, onOpen }: ResponsesTabProps) {
  const pages = Math.max(1, Math.ceil(page.total / page.page_size));
  const from = page.total ? (page.page - 1) * page.page_size + 1 : 0;
  const to = Math.min(page.page * page.page_size, page.total);

  if (page.total === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line bg-surface p-10 text-center text-sm text-muted">
        No responses yet. Share your form to start collecting them.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-max text-left text-sm">
          <thead className="border-b border-line bg-bg text-xs text-muted">
            <tr>
              <th className="sticky left-0 bg-bg px-4 py-2.5 font-medium">#</th>
              <th className="px-4 py-2.5 font-medium">Submitted</th>
              {page.columns.map((c) => (
                <th key={c.id} className="max-w-56 px-4 py-2.5 font-medium" title={c.title}>
                  <span className="line-clamp-1">{c.title || "Untitled"}</span>
                  {c.removed && <span className="text-[10px] font-normal">(removed)</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {page.items.map((row) => (
              <tr
                key={row.id}
                onClick={() => onOpen(row.id)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen(row.id))}
                tabIndex={0}
                aria-label={`Open response ${row.number}`}
                className="group cursor-pointer outline-none hover:bg-bg focus-visible:bg-selected"
              >
                <td className="sticky left-0 bg-surface px-4 py-2.5 text-muted tabular-nums group-hover:bg-bg">{row.number}</td>
                <td className="px-4 py-2.5 whitespace-nowrap text-muted">{formatDateTime(row.submitted_at)}</td>
                {page.columns.map((c) => (
                  <td key={c.id} className="max-w-56 px-4 py-2.5">
                    <span className="line-clamp-1">{row.answers[c.id] ?? <span className="text-muted">–</span>}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-muted">
        <span>
          {from}–{to} of {page.total}
        </span>
        <div className="flex items-center gap-1">
          <button onClick={() => onPage(page.page - 1)} disabled={page.page <= 1} className="rounded-md p-1.5 hover:bg-selected disabled:opacity-40" aria-label="Previous page">
            <ChevronLeft size={16} />
          </button>
          <span className="px-1 tabular-nums">
            {page.page} / {pages}
          </span>
          <button onClick={() => onPage(page.page + 1)} disabled={page.page >= pages} className="rounded-md p-1.5 hover:bg-selected disabled:opacity-40" aria-label="Next page">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
