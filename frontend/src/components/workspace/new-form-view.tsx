"use client";

import { ChevronRight, FileUp, Mic, MoreHorizontal, PanelsTopLeft, Plus, Send, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { formsApi } from "@/lib/api/forms";

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
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="flex h-12 items-center gap-1 px-4">
        <Link href="/workspace" className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm text-muted hover:bg-selected hover:text-ink">
          <PanelsTopLeft size={16} /> Forms
        </Link>
        <ChevronRight size={14} className="text-muted" aria-hidden />
        <span className="px-1.5 text-sm">New form</span>
      </header>

      <main className="mx-3 mb-3 flex flex-1 flex-col items-center justify-center rounded-2xl bg-panel px-4 py-16 sm:mx-4 sm:mb-4">
        <p className="text-sm text-muted">Formflow AI</p>
        <h1 className="mt-2 text-center text-2xl sm:text-[26px]">What would you like to create?</h1>

        {/* Lavender glow around the prompt, like Typeform's AI box. */}
        <div className="mt-8 w-full max-w-xl rounded-2xl bg-[#f3e9fc] p-1.5 shadow-[0_0_0_1px_#e6d8f7]">
          <div className="rounded-xl border border-[#c9a8ee] bg-surface p-2">
            <textarea
              rows={3}
              disabled
              placeholder="Explain the goal"
              className="w-full resize-none bg-transparent px-1.5 py-1 text-sm outline-none placeholder:text-muted disabled:cursor-not-allowed"
              aria-label="Explain the goal (AI generation coming soon)"
            />
            <div className="flex items-center gap-2 px-1 text-muted">
              <Mic size={15} />
              <Plus size={15} />
              <MoreHorizontal size={15} />
              <span className="ml-auto flex items-center gap-1.5 text-xs">
                <Sparkles size={13} /> Coming soon
              </span>
              <span className="rounded-md border border-line p-1 opacity-50">
                <Send size={13} />
              </span>
            </div>
          </div>
        </div>

        <div className="my-8 h-px w-full max-w-md bg-line" />

        <div className="grid w-full max-w-md gap-3 sm:grid-cols-2">
          <button
            onClick={startFromScratch}
            disabled={creating}
            className="rounded-xl bg-hover-strong px-4 py-3 text-sm font-medium transition-colors hover:bg-line disabled:opacity-60"
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
      className="flex items-center justify-center gap-2 rounded-xl bg-hover-strong px-4 py-3 text-sm font-medium text-muted transition-colors hover:bg-line hover:text-ink"
    >
      {icon} {title}
    </button>
  );
}
