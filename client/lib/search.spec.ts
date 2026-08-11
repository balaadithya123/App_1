import { describe, expect, it } from "vitest";
import { workers } from "@/data/workers";
import type { Worker } from "@/data/workers";
import { filterWorkers } from "./search";

const registeredWorker: Worker = {
  id: "registered-solar-electrician",
  phone: "+1-555-0199",
  name: "Anika Rao",
  category: "Electrician",
  locality: "Cuddalore Port",
  experience: "5 years",
  initials: "AR",
  tone: "bg-[#f5f6f4]",
  about: "Careful electrician helping homes with wiring and repairs.",
  services: ["Solar panel wiring", "Fan repair"],
};

describe("filterWorkers", () => {
  it("filters by service category case-insensitively", () => {
    const results = filterWorkers(workers, "painter", "");

    expect(results.map((worker) => worker.id)).toEqual(["arun", "mani"]);
  });

  it("keeps service-only search matching worker services", () => {
    const results = filterWorkers(workers, "wiring", "");

    expect(results.map((worker) => worker.id)).toEqual(["ravi-kumar", "suresh"]);
  });

  it("filters by service and location when both are provided", () => {
    const results = filterWorkers(workers, "Painter", "Cuddalore");

    expect(results.map((worker) => worker.id)).toEqual(["mani"]);
  });

  it("filters by location only when service is empty", () => {
    const results = filterWorkers(workers, "", "Cuddalore");

    expect(results.map((worker) => worker.id)).toEqual([
      "suresh",
      "mani",
      "selvam",
      "meena",
    ]);
  });

  it("matches locations case-insensitively", () => {
    const results = filterWorkers(workers, "", "cUdDaLoRe");

    expect(results.map((worker) => worker.id)).toEqual([
      "suresh",
      "mani",
      "selvam",
      "meena",
    ]);
  });

  it("matches partial locations", () => {
    const results = filterWorkers(workers, "", "Cudd");

    expect(results.map((worker) => worker.id)).toEqual([
      "suresh",
      "mani",
      "selvam",
      "meena",
    ]);
  });

  it("keeps partial offered service matching with a location filter", () => {
    const results = filterWorkers(workers, "wiring", "Cudd");

    expect(results.map((worker) => worker.id)).toEqual(["suresh"]);
  });

  it("includes registered workers in location searches", () => {
    const results = filterWorkers([...workers, registeredWorker], "", "port");

    expect(results.map((worker) => worker.id)).toEqual(["registered-solar-electrician"]);
  });

  it("includes registered workers in service and location searches", () => {
    const results = filterWorkers([...workers, registeredWorker], "solar", "Cuddalore");

    expect(results.map((worker) => worker.id)).toEqual(["registered-solar-electrician"]);
  });

  it("returns all workers when search values are empty", () => {
    expect(filterWorkers(workers, " ", " ")).toHaveLength(workers.length);
  });
});
