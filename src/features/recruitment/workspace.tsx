"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import intakeCopy from "../../../public/locales/en/intake.json";
import { recruitmentCopy as copy, statusLabel } from "@/lib/copy";
import { api, isProcessing, tenantPath } from "./api";
import { ApplicationReview } from "./application-review";
import { BusinessSettings } from "./business-settings";
import { CVUpload } from "./cv-upload";
import { OpeningForm } from "./opening-form";
import type { Identity, Membership, Opening, Page, Upload } from "./types";

const IntakeWorkspace = dynamic(() => import("./intake/workspace").then((module) => module.IntakeWorkspace));

function BusinessForm({
  onCreated,
  onCancel,
}: {
  onCreated: (business: Membership) => void;
  onCancel?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = new FormData(event.currentTarget).get("name");
    setBusy(true);
    setError("");
    try {
      const business = await api<{
        id: string;
        name: string;
        role: "recruiter";
      }>("/tenants", { method: "POST", body: JSON.stringify({ name }) });
      onCreated({
        tenant_id: business.id,
        name: business.name,
        role: business.role,
      });
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="panel business-form" onSubmit={submit}>
      <fieldset disabled={busy}>
        <div className="field">
          <label htmlFor="business-name">{copy.businessName}</label>
          <input id="business-name" name="name" maxLength={200} required />
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="button-row">
          <button className="button primary">
            {busy ? copy.saving : copy.createBusiness}
          </button>
          {onCancel && (
            <button
              className="button secondary"
              type="button"
              onClick={onCancel}
            >
              {copy.cancel}
            </button>
          )}
        </div>
      </fieldset>
    </form>
  );
}

function BusinessWorkspace({
  business,
  userId,
  initialView,
}: {
  business: Membership;
  userId: string;
  initialView: "recruitment" | "intake";
}) {
  const base = tenantPath(business.tenant_id);
  const [openings, setOpenings] = useState<Opening[] | null>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedOverride, setSelectedOverride] = useState<Upload | null>(null);
  const [view, setView] = useState<"recruitment" | "intake" | "candidates">(initialView);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [settings, setSettings] = useState(false);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      api<Page<Opening>>(`${base}/openings`, {}, controller.signal),
      api<Page<Upload>>(
        `${base}/cv-uploads?limit=20&offset=${offset}`,
        {},
        controller.signal,
      ),
    ])
      .then(([roles, files]) => {
        setOpenings(roles.items);
        setUploads(files.items);
        setError("");
        setPending(false);
        setSelectedId(
          (current) => current ?? files.items[0]?.upload_id ?? null,
        );
      })
      .catch((cause: Error) => {
        if (!controller.signal.aborted) {
          setError(cause.message);
          setPending(false);
        }
      });
    return () => controller.abort();
  }, [base, offset, refresh]);

  useEffect(() => {
    if (!uploads.some((upload) => isProcessing(upload.status))) return;
    const timer = setTimeout(() => setRefresh((value) => value + 1), 2000);
    return () => clearTimeout(timer);
  }, [uploads]);

  const opening = openings?.find((item) => item.status === "active");
  const selected = uploads.find((item) => item.upload_id === selectedId) ??
    (selectedOverride?.upload_id === selectedId ? selectedOverride : null);
  async function openUpload(id: string) {
    try {
      const upload = await api<Upload>(`${base}/cv-uploads/${id}`);
      setSelectedOverride(upload); setSelectedId(id); setView("recruitment");
    } catch (cause) {setError((cause as Error).message);}
  }
  function movePage(next: number) {
    setPending(true);
    setOffset(next);
    setSelectedId(null);
  }

  return (
    <>
      <div className="workspace-toolbar">
        <p className="muted">{copy.recruiter}</p>
        <button
          className="button secondary"
          aria-expanded={settings}
          onClick={() => setSettings(!settings)}
        >
          {copy.settings}
        </button>
      </div>
      {settings && <BusinessSettings key={base} base={base} userId={userId} />}
      <nav className="button-row workspace-tabs" aria-label={copy.title}>
        {(["recruitment", "intake", "candidates"] as const).map((item) => <button key={item}
          className={view === item ? "button primary" : "button secondary"} aria-pressed={view === item}
          onClick={() => setView(item)}>{item === "recruitment" ? intakeCopy.recruitmentTab : item === "intake" ? intakeCopy.intakeTab : intakeCopy.candidatesTab}</button>)}
      </nav>
      {error && (
        <div className="notice warning">
          <p role="alert">{error}</p>
          <button
            className="button secondary"
            onClick={() => setRefresh((value) => value + 1)}
          >
            {copy.retry}
          </button>
        </div>
      )}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {!openings && !error && <p role="status">{copy.loading}</p>}
      {openings && view !== "recruitment" && <IntakeWorkspace key={`${base}:${view}`} base={base} openingId={opening?.id} view={view} onOpenUpload={openUpload}/>}
      {openings && view === "recruitment" && (
        <div className="workspace-grid">
          <div className="workspace-sidebar">
            <section className="panel">
              <h2>{copy.opening}</h2>
              <p className="field-hint">{copy.openingLimit}</p>
              {opening ? (
                <div className="opening-summary">
                  <h3>{opening.title}</h3>
                  <span className="badge">{statusLabel(opening.status)}</span>
                  <p className="preserve-lines">{opening.job_description}</p>
                  {opening.details.candidate_requirements && (
                    <p className="preserve-lines">{opening.details.candidate_requirements}</p>
                  )}
                </div>
              ) : (
                <OpeningForm
                  base={base}
                  onCreated={(created) => {
                    setOpenings([created]);
                    setRefresh((value) => value + 1);
                  }}
                />
              )}
            </section>
            {opening && (
              <section className="panel">
                <h2>{copy.upload}</h2>
                <p className="field-hint">{copy.uploadHint}</p>
                <CVUpload
                  base={base}
                  openingId={opening.id}
                  onUploaded={(upload, duplicate) => {
                    setNotice(duplicate ? copy.duplicate : copy.uploadSuccess);
                    setSelectedId(upload.upload_id);
                    setOffset(0);
                    setUploads((current) =>
                      [
                        upload,
                        ...current.filter(
                          (item) => item.upload_id !== upload.upload_id,
                        ),
                      ].slice(0, 20),
                    );
                    setRefresh((value) => value + 1);
                  }}
                />
              </section>
            )}
            <section className="panel">
              <div className="section-heading">
                <h2>{copy.history}</h2>
                <button
                  className="text-button"
                  onClick={() => setRefresh((value) => value + 1)}
                >
                  {copy.refresh}
                </button>
              </div>
              {uploads.length === 0 && (
                <p className="muted">{copy.emptyUploads}</p>
              )}
              <ul className="upload-list">
                {uploads.map((upload, index) => (
                  <li key={upload.upload_id}>
                    <button
                      className={
                        selectedId === upload.upload_id
                          ? "upload-item selected"
                          : "upload-item"
                      }
                      aria-pressed={selectedId === upload.upload_id}
                      onClick={() => {
                        setSelectedId(upload.upload_id);
                        setNotice("");
                      }}
                    >
                      <span>
                        {copy.cvFile} {offset + index + 1}
                      </span>
                      <span className="badge">
                        {statusLabel(upload.status)}
                      </span>
                      <code>{upload.upload_id.slice(0, 8)}</code>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="button-row">
                <button
                  className="button secondary"
                  disabled={offset === 0 || pending}
                  onClick={() => movePage(Math.max(0, offset - 20))}
                >
                  {copy.previous}
                </button>
                <button
                  className="button secondary"
                  disabled={uploads.length < 20 || pending || offset >= 10000}
                  onClick={() => movePage(offset + 20)}
                >
                  {copy.next}
                </button>
              </div>
            </section>
          </div>
          <section className="panel review-panel">
            <h2>{copy.review}</h2>
            {selected ? (
              <ApplicationReview
                key={selected.upload_id}
                base={base}
                upload={selected}
                refresh={refresh}
                onSaved={() => {
                  setNotice(copy.saved);
                  setRefresh((value) => value + 1);
                }}
              />
            ) : (
              <p className="muted">{copy.selectUpload}</p>
            )}
          </section>
        </div>
      )}
    </>
  );
}

export function RecruitmentWorkspace({ fakeMode, mailboxNotice = null, initialBusiness }: {
  fakeMode: boolean; mailboxNotice?: "authorized" | "authorization_failed" | null; initialBusiness?: string;
}) {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [tenantId, setTenantId] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    api<Identity>("/me", {}, controller.signal)
      .then((data) => {
        setIdentity(data);
        setTenantId(
          (current) => current || data.memberships.find((item) => item.tenant_id === initialBusiness)?.tenant_id || data.memberships[0]?.tenant_id || "",
        );
        setError("");
      })
      .catch((cause: Error) => {
        if (!controller.signal.aborted) setError(cause.message);
      });
    return () => controller.abort();
  }, [retry, initialBusiness]);

  const business = identity?.memberships.find(
    (item) => item.tenant_id === tenantId,
  );
  return (
    <div className="recruitment-workspace">
      {fakeMode && <p className="notice demo-notice">{copy.localNotice}</p>}
      {mailboxNotice && <p className={mailboxNotice === "authorized" ? "notice" : "notice warning"} role="status">
        {mailboxNotice === "authorized" ? intakeCopy.authorized : intakeCopy.authorizationFailed}
      </p>}
      {error && (
        <div className="notice warning">
          <p role="alert">{error}</p>
          <button
            className="button secondary"
            onClick={() => setRetry(retry + 1)}
          >
            {copy.retry}
          </button>
        </div>
      )}
      {!identity && !error && <p role="status">{copy.loading}</p>}
      {identity && (
        <>
          {identity.memberships.length > 0 && (
            <div className="business-switcher">
              <div className="field">
                <label htmlFor="business-select">{copy.business}</label>
                <select
                  id="business-select"
                  value={tenantId}
                  onChange={(event) => {
                    setTenantId(event.target.value);
                    setAdding(false);
                  }}
                >
                  {identity.memberships.map((item) => (
                    <option key={item.tenant_id} value={item.tenant_id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                className="button secondary"
                onClick={() => setAdding(!adding)}
              >
                {copy.newBusiness}
              </button>
            </div>
          )}
          {(identity.memberships.length === 0 || adding) && (
            <BusinessForm
              onCancel={
                identity.memberships.length ? () => setAdding(false) : undefined
              }
              onCreated={(created) => {
                setIdentity({
                  ...identity,
                  memberships: [...identity.memberships, created],
                });
                setTenantId(created.tenant_id);
                setAdding(false);
              }}
            />
          )}
          {business && !adding && (
            <BusinessWorkspace
              key={business.tenant_id}
              business={business}
              userId={identity.user_id}
              initialView={mailboxNotice ? "intake" : "recruitment"}
            />
          )}
        </>
      )}
    </div>
  );
}
