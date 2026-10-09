"use client";

import { Popover as RadixPopover } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Popover = RadixPopover.Root;
export const PopoverTrigger = RadixPopover.Trigger;

export function PopoverContent({ className, sideOffset = 8, ...props }: ComponentProps<typeof RadixPopover.Content>) {
  return (
    <RadixPopover.Portal>
      <RadixPopover.Content
        sideOffset={sideOffset}
        className={cn(
          "border-line bg-surface z-50 rounded-xl border p-4 shadow-xl outline-none data-[state=open]:animate-[pop-in_120ms_ease-out]",
          className,
        )}
        {...props}
      />
    </RadixPopover.Portal>
  );
}
