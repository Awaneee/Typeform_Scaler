"use client";

import { Ellipsis } from "lucide-react";
import { useRouter } from "next/navigation";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { cn } from "@/lib/utils";
import type { FormSummary } from "@/types/form";
import type { WorkspaceActions } from "@/hooks/use-workspace";

interface FormActionsMenuProps {
  form: FormSummary;
  actions: WorkspaceActions;
  onRename: () => void;
  onDelete: () => void;
  className?: string;
}

export function FormActionsMenu({ form, actions, onRename, onDelete, className }: FormActionsMenuProps) {
  const router = useRouter();
  const published = form.status === "published";

  return (
    <Menu>
      <MenuTrigger
        className={cn(
          "text-muted hover:bg-selected hover:text-ink data-[state=open]:bg-selected rounded-md p-1.5",
          className,
        )}
        aria-label={`Actions for ${form.title}`}
        onClick={(e) => e.stopPropagation()}
      >
        <Ellipsis size={18} />
      </MenuTrigger>
      <MenuContent onClick={(e) => e.stopPropagation()} className="min-w-48 p-1.5">
        {published && (
          <>
            <MenuItem onSelect={() => actions.copyLink(form)}>Copy link</MenuItem>
            <MenuSeparator />
          </>
        )}
        <MenuItem onSelect={() => router.push(`/forms/${form.id}/edit`)}>Content</MenuItem>
        <MenuItem onSelect={() => window.open(`/forms/${form.id}/preview`, "_blank")}>Preview</MenuItem>
        <MenuItem onSelect={() => router.push(`/forms/${form.id}/results`)}>Results</MenuItem>
        <MenuSeparator />
        <MenuItem onSelect={onRename}>Rename</MenuItem>
        <MenuItem onSelect={() => actions.duplicate(form)}>Duplicate</MenuItem>
        {published ? (
          <MenuItem onSelect={() => actions.unpublish(form)}>Unpublish</MenuItem>
        ) : (
          <MenuItem onSelect={() => actions.publish(form)}>Publish</MenuItem>
        )}
        <MenuSeparator />
        <MenuItem destructive onSelect={onDelete}>
          Delete
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
