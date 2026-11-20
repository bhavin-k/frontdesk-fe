import type { Metadata } from "next";
import { Onest } from "next/font/google";
import type { ReactNode } from "react";
import { authCopy } from "@/lib/copy";
import "./globals.css";
import { Providers } from "@/components/providers";

const onest = Onest({
  subsets: ["latin"],
  variable: "--font-onest",
  display: "swap",
});

export const metadata: Metadata = {
  title: authCopy.brand,
  description: authCopy.description,
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={onest.variable} suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
