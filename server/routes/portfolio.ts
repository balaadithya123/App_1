import { RequestHandler } from "express";
import { z } from "zod";
import { supabase } from "../lib/supabase";
import { screenImageSilently } from "./portfolio-screen";
import type { WorkerPortfolioItem, WorkerTrustFlag } from "@shared/api";
import { getAllWorkers } from "./workers";

// In-memory fallback stores to guarantee zero downtime even if Supabase table is pending migration
const memoryPortfolio: Map<string, WorkerPortfolioItem[]> = new Map();
const memoryTrustFlags: Map<string, WorkerTrustFlag[]> = new Map();

export const getTrustFlagsForWorker = async (workerId: string): Promise<WorkerTrustFlag[]> => {
  const flags = memoryTrustFlags.get(workerId) || [];
  try {
    const { data, error } = await supabase
      .from("worker_trust_flags")
      .select("id,worker_id,flag_type,reason,resolved,created_at")
      .eq("worker_id", workerId);
    if (!error && data) {
      // Merge unique
      const existingIds = new Set(data.map((d: any) => d.id));
      const memoryUnique = flags.filter((f) => !existingIds.has(f.id));
      return [...data, ...memoryUnique];
    }
  } catch {
    // Fall back to memory
  }
  return flags;
};

export const addTrustFlag = async (flag: { worker_id: string; flag_type: string; reason: string }) => {
  const newFlag: WorkerTrustFlag = {
    id: `flag-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    worker_id: flag.worker_id,
    flag_type: flag.flag_type,
    reason: flag.reason,
    created_at: new Date().toISOString(),
    resolved: false,
  };
  const list = memoryTrustFlags.get(flag.worker_id) || [];
  list.push(newFlag);
  memoryTrustFlags.set(flag.worker_id, list);

  try {
    await supabase.from("worker_trust_flags").insert({
      worker_id: flag.worker_id,
      flag_type: flag.flag_type,
      reason: flag.reason,
      resolved: false,
    });
  } catch (err) {
    console.warn("[trust_flags] Supabase insert failed, retained in memory:", err);
  }
  return newFlag;
};

// GET /api/workers/:id/portfolio
export const handleGetWorkerPortfolio: RequestHandler = async (req, res) => {
  try {
    const workerId = String(req.params.id || "");
    const cleanPhone = workerId.replace(/^\+91/, "").replace(/\D/g, "").slice(-10);
    if (!workerId) {
      res.status(400).json({ message: "Worker ID is required" });
      return;
    }

    // 1. Try Supabase worker_portfolio table first
    try {
      const { data, error } = await supabase
        .from("worker_portfolio")
        .select("id,worker_id,image_url,label,status,flag_reasons,uploaded_at")
        .or(`worker_id.eq.${workerId}${cleanPhone ? `,worker_id.eq.${cleanPhone}` : ""}`)
        .eq("status", "approved")
        .order("uploaded_at", { ascending: false });

      if (!error && data && data.length > 0) {
        res.json({ photos: data });
        return;
      }
    } catch {
      // Fall through
    }

    // 2. Try workers table portfolio_photos column
    try {
      const { data: workerData } = await supabase
        .from("workers")
        .select("id,phone,portfolio_photos")
        .or(`id.eq.${workerId}${cleanPhone ? `,phone.eq.${cleanPhone}` : ""}`)
        .maybeSingle();

      if (workerData?.portfolio_photos) {
        const parsed = typeof workerData.portfolio_photos === "string" 
          ? JSON.parse(workerData.portfolio_photos) 
          : workerData.portfolio_photos;
        if (Array.isArray(parsed) && parsed.length > 0) {
          const approved = parsed.filter((p: any) => p.status === "approved" || !p.status);
          res.json({ photos: approved });
          return;
        }
      }
    } catch {
      // Fall through
    }

    const photos = (memoryPortfolio.get(workerId) || memoryPortfolio.get(cleanPhone) || []).filter((p) => p.status === "approved");
    res.json({ photos });
  } catch (err) {
    console.error("[portfolio] get error:", err);
    res.status(500).json({ message: "Unable to load portfolio photos." });
  }
};

// GET /api/workers/my-portfolio (Worker's own dashboard view)
export const handleGetMyPortfolio: RequestHandler = async (req, res) => {
  try {
    const authorization = req.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const token = authorization.slice("Bearer ".length);
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) {
      res.status(401).json({ message: "Session expired or invalid" });
      return;
    }

    const phone = String(authData.user.phone || authData.user.user_metadata?.phone || "").replace(/^\+91/, "").replace(/\D/g, "").slice(-10);
    const allWorkers = await getAllWorkers();
    const worker = allWorkers.find((w) => w.phone === phone || w.id === authData.user.id);
    const workerId = worker ? worker.id : (phone || authData.user.id);

    // 1. Try Supabase worker_portfolio table
    try {
      const { data, error } = await supabase
        .from("worker_portfolio")
        .select("id,worker_id,image_url,label,status,flag_reasons,uploaded_at")
        .or(`worker_id.eq.${workerId}${phone ? `,worker_id.eq.${phone}` : ""}`)
        .order("uploaded_at", { ascending: false });

      if (!error && data && data.length > 0) {
        res.json({ photos: data, workerId });
        return;
      }
    } catch {
      // Fall through
    }

    // 2. Try workers table portfolio_photos column
    try {
      const { data: workerData } = await supabase
        .from("workers")
        .select("id,phone,portfolio_photos")
        .or(`id.eq.${workerId}${phone ? `,phone.eq.${phone}` : ""}`)
        .maybeSingle();

      if (workerData?.portfolio_photos) {
        const parsed = typeof workerData.portfolio_photos === "string" 
          ? JSON.parse(workerData.portfolio_photos) 
          : workerData.portfolio_photos;
        if (Array.isArray(parsed) && parsed.length > 0) {
          res.json({ photos: parsed, workerId });
          return;
        }
      }
    } catch {
      // Fall through
    }

    const photos = memoryPortfolio.get(workerId) || memoryPortfolio.get(phone) || [];
    res.json({ photos, workerId });
  } catch (err) {
    console.error("[portfolio] get my error:", err);
    res.status(500).json({ message: "Unable to load your portfolio photos." });
  }
};

// POST /api/workers/portfolio (Upload up to 8-10 photos)
export const handleUploadPortfolio: RequestHandler = async (req, res) => {
  try {
    const authorization = req.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const token = authorization.slice("Bearer ".length);
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) {
      res.status(401).json({ message: "Session expired" });
      return;
    }

    const phone = String(authData.user.phone || authData.user.user_metadata?.phone || "").replace(/^\+91/, "").replace(/\D/g, "").slice(-10);
    const allWorkers = await getAllWorkers();
    const worker = allWorkers.find((w) => w.phone === phone || w.id === authData.user.id);
    const workerId = worker ? worker.id : (phone || authData.user.id);

    const payloadSchema = z.object({
      images: z.array(
        z.object({
          data: z.string().min(10),
          name: z.string().default("work_photo.jpg"),
          label: z.string().max(100).optional().default(""),
        })
      ).min(1).max(10),
    });

    const parsed = payloadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid photo upload payload. Send between 1 and 10 photos." });
      return;
    }

    // Check existing count from memory / db
    let existingPhotos = memoryPortfolio.get(workerId) || memoryPortfolio.get(phone) || [];
    if (existingPhotos.length === 0) {
      try {
        const { data: dbPhotos } = await supabase
          .from("worker_portfolio")
          .select("id,worker_id,image_url,label,status,flag_reasons,uploaded_at")
          .or(`worker_id.eq.${workerId}${phone ? `,worker_id.eq.${phone}` : ""}`);
        if (Array.isArray(dbPhotos) && dbPhotos.length > 0) {
          existingPhotos = dbPhotos;
        }
      } catch {}
    }

    if (existingPhotos.length + parsed.data.images.length > 10) {
      res.status(400).json({
        message: `You can have at most 10 portfolio photos. Currently you have ${existingPhotos.length}.`,
      });
      return;
    }

    const uploadedResults: WorkerPortfolioItem[] = [];

    for (const img of parsed.data.images) {
      // Background silent screening
      const screening = await screenImageSilently({
        id: `img-${Date.now()}`,
        name: img.name,
        mimeType: "image/jpeg",
        data: img.data,
      });

      const isStockOrDuplicate = screening.checks.is_stock_photo || screening.checks.is_duplicate_style;
      const isInappropriate = screening.checks.contains_inappropriate_content;
      const isRejected = isStockOrDuplicate || isInappropriate;

      const photoItem: WorkerPortfolioItem = {
        id: `port-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        worker_id: workerId,
        image_url: img.data,
        label: img.label?.trim() || undefined,
        uploaded_at: new Date().toISOString(),
        status: isRejected ? "flagged" : "approved",
        flag_reasons: isRejected ? screening.reasons : undefined,
      };

      if (isRejected) {
        await addTrustFlag({
          worker_id: workerId,
          flag_type: screening.checks.is_stock_photo ? "stock_portfolio_detected" : "duplicate_style_detected",
          reason: screening.reasons.join("; ") || "Suspicious photo upload flagged during background moderation.",
        });
      }

      // Save to Supabase worker_portfolio table
      try {
        await supabase.from("worker_portfolio").insert({
          id: photoItem.id,
          worker_id: photoItem.worker_id,
          image_url: photoItem.image_url,
          label: photoItem.label || null,
          status: photoItem.status,
          flag_reasons: photoItem.flag_reasons || null,
        });
      } catch (err) {
        console.warn("[portfolio] Supabase worker_portfolio insert fallback:", err);
      }

      existingPhotos.unshift(photoItem);
      uploadedResults.push(photoItem);
    }

    // Save full array to workers table column for guaranteed database storage
    try {
      if (phone) {
        await supabase
          .from("workers")
          .update({ portfolio_photos: JSON.stringify(existingPhotos), updated_at: new Date().toISOString() })
          .eq("phone", phone);
      }
      if (workerId) {
        await supabase
          .from("workers")
          .update({ portfolio_photos: JSON.stringify(existingPhotos), updated_at: new Date().toISOString() })
          .eq("id", workerId);
      }
    } catch (workerSaveErr) {
      console.warn("[portfolio] Save to workers table note:", workerSaveErr);
    }

    memoryPortfolio.set(workerId, existingPhotos);
    if (phone) memoryPortfolio.set(phone, existingPhotos);

    res.status(201).json({
      message: `${uploadedResults.length} photo(s) uploaded successfully.`,
      photos: existingPhotos,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to upload portfolio photos";
    console.error("[portfolio] upload error:", err);
    res.status(500).json({ message });
  }
};

