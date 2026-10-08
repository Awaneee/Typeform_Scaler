"use client";

import Link from "next/link";
import { formatDate, plural } from "@/lib/format";
import { getTheme } from "@/lib/themes";
import type { FormSummary } from "@/types/form";
import { FormThumbnail, StatusBadge } from "./form-thumbnail";

interface FormCollectionProps {
  forms: FormSummary[];
  renderMenu: (form: FormSummary) => React.ReactNode;
}

export function FormList({ forms, renderMenu }: FormCollectionProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="hidden grid-cols-[minmax(0,1fr)_120px_140px_44px] gap-4 border-b border-line px-4 py-2.5 text-xs font-medium text-muted sm:grid">
        <span>Name</span>
        <span className="text-right">Responses</span>
        <span>Updated</span>
        <span />
      </div>
      <ul className="divide-y divide-line">
        {forms.map((form) => (
          <li
            key={form.id}
            className="group relative grid grid-cols-[minmax(0,1fr)_44px] items-center gap-4 px-4 py-3 hover:bg-bg sm:grid-cols-[minmax(0,1fr)_120px_140px_44px]"
          >
            <div className="flex min-w-0 items-center gap-3">
              <FormThumbnail theme={form.theme} title={form.title} />
              <div className="min-w-0">
                {/* The stretched link makes the whole row clickable while keeping the menu separate. */}
                <Link
                  href={`/forms/${form.id}/edit`}
                  className="block truncate text-sm font-medium after:absolute after:inset-0 focus-visible:underline"
                >
                  {form.title}
                </Link>
                <div className="mt-0.5 flex items-center gap-2">
                  <StatusBadge status={form.status} changed={form.has_unpublished_changes} />
                  <span className="text-xs text-muted sm:hidden">· {plural(form.response_count, "response")}</span>
                </div>
              </div>
            </div>
            <span className="hidden text-right text-sm tabular-nums sm:block">{form.response_count}</span>
            <span className="hidden text-sm text-muted sm:block">{formatDate(form.updated_at)}</span>
            <div className="relative z-10 flex justify-end">{renderMenu(form)}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FormGrid({ forms, renderMenu }: FormCollectionProps) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-4">
      {forms.map((form) => (
        <li key={form.id} className="group relative overflow-hidden rounded-xl border border-line bg-surface transition-shadow hover:shadow-md">
          <GridPreview form={form} />
          <div className="flex items-start justify-between gap-2 p-3">
            <div className="min-w-0">
              <Link
                href={`/forms/${form.id}/edit`}
                className="block truncate text-sm font-medium after:absolute after:inset-0 focus-visible:underline"
              >
                {form.title}
              </Link>
              <p className="mt-1 text-xs text-muted">{plural(form.response_count, "response")}</p>
            </div>
            <div className="relative z-10">{renderMenu(form)}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** A miniature of the form's first screen, in its theme colours. */
function GridPreview({ form }: { form: FormSummary }) {
  const theme = getTheme(form.theme);
  return (
    <div className="relative flex h-32 flex-col justify-center gap-2 border-b border-line px-5 pt-6" style={{ background: theme.background }}>
      <p className="line-clamp-2 text-[15px] leading-snug font-medium" style={{ color: theme.question }}>
        {form.title}
      </p>
      <span className="h-1.5 w-10 rounded-full" style={{ background: theme.button }} />
      <div className="absolute top-2 left-2 rounded-md bg-white/90 px-1.5 py-0.5">
        <StatusBadge status={form.status} />
      </div>
    </div>
  );
}
