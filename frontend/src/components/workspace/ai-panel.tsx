"use client";

import { Mic, MoreHorizontal, Plus, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

const soon = () => toast("Formflow AI is coming soon");

/** Left-hand AI assistant panel, as in Typeform's workspace. A placeholder for now. */
export function AiPanel() {
  return (
    <aside className="hidden w-[300px] shrink-0 flex-col rounded-2xl border border-[#e6d8f7] bg-surface p-4 xl:flex" aria-label="Formflow AI">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Sparkles size={16} className="text-[#7b4fc9]" /> Formflow AI
        <span className="rounded-md bg-lavender px-1.5 py-0.5 text-[11px] text-ink">Beta</span>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-2 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-lavender text-[#7b4fc9]">
          <Sparkles size={22} />
        </span>
        <h2 className="text-xl leading-snug">What do you want to achieve?</h2>
        <p className="text-sm text-muted">Tell Formflow AI your goal. It will help you build forms and get answers faster.</p>
        <button onClick={soon} className="mt-1 rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-selected">
          Help me get started
        </button>
      </div>
      <div className="rounded-xl border border-[#e6d8f7] p-2">
        <input
          readOnly
          onFocus={soon}
          placeholder="Ask Formflow AI"
          aria-label="Ask Formflow AI (coming soon)"
          className="w-full bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted"
        />
        <div className="mt-1 flex items-center gap-2 text-muted">
          <Mic size={15} />
          <Plus size={15} />
          <MoreHorizontal size={15} />
          <Send size={15} className="ml-auto" />
        </div>
      </div>
    </aside>
  );
}