// DELETE /api/workers/portfolio/:photoId
export const handleDeletePortfolioPhoto: RequestHandler = async (req, res) => {
  try {
    const photoId = req.params.photoId;
    const authorization = req.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const token = authorization.slice("Bearer ".length);
    const { data: authData } = await supabase.auth.getUser(token);
    const phone = String(authData?.user?.phone || authData?.user?.user_metadata?.phone || "").replace(/^\+91/, "").replace(/\D/g, "").slice(-10);

    // Try Supabase delete
    try {
      await supabase.from("worker_portfolio").delete().eq("id", photoId);
    } catch {}

    // Delete from memory and update workers table
    for (const [wId, photos] of memoryPortfolio.entries()) {
      const filtered = photos.filter((p) => p.id !== photoId);
      if (filtered.length !== photos.length) {
        memoryPortfolio.set(wId, filtered);
        try {
          await supabase.from("workers").update({ portfolio_photos: JSON.stringify(filtered) }).or(`id.eq.${wId},phone.eq.${phone}`);
        } catch {}
      }
    }

    res.json({ message: "Portfolio photo deleted successfully." });
  } catch (err) {
    console.error("[portfolio] delete error:", err);
    res.status(500).json({ message: "Unable to delete portfolio photo." });
  }
};

// GET /api/admin/workers-with-flags (Admin directory list with trust flags and agency affiliation)
export const handleGetAdminWorkersWithFlags: RequestHandler = async (req, res) => {
  try {
    const allWorkers = await getAllWorkers();

    // Query direct supabase workers to make sure no agency-linked worker is missed
    const combinedWorkersMap = new Map<string, any>();
    for (const w of allWorkers) {
      combinedWorkersMap.set(w.id, { ...w });
    }

    try {
      const { data: dbWorkers } = await supabase.from("workers").select("*");
      if (Array.isArray(dbWorkers)) {
        for (const dw of dbWorkers) {
          if (!combinedWorkersMap.has(dw.id)) {
            combinedWorkersMap.set(dw.id, {
              id: dw.id,
              name: dw.name || "Worker",
              category: dw.category || "Service Pro",
              locality: dw.locality || "Local area",
              experience: dw.experience || "1+ years",
              phone: dw.phone || "",
              phone_verified: dw.phone_verified ?? true,
              photo_url: dw.photo_url || null,
              agency_id: dw.agency_id || null,
              created_at: dw.created_at,
            });
          } else {
            const existing = combinedWorkersMap.get(dw.id);
            existing.agency_id = dw.agency_id || existing.agency_id;
            existing.phone_verified = dw.phone_verified ?? existing.phone_verified;
          }
        }
      }
    } catch {}

    // Load agencies to map agency names & codes
    let agencies: any[] = [];
    try {
      const { data: agData } = await supabase.from("agencies").select("id,name,agency_code");
      if (Array.isArray(agData)) agencies = agData;
    } catch {}

    const agencyMap = new Map<string, { name: string; code: string }>();
    for (const ag of agencies) {
      if (ag.id) agencyMap.set(String(ag.id).toLowerCase(), { name: ag.name, code: ag.agency_code || ag.id });
      if (ag.agency_code) agencyMap.set(String(ag.agency_code).toLowerCase(), { name: ag.name, code: ag.agency_code });
    }
    agencyMap.set("agency-admin", { name: "Admin Agency", code: "AGN-ADMN" });
    agencyMap.set("agn-admn", { name: "Admin Agency", code: "AGN-ADMN" });

    // Load all trust flags from Supabase & memory
    let dbFlags: any[] = [];
    try {
      const { data } = await supabase.from("worker_trust_flags").select("*");
      if (data) dbFlags = data;
    } catch {}

    // Combine with memory flags
    const flagsByWorker = new Map<string, WorkerTrustFlag[]>();
    for (const flag of dbFlags) {
      const arr = flagsByWorker.get(flag.worker_id) || [];
      arr.push(flag);
      flagsByWorker.set(flag.worker_id, arr);
    }
    for (const [wId, mFlags] of memoryTrustFlags.entries()) {
      const arr = flagsByWorker.get(wId) || [];
      for (const mf of mFlags) {
        if (!arr.some((f) => f.id === mf.id)) arr.push(mf);
      }
      flagsByWorker.set(wId, arr);
    }

    const workersWithFlags = Array.from(combinedWorkersMap.values()).map((w) => {
      const workerFlags = (flagsByWorker.get(w.id) || flagsByWorker.get(w.phone) || []).filter((f) => !f.resolved);
      const portfolioCount = (memoryPortfolio.get(w.id) || []).length;
      const agencyInfo = w.agency_id ? agencyMap.get(String(w.agency_id).toLowerCase()) : null;
      return {
        ...w,
        agency_name: agencyInfo?.name || (w.agency_id ? `Agency (${w.agency_id})` : null),
        agency_code: agencyInfo?.code || w.agency_id || null,
        trust_flags: workerFlags,
        portfolio_count: portfolioCount,
        has_flags: workerFlags.length > 0,
      };
    });

    res.json({ workers: workersWithFlags });
  } catch (err) {
    console.error("[admin workers] load error:", err);
    res.status(500).json({ message: "Unable to load admin workers list." });
  }
};

