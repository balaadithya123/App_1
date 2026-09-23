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

function getAllStoredRatings(): CustomerRating[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getCustomerRatings(workerId: string): CustomerRating[] {
  const all = getAllStoredRatings();
  return all.filter((r) => r.workerId === workerId);
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
