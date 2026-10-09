"use client";

import { Gem, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const STORAGE_KEY = "ff:banner-dismissed";

/** Typeform-style mint announcement card with an action and a close button. */
export function AnnouncementBanner() {
  // Hidden until we know it wasn't dismissed, to avoid a flash on reload.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(STORAGE_KEY) === "1";
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser storage after mount
    setVisible(!dismissed);
  }, []);

  if (!visible) return null;

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
  }

  return (
    <div className="border-teal/40 bg-teal/5 relative flex items-center justify-center gap-3 rounded-xl border px-12 py-3 text-center text-[15px]">
      <Gem size={18} className="text-teal hidden shrink-0 sm:block" />
      <span>
        Share your forms with a link and watch <strong className="font-semibold">responses arrive in real time</strong>.
      </span>
      <button
        onClick={() => toast("Plans are coming soon")}
        className="bg-teal hidden shrink-0 rounded-md px-2.5 py-1 text-sm font-medium text-white hover:brightness-110 md:block"
      >
        Get more responses
      </button>
      <button
        onClick={dismiss}
        className="absolute right-3 rounded-md p-1 hover:bg-black/5"
        aria-label="Dismiss announcement"
      >
        <X size={18} />
      </button>
    </div>
  );
}
