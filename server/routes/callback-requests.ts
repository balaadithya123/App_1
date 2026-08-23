import type { RequestHandler } from "express";
import { supabase } from "../lib/supabase.js";
import { getAllWorkers } from "./workers.js";

const normalizePhone = (value: unknown) => String(value || "")
  .replace(/^\+91/, "")
  .replace(/\D/g, "")
  .slice(-10);

const normalizeName = (value: unknown) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");

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
    const phone = normalizePhone(user.phone || metadata.phone || metadata.phone_number);
    const name = normalizeName(metadata.name || metadata.full_name || metadata.fullName);
    const workerIds = new Set<string>();

    // Email login and phone verification are intentionally decoupled. Resolve the
    // actual worker record first, then use its real id when querying callback_requests.
    for (const candidate of [metadata.worker_id, metadata.workerId, metadata.profile_id, metadata.profileId]) {
      if (candidate) workerIds.add(String(candidate));
    }

    if (phone) {
      const { data: workers, error: workerError } = await supabase
        .from("workers")
        .select("id,phone")
        .eq("phone", phone);
      if (workerError) throw workerError;
      for (const worker of workers ?? []) {
        workerIds.add(String(worker.id));
      }
    }

    // Some registered workers live in the app's registered-worker store rather
    // than public.workers. Match those records by the verified phone or exact name.
    const allWorkers = await getAllWorkers();
    for (const worker of allWorkers) {
      if ((phone && normalizePhone(worker.phone) === phone) || (name && normalizeName(worker.name) === name)) {
        workerIds.add(String(worker.id));
      }
    }

    if (workerIds.size === 0) return res.json({ requests: [] });

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
