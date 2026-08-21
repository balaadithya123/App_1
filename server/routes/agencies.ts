import type { RequestHandler } from "express";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  contactPersonName: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^\d{10}$/),
  email: z.string().trim().email().max(200),
  categories: z.array(z.string().trim().min(1).max(80)).min(1).max(10),
  serviceLocations: z.array(z.string().trim().min(1).max(120)).min(1).max(20),
  teamSizeBand: z.enum(["2-5", "6-15", "15+"]),
  businessRegistrationNumber: z.string().trim().max(100).optional().default(""),
  logoUrl: z.string().url().max(1000).optional().or(z.literal("")).default(""),
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
    if (!parsed.success) return res.status(400).json({ message: "Please check the agency details and try again.", errors: parsed.error.flatten().fieldErrors });
    const { data: existing } = await supabase.from("agencies").select("id").eq("user_id", user.id).maybeSingle();
    const { data, error } = existing?.id
      ? await supabase.from("agencies").update({ user_id: user.id, name: parsed.data.name, contact_person_name: parsed.data.contactPersonName, phone: parsed.data.phone, email: parsed.data.email, categories: parsed.data.categories, service_locations: parsed.data.serviceLocations, location: parsed.data.serviceLocations.join(", "), team_size_band: parsed.data.teamSizeBand, business_registration_number: parsed.data.businessRegistrationNumber || null, logo_url: parsed.data.logoUrl || null, description: parsed.data.description, updated_at: new Date().toISOString() }).eq("id", existing.id).select().single()
      : await supabase.from("agencies").insert({ user_id: user.id, name: parsed.data.name, contact_person_name: parsed.data.contactPersonName, phone: parsed.data.phone, email: parsed.data.email, categories: parsed.data.categories, service_locations: parsed.data.serviceLocations, location: parsed.data.serviceLocations.join(", "), team_size_band: parsed.data.teamSizeBand, business_registration_number: parsed.data.businessRegistrationNumber || null, logo_url: parsed.data.logoUrl || null, description: parsed.data.description }).select().single();
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
    const { data, error } = await supabase.from("agencies").select("id,name,contact_person_name,phone,email,categories,service_locations,team_size_band,business_registration_number,logo_url,location,services,description,verified,created_at,updated_at").eq("user_id", user.id).maybeSingle();
    if (error) throw error;
    return res.json({ agency: data });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const status = code === "UNAUTHORIZED" ? 401 : code === "FORBIDDEN" ? 403 : 500;
    return res.status(status).json({ message: status === 500 ? "Unable to load agency profile." : "Your login session is invalid or expired." });
  }
};
