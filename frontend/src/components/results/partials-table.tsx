"use client";

import { formatDateTime } from "@/lib/format";
import type { PartialPage } from "@/types/results";

/** People who started the form but didn't submit: what they answered and when they were last active. */
export function PartialsTable({ page }: { page: PartialPage }) {
  if (page.total === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line bg-surface p-10 text-center text-sm text-muted">
        No partial responses. Everyone who started this form finished it.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full min-w-max text-left text-sm">
        <thead className="border-b border-line bg-bg text-xs text-muted">
          <tr>
            <th className="px-4 py-2.5 font-medium">Last active</th>
            <th className="px-4 py-2.5 font-medium">Answered</th>
            {page.columns.map((c) => (
              <th key={c.id} className="max-w-56 px-4 py-2.5 font-medium" title={c.title}>
                <span className="line-clamp-1">{c.title || "Untitled"}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {page.items.map((row) => (
            <tr key={row.id} aria-label="Partial response">
              <td className="px-4 py-2.5 whitespace-nowrap text-muted">{formatDateTime(row.last_activity_at)}</td>
              <td className="px-4 py-2.5 text-muted tabular-nums">
                {row.answered} of {page.columns.filter((c) => !c.removed).length}
              </td>
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
  );
}
