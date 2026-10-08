"use client";

import { Toaster } from "sonner";
import { useColorMode } from "@/lib/color-mode";

export function ThemedToaster() {
  const { resolved } = useColorMode();
  return <Toaster theme={resolved} position="bottom-center" toastOptions={{ className: "!rounded-lg !text-sm" }} />;
}
