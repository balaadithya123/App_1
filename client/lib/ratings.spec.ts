import { describe, it, expect, beforeEach } from "vitest";
import {
  getCustomerRatings,
  getComputedWorkerRating,
  saveCustomerRating,
} from "./ratings";

describe("client/lib/ratings", () => {
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    const mockLocalStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };

    (globalThis as any).window = {
      localStorage: mockLocalStorage,
      dispatchEvent: () => true,
    };
    (globalThis as any).localStorage = mockLocalStorage;
    (globalThis as any).CustomEvent = class CustomEvent {
      type: string;
      detail: any;
      constructor(type: string, options: any = {}) {
        this.type = type;
        this.detail = options.detail;
      }
    };
  });

  it("returns base rating and count when no customer ratings exist (empty localStorage)", () => {
    const worker = { id: "w-1", avg_rating: 4.8, reviews_count: 20 };
    const result = getComputedWorkerRating(worker);

    expect(result).toEqual({
      rating: 4.8,
      reviewsCount: 20,
      userRated: false,
    });
    expect(getCustomerRatings("w-1")).toEqual([]);
  });

  it("returns base rating and count when localStorage explicitly contains empty array '[]'", () => {
    localStorage.setItem("localworker_customer_ratings", "[]");
    const worker = { id: "w-1", avg_rating: 4.5, reviews_count: 10 };
    const result = getComputedWorkerRating(worker);

    expect(result).toEqual({
      rating: 4.5,
      reviewsCount: 10,
      userRated: false,
    });
  });

  it("computes weighted average when custom user rating is saved", () => {
    saveCustomerRating({
      workerId: "w-1",
      rating: 5,
      customerName: "Alice",
      comment: "Great service!",
    });

    const worker = { id: "w-1", avg_rating: 4.0, reviews_count: 1 };
    const result = getComputedWorkerRating(worker);

    // Base score = 4.0 * 1 = 4.0, new rating = 5, total = 9 / 2 = 4.5
    expect(result).toEqual({
      rating: 4.5,
      reviewsCount: 2,
      userRated: true,
    });

    const ratings = getCustomerRatings("w-1");
    expect(ratings).toHaveLength(1);
    expect(ratings[0].comment).toBe("Great service!");
  });
});
