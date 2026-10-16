import { randomBytes } from "node:crypto";
import type { RequestHandler, Response } from "express";
import { supabase } from "../lib/supabase";
import {
  isMissingTable,
  normalizePhone,
  requireUser,
  requireVerifiedWorker,
} from "../lib/worker-identity";
import {
  RATE_UNITS,
  summarizeRates,
  validateJobSlip,
  validateWorkerRate,
  type JobSlipPreview,
  type PublicPassbook,
  type RateGuideGroup,
  type RateGuideResponse,
  type RateUnit,
  type WorkerRate,
} from "@shared/passbook";

const MAX_PENDING_PER_WORKER = 20;
const MAX_RATES_PER_WORKER = 10;
// At most this many jobs per worker count toward a rate guide, so one worker
// (or one worker and a friendly account) cannot set the going rate alone.
const MAX_GUIDE_JOBS_PER_WORKER = 2;
const GUIDE_WINDOW_DAYS = 365;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fail(err: unknown, res: Response, scope: string) {
  const message = err instanceof Error ? err.message : "";
  if (message === "UNAUTHORIZED") {
    return res.status(401).json({ code: "unauthorized", message: "Please sign in." });
  }
  if (message === "PHONE_NOT_VERIFIED") {
    return res.status(403).json({
      code: "phone_not_verified",
      message: "Verify your phone number to use Work Passbook.",
    });
  }
  if (message === "WORKER_NOT_FOUND") {
    return res.status(404).json({ code: "worker_not_found", message: "No worker profile found for this account." });
  }
  if (isMissingTable(err)) {
    return res.status(503).json({ code: "not_ready", message: "Work Passbook is not available yet." });
  }
  console.error(`[passbook] ${scope} error:`, err);
  return res.status(500).json({ code: "error", message: "Something went wrong. Please try again." });
}

const escapeLike = (value: string) => value.replace(/[\\%_]/g, "\\$&");
const money = (value: unknown) => Math.round(Number(value) * 100) / 100;
const text = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);

function monthLabel(isoDate: string): string {
  const [y, m] = isoDate.split("-");
  return `${MONTHS[Number(m) - 1] ?? ""} ${y}`.trim();
}

// POST /api/passbook/jobs  (verified worker)
export const handleCreateJobSlip: RequestHandler = async (req, res) => {
  try {
    const { worker } = await requireVerifiedWorker(req);
    const body = (req.body ?? {}) as Record<string, unknown>;
    const input = {
      service_label: text(body.service_label, 60),
      description: text(body.description, 300) || null,
      job_date: text(body.job_date, 10),
      agreed_rate: money(body.agreed_rate),
      rate_unit: text(body.rate_unit, 10) as RateUnit,
      advance: money(body.advance ?? 0),
    };
    const problem = validateJobSlip(input);
    if (problem) return res.status(400).json({ code: "invalid", message: problem });

    const { count, error: countError } = await supabase
      .from("job_records")
      .select("id", { count: "exact", head: true })
      .eq("worker_id", worker.id)
      .eq("status", "pending");
    if (countError) throw countError;
    if ((count ?? 0) >= MAX_PENDING_PER_WORKER) {
      return res.status(429).json({
        code: "too_many_pending",
        message: "You have many jobs waiting for confirmation. Ask customers to confirm or cancel some first.",
      });
    }

    const { data, error } = await supabase
      .from("job_records")
      .insert({
        worker_id: worker.id,
        worker_category: worker.category ?? null,
        locality: worker.locality ?? null,
        service_label: input.service_label,
        description: input.description,
        job_date: input.job_date,
        agreed_rate: input.agreed_rate,
        rate_unit: input.rate_unit,
        advance: input.advance,
        claim_token: randomBytes(16).toString("hex"),
      })
      .select()
      .single();
    if (error) throw error;
    return res.status(201).json({ job: data, worker_name: worker.name });
  } catch (err) {
    return fail(err, res, "create slip");
  }
};

