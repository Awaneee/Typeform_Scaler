"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { Menu, MenuContent, MenuLabel, MenuRadioGroup, MenuRadioItem, MenuTrigger } from "@/components/ui/menu";
import { setColorMode, useColorMode, type ColorMode } from "@/lib/color-mode";

const OPTIONS: { value: ColorMode; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function ColorModeMenu() {
  const { preference, resolved } = useColorMode();
  const Icon = resolved === "dark" ? Moon : Sun;
  return (
    <Menu>
      <MenuTrigger className="hover:bg-selected rounded-md p-2" aria-label="Appearance">
        <Icon size={18} />
      </MenuTrigger>
      <MenuContent className="min-w-40">
        <MenuLabel>Appearance</MenuLabel>
        <MenuRadioGroup value={preference} onValueChange={(v) => setColorMode(v as ColorMode)}>
          {OPTIONS.map(({ value, label, icon: ItemIcon }) => (
            <MenuRadioItem key={value} value={value}>
              <span className="flex items-center gap-2">
                <ItemIcon size={15} /> {label}
              </span>
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
      </MenuContent>
    </Menu>
  );
}
