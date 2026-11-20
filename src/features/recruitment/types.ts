export type Membership = { tenant_id: string; name: string; role: "recruiter" };
export type Identity = { user_id: string; memberships: Membership[] };
export type Opening = {
  id: string;
  title: string;
  job_description: string;
  status: "active" | "paused" | "closed";
  revision: number;
  source_revision: number;
  details: JobDetails;
  questions: string[];
  documents: JobDocument[];
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
  recruiter_decision: {
    decision: "shortlist" | "reject";
    saved_at: string;
    recruiter_id: string;
  } | null;
  retention_expires_at: string;
  profile: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    mobile?: string | null;
    skills?: string[];
    technologies?: string[];
    languages?: string[];
    education?: string[];
    work_history?: {
      company: string;
      title: string;
      years: number;
      summary: string;
    }[];
    certifications?: string[];
    summary?: string;
    total_experience_years?: number;
  };
};
export type CVMatch = {
  fit: boolean;
  score: number;
  matched: string[];
  missing: string[];
  exp_ok: boolean;
  reason: string;
  score_breakdown?: {
    policy_version: string;
    coverage_percent: number;
    base_score: number;
    preferred_bonus: number;
    additional_bonus: number;
    experience_required: number;
    experience_documented: number;
    criteria: {
      id: string;
      label: string;
      kind: "required" | "preferred";
      status: "met" | "partial" | "undocumented";
      credit: number;
      evidence: { path: string; quote: string } | null;
    }[];
    additional_skills: {
      skill: string;
      related_to: string;
      evidence: { path: string; quote: string };
    }[];
  } | null;
};
export type LegacyMatch = {
  match_run_id: string;
  score: number | null;
  recommendation: string;
  reason: string;
};
export type Match = CVMatch | LegacyMatch;
export type RoleAssessment = {
  id: string;
  opening_id: string;
  opening_title: string;
  opening_status: string;
  state: string;
  recommendation: string;
  reason: string;
  score: number | null;
  score_provisional: boolean;
  match_result: CVMatch | null;
};
export type Evaluation = {
  id: string;
  resume_id: string;
  state: string;
  recommendation: string;
  reason: string;
  confidence: number | null;
  recommended_assessment_id: string | null;
  processed_at: string | null;
  processing_config: Record<string, unknown>;
  roles: RoleAssessment[];
};
export type MatchResponse = {
  status: string;
  result: Match | null;
  evaluation: Evaluation | null;
};
export type Retention = {
  rejected_retention_days: number;
  other_candidate_retention_days: number;
};
export type Member = { user_id: string; role: "recruiter" };