// GET /api/passbook/mine  (verified worker)
export const handleGetMyPassbook: RequestHandler = async (req, res) => {
  try {
    const { worker } = await requireVerifiedWorker(req);
    const [jobsResult, ratesResult] = await Promise.all([
      supabase
        .from("job_records")
        .select("*")
        .eq("worker_id", worker.id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("worker_rates")
        .select("service_label,rate_min,rate_max,rate_unit")
        .eq("worker_id", worker.id)
        .order("updated_at", { ascending: false }),
    ]);
    if (jobsResult.error) throw jobsResult.error;
    if (ratesResult.error) throw ratesResult.error;
    return res.json({
      worker: { id: worker.id, name: worker.name, category: worker.category },
      jobs: jobsResult.data ?? [],
      rates: ratesResult.data ?? [],
    });
  } catch (err) {
    return fail(err, res, "mine");
  }
};

// POST /api/passbook/jobs/:id/cancel  (verified worker, pending slips only)
export const handleCancelJobSlip: RequestHandler = async (req, res) => {
  try {
    const { worker } = await requireVerifiedWorker(req);
    const { data, error } = await supabase
      .from("job_records")
      .update({ status: "cancelled", responded_at: new Date().toISOString() })
      .eq("id", String(req.params.id))
      .eq("worker_id", worker.id)
      .eq("status", "pending")
      .select("id");
    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ code: "not_found", message: "That job is no longer waiting for confirmation." });
    }
    return res.json({ ok: true });
  } catch (err) {
    return fail(err, res, "cancel");
  }
};

async function loadSlip(token: string) {
  const { data: job, error } = await supabase
    .from("job_records")
    .select("*")
    .eq("claim_token", token)
    .maybeSingle();
  if (error) throw error;
  if (!job) return null;
  const { data: worker, error: workerError } = await supabase
    .from("workers")
    .select("id,name,category,photo_url,phone_number")
    .eq("id", job.worker_id)
    .maybeSingle();
  if (workerError) throw workerError;
  return { job, worker };
}

// GET /api/passbook/slips/:token  (any signed-in user)
export const handlePreviewJobSlip: RequestHandler = async (req, res) => {
  try {
    const user = await requireUser(req);
    const token = String(req.params.token || "");
    if (!/^[a-f0-9]{32}$/.test(token)) return res.status(404).json({ code: "not_found", message: "This job link is not valid." });
    const slip = await loadSlip(token);
    if (!slip) return res.status(404).json({ code: "not_found", message: "This job link is not valid." });
    const { job, worker } = slip;
    const isOwn = Boolean(worker?.phone_number) && normalizePhone(worker?.phone_number) === normalizePhone(user.phone);
    const preview: JobSlipPreview = {
      id: job.id,
      status: job.status,
      service_label: job.service_label,
      description: job.description,
      locality: job.locality,
      job_date: job.job_date,
      agreed_rate: Number(job.agreed_rate),
      rate_unit: job.rate_unit,
      advance: Number(job.advance),
      worker_name: worker?.name ?? "Worker",
      worker_category: worker?.category ?? job.worker_category,
      worker_photo_url: worker?.photo_url ?? null,
    };
    return res.json({ slip: preview, can_respond: job.status === "pending" && !isOwn, is_own: isOwn });
  } catch (err) {
    return fail(err, res, "preview");
  }
};

