"use client";

import { useEffect, useState } from "react";
import { recruitmentCopy as copy } from "@/lib/copy";
import { api } from "./api";
import type { Member, Retention } from "./types";

export function BusinessSettings({
  base,
  userId,
}: {
  base: string;
  userId: string;
}) {
  const [data, setData] = useState<{
    retention: Retention;
    members: Member[];
  } | null>(null);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      api<Retention>(`${base}/retention-settings`, {}, controller.signal),
      api<Member[]>(`${base}/members`, {}, controller.signal),
    ])
      .then(([retention, members]) => {
        setData({ retention, members });
        setError("");
      })
      .catch((cause: Error) => {
        if (!controller.signal.aborted) setError(cause.message);
      });
    return () => controller.abort();
  }, [base, version]);

  async function change(operation: () => Promise<unknown>, message: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await operation();
      setNotice(message);
      setVersion((value) => value + 1);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel settings-panel">
      <h2>{copy.settings}</h2>
      <p className="field-hint">
        {copy.yourId}: <code>{userId}</code>
      </p>
      {error && (
        <div>
          <p className="form-error" role="alert">
            {error}
          </p>
          <button
            className="button secondary"
            onClick={() => setVersion((value) => value + 1)}
          >
            {copy.retry}
          </button>
        </div>
      )}
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
      {!data && !error && <p>{copy.loading}</p>}
      {data && (
        <div className="settings-grid">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void change(
                () =>
                  api(`${base}/retention-settings`, {
                    method: "PATCH",
                    body: JSON.stringify({
                      rejected_retention_days: Number(form.get("rejected")),
                      other_candidate_retention_days: Number(form.get("other")),
                    }),
                  }),
                copy.settingsSaved,
              );
            }}
          >
            <fieldset disabled={busy}>
              <h3>{copy.retentionTitle}</h3>
              <p className="field-hint">{copy.retentionHint}</p>
              <div className="field">
                <label htmlFor="rejected-days">{copy.rejectedDays}</label>
                <input
                  key={`rejected-${data.retention.rejected_retention_days}`}
                  id="rejected-days"
                  name="rejected"
                  type="number"
                  min={1}
                  max={3650}
                  defaultValue={data.retention.rejected_retention_days}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="other-days">{copy.otherDays}</label>
                <input
                  key={`other-${data.retention.other_candidate_retention_days}`}
                  id="other-days"
                  name="other"
                  type="number"
                  min={1}
                  max={3650}
                  defaultValue={data.retention.other_candidate_retention_days}
                  required
                />
              </div>
              <button className="button secondary">
                {busy ? copy.saving : copy.saveSettings}
              </button>
            </fieldset>
          </form>
          <div>
            <h3>{copy.members}</h3>
            <p className="field-hint">{copy.memberHint}</p>
            <ul className="member-list">
              {data.members.map((member) => (
                <li key={member.user_id}>
                  <code>{member.user_id}</code>
                  <button
                    className="text-button"
                    disabled={busy || member.user_id === userId}
                    onClick={() =>
                      void change(
                        () =>
                          api(`${base}/members/${member.user_id}`, {
                            method: "DELETE",
                          }),
                        copy.memberRemoved,
                      )
                    }
                  >
                    {copy.removeMember}
                  </button>
                </li>
              ))}
            </ul>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const memberId = new FormData(form).get("user_id");
                void change(async () => {
                  await api(`${base}/members`, {
                    method: "POST",
                    body: JSON.stringify({ user_id: memberId }),
                  });
                  form.reset();
                }, copy.memberAdded);
              }}
            >
              <fieldset disabled={busy}>
                <div className="field">
                  <label htmlFor="member-id">{copy.memberId}</label>
                  <input
                    id="member-id"
                    name="user_id"
                    required
                    pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
                  />
                </div>
                <button className="button secondary">{copy.addMember}</button>
              </fieldset>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
