import type { ThemeName } from "@/types/form";

/** Preset themes. Applied to the respondent flow, builder canvas and workspace thumbnails. */
export interface Theme {
  name: ThemeName;
  label: string;
  background: string;
  question: string; // question text
  answer: string; // answers, inputs, accents
  button: string;
  buttonText: string;
  font: string;
}

export const THEMES: Record<ThemeName, Theme> = {
  classic: {
    name: "classic",
    label: "Classic",
    background: "#FFFFFF",
    question: "#191919",
    answer: "#0445AF",
    button: "#0445AF",
    buttonText: "#FFFFFF",
    font: "var(--font-inter)",
  },
  lavender: {
    name: "lavender",
    label: "Lavender",
    background: "#F3ECFC",
    question: "#3D2163",
    answer: "#7D3FC9",
    button: "#7D3FC9",
    buttonText: "#FFFFFF",
    font: "var(--font-inter)",
  },
  ocean: {
    name: "ocean",
    label: "Ocean",
    background: "#E6F4F1",
    question: "#0B3B36",
    answer: "#147D70",
    button: "#147D70",
    buttonText: "#FFFFFF",
    font: "var(--font-inter)",
  },
  midnight: {
    name: "midnight",
    label: "Midnight",
    background: "#1E1B2E",
    question: "#FFFFFF",
    answer: "#B9A7FF",
    button: "#B9A7FF",
    buttonText: "#1E1B2E",
    font: "var(--font-inter)",
  },
};

export const getTheme = (name: ThemeName | undefined) => THEMES[name ?? "classic"] ?? THEMES.classic;
