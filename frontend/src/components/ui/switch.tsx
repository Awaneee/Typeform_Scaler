"use client";

import { Switch as RadixSwitch } from "radix-ui";
import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  "aria-label"?: string;
}

export function Switch({ checked, onCheckedChange, id, ...rest }: SwitchProps) {
  return (
    <RadixSwitch.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={rest["aria-label"]}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full transition-colors outline-none",
        "focus-visible:ring-2 focus-visible:ring-plum focus-visible:ring-offset-2",
        checked ? "bg-ink" : "bg-switch-off",
      )}
    >
      <RadixSwitch.Thumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-surface shadow transition-transform data-[state=checked]:translate-x-[18px]" />
    </RadixSwitch.Root>
  );
}
