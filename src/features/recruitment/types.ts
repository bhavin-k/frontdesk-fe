export type Membership = { tenant_id: string; name: string; role: "recruiter" };
export type Identity = { user_id: string; memberships: Membership[] };
export type Criterion = {
  text: string;
  required: boolean;
  strict: boolean;
  weight: number;
};
export type Opening = {
  id: string;
  title: string;
  job_description: string;
  status: "active" | "paused" | "closed";
  revision: number;
  source_revision: number;
  criteria_status: "queued" | "processing" | "ready" | "failed";
  criteria_error: string | null;
  criteria_metadata: Record<string, unknown>;
  details: JobDetails;
  questions: string[];
  documents: JobDocument[];
  shortlist_threshold: number;
  criteria: (Criterion & { id: string })[];
};
export type JobDetails = {
  department?: string | null;
  location?: string | null;
  employment_type?: string | null;
  total_experience_years?: number | null;
  relevant_experience_years?: number | null;
  domain_experience?: string | null;
  candidate_requirements?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  headcount?: number | null;
  application_deadline?: string | null;
};
export type JobDocument = {
  id: string;
  file_name: string;
  mime_type: string;
  byte_length: number;
  created_at: string;
};
export type Upload = {
  upload_id: string;
  status: string;
  application_id: string | null;
  review_reason: string | null;
  retention_expires_at: string;
};
export type Page<T> = { items: T[]; limit: number; offset: number };
export type Application = {
  id: string;
  candidate_id: string;
  opening_id: string;
  status: string;
  version: number;
  latest_evaluation_id: string | null;
  recruiter_decision: { decision: "shortlist" | "reject"; saved_at: string; recruiter_id: string } | null;
  retention_expires_at: string;
  profile: {
    name?: string | null;
    email?: string | null;
    mobile?: string | null;
    skills?: string[];
  };
};
export type Evidence = { quote: string } & (
  | { chunk_id: string; source_spans: { page: number | null }[] }
  | { source_id: string; source_kind: "page" | "document"; page: number | null; char_start: number; char_end: number }
);
export type Grade = {
  criterion_id: string;
  criterion: string;
  required: boolean;
  status: string;
  reason: string;
  evidence: Evidence[];
};
export type Match = {
  match_run_id: string;
  score: number | null;
  score_provisional: boolean;
  confidence: number | null;
  opening_id: string | null;
  opening_title: string | null;
  shortlist_threshold: number;
  recommendation: string;
  reason: string;
  provider: string;
  model: string;
  prompt_version: string;
  scoring_strategy: "rag" | "full_text";
  embedding_model: string | null;
  embedding_dimensions: number | null;
  embedding_fingerprint: string | null;
  processing_config: Record<string, unknown>;
  missing_required_criteria: string[];
  processed_at: string;
  criteria: Grade[];
};
export type ExperienceSource = { id: string; text: string; opening_id: string | null; page: number | null; char_start: number; char_end: number };
export type RoleAssessment = {
  id: string; opening_id: string; opening_title: string; opening_status: string;
  state: string; recommendation: string; reason: string; confidence: number | null;
  score: number | null; score_provisional: boolean; match_run_id: string | null; failure_code: string | null;
  eligibility: { status?: "passed" | "failed" | "unknown" | "not_required";
    professional_months?: number; relevant_months?: number; required_total_months?: number;
    required_relevant_months?: number; reason?: string; evidence?: ExperienceSource[];
    checks?: { kind: string; domain: string | null; counted_months: number; required_months: number; status: string }[] };
};
export type Evaluation = {
  id: string; resume_id: string; state: string; recommendation: string; reason: string;
  confidence: number | null; recommended_assessment_id: string | null; processed_at: string | null;
  processing_config: Record<string, unknown>; roles: RoleAssessment[];
};
export type AssessmentDetail = { assessment: RoleAssessment; result: Match | null };
export type MatchResponse = { status: string; result: Match | null; evaluation: Evaluation | null };
export type Retention = {
  rejected_retention_days: number;
  other_candidate_retention_days: number;
};
export type Member = { user_id: string; role: "recruiter" };
