"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import { createI18nInstance } from "@/i18n";
import { ThemeProvider } from "./theme-provider";
import { AppearanceProvider } from "./appearance-provider";
import { Toaster } from "./ui/sonner";

export function Providers({ children }: { children: ReactNode }) {
  const [i18n] = useState(() => createI18nInstance());
  const [query] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, staleTime: 10000, refetchOnWindowFocus: false },
        },
      }),
  );
  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={query}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AppearanceProvider>
            {children}
            <Toaster />
          </AppearanceProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
}
