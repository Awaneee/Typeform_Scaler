import Link from "next/link";

/** Our own wordmark (we mimic Typeform's layout, not its brand assets). */
export function Logo({ href = "/workspace", showText = true }: { href?: string; showText?: boolean }) {
  return (
    <Link
      href={href}
      className="text-ink flex items-center gap-2 font-semibold tracking-tight"
      aria-label="Formflow home"
    >
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden>
        <rect width="26" height="26" rx="7" fill="var(--tf-plum)" />
        <path
          d="M8 18V8h9M8 13h6"
          stroke="white"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      {showText && <span className="text-[17px]">formflow</span>}
    </Link>
  );
}
