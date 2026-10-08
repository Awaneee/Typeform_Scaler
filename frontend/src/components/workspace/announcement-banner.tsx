"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "ff:banner-dismissed";

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
    <div className="flex items-center justify-center gap-3 bg-lavender px-10 py-2.5 text-center text-sm text-plum relative">
      <span>
        <strong className="font-semibold">New:</strong> Share your forms with a link and watch responses arrive in real time.
      </span>
      <button
        onClick={dismiss}
        className="absolute right-3 rounded-md p-1 hover:bg-white/50"
        aria-label="Dismiss announcement"
      >
        <X size={16} />
      </button>
    </div>
  );
}
