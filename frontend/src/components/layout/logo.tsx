import Link from "next/link";

/** A plain text wordmark in Typeform's style; no Typeform logo artwork is used. */
export function Logo({ href = "/workspace", showText = true }: { href?: string; showText?: boolean }) {
  return (
    <Link
      href={href}
      className="text-ink flex items-center gap-2 font-semibold tracking-tight"
      aria-label="Typeform clone home"
    >
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden>
        <rect x="8" y="3" width="10" height="20" rx="5" fill="currentColor" />
      </svg>
      {showText && <span className="text-[17px]">typeform</span>}
    </Link>
  );
}
