"use client";

import { CircleHelp, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { formsApi } from "@/lib/api/forms";
import type { Me } from "@/types/form";

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Loads the default creator for pages that don't already have it. */
export function useMe() {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    formsApi.me().then(setMe, () => {});
  }, []);
  return me;
}

export function HelpButton() {
  return (
    <button
      onClick={() => toast("Help center is coming soon")}
      className="hover:bg-selected rounded-md p-2"
      aria-label="Help"
    >
      <CircleHelp size={18} />
    </button>
  );
}

export function ProfileMenu({ me }: { me: Me | null }) {
  return (
    <Menu>
      <MenuTrigger
        className="bg-teal ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
        aria-label="Profile"
      >
        {me ? initials(me.name) : ""}
      </MenuTrigger>
      <MenuContent>
        <div className="px-2.5 py-2">
          <p className="text-sm font-medium">{me?.name}</p>
          <p className="text-muted text-xs">{me?.email}</p>
        </div>
        <MenuSeparator />
        <MenuItem icon={<LogOut size={15} />} onSelect={() => toast("Sign out is coming soon")}>
          Log out
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
