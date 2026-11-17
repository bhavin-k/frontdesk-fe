"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { BriefcaseBusiness, Plus } from "lucide-react";
import { api, tenantPath } from "@/features/recruitment/api";
import type { Identity, Membership } from "@/features/recruitment/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TableCardSkeleton } from "@/components/loading-skeletons";

type BusinessContext = {
  memberships: Membership[];
  business: Membership | null;
  base: string | null;
  userId: string;
  pending: boolean;
  error: Error | null;
  refresh: () => void;
  switchBusiness: (id: string) => void;
  openCreate: () => void;
};
const Context = createContext<BusinessContext | null>(null);

function CreateBusiness({ onCreated }: { onCreated: (id: string) => void }) {
  const { t } = useTranslation("dashboard");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const created = await api<{ id: string }>("/tenants", {
        method: "POST",
        body: JSON.stringify({ name: form.get("name") }),
      });
      onCreated(created.id);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="business-name">{t("workspace.name")}</FieldLabel>
          <Input
            id="business-name"
            name="name"
            required
            minLength={2}
            maxLength={200}
            disabled={busy}
          />
          <FieldDescription>{t("workspace.nameHint")}</FieldDescription>
        </Field>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" disabled={busy} loading={busy}>
          <Plus data-icon="inline-start" />
          {t("workspace.create")}
        </Button>
      </FieldGroup>
    </form>
  );
}

export function BusinessProvider({
  userId,
  initialBusinessId,
  children,
}: {
  userId: string;
  initialBusinessId?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation("dashboard");
  const [selected, setSelected] = useState(initialBusinessId ?? "");
  const [creating, setCreating] = useState(false);
  const identity = useQuery({
    queryKey: ["identity", userId],
    queryFn: ({ signal }) => api<Identity>("/me", {}, signal),
  });
  const memberships = identity.data?.memberships ?? [];
  const business = selected
    ? (memberships.find((item) => item.tenant_id === selected) ?? null)
    : (memberships[0] ?? null);
  const switchBusiness = (id: string) => {
    setSelected(id);
    document.cookie = `recruitment-business=${encodeURIComponent(id)}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    queryClient.removeQueries({
      predicate: (query) => query.queryKey[0] === "recruitment",
    });
    router.push("/dashboard");
    router.refresh();
  };
  return (
    <Context.Provider
      value={{
        memberships,
        business,
        base: business ? tenantPath(business.tenant_id) : null,
        userId,
        pending: identity.isPending,
        error: identity.error,
        refresh: () => {
          void identity.refetch();
        },
        switchBusiness,
        openCreate: () => setCreating(true),
      }}
    >
      {children}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("workspace.createTitle")}</DialogTitle>
            <DialogDescription>
              {t("workspace.createDescription")}
            </DialogDescription>
          </DialogHeader>
          <CreateBusiness
            onCreated={(id) => {
              setSelected(id);
              setCreating(false);
              void queryClient.invalidateQueries({
                queryKey: ["identity", userId],
              });
              switchBusiness(id);
            }}
          />
        </DialogContent>
      </Dialog>
    </Context.Provider>
  );
}

export function useBusiness() {
  const value = useContext(Context);
  if (!value) throw new Error("BusinessProvider is required.");
  return value;
}

export function BusinessBoundary({ children }: { children: ReactNode }) {
  const state = useBusiness();
  const { t } = useTranslation("dashboard");
  if (state.pending) return <TableCardSkeleton />;
  if (state.error)
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex flex-col gap-3">
          {state.error.message}
          <Button variant="outline" onClick={state.refresh}>
            {t("common:loading.retry")}
          </Button>
        </AlertDescription>
      </Alert>
    );
  if (!state.business)
    return (
      <div className="mx-auto w-full max-w-xl py-12">
        <Card>
          <CardHeader>
            <BriefcaseBusiness className="text-muted-foreground" />
            <CardTitle role="heading" aria-level={1}>
              {t("workspace.createTitle")}
            </CardTitle>
            <CardDescription>
              {t("workspace.createDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateBusiness
              onCreated={(id) => {
                state.switchBusiness(id);
                state.refresh();
              }}
            />
          </CardContent>
        </Card>
      </div>
    );
  return (
    <div key={state.business.tenant_id} className="min-w-0">
      {children}
    </div>
  );
}
