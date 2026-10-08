"use client";

import { Eye, Loader2 } from "lucide-react";
import { ColorModeMenu } from "@/components/layout/color-mode-menu";
import { Logo } from "@/components/layout/logo";
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
  onPreview: () => void;
  onPublish: () => void;
  publishing: boolean;
}

export function BuilderTopBar({ tab, onTab, onBack, onPreview, onPublish, publishing }: TopBarProps) {
  const title = useBuilder((s) => s.title);
  const setTitle = useBuilder((s) => s.setTitle);
  const status = useBuilder((s) => s.status);
  const changed = useBuilder((s) => s.hasUnpublishedChanges);
  const upToDate = status === "published" && !changed;

  return (
    <header className="grid h-14 shrink-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 border-b lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-4 border-line bg-surface px-4">
      <div className="flex min-w-0 items-center gap-2">
        <span onClickCapture={(e) => { e.preventDefault(); onBack(); }}>
          <Logo showText={false} />
        </span>
        <button onClick={onBack} className="hidden shrink-0 rounded-md px-1.5 py-1 text-sm text-muted hover:bg-selected hover:text-ink lg:block">
          My workspace
        </button>
        <span className="hidden text-muted lg:inline">/</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => !title.trim() && setTitle("Untitled form")}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          maxLength={255}
          aria-label="Form title"
          size={Math.min(Math.max(title.length, 8), 40)}
          className="min-w-0 truncate rounded-md px-1.5 py-1 text-sm font-medium outline-none hover:bg-selected focus:bg-surface focus:ring-1 focus:ring-plum"
        />
      </div>

      <nav className="flex gap-0.5 lg:gap-1" aria-label="Builder sections">
        {BUILDER_TABS.map((t) => (
          <button
            key={t}
            onClick={() => onTab(t)}
            aria-current={tab === t ? "page" : undefined}
            className={cn(
              "relative rounded-md px-2 py-1.5 text-sm capitalize lg:px-3",
              tab === t ? "font-medium text-ink" : "text-muted hover:bg-selected hover:text-ink",
            )}
          >
            {t}
            {tab === t && <span className="absolute inset-x-2 -bottom-[11px] h-0.5 rounded-full bg-ink" />}
          </button>
        ))}
      </nav>

      <div className="flex items-center justify-end gap-3">
        <div className="hidden xl:block">
          <SaveIndicator />
        </div>
        <ColorModeMenu />
        <button onClick={onPreview} className="rounded-lg p-2 text-ink hover:bg-selected" aria-label="Preview" title="Preview">
          <Eye size={18} />
        </button>
        <Button size="sm" onClick={onPublish} disabled={publishing || upToDate}>
          {publishing && <Loader2 size={14} className="animate-spin" />}
          {upToDate ? "Published" : status === "published" ? "Publish changes" : "Publish"}
        </Button>
      </div>
    </header>
  );
}
