"use client";

import Link from "next/link";
import { ColorModeMenu } from "@/components/layout/color-mode-menu";
import { HelpButton, ProfileMenu, useMe } from "@/components/layout/profile-menu";
import { ChevronRight, PanelsTopLeft } from "lucide-react";
import { BUILDER_TABS } from "@/components/builder/builder-top-bar";
import { cn } from "@/lib/utils";

/** Same chrome as the builder, with "Results" active; the other tabs live in the builder. */
export function ResultsTopBar({ formId, title }: { formId: string; title: string }) {
  const me = useMe();
  return (
    <header className="border-line bg-surface grid h-14 shrink-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 border-b px-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-4">
      <div className="flex min-w-0 items-center gap-2">
        <Link
          href="/workspace"
          className="text-muted hover:bg-selected hover:text-ink flex shrink-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-sm"
        >
          <PanelsTopLeft size={16} /> Forms
        </Link>
        <ChevronRight size={14} className="text-muted shrink-0" aria-hidden />
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
                active ? "text-ink font-medium" : "text-muted hover:bg-selected hover:text-ink",
              )}
            >
              {t}
              {active && <span className="bg-ink absolute inset-x-2 -bottom-[11px] h-0.5 rounded-full" />}
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center justify-end">
        <ColorModeMenu />
        <div className="hidden items-center sm:flex">
          <HelpButton />
          <ProfileMenu me={me} />
        </div>
      </div>
    </header>
  );
}
