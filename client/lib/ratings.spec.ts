import { beforeEach, describe, expect, it } from "vitest";
import {
  clearRatingsCache,
  getComputedWorkerRating,
  getCustomerRatings,
  saveCustomerRating,
} from "./ratings";

// Mock localStorage and window in node environment for unit testing
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, "window", {
  value: {
    addEventListener: () => {},
    dispatchEvent: () => {},
    localStorage: mockLocalStorage,
  },
  writable: true,
});

Object.defineProperty(globalThis, "localStorage", {
  value: mockLocalStorage,
  writable: true,
});

describe("ratings module", () => {
  beforeEach(() => {
    localStorage.clear();
    clearRatingsCache();
  });

  it("returns base worker rating when no custom customer ratings exist", () => {
    const worker = { id: "w-1", avg_rating: 4.8, reviews_count: 10 };
    const res = getComputedWorkerRating(worker);
    expect(res).toEqual({
      rating: 4.8,
      reviewsCount: 10,
      userRated: false,
    });
  });

  it("computes weighted worker rating when custom ratings are saved", () => {
    const worker = { id: "w-1", avg_rating: 4.0, reviews_count: 1 };
    saveCustomerRating({
      workerId: "w-1",
      rating: 5,
      comment: "Great work!",
    });

    const res = getComputedWorkerRating(worker);
    expect(res.userRated).toBe(true);
    expect(res.reviewsCount).toBe(2);
    expect(res.rating).toBe(4.5); // (4.0 * 1 + 5.0) / 2 = 4.5
  });

  it("caches ratings in memory across repeated calls to getCustomerRatings", () => {
    const workerId = "w-2";

    saveCustomerRating({
      workerId,
      rating: 5,
      comment: "Excellent",
    });

    // First lookup reads/populates cache
    const firstCall = getCustomerRatings(workerId);
    expect(firstCall).toHaveLength(1);

    // Modify localStorage directly behind the scenes without clearing in-memory cache
    localStorage.setItem("localworker_customer_ratings", "[]");

    // Second lookup should return cached value
    const secondCall = getCustomerRatings(workerId);
    expect(secondCall).toHaveLength(1);

    // After clearing cache, lookup should read fresh localStorage state
    clearRatingsCache();
    const thirdCall = getCustomerRatings(workerId);
    expect(thirdCall).toHaveLength(0);
  });
});
