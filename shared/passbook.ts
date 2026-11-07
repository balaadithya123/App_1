/**
 * Work Passbook + Fair Rate Guide: types and pure logic shared by client and server.
 * No money moves through the app. A job slip is a record that a worker and a
 * customer agreed on a job, and that the customer later confirmed it.
 */

export const RATE_UNITS = ["job", "day", "hour"] as const;
export type RateUnit = (typeof RATE_UNITS)[number];

export const RATE_UNIT_LABEL: Record<RateUnit, string> = {
  job: "per job",
  day: "per day",
  hour: "per hour",
};

export type JobStatus = "pending" | "confirmed" | "declined" | "cancelled";

export interface JobRecord {
  id: string;
  worker_id: string;
  worker_category: string | null;
  service_label: string;
  description: string | null;
  locality: string | null;
  job_date: string; // YYYY-MM-DD
  agreed_rate: number;
  rate_unit: RateUnit;
  advance: number;
  status: JobStatus;
  claim_token: string;
  created_at: string;
  responded_at: string | null;
}

/** What a customer sees when they open a slip link. Never includes the token owner's phone. */
export interface JobSlipPreview {
  id: string;
  status: JobStatus;
  service_label: string;
  description: string | null;
  locality: string | null;
  job_date: string;
  agreed_rate: number;
  rate_unit: RateUnit;
  advance: number;
  worker_name: string;
  worker_category: string | null;
  worker_photo_url: string | null;
}

export interface WorkerRate {
  service_label: string;
  rate_min: number;
  rate_max: number;
  rate_unit: RateUnit;
}

export interface PublicPassbook {
  confirmed_jobs: number;
  distinct_customers: number;
  since: string | null; // ISO date of the first confirmed job
  recent: { service_label: string; month: string; locality: string | null }[];
  rates: WorkerRate[];
}

export type RateSource = "jobs" | "listed" | "none";

export interface RateGuideGroup {
  unit: RateUnit;
  source: RateSource;
  sample_size: number;
  low: number | null; // 25th percentile
  typical: number | null; // median
  high: number | null; // 75th percentile
}

export interface RateGuideResponse {
  category: string;
  location: string;
  groups: RateGuideGroup[];
}

// A guide is only shown when enough independent data points back it up, so a
// single worker's price is never presented as "the going rate".
export const MIN_JOBS_FOR_GUIDE = 5;
export const MIN_LISTED_FOR_GUIDE = 3;

export const MAX_RATE = 1_000_000;

/** Linear-interpolated percentile of a numeric list (p in 0..1).
 * Performance Optimization:
 * - Accepts optional `isSorted` flag to avoid redundant array cloning and O(N log N) sorting
 *   when computing multiple percentiles on the same dataset.
 */
export function percentile(values: number[], p: number, isSorted = false): number {
  if (values.length === 0) return NaN;
  const sorted = isSorted ? values : [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * Math.min(1, Math.max(0, p));
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

const roundTo5 = (n: number) => Math.round(n / 5) * 5;

/**
 * Builds one guide group from confirmed-job rates and workers' listed
 * mid-points. Real jobs win when there are enough of them; otherwise listed
 * rates are used when enough different workers listed one.
 */
export function summarizeRates(
  unit: RateUnit,
  jobRates: number[],
  listedMidpoints: number[],
): RateGuideGroup {
  const jobs = jobRates.filter((n) => Number.isFinite(n) && n > 0);
  const listed = listedMidpoints.filter((n) => Number.isFinite(n) && n > 0);

  let source: RateSource = "none";
  let sample: number[] = [];
  if (jobs.length >= MIN_JOBS_FOR_GUIDE) {
    source = "jobs";
    sample = jobs;
  } else if (listed.length >= MIN_LISTED_FOR_GUIDE) {
    source = "listed";
    sample = listed;
  }

  if (source === "none") {
    return { unit, source, sample_size: Math.max(jobs.length, listed.length), low: null, typical: null, high: null };
  }

  // Pre-sort sample dataset once to eliminate 2 out of 3 redundant sort passes & array allocations
  const sortedSample = [...sample].sort((a, b) => a - b);

  return {
    unit,
    source,
    sample_size: sample.length,
    low: roundTo5(percentile(sortedSample, 0.25, true)),
    typical: roundTo5(percentile(sortedSample, 0.5, true)),
    high: roundTo5(percentile(sortedSample, 0.75, true)),
  };
}

export interface JobSlipInput {
  service_label: string;
  description?: string | null;
  job_date: string;
  agreed_rate: number;
  rate_unit: RateUnit;
  advance?: number;
}

/** Returns an error message, or null when the slip is valid. */
export function validateJobSlip(input: Partial<JobSlipInput>, today = new Date()): string | null {
  const label = (input.service_label ?? "").trim();
  if (label.length < 2 || label.length > 60) return "Describe the job in 2 to 60 characters.";
  if (input.description && input.description.length > 300) return "Keep the details under 300 characters.";
  if (!input.job_date || !/^\d{4}-\d{2}-\d{2}$/.test(input.job_date)) return "Pick the job date.";
  const date = new Date(`${input.job_date}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "Pick a valid job date.";
  const dayMs = 86_400_000;
  const diffDays = (date.getTime() - Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())) / dayMs;
  if (diffDays > 60) return "The job date can be at most 60 days from now.";
  if (diffDays < -60) return "The job date can be at most 60 days in the past.";
  const rate = Number(input.agreed_rate);
  if (!Number.isFinite(rate) || rate <= 0 || rate > MAX_RATE) return "Enter the agreed rate in rupees.";
  if (!input.rate_unit || !RATE_UNITS.includes(input.rate_unit)) return "Choose per job, per day or per hour.";
  const advance = Number(input.advance ?? 0);
  if (!Number.isFinite(advance) || advance < 0 || advance > rate * 100) return "Enter a valid advance amount.";
  return null;
}

/** Returns an error message, or null when the rate range is valid. */
export function validateWorkerRate(rate: Partial<WorkerRate>): string | null {
  const label = (rate.service_label ?? "").trim();
  if (label.length < 2 || label.length > 60) return "Name each service in 2 to 60 characters.";
  const min = Number(rate.rate_min);
  const max = Number(rate.rate_max);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max <= 0) return "Enter rates in rupees.";
  if (min > max) return "The lowest rate cannot be above the highest.";
  if (max > MAX_RATE) return "That rate looks too high.";
  if (!rate.rate_unit || !RATE_UNITS.includes(rate.rate_unit)) return "Choose per job, per day or per hour.";
  return null;
}

/** WhatsApp text the worker sends so the customer can confirm the job. */
export function buildSlipShareMessage(input: {
  workerName: string;
  serviceLabel: string;
  jobDate: string;
  agreedRate: number;
  rateUnit: RateUnit;
  advance: number;
  url: string;
}): string {
  const rate = new Intl.NumberFormat("en-IN").format(input.agreedRate);
  const lines = [
    `Hi, this is ${input.workerName}. Here is the job we agreed on:`,
    `- Job: ${input.serviceLabel}`,
    `- Date: ${input.jobDate}`,
    `- Rate: ₹${rate} ${RATE_UNIT_LABEL[input.rateUnit]}`,
  ];
  if (input.advance > 0) {
    lines.push(`- Advance: ₹${new Intl.NumberFormat("en-IN").format(input.advance)}`);
  }
  lines.push("Please confirm it here (sign-in needed):", input.url);
  return lines.join("\n");
}
