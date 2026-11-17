export type Mailbox = {
  id: string;
  provider: "gmail" | "microsoft";
  connection_method: "imap" | "gmail_oauth" | "microsoft_oauth";
  enabled: boolean;
  email: string | null;
  status: string;
  opening_id: string;
  folder_id: string;
  generation: number;
  intake_started_at: string | null;
  sync_status: string;
  failure_code: string | null;
  last_success_at: string | null;
  stalled: boolean;
  provider_mode: "real" | "fake";
  authorization_url?: string | null;
};
export type Capabilities = {
  provider_mode: "real" | "fake";
  items: {
    id: string;
    connection_method: Mailbox["connection_method"];
    configured: boolean;
  }[];
};
export type IntakeRecord = {
  id: string;
  filename: string;
  provider: string;
  received_at: string;
  status: string;
  upload_id: string | null;
  application_id: string | null;
  processing_status: string | null;
  failure_code: string | null;
  review_reason: string | null;
};
export type Candidate = {
  id: string;
  contact_revision: number;
  profile: {
    name: string | null;
    email: string | null;
    phone?: string | null;
    mobile?: string | null;
    [key: string]: unknown;
  };
  contact_history?: {
    revision: number;
    before: Record<string, unknown>;
    after: Record<string, unknown>;
    reason: string;
    created_at: string;
  }[];
};
export type Resume = {
  id: string;
  version: number;
  upload_id: string;
  application_id: string;
  source_received_at: string;
  current: boolean;
};
export type IdentityCase = {
  id: string;
  kind:
    | "identity_conflict"
    | "contact_proposal"
    | "contact_issue"
    | "cross_role_submission";
  status: string;
  upload_id: string | null;
  candidate_id: string | null;
  proposed_contacts: Record<string, string | null>;
  candidate_options: string[];
  candidates?: Candidate[];
};
