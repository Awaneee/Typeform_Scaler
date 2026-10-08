import type { Theme } from "@/lib/themes";

/** Typeform's small square question-number badge (shown before the question title). */
export function QuestionNumber({ number, theme }: { number: number; theme: Theme }) {
  return (
    <span
      className="mt-[7px] inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center self-start rounded-[4px] px-1 text-[11px] leading-none font-bold sm:mt-[9px]"
      style={{ background: theme.answer, color: theme.background }}
      aria-hidden
    >
      {number}
    </span>
  );
}
