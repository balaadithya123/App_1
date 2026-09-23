import { RequestHandler } from "express";
import { z } from "zod";
import { supabase } from "../lib/supabase";
import { screenImageSilently } from "./portfolio-screen";
import type { WorkerPortfolioItem, WorkerTrustFlag } from "@shared/api";
import { getAllWorkers } from "./workers";

// In-memory fallback stores to guarantee availability
const memoryPortfolio: Map<string, WorkerPortfolioItem[]> = new Map();
const memoryTrustFlags: Map<string, WorkerTrustFlag[]> = new Map();

export const getTrustFlagsForWorker = async (
  workerId: string,
): Promise<WorkerTrustFlag[]> => {
  const flags = memoryTrustFlags.get(workerId) || [];
  try {
    const { data, error } = await supabase
      .from("worker_trust_flags")
      .select("id,worker_id,flag_type,reason,resolved,created_at")
      .eq("worker_id", workerId);
    if (!error && data) {
      const existingIds = new Set(data.map((d: any) => d.id));
      const memoryUnique = flags.filter((f) => !existingIds.has(f.id));
      return [...data, ...memoryUnique];
    }
  } catch {
    // Fall back
  }
  return flags;
};

export const addTrustFlag = async (flag: {
  worker_id: string;
  flag_type: string;
  reason: string;
}) => {
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
    console.warn(
      "[trust_flags] Supabase insert failed, retained in memory:",
      err,
    );
  }
  return newFlag;
};

// GET /api/workers/:id/portfolio
export const handleGetWorkerPortfolio: RequestHandler = async (req, res) => {
  try {
    const workerId = String(req.params.id || "");
    const cleanPhone = workerId
      .replace(/^\+91/, "")
      .replace(/\D/g, "")
      .slice(-10);
    if (!workerId) {
      res.status(400).json({ message: "Worker ID is required" });
      return;
    }

    // 1. Try Supabase worker_portfolio table first
    try {
      const { data, error } = await supabase
        .from("worker_portfolio")
        .select("id,worker_id,image_url,label,status,flag_reasons,uploaded_at")
        .or(
          `worker_id.eq.${workerId}${cleanPhone ? `,worker_id.eq.${cleanPhone}` : ""}`,
        )
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
        const parsed =
          typeof workerData.portfolio_photos === "string"
            ? JSON.parse(workerData.portfolio_photos)
            : workerData.portfolio_photos;
        if (Array.isArray(parsed) && parsed.length > 0) {
          const approved = parsed.filter(
            (p: any) => p.status === "approved" || !p.status,
          );
          res.json({ photos: approved });
          return;
        }
      }
    } catch {
      // Fall through
    }

    const photos = (
      memoryPortfolio.get(workerId) ||
      memoryPortfolio.get(cleanPhone) ||
      []
    ).filter((p) => p.status === "approved");
    res.json({ photos });
  } catch (err) {
    console.error("[portfolio] get error:", err);
    res.status(500).json({ message: "Unable to load portfolio photos." });
  }
};

// GET /api/workers/my-portfolio (Worker's own portfolio view)
export const handleGetMyPortfolio: RequestHandler = async (req, res) => {
  try {
    const authorization = req.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const token = authorization.slice("Bearer ".length);
    const { data: authData, error: authError } =
      await supabase.auth.getUser(token);
    if (authError || !authData.user) {
      res.status(401).json({ message: "Session expired or invalid" });
      return;
    }

    const phone = String(
      authData.user.phone || authData.user.user_metadata?.phone || "",
    )
      .replace(/^\+91/, "")
      .replace(/\D/g, "")
      .slice(-10);
    const allWorkers = await getAllWorkers();
    const worker = allWorkers.find(
      (w) => w.phone === phone || w.id === authData.user.id,
    );
    const workerId = worker ? worker.id : phone || authData.user.id;

    // 1. Try Supabase worker_portfolio table
    try {
      const { data, error } = await supabase
        .from("worker_portfolio")
        .select("id,worker_id,image_url,label,status,flag_reasons,uploaded_at")
        .or(`worker_id.eq.${workerId}${phone ? `,worker_id.eq.${phone}` : ""}`)
        .eq("status", "approved")
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
        const parsed =
          typeof workerData.portfolio_photos === "string"
            ? JSON.parse(workerData.portfolio_photos)
            : workerData.portfolio_photos;
        if (Array.isArray(parsed) && parsed.length > 0) {
          const approved = parsed.filter(
            (p: any) => p.status === "approved" || !p.status,
          );
          res.json({ photos: approved, workerId });
          return;
        }
      }
    } catch {
      // Fall through
    }

    const photos = (
      memoryPortfolio.get(workerId) ||
      memoryPortfolio.get(phone) ||
      []
    ).filter((p) => p.status === "approved");
    res.json({ photos, workerId });
  } catch (err) {
    console.error("[portfolio] get my error:", err);
    res.status(500).json({ message: "Unable to load your portfolio photos." });
  }
};

