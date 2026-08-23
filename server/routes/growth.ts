import type { RequestHandler } from "express";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";

const referralSchema = z.object({ workerId: z.string().trim().min(1), referralSource: z.string().trim().max(200).min(1) });
const profileViewSchema = z.object({ workerId: z.string().trim().min(1) });

const getAuthenticatedWorker = async (req: Parameters<RequestHandler>[0]) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) throw new Error("UNAUTHORIZED");
  const token = authorization.slice("Bearer ".length);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Error("UNAUTHORIZED");
  if (data.user.user_metadata?.role !== "worker") throw new Error("FORBIDDEN");
  return data.user;
};

const normalizePhone = (value: unknown) => String(value || "").replace(/^\+91/, "").replace(/\D/g, "").slice(-10);

export const handleRecordWorkerReferral: RequestHandler = async (req, res) => {
  try {
    const body = referralSchema.parse(req.body);
    const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { error } = await supabase.from("workers").update({ referral_source: body.referralSource }).eq("id", body.workerId).is("referral_source", null).gte("created_at", cutoff);
    if (error) throw error;
    return res.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to record referral.";
    return res.status(400).json({ message });
  }
};

export const handleRecordProfileView: RequestHandler = async (req, res) => {
  try {
    const body = profileViewSchema.parse(req.body);
    const { data: worker, error: workerError } = await supabase.from("workers").select("id").eq("id", body.workerId).maybeSingle();
    if (workerError) throw workerError;
    if (!worker) return res.status(404).json({ message: "Worker profile not found." });
    const { error } = await supabase.from("analytics_events").insert({ event_type: "profile_view", worker_id: String(worker.id), metadata: { source: "worker_profile" } });
    if (error) throw error;
    return res.json({ ok: true });
  } catch (error) {
    console.error("[profile-view] failed:", error);
    return res.status(400).json({ message: "Unable to record profile view." });
  }
};

export const handleGetWorkerStats: RequestHandler = async (req, res) => {
  try {
    const user = await getAuthenticatedWorker(req);
    const metadata = user.user_metadata ?? {};
    const phone = normalizePhone(user.phone || metadata.phone || metadata.phone_number);
    const metadataWorkerId = String(metadata.worker_id || metadata.workerId || metadata.profile_id || metadata.profileId || "").trim();

    const workerIds = new Set<string>();
    if (metadataWorkerId) workerIds.add(metadataWorkerId);
    if (phone) {
      const { data, error } = await supabase.from("workers").select("id").eq("phone", phone);
      if (error) throw error;
      for (const row of data ?? []) workerIds.add(String(row.id));
    }
    if (!workerIds.size) return res.json({ profileViewsThisWeek: 0, referralCode: null, phoneVerified: false });

    const { data: workerRows, error: workersError } = await supabase.from("workers").select("id,referral_code,phone_verified").in("id", Array.from(workerIds));
    if (workersError) throw workersError;
    const worker = workerRows?.find(row => metadataWorkerId && String(row.id) === metadataWorkerId) || workerRows?.[0];
    if (!worker) return res.json({ profileViewsThisWeek: 0, referralCode: null, phoneVerified: false });

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count, error: analyticsError } = await supabase
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "profile_view")
      .in("worker_id", Array.from(workerIds))
      .gte("created_at", since);
    if (analyticsError) throw analyticsError;

    return res.json({ profileViewsThisWeek: count ?? 0, referralCode: worker.referral_code ?? null, phoneVerified: Boolean(worker.phone_verified) });
  } catch (error) {
    console.error("[worker-stats] failed:", error);
    return res.status(500).json({ message: "Unable to load your profile reach right now." });
  }
};
