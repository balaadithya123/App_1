import { RequestHandler } from "express";
import { z } from "zod";
import { supabase } from "../lib/supabase";

export interface TrackRecordEntry {
  id: string;
  worker_id: string;
  showed_up: boolean;
  note?: string | null;
  photo_url?: string | null;
  created_at: string;
}

// Memory fallback store for track record entries
const memoryTrackRecords: TrackRecordEntry[] = [
  {
    id: "tr_demo_1",
    worker_id: "1",
    showed_up: true,
    note: "Arrived right on time and fixed the main breaker switch.",
    photo_url: null,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "tr_demo_2",
    worker_id: "1",
    showed_up: true,
    note: "Completed rewiring neatly.",
    photo_url: null,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "tr_demo_3",
    worker_id: "1",
    showed_up: true,
    note: "Very polite electrician.",
    photo_url: null,
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "tr_demo_4",
    worker_id: "2",
    showed_up: true,
    note: "Fixed bathroom pipe leakage quickly.",
    photo_url: null,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const handleCreateTrackRecord: RequestHandler = async (req, res) => {
  try {
    const schema = z.object({
      worker_id: z.string().trim().min(1),
      showed_up: z.boolean(),
      note: z.string().trim().max(100).optional().nullable(),
      photo_url: z.string().trim().optional().nullable(),
    });

    const body = schema.parse(req.body);
    const newEntry: TrackRecordEntry = {
      id: `tr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      worker_id: body.worker_id,
      showed_up: body.showed_up,
      note: body.note ? body.note.slice(0, 100) : null,
      photo_url: body.photo_url || null,
      created_at: new Date().toISOString(),
    };

    // Store in memory
    memoryTrackRecords.unshift(newEntry);

    // Try storing in Supabase
    try {
      if (supabase) {
        await supabase.from("track_record").insert({
          worker_id: newEntry.worker_id,
          showed_up: newEntry.showed_up,
          note: newEntry.note,
          photo_url: newEntry.photo_url,
          created_at: newEntry.created_at,
        });
      }
    } catch (dbErr) {
      console.warn("[track-record] Supabase insert warning:", dbErr);
    }

    return res.json({ success: true, entry: newEntry });
  } catch (err) {
    console.error("[track-record] create error:", err);
    return res.status(400).json({ message: err instanceof Error ? err.message : "Invalid input data" });
  }
};

export const handleGetWorkerTrackRecord: RequestHandler = async (req, res) => {
  try {
    const workerId = req.params.id;
    if (!workerId) {
      return res.status(400).json({ message: "Worker ID required" });
    }

    let entries: TrackRecordEntry[] = [];

    try {
      if (supabase) {
        const { data, error } = await supabase
          .from("track_record")
          .select("*")
          .eq("worker_id", workerId)
          .order("created_at", { ascending: false })
          .limit(20);

        if (!error && data && data.length > 0) {
          entries = data as TrackRecordEntry[];
        }
      }
    } catch (dbErr) {
      console.warn("[track-record] Supabase query warning:", dbErr);
    }

    // Merge memory store for fallback
    const memEntries = memoryTrackRecords.filter((e) => e.worker_id === workerId);
    const combinedMap = new Map<string, TrackRecordEntry>();
    for (const e of [...entries, ...memEntries]) {
      combinedMap.set(e.id, e);
    }
    const finalEntries = Array.from(combinedMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const total = finalEntries.length;
    const showedUpCount = finalEntries.filter((e) => e.showed_up).length;
    const percentage = total > 0 ? Math.round((showedUpCount / total) * 100) : 0;

    return res.json({
      summary: {
        total,
        showed_up_count: showedUpCount,
        showed_up_percentage: percentage,
      },
      entries: finalEntries,
    });
  } catch (err) {
    console.error("[track-record] get error:", err);
    return res.status(500).json({ message: "Failed to load track record" });
  }
};
