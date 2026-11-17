import type { Metadata } from "next";
import type { ReactNode } from "react";
import { authCopy } from "@/lib/copy";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: authCopy.brand,
  description: authCopy.description,
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
