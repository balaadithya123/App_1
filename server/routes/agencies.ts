import type { RequestHandler } from "express";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { supabase } from "../lib/supabase";

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

const getAuthenticatedClient = (token: string) => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
  return createClient(url, key, {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
};

const getAgencyUser = async (req: Parameters<RequestHandler>[0]) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) throw new Error("UNAUTHORIZED");
  const token = authorization.slice("Bearer ".length);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Error("UNAUTHORIZED");
  const role = data.user.user_metadata?.role || data.user.app_metadata?.role;
  const isAdmin = data.user.app_metadata?.is_admin === true || role === "admin";
  if (role !== "agency" && !isAdmin) throw new Error("FORBIDDEN");
  return { user: data.user, token };
};

const generateAgencyCode = async () => {
  for (let attempt = 0; attempt < 50; attempt++) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "AGN-";
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    const { data, error } = await supabase.from("agencies").select("id").eq("agency_code", code).maybeSingle();
    if (!error && !data) return code;
  }
  return `AGN-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
};

const ensureAgencyCode = async (agency: any, client = supabase) => {
  if (agency?.agency_code && /^AGN-[A-Z0-9]{4,6}$/i.test(agency.agency_code)) return agency.agency_code.toUpperCase();
  const code = await generateAgencyCode();
  const { data, error } = await client.from("agencies").update({ agency_code: code, regenerated_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", agency.id).select("agency_code").single();
  if (error) return code;
  return data?.agency_code || code;
};

export const handleRegisterAgency: RequestHandler = async (req, res) => {
  try {
    const { user, token } = await getAgencyUser(req);
    const client = getAuthenticatedClient(token);
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Please check the agency details and try again.", errors: parsed.error.flatten().fieldErrors });
    }

    const { data: existing } = await client.from("agencies").select("id,agency_code").eq("user_id", user.id).maybeSingle();
    const agencyCode = existing?.agency_code && /^AGN-[A-Z0-9]{4,6}$/i.test(existing.agency_code) ? existing.agency_code.toUpperCase() : await generateAgencyCode();
    
    const payload: Record<string, unknown> = {
      user_id: user.id,
      name: parsed.data.name,
      contact_person_name: parsed.data.contactPersonName,
      phone: parsed.data.phone,
      email: parsed.data.email,
      categories: parsed.data.categories,
      service_locations: parsed.data.serviceLocations,
      location: parsed.data.serviceLocations.join(", "),
      team_size_band: parsed.data.teamSizeBand,
      business_registration_number: parsed.data.businessRegistrationNumber || null,
      logo_url: parsed.data.logoUrl || null,
      description: parsed.data.description,
      agency_code: agencyCode,
      verified: false,
      updated_at: new Date().toISOString(),
    };

    if (!existing?.agency_code) {
      payload.regenerated_at = new Date().toISOString();
    }

    const cleanPayload = Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined));
    const query = existing?.id
      ? client.from("agencies").update(cleanPayload).eq("id", existing.id).select().single()
      : client.from("agencies").insert(cleanPayload).select().single();

    const { data, error } = await query;
    if (error) {
      console.error("[agencies] Save error:", error);
      throw error;
    }

    return res.status(existing?.id ? 200 : 201).json({
      agency: data,
      agencyCode: data.agency_code,
      shareUrl: `/join?ref=${data.agency_code}`,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const status = code === "UNAUTHORIZED" ? 401 : code === "FORBIDDEN" ? 403 : 500;
    return res.status(status).json({ message: status === 500 ? `Unable to save agency registration: ${code || "error"}` : "Your login session is invalid or expired." });
  }
};

export const handleGetMyAgency: RequestHandler = async (req, res) => {
  try {
    const { user, token } = await getAgencyUser(req);
    const client = getAuthenticatedClient(token);
    const { data, error } = await client
      .from("agencies")
      .select("id,name,contact_person_name,phone,email,categories,service_locations,team_size_band,business_registration_number,logo_url,location,services,description,verified,agency_code,regenerated_at,created_at,updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.json({ agency: null });
    const agencyCode = await ensureAgencyCode(data, client);
    return res.json({ agency: { ...data, agency_code: agencyCode } });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const status = code === "UNAUTHORIZED" ? 401 : code === "FORBIDDEN" ? 403 : 500;
    return res.status(status).json({ message: status === 500 ? "Unable to load agency profile." : "Your login session is invalid or expired." });
  }
};

export const handleRegenerateAgencyCode: RequestHandler = async (req, res) => {
  try {
    const { user, token } = await getAgencyUser(req);
    const client = getAuthenticatedClient(token);
    const code = await generateAgencyCode();
    const { data, error } = await client.from("agencies").update({ agency_code: code, regenerated_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("user_id", user.id).select("agency_code,regenerated_at").single();
    if (error) throw error;
    return res.json({ agencyCode: data.agency_code, regeneratedAt: data.regenerated_at, shareUrl: `/join?ref=${data.agency_code}` });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const status = code === "UNAUTHORIZED" ? 401 : code === "FORBIDDEN" ? 403 : 500;
    return res.status(status).json({ message: status === 500 ? "Unable to regenerate agency code." : "Your login session is invalid or expired." });
  }
};

export const handleJoinAgency: RequestHandler = async (req, res) => {
  try {
    const parsed = z.object({ workerId: z.string().trim().min(1), agencyCode: z.string().trim().regex(/^AGN-[A-Z0-9]{4,6}$/i) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Enter a valid agency code." });
    const { data: agency } = await supabase.from("agencies").select("id,name,agency_code").eq("agency_code", parsed.data.agencyCode.toUpperCase()).maybeSingle();
    if (!agency) return res.status(404).json({ message: "Agency code not found. Check the code and try again." });
    const { data: worker, error } = await supabase.from("workers").update({ agency_id: agency.id }).eq("id", parsed.data.workerId).select("id,name,agency_id").single();
    if (error) throw error;
    return res.json({ worker, agency });
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : "Unable to join the agency." });
  }
};

const ensureArray = (val: any): string[] => {
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return val.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
};

const DEFAULT_ADMIN_AGENCIES = [
  {
    id: "agency-admin",
    name: "Admin Agency",
    contact_person_name: "Admin",
    phone: "8825551402",
    email: "pgbalaadithya@gmail.com",
    categories: ["Electrician", "Plumber", "Carpenter", "Painter", "Cleaner", "AC Repair", "Other"],
    service_locations: ["Chennai", "Trichy", "Kattur", "Tamil Nadu"],
    location: "Chennai, Trichy",
    team_size_band: "6-15",
    logo_url: null,
    description: "Verified multi-service agency providing licensed electricians, plumbers, carpenters, and technical repair teams across all zones.",
    verified: true,
    agency_code: "AGN-ADMN",
    created_at: new Date().toISOString(),
  },
];

export const handleGetAgencies: RequestHandler = async (req, res) => {
  try {
    const service = String(req.query.service || "").trim().toLowerCase();
    const location = String(req.query.location || "").trim().toLowerCase();
    
    // Check if token was provided in header
    const authorization = req.headers.authorization;
    let queryClient = supabase;
    if (authorization?.startsWith("Bearer ")) {
      const token = authorization.slice("Bearer ".length);
      queryClient = getAuthenticatedClient(token);
    }

    const { data, error } = await queryClient
      .from("agencies")
      .select("id,name,phone,email,categories,service_locations,location,team_size_band,logo_url,description,verified,agency_code,created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.warn("[agencies] Query notice:", error.message);
    }

    const fetchedRows = Array.isArray(data) ? data : [];
    
    // Combine fetched rows with default admin agency if not already present
    const combinedRows = [...fetchedRows];
    for (const def of DEFAULT_ADMIN_AGENCIES) {
      const exists = combinedRows.some(
        (r) =>
          r.id === def.id ||
          String(r.name || "").trim().toLowerCase() === def.name.toLowerCase() ||
          String(r.name || "").trim().toLowerCase() === "admin"
      );
      if (!exists) {
        combinedRows.push(def);
      }
    }

    const agencies = combinedRows
      .map((a) => ({
        ...a,
        categories: ensureArray(a.categories),
        service_locations: ensureArray(a.service_locations || a.location),
        worker_count: 0,
      }))
      .filter((a) => {
        const matchesService = !service || a.categories.some((c: string) => c.toLowerCase().includes(service) || service.includes(c.toLowerCase()));
        const matchesLoc =
          !location ||
          a.service_locations.some((l: string) => l.toLowerCase().includes(location) || location.includes(l.toLowerCase())) ||
          (a.location && a.location.toLowerCase().includes(location));
        return matchesService && matchesLoc;
      });

    return res.json({ agencies });
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : "Unable to load agencies." });
  }
};

export const handleGetAgencyTeam: RequestHandler = async (req, res) => {
  try {
    const id = String(req.params.id || "");
    if (!id) return res.status(400).json({ message: "Agency id is required." });

    const authorization = req.headers.authorization;
    let queryClient = supabase;
    if (authorization?.startsWith("Bearer ")) {
      const token = authorization.slice("Bearer ".length);
      queryClient = getAuthenticatedClient(token);
    }

    const { data: agency, error: agencyError } = await queryClient
      .from("agencies")
      .select("id,name,phone,email,categories,service_locations,location,team_size_band,logo_url,description,verified,agency_code")
      .eq("id", id)
      .maybeSingle();

    if (agencyError) {
      console.warn("[agencies] Get team query warning:", agencyError.message);
    }

    let targetAgency = agency;
    if (!targetAgency) {
      const foundDef = DEFAULT_ADMIN_AGENCIES.find((d) => d.id === id || id === "admin" || id === "agency-admin");
      if (foundDef) targetAgency = { ...foundDef };
    }

    if (!targetAgency) return res.status(404).json({ message: "Agency not found." });

    targetAgency.categories = ensureArray(targetAgency.categories);
    targetAgency.service_locations = ensureArray(targetAgency.service_locations || targetAgency.location);

    return res.json({ agency: targetAgency, workers: [] });
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : "Unable to load agency profile." });
  }
};

export const handleGetAgencyDashboard: RequestHandler = async (req, res) => {
  try {
    const { user, token } = await getAgencyUser(req);
    const client = getAuthenticatedClient(token);
    const { data: agency, error: agencyError } = await client
      .from("agencies")
      .select("id,name,phone,email,categories,service_locations,location,team_size_band,logo_url,description,verified,agency_code")
      .eq("user_id", user.id)
      .maybeSingle();

    if (agencyError) throw agencyError;

    if (!agency) {
      return res.json({
        profileIncomplete: true,
        agency: {
          id: "",
          name: String(user.user_metadata?.name || ""),
          phone: String(user.user_metadata?.phone || ""),
          email: user.email || "",
          categories: [],
          service_locations: [],
          team_size_band: "2-5",
          logo_url: null,
          location: "",
          description: "",
          verified: false,
          agency_code: "",
        },
        workers: [],
        stats: { linkedWorkers: 0, whatsappClicks7d: 0, callbacks7d: 0 },
        callbacks: [],
      });
    }

    const agencyCode = await ensureAgencyCode(agency, client);
    agency.agency_code = agencyCode;
    agency.categories = ensureArray(agency.categories);
    agency.service_locations = ensureArray(agency.service_locations || agency.location);

    return res.json({
      agency,
      workers: [],
      stats: { linkedWorkers: 0, whatsappClicks7d: 0, callbacks7d: 0 },
      callbacks: [],
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const status = code === "UNAUTHORIZED" ? 401 : code === "FORBIDDEN" ? 403 : 500;
    return res.status(status).json({ message: status === 500 ? `Unable to load agency dashboard: ${code || "server error"}` : "Your login session is invalid or expired." });
  }
};

export const handleUpdateAgencyCallbackStatus: RequestHandler = async (req, res) => {
  try {
    const { user, token } = await getAgencyUser(req);
    const client = getAuthenticatedClient(token);
    const id = String(req.params.id || "");
    const parsed = z.object({ status: z.enum(["new", "contacted", "closed"]) }).safeParse(req.body);
    if (!id || !parsed.success) return res.status(400).json({ message: "Invalid callback update." });
    const { data: agency } = await client.from("agencies").select("id").eq("user_id", user.id).maybeSingle();
    if (!agency) return res.status(404).json({ message: "Agency profile not found." });
    const { data, error } = await client.from("callback_requests").update({ status: parsed.data.status }).eq("id", id).select("id,status").single();
    if (error) throw error;
    return res.json({ callback: data });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const status = code === "UNAUTHORIZED" ? 401 : code === "FORBIDDEN" ? 403 : 500;
    return res.status(status).json({ message: status === 500 ? "Unable to update callback request." : "Your login session is invalid or expired." });
  }
};

