import { supabase } from "@/lib/supabase";
import { recordContactForTrackRecord } from "@/lib/track-record";

type AnalyticsMetadata = Record<string, unknown>;

export const logAnalyticsEvent = async (
  eventType: string,
  workerId?: string | null,
  metadata: AnalyticsMetadata = {},
) => {
  if (!supabase) return;
  try {
    const { error } = await supabase.from("analytics_events").insert({
      event_type: eventType,
      worker_id: workerId ?? null,
      metadata,
    });
    if (error) console.warn("[analytics] logging failed:", error.message);
  } catch (error) {
    console.warn("[analytics] logging failed:", error);
  }
};

export const logContactEvent = async (
  workerId: string,
  source: "whatsapp" | "call" | string,
  details?: { name?: string; category?: string },
) => {
  // Always trigger local track record pending entry
  try {
    recordContactForTrackRecord(
      workerId,
      source,
      details?.name,
      details?.category,
    );
  } catch (err) {
    console.warn("[contact-events] track record record error:", err);
  }

  if (!supabase) return;
  try {
    const { error } = await supabase
      .from("contact_events")
      .insert({ worker_id: workerId, source });
    if (error) console.warn("[contact-events] logging failed:", error.message);
  } catch (error) {
    console.warn("[contact-events] logging failed:", error);
  }
};
