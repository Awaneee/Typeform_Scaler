"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

interface RenameDialogProps {
  initialTitle: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (title: string) => Promise<unknown>;
}

/** Mounted only while open, so the input always starts from the current title. */
export function RenameDialog({ initialTitle, onOpenChange, onSubmit }: RenameDialogProps) {
  const [title, setTitle] = useState(initialTitle);
  const [busy, setBusy] = useState(false);
  const trimmed = title.trim();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!trimmed || busy) return;
    setBusy(true);
    await onSubmit(trimmed);
    setBusy(false);
    onOpenChange(false);
  }

  return (
    <Modal open onOpenChange={onOpenChange} title="Rename form">
      <form onSubmit={submit} className="space-y-5">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={255} autoFocus aria-label="Form name" />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={!trimmed || busy}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
