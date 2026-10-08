"use client";

import { AlertCircle, Check, Loader2 } from "lucide-react";
import { flushSave, useBuilder } from "@/store/builder-store";

export function SaveIndicator() {
  const status = useBuilder((s) => s.saveStatus);
  const error = useBuilder((s) => s.saveError);

  if (status === "saving" || status === "unsaved") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted" role="status">
        <Loader2 size={14} className="animate-spin" /> Saving…
      </span>
    );
  }
  if (status === "error") {
    return (
      <button onClick={() => void flushSave()} className="flex items-center gap-1.5 text-xs text-danger" title={error ?? undefined}>
        <AlertCircle size={14} /> Couldn&apos;t save · Retry
      </button>
    );
  }
  if (status === "conflict") {
    return (
      <button onClick={() => window.location.reload()} className="flex items-center gap-1.5 text-xs text-danger" title={error ?? undefined}>
        <AlertCircle size={14} /> Changed elsewhere · Reload
      </button>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted" role="status">
      <Check size={14} /> All changes saved
    </span>
  );
}
