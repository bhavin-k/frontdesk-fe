"use client";

import { useEffect, useState } from "react";
import copy from "../../../../public/locales/en/intake.json";
import { api, displayTime } from "../api";
import type { Page } from "../types";
import type { Candidate, Resume } from "./types";

function ContactForm({
  base,
  candidate,
  onChanged,
}: {
  base: string;
  candidate: Candidate;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await api(`${base}/candidates/${candidate.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          expected_revision: candidate.contact_revision,
          name: form.get("name") || null,
          email: form.get("email") || null,
          mobile: form.get("mobile") || null,
          reason: form.get("reason"),
        }),
      });
      onChanged();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      <fieldset disabled={busy}>
        {(["name", "email", "mobile"] as const).map((field) => (
          <div className="field" key={field}>
            <label htmlFor={`contact-${field}`}>{copy[field]}</label>
            <input
              id={`contact-${field}`}
              name={field}
              type={
                field === "email"
                  ? "email"
                  : field === "mobile"
                    ? "tel"
                    : "text"
              }
              maxLength={
                field === "email" ? 320 : field === "mobile" ? 40 : 200
              }
              defaultValue={candidate.profile[field] ?? ""}
            />
          </div>
        ))}
        <div className="field">
          <label htmlFor="contact-reason">{copy.reason}</label>
          <textarea
            id="contact-reason"
            name="reason"
            required
            minLength={5}
            maxLength={1000}
          />
        </div>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <button type="submit" className="button primary">
          {busy ? copy.saving : copy.saveContacts}
        </button>
      </fieldset>
    </form>
  );
}

function CandidateDetails({
  base,
  identifier,
  refresh,
  onChanged,
  onOpenUpload,
}: {
  base: string;
  identifier: string;
  refresh: number;
  onChanged: () => void;
  onOpenUpload: (id: string) => void;
}) {
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [error, setError] = useState("");
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      api<Candidate>(`${base}/candidates/${identifier}`, {}, controller.signal),
      api<Page<Resume>>(
        `${base}/candidates/${identifier}/resumes?limit=20&offset=${offset}`,
        {},
        controller.signal,
      ),
    ])
      .then(([person, history]) => {
        setCandidate(person);
        setResumes(history.items);
        setError("");
      })
      .catch((cause: Error) => {
        if (!controller.signal.aborted) setError(cause.message);
      });
    return () => controller.abort();
  }, [base, identifier, refresh, offset]);
  if (error)
    return (
      <p role="alert" className="form-error">
        {error}
      </p>
    );
  if (!candidate) return <p role="status">{copy.loading}</p>;
  return (
    <div className="panel">
      <h3>{candidate.profile.name ?? copy.unknownName}</h3>
      <p className="field-hint">{copy.profileHelp}</p>
      <ContactForm
        key={`${candidate.id}:${candidate.contact_revision}`}
        base={base}
        candidate={candidate}
        onChanged={onChanged}
      />
      <details className="intake-card">
        <summary>{copy.profile}</summary>
        <pre className="profile-json">
          {JSON.stringify(candidate.profile, null, 2)}
        </pre>
      </details>
      <h3>{copy.resumes}</h3>
      <ul className="upload-list">
        {resumes.map((resume) => (
          <li key={resume.id}>
            <p>
              {displayTime(resume.source_received_at)}{" "}
              {resume.current && <span className="badge">{copy.current}</span>}
            </p>
            <div className="button-row">
              <button
                className="text-button"
                onClick={() => onOpenUpload(resume.upload_id)}
              >
                {copy.review}
              </button>
              <a
                href={`/api/recruitment${base}/cv-uploads/${resume.upload_id}/file`}
                download
              >
                {copy.original}
              </a>
            </div>
          </li>
        ))}
      </ul>
      <div className="button-row">
        <button
          className="button secondary"
          disabled={offset === 0}
          onClick={() => setOffset(Math.max(0, offset - 20))}
        >
          ←
        </button>
        <button
          className="button secondary"
          disabled={resumes.length < 20 || offset >= 10000}
          onClick={() => setOffset(offset + 20)}
        >
          →
        </button>
      </div>
      {candidate.contact_history?.length ? (
        <details className="intake-card">
          <summary>{copy.contactHistory}</summary>
          <ul>
            {candidate.contact_history.map((revision) => (
              <li key={revision.revision}>
                <p>
                  {copy.revision} {revision.revision} ·{" "}
                  {displayTime(revision.created_at)}
                </p>
                <p>{revision.reason}</p>
                <pre className="profile-json">
                  {JSON.stringify(revision.after, null, 2)}
                </pre>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

export function Candidates({
  base,
  rows,
  refresh,
  onChanged,
  onOpenUpload,
}: {
  base: string;
  rows: Candidate[];
  refresh: number;
  onChanged: () => void;
  onOpenUpload: (id: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const identifier = selected ?? rows[0]?.id;
  return (
    <section>
      <h2>{copy.candidates}</h2>
      {rows.length === 0 && <p className="muted">{copy.emptyCandidates}</p>}
      {rows.length > 0 && (
        <div className="field">
          <label htmlFor="candidate-select">{copy.candidates}</label>
          <select
            id="candidate-select"
            value={identifier}
            onChange={(event) => setSelected(event.target.value)}
          >
            {rows.map((row) => (
              <option key={row.id} value={row.id}>
                {row.profile.name ?? row.profile.email ?? copy.unknownName}
              </option>
            ))}
          </select>
        </div>
      )}
      {identifier && (
        <CandidateDetails
          key={identifier}
          base={base}
          identifier={identifier}
          refresh={refresh}
          onChanged={onChanged}
          onOpenUpload={onOpenUpload}
        />
      )}
    </section>
  );
}
