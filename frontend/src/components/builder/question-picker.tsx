"use client";

import { Dialog } from "radix-ui";
import { Search, X } from "lucide-react";
import { useState } from "react";
import { TypeBadge } from "@/components/questions/question-icon";
import { CATEGORIES, COMING_SOON_TYPES, QUESTION_REGISTRY } from "@/components/questions/registry";
import { cn } from "@/lib/utils";
import { useBuilder } from "@/store/builder-store";
import { QUESTION_TYPES, type QuestionType } from "@/types/form";

interface QuestionPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** "Add form elements" modal: categories of question types, searchable. */
export function QuestionPicker({ open, onOpenChange }: QuestionPickerProps) {
  const addQuestion = useBuilder((s) => s.addQuestion);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"elements" | "layout">("elements");
  const q = query.trim().toLowerCase();

  function pick(type: QuestionType) {
    addQuestion(type);
    onOpenChange(false);
    setQuery("");
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-[fade-in_150ms_ease-out]" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 flex max-h-[85vh] w-[calc(100vw-32px)] max-w-[920px] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl bg-surface shadow-2xl outline-none data-[state=open]:animate-[pop-in_150ms_ease-out]">
          <div className="flex items-center gap-6 border-b border-line px-6 pt-4">
            <Dialog.Title className="sr-only">Add form elements</Dialog.Title>
            <Dialog.Description className="sr-only">Choose a question type to add after the selected question.</Dialog.Description>
            {(["elements", "layout"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "-mb-px border-b-2 pb-3 text-sm font-medium",
                  tab === t ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink",
                )}
              >
                {t === "elements" ? "Add form elements" : "Layout & pages"}
              </button>
            ))}
            <Dialog.Close className="ml-auto mb-3 rounded-md p-1.5 text-muted hover:bg-selected hover:text-ink" aria-label="Close">
              <X size={18} />
            </Dialog.Close>
          </div>

          {tab === "layout" ? (
            <p className="px-6 py-16 text-center text-sm text-muted">Welcome screens and multi-question pages are coming soon.</p>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="px-6 pt-5">
                <label className="relative block max-w-xs">
                  <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search form elements"
                    autoFocus
                    className="h-9 w-full rounded-lg border border-line pr-3 pl-9 text-sm outline-none focus:border-plum focus:ring-1 focus:ring-plum"
                  />
                </label>
              </div>
              <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-6 overflow-y-auto px-6 py-5 md:grid-cols-3 lg:grid-cols-5">
                {CATEGORIES.map((category) => {
                  const available = QUESTION_TYPES.filter(
                    (t) => QUESTION_REGISTRY[t].category === category && QUESTION_REGISTRY[t].label.toLowerCase().includes(q),
                  );
                  const soon = COMING_SOON_TYPES.filter((t) => t.category === category && t.label.toLowerCase().includes(q));
                  if (!available.length && !soon.length) return null;
                  return (
                    <div key={category}>
                      <h3 className="mb-2 text-xs font-semibold text-muted">{category}</h3>
                      <ul className="space-y-0.5">
                        {available.map((type) => {
                          const meta = QUESTION_REGISTRY[type];
                          return (
                            <li key={type}>
                              <button
                                onClick={() => pick(type)}
                                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-selected"
                              >
                                <TypeBadge icon={meta.icon} bg={meta.bg} fg={meta.fg} />
                                {meta.label}
                              </button>
                            </li>
                          );
                        })}
                        {soon.map((t) => (
                          <li key={t.label}>
                            <div
                              className="flex w-full cursor-not-allowed items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-muted"
                              title="Coming soon"
                            >
                              <TypeBadge icon={t.icon} bg={t.bg} fg={t.fg} className="opacity-50" />
                              <span className="leading-tight">{t.label}</span>
                              <span className="ml-auto shrink-0 rounded bg-selected px-1 py-0.5 text-[9px] font-semibold tracking-wide">
                                SOON
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
