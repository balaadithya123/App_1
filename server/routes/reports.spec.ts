import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/supabase", () => {
  const memoryStore = new Map<string, any[]>();

  class MockQueryBuilder {
    private table: string;
    private insertData?: any[];

    constructor(table: string) {
      this.table = table;
      if (!memoryStore.has(table)) memoryStore.set(table, []);
    }

    select() {
      return this;
    }

    insert(data: any | any[]) {
      this.insertData = Array.isArray(data) ? data : [data];
      return this;
    }

    private execute() {
      const rows = memoryStore.get(this.table) || [];
      if (this.insertData) {
        const createdRows = this.insertData.map((item) => ({
          id: item.id || `mock-${Date.now()}`,
          created_at: new Date().toISOString(),
          ...item,
        }));
        rows.push(...createdRows);
        memoryStore.set(this.table, rows);
        return {
          data: createdRows.length === 1 ? createdRows[0] : createdRows,
          error: null,
        };
      }
      return { data: rows, error: null };
    }

    async single() {
      const res = this.execute();
      const item = Array.isArray(res.data) ? res.data[0] : res.data;
      return { data: item, error: null };
    }
  }

  return {
    supabase: {
      from(table: string) {
        return new MockQueryBuilder(table);
      },
    },
  };
});

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
