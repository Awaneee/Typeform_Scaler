"use client";

import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Borderless textarea that grows with its content: used for inline editing on the canvas. */
export function AutoTextarea({ className, value, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      className={cn("block w-full resize-none overflow-hidden bg-transparent outline-none", className)}
      {...props}
    />
  );
}
