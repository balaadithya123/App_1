import type { RequestHandler } from "express";
import { supabase } from "../lib/supabase.js";

const normalizePhone = (value: unknown) => String(value || "")
  .replace(/^\+91/, "")
  .replace(/\D/g, "")
  .slice(-10);

const getAuthenticatedWorker = async (req: Parameters<RequestHandler>[0]) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) throw new Error("UNAUTHORIZED");
  const token = authorization.slice("Bearer ".length);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Error("UNAUTHORIZED");
  if (data.user.user_metadata?.role !== "worker") throw new Error("FORBIDDEN");
  return data.user;
};

export const handleGetWorkerCallbackRequests: RequestHandler = async (req, res) => {
  try {
    const user = await getAuthenticatedWorker(req);
    const metadata = user.user_metadata ?? {};
    const phone = normalizePhone(user.phone || metadata.phone);

    // Email login and phone verification are intentionally decoupled. The auth
    // user's phone can therefore be empty even though the worker profile has a
    // verified/registered phone in metadata or in public.workers.
    const workerIds = new Set<string>();
    for (const candidate of [metadata.worker_id, metadata.workerId, metadata.profile_id, metadata.profileId]) {
      if (candidate) workerIds.add(String(candidate));
    }
    if (phone) workerIds.add(phone);

    if (phone) {
      const { data: workers, error: workerError } = await supabase
        .from("workers")
        .select("id,phone")
        .or(`phone.eq.${phone},id.eq.${phone}`);
      if (workerError) throw workerError;
      for (const worker of workers ?? []) {
        workerIds.add(String(worker.id));
        if (normalizePhone(worker.phone)) workerIds.add(normalizePhone(worker.phone));
      }
    }

    if (workerIds.size === 0) {
      return res.json({ requests: [] });
    }

    const { data, error } = await supabase
      .from("callback_requests")
      .select("id,client_name,client_phone,service_needed,preferred_time,notes,created_at,status")
      .in("worker_id", Array.from(workerIds))
      .order("created_at", { ascending: false });

    if (error) throw error;
    return res.json({ requests: data ?? [] });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const status = code === "UNAUTHORIZED" ? 401 : code === "FORBIDDEN" ? 403 : 500;
    console.error("[callback-requests] worker load failed:", error);
    return res.status(status).json({
      message: status === 500 ? (error instanceof Error ? error.message : "Unable to load callback requests.") : "Your login session is invalid or expired.",
    });
  }
};
