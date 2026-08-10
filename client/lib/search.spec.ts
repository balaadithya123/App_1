import { describe, expect, it } from "vitest";
import { workers } from "@/data/workers";
import { filterWorkers } from "./search";

describe("filterWorkers", () => {
  it("filters by service case-insensitively", () => {
    const results = filterWorkers(workers, "painter", "");

    expect(results.map((worker) => worker.id)).toEqual(["arun", "mani"]);
  });

  it("filters by partial location case-insensitively", () => {
    const results = filterWorkers(workers, "", "chidambaram");

    expect(results.every((worker) => worker.locality === "Chidambaram")).toBe(true);
    expect(results.map((worker) => worker.id)).toEqual(["ravi-kumar", "arun", "raj", "priya"]);
  });

  it("requires both service and location to match when both are provided", () => {
    const results = filterWorkers(workers, "Painter", "chid");

    expect(results.map((worker) => worker.id)).toEqual(["arun"]);
  });

  it("returns all workers when search values are empty", () => {
    expect(filterWorkers(workers, " ", " ")).toHaveLength(workers.length);
  });
});
