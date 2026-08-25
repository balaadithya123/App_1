import type { RequestHandler } from "express";
import { supabase } from "../lib/supabase";
import { getAllWorkers } from "./workers";

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

    for (const candidate of [metadata.worker_id, metadata.workerId, metadata.profile_id, metadata.profileId]) {
      if (candidate) workerIds.add(String(candidate));
    }

    if (phone) workerIds.add(phone);

    if (phone) {
      const { data: workers } = await supabase
        .from("workers")
        .select("id,phone")
        .eq("phone", phone);
      for (const worker of workers ?? []) workerIds.add(String(worker.id));
    }

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

export const handleDeleteWorkerCallbackRequest: RequestHandler = async (req, res) => {
  try {
    await getAuthenticatedWorker(req);
    const id = req.params.id;
    if (!id) return res.status(400).json({ message: "Callback ID is required." });

    const { error } = await supabase
      .from("callback_requests")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return res.json({ success: true, message: "Callback request deleted." });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const status = code === "UNAUTHORIZED" ? 401 : code === "FORBIDDEN" ? 403 : 500;
    return res.status(status).json({
      message: error instanceof Error ? error.message : "Unable to delete callback request.",
    });
  }
};

export const handleUpdateWorkerCallbackStatus: RequestHandler = async (req, res) => {
  try {
    await getAuthenticatedWorker(req);
    const id = req.params.id;
    const { status } = req.body;
    if (!id) return res.status(400).json({ message: "Callback ID is required." });

    const { error } = await supabase
      .from("callback_requests")
      .update({ status })
      .eq("id", id);

    if (error) throw error;
    return res.json({ success: true, message: "Callback status updated." });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const status = code === "UNAUTHORIZED" ? 401 : code === "FORBIDDEN" ? 403 : 500;
    return res.status(status).json({
      message: error instanceof Error ? error.message : "Unable to update callback request.",
    });
  }
};

