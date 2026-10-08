import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemedToaster } from "@/components/layout/themed-toaster";
import { COLOR_MODE_SCRIPT } from "@/lib/color-mode";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Formflow",
  description: "Build conversational forms, one question at a time.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The inline script may switch data-theme to "dark" before React hydrates.
    <html lang="en" data-theme="light" suppressHydrationWarning className={`${inter.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: COLOR_MODE_SCRIPT }} />
      </head>
      <body className="min-h-full font-sans text-ink">
        {children}
        <ThemedToaster />
      </body>
    </html>
  );
}
