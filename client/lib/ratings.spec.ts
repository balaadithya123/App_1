import { beforeEach, describe, expect, it } from "vitest";
import {
  getCustomerRatings,
  saveCustomerRating,
  getComputedWorkerRating,
} from "./ratings";

// In-memory localStorage mock for node environment
const localStorageMap = new Map<string, string>();

const mockLocalStorage = {
  getItem: (key: string) => localStorageMap.get(key) ?? null,
  setItem: (key: string, value: string) => localStorageMap.set(key, value),
  removeItem: (key: string) => localStorageMap.delete(key),
  clear: () => localStorageMap.clear(),
};

if (typeof window === "undefined") {
  (globalThis as any).window = {
    localStorage: mockLocalStorage,
    dispatchEvent: () => true,
  };
  (globalThis as any).localStorage = mockLocalStorage;
} else {
  if (!window.localStorage) (window as any).localStorage = mockLocalStorage;
  if (!window.dispatchEvent) (window as any).dispatchEvent = () => true;
}

describe("ratings module optimizations & helpers", () => {
  beforeEach(() => {
    localStorageMap.clear();
  });

  it("returns base rating when no customer ratings exist", () => {
    const worker = { id: "w1", avg_rating: 4.5, reviews_count: 10 };
    const res = getComputedWorkerRating(worker);

    expect(res).toEqual({
      rating: 4.5,
      reviewsCount: 10,
      userRated: false,
    });
  });

  it("calculates weighted average rating correctly after adding new rating", () => {
    const worker = { id: "w1", avg_rating: 4.0, reviews_count: 10 }; // Total score = 40

    saveCustomerRating({
      workerId: "w1",
      rating: 5,
      customerName: "Ravi",
      comment: "Great work!",
    });

    const res = getComputedWorkerRating(worker);
    // (40 + 5) / 11 = 4.0909... -> 4.1
    expect(res.rating).toBe(4.1);
    expect(res.reviewsCount).toBe(11);
    expect(res.userRated).toBe(true);
  });

  it("efficiently looks up ratings by workerId from cached Map", () => {
    saveCustomerRating({ workerId: "w1", rating: 5 });
    saveCustomerRating({ workerId: "w2", rating: 3 });
    saveCustomerRating({ workerId: "w1", rating: 4 });

    const w1Ratings = getCustomerRatings("w1");
    const w2Ratings = getCustomerRatings("w2");
    const w3Ratings = getCustomerRatings("w3");

    expect(w1Ratings).toHaveLength(2);
    expect(w2Ratings).toHaveLength(1);
    expect(w3Ratings).toHaveLength(0);
  });
});
