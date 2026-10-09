"use client";

import { ChevronRight, Loader2, PanelsTopLeft } from "lucide-react";
import { ColorModeMenu } from "@/components/layout/color-mode-menu";
import { HelpButton, ProfileMenu, useMe } from "@/components/layout/profile-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBuilder } from "@/store/builder-store";
import { SaveIndicator } from "./save-indicator";

export const BUILDER_TABS = ["content", "workflow", "connect", "share", "results"] as const;
export type BuilderTab = (typeof BUILDER_TABS)[number];

interface TopBarProps {
  tab: BuilderTab;
  onTab: (tab: BuilderTab) => void;
  onBack: () => void;
  onPublish: () => void;
  publishing: boolean;
}

/**
 * Header styles shared with the results page. One row on desktop; on phones the section tabs
 * move to a second, horizontally scrollable row so nothing overlaps.
 */
export const topBar = {
  header:
    "border-line bg-surface grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 border-b px-4 pt-2 md:h-14 md:grid-cols-[minmax(0,1fr)_auto_auto] md:pt-0 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-4",
  nav: "col-span-2 row-start-2 -mx-2 flex gap-0.5 overflow-x-auto md:col-span-1 md:row-start-auto md:mx-0 md:overflow-visible lg:gap-1",
  tab: "relative shrink-0 rounded-md px-2 py-1.5 text-sm whitespace-nowrap capitalize lg:px-3",
  underline: "bg-ink absolute inset-x-2 bottom-0 h-0.5 rounded-full md:-bottom-[11px]",
};

export function BuilderTopBar({ tab, onTab, onBack, onPublish, publishing }: TopBarProps) {
  const title = useBuilder((s) => s.title);
  const setTitle = useBuilder((s) => s.setTitle);
  const status = useBuilder((s) => s.status);
  const changed = useBuilder((s) => s.hasUnpublishedChanges);
  const upToDate = status === "published" && !changed;
  const me = useMe();

  return (
    <header className={topBar.header}>
      {/* Breadcrumb like Typeform: "Forms › <title>" */}
      <div className="flex min-w-0 items-center gap-1">
        <button
          onClick={onBack}
          className="text-muted hover:bg-selected hover:text-ink flex shrink-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-sm"
        >
          <PanelsTopLeft size={16} /> Forms
        </button>
        <ChevronRight size={14} className="text-muted shrink-0" aria-hidden />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => !title.trim() && setTitle("Untitled form")}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          maxLength={255}
          aria-label="Form title"
          size={Math.min(Math.max(title.length, 8), 40)}
          className="hover:bg-selected focus:bg-surface focus:ring-plum min-w-0 truncate rounded-md px-1.5 py-1 text-sm font-medium outline-none focus:ring-1"
        />
      </div>

      <nav className={topBar.nav} aria-label="Builder sections">
        {BUILDER_TABS.map((t) => (
          <button
            key={t}
            onClick={() => onTab(t)}
            aria-current={tab === t ? "page" : undefined}
            className={cn(
              topBar.tab,
              tab === t ? "text-ink font-medium" : "text-muted hover:bg-selected hover:text-ink",
            )}
          >
            {t}
            {tab === t && <span className={topBar.underline} />}
          </button>
        ))}
      </nav>

      <div className="flex items-center justify-end gap-3">
        <div className="hidden xl:block">
          <SaveIndicator />
        </div>
        <ColorModeMenu />
        <Button size="sm" onClick={onPublish} disabled={publishing || upToDate}>
          {publishing && <Loader2 size={14} className="animate-spin" />}
          {upToDate ? "Published" : status === "published" ? "Publish changes" : "Publish"}
        </Button>
        <div className="hidden items-center sm:flex">
          <HelpButton />
          <ProfileMenu me={me} />
        </div>
      </div>
    </header>
  );
}
