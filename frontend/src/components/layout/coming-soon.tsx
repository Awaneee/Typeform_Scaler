import { Sparkles } from "lucide-react";

export function ComingSoon({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-24 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-lavender text-ink">
        <Sparkles size={22} />
      </div>
      <h2 className="text-xl font-semibold">{title} is coming soon</h2>
      <p className="max-w-sm text-sm text-muted">
        {description ?? "We're working on it. In the meantime, everything you need is under Forms."}
      </p>
    </div>
  );
}
