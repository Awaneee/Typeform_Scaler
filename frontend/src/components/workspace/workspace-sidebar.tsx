"use client";

import { ChevronUp, LayoutGrid, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Me } from "@/types/form";

const RESPONSE_LIMIT = 100; // mock plan limit for the usage meter

interface SidebarProps {
  me: Me | null;
  query: string;
  onQueryChange: (q: string) => void;
}

export function WorkspaceSidebar({ me, query, onQueryChange }: SidebarProps) {
  const used = me?.response_count ?? 0;
  const workspace = me?.workspaces[0];
  const [privateOpen, setPrivateOpen] = useState(true);

  return (
    <aside className="hidden w-[256px] shrink-0 flex-col border-r border-line md:flex">
      <div className="space-y-1 border-b border-line p-4">
        <Link href="/forms/new" className={cn(buttonStyles(), "w-full")}>
          <Plus size={16} /> Create form
        </Link>
        <label className="relative mt-3 block">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search"
            aria-label="Search forms"
            className="h-9 w-full rounded-lg bg-transparent pr-3 pl-9 text-sm outline-none placeholder:text-ink hover:bg-hover-strong focus:bg-surface focus:ring-1 focus:ring-plum"
          />
        </label>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex items-center justify-between px-1 py-1.5">
          <span className="flex items-center gap-2 text-sm font-medium">
            <LayoutGrid size={16} /> Workspaces
          </span>
          <button
            onClick={() => toast("Multiple workspaces are coming soon")}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-line bg-surface text-muted hover:text-ink"
            aria-label="New workspace"
          >
            <Plus size={14} />
          </button>
        </div>
        <button
          onClick={() => setPrivateOpen((o) => !o)}
          aria-expanded={privateOpen}
          className="mt-2 flex w-full items-center justify-between rounded-md px-1 py-1.5 text-sm font-medium"
        >
          Private
          <ChevronUp size={14} className={cn("transition-transform", !privateOpen && "rotate-180")} />
        </button>
        {privateOpen && (
          <div className="mt-1 flex items-center justify-between rounded-md bg-hover-strong px-3 py-2 text-sm" aria-current="true">
            <span>{workspace?.name ?? "My workspace"}</span>
            <span className="text-xs text-muted">{workspace?.form_count ?? ""}</span>
          </div>
        )}
        <button
          onClick={() => toast("Team collaboration is coming soon")}
          className="mt-3 flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-sm text-muted hover:text-ink"
        >
          <Plus size={14} /> Invite your team
        </button>
      </div>

      <div className="space-y-3 border-t border-line p-4">
        <div>
          <p className="mb-2 text-sm">Responses collected</p>
          <div className="h-1.5 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-ink" style={{ width: `${Math.min(100, (used / RESPONSE_LIMIT) * 100)}%` }} />
          </div>
          <p className="mt-2 text-sm">
            <strong className="font-semibold">{used}</strong> <span className="text-muted">/ {RESPONSE_LIMIT}</span>
          </p>
        </div>
        <button onClick={() => toast("Plans are coming soon")} className={cn(buttonStyles({ variant: "secondary", size: "sm" }))}>
          Increase response limit
        </button>
      </div>
    </aside>
  );
}
