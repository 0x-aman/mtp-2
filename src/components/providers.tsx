"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Toaster } from "sonner";

import { LocalSyncAgent } from "@/components/local-sync-agent";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      {children}
      <LocalSyncAgent />
      <Toaster richColors position="top-right" />
    </NextThemesProvider>
  );
}
