"use client";

import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

/** Centered dialog with a dimmed backdrop. Radix handles focus trap, Escape and aria. */
export function Modal({ open, onOpenChange, title, description, children, className }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-[fade-in_150ms_ease-out]" />
        <Dialog.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-[calc(100vw-32px)] max-w-md -translate-x-1/2 -translate-y-1/2",
            "bg-surface rounded-xl p-6 shadow-xl outline-none data-[state=open]:animate-[pop-in_150ms_ease-out]",
            className,
          )}
        >
          <Dialog.Title className="pr-8 text-lg font-semibold">{title}</Dialog.Title>
          {description ? (
            <Dialog.Description className="text-muted mt-1 text-sm">{description}</Dialog.Description>
          ) : (
            <Dialog.Description className="sr-only">{title}</Dialog.Description>
          )}
          <Dialog.Close
            className="text-muted hover:bg-selected hover:text-ink absolute top-4 right-4 rounded-md p-1"
            aria-label="Close"
          >
            <X size={18} />
          </Dialog.Close>
          <div className="mt-5">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
