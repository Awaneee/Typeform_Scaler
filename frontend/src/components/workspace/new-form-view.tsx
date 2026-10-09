"use client";

import { ChevronRight, FileUp, Mic, MoreHorizontal, PanelsTopLeft, Plus, Send, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { formsApi } from "@/lib/api/forms";

const aiSoon = () => toast("Typeform AI form generation is coming soon. Start from scratch for now.");

export function NewFormView() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  async function startFromScratch() {
    setCreating(true);
    try {
      const form = await formsApi.create("My new form");
      router.push(`/forms/${form.id}/edit`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't create the form.");
      setCreating(false);
    }
  }

  return (
    <div className="bg-surface flex min-h-dvh flex-col">
      <header className="flex h-12 items-center gap-1 px-4">
        <Link
          href="/workspace"
          className="text-muted hover:bg-selected hover:text-ink flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm"
        >
          <PanelsTopLeft size={16} /> Forms
        </Link>
        <ChevronRight size={14} className="text-muted" aria-hidden />
        <span className="px-1.5 text-sm">New form</span>
      </header>

      <main className="bg-panel mx-3 mb-3 flex flex-1 flex-col items-center justify-center rounded-2xl px-4 py-16 sm:mx-4 sm:mb-4">
        <p className="text-muted text-sm">Typeform AI</p>
        <h1 className="mt-2 text-center text-2xl sm:text-[26px]">What would you like to create?</h1>

        {/* Lavender glow around the prompt, like Typeform's AI box. AI generation is a placeholder:
            every control in it answers with a "coming soon" toast. */}
        <div className="mt-8 w-full max-w-xl rounded-2xl bg-[#f3e9fc] p-1.5 shadow-[0_0_0_1px_#e6d8f7]">
          <div className="bg-surface rounded-xl border border-[#c9a8ee] p-2">
            <textarea
              rows={3}
              readOnly
              onClick={aiSoon}
              onKeyDown={(e) => {
                if (e.key.length === 1 || e.key === "Enter") {
                  e.preventDefault();
                  aiSoon();
                }
              }}
              placeholder="Explain the goal"
              className="placeholder:text-muted w-full cursor-text resize-none bg-transparent px-1.5 py-1 text-sm outline-none"
              aria-label="Explain the goal (AI generation coming soon)"
            />
            <div className="text-muted flex items-center gap-1">
              {[
                { label: "Dictate audio message", icon: Mic },
                { label: "Add files", icon: Plus },
                { label: "More options", icon: MoreHorizontal },
              ].map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  onClick={aiSoon}
                  aria-label={label}
                  className="hover:bg-selected hover:text-ink rounded-md p-1.5"
                >
                  <Icon size={15} />
                </button>
              ))}
              <span className="ml-auto flex items-center gap-1.5 text-xs">
                <Sparkles size={13} /> Coming soon
              </span>
              <button
                onClick={aiSoon}
                aria-label="Generate form"
                className="border-line hover:bg-selected hover:text-ink rounded-md border p-1.5"
              >
                <Send size={13} />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-line my-8 h-px w-full max-w-md" />

        <div className="grid w-full max-w-md gap-3 sm:grid-cols-2">
          <button
            onClick={startFromScratch}
            disabled={creating}
            className="bg-hover-strong hover:bg-line rounded-xl px-4 py-3 text-sm font-medium transition-colors disabled:opacity-60"
          >
            {creating ? "Creating…" : "Start from scratch"}
          </button>
          <OptionSoon icon={<FileUp size={16} />} title="Import questions" />
        </div>
      </main>
    </div>
  );
}

function OptionSoon({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <button
      onClick={() => toast(`${title} is coming soon`)}
      className="bg-hover-strong text-muted hover:bg-line hover:text-ink flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors"
    >
      {icon} {title}
    </button>
  );
}