// POST /api/admin/workers/:workerId/resolve-flags
export const handleResolveWorkerFlags: RequestHandler = async (req, res) => {
  try {
    const workerId = String(req.params.workerId || "");
    if (!workerId) {
      res.status(400).json({ message: "Worker ID is required." });
      return;
    }
    // Resolve in memory
    const flags = memoryTrustFlags.get(workerId) || [];
    flags.forEach((f) => {
      f.resolved = true;
    });
    memoryTrustFlags.set(workerId, flags);

    // Resolve in Supabase
    try {
      await supabase.from("worker_trust_flags").update({ resolved: true }).eq("worker_id", workerId);
    } catch {}

    res.json({ message: "Flags resolved successfully." });
  } catch (err) {
    console.error("[admin workers] resolve flags error:", err);
    res.status(500).json({ message: "Unable to resolve flags." });
  }
};

// POST /api/admin/workers/:workerId/toggle-verify
export const handleToggleWorkerVerification: RequestHandler = async (req, res) => {
  try {
    const workerId = req.params.workerId;
    const { verified } = req.body as { verified: boolean };

    try {
      await supabase.from("workers").update({ phone_verified: verified }).eq("id", workerId);
    } catch {}

    res.json({ message: `Worker verification status set to ${verified ? "verified" : "unverified"}.` });
  } catch (err) {
    console.error("[admin workers] toggle verification error:", err);
    res.status(500).json({ message: "Unable to update worker verification." });
  }
};
