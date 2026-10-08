"use client";

import { cn } from "@/lib/utils";

export const SECTIONS = ["Forms", "Contacts", "Automations", "Insights", "Pages", "Research Flow"] as const;
export type Section = (typeof SECTIONS)[number];

export function MainNav({ active, onChange }: { active: Section; onChange: (s: Section) => void }) {
  return (
    <nav className="flex gap-1 overflow-x-auto [scrollbar-width:none] border-b border-line bg-surface px-4 sm:px-6" aria-label="Main">
      {SECTIONS.map((section) => (
        <button
          key={section}
          onClick={() => onChange(section)}
          aria-current={active === section ? "page" : undefined}
          className={cn(
            "relative my-1.5 rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors hover:bg-selected",
            active === section ? "bg-selected font-medium text-ink" : "text-muted",
          )}
        >
          {section}
          {active === section && <span className="absolute inset-x-1 -bottom-1.5 h-0.5 rounded-full bg-ink" />}
        </button>
      ))}
    </nav>
  );
}
