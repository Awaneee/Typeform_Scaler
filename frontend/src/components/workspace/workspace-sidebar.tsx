"use client";

import { ChevronDown, Plus, Search, Sparkles, Users } from "lucide-react";
import Link from "next/link";
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

  return (
    <aside className="hidden w-[280px] shrink-0 flex-col border-r border-line bg-surface md:flex">
      <div className="space-y-3 p-4">
        <Link href="/forms/new" className={cn(buttonStyles(), "w-full")}>
          <Plus size={16} /> Create a new form
        </Link>
        <label className="relative block">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search"
            aria-label="Search forms"
            className="h-9 w-full rounded-lg bg-bg pr-3 pl-9 text-sm outline-none placeholder:text-muted focus:ring-1 focus:ring-plum"
          />
        </label>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        <div className="flex items-center justify-between px-2 py-2">
          <span className="flex items-center gap-1 text-xs font-medium text-muted">
            <ChevronDown size={14} /> Workspaces
          </span>
          <button
            onClick={() => toast("Multiple workspaces are coming soon")}
            className="rounded p-1 text-muted hover:bg-selected hover:text-ink"
            aria-label="New workspace"
          >
            <Plus size={14} />
          </button>
        </div>
        <p className="px-3 pt-1 pb-1.5 text-[11px] font-medium tracking-wide text-muted uppercase">Private</p>
        <div className="flex items-center justify-between rounded-md bg-selected px-3 py-2 text-sm font-medium" aria-current="true">
          <span>{workspace?.name ?? "My workspace"}</span>
          <span className="text-xs text-muted">{workspace?.form_count ?? ""}</span>
        </div>
        <p className="px-3 pt-4 pb-1.5 text-[11px] font-medium tracking-wide text-muted uppercase">Shared</p>
        <button
          onClick={() => toast("Team collaboration is coming soon")}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted hover:bg-selected"
        >
          <Users size={15} /> Invite your team
        </button>
      </div>

      <div className="space-y-3 border-t border-line p-4">
        <div className="flex items-start gap-2 rounded-lg bg-lavender/60 p-3 text-xs text-ink">
          <Sparkles size={14} className="mt-0.5 shrink-0" />
          <span>AI form generation is coming soon.</span>
        </div>
        <div>
          <div className="mb-1.5 flex justify-between text-xs">
            <span className="text-muted">Responses collected</span>
            <span className="font-medium">
              {used} / {RESPONSE_LIMIT}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-selected">
            <div className="h-full rounded-full bg-teal" style={{ width: `${Math.min(100, (used / RESPONSE_LIMIT) * 100)}%` }} />
          </div>
        </div>
      </div>
    </aside>
  );
}
