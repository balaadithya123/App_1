import type { RequestHandler } from "express";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";
import { getAllWorkers } from "./workers.js";

const callbackSchema = z.object({
  workerId: z.string().trim().min(1).optional().nullable(),
  agencyId: z.string().trim().min(1).optional().nullable(),
  clientName: z.string().trim().min(1).max(120),
  clientPhone: z.string().trim().regex(/^\d{10}$/),
  serviceNeeded: z.string().trim().min(1).max(200),
  preferredTime: z.string().trim().min(1).max(120),
  notes: z.string().max(2000).optional().nullable(),
}).refine(value => Boolean(value.workerId || value.agencyId), { message: "A callback target is required." });

const normalizePhone = (value: unknown) => String(value || "").replace(/^\+91/, "").replace(/\D/g, "").slice(-10);
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

export const handleCreateCallbackRequest: RequestHandler = async (req, res) => {
  try {
    const parsed = callbackSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Please check the callback details and try again." });
    const { workerId, agencyId, clientName, clientPhone, serviceNeeded, preferredTime, notes } = parsed.data;

    let resolvedWorkerId = workerId || null;
    if (resolvedWorkerId) {
      const { data: worker, error } = await supabase.from("workers").select("id").eq("id", resolvedWorkerId).maybeSingle();
      if (error) throw error;
      if (!worker) return res.status(404).json({ message: "Worker profile not found." });
    }
    if (agencyId) {
      const { data: agency, error } = await supabase.from("agencies").select("id").eq("id", agencyId).maybeSingle();
      if (error) throw error;
      if (!agency) return res.status(404).json({ message: "Agency profile not found." });
    }

    const { data, error } = await supabase.from("callback_requests").insert({
      worker_id: resolvedWorkerId,
      agency_id: agencyId || null,
      client_name: clientName,
      client_phone: clientPhone,
      service_needed: serviceNeeded,
      preferred_time: preferredTime,
      notes: notes || null,
    }).select("id,client_name,client_phone,service_needed,preferred_time,notes,created_at,status,worker_id,agency_id").single();
    if (error) throw error;
    return res.status(201).json({ request: data });
  } catch (error) {
    console.error("[callback-requests] create failed:", error);
    return res.status(500).json({ message: "Unable to send the callback request right now. Please try again." });
  }
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
      const { data: workers, error } = await supabase.from("workers").select("id,phone").eq("phone", phone);
      if (error) throw error;
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
    return res.status(status).json({ message: status === 500 ? (error instanceof Error ? error.message : "Unable to load callback requests.") : "Your login session is invalid or expired." });
  }
};
