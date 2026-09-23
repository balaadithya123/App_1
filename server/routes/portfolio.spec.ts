import { describe, expect, it } from "vitest";
import { computeVerdict, fallbackHeuristic } from "./portfolio-screen";

describe("Worker Portfolio & Photo Screening", () => {
  describe("Gemini Screening Verdict Computation", () => {
    it("approves authentic trade work photos", () => {
      const checks = {
        is_stock_photo: false,
        is_duplicate_style: false,
        shows_actual_work: true,
        image_quality_issue: false,
        contains_inappropriate_content: false,
        contains_identifiable_third_party: false,
      };

      expect(computeVerdict(checks)).toBe("approved");
    });

    it("rejects stock photos", () => {
      const checks = {
        is_stock_photo: true,
        is_duplicate_style: false,
        shows_actual_work: true,
        image_quality_issue: false,
        contains_inappropriate_content: false,
        contains_identifiable_third_party: false,
      };

      expect(computeVerdict(checks)).toBe("rejected");
    });

    it("rejects inappropriate or illegal content", () => {
      const checks = {
        is_stock_photo: false,
        is_duplicate_style: false,
        shows_actual_work: true,
        image_quality_issue: false,
        contains_inappropriate_content: true,
        contains_identifiable_third_party: false,
      };

      expect(computeVerdict(checks)).toBe("rejected");
    });

    it("rejects photos violating privacy rules (e.g. ID cards / third-party faces)", () => {
      const checks = {
        is_stock_photo: false,
        is_duplicate_style: false,
        shows_actual_work: true,
        image_quality_issue: false,
        contains_inappropriate_content: false,
        contains_identifiable_third_party: true,
      };

      expect(computeVerdict(checks)).toBe("rejected");
    });

    it("rejects low quality or off-subject images", () => {
      const checks = {
        is_stock_photo: false,
        is_duplicate_style: false,
        shows_actual_work: false,
        image_quality_issue: true,
        contains_inappropriate_content: false,
        contains_identifiable_third_party: false,
      };

      expect(computeVerdict(checks)).toBe("rejected");
    });
  });

  describe("Fallback Heuristic Screening", () => {
    it("flags explicit stock photo markers", () => {
      const res = fallbackHeuristic({
        id: "1",
        name: "shutterstock_electrician_123.jpg",
        mimeType: "image/jpeg",
        data: "data:image/jpeg;base64,1234567890abcdef",
      });

      expect(res.verdict).toBe("rejected");
      expect(res.checks.is_stock_photo).toBe(true);
    });

    it("flags privacy issues like ID cards", () => {
      const res = fallbackHeuristic({
        id: "2",
        name: "aadhaar_id_card.jpg",
        mimeType: "image/jpeg",
        data: "data:image/jpeg;base64,1234567890abcdef",
      });

      expect(res.verdict).toBe("rejected");
      expect(res.checks.contains_identifiable_third_party).toBe(true);
    });

    it("approves standard job site photo filenames", () => {
      const res = fallbackHeuristic({
        id: "3",
        name: "wiring_repair_job_site.jpg",
        mimeType: "image/jpeg",
        data: "data:image/jpeg;base64,1234567890abcdef",
      });

      expect(res.verdict).toBe("approved");
      expect(res.suggested_category).toBe("Electrician");
    });
  });
});
