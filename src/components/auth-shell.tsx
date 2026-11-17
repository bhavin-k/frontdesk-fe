import type { ReactNode } from "react";
import Link from "next/link";
import { BriefcaseBusiness } from "lucide-react";
import { authCopy as copy } from "@/lib/copy";
export function Brand() {
  return (
    <Link className="flex items-center gap-2 text-sm font-medium" href="/">
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <BriefcaseBusiness className="size-5" />
      </span>
      <span>{copy.brand}</span>
    </Link>
  );
}
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <main className="flex flex-1 flex-col items-center px-6 py-12">
        <div className="my-auto flex w-full max-w-sm flex-col items-center">
          <Brand />
          <div className="mt-10 w-full">{children}</div>
        </div>
      </main>
      <footer className="px-6 pb-10 text-center text-xs text-muted-foreground">
        {copy.introDescription}
      </footer>
    </div>
  );
}
