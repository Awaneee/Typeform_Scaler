"use client";

import { BarChart3, Copy, Ellipsis, Eye, Globe, Link2, Pencil, PencilLine, Trash2, Undo2 } from "lucide-react";
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
        className={cn("rounded-md p-1.5 text-muted hover:bg-selected hover:text-ink data-[state=open]:bg-selected", className)}
        aria-label={`Actions for ${form.title}`}
        onClick={(e) => e.stopPropagation()}
      >
        <Ellipsis size={18} />
      </MenuTrigger>
      <MenuContent onClick={(e) => e.stopPropagation()}>
        <MenuItem icon={<Pencil size={15} />} onSelect={() => router.push(`/forms/${form.id}/edit`)}>
          Open
        </MenuItem>
        <MenuItem icon={<Eye size={15} />} onSelect={() => window.open(`/forms/${form.id}/preview`, "_blank")}>
          Preview
        </MenuItem>
        <MenuItem icon={<BarChart3 size={15} />} onSelect={() => router.push(`/forms/${form.id}/results`)}>
          Results
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon={<PencilLine size={15} />} onSelect={onRename}>
          Rename
        </MenuItem>
        <MenuItem icon={<Copy size={15} />} onSelect={() => actions.duplicate(form)}>
          Duplicate
        </MenuItem>
        <MenuSeparator />
        {published ? (
          <>
            <MenuItem icon={<Link2 size={15} />} onSelect={() => actions.copyLink(form)}>
              Copy link
            </MenuItem>
            <MenuItem icon={<Undo2 size={15} />} onSelect={() => actions.unpublish(form)}>
              Unpublish
            </MenuItem>
          </>
        ) : (
          <MenuItem icon={<Globe size={15} />} onSelect={() => actions.publish(form)}>
            Publish
          </MenuItem>
        )}
        <MenuSeparator />
        <MenuItem icon={<Trash2 size={15} />} destructive onSelect={onDelete}>
          Delete
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
