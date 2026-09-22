import type { Worker } from "./workers";

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

export type WorkerRegistrationRequest = {
  id?: string;
  fullName: string;
  phone: string;
  category: string;
  location: string;
  experience: string;
  services: string;
  about: string;
};

export type WorkersResponse = {
  workers: Worker[];
};

export type WorkerRegistrationSuccessResponse = {
  message: string;
  worker: Worker;
};

export type ApiErrorResponse = {
  message: string;
  errors?: Record<string, string[]>;
};

export type ReportRequest = {
  reason: string;
  feedback: string;
};

export type Report = ReportRequest & {
  id: string;
  createdAt: string;
};

export type ReportSuccessResponse = {
  message: string;
  report: Report;
};

export interface ScreeningCheckResult {
  is_stock_photo: boolean;
  is_duplicate_style: boolean;
  shows_actual_work: boolean;
  image_quality_issue: boolean;
  contains_inappropriate_content: boolean;
  contains_identifiable_third_party: boolean;
}

export type ScreeningVerdict = "approved" | "needs_review" | "rejected";

export interface ImageScreeningResult {
  id: string;
  name: string;
  verdict: ScreeningVerdict;
  checks: ScreeningCheckResult;
  reasons: string[];
  suggested_category: string | null;
  imageDataUrl?: string;
  timestamp?: string;
  workerName?: string;
  manualOverride?: {
    verdict: ScreeningVerdict;
    note: string;
    moderator: string;
    at: string;
  } | null;
}

export interface PortfolioScreenResponse {
  results: ImageScreeningResult[];
  summary: {
    total: number;
    approved: number;
    needs_review: number;
    rejected: number;
  };
}

export interface RankingSearchQuery {
  category: string;
  locality: string;
  free_text_need: string | null;
}

export interface RankingCandidateWorker {
  worker_id: string;
  name: string;
  categories: string[];
  years_experience: number;
  distance_km: number;
  avg_rating: number | null;
  num_ratings: number;
  trust_flags: string[];
  profile_completeness_pct: number;
  last_active_days_ago: number;
  responds_on_whatsapp: boolean;
}

export interface RankingInputPayload {
  search: RankingSearchQuery;
  candidates: RankingCandidateWorker[];
}

export interface RankedWorkerItem {
  worker_id: string;
  rank: number;
  score: number;
  reason: string;
}

export interface ExcludedWorkerItem {
  worker_id: string;
  reason: string;
}

export interface RankingOutputPayload {
  ranked: RankedWorkerItem[];
  excluded: ExcludedWorkerItem[];
}

export interface WorkerPortfolioItem {
  id: string;
  worker_id: string;
  image_url: string;
  label?: string;
  uploaded_at: string;
  status?: "approved" | "flagged";
  flag_reasons?: string[];
}

export interface WorkerTrustFlag {
  id: string;
  worker_id: string;
  flag_type: string;
  reason: string;
  created_at: string;
  resolved: boolean;
}

export interface PostNeedRequest {
  category: string;
  description: string;
  location: string;
  customerPhone?: string;
}

export interface PostNeedResponse {
  matchedWorkers: Worker[];
  totalMatched: number;
}

export interface RecordLeadResponse {
  success: boolean;
  workerId: string;
  leadsReceived: number;
}
