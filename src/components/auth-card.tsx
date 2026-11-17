"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth/client";
import { authCopy as copy } from "@/lib/copy";
import { useHydrated } from "@/hooks/use-hydrated";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

export function AuthCard({ mode, googleEnabled = false, initialError = null }: {
  mode: "login" | "signup";
  googleEnabled?: boolean;
  initialError?: string | null;
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const signup = mode === "signup";
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [googlePending, setGooglePending] = useState(false);

  async function signInWithGoogle() {
    if (pending || googlePending) return;
    setError(null);
    setGooglePending(true);
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
        newUserCallbackURL: "/dashboard",
        errorCallbackURL: signup ? "/signup" : "/login",
        requestSignUp: signup,
      });
      if (result.error) {
        setError(result.error.status === 429 ? copy.rateLimited : copy.googleFailed);
        setGooglePending(false);
      }
    } catch {
      setError(copy.googleFailed);
      setGooglePending(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || googlePending) return;
    setError(null);
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "")
      .trim()
      .toLowerCase();
    const password = String(data.get("password") ?? "");
    const name = String(data.get("name") ?? "").trim();
    if (signup && !name) {
      setError(copy.invalidName);
      return;
    }
    if (signup && password !== data.get("confirmPassword")) {
      setError(copy.passwordMismatch);
      return;
    }
    setPending(true);
    try {
      const result = signup
        ? await authClient.signUp.email({ name, email, password })
        : await authClient.signIn.email({ email, password });
      if (result.error) {
        const code = result.error.code ?? "";
        const message =
          result.error.status === 429
            ? copy.rateLimited
            : code === "INVALID_EMAIL_OR_PASSWORD"
              ? copy.invalidCredentials
              : code.startsWith("USER_ALREADY_EXISTS")
                ? copy.duplicateEmail
                : code.startsWith("PASSWORD_TOO_")
                  ? copy.invalidPassword
                  : copy.requestFailed;
        setError(message);
        setPending(false);
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError(copy.requestFailed);
      setPending(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-8">
      <div className="flex flex-col gap-3 text-center">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {signup ? copy.signupTitle : copy.loginTitle}
        </h1>
        <p className="text-sm text-muted-foreground">
          {signup ? copy.signupDescription : copy.loginDescription}
        </p>
      </div>
      <form method="post" onSubmit={submit} aria-busy={!hydrated || pending || googlePending}>
        <fieldset disabled={!hydrated || pending || googlePending}>
          <FieldGroup className="gap-4">
            {googleEnabled && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full"
                  loading={googlePending}
                  disabled={pending || googlePending}
                  onClick={() => void signInWithGoogle()}
                >
                  {copy.googleContinue}
                </Button>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <Separator className="flex-1" />
                  <span>{copy.orEmail}</span>
                  <Separator className="flex-1" />
                </div>
              </>
            )}
            {signup && (
              <Field>
                <FieldLabel htmlFor="name">{copy.name}</FieldLabel>
                <Input
                  className="h-11"
                  id="name"
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={200}
                />
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="email">{copy.email}</FieldLabel>
              <Input
                className="h-11"
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={320}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">{copy.password}</FieldLabel>
              <Input
                className="h-11"
                id="password"
                name="password"
                type="password"
                required
                minLength={signup ? 8 : undefined}
                maxLength={128}
                autoComplete={signup ? "new-password" : "current-password"}
              />
              {signup && (
                <FieldDescription>{copy.passwordHint}</FieldDescription>
              )}
            </Field>
            {signup && (
              <Field>
                <FieldLabel htmlFor="confirm-password">
                  {copy.confirmPassword}
                </FieldLabel>
                <Input
                  className="h-11"
                  id="confirm-password"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={128}
                />
              </Field>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button
              className="mt-2 h-11 w-full"
              type="submit"
              loading={pending}
              disabled={pending || googlePending}
            >
              {signup ? copy.signup : copy.login}
            </Button>
          </FieldGroup>
        </fieldset>
      </form>
      {!signup && (
        <p className="text-center text-sm">
          <Link
            className="font-medium underline-offset-4 hover:underline"
            href="/forgot-password"
          >
            {copy.forgotPassword}
          </Link>
        </p>
      )}
      <p className="text-center text-sm text-muted-foreground">
        {signup ? copy.existingAccount : copy.newAccount}{" "}
        <Link
          className="font-medium text-foreground underline-offset-4 hover:underline"
          href={signup ? "/login" : "/signup"}
        >
          {signup ? copy.loginLink : copy.signupLink}
        </Link>
      </p>
    </div>
  );
}
