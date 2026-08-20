import type { RequestHandler } from "express";
import { supabase } from "../lib/supabase.js";

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
    const phone = String(user.phone || user.user_metadata?.phone || "")
      .replace(/^\+91/, "")
      .replace(/\D/g, "")
      .slice(-10);

    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ message: "Your worker account does not have a valid phone number." });
    }

    const { data, error } = await supabase
      .from("callback_requests")
      .select("id,client_name,client_phone,service_needed,preferred_time,notes,created_at,status")
      .eq("worker_id", phone)
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