// POST /api/workers/portfolio (Upload photos with 10-cap enforcement and silent Gemini vision screening)
export const handleUploadPortfolio: RequestHandler = async (req, res) => {
  try {
    const authorization = req.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const token = authorization.slice("Bearer ".length);
    const { data: authData, error: authError } =
      await supabase.auth.getUser(token);
    if (authError || !authData.user) {
      res.status(401).json({ message: "Session expired or invalid" });
      return;
    }

    const phone = String(
      authData.user.phone || authData.user.user_metadata?.phone || "",
    )
      .replace(/^\+91/, "")
      .replace(/\D/g, "")
      .slice(-10);
    const allWorkers = await getAllWorkers();
    const worker = allWorkers.find(
      (w) => w.phone === phone || w.id === authData.user.id,
    );
    const workerId = worker ? worker.id : phone || authData.user.id;

    const payloadSchema = z.object({
      images: z
        .array(
          z.object({
            data: z.string().min(10),
            name: z.string().default("work_photo.jpg"),
            label: z.string().max(100).optional().default(""),
          }),
        )
        .min(1)
        .max(10),
    });

    const parsed = payloadSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({
          message:
            "Invalid photo upload payload. Send between 1 and 10 photos.",
        });
      return;
    }

    // 1. Always check current existing approved photos in DB / memory
    let existingPhotos: WorkerPortfolioItem[] = [];
    try {
      const { data: dbPhotos } = await supabase
        .from("worker_portfolio")
        .select("id,worker_id,image_url,label,status,flag_reasons,uploaded_at")
        .or(`worker_id.eq.${workerId}${phone ? `,worker_id.eq.${phone}` : ""}`)
        .eq("status", "approved")
        .order("uploaded_at", { ascending: false });
      if (Array.isArray(dbPhotos) && dbPhotos.length > 0) {
        existingPhotos = dbPhotos;
      }
    } catch {}

    if (existingPhotos.length === 0) {
      existingPhotos = (
        memoryPortfolio.get(workerId) ||
        memoryPortfolio.get(phone) ||
        []
      ).filter((p) => p.status === "approved");
    }

    // Cap uploads at 10 images per worker (storage cost control)
    const currentCount = existingPhotos.length;
    if (currentCount >= 10) {
      res.status(400).json({
        message:
          "Maximum limit reached. Each worker profile can have at most 10 portfolio photos. Please delete an existing photo before uploading a new one.",
      });
      return;
    }

    if (currentCount + parsed.data.images.length > 10) {
      const remainingSlots = 10 - currentCount;
      res.status(400).json({
        message: `Uploading ${parsed.data.images.length} photo(s) would exceed the 10-photo portfolio cap. You can upload at most ${remainingSlots} more photo(s).`,
      });
      return;
    }

    const uploadedResults: WorkerPortfolioItem[] = [];
    let failedCount = 0;

    for (const img of parsed.data.images) {
      // Run through silent Gemini vision screening BEFORE storing or displaying
      const screening = await screenImageSilently({
        id: `img-${Date.now()}`,
        name: img.name,
        mimeType: "image/jpeg",
        data: img.data,
      });

      const isPassed =
        screening.verdict === "approved" &&
        !screening.checks.is_stock_photo &&
        !screening.checks.contains_inappropriate_content &&
        !screening.checks.contains_identifiable_third_party &&
        !screening.checks.image_quality_issue &&
        screening.checks.shows_actual_work;

      if (!isPassed) {
        // Failed photo: SILENTLY DROPPED — NOT stored/shown in portfolio!
        failedCount++;
        continue;
      }

      // Passed photo: persist to worker_portfolio table
      const photoItem: WorkerPortfolioItem = {
        id: `port-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        worker_id: workerId,
        image_url: img.data,
        label: img.label?.trim() || undefined,
        uploaded_at: new Date().toISOString(),
        status: "approved",
      };

      try {
        await supabase.from("worker_portfolio").insert({
          id: photoItem.id,
          worker_id: photoItem.worker_id,
          user_id: authData.user.id,
          image_url: photoItem.image_url,
          label: photoItem.label || null,
          status: "approved",
        });
      } catch (err) {
        console.warn(
          "[portfolio] Supabase worker_portfolio insert fallback:",
          err,
        );
      }

      uploadedResults.push(photoItem);
    }

    if (uploadedResults.length === 0 && failedCount > 0) {
      res.status(400).json({
        message: "Photo couldn't be used.",
      });
      return;
    }

    // Combine newly uploaded photos with existing photos
    const updatedPhotos = [...uploadedResults, ...existingPhotos];

    memoryPortfolio.set(workerId, updatedPhotos);
    if (phone) memoryPortfolio.set(phone, updatedPhotos);

    // Save backup to workers table
    try {
      if (phone) {
        await supabase
          .from("workers")
          .update({
            portfolio_photos: JSON.stringify(updatedPhotos),
            updated_at: new Date().toISOString(),
          })
          .eq("phone", phone);
      }
      if (workerId) {
        await supabase
          .from("workers")
          .update({
            portfolio_photos: JSON.stringify(updatedPhotos),
            updated_at: new Date().toISOString(),
          })
          .eq("id", workerId);
      }
    } catch {}

    const message =
      failedCount > 0
        ? `${uploadedResults.length} photo(s) uploaded successfully. ${failedCount} photo couldn't be used.`
        : `${uploadedResults.length} photo(s) uploaded successfully.`;

    res.status(201).json({
      message,
      photos: updatedPhotos,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to upload portfolio photos";
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
    const phone = String(
      authData?.user?.phone || authData?.user?.user_metadata?.phone || "",
    )
      .replace(/^\+91/, "")
      .replace(/\D/g, "")
      .slice(-10);

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
          await supabase
            .from("workers")
            .update({ portfolio_photos: JSON.stringify(filtered) })
            .or(`id.eq.${wId},phone.eq.${phone}`);
        } catch {}
      }
    }

    res.json({ message: "Portfolio photo deleted successfully." });
  } catch (err) {
    console.error("[portfolio] delete error:", err);
    res.status(500).json({ message: "Unable to delete portfolio photo." });
  }
};

