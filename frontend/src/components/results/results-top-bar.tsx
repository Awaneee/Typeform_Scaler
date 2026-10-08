"use client";

import Link from "next/link";
import { ColorModeMenu } from "@/components/layout/color-mode-menu";
import { Logo } from "@/components/layout/logo";
import { BUILDER_TABS } from "@/components/builder/builder-top-bar";
import { cn } from "@/lib/utils";

/** Same chrome as the builder, with "Results" active; the other tabs live in the builder. */
export function ResultsTopBar({ formId, title }: { formId: string; title: string }) {
  return (
    <header className="grid h-14 shrink-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 border-b lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-4 border-line bg-surface px-4">
      <div className="flex min-w-0 items-center gap-2">
        <Logo showText={false} />
        <Link href="/workspace" className="hidden shrink-0 rounded-md px-1.5 py-1 text-sm text-muted hover:bg-selected hover:text-ink lg:block">
          My workspace
        </Link>
        <span className="hidden text-muted lg:inline">/</span>
        <span className="truncate px-1.5 text-sm font-medium">{title}</span>
      </div>
      <nav className="flex gap-0.5 lg:gap-1" aria-label="Form sections">
        {BUILDER_TABS.map((t) => {
          const active = t === "results";
          return (
            <Link
              key={t}
              href={active ? `/forms/${formId}/results` : `/forms/${formId}/edit`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative rounded-md px-2 py-1.5 text-sm capitalize lg:px-3",
                active ? "font-medium text-ink" : "text-muted hover:bg-selected hover:text-ink",
              )}
            >
              {t}
              {active && <span className="absolute inset-x-2 -bottom-[11px] h-0.5 rounded-full bg-ink" />}
            </Link>
          );
        })}
      </nav>
      <div className="flex justify-end">
        <ColorModeMenu />
      </div>
    </header>
  );
}
