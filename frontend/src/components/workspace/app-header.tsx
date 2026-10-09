"use client";

import { ChevronDown, Palette, Plug, Settings, User } from "lucide-react";
import { toast } from "sonner";
import { ColorModeMenu } from "@/components/layout/color-mode-menu";
import { Logo } from "@/components/layout/logo";
import { HelpButton, ProfileMenu } from "@/components/layout/profile-menu";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import type { Me } from "@/types/form";

const comingSoon = (what: string) => () => toast(`${what} is coming soon`);

export function AppHeader({ me }: { me: Me | null }) {
  const name = me?.name ?? "…";
  return (
    <header className="bg-surface flex h-12 shrink-0 items-center justify-between px-3 sm:px-1">
      <div className="flex items-center gap-4">
        <Logo showText={false} />
        <Menu>
          <MenuTrigger className="hover:bg-selected flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium">
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
        <button
          onClick={comingSoon("Integrations")}
          className="hover:bg-selected hidden items-center gap-1.5 rounded-md px-2.5 py-1.5 md:flex"
        >
          <Plug size={16} /> Integrations
        </button>
        <button
          onClick={comingSoon("Brand kit")}
          className="hover:bg-selected hidden items-center gap-1.5 rounded-md px-2.5 py-1.5 md:flex"
        >
          <Palette size={16} /> Brand kit
        </button>
        <ColorModeMenu />
        <HelpButton />
        <ProfileMenu me={me} />
      </div>
    </header>
  );
}
