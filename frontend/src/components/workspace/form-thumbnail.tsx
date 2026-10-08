import { getTheme } from "@/lib/themes";
import { cn } from "@/lib/utils";
import type { ThemeName } from "@/types/form";

/** Small square in the form's theme colours, like Typeform's list thumbnails. */
export function FormThumbnail({ theme, title, className }: { theme: ThemeName; title: string; className?: string }) {
  const t = getTheme(theme);
  return (
    <div
      className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-black/5 text-sm font-semibold", className)}
      style={{ background: t.background, color: t.answer }}
      aria-hidden
    >
      {title.trim().charAt(0).toUpperCase() || "?"}
    </div>
  );
}

export function StatusBadge({ status, changed }: { status: "draft" | "published"; changed?: boolean }) {
  if (status === "published") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-teal">
        <span className="h-1.5 w-1.5 rounded-full bg-teal" />
        {changed ? "Live · unpublished changes" : "Live"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <span className="h-1.5 w-1.5 rounded-full bg-muted/60" />
      Draft
    </span>
  );
}
