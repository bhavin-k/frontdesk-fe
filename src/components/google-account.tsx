"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import { authCopy as copy } from "@/lib/copy";
import { useHydrated } from "@/hooks/use-hydrated";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function GoogleAccount({ email, enabled, linked, initialError }: {
  email: string;
  enabled: boolean;
  linked: boolean;
  initialError: string | null;
}) {
  const [pending, setPending] = useState(false);
  const hydrated = useHydrated();
  const [error, setError] = useState(initialError);

  async function linkGoogle() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await authClient.linkSocial({
        provider: "google",
        callbackURL: "/dashboard/settings/account",
        errorCallbackURL: "/dashboard/settings/account",
        loginHint: email,
      });
      if (result.error) {
        setError(result.error.status === 429 ? copy.rateLimited : copy.googleFailed);
        setPending(false);
      }
    } catch {
      setError(copy.googleFailed);
      setPending(false);
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{copy.googleLinkTitle}</CardTitle>
        <CardDescription>{copy.googleLinkDescription}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-start gap-4">
        <p className="break-all text-sm">{email}</p>
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        {linked ? <p className="text-sm">{copy.googleLinked}</p> : enabled ? (
          <Button type="button" variant="outline" loading={pending} disabled={!hydrated || pending} onClick={() => void linkGoogle()}>
            {copy.googleLink}
          </Button>
        ) : <p className="text-sm text-muted-foreground">{copy.googleNotConfigured}</p>}
        <p className="text-sm text-muted-foreground">{copy.googleMailboxSeparate}</p>
      </CardContent>
    </Card>
  );
}
