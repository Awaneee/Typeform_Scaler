"use client";

import { ArrowLeft, FileUp, LayoutTemplate, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
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
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-14 items-center gap-4 border-b border-line bg-surface px-4 sm:px-6">
        <Link href="/workspace" className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm hover:bg-selected">
          <ArrowLeft size={16} /> Back
        </Link>
        <Logo />
      </header>

      <main className="flex flex-1 flex-col items-center px-4 pt-[12vh] pb-16">
        <h1 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">What would you like to create?</h1>
        <p className="mt-3 text-center text-muted">Start from scratch, or describe your form and let AI draft it.</p>

        <div className="mt-8 w-full max-w-2xl rounded-2xl border border-line bg-surface p-2 shadow-sm">
          <textarea
            rows={3}
            disabled
            placeholder="e.g. A registration form for a tech meetup that asks for name, email and t-shirt size"
            className="w-full resize-none rounded-xl bg-transparent p-3 text-[15px] outline-none placeholder:text-muted disabled:cursor-not-allowed"
            aria-label="Describe your form (AI generation coming soon)"
          />
          <div className="flex items-center justify-between px-2 pb-1">
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <Sparkles size={14} /> AI generation is coming soon
            </span>
            <Button size="sm" disabled>
              Generate
            </Button>
          </div>
        </div>

        <div className="mt-8 grid w-full max-w-2xl gap-3 sm:grid-cols-3">
          <button
            onClick={startFromScratch}
            disabled={creating}
            className="flex flex-col items-start gap-3 rounded-xl border-2 border-plum bg-surface p-4 text-left transition-colors hover:bg-selected disabled:opacity-60"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-plum text-white">
              <Plus size={18} />
            </span>
            <span>
              <span className="block text-sm font-semibold">{creating ? "Creating…" : "Start from scratch"}</span>
              <span className="text-xs text-muted">Build with a blank form</span>
            </span>
          </button>
          <OptionSoon icon={<LayoutTemplate size={18} />} title="Use a template" text="Pick a ready-made form" />
          <OptionSoon icon={<FileUp size={18} />} title="Import questions" text="From a doc or another tool" />
        </div>
      </main>
    </div>
  );
}

function OptionSoon({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <button
      onClick={() => toast(`${title} is coming soon`)}
      className="flex flex-col items-start gap-3 rounded-xl border border-line bg-surface p-4 text-left transition-colors hover:bg-selected"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-lavender text-plum">{icon}</span>
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="text-xs text-muted">{text}</span>
      </span>
    </button>
  );
}
