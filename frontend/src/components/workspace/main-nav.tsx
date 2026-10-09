"use client";

import { BarChart3, FileText, FlaskConical, LayoutTemplate, Users, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";

export const SECTIONS = ["Forms", "Contacts", "Automations", "Insights", "Pages", "Research Flow"] as const;
export type Section = (typeof SECTIONS)[number];

const ICONS: Record<Section, typeof FileText> = {
  Forms: FileText,
  Contacts: Users,
  Automations: Workflow,
  Insights: BarChart3,
  Pages: LayoutTemplate,
  "Research Flow": FlaskConical,
};

export function MainNav({ active, onChange }: { active: Section; onChange: (s: Section) => void }) {
  return (
    <nav className="border-line flex [scrollbar-width:none] gap-1 overflow-x-auto border-b px-3" aria-label="Main">
      {SECTIONS.map((section) => {
        const Icon = ICONS[section];
        return (
          <button
            key={section}
            onClick={() => onChange(section)}
            aria-current={active === section ? "page" : undefined}
            className={cn(
              "hover:bg-hover-strong relative my-2 flex items-center gap-2 rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
              active === section ? "bg-hover-strong text-ink font-medium" : "text-muted",
              section === "Research Flow" && "ml-3",
            )}
          >
            <Icon size={16} />
            {section}
            {section === "Pages" && (
              <span className="rounded-md border border-[#c9d9f6] bg-[#eef4ff] px-1.5 text-[10px] text-[#2c5bb8]">
                Beta
              </span>
            )}
            {active === section && <span className="bg-ink absolute inset-x-2 -bottom-2 h-0.5 rounded-full" />}
          </button>
        );
      })}
    </nav>
  );
}
