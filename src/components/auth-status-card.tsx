"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { authClient } from "@/lib/auth/client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Field, FieldGroup, FieldLabel } from "./ui/field";
import { Alert, AlertDescription } from "./ui/alert";

export function AuthStatusCard({
  kind,
  token,
}: {
  kind: "forgot" | "reset" | "verify" | "invite";
  token?: string;
}) {
  const { t } = useTranslation("dashboard");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const title =
    kind === "forgot"
      ? "forgotTitle"
      : kind === "reset"
        ? "resetTitle"
        : kind === "verify"
          ? "verifyTitle"
          : "inviteTitle";
  async function reset(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (form.get("password") !== form.get("confirm")) {
      setError(t("auth:passwordMismatch"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await authClient.resetPassword({
        newPassword: String(form.get("password")),
        token: token!,
      });
      if (result.error) throw new Error();
      setComplete(true);
    } catch {
      setError(t("authSetup.invalidLink"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-center font-heading text-3xl font-semibold tracking-tight">
        {t(`authSetup.${title}`)}
      </h1>
      {complete ? (
        <p role="status" className="text-center text-sm">
          {t("authSetup.resetSuccess")}
        </p>
      ) : kind === "reset" && token ? (
        <form onSubmit={reset}>
          <fieldset disabled={busy}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="reset-password">
                  {t("authSetup.password")}
                </FieldLabel>
                <Input
                  id="reset-password"
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={128}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="reset-confirm">
                  {t("authSetup.confirm")}
                </FieldLabel>
                <Input
                  id="reset-confirm"
                  type="password"
                  name="confirm"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={128}
                />
              </Field>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button loading={busy} type="submit">
                {t("authSetup.reset")}
              </Button>
            </FieldGroup>
          </fieldset>
        </form>
      ) : (
        <Alert>
          <AlertDescription>
            {t(
              kind === "invite"
                ? "authSetup.inviteUnavailable"
                : kind === "reset"
                  ? "authSetup.invalidLink"
                  : "authSetup.deliveryUnavailable",
            )}
          </AlertDescription>
        </Alert>
      )}
      <p className="text-center text-sm">
        <Link
          className="font-medium underline-offset-4 hover:underline"
          href="/login"
        >
          {t("authSetup.back")}
        </Link>
      </p>
    </div>
  );
}
