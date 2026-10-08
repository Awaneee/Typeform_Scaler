"use client";

import { Eye, X } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { formsApi } from "@/lib/api/forms";
import type { FormDetail } from "@/types/form";
import { FormRunner } from "./form-runner";
import { LoadingScreen, StatusScreen } from "./public-form";

/** /forms/[id]/preview: the real respondent flow on the *draft*. Nothing is submitted. */
export function PreviewFormView({ formId }: { formId: string }) {
  const [form, setForm] = useState<FormDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    formsApi.get(formId).then(setForm, (e) => setError(e instanceof ApiError ? e.message : "Couldn't load the preview."));
  }, [formId]);

  if (error) return <StatusScreen title="Preview unavailable" text={error} />;
  if (!form) return <LoadingScreen />;

  return (
    <div className="relative">
      <div className="fixed top-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-full bg-[#191919] py-1.5 pr-1.5 pl-4 text-xs whitespace-nowrap text-white shadow-lg">
        <Eye size={14} />
        <span>
          Preview<span className="hidden sm:inline"> mode · responses aren&apos;t saved</span>
        </span>
        <button onClick={() => window.close()} className="rounded-full p-1 hover:bg-white/20" aria-label="Close preview">
          <X size={14} />
        </button>
      </div>
      <FormRunner form={form} mode={{ kind: "preview" }} />
    </div>
  );
}
