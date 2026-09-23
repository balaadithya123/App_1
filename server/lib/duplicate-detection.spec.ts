import { describe, expect, it, vi } from "vitest";

vi.mock("./supabase", () => {
  return {
    supabase: {
      from: () => ({
        select: () => ({ single: async () => ({ data: null, error: null }) }),
        insert: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }),
      }),
    },
  };
});

import {
  calculateJaccardSimilarity,
  checkProfilePhotoDuplicates,
  checkProfileTextSimilarity,
  extractShingles,
  tokenizeText,
} from "./duplicate-detection";

describe("pure-JS word shingle duplicate text detection", () => {
  it("tokenizes and cleans text into lowercase words", () => {
    const tokens = tokenizeText("Hello, World! Experienced Electrician in Chennai.");
    expect(tokens).toEqual(["hello", "world", "experienced", "electrician", "in", "chennai"]);
  });

  it("extracts 3-word shingles by default", () => {
    const tokens = ["expert", "home", "wiring", "repair", "service"];
    const shingles = extractShingles(tokens, 3);
    expect(Array.from(shingles)).toEqual([
      "expert home wiring",
      "home wiring repair",
      "wiring repair service",
    ]);
  });

  it("calculates Jaccard similarity accurately", () => {
    const setA = new Set(["a b c", "b c d", "c d e"]);
    const setB = new Set(["a b c", "b c d", "x y z"]);
    // Intersection: 2 ("a b c", "b c d"). Union: 4 ("a b c", "b c d", "c d e", "x y z"). Jaccard: 2/4 = 0.5
    expect(calculateJaccardSimilarity(setA, setB)).toBe(0.5);
  });

  it("detects near-duplicate profile descriptions using checkProfileTextSimilarity", () => {
    const existingProfiles = [
      {
        id: "worker-101",
        name: "Ramesh Kumar",
        text: "Experienced electrician specializing in home wiring, fuse box repair, solar installation, and ceiling fan repair in Cuddalore.",
      },
    ];

    const newProfileText = "Experienced electrician specializing in home wiring, fuse box repair, solar installation, and ceiling fan repair in Cuddalore area.";

    const result = checkProfileTextSimilarity(newProfileText, existingProfiles, { threshold: 0.6 });

    expect(result.isDuplicate).toBe(true);
    expect(result.matchedWorkerId).toBe("worker-101");
    expect(result.highestSimilarity).toBeGreaterThanOrEqual(0.6);
    expect(result.reason).toContain("High text similarity");
  });

  it("returns non-duplicate when profiles have low text similarity", () => {
    const existingProfiles = [
      {
        id: "worker-102",
        name: "Suresh Mason",
        text: "Brick laying, wall tiling, cement plastering, and foundation masonry work.",
      },
    ];

    const newProfileText = "Licensed plumber fixing water pipe leakage, drain clearing, tap replacement, and bathroom fittings.";

    const result = checkProfileTextSimilarity(newProfileText, existingProfiles, { threshold: 0.6 });

    expect(result.isDuplicate).toBe(false);
    expect(result.highestSimilarity).toBeLessThan(0.6);
  });
});

describe("profile photo duplicate / stock check fallback", () => {
  it("flags stock photos correctly in fallback mode", async () => {
    const result = await checkProfilePhotoDuplicates("https://example.com/stock-photo-electrician.jpg");
    expect(result.is_stock_photo).toBe(true);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("flags screenshot / meme photos correctly in fallback mode", async () => {
    const result = await checkProfilePhotoDuplicates("https://example.com/wa_screenshot_profile.png");
    expect(result.is_duplicate_or_copied).toBe(true);
  });
});
