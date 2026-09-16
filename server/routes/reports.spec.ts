import { describe, expect, it } from "vitest";
import { reportSchema } from "./reports";
import { saveReport } from "../lib/reports";

describe("report submissions", () => {
  it("validates the required report fields", () => {
    const result = reportSchema.safeParse({
      reason: "Incorrect information",
      feedback: "The phone number is no longer correct.",
    });

    expect(result.success).toBe(true);
  });

  it("rejects unknown report reasons", () => {
    const result = reportSchema.safeParse({
      reason: "Something unrelated",
      feedback: "Details are present.",
    });

    expect(result.success).toBe(false);
  });

  it("persists reports with a generated ID and timestamp", async () => {
    const report = await saveReport({
      reason: "Other",
      feedback: "Please review this listing.",
    });

    expect(report).toMatchObject({
      reason: "Other",
      feedback: "Please review this listing.",
    });
    expect(report.id).toMatch(/^report-/);
    expect(new Date(report.createdAt).toString()).not.toBe("Invalid Date");
  });
});
