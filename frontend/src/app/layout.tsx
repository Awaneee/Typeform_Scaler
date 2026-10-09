import type { Metadata } from "next";
import { Inter, Karla, Montserrat, Playfair_Display } from "next/font/google";
import { ThemedToaster } from "@/components/layout/themed-toaster";
import { COLOR_MODE_SCRIPT } from "@/lib/color-mode";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
// Form theme fonts: only downloaded when a form using that theme is shown (no preload).
const karla = Karla({ variable: "--font-karla", subsets: ["latin"], preload: false });
const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"], preload: false });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], preload: false });

export const metadata: Metadata = {
  title: "Typeform Clone",
  description: "A Typeform clone built for an SDE assignment (not affiliated with Typeform).",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The inline script may switch data-theme to "dark" before React hydrates.
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${inter.variable} ${karla.variable} ${montserrat.variable} ${playfair.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: COLOR_MODE_SCRIPT }} />
      </head>
      <body className="text-ink min-h-full font-sans">
        {children}
        <ThemedToaster />
      </body>
    </html>
  );
}
