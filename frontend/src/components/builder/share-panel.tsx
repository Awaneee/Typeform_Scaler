"use client";

import { Code2, Copy, ExternalLink, Globe, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { publicFormUrl } from "@/lib/format";
import { useBuilder } from "@/store/builder-store";

interface SharePanelProps {
  publishing: boolean;
  onPublish: () => void;
  onUnpublish: () => void;
}

export async function copyLink(slug: string) {
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
      <input
        readOnly
        value={url}
        onFocus={(e) => e.target.select()}
        aria-label="Public link"
        className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 text-sm outline-none"
      />
      <Button onClick={() => copyLink(slug)}>
        <Copy size={15} /> Copy
      </Button>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-line hover:bg-selected"
        aria-label="Open form in a new tab"
      >
        <ExternalLink size={16} />
      </a>
    </div>
  );
}

/** "Share" tab: the public link and publish state. */
export function SharePanel({ publishing, onPublish, onUnpublish }: SharePanelProps) {
  const status = useBuilder((s) => s.status);
  const slug = useBuilder((s) => s.slug);
  const changed = useBuilder((s) => s.hasUnpublishedChanges);
  const version = useBuilder((s) => s.publishedVersion);
  const live = status === "published" && slug;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <section className="rounded-xl border border-line bg-surface p-6">
          <div className="mb-4 flex items-center gap-2">
            <Globe size={18} />
            <h2 className="text-lg font-semibold">Share the link</h2>
            <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${live ? "bg-[#DDF3EA] text-teal" : "bg-selected text-muted"}`}>
              {live ? `Live · v${version}` : "Not published"}
            </span>
          </div>
          {live ? (
            <div className="space-y-4">
              <p className="text-sm text-muted">Anyone with this link can fill in your form. No login needed.</p>
              <ShareLinkBox slug={slug} />
              {changed && (
                <div className="flex items-center justify-between gap-3 rounded-lg bg-lavender/60 px-4 py-3 text-sm text-plum">
                  You have changes that aren&apos;t live yet.
                  <Button size="sm" onClick={onPublish} disabled={publishing}>
                    Publish changes
                  </Button>
                </div>
              )}
              <button onClick={onUnpublish} className="flex items-center gap-1.5 text-sm text-muted hover:text-danger">
                <Undo2 size={15} /> Unpublish (stop accepting responses)
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted">Publish your form to get a shareable link.</p>
              <Button onClick={onPublish} disabled={publishing}>
                {publishing ? "Publishing…" : "Publish"}
              </Button>
            </div>
          )}
        </section>
        <section className="flex items-center gap-3 rounded-xl border border-dashed border-line p-6 text-sm text-muted">
          <Code2 size={18} /> Embed in a web page, email or QR code: coming soon.
        </section>
      </div>
    </div>
  );
}
