import type { RequestHandler } from "express";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^\d{10}$/),
  email: z.string().trim().email().max(200),
  location: z.string().trim().min(2).max(160),
  services: z.string().trim().max(500).default(""),
  description: z.string().trim().max(2000).default(""),
});

const getAgencyUser = async (req: Parameters<RequestHandler>[0]) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) throw new Error("UNAUTHORIZED");
  const token = authorization.slice("Bearer ".length);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Error("UNAUTHORIZED");
  if (data.user.user_metadata?.role !== "agency") throw new Error("FORBIDDEN");
  return data.user;
};

export const handleRegisterAgency: RequestHandler = async (req, res) => {
  try {
    const user = await getAgencyUser(req);
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Please check the agency details and try again." });
    const { data: existing } = await supabase.from("agencies").select("id,verified").eq("user_id", user.id).maybeSingle();
    const payload = { ...parsed.data, user_id: user.id, updated_at: new Date().toISOString() };
    const query = existing?.id
      ? supabase.from("agencies").update(payload).eq("id", existing.id).select().single()
      : supabase.from("agencies").insert(payload).select().single();
    const { data, error } = await query;
    if (error) throw error;
    return res.status(existing?.id ? 200 : 201).json({ agency: data });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const status = code === "UNAUTHORIZED" ? 401 : code === "FORBIDDEN" ? 403 : 500;
    return res.status(status).json({ message: status === 500 ? "Unable to save agency registration." : "Your login session is invalid or expired." });
  }
};

export const handleGetMyAgency: RequestHandler = async (req, res) => {
  try {
    const user = await getAgencyUser(req);
    const { data, error } = await supabase.from("agencies").select("id,name,phone,email,location,services,description,verified,created_at,updated_at").eq("user_id", user.id).maybeSingle();
    if (error) throw error;
    return res.json({ agency: data });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const status = code === "UNAUTHORIZED" ? 401 : code === "FORBIDDEN" ? 403 : 500;
    return res.status(status).json({ message: status === 500 ? "Unable to load agency profile." : "Your login session is invalid or expired." });
  }
};
