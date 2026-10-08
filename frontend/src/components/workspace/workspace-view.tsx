"use client";

import { ArrowDownUp, LayoutGrid, List, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ComingSoon } from "@/components/layout/coming-soon";
import { buttonStyles } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Menu, MenuContent, MenuLabel, MenuRadioGroup, MenuRadioItem, MenuTrigger } from "@/components/ui/menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspace } from "@/hooks/use-workspace";
import { cn } from "@/lib/utils";
import type { FormSort, FormSummary } from "@/types/form";
import { AnnouncementBanner } from "./announcement-banner";
import { AppHeader } from "./app-header";
import { FormActionsMenu } from "./form-actions-menu";
import { FormGrid, FormList } from "./form-list";
import { MainNav, type Section } from "./main-nav";
import { RenameDialog } from "./rename-dialog";
import { WorkspaceSidebar } from "./workspace-sidebar";

const SORT_LABELS: Record<FormSort, string> = {
  updated: "Last updated",
  created: "Date created",
  title: "Alphabetical",
  responses: "Most responses",
};

type View = "list" | "grid";
const VIEW_KEY = "ff:workspace-view";

export function WorkspaceView() {
  const { forms, me, error, query, setQuery, sort, setSort, actions } = useWorkspace();
  const [section, setSection] = useState<Section>("Forms");
  const [view, setView] = useState<View>("list");
  const [renaming, setRenaming] = useState<FormSummary | null>(null);
  const [deleting, setDeleting] = useState<FormSummary | null>(null);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring a per-browser preference after mount
      if (localStorage.getItem(VIEW_KEY) === "grid") setView("grid");
    } catch {}
  }, []);

  function changeView(next: View) {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {}
  }

  const renderMenu = (form: FormSummary) => (
    <FormActionsMenu form={form} actions={actions} onRename={() => setRenaming(form)} onDelete={() => setDeleting(form)} />
  );

  return (
    <div className="flex h-dvh flex-col">
      <AppHeader me={me} />
      <AnnouncementBanner />
      <MainNav active={section} onChange={setSection} />

      {section !== "Forms" ? (
        <ComingSoon title={section} />
      ) : (
        <div className="flex min-h-0 flex-1">
          <WorkspaceSidebar me={me} query={query} onQueryChange={setQuery} />

          <main className="min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-xl font-semibold">{me?.workspaces[0]?.name ?? "My workspace"}</h1>
              <div className="flex items-center gap-2">
                <Menu>
                  <MenuTrigger className="flex h-9 items-center gap-2 rounded-lg px-3 text-sm hover:bg-selected">
                    <ArrowDownUp size={15} className="text-muted" /> {SORT_LABELS[sort]}
                  </MenuTrigger>
                  <MenuContent>
                    <MenuLabel>Sort by</MenuLabel>
                    <MenuRadioGroup value={sort} onValueChange={(v) => setSort(v as FormSort)}>
                      {(Object.keys(SORT_LABELS) as FormSort[]).map((key) => (
                        <MenuRadioItem key={key} value={key}>
                          {SORT_LABELS[key]}
                        </MenuRadioItem>
                      ))}
                    </MenuRadioGroup>
                  </MenuContent>
                </Menu>
                <div className="flex rounded-lg border border-line bg-surface p-0.5" role="group" aria-label="View">
                  {(["list", "grid"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => changeView(v)}
                      aria-pressed={view === v}
                      aria-label={`${v} view`}
                      className={cn("rounded-md p-1.5", view === v ? "bg-selected text-ink" : "text-muted hover:text-ink")}
                    >
                      {v === "list" ? <List size={16} /> : <LayoutGrid size={16} />}
                    </button>
                  ))}
                </div>
                <Link href="/forms/new" className={cn(buttonStyles({ size: "sm" }), "md:hidden")}>
                  <Plus size={15} /> New
                </Link>
              </div>
            </div>

            {/* Search lives in the sidebar on desktop; mobile gets its own field. */}
            <label className="relative mb-4 block md:hidden">
              <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search forms"
                className="h-10 w-full rounded-lg border border-line bg-surface pr-3 pl-9 text-sm outline-none focus:border-plum"
              />
            </label>

            {error ? (
              <p className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger">{error}</p>
            ) : forms === null ? (
              <LoadingRows />
            ) : forms.length === 0 ? (
              <EmptyState searching={query.trim() !== ""} />
            ) : view === "list" ? (
              <FormList forms={forms} renderMenu={renderMenu} />
            ) : (
              <FormGrid forms={forms} renderMenu={renderMenu} />
            )}
          </main>
        </div>
      )}

      {renaming && (
        <RenameDialog
          initialTitle={renaming.title}
          onOpenChange={(open) => !open && setRenaming(null)}
          onSubmit={(title) => actions.rename(renaming, title)}
        />
      )}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete "${deleting?.title ?? ""}"?`}
        description="The form and all of its responses will be permanently deleted. This can't be undone."
        confirmLabel="Delete form"
        destructive
        onConfirm={async () => {
          if (deleting) await actions.remove(deleting);
        }}
      />
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-px overflow-hidden rounded-xl border border-line bg-surface" aria-busy="true" aria-label="Loading forms">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-48" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ searching }: { searching: boolean }) {
  if (searching) {
    return <p className="py-16 text-center text-sm text-muted">No forms match your search.</p>;
  }
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line bg-surface py-16 text-center">
      <h2 className="text-lg font-semibold">Let&apos;s create your first form</h2>
      <p className="max-w-xs text-sm text-muted">Ask questions one at a time and get more responses.</p>
      <Link href="/forms/new" className={buttonStyles()}>
        <Plus size={16} /> Create a new form
      </Link>
    </div>
  );
}
