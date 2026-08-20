import type { RequestHandler } from "express";
import { supabase } from "../lib/supabase.js";
import { readRegisteredWorkers } from "../lib/registered-workers.js";
import { staticWorkers } from "../../shared/workers.js";

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
    const phone = normalizePhone(user.phone || user.user_metadata?.phone);
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ message: "Your worker account does not have a valid phone number." });
    }

    // Callback requests are keyed to the public worker profile id. Resolve the
    // signed-in worker against both the Supabase workers table and the profile
    // registry so older requests and newly registered workers are both included.
    const [registeredWorkers, workerRowsResult] = await Promise.all([
      readRegisteredWorkers(),
      supabase.from("workers").select("id,phone").or(`phone.eq.${phone},id.eq.${phone}`),
    ]);

    const workerIds = new Set<string>([phone]);
    for (const worker of staticWorkers) {
      if (normalizePhone(worker.phone) === phone) workerIds.add(String(worker.id));
    }
    for (const worker of registeredWorkers) {
      if (normalizePhone(worker.phone) === phone) workerIds.add(String(worker.id));
    }
    for (const worker of workerRowsResult.data ?? []) {
      if (normalizePhone(worker.phone) === phone || String(worker.id) === phone) workerIds.add(String(worker.id));
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
    return res.status(status).json({
      message: status === 500 ? (error instanceof Error ? error.message : "Unable to load callback requests.") : "Your login session is invalid or expired.",
    });
  }
};