// GET /api/admin/workers-with-flags
export const handleGetAdminWorkersWithFlags: RequestHandler = async (
  req,
  res,
) => {
  try {
    const allWorkers = await getAllWorkers();

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
            existing.phone_verified =
              dw.phone_verified ?? existing.phone_verified;
          }
        }
      }
    } catch {}

    let agencies: any[] = [];
    try {
      const { data: agData } = await supabase
        .from("agencies")
        .select("id,name,agency_code");
      if (Array.isArray(agData)) agencies = agData;
    } catch {}

    const agencyMap = new Map<string, { name: string; code: string }>();
    for (const ag of agencies) {
      if (ag.id)
        agencyMap.set(String(ag.id).toLowerCase(), {
          name: ag.name,
          code: ag.agency_code || ag.id,
        });
      if (ag.agency_code)
        agencyMap.set(String(ag.agency_code).toLowerCase(), {
          name: ag.name,
          code: ag.agency_code,
        });
    }

    let dbFlags: any[] = [];
    try {
      const { data } = await supabase.from("worker_trust_flags").select("*");
      if (data) dbFlags = data;
    } catch {}

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

    const workersWithFlags = Array.from(combinedWorkersMap.values()).map(
      (w) => {
        const workerFlags = (
          flagsByWorker.get(w.id) ||
          flagsByWorker.get(w.phone) ||
          []
        ).filter((f) => !f.resolved);
        const portfolioCount = (memoryPortfolio.get(w.id) || []).length;
        const agencyInfo = w.agency_id
          ? agencyMap.get(String(w.agency_id).toLowerCase())
          : null;
        return {
          ...w,
          agency_name:
            agencyInfo?.name ||
            (w.agency_id ? `Agency (${w.agency_id})` : null),
          agency_code: agencyInfo?.code || w.agency_id || null,
          trust_flags: workerFlags,
          portfolio_count: portfolioCount,
          has_flags: workerFlags.length > 0,
        };
      },
    );

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
    const flags = memoryTrustFlags.get(workerId) || [];
    flags.forEach((f) => {
      f.resolved = true;
    });
    memoryTrustFlags.set(workerId, flags);

    try {
      await supabase
        .from("worker_trust_flags")
        .update({ resolved: true })
        .eq("worker_id", workerId);
    } catch {}

    res.json({ message: "Flags resolved successfully." });
  } catch (err) {
    console.error("[admin workers] resolve flags error:", err);
    res.status(500).json({ message: "Unable to resolve flags." });
  }
};

// POST /api/admin/workers/:workerId/toggle-verify
export const handleToggleWorkerVerification: RequestHandler = async (
  req,
  res,
) => {
  try {
    const workerId = req.params.workerId;
    const { verified } = req.body as { verified: boolean };

    try {
      await supabase
        .from("workers")
        .update({ phone_verified: verified })
        .eq("id", workerId);
    } catch {}

    res.json({
      message: `Worker verification status set to ${verified ? "verified" : "unverified"}.`,
    });
  } catch (err) {
    console.error("[admin workers] toggle verification error:", err);
    res.status(500).json({ message: "Unable to update worker verification." });
  }
};
