export interface CustomerRating {
  id: string;
  workerId: string;
  rating: number;
  customerName: string;
  comment: string;
  tags: string[];
  createdAt: string;
}

const STORAGE_KEY = "localworker_customer_ratings";

let cachedRaw: string | null = null;
let cachedAllRatings: CustomerRating[] = [];
let cachedMapByWorkerId: Map<string, CustomerRating[]> = new Map();

function syncRatingsCache(): void {
  if (typeof window === "undefined") {
    cachedRaw = null;
    cachedAllRatings = [];
    cachedMapByWorkerId = new Map();
    return;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) return;

    cachedRaw = raw;
    if (!raw) {
      cachedAllRatings = [];
      cachedMapByWorkerId = new Map();
      return;
    }

    const parsed = JSON.parse(raw);
    const list: CustomerRating[] = Array.isArray(parsed) ? parsed : [];
    cachedAllRatings = list;

    // Group by workerId in O(M) time for O(1) worker rating lookups
    const map = new Map<string, CustomerRating[]>();
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      if (item && item.workerId) {
        let group = map.get(item.workerId);
        if (!group) {
          group = [];
          map.set(item.workerId, group);
        }
        group.push(item);
      }
    }
    cachedMapByWorkerId = map;
  } catch {
    cachedAllRatings = [];
    cachedMapByWorkerId = new Map();
  }
}

function getAllStoredRatings(): CustomerRating[] {
  syncRatingsCache();
  return cachedAllRatings;
}

/**
 * Performance Optimization:
 * Retrieves ratings for a given workerId using O(1) Map lookup from cached localStorage ratings.
 * Avoids re-parsing JSON and re-filtering arrays per worker on every card render.
 */
export function getCustomerRatings(workerId: string): CustomerRating[] {
  syncRatingsCache();
  return cachedMapByWorkerId.get(workerId) || [];
}

export function saveCustomerRating(data: {
  workerId: string;
  rating: number;
  customerName?: string;
  comment?: string;
  tags?: string[];
}): CustomerRating {
  const all = getAllStoredRatings();
  const newEntry: CustomerRating = {
    id: `rate_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    workerId: data.workerId,
    rating: Math.max(1, Math.min(5, Number(data.rating) || 5)),
    customerName: (data.customerName || "Customer").trim(),
    comment: (data.comment || "").trim(),
    tags: Array.isArray(data.tags) ? data.tags : [],
    createdAt: new Date().toISOString(),
  };

  const updated = [newEntry, ...all];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn("Unable to save rating to localStorage", err);
  }

  // Attempt to sync note with track record API asynchronously
  if (data.comment) {
    try {
      void fetch("/api/track-record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          worker_id: data.workerId,
          showed_up: true,
          note: `${data.rating}★ Review: ${data.comment.slice(0, 80)}`,
        }),
      }).catch(() => {});
    } catch {
      // ignore
    }
  }

  // Dispatch custom event so all active cards update reactively
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("worker-rating-updated", {
        detail: { workerId: data.workerId, newRating: newEntry },
      })
    );
  }

  return newEntry;
}

export function getComputedWorkerRating(worker: {
  id: string;
  avg_rating?: number;
  rating?: number;
  reviews_count?: number;
}): { rating: number; reviewsCount: number; userRated: boolean } {
  const baseRating = Number(worker.avg_rating || worker.rating || 4.8);
  const baseCount = Number(worker.reviews_count || 18);

  const customerRatings = getCustomerRatings(worker.id);
  if (customerRatings.length === 0) {
    return {
      rating: baseRating,
      reviewsCount: baseCount,
      userRated: false,
    };
  }

  // Calculate weighted average
  const totalBaseScore = baseRating * baseCount;
  const totalNewScore = customerRatings.reduce((sum, r) => sum + r.rating, 0);
  const totalCount = baseCount + customerRatings.length;
  const avg = (totalBaseScore + totalNewScore) / totalCount;

  return {
    rating: Math.round(avg * 10) / 10,
    reviewsCount: totalCount,
    userRated: true,
  };
}