// POST /api/passbook/slips/:token/respond  (any signed-in user except the worker)
export const handleRespondJobSlip: RequestHandler = async (req, res) => {
  try {
    const user = await requireUser(req);
    const token = String(req.params.token || "");
    const action = String((req.body ?? {}).action || "");
    if (!/^[a-f0-9]{32}$/.test(token)) return res.status(404).json({ code: "not_found", message: "This job link is not valid." });
    if (action !== "confirm" && action !== "decline") {
      return res.status(400).json({ code: "invalid", message: "Choose confirm or decline." });
    }
    const slip = await loadSlip(token);
    if (!slip) return res.status(404).json({ code: "not_found", message: "This job link is not valid." });
    const { job, worker } = slip;
    if (worker?.phone_number && normalizePhone(worker.phone_number) === normalizePhone(user.phone)) {
      return res.status(403).json({ code: "own_job", message: "You can't confirm your own job." });
    }
    if (job.status !== "pending") {
      return res.status(409).json({ code: "already_answered", message: `This job was already ${job.status}.` });
    }
    const { data, error } = await supabase
      .from("job_records")
      .update({
        status: action === "confirm" ? "confirmed" : "declined",
        customer_user_id: user.id,
        responded_at: new Date().toISOString(),
      })
      .eq("id", job.id)
      .eq("status", "pending")
      .select("id,status");
    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(409).json({ code: "already_answered", message: "This job was just answered." });
    }
    return res.json({ ok: true, status: data[0].status });
  } catch (err) {
    return fail(err, res, "respond");
  }
};

// PUT /api/passbook/rates  (verified worker)
export const handlePutWorkerRates: RequestHandler = async (req, res) => {
  try {
    const { worker } = await requireVerifiedWorker(req);
    const raw = (req.body ?? {}).rates;
    if (!Array.isArray(raw) || raw.length > MAX_RATES_PER_WORKER) {
      return res.status(400).json({ code: "invalid", message: `Add up to ${MAX_RATES_PER_WORKER} rates.` });
    }
    const rates: WorkerRate[] = raw.map((r: Record<string, unknown>) => ({
      service_label: text(r.service_label, 60),
      rate_min: money(r.rate_min),
      rate_max: money(r.rate_max),
      rate_unit: text(r.rate_unit, 10) as RateUnit,
    }));
    for (const rate of rates) {
      const problem = validateWorkerRate(rate);
      if (problem) return res.status(400).json({ code: "invalid", message: problem });
    }

    const { data: old, error: oldError } = await supabase.from("worker_rates").select("id").eq("worker_id", worker.id);
    if (oldError) throw oldError;
    if (rates.length > 0) {
      const { error: insertError } = await supabase
        .from("worker_rates")
        .insert(rates.map((r) => ({ ...r, worker_id: worker.id })));
      if (insertError) throw insertError;
    }
    // Old rows are removed only after the new ones are saved, so a failed save keeps what was there.
    const oldIds = (old ?? []).map((r: { id: string }) => r.id);
    if (oldIds.length > 0) {
      const { error: deleteError } = await supabase.from("worker_rates").delete().in("id", oldIds);
      if (deleteError) throw deleteError;
    }
    return res.json({ ok: true, rates });
  } catch (err) {
    return fail(err, res, "put rates");
  }
};

// GET /api/passbook/workers/:id  (public)
export const handleGetPublicPassbook: RequestHandler = async (req, res) => {
  try {
    const workerId = String(req.params.id || "").slice(0, 100);
    if (!workerId) return res.status(400).json({ code: "invalid", message: "Worker id is required." });
    const [jobsResult, ratesResult] = await Promise.all([
      supabase
        .from("job_records")
        .select("service_label,job_date,locality,customer_user_id")
        .eq("worker_id", workerId)
        .eq("status", "confirmed")
        .order("job_date", { ascending: false })
        .limit(200),
      supabase
        .from("worker_rates")
        .select("service_label,rate_min,rate_max,rate_unit")
        .eq("worker_id", workerId)
        .order("updated_at", { ascending: false })
        .limit(MAX_RATES_PER_WORKER),
    ]);
    if (jobsResult.error) throw jobsResult.error;
    if (ratesResult.error) throw ratesResult.error;
    const jobs = jobsResult.data ?? [];
    const payload: PublicPassbook = {
      confirmed_jobs: jobs.length,
      distinct_customers: new Set(jobs.map((j: { customer_user_id: string | null }) => j.customer_user_id).filter(Boolean)).size,
      since: jobs.length ? jobs[jobs.length - 1].job_date : null,
      recent: jobs.slice(0, 5).map((j: { service_label: string; job_date: string; locality: string | null }) => ({
        service_label: j.service_label,
        month: monthLabel(j.job_date),
        locality: j.locality,
      })),
      rates: (ratesResult.data ?? []).map((r: WorkerRate) => ({
        service_label: r.service_label,
        rate_min: Number(r.rate_min),
        rate_max: Number(r.rate_max),
        rate_unit: r.rate_unit,
      })),
    };
    res.setHeader("Cache-Control", "public, max-age=60");
    return res.json(payload);
  } catch (err) {
    return fail(err, res, "public passbook");
  }
};

