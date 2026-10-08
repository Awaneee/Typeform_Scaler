"use client";

import { ChevronDown, CircleHelp, LogOut, Palette, Plug, Settings, User } from "lucide-react";
import { toast } from "sonner";
import { ColorModeMenu } from "@/components/layout/color-mode-menu";
import { Logo } from "@/components/layout/logo";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import type { Me } from "@/types/form";

const comingSoon = (what: string) => () => toast(`${what} is coming soon`);

export function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AppHeader({ me }: { me: Me | null }) {
  const name = me?.name ?? "…";
  return (
    <header className="flex h-14 items-center justify-between border-b border-line bg-surface px-4 sm:px-6">
      <div className="flex items-center gap-4">
        <Logo showText={false} />
        <Menu>
          <MenuTrigger className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-selected">
            {name}&apos;s account <ChevronDown size={16} className="text-muted" />
          </MenuTrigger>
          <MenuContent align="start">
            <MenuLabel>Accounts</MenuLabel>
            <MenuItem icon={<User size={15} />}>{name}&apos;s account</MenuItem>
            <MenuSeparator />
            <MenuItem icon={<Settings size={15} />} onSelect={comingSoon("Account settings")}>
              Settings
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>

      <div className="flex items-center gap-1 text-sm">
        <button onClick={comingSoon("Integrations")} className="hidden items-center gap-1.5 rounded-md px-2.5 py-1.5 hover:bg-selected md:flex">
          <Plug size={16} /> Integrations
        </button>
        <button onClick={comingSoon("Brand kit")} className="hidden items-center gap-1.5 rounded-md px-2.5 py-1.5 hover:bg-selected md:flex">
          <Palette size={16} /> Brand kit
        </button>
        <ColorModeMenu />
        <button onClick={comingSoon("Help center")} className="rounded-md p-2 hover:bg-selected" aria-label="Help">
          <CircleHelp size={18} />
        </button>
        <Menu>
          <MenuTrigger
            className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-teal text-xs font-semibold text-white"
            aria-label="Profile"
          >
            {me ? initials(me.name) : ""}
          </MenuTrigger>
          <MenuContent>
            <div className="px-2.5 py-2">
              <p className="text-sm font-medium">{me?.name}</p>
              <p className="text-xs text-muted">{me?.email}</p>
            </div>
            <MenuSeparator />
            <MenuItem icon={<LogOut size={15} />} onSelect={comingSoon("Sign out")}>
              Log out
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>
    </header>
  );
}
