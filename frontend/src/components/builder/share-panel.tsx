"use client";

import { Code2, ExternalLink, Globe, Link2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { publicFormUrl } from "@/lib/format";
import { useBuilder } from "@/store/builder-store";

interface SharePanelProps {
  publishing: boolean;
  onPublish: () => void;
  onUnpublish: () => void;
}

async function copyLink(slug: string) {
  try {
    await navigator.clipboard.writeText(publicFormUrl(slug));
    toast.success("Link copied to clipboard");
  } catch {
    toast.error("Couldn't access the clipboard.");
  }
}

export function ShareLinkBox({ slug }: { slug: string }) {
  const url = publicFormUrl(slug);
  return (
    <div className="flex gap-2">
      <Button onClick={() => copyLink(slug)}>
        <Link2 size={15} /> Copy link
      </Button>
      <input
        readOnly
        value={url}
        onFocus={(e) => e.target.select()}
        aria-label="Public link"
        className="border-line bg-surface h-10 min-w-0 flex-1 rounded-lg border px-3 text-sm outline-none"
      />
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="border-line hover:bg-selected flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border"
        aria-label="Open form in a new tab"
      >
        <ExternalLink size={16} />
      </a>
    </div>
  );
}

/** "Share" tab: the public link and publish state (laid out like Typeform's share page). */
export function SharePanel({ publishing, onPublish, onUnpublish }: SharePanelProps) {
  const status = useBuilder((s) => s.status);
  const slug = useBuilder((s) => s.slug);
  const title = useBuilder((s) => s.title);
  const changed = useBuilder((s) => s.hasUnpublishedChanges);
  const version = useBuilder((s) => s.publishedVersion);
  const live = status === "published" && slug;

  return (
    <div className="bg-panel mx-3 mb-3 flex-1 overflow-y-auto rounded-2xl px-4 py-14 sm:mx-4 sm:mb-4">
      <div className="mx-auto max-w-2xl space-y-8">
        <h2 className="text-center text-2xl">Choose how you&apos;d like to share your form</h2>

        <section className="bg-surface space-y-5 rounded-2xl p-6">
          {live ? (
            <>
              <ShareLinkBox slug={slug} />
              <div className="border-line border-t pt-5">
                <p className="text-muted mb-2 flex items-center justify-between text-sm">
                  Link preview
                  <span className="bg-teal/15 text-teal rounded-full px-2 py-0.5 text-xs font-medium">
                    Live · v{version}
                  </span>
                </p>
                <div className="border-line flex items-center gap-4 rounded-xl border p-3">
                  <span className="bg-panel flex h-16 w-24 shrink-0 items-center justify-center rounded-lg text-sm font-semibold">
                    formflow
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{title}</p>
                    <p className="text-muted truncate text-sm">
                      Turn data collection into an experience with Formflow.
                    </p>
                    <p className="text-muted truncate text-xs">{new URL(publicFormUrl(slug), "http://x").host}</p>
                  </div>
                </div>
              </div>
              {changed && (
                <div className="bg-lavender/60 flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm">
                  You have changes that aren&apos;t live yet.
                  <Button size="sm" onClick={onPublish} disabled={publishing}>
                    Publish changes
                  </Button>
                </div>
              )}
              <button onClick={onUnpublish} className="text-muted hover:text-danger flex items-center gap-1.5 text-sm">
                <Undo2 size={15} /> Unpublish (stop accepting responses)
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <Globe size={22} />
              <p className="text-muted text-sm">Publish your form to get a shareable link.</p>
              <Button onClick={onPublish} disabled={publishing}>
                {publishing ? "Publishing…" : "Publish"}
              </Button>
            </div>
          )}
        </section>

        <section>
          <h3 className="mb-3 font-semibold">Embed form</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["On your website", "bg-[#d9b8f0]"],
              ["In your email", "bg-[#bfdcf7]"],
            ].map(([label, color]) => (
              <button
                key={label}
                onClick={() => toast(`${label}: coming soon`)}
                className="border-line bg-surface flex overflow-hidden rounded-xl border text-left text-sm hover:shadow-sm"
              >
                <span className={`flex h-24 w-28 shrink-0 items-center justify-center ${color}`}>
                  <Code2 size={20} className="text-ink/60" />
                </span>
                <span className="p-3">{label}</span>
              </button>
            ))}
          </div>
        </section>
        <div className="text-center">
          <button
            onClick={() => toast("More sharing options are coming soon")}
            className="border-line bg-surface hover:bg-selected rounded-lg border px-3 py-1.5 text-sm font-medium"
          >
            Explore other ways to share
          </button>
        </div>
      </div>
    </div>
  );
}
