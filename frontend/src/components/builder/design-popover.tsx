"use client";

import { Check, Paintbrush } from "lucide-react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { THEMES } from "@/lib/themes";
import { cn } from "@/lib/utils";
import { useBuilder } from "@/store/builder-store";
import type { ThemeName } from "@/types/form";

/** Theme gallery. Changes apply to the canvas immediately and are saved with the draft. */
export function DesignPopover() {
  const theme = useBuilder((s) => s.settings.theme);
  const updateSettings = useBuilder((s) => s.updateSettings);
  const [tab, setTab] = useState<"gallery" | "mine">("gallery");

  return (
    <Popover>
      <PopoverTrigger className="flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm hover:bg-selected">
        <Paintbrush size={15} /> Design
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[340px] p-0">
        <div className="flex gap-4 border-b border-line px-4 pt-3">
          {(["mine", "gallery"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn("-mb-px border-b-2 pb-2 text-sm font-medium", tab === t ? "border-ink" : "border-transparent text-muted")}
            >
              {t === "mine" ? "My themes" : "Gallery"}
            </button>
          ))}
        </div>
        {tab === "mine" ? (
          <p className="p-6 text-center text-sm text-muted">Custom themes are coming soon. Pick one from the gallery.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 p-4">
            {(Object.keys(THEMES) as ThemeName[]).map((name) => {
              const t = THEMES[name];
              const active = theme === name;
              return (
                <button
                  key={name}
                  onClick={() => updateSettings({ theme: name })}
                  aria-pressed={active}
                  className={cn(
                    "overflow-hidden rounded-lg border text-left transition-shadow hover:shadow-md",
                    active ? "border-plum ring-2 ring-plum" : "border-line",
                  )}
                >
                  <div className="space-y-1.5 p-3" style={{ background: t.background, fontFamily: t.font }}>
                    <p className="text-sm font-medium" style={{ color: t.question }}>
                      Question
                    </p>
                    <p className="text-xs" style={{ color: t.answer }}>
                      Answer
                    </p>
                    <span className="block h-3 w-8 rounded-sm" style={{ background: t.button }} />
                  </div>
                  <div className="flex items-center justify-between px-3 py-1.5 text-xs font-medium">
                    <span>
                      {t.label} <span className="font-normal text-muted">· {t.fontLabel}</span>
                    </span>
                    {active && <Check size={14} />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
