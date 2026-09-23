import type { RequestHandler } from "express";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { supabase } from "../lib/supabase";
import { readRegisteredWorkers } from "../lib/registered-workers";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  contactPersonName: z.string().trim().min(2).max(120),
  phone: z
    .string()
    .trim()
    .regex(/^\d{10}$/),
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
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    "";
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
    for (let i = 0; i < 4; i++)
      code += chars[Math.floor(Math.random() * chars.length)];
    const { data, error } = await supabase
      .from("agencies")
      .select("id")
      .eq("agency_code", code)
      .maybeSingle();
    if (!error && !data) return code;
  }
  return `AGN-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
};

const ensureAgencyCode = async (agency: any, client = supabase) => {
  if (agency?.agency_code && /^AGN-[A-Z0-9]{4,6}$/i.test(agency.agency_code))
    return agency.agency_code.toUpperCase();
  const code = await generateAgencyCode();
  const { data, error } = await client
    .from("agencies")
    .update({
      agency_code: code,
      regenerated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", agency.id)
    .select("agency_code")
    .single();
  if (error) return code;
  return data?.agency_code || code;
};

export const handleRegisterAgency: RequestHandler = async (req, res) => {
  try {
    const { user, token } = await getAgencyUser(req);
    const client = getAuthenticatedClient(token);
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({
          message: "Please check the agency details and try again.",
          errors: parsed.error.flatten().fieldErrors,
        });
    }

    const { data: existing } = await client
      .from("agencies")
      .select("id,agency_code")
      .eq("user_id", user.id)
      .maybeSingle();
    const agencyCode =
      existing?.agency_code && /^AGN-[A-Z0-9]{4,6}$/i.test(existing.agency_code)
        ? existing.agency_code.toUpperCase()
        : await generateAgencyCode();

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
      business_registration_number:
        parsed.data.businessRegistrationNumber || null,
      logo_url: parsed.data.logoUrl || null,
      description: parsed.data.description,
      agency_code: agencyCode,
      verified: false,
      updated_at: new Date().toISOString(),
    };

    if (!existing?.agency_code) {
      payload.regenerated_at = new Date().toISOString();
    }

    const cleanPayload = Object.fromEntries(
      Object.entries(payload).filter(([, v]) => v !== undefined),
    );
    const query = existing?.id
      ? client
          .from("agencies")
          .update(cleanPayload)
          .eq("id", existing.id)
          .select()
          .single()
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
    const status =
      code === "UNAUTHORIZED" ? 401 : code === "FORBIDDEN" ? 403 : 500;
    return res
      .status(status)
      .json({
        message:
          status === 500
            ? `Unable to save agency registration: ${code || "error"}`
            : "Your login session is invalid or expired.",
      });
  }
};

export const handleGetMyAgency: RequestHandler = async (req, res) => {
  try {
    const { user, token } = await getAgencyUser(req);
    const client = getAuthenticatedClient(token);
    const { data, error } = await client
      .from("agencies")
      .select(
        "id,name,contact_person_name,phone,email,categories,service_locations,team_size_band,business_registration_number,logo_url,location,services,description,verified,agency_code,regenerated_at,created_at,updated_at",
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.json({ agency: null });
    const agencyCode = await ensureAgencyCode(data, client);
    return res.json({ agency: { ...data, agency_code: agencyCode } });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const status =
      code === "UNAUTHORIZED" ? 401 : code === "FORBIDDEN" ? 403 : 500;
    return res
      .status(status)
      .json({
        message:
          status === 500
            ? "Unable to load agency profile."
            : "Your login session is invalid or expired.",
      });
  }
};

export const handleRegenerateAgencyCode: RequestHandler = async (req, res) => {
  try {
    const { user, token } = await getAgencyUser(req);
    const client = getAuthenticatedClient(token);
    const code = await generateAgencyCode();
    const { data, error } = await client
      .from("agencies")
      .update({
        agency_code: code,
        regenerated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .select("agency_code,regenerated_at")
      .single();
    if (error) throw error;
    return res.json({
      agencyCode: data.agency_code,
      regeneratedAt: data.regenerated_at,
      shareUrl: `/join?ref=${data.agency_code}`,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const status =
      code === "UNAUTHORIZED" ? 401 : code === "FORBIDDEN" ? 403 : 500;
    return res
      .status(status)
      .json({
        message:
          status === 500
            ? "Unable to regenerate agency code."
            : "Your login session is invalid or expired.",
      });
  }
};

export const handleJoinAgency: RequestHandler = async (req, res) => {
  try {
    const rawInput = String(
      req.body.agencyCode || req.body.agencyId || req.body.code || "",
    ).trim();
    const workerId = String(req.body.workerId || "").trim();

    if (!rawInput) {
      return res
        .status(400)
        .json({
          message:
            "Please enter an agency code or ID (e.g. AGN-ADMN or agency-admin).",
        });
    }
    if (!workerId) {
      return res.status(400).json({ message: "Worker ID is required." });
    }

    const cleanInputUpper = rawInput.toUpperCase();
    const formattedCode = cleanInputUpper.startsWith("AGN-")
      ? cleanInputUpper
      : `AGN-${cleanInputUpper}`;

    // 1. Look up agency in DB by exact code, formatted AGN- code, or id
    let agency: any = null;
    const { data: dbAgencies } = await supabase
      .from("agencies")
      .select(
        "id,name,agency_code,user_id,phone,email,categories,service_locations,location,team_size_band,verified,description,logo_url",
      );

    const allAgencies = Array.isArray(dbAgencies) ? [...dbAgencies] : [];

    // Also check default admin agencies
    for (const def of DEFAULT_ADMIN_AGENCIES) {
      if (
        !allAgencies.some(
          (a) => a.id === def.id || a.agency_code === def.agency_code,
        )
      ) {
        allAgencies.push(def);
      }
    }

    agency = allAgencies.find((a) => {
      const codeUpper = String(a.agency_code || "").toUpperCase();
      const idStr = String(a.id || "").toLowerCase();
      const nameStr = String(a.name || "").toLowerCase();
      const inputLower = rawInput.toLowerCase();

      return (
        codeUpper === cleanInputUpper ||
        codeUpper === formattedCode ||
        idStr === inputLower ||
        idStr === `agency-${inputLower}` ||
        nameStr === inputLower ||
        (inputLower === "admin" &&
          (idStr === "agency-admin" || codeUpper === "AGN-ADMN"))
      );
    });

    if (!agency) {
      return res
        .status(404)
        .json({
          message: `Agency '${rawInput}' not found. Please verify the code or ID and try again.`,
        });
    }

    // Ensure agency exists in database table
    try {
      await supabase.from("agencies").upsert({
        id: agency.id,
        name: agency.name,
        contact_person_name: agency.contact_person_name || agency.name,
        phone: agency.phone || "8825551402",
        email: agency.email || "agency@example.com",
        categories: ensureArray(agency.categories),
        service_locations: ensureArray(
          agency.service_locations || agency.location,
        ),
        location: Array.isArray(agency.service_locations)
          ? agency.service_locations.join(", ")
          : String(agency.location || "Local area"),
        team_size_band: agency.team_size_band || "6-15",
        verified: Boolean(agency.verified),
        description: agency.description || "",
        agency_code: agency.agency_code || formattedCode,
        user_id: agency.user_id || null,
        updated_at: new Date().toISOString(),
      });
    } catch (upsertErr) {
      console.warn("[agencies] Auto-upsert agency notice:", upsertErr);
    }

    // 2. Link worker in workers table
    let updatedWorker: any = null;
    const reqPhone = req.body?.phone;
    const cleanPhone = String(reqPhone || workerId || "")
      .replace(/^\+91/, "")
      .replace(/\D/g, "")
      .slice(-10);
    const targetId = String(workerId || "");

    const { data: existingWorkers } = await supabase
      .from("workers")
      .select("id,name,agency_id,category,locality,phone,phone_verified")
      .or(`id.eq.${targetId},phone.eq.${targetId},phone.eq.${cleanPhone}`);

    const existingWorker =
      Array.isArray(existingWorkers) && existingWorkers.length > 0
        ? existingWorkers[0]
        : null;

    if (existingWorker) {
      const { data: w } = await supabase
        .from("workers")
        .update({
          agency_id: agency.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingWorker.id)
        .select("id,name,agency_id,category,locality,phone")
        .single();

      // Also update any other record matching phone to prevent mismatch
      if (cleanPhone || existingWorker.phone) {
        const ph = cleanPhone || existingWorker.phone;
        await supabase
          .from("workers")
          .update({
            agency_id: agency.id,
            updated_at: new Date().toISOString(),
          })
          .or(`phone.eq.${ph},phone.eq.+91${ph}`);
      }

      updatedWorker = w || { ...existingWorker, agency_id: agency.id };
    } else {
      // Upsert worker record
      const newWorkerPayload = {
        id: targetId || `worker-${cleanPhone || Date.now()}`,
        name: "Specialist",
        agency_id: agency.id,
        category: "General",
        locality: "Local area",
        phone: cleanPhone || targetId,
        phone_verified: true,
        available_today: true,
        contact_events_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { data: w } = await supabase
        .from("workers")
        .upsert(newWorkerPayload)
        .select("id,name,agency_id,category,locality,phone")
        .single();
      updatedWorker = w || newWorkerPayload;
    }

    // Send notification to agency owner
    if (agency.user_id) {
      try {
        await supabase.from("notifications").insert({
          recipient_id: agency.user_id,
          type: "worker_joined",
          title: "New Worker Linked to Agency",
          message: `${updatedWorker?.name || "A worker"} successfully joined your agency roster.`,
          worker_id: updatedWorker?.id || workerId,
          read: false,
          created_at: new Date().toISOString(),
        });
      } catch {}
    }

    return res.json({
      worker: updatedWorker,
      agency: {
        id: agency.id,
        name: agency.name,
        agency_code: agency.agency_code,
        verified: agency.verified,
        phone: agency.phone,
        team_size_band: agency.team_size_band,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({
        message:
          error instanceof Error ? error.message : "Unable to join the agency.",
      });
  }
};

// GET /api/agencies/worker-affiliation
export const handleGetWorkerAffiliation: RequestHandler = async (req, res) => {
  try {
    const authorization = req.headers.authorization;
    let userId = "";
    let userPhone = "";

    if (authorization?.startsWith("Bearer ")) {
      const token = authorization.slice("Bearer ".length);
      const { data: authData } = await supabase.auth.getUser(token);
      if (authData?.user) {
        userId = authData.user.id;
        userPhone = String(
          authData.user.phone || authData.user.user_metadata?.phone || "",
        );
      }
    }

    const queryPhone = String(req.query.phone || userPhone || "")
      .replace(/^\+91/, "")
      .replace(/\D/g, "")
      .slice(-10);
    const queryWorkerId = String(req.query.workerId || userId || "");

    if (!queryPhone && !queryWorkerId) {
      return res.json({ agency: null, worker: null });
    }

    // Find worker
    const { data: workers } = await supabase
      .from("workers")
      .select("id,name,agency_id,category,locality,phone,phone_verified")
      .or(`id.eq.${queryWorkerId},phone.eq.${queryPhone}`);

    const worker =
      Array.isArray(workers) && workers.length > 0 ? workers[0] : null;
    if (!worker || !worker.agency_id) {
      return res.json({ agency: null, worker });
    }

    // Find agency
    let foundAgency: any = null;
    try {
      const { data: dbAgencies } = await supabase
        .from("agencies")
        .select(
          "id,name,phone,email,agency_code,verified,team_size_band,categories,service_locations,description",
        )
        .or(`id.eq.${worker.agency_id},agency_code.eq.${worker.agency_id}`);
      if (Array.isArray(dbAgencies) && dbAgencies.length > 0) {
        foundAgency = dbAgencies[0];
      }
    } catch {}

    if (!foundAgency) {
      foundAgency = DEFAULT_ADMIN_AGENCIES.find(
        (a) =>
          a.id === worker.agency_id ||
          a.agency_code === worker.agency_id ||
          (worker.agency_id === "agency-admin" && a.id === "agency-admin"),
      );
    }

    return res.json({
      agency: foundAgency || {
        id: worker.agency_id,
        name: "Affiliated Agency",
        verified: true,
      },
      worker,
    });
  } catch (error) {
    console.error("[agencies] get affiliation error:", error);
    return res.status(500).json({ message: "Unable to check affiliation." });
  }
};

export const handleLeaveAgency: RequestHandler = async (req, res) => {
  try {
    const { workerId, phone } = req.body || {};
    const authorization = req.headers.authorization;
    let authUserId = "";
    let authUserPhone = "";

    if (authorization?.startsWith("Bearer ")) {
      try {
        const token = authorization.slice("Bearer ".length);
        const { data: authData } = await supabase.auth.getUser(token);
        if (authData?.user) {
          authUserId = authData.user.id;
          authUserPhone = String(
            authData.user.phone || authData.user.user_metadata?.phone || "",
          );
        }
      } catch {}
    }

    const cleanPhone = String(phone || authUserPhone || "")
      .replace(/^\+91/, "")
      .replace(/\D/g, "")
      .slice(-10);
    const targetId = String(workerId || authUserId || "");

    if (!targetId && !cleanPhone) {
      return res
        .status(400)
        .json({ message: "Worker ID or phone is required to leave agency." });
    }

    if (targetId) {
      try {
        await supabase
          .from("workers")
          .update({ agency_id: null, updated_at: new Date().toISOString() })
          .eq("id", targetId);
      } catch {}
    }
    if (cleanPhone) {
      try {
        await supabase
          .from("workers")
          .update({ agency_id: null, updated_at: new Date().toISOString() })
          .or(
            `phone.eq.${cleanPhone},phone.eq.+91${cleanPhone},phone.eq.0${cleanPhone}`,
          );
      } catch {}
    }

    return res.json({ message: "Successfully unlinked from agency." });
  } catch (error) {
    console.error("[agencies] leave agency error:", error);
    return res.status(500).json({ message: "Unable to unlink from agency." });
  }
};

const ensureArray = (val: any): string[] => {
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return val
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

const DEFAULT_ADMIN_AGENCIES = [
  {
    id: "agency-admin",
    user_id: "admin-system",
    name: "Admin Agency",
    contact_person_name: "Admin",
    phone: "8825551402",
    email: "pgbalaadithya@gmail.com",
    categories: [
      "Electrician",
      "Plumber",
      "Carpenter",
      "Painter",
      "Cleaner",
      "AC Repair",
      "Other",
    ],
    service_locations: ["Chennai", "Trichy", "Kattur", "Tamil Nadu"],
    location: "Chennai, Trichy",
    team_size_band: "6-15",
    logo_url: null,
    description:
      "Verified multi-service agency providing licensed electricians, plumbers, carpenters, and technical repair teams across all zones.",
    verified: true,
    agency_code: "AGN-ADMN",
    created_at: new Date().toISOString(),
  },
];

export const handleGetAgencies: RequestHandler = async (req, res) => {
  try {
    const service = String(req.query.service || "")
      .trim()
      .toLowerCase();
    const location = String(req.query.location || "")
      .trim()
      .toLowerCase();

    // Check if token was provided in header
    const authorization = req.headers.authorization;
    let queryClient = supabase;
    if (authorization?.startsWith("Bearer ")) {
      const token = authorization.slice("Bearer ".length);
      queryClient = getAuthenticatedClient(token);
    }

    const { data, error } = await queryClient
      .from("agencies")
      .select(
        "id,name,phone,email,categories,service_locations,location,team_size_band,logo_url,description,verified,agency_code,created_at",
      )
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
          String(r.name || "")
            .trim()
            .toLowerCase() === def.name.toLowerCase() ||
          String(r.name || "")
            .trim()
            .toLowerCase() === "admin",
      );
      if (!exists) {
        combinedRows.push(def);
      }
    }

    // Calculate actual worker counts for each agency
    let allWorkersList: any[] = [];
    try {
      const { data: dbWorkers } = await queryClient
        .from("workers")
        .select("id,agency_id");
      if (Array.isArray(dbWorkers)) allWorkersList = dbWorkers;
    } catch {}

    const workerCounts = new Map<string, number>();
    for (const w of allWorkersList) {
      if (w.agency_id) {
        const aid = String(w.agency_id).toLowerCase();
        workerCounts.set(aid, (workerCounts.get(aid) || 0) + 1);
      }
    }

    const agencies = combinedRows
      .map((a) => {
        const countById =
          workerCounts.get(String(a.id || "").toLowerCase()) || 0;
        const countByCode =
          workerCounts.get(String(a.agency_code || "").toLowerCase()) || 0;
        const totalCount =
          countById +
          (a.agency_code && a.id !== a.agency_code ? countByCode : 0);
        return {
          ...a,
          categories: ensureArray(a.categories),
          service_locations: ensureArray(a.service_locations || a.location),
          worker_count: totalCount,
        };
      })
      .filter((a) => {
        const matchesService =
          !service ||
          a.categories.some(
            (c: string) =>
              c.toLowerCase().includes(service) ||
              service.includes(c.toLowerCase()),
          );
        const matchesLoc =
          !location ||
          a.service_locations.some(
            (l: string) =>
              l.toLowerCase().includes(location) ||
              location.includes(l.toLowerCase()),
          ) ||
          (a.location && a.location.toLowerCase().includes(location));
        return matchesService && matchesLoc;
      });

    return res.json({ agencies });
  } catch (error) {
    return res
      .status(500)
      .json({
        message:
          error instanceof Error ? error.message : "Unable to load agencies.",
      });
  }
};

const isDummyProfileNameOrPhone = (name?: string, phone?: string) => {
  const n = String(name || "")
    .toLowerCase()
    .trim();
  const p = String(phone || "").trim();
  return (
    n === "anika rao" ||
    n.includes("anika rao") ||
    n === "demo worker" ||
    n === "test worker" ||
    n === "sample worker" ||
    p === "9876543210" ||
    p === "1234567890" ||
    p === "0000000000"
  );
};

export const handleGetAgencyTeam: RequestHandler = async (req, res) => {
  try {
    const rawId = String(req.params.id || "").trim();
    if (!rawId)
      return res.status(400).json({ message: "Agency id is required." });

    const normalizedCode = rawId.toUpperCase().replace(/^AGENCY-/, "AGN-");
    const cleanId = rawId.replace(/^agn-/i, "").replace(/^agency-/i, "");

    let targetAgency: any = null;

    try {
      const { data: dbAgencies } = await supabase
        .from("agencies")
        .select(
          "id,name,phone,email,categories,service_locations,location,team_size_band,logo_url,description,verified,agency_code,user_id",
        )
        .or(
          `id.eq.${rawId},agency_code.eq.${rawId},agency_code.eq.${normalizedCode},agency_code.ilike.%${cleanId}%,name.ilike.%${rawId}%`,
        );

      if (Array.isArray(dbAgencies) && dbAgencies.length > 0) {
        targetAgency = dbAgencies[0];
      }
    } catch (queryErr) {
      console.warn("[agencies] Get team db query notice:", queryErr);
    }

    if (!targetAgency) {
      const foundDef = DEFAULT_ADMIN_AGENCIES.find(
        (d) =>
          d.id === rawId ||
          d.id.toLowerCase() === rawId.toLowerCase() ||
          rawId === "admin" ||
          rawId === "agency-admin" ||
          d.agency_code === rawId ||
          d.agency_code === normalizedCode ||
          d.name.toLowerCase().includes(rawId.toLowerCase()),
      );
      if (foundDef) targetAgency = { ...foundDef };
    }

    if (!targetAgency) {
      // Return a default agency representation if standard admin handle is requested
      if (
        rawId === "agency-admin" ||
        rawId === "admin" ||
        rawId === "AGN-ADMN"
      ) {
        targetAgency = { ...DEFAULT_ADMIN_AGENCIES[0] };
      }
    }

    if (!targetAgency)
      return res.status(404).json({ message: "Agency not found." });

    targetAgency.categories = ensureArray(targetAgency.categories);
    targetAgency.service_locations = ensureArray(
      targetAgency.service_locations || targetAgency.location,
    );

    const targetMatchIds = [
      targetAgency.id,
      targetAgency.agency_code,
      targetAgency.user_id,
      targetAgency.name,
      "agency-admin",
      "AGN-ADMN",
    ]
      .filter(Boolean)
      .map((x) => String(x).toLowerCase().trim());

    // Gather workers from both Supabase and registered cache
    let allWorkersList: any[] = [];
    try {
      const { data: dbWorkers } = await supabase
        .from("workers")
        .select(
          "id,name,category,locality,initials,photo_url,phone,phone_verified,contact_events_count,services,experience,available_today,urgent_today,agency_id",
        );
      if (Array.isArray(dbWorkers)) allWorkersList = dbWorkers;
    } catch {}

    const localWorkers = await readRegisteredWorkers();
    for (const lw of localWorkers) {
      if (lw?.id && !allWorkersList.some((w) => w.id === lw.id)) {
        allWorkersList.push(lw);
      }
    }

    const teamWorkers = allWorkersList.filter((w: any) => {
      if (!w.agency_id) return false;
      if (isDummyProfileNameOrPhone(w.name, w.phone)) return false;
      const wAid = String(w.agency_id).toLowerCase().trim();
      return targetMatchIds.some(
        (tid) =>
          tid === wAid ||
          wAid.includes(tid) ||
          tid.includes(wAid) ||
          wAid.replace(/^agn-/i, "").replace(/^agency-/i, "") ===
            tid.replace(/^agn-/i, "").replace(/^agency-/i, ""),
      );
    });

    return res.json({ agency: targetAgency, workers: teamWorkers });
  } catch (error) {
    return res
      .status(500)
      .json({
        message:
          error instanceof Error
            ? error.message
            : "Unable to load agency profile.",
      });
  }
};

export const handleGetAgencyDashboard: RequestHandler = async (req, res) => {
  try {
    const { user, token } = await getAgencyUser(req);
    const client = getAuthenticatedClient(token);
    let { data: agency } = await client
      .from("agencies")
      .select(
        "id,name,phone,email,categories,service_locations,location,team_size_band,logo_url,description,verified,agency_code,user_id",
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (!agency) {
      const { data: fallbackAg } = await supabase
        .from("agencies")
        .select(
          "id,name,phone,email,categories,service_locations,location,team_size_band,logo_url,description,verified,agency_code,user_id",
        )
        .eq("user_id", user.id)
        .maybeSingle();
      agency = fallbackAg;
    }

    const userEmail = String(user.email || "").toLowerCase();
    const userPhone = String(user.user_metadata?.phone || user.phone || "")
      .replace(/^\+91/, "")
      .replace(/\D/g, "")
      .slice(-10);

    // Also look up by phone or email if user_id wasn't linked yet
    if (!agency && (userPhone || userEmail)) {
      const { data: matchedAg } = await supabase
        .from("agencies")
        .select(
          "id,name,phone,email,categories,service_locations,location,team_size_band,logo_url,description,verified,agency_code,user_id",
        )
        .or(
          `email.eq.${userEmail},phone.eq.${userPhone},phone.eq.+91${userPhone}`,
        )
        .maybeSingle();
      if (matchedAg) {
        agency = matchedAg;
        // link user_id
        await supabase
          .from("agencies")
          .update({ user_id: user.id })
          .eq("id", matchedAg.id);
      }
    }

    // If user is admin or matches default admin agency
    const isAdmin =
      user.app_metadata?.is_admin === true ||
      user.user_metadata?.role === "admin" ||
      userEmail === "pgbalaadithya@gmail.com";

    if (
      !agency &&
      (isAdmin || userEmail.includes("admin") || userPhone === "8825551402")
    ) {
      const defaultAdmin = DEFAULT_ADMIN_AGENCIES[0];
      agency = {
        ...defaultAdmin,
        user_id: user.id,
      };
      try {
        await supabase.from("agencies").upsert(agency);
      } catch {}
    }

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
    agency.service_locations = ensureArray(
      agency.service_locations || agency.location,
    );

    // Fetch live workers who have joined this agency
    // Match agency.id, agency.agency_code, agency.user_id, agency.name, or default admin handles
    const targetIds = [
      agency.id,
      agency.agency_code,
      agency.user_id,
      agency.name,
      "agency-admin",
      "AGN-ADMN",
    ]
      .filter(Boolean)
      .map((x) => String(x).toLowerCase().trim());

    // Also include stripped codes (without "agn-" or "agency-")
    for (const tid of [...targetIds]) {
      const stripped = tid
        .replace(/^agn-/, "")
        .replace(/^agency-/, "")
        .trim();
      if (stripped && !targetIds.includes(stripped)) {
        targetIds.push(stripped);
      }
    }

    // Always use elevated server client to bypass RLS worker isolation
    const { data: dbWorkers } = await supabase.from("workers").select("*");

    const regWorkers = await readRegisteredWorkers();
    const allWorkersMap = new Map<string, any>();

    for (const w of Array.isArray(dbWorkers) ? dbWorkers : []) {
      if (w && w.id) allWorkersMap.set(String(w.id), w);
    }
    for (const w of regWorkers) {
      if (w && w.id && !allWorkersMap.has(String(w.id))) {
        allWorkersMap.set(String(w.id), w);
      }
    }
    const allWorkers = Array.from(allWorkersMap.values());

    const isWorkerMatching = (w: any) => {
      if (!w || !w.agency_id) return false;
      if (isDummyProfileNameOrPhone(w.name, w.phone)) return false;
      const wAid = String(w.agency_id).toLowerCase().trim();
      const strippedWAid = wAid
        .replace(/^agn-/, "")
        .replace(/^agency-/, "")
        .trim();
      return targetIds.some((tid) => {
        if (tid === wAid || tid === strippedWAid) return true;
        const strippedTid = tid
          .replace(/^agn-/, "")
          .replace(/^agency-/, "")
          .trim();
        if (
          strippedTid &&
          (strippedTid === strippedWAid || strippedTid === wAid)
        )
          return true;
        if (wAid.includes(tid) || tid.includes(wAid)) return true;
        return false;
      });
    };

    const workersList = allWorkers.filter(isWorkerMatching);

    const workerIds = workersList.map((w: any) => w.id);

    // Fetch callback leads for this agency's workers
    let callbacks: any[] = [];
    if (workerIds.length > 0) {
      const { data: cbData } = await supabase
        .from("callback_requests")
        .select(
          "id,worker_id,client_name,client_phone,service_needed,preferred_time,notes,created_at,status",
        )
        .in("worker_id", workerIds)
        .order("created_at", { ascending: false })
        .limit(50);
      callbacks = Array.isArray(cbData) ? cbData : [];
    }

    return res.json({
      agency,
      workers: workersList,
      stats: {
        linkedWorkers: workersList.length,
        whatsappClicks7d: workersList.reduce(
          (sum: number, w: any) => sum + (Number(w.contact_events_count) || 0),
          0,
        ),
        callbacks7d: callbacks.length,
      },
      callbacks,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const status =
      code === "UNAUTHORIZED" ? 401 : code === "FORBIDDEN" ? 403 : 500;
    return res
      .status(status)
      .json({
        message:
          status === 500
            ? `Unable to load agency dashboard: ${code || "server error"}`
            : "Your login session is invalid or expired.",
      });
  }
};

export const handleUpdateAgencyCallbackStatus: RequestHandler = async (
  req,
  res,
) => {
  try {
    const { user, token } = await getAgencyUser(req);
    const client = getAuthenticatedClient(token);
    const id = String(req.params.id || "");
    const parsed = z
      .object({ status: z.enum(["new", "contacted", "closed"]) })
      .safeParse(req.body);
    if (!id || !parsed.success)
      return res.status(400).json({ message: "Invalid callback update." });
    const { data: agency } = await client
      .from("agencies")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!agency)
      return res.status(404).json({ message: "Agency profile not found." });
    const { data, error } = await client
      .from("callback_requests")
      .update({ status: parsed.data.status })
      .eq("id", id)
      .select("id,status")
      .single();
    if (error) throw error;
    return res.json({ callback: data });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const status =
      code === "UNAUTHORIZED" ? 401 : code === "FORBIDDEN" ? 403 : 500;
    return res
      .status(status)
      .json({
        message:
          status === 500
            ? "Unable to update callback request."
            : "Your login session is invalid or expired.",
      });
  }
};

// POST /api/agencies/remove-worker
export const handleRemoveWorkerFromAgency: RequestHandler = async (
  req,
  res,
) => {
  try {
    const { workerId, phone } = req.body || {};
    if (!workerId && !phone) {
      return res
        .status(400)
        .json({
          message:
            "Worker ID or phone is required to remove worker from roster.",
        });
    }

    const cleanPhone = String(phone || "")
      .replace(/^\+91/, "")
      .replace(/\D/g, "")
      .slice(-10);
    const targetId = String(workerId || "");

    if (targetId) {
      await supabase
        .from("workers")
        .update({ agency_id: null, updated_at: new Date().toISOString() })
        .eq("id", targetId);
    }
    if (cleanPhone) {
      await supabase
        .from("workers")
        .update({ agency_id: null, updated_at: new Date().toISOString() })
        .or(`phone.eq.${cleanPhone},phone.eq.+91${cleanPhone}`);
    }

    return res.json({
      success: true,
      message: "Worker has been removed from your agency roster.",
    });
  } catch (error) {
    console.error("[agencies] remove worker error:", error);
    return res
      .status(500)
      .json({
        message:
          error instanceof Error
            ? error.message
            : "Unable to remove worker from roster.",
      });
  }
};

// Project Assignments in-memory store backed by fallback
let activeAgencyProjects: Array<{
  id: string;
  agency_id: string;
  worker_id: string;
  worker_name: string;
  title: string;
  client_name: string;
  client_phone: string;
  service: string;
  location: string;
  deadline?: string;
  status: "active" | "in_progress" | "completed" | "cancelled";
  created_at: string;
}> = [
  {
    id: "proj-1",
    agency_id: "agency-admin",
    worker_id: "worker-1",
    worker_name: "Ramesh Kumar",
    title: "Full House Wiring & DB Box Setup",
    client_name: "Senthil Nathan",
    client_phone: "9840123456",
    service: "Electrician",
    location: "Anna Nagar, Chennai",
    deadline: "2026-09-20",
    status: "active",
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "proj-2",
    agency_id: "agency-admin",
    worker_id: "worker-2",
    worker_name: "Murugan S",
    title: "Bathroom Pipeline Concealment & Fitting",
    client_name: "Priya Sundaram",
    client_phone: "9841987654",
    service: "Plumber",
    location: "Thillai Nagar, Trichy",
    deadline: "2026-09-18",
    status: "in_progress",
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

// GET /api/agencies/projects
export const handleGetAgencyProjects: RequestHandler = async (req, res) => {
  try {
    const agencyId = String(
      req.query.agencyId || req.query.agency_id || "agency-admin",
    );
    const filtered = activeAgencyProjects.filter(
      (p) =>
        !agencyId ||
        p.agency_id === agencyId ||
        p.agency_id === "agency-admin" ||
        agencyId === "agency-admin" ||
        agencyId === "admin",
    );
    return res.json({ projects: filtered });
  } catch (error) {
    return res.status(500).json({ message: "Unable to load active projects." });
  }
};

// POST /api/agencies/projects
export const handleCreateAgencyProject: RequestHandler = async (req, res) => {
  try {
    const {
      title,
      client_name,
      client_phone,
      worker_id,
      worker_name,
      service,
      location,
      deadline,
      agency_id,
    } = req.body || {};
    if (!title || !client_name || !worker_id) {
      return res
        .status(400)
        .json({
          message:
            "Project title, client name, and assigned worker are required.",
        });
    }

    const newProject = {
      id: `proj-${Date.now()}`,
      agency_id: agency_id || "agency-admin",
      worker_id: String(worker_id),
      worker_name: String(worker_name || "Specialist"),
      title: String(title),
      client_name: String(client_name),
      client_phone: String(client_phone || ""),
      service: String(service || "General Service"),
      location: String(location || "Local area"),
      deadline: deadline ? String(deadline) : undefined,
      status: "active" as const,
      created_at: new Date().toISOString(),
    };

    activeAgencyProjects.unshift(newProject);
    return res.status(201).json({ success: true, project: newProject });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Unable to create project assignment." });
  }
};

// DELETE /api/agencies/projects/:id
export const handleDeleteAgencyProject: RequestHandler = async (req, res) => {
  try {
    const id = String(req.params.id || "");
    if (!id)
      return res.status(400).json({ message: "Project ID is required." });

    const beforeLen = activeAgencyProjects.length;
    activeAgencyProjects = activeAgencyProjects.filter((p) => p.id !== id);

    return res.json({
      success: true,
      message: "Project assignment deleted successfully.",
      deleted: beforeLen !== activeAgencyProjects.length,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Unable to delete project assignment." });
  }
};

// GET /api/workers/projects (Get projects assigned to a specific worker)
export const handleGetWorkerProjects: RequestHandler = async (req, res) => {
  try {
    const authorization = req.headers.authorization;
    let authUserId = "";
    let authUserPhone = "";
    let authUserName = "";

    if (authorization?.startsWith("Bearer ")) {
      try {
        const token = authorization.slice("Bearer ".length);
        const { data: authData } = await supabase.auth.getUser(token);
        if (authData?.user) {
          authUserId = authData.user.id;
          authUserPhone = String(
            authData.user.phone || authData.user.user_metadata?.phone || "",
          )
            .replace(/^\+91/, "")
            .replace(/\D/g, "")
            .slice(-10);
          authUserName = String(
            authData.user.user_metadata?.name ||
              authData.user.user_metadata?.fullName ||
              "",
          )
            .trim()
            .toLowerCase();
        }
      } catch {}
    }

    const queryWorkerId = String(
      req.query.workerId || req.query.worker_id || authUserId || "",
    ).trim();
    const queryPhone = String(req.query.phone || authUserPhone || "")
      .replace(/^\+91/, "")
      .replace(/\D/g, "")
      .slice(-10);

    // Get matching worker info from DB if possible
    let targetWorkerIds = [queryWorkerId, authUserId, queryPhone, authUserPhone]
      .filter(Boolean)
      .map((x) => String(x).toLowerCase());

    const filtered = activeAgencyProjects.filter((p) => {
      const pWid = String(p.worker_id || "").toLowerCase();
      const pWName = String(p.worker_name || "").toLowerCase();

      // Match by worker ID, phone, or name
      if (
        targetWorkerIds.some(
          (tid) => tid === pWid || pWid.includes(tid) || tid.includes(pWid),
        )
      )
        return true;
      if (
        authUserName &&
        (pWName.includes(authUserName) || authUserName.includes(pWName))
      )
        return true;
      // Default: if in dev/single worker context and user has projects
      return false;
    });

    // If no direct project matches and the user is authenticated as worker, return relevant active demo projects so worker can see the assigned flow
    const results =
      filtered.length > 0 ? filtered : activeAgencyProjects.slice(0, 2);

    return res.json({ projects: results });
  } catch (error) {
    console.error("[agencies] get worker projects error:", error);
    return res
      .status(500)
      .json({ message: "Unable to load assigned worker projects." });
  }
};

// PATCH /api/workers/projects/:id/status (Worker updates status of assigned project)
export const handleUpdateWorkerProjectStatus: RequestHandler = async (
  req,
  res,
) => {
  try {
    const id = String(req.params.id || "");
    const { status } = req.body || {};

    if (!id)
      return res.status(400).json({ message: "Project ID is required." });
    if (
      !status ||
      !["active", "in_progress", "completed", "cancelled"].includes(status)
    ) {
      return res
        .status(400)
        .json({
          message:
            "Valid status ('active', 'in_progress', 'completed', 'cancelled') is required.",
        });
    }

    const project = activeAgencyProjects.find((p) => p.id === id);
    if (!project) {
      return res.status(404).json({ message: "Project assignment not found." });
    }

    project.status = status;

    return res.json({
      success: true,
      message: `Project status updated to ${status}.`,
      project,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Unable to update project status." });
  }
};
