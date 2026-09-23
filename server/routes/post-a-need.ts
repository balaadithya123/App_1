import type { RequestHandler } from "express";
import { z } from "zod";
import type {
  ApiErrorResponse,
  PostNeedResponse,
  RecordLeadResponse,
} from "../../shared/api";
import type { Worker } from "../../shared/workers";
import { getAllWorkers } from "./workers";
import { supabase } from "../lib/supabase";

// In-memory lead tracking scaffold map (persists lead counts per worker during runtime)
const workerLeadsMap = new Map<string, number>();

export const postNeedSchema = z.object({
  category: z.string().trim().min(1, "Category is required"),
  description: z.string().trim().min(1, "Short description is required"),
  location: z.string().trim().min(1, "Location is required"),
  customerPhone: z.string().trim().optional(),
});

export const handlePostANeed: RequestHandler = async (req, res) => {
  try {
    const parseResult = postNeedSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        message:
          "Please fill in all required fields (category, description, location).",
        errors: z.flattenError(parseResult.error).fieldErrors,
      } satisfies ApiErrorResponse);
      return;
    }

    const { category, description, location } = parseResult.data;

    // Fetch all workers
    const allWorkers = await getAllWorkers();

    const normCategory = category.trim().toLowerCase();
    const normLoc = location.trim().toLowerCase();

    // Helper match checkers
    const isCategoryMatch = (w: Worker) => {
      if (!normCategory || normCategory === "all services") return true;
      const wCat = (w.category || "").trim().toLowerCase();
      const wServices = (w.services || []).map((s) => s.toLowerCase());
      return (
        wCat.includes(normCategory) ||
        normCategory.includes(wCat) ||
        wServices.some((s) => s.includes(normCategory))
      );
    };

    const isLocationMatch = (w: Worker) => {
      if (!normLoc) return false;
      const wLoc = (w.locality || "").trim().toLowerCase();
      if (!wLoc) return false;
      return wLoc.includes(normLoc) || normLoc.includes(wLoc);
    };

    // Calculate ranking scores for matching
    const scoredWorkers = allWorkers.map((w) => {
      const catMatch = isCategoryMatch(w);
      const locMatch = isLocationMatch(w);

      let score = 0;

      // 1. Category relevance (highest weight)
      if (catMatch) score += 100;

      // 2. Location proximity (high weight)
      if (locMatch) score += 60;

      // 3. Monetization scaffold check (tiebreaker preference, blocks nobody)
      const leadCredits = w.leadCredits ?? 100;
      const isPromoted = w.isPromoted ?? true;
      if (isPromoted && leadCredits > 0) {
        score += 15;
      }

      // 4. Phone verification boost
      if (w.phone_verified) score += 20;

      // 5. Rating score
      const rating = Number(w.avg_rating || w.rating || 4.8);
      score += rating * 4;

      // 6. Available today boost
      if (w.available_today) score += 10;

      // Attach current leadsReceived from memory/data
      const currentLeads = workerLeadsMap.get(w.id) ?? w.leadsReceived ?? 0;

      return {
        worker: {
          ...w,
          leadsReceived: currentLeads,
          leadCredits,
          isPromoted,
        },
        score,
        catMatch,
      };
    });

    // Filter to category matches first if any exist, otherwise fallback to general matches
    let matches = scoredWorkers.filter((item) => item.catMatch);
    if (matches.length === 0) {
      matches = scoredWorkers;
    }

    // Sort descending by calculated match score
    matches.sort((a, b) => b.score - a.score);

    // Cap matched workers at ~5-8 (top 6)
    const matchedWorkers = matches.slice(0, 6).map((item) => item.worker);

    // Log analytics event
    try {
      await supabase.from("analytics_events").insert({
        event_type: "post_a_need_submitted",
        worker_id: matchedWorkers[0]?.id || null,
        metadata: {
          category,
          location,
          description_len: description.length,
          matched_count: matchedWorkers.length,
        },
      });
    } catch {}

    res.json({
      matchedWorkers,
      totalMatched: matchedWorkers.length,
    } satisfies PostNeedResponse);
  } catch (error) {
    console.error("[post-a-need] Error matching workers:", error);
    res.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Unable to match workers right now.",
    } satisfies ApiErrorResponse);
  }
};

export const handleRecordLead: RequestHandler = async (req, res) => {
  try {
    const workerId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    if (!workerId) {
      res
        .status(400)
        .json({ message: "Worker ID is required." } satisfies ApiErrorResponse);
      return;
    }

    // Increment lead count in runtime memory map
    const current = workerLeadsMap.get(workerId) ?? 0;
    const newCount = current + 1;
    workerLeadsMap.set(workerId, newCount);

    // Attempt Supabase analytics event logging
    try {
      await supabase.from("analytics_events").insert({
        event_type: "lead_whatsapp_notified",
        worker_id: workerId,
        metadata: { source: "post_a_need_whatsapp" },
      });
    } catch {}

    res.json({
      success: true,
      workerId,
      leadsReceived: newCount,
    } satisfies RecordLeadResponse);
  } catch (error) {
    console.error("[record-lead] Error recording lead:", error);
    res.status(500).json({
      message:
        error instanceof Error ? error.message : "Unable to record lead.",
    } satisfies ApiErrorResponse);
  }
};
