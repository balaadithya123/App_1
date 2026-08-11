import { afterEach, describe, expect, it } from "vitest";
import { rm, readFile } from "node:fs/promises";
import path from "node:path";
import { reportSchema } from "./reports";
import { saveReport } from "../lib/reports";

const reportsFile = path.join(process.cwd(), "data", "reports.json");

afterEach(async () => {
  await rm(reportsFile, { force: true });
});

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

  it("persists reports to the local JSON data store", async () => {
    const report = await saveReport({
      reason: "Other",
      feedback: "Please review this listing.",
    });

    const persistedReports = JSON.parse(await readFile(reportsFile, "utf8"));

    expect(persistedReports).toEqual([report]);
    expect(report).toMatchObject({
      reason: "Other",
      feedback: "Please review this listing.",
    });
    expect(report.id).toMatch(/^report-/);
    expect(new Date(report.createdAt).toString()).not.toBe("Invalid Date");
  });
});
