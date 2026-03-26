import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

import { designTokens } from "@/lib/designTokens";
import { SoundProvider } from "@/providers/SoundProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: designTokens.appName,
  description: "A spatial audio visualizer designed for fast outdoor readability.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="h-full overflow-hidden bg-background text-foreground antialiased">
        <SoundProvider>{children}</SoundProvider>
      </body>
    </html>
  );
}
