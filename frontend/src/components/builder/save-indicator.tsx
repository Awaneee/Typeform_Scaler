"use client";

import { AlertCircle, Check, Loader2 } from "lucide-react";
import { flushSave, useBuilder } from "@/store/builder-store";

export function SaveIndicator() {
  const status = useBuilder((s) => s.saveStatus);
  const error = useBuilder((s) => s.saveError);

  if (status === "saving" || status === "unsaved") {
    return (
      <span className="text-muted flex items-center gap-1.5 text-xs" role="status">
        <Loader2 size={14} className="animate-spin" /> Saving…
      </span>
    );
  }
  if (status === "error") {
    return (
      <button
        onClick={() => void flushSave()}
        className="text-danger flex items-center gap-1.5 text-xs"
        title={error ?? undefined}
      >
        <AlertCircle size={14} /> Couldn&apos;t save · Retry
      </button>
    );
  }
  if (status === "conflict") {
    return (
      <button
        onClick={() => window.location.reload()}
        className="text-danger flex items-center gap-1.5 text-xs"
        title={error ?? undefined}
      >
        <AlertCircle size={14} /> Changed elsewhere · Reload
      </button>
    );
  }
  return (
    <span className="text-muted flex items-center gap-1.5 text-xs" role="status">
      <Check size={14} /> All changes saved
    </span>
  );
}
