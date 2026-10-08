"use client";

import { useSyncExternalStore } from "react";

export type ColorMode = "light" | "dark" | "system";
export const COLOR_MODE_KEY = "ff:color-mode";

/** Runs inline in <head> before first paint (see app/layout.tsx), so there is no light flash. */
export const COLOR_MODE_SCRIPT = `(function(){try{var p=localStorage.getItem("${COLOR_MODE_KEY}")||"system";var d=p==="dark"||(p==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.setAttribute("data-theme",d?"dark":"light")}catch(e){}})()`;

function readPreference(): ColorMode {
  try {
    const v = localStorage.getItem(COLOR_MODE_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

function resolve(pref: ColorMode): "light" | "dark" {
  if (pref !== "system") return pref;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function setColorMode(pref: ColorMode) {
  try {
    localStorage.setItem(COLOR_MODE_KEY, pref);
  } catch {}
  document.documentElement.setAttribute("data-theme", resolve(pref));
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Follow the OS setting live while the preference is "system".
  const media = matchMedia("(prefers-color-scheme: dark)");
  const onSystemChange = () => {
    if (readPreference() === "system") setColorMode("system");
  };
  media.addEventListener("change", onSystemChange);
  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", onSystemChange);
  };
}

/** Current preference and the theme actually applied. Server render assumes light/system. */
export function useColorMode() {
  const preference = useSyncExternalStore(subscribe, readPreference, () => "system" as ColorMode);
  const resolved = useSyncExternalStore<"light" | "dark">(
    subscribe,
    () => (document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"),
    () => "light",
  );
  return { preference, resolved };
}
