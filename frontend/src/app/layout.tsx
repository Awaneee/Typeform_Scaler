import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Formflow",
  description: "Build conversational forms, one question at a time.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full font-sans text-ink">
        {children}
        <Toaster position="bottom-center" toastOptions={{ className: "!rounded-lg !text-sm" }} />
      </body>
    </html>
  );
}
