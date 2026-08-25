import type { RequestHandler } from "express";
import { z } from "zod";
import { supabase } from "../lib/supabase";
import type { ApiErrorResponse } from "../../shared/api";

const tokenUser = async (req: Parameters<RequestHandler>[0]) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) throw new Error("UNAUTHORIZED");
  const { data, error } = await supabase.auth.getUser(authorization.slice(7));
  if (error || !data.user) throw new Error("UNAUTHORIZED");
  return data.user;
};

export const handleWatchWorker: RequestHandler = async (req, res) => {
  try {
    const user = await tokenUser(req);
    const { workerId } = z.object({ workerId: z.string().trim().min(1) }).parse(req.body);

    // Worker cards may identify a worker by phone number. Resolve that public
    // identifier to the database UUID before calling the UUID-based RPC.
    const looksLikeUuid = z.string().uuid().safeParse(workerId).success;
    const workerQuery = supabase
      .from("workers")
      .select("id,name,available_today,away_until")
      .limit(1);
    const { data: workers, error: workerError } = looksLikeUuid
      ? await workerQuery.eq("id", workerId)
      : await workerQuery.eq("phone", workerId);
    const worker = workers?.[0];
    if (workerError || !worker) return res.status(404).json({ message: "Worker profile was not found." } satisfies ApiErrorResponse);

    const today = new Date().toISOString().slice(0, 10);
    const alreadyAvailable = Boolean(worker.available_today) && !(worker.away_until && worker.away_until >= today);
    if (alreadyAvailable) return res.json({ watching: false, alreadyAvailable: true });
    const email = user.email || String(user.user_metadata?.email || "");
    if (!email) return res.status(400).json({ message: "Your account does not have an email address for notifications." } satisfies ApiErrorResponse);

    const { error } = await supabase.rpc("create_availability_watcher", {
      p_worker_id: worker.id,
      p_requester_id: user.id,
      p_requester_email: email,
    });
    if (error) throw new Error(error.message);
    return res.json({ watching: true, alreadyAvailable: false });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    return res.status(code === "UNAUTHORIZED" ? 401 : 500).json({ message: code === "UNAUTHORIZED" ? "Please log in to receive availability notifications." : (code || "Unable to set notification.") } satisfies ApiErrorResponse);
  }
};

export const handleGetNotifications: RequestHandler = async (req, res) => {
  try {
    const user = await tokenUser(req);
    const { data, error } = await supabase.from("notifications").select("id,type,title,message,worker_id,read_at,created_at").eq("recipient_id", user.id).order("created_at", { ascending: false }).limit(50);
    if (error) throw new Error(error.message);
    return res.json({ notifications: data ?? [] });
  } catch (error) {
    const code = error instanceof Error ? error.message : "Unable to load notifications.";
    return res.status(code === "UNAUTHORIZED" ? 401 : 500).json({ message: code } satisfies ApiErrorResponse);
  }
};

export const handleMarkNotificationRead: RequestHandler = async (req, res) => {
  try {
    const user = await tokenUser(req);
    const { id } = z.object({ id: z.string().uuid() }).parse(req.body);
    const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).eq("recipient_id", user.id);
    if (error) throw new Error(error.message);
    return res.json({ ok: true });
  } catch (error) {
    const code = error instanceof Error ? error.message : "Unable to update notification.";
    return res.status(code === "UNAUTHORIZED" ? 401 : 500).json({ message: code });
  }
};
