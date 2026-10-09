"use client";

import { Dialog } from "radix-ui";
import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";
import { QuestionTypeBadge } from "@/components/questions/question-icon";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/client";
import { resultsApi } from "@/lib/api/results";
import { formatDateTime } from "@/lib/format";
import type { QuestionType } from "@/types/form";
import type { SubmissionDetail } from "@/types/results";

interface ResponseDrawerProps {
  formId: string;
  submissionId: string | null;
  onClose: () => void;
}

/** Side panel with one full response, shown with the questions exactly as that respondent saw them. */
export function ResponseDrawer({ formId, submissionId, onClose }: ResponseDrawerProps) {
  const [detail, setDetail] = useState<SubmissionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!submissionId) return;
    let cancelled = false;
    resultsApi.submission(formId, submissionId).then(
      (d) => !cancelled && setDetail(d),
      (e) => !cancelled && setError(e instanceof ApiError ? e.message : "Couldn't load this response."),
    );
    return () => {
      cancelled = true;
      setDetail(null);
      setError(null);
    };
  }, [formId, submissionId]);

  return (
    <Dialog.Root open={submissionId !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/20 data-[state=open]:animate-[fade-in_150ms_ease-out]" />
        <Dialog.Content className="bg-surface fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col shadow-2xl outline-none data-[state=open]:animate-[slide-in_200ms_ease-out]">
          <div className="border-line flex items-start justify-between border-b px-6 py-4">
            <div>
              <Dialog.Title className="text-lg font-semibold">
                {detail ? `Response #${detail.number}` : "Response"}
              </Dialog.Title>
              <Dialog.Description className="text-muted text-xs">
                {detail ? `${formatDateTime(detail.submitted_at)} · form version ${detail.version_number}` : "Loading…"}
              </Dialog.Description>
            </div>
            <Dialog.Close className="text-muted hover:bg-selected hover:text-ink rounded-md p-1.5" aria-label="Close">
              <X size={18} />
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {error ? (
              <p className="text-danger text-sm">{error}</p>
            ) : !detail ? (
              <div className="space-y-5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-3.5 w-2/3" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                ))}
              </div>
            ) : (
              <ol className="space-y-5">
                {detail.answers.map((a, i) => (
                  <li key={a.question_id} className="flex gap-3">
                    <QuestionTypeBadge type={a.type as QuestionType} number={i + 1} />
                    <div className="min-w-0">
                      <p className="text-muted text-sm">{a.title || "Untitled question"}</p>
                      {a.file_url ? (
                        <a
                          href={a.file_url}
                          download
                          className="text-teal mt-1 inline-flex items-center gap-1.5 font-medium hover:underline"
                        >
                          <Download size={15} /> {a.display}
                        </a>
                      ) : (
                        <p className={`mt-1 whitespace-pre-line ${a.display ? "" : "text-muted text-sm italic"}`}>
                          {a.display ?? "No answer"}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
