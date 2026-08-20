import type { RequestHandler } from "express";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";

const referralSchema = z.object({ workerId: z.string().trim().min(1), referralSource: z.string().trim().max(200).min(1) });

const getAuthenticatedWorker = async (req: Parameters<RequestHandler>[0]) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) throw new Error("UNAUTHORIZED");
  const token = authorization.slice("Bearer ".length);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Error("UNAUTHORIZED");
  if (data.user.user_metadata?.role !== "worker") throw new Error("FORBIDDEN");
  return data.user;
};

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

export const handleGetWorkerStats: RequestHandler = async (req, res) => {
  try {
    const user = await getAuthenticatedWorker(req);
    const phone = String(user.phone || user.user_metadata?.phone || "").replace(/^\+91/, "").replace(/\D/g, "").slice(-10);
    const { data: worker } = await supabase.from("workers").select("id,referral_code,phone_verified").eq("phone", phone).maybeSingle();
    if (!worker) return res.json({ profileViewsThisWeek: 0, referralCode: null, phoneVerified: false });
    const since = new Date(); since.setDate(since.getDate() - 7);
    const { count } = await supabase.from("analytics_events").select("id", { count: "exact", head: true }).eq("event_type", "profile_view").eq("worker_id", worker.id).gte("created_at", since.toISOString());
    return res.json({ profileViewsThisWeek: count ?? 0, referralCode: worker.referral_code ?? null, phoneVerified: Boolean(worker.phone_verified) });
  } catch {
    return res.json({ profileViewsThisWeek: 0, referralCode: null, phoneVerified: false });
  }
};
