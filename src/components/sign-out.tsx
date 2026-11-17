"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { authCopy as copy } from "@/lib/copy";

export function SignOut() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function signOut() {
    setPending(true);
    setFailed(false);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error("Sign out failed.");
      router.replace("/login");
      router.refresh();
    } catch {
      setFailed(true);
      setPending(false);
    }
  }

  return <div>
    <button className="button secondary" onClick={signOut} disabled={pending}>{pending ? copy.signingOut : copy.signOut}</button>
    {failed ? <p className="form-error" role="alert">{copy.requestFailed}</p> : null}
  </div>;
}
