"use client";

import { DropdownMenu } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Styled wrappers around Radix DropdownMenu (keyboard nav, focus and aria come from Radix). */
export const Menu = DropdownMenu.Root;
export const MenuTrigger = DropdownMenu.Trigger;

export function MenuContent({ className, align = "end", ...props }: ComponentProps<typeof DropdownMenu.Content>) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        align={align}
        sideOffset={6}
        className={cn(
          "z-50 min-w-52 rounded-lg border border-line bg-surface p-1 shadow-lg",
          "data-[state=open]:animate-[pop-in_120ms_ease-out]",
          className,
        )}
        {...props}
      />
    </DropdownMenu.Portal>
  );
}

interface MenuItemProps extends ComponentProps<typeof DropdownMenu.Item> {
  icon?: ReactNode;
  destructive?: boolean;
}

export function MenuItem({ icon, destructive, className, children, ...props }: MenuItemProps) {
  return (
    <DropdownMenu.Item
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm outline-none select-none",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-selected",
        destructive ? "text-danger" : "text-ink",
        className,
      )}
      {...props}
    >
      {icon && <span className="flex w-4 justify-center">{icon}</span>}
      {children}
    </DropdownMenu.Item>
  );
}

export function MenuSeparator() {
  return <DropdownMenu.Separator className="my-1 h-px bg-line" />;
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <DropdownMenu.Label className="px-2.5 pt-2 pb-1 text-xs font-medium text-muted">{children}</DropdownMenu.Label>;
}

export const MenuRadioGroup = DropdownMenu.RadioGroup;

export function MenuRadioItem({ className, children, ...props }: ComponentProps<typeof DropdownMenu.RadioItem>) {
  return (
    <DropdownMenu.RadioItem
      className={cn(
        "flex cursor-pointer items-center justify-between gap-4 rounded-md px-2.5 py-2 text-sm outline-none select-none",
        "data-[highlighted]:bg-selected data-[state=checked]:font-medium",
        className,
      )}
      {...props}
    >
      {children}
      <DropdownMenu.ItemIndicator>✓</DropdownMenu.ItemIndicator>
    </DropdownMenu.RadioItem>
  );
}
