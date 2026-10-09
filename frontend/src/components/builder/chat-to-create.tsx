"use client";

import { Mic, SendHorizontal } from "lucide-react";
import { toast } from "sonner";

const soon = () => toast("Chat to create (Typeform AI) is coming soon");

/** Typeform's AI prompt bar under the canvas. A placeholder: any interaction shows "coming soon". */
export function ChatToCreate() {
  return (
    <div className="hidden justify-center md:flex">
      <div className="bg-surface flex w-full max-w-sm items-center gap-2 rounded-xl border border-[#d9c6f2] p-1.5 shadow-[0_0_0_4px_rgba(217,198,242,0.35)]">
        <button
          onClick={soon}
          className="text-muted hover:text-ink rounded-md p-1.5"
          aria-label="Dictate (coming soon)"
        >
          <Mic size={16} />
        </button>
        <input
          readOnly
          onClick={soon}
          onKeyDown={soon}
          placeholder="Chat to create"
          aria-label="Chat to create (coming soon)"
          className="placeholder:text-muted min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
        <button onClick={soon} className="text-muted hover:text-ink rounded-md p-1.5" aria-label="Send (coming soon)">
          <SendHorizontal size={16} />
        </button>
      </div>
    </div>
  );
}
