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
  fontLabel: string;
}

export const THEMES: Record<ThemeName, Theme> = {
  // Typeform's current default look: near-white background, near-black text and buttons.
  pearl: {
    name: "pearl",
    label: "Pearl White",
    background: "#FAFAFA",
    question: "#262627",
    answer: "#262627",
    button: "#29232B",
    buttonText: "#FFFFFF",
    font: "var(--font-inter), sans-serif",
    fontLabel: "Inter",
  },
  classic: {
    name: "classic",
    label: "Classic Blue",
    background: "#FFFFFF",
    question: "#191919",
    answer: "#0445AF",
    button: "#0445AF",
    buttonText: "#FFFFFF",
    font: "var(--font-inter), sans-serif",
    fontLabel: "Inter",
  },
  inky: {
    name: "inky",
    label: "Inky Black",
    background: "#29232B",
    question: "#FFFFFF",
    answer: "#FFFFFF",
    button: "#FFFFFF",
    buttonText: "#29232B",
    font: "var(--font-inter), sans-serif",
    fontLabel: "Inter",
  },
  lavender: {
    name: "lavender",
    label: "Lavender",
    background: "#F3ECFC",
    question: "#3D2163",
    answer: "#7D3FC9",
    button: "#7D3FC9",
    buttonText: "#FFFFFF",
    font: "var(--font-karla), var(--font-inter), sans-serif",
    fontLabel: "Karla",
  },
  ocean: {
    name: "ocean",
    label: "Ocean",
    background: "#E6F4F1",
    question: "#0B3B36",
    answer: "#147D70",
    button: "#147D70",
    buttonText: "#FFFFFF",
    font: "var(--font-montserrat), var(--font-inter), sans-serif",
    fontLabel: "Montserrat",
  },
  midnight: {
    name: "midnight",
    label: "Midnight",
    background: "#1E1B2E",
    question: "#FFFFFF",
    answer: "#B9A7FF",
    button: "#B9A7FF",
    buttonText: "#1E1B2E",
    font: "var(--font-playfair), var(--font-inter), sans-serif",
    fontLabel: "Playfair Display",
  },
};

export const getTheme = (name: ThemeName | undefined) => THEMES[name ?? "pearl"] ?? THEMES.pearl;