// GET /api/rate-guide?category=Plumber&location=Tambaram  (public)
export const handleGetRateGuide: RequestHandler = async (req, res) => {
  try {
    const category = text(req.query.category, 40);
    const location = text(req.query.location, 60);
    if (!category) return res.status(400).json({ code: "invalid", message: "Choose a trade." });

    const since = new Date(Date.now() - GUIDE_WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10);
    let jobsQuery = supabase
      .from("job_records")
      .select("worker_id,agreed_rate,rate_unit,job_date")
      .eq("status", "confirmed")
      .ilike("worker_category", escapeLike(category))
      .gte("job_date", since)
      .order("job_date", { ascending: false })
      .limit(2000);
    if (location) jobsQuery = jobsQuery.ilike("locality", `%${escapeLike(location)}%`);

    let workersQuery = supabase.from("workers").select("id").ilike("category", escapeLike(category)).limit(500);
    if (location) workersQuery = workersQuery.ilike("locality", `%${escapeLike(location)}%`);

    const [jobsResult, workersResult] = await Promise.all([jobsQuery, workersQuery]);
    if (jobsResult.error) throw jobsResult.error;
    if (workersResult.error) throw workersResult.error;

    const workerIds = (workersResult.data ?? []).map((w: { id: string }) => w.id);
    let listed: { worker_id: string; rate_min: number; rate_max: number; rate_unit: RateUnit }[] = [];
    if (workerIds.length > 0) {
      const { data, error } = await supabase
        .from("worker_rates")
        .select("worker_id,rate_min,rate_max,rate_unit")
        .in("worker_id", workerIds);
      if (error) throw error;
      listed = data ?? [];
    }

    const groups: RateGuideGroup[] = [];
    for (const unit of RATE_UNITS) {
      const perWorkerJobs = new Map<string, number>();
      const jobRates: number[] = [];
      for (const j of (jobsResult.data ?? []) as { worker_id: string; agreed_rate: number; rate_unit: RateUnit }[]) {
        if (j.rate_unit !== unit) continue;
        const used = perWorkerJobs.get(j.worker_id) ?? 0;
        if (used >= MAX_GUIDE_JOBS_PER_WORKER) continue;
        perWorkerJobs.set(j.worker_id, used + 1);
        jobRates.push(Number(j.agreed_rate));
      }
      const perWorkerListed = new Map<string, number[]>();
      for (const r of listed) {
        if (r.rate_unit !== unit) continue;
        const mids = perWorkerListed.get(r.worker_id) ?? [];
        mids.push((Number(r.rate_min) + Number(r.rate_max)) / 2);
        perWorkerListed.set(r.worker_id, mids);
      }
      const listedMidpoints = [...perWorkerListed.values()].map((mids) => mids.reduce((a, b) => a + b, 0) / mids.length);
      const group = summarizeRates(unit, jobRates, listedMidpoints);
      if (group.source !== "none") groups.push(group);
    }

    const payload: RateGuideResponse = { category, location, groups };
    res.setHeader("Cache-Control", "public, max-age=300");
    return res.json(payload);
  } catch (err) {
    return fail(err, res, "rate guide");
  }
};
