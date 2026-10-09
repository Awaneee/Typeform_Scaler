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
      <p className="border-line bg-surface text-muted rounded-xl border border-dashed p-10 text-center text-sm">
        No responses yet. Share your form to start collecting them.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="border-line bg-surface overflow-x-auto rounded-xl border">
        <table className="w-full min-w-max text-left text-sm">
          <thead className="border-line bg-bg text-muted border-b text-xs">
            <tr>
              <th className="bg-bg sticky left-0 px-4 py-2.5 font-medium">#</th>
              <th className="px-4 py-2.5 font-medium">Submitted</th>
              {page.columns.map((c) => (
                <th key={c.id} className="max-w-56 px-4 py-2.5 font-medium" title={c.title}>
                  <span className="line-clamp-1">{c.title || "Untitled"}</span>
                  {c.removed && <span className="text-[10px] font-normal">(removed)</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-line divide-y">
            {page.items.map((row) => (
              <tr
                key={row.id}
                onClick={() => onOpen(row.id)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen(row.id))}
                tabIndex={0}
                aria-label={`Open response ${row.number}`}
                className="group hover:bg-bg focus-visible:bg-selected cursor-pointer outline-none"
              >
                <td className="bg-surface text-muted group-hover:bg-bg sticky left-0 px-4 py-2.5 tabular-nums">
                  {row.number}
                </td>
                <td className="text-muted px-4 py-2.5 whitespace-nowrap">{formatDateTime(row.submitted_at)}</td>
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
      <div className="text-muted flex items-center justify-between text-sm">
        <span>
          {from}–{to} of {page.total}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPage(page.page - 1)}
            disabled={page.page <= 1}
            className="hover:bg-selected rounded-md p-1.5 disabled:opacity-40"
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="px-1 tabular-nums">
            {page.page} / {pages}
          </span>
          <button
            onClick={() => onPage(page.page + 1)}
            disabled={page.page >= pages}
            className="hover:bg-selected rounded-md p-1.5 disabled:opacity-40"
            aria-label="Next page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
