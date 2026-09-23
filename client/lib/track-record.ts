import { workers as staticWorkers } from "@/data/workers";

export interface PendingTrackConfirmation {
  id: string;
  workerId: string;
  workerName: string;
  category: string;
  timestamp: number;
  source: string;
}

export interface TrackRecordEntry {
  id: string;
  worker_id: string;
  showed_up: boolean;
  note?: string | null;
  photo_url?: string | null;
  created_at: string;
}

export interface TrackRecordData {
  summary: {
    total: number;
    showed_up_count: number;
    showed_up_percentage: number;
  };
  entries: TrackRecordEntry[];
}

const STORAGE_KEY = "app1:pending-track-confirmations";

function readPendingStorage(): PendingTrackConfirmation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Prune entries older than 7 days
    const now = Date.now();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const valid = parsed.filter(
      (item) =>
        item &&
        item.id &&
        item.workerId &&
        item.timestamp &&
        now - item.timestamp <= SEVEN_DAYS_MS,
    );

    if (valid.length !== parsed.length) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
    }
    return valid;
  } catch {
    return [];
  }
}

function writePendingStorage(items: PendingTrackConfirmation[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("pending-track-record-changed"));
  } catch (err) {
    console.warn("Could not write track record pending storage:", err);
  }
}

/**
 * Record a contact event locally for follow-up verification
 */
export function recordContactForTrackRecord(
  workerId: string,
  source: string = "call",
  workerName?: string,
  category?: string,
): void {
  if (!workerId) return;

  const current = readPendingStorage();
  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  // Check if we already logged a contact for this worker in the last 24h
  const existing = current.find(
    (item) => item.workerId === workerId && now - item.timestamp < ONE_DAY_MS,
  );

  if (existing) {
    // Avoid duplicate rapid triggers for same worker
    return;
  }

  // Find worker name and category if not supplied
  let finalName = workerName || "";
  let finalCategory = category || "";

  if (!finalName || !finalCategory) {
    const found = staticWorkers.find((w) => w.id === workerId);
    if (found) {
      if (!finalName) finalName = found.name;
      if (!finalCategory) finalCategory = found.category;
    }
  }

  const newItem: PendingTrackConfirmation = {
    id: `tr_p_${now}_${Math.random().toString(36).substring(2, 7)}`,
    workerId,
    workerName: finalName || "Specialist",
    category: finalCategory || "Service",
    timestamp: now,
    source,
  };

  current.push(newItem);
  writePendingStorage(current);
}

/**
 * Get all active pending confirmations
 */
export function getPendingConfirmations(): PendingTrackConfirmation[] {
  return readPendingStorage();
}

/**
 * Find a confirmation item ready to prompt (i.e. > 24 hours old, or forced via test mode)
 */
export function getPromptableConfirmation(
  allowImmediate: boolean = false,
): PendingTrackConfirmation | null {
  const items = readPendingStorage();
  if (!items.length) return null;

  const now = Date.now();
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

  // Check query string or flag for dev testing
  const isTestMode =
    allowImmediate ||
    (typeof window !== "undefined" &&
      (window.location.search.includes("test_track_record=1") ||
        window.localStorage.getItem("app1:test-track-record") === "1"));

  if (isTestMode) {
    return items[0] || null;
  }

  // Return first item older than 24 hours
  return (
    items.find((item) => now - item.timestamp >= TWENTY_FOUR_HOURS_MS) || null
  );
}

/**
 * Dismiss a pending confirmation without submitting
 */
export function dismissPendingConfirmation(id: string): void {
  const current = readPendingStorage();
  const next = current.filter((item) => item.id !== id);
  writePendingStorage(next);
}

/**
 * Submit a track record entry to backend
 */
export async function submitTrackRecordResponse(
  pendingId: string,
  workerId: string,
  showedUp: boolean,
  note?: string,
  photoUrl?: string,
): Promise<boolean> {
  try {
    const res = await fetch("/api/track-record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        worker_id: workerId,
        showed_up: showedUp,
        note: note?.trim() || null,
        photo_url: photoUrl || null,
      }),
    });

    if (res.ok) {
      dismissPendingConfirmation(pendingId);
      return true;
    }
  } catch (err) {
    console.warn("Failed to submit track record response:", err);
  }

  // Fallback: dismiss locally so user isn't stuck
  dismissPendingConfirmation(pendingId);
  return true;
}

/**
 * Fetch track record timeline and summary for a worker profile
 */
export async function fetchWorkerTrackRecord(
  workerId: string,
): Promise<TrackRecordData> {
  try {
    const res = await fetch(
      `/api/workers/${encodeURIComponent(workerId)}/track-record`,
      {
        cache: "no-store",
      },
    );
    if (res.ok) {
      return (await res.json()) as TrackRecordData;
    }
  } catch (err) {
    console.warn("Failed to fetch worker track record:", err);
  }

  return {
    summary: { total: 0, showed_up_count: 0, showed_up_percentage: 0 },
    entries: [],
  };
}
