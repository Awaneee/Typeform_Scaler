"use client";

import { FileText, Loader2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { withAlpha } from "@/lib/color";
import type { AnswerProps } from "./types";

export interface UploadedFile {
  id: string;
  filename: string;
  size_bytes: number;
}

const formatSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/** Typeform-style drop zone. The file uploads immediately; the answer value is the upload id. */
export function FileAnswer({ question, theme, preview, upload }: AnswerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const maxMb = question.settings.max_size_mb ?? 10;
  const current = upload?.current;

  async function send(file: File | undefined) {
    if (!file || !upload || preview) return;
    setError(null);
    if (file.size > maxMb * 1024 * 1024) {
      setError(`Files can be at most ${maxMb} MB.`);
      return;
    }
    setBusy(true);
    try {
      await upload.send(file);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (current) {
    return (
      <div
        className="flex w-full max-w-xl items-center gap-3 rounded-[4px] border px-4 py-3"
        style={{ color: theme.answer, borderColor: withAlpha(theme.answer, 0.6), background: withAlpha(theme.answer, 0.1) }}
      >
        <FileText size={22} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{current.filename}</p>
          <p className="text-xs opacity-75">{formatSize(current.size_bytes)}</p>
        </div>
        <button onClick={() => upload?.clear()} aria-label="Remove file" className="rounded p-1 hover:bg-black/5">
          <X size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl">
      <button
        type="button"
        disabled={preview || busy}
        tabIndex={preview ? -1 : undefined}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void send(e.dataTransfer.files[0]);
        }}
        className="flex w-full flex-col items-center gap-2 rounded-[4px] border border-dashed px-6 py-10 text-center transition-colors disabled:cursor-default"
        style={{
          color: theme.answer,
          borderColor: withAlpha(theme.answer, 0.6),
          background: withAlpha(theme.answer, dragging ? 0.2 : 0.06),
        }}
      >
        {busy ? <Loader2 size={28} className="animate-spin" /> : <Upload size={28} />}
        <span className="text-base">
          {busy ? (
            "Uploading…"
          ) : (
            <>
              <strong>Choose file</strong> or <strong>drag here</strong>
            </>
          )}
        </span>
        <span className="text-xs opacity-75">Size limit: {maxMb} MB</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        tabIndex={-1}
        aria-label={question.title || "Upload a file"}
        onChange={(e) => {
          void send(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {error && (
        <p className="mt-2 text-sm text-[#AF0404]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
