"use client";

import { Mic, MoreHorizontal, Plus, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

const soon = () => toast("Typeform AI is coming soon");

/** Left-hand AI assistant panel, as in Typeform's workspace. A placeholder for now. */
export function AiPanel() {
  return (
    <aside
      className="bg-surface hidden w-[300px] shrink-0 flex-col rounded-2xl border border-[#e6d8f7] p-4 xl:flex"
      aria-label="Typeform AI"
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <Sparkles size={16} className="text-[#7b4fc9]" /> Typeform AI
        <span className="bg-lavender text-ink rounded-md px-1.5 py-0.5 text-[11px]">Beta</span>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-2 text-center">
        <span className="bg-lavender flex h-12 w-12 items-center justify-center rounded-xl text-[#7b4fc9]">
          <Sparkles size={22} />
        </span>
        <h2 className="text-xl leading-snug">What do you want to achieve?</h2>
        <p className="text-muted text-sm">
          Tell Typeform AI your goal. It will help you build forms and get answers faster.
        </p>
        <button
          onClick={soon}
          className="border-line hover:bg-selected mt-1 rounded-lg border px-3 py-1.5 text-sm font-medium"
        >
          Help me get started
        </button>
      </div>
      <div className="rounded-xl border border-[#e6d8f7] p-2">
        <input
          readOnly
          onClick={soon}
          onKeyDown={(e) => {
            if (e.key.length === 1 || e.key === "Enter") {
              e.preventDefault();
              soon();
            }
          }}
          placeholder="Ask Typeform AI"
          aria-label="Ask Typeform AI (coming soon)"
          className="placeholder:text-muted w-full bg-transparent px-1 py-1 text-sm outline-none"
        />
        <div className="text-muted mt-1 flex items-center gap-1">
          {[
            { label: "Dictate audio message", icon: Mic },
            { label: "Add files", icon: Plus },
            { label: "More options", icon: MoreHorizontal },
          ].map(({ label, icon: Icon }) => (
            <button
              key={label}
              onClick={soon}
              aria-label={label}
              className="hover:bg-selected hover:text-ink rounded-md p-1"
            >
              <Icon size={15} />
            </button>
          ))}
          <button
            onClick={soon}
            aria-label="Send message"
            className="hover:bg-selected hover:text-ink ml-auto rounded-md p-1"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
