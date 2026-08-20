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
    const phone = normalizePhone(user.phone || user.user_metadata?.phone);

    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ message: "Your worker account does not have a valid phone number." });
    }

    // Worker IDs historically used the phone number, but newer registrations may
    // use a generated ID. Resolve both forms so every callback is visible.
    const { data: workerRows, error: workerError } = await supabase
      .from("workers")
      .select("id,phone")
      .or(`id.eq.${phone},phone.eq.${phone}`);

    if (workerError) throw workerError;

    const workerIds = Array.from(new Set([
      phone,
      ...(workerRows ?? []).map((row) => String(row.id || "")).filter(Boolean),
      ...(workerRows ?? []).map((row) => normalizePhone(row.phone)).filter(Boolean),
    ]));

    const { data, error } = await supabase
      .from("callback_requests")
      .select("id,client_name,client_phone,service_needed,preferred_time,notes,created_at,status")
      .in("worker_id", workerIds)
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
