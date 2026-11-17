"use client";

import { useEffect, useState } from "react";
import copy from "../../../../public/locales/en/intake.json";
import { statusLabel } from "@/lib/copy";
import { api, displayTime, isProcessing } from "../api";
import type { Page } from "../types";
import { Candidates } from "./candidates";
import { IdentityReviews } from "./identity-reviews";
import { Mailboxes } from "./mailboxes";
import type {
  Candidate,
  Capabilities,
  IdentityCase,
  IntakeRecord,
  Mailbox,
} from "./types";

type Data = {
  mailboxes: Mailbox[];
  capabilities: Capabilities;
  intake: IntakeRecord[];
  candidates: Candidate[];
  cases: IdentityCase[];
};

export function IntakeWorkspace({
  base,
  openingId,
  view,
  onOpenUpload,
}: {
  base: string;
  openingId?: string;
  view: "intake" | "candidates";
  onOpenUpload: (id: string) => void;
}) {
  const [data, setData] = useState<Data | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const query = `?limit=20&offset=${offset}`;
    Promise.all([
      api<Page<Mailbox>>(`${base}/mailboxes?limit=100`, {}, controller.signal),
      api<Capabilities>(`${base}/mailbox-providers`, {}, controller.signal),
      api<Page<IntakeRecord>>(
        `${base}/mail-intake${query}`,
        {},
        controller.signal,
      ),
      api<Page<Candidate>>(`${base}/candidates${query}`, {}, controller.signal),
      api<Page<IdentityCase>>(
        `${base}/identity-reviews${query}`,
        {},
        controller.signal,
      ),
    ])
      .then(([mailboxes, capabilities, intake, candidates, cases]) => {
        setData({
          mailboxes: mailboxes.items,
          capabilities,
          intake: intake.items,
          candidates: candidates.items,
          cases: cases.items,
        });
        setError("");
      })
      .catch((cause: Error) => {
        if (!controller.signal.aborted) setError(cause.message);
      });
    return () => controller.abort();
  }, [base, refresh, offset]);
  useEffect(() => {
    if (
      !data ||
      (!data.mailboxes.some(
        (row) =>
          ["queued", "running", "retry_wait"].includes(row.sync_status) ||
          row.status === "disconnecting",
      ) &&
        !data.intake.some((row) =>
          row.processing_status
            ? isProcessing(row.processing_status)
            : ["queued", "processing", "retry_wait"].includes(row.status),
        ))
    )
      return;
    const timer = setTimeout(() => setRefresh((value) => value + 1), 3000);
    return () => clearTimeout(timer);
  }, [data]);
  const onChanged = () => setRefresh((value) => value + 1);
  return (
    <div className="phase-two-workspace">
      <div className="section-heading">
        <h2>{view === "intake" ? copy.intakeTab : copy.candidatesTab}</h2>
        <button className="button secondary" onClick={onChanged}>
          {copy.refresh}
        </button>
      </div>
      {error && (
        <p role="alert" className="notice warning">
          {error}
        </p>
      )}
      {!data && !error && <p role="status">{copy.loading}</p>}
      {data && (
        <>
          {view === "intake" ? (
            <>
              <Mailboxes
                base={base}
                openingId={openingId}
                rows={data.mailboxes}
                capabilities={data.capabilities}
                onChanged={onChanged}
              />
              <section className="panel">
                <h2>{copy.intake}</h2>
                {data.intake.length === 0 && (
                  <p className="muted">{copy.emptyIntake}</p>
                )}
                <ul className="upload-list">
                  {data.intake.map((item) => (
                    <li key={item.id}>
                      <h3>{item.filename}</h3>
                      <p>
                        {item.provider} · {copy.received}:{" "}
                        {displayTime(item.received_at)}
                      </p>
                      <p className="badge">
                        {statusLabel(item.processing_status ?? item.status)}
                      </p>
                      {(item.failure_code || item.review_reason) && (
                        <p className="form-error">
                          {statusLabel(
                            item.failure_code ?? item.review_reason!,
                          )}
                        </p>
                      )}
                      {item.upload_id && (
                        <div className="button-row">
                          <button
                            className="text-button"
                            onClick={() => onOpenUpload(item.upload_id!)}
                          >
                            {copy.review}
                          </button>
                          <a
                            href={`/api/recruitment${base}/cv-uploads/${item.upload_id}/file`}
                            download
                          >
                            {copy.original}
                          </a>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
              <IdentityReviews
                base={base}
                rows={data.cases}
                onChanged={onChanged}
                onOpenUpload={onOpenUpload}
              />
            </>
          ) : (
            <Candidates
              base={base}
              rows={data.candidates}
              refresh={refresh}
              onChanged={onChanged}
              onOpenUpload={onOpenUpload}
            />
          )}
          <div className="button-row">
            <button
              className="button secondary"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - 20))}
              aria-label="Previous page"
            >
              ←
            </button>
            <button
              className="button secondary"
              disabled={
                offset >= 10000 ||
                (view === "candidates"
                  ? data.candidates.length
                  : Math.max(data.intake.length, data.cases.length)) < 20
              }
              onClick={() => setOffset(offset + 20)}
              aria-label="Next page"
            >
              →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
