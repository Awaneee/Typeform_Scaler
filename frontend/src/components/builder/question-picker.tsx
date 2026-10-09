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
  const [tab, setTab] = useState<"elements" | "import" | "ai">("elements");
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
        <Dialog.Content className="bg-panel fixed top-1/2 left-1/2 z-50 flex max-h-[85vh] w-[calc(100vw-32px)] max-w-[960px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl shadow-2xl outline-none data-[state=open]:animate-[pop-in_150ms_ease-out]">
          <div className="border-line flex items-center gap-6 border-b px-6 pt-4">
            <Dialog.Title className="sr-only">Add form elements</Dialog.Title>
            <Dialog.Description className="sr-only">
              Choose a question type to add after the selected question.
            </Dialog.Description>
            {(
              [
                ["elements", "Add form elements"],
                ["import", "Import questions"],
                ["ai", "Create with AI"],
              ] as const
            ).map(([t, label]) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "-mb-px border-b-2 pb-3 text-sm font-medium",
                  tab === t ? "border-ink text-ink" : "text-muted hover:text-ink border-transparent",
                )}
              >
                {label}
              </button>
            ))}
            <Dialog.Close
              className="text-muted hover:bg-selected hover:text-ink mb-3 ml-auto rounded-md p-1.5"
              aria-label="Close"
            >
              <X size={18} />
            </Dialog.Close>
          </div>

          {tab !== "elements" ? (
            <p className="text-muted px-6 py-16 text-center text-sm">
              {tab === "import" ? "Importing questions from a doc or another tool" : "Generating questions with AI"} is
              coming soon.
            </p>
          ) : (
            <div className="bg-surface flex min-h-0 flex-1 gap-8 overflow-y-auto px-6 py-5">
              {/* Left column: search, recommended types, apps (Typeform layout). */}
              <div className="w-52 shrink-0 space-y-5">
                <label className="relative block">
                  <Search
                    size={16}
                    className="text-muted pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
                  />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search form elements"
                    autoFocus
                    className="border-line focus:border-plum focus:ring-plum h-9 w-full rounded-lg border pr-3 pl-9 text-sm outline-none focus:ring-1"
                  />
                </label>
                <div>
                  <h3 className="mb-2 px-1 text-sm font-semibold">Recommended</h3>
                  <ul className="space-y-1.5">
                    {(["short_text", "multiple_choice", "email"] as const).map((type) => {
                      const meta = QUESTION_REGISTRY[type];
                      return (
                        <li key={type}>
                          <button
                            onClick={() => pick(type)}
                            aria-label={`${meta.label} (recommended)`}
                            className="border-line hover:bg-selected flex w-full items-center gap-2.5 rounded-lg border px-2 py-1.5 text-left text-sm"
                          >
                            <TypeBadge icon={meta.icon} bg={meta.bg} fg={meta.fg} />
                            {meta.label}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div>
                  <h3 className="mb-2 px-1 text-sm font-semibold">Connect to apps</h3>
                  <p className="border-line text-muted rounded-lg border border-dashed px-3 py-2 text-xs">
                    HubSpot, Salesforce and more: coming soon
                  </p>
                </div>
              </div>

              <div className="grid flex-1 grid-cols-2 content-start gap-x-6 gap-y-6 md:grid-cols-3">
                {CATEGORIES.map((category) => {
                  const available = QUESTION_TYPES.filter(
                    (t) =>
                      QUESTION_REGISTRY[t].category === category &&
                      QUESTION_REGISTRY[t].label.toLowerCase().includes(q),
                  );
                  const soon = COMING_SOON_TYPES.filter(
                    (t) => t.category === category && t.label.toLowerCase().includes(q),
                  );
                  if (!available.length && !soon.length) return null;
                  return (
                    <div key={category}>
                      <h3 className="mb-2 text-sm font-semibold">{category}</h3>
                      <ul className="space-y-0.5">
                        {available.map((type) => {
                          const meta = QUESTION_REGISTRY[type];
                          return (
                            <li key={type}>
                              <button
                                onClick={() => pick(type)}
                                className="hover:bg-selected flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm"
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
                              className="text-muted flex w-full cursor-not-allowed items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm"
                              title="Coming soon"
                            >
                              <TypeBadge icon={t.icon} bg={t.bg} fg={t.fg} className="opacity-50" />
                              <span className="leading-tight">{t.label}</span>
                              <span className="bg-selected ml-auto shrink-0 rounded px-1 py-0.5 text-[9px] font-semibold tracking-wide">
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
