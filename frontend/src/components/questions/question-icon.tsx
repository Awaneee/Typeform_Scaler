import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuestionType } from "@/types/form";
import { QUESTION_REGISTRY } from "./registry";

interface BadgeProps {
  icon: LucideIcon;
  bg: string;
  fg: string;
  number?: number;
  className?: string;
}

/** Pastel rounded badge with the type icon (and optional question number). */
export function TypeBadge({ icon: Icon, bg, fg, number, className }: BadgeProps) {
  return (
    <span
      className={cn("inline-flex h-6 shrink-0 items-center gap-1 rounded-md px-1.5 text-xs font-semibold", className)}
      style={{ background: bg, color: fg }}
    >
      <Icon size={14} strokeWidth={2.2} />
      {number !== undefined && <span className="tabular-nums">{number}</span>}
    </span>
  );
}

export function QuestionTypeBadge({
  type,
  number,
  className,
}: {
  type: QuestionType;
  number?: number;
  className?: string;
}) {
  const meta = QUESTION_REGISTRY[type];
  return <TypeBadge icon={meta.icon} bg={meta.bg} fg={meta.fg} number={number} className={className} />;
}
