import { describe, expect, it } from "vitest";
import type { Worker } from "@shared/workers";
import { filterWorkers } from "./search";

const testWorkers: Worker[] = [
  {
    id: "arun",
    name: "Arun",
    phone: "9876543210",
    category: "Painter",
    locality: "Pondicherry",
    experience: "4 years",
    initials: "A",
    tone: "bg-[#f5f6f4]",
    about: "Painter",
    services: ["Wall painting"],
  },
  {
    id: "ravi-kumar",
    name: "Ravi Kumar",
    phone: "9876543211",
    category: "Electrician",
    locality: "Villupuram",
    experience: "6 years",
    initials: "RK",
    tone: "bg-[#f5f6f4]",
    about: "Electrician",
    services: ["House wiring"],
  },
  {
    id: "suresh",
    name: "Suresh",
    phone: "9876543212",
    category: "Electrician",
    locality: "Cuddalore",
    experience: "8 years",
    initials: "S",
    tone: "bg-[#f5f6f4]",
    about: "Electrician",
    services: ["Wiring", "Inverter setup"],
  },
  {
    id: "mani",
    name: "Mani",
    phone: "9876543213",
    category: "Painter",
    locality: "Cuddalore",
    experience: "10 years",
    initials: "M",
    tone: "bg-[#f5f6f4]",
    about: "Painter",
    services: ["Interior painting"],
  },
  {
    id: "selvam",
    name: "Selvam",
    phone: "9876543214",
    category: "Plumber",
    locality: "Cuddalore",
    experience: "5 years",
    initials: "S",
    tone: "bg-[#f5f6f4]",
    about: "Plumber",
    services: ["Pipe fitting"],
  },
  {
    id: "meena",
    name: "Meena",
    phone: "9876543215",
    category: "Housekeeper",
    locality: "Cuddalore",
    experience: "3 years",
    initials: "M",
    tone: "bg-[#f5f6f4]",
    about: "Housekeeping",
    services: ["Deep cleaning"],
  },
];

const registeredWorker: Worker = {
  id: "registered-solar-electrician",
  phone: "9876543216",
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
    const results = filterWorkers(testWorkers, "painter", "");

    expect(results.map((worker) => worker.id)).toEqual(["arun", "mani"]);
  });

  it("keeps service-only search matching worker services", () => {
    const results = filterWorkers(testWorkers, "wiring", "");

    expect(results.map((worker) => worker.id)).toEqual([
      "ravi-kumar",
      "suresh",
    ]);
  });

  it("filters by service and location when both are provided", () => {
    const results = filterWorkers(testWorkers, "Painter", "Cuddalore");

    expect(results.map((worker) => worker.id)).toEqual(["mani"]);
  });

  it("filters by location only when service is empty", () => {
    const results = filterWorkers(testWorkers, "", "Cuddalore");

    expect(results.map((worker) => worker.id)).toEqual([
      "suresh",
      "mani",
      "selvam",
      "meena",
    ]);
  });

  it("matches locations case-insensitively", () => {
    const results = filterWorkers(testWorkers, "", "cUdDaLoRe");

    expect(results.map((worker) => worker.id)).toEqual([
      "suresh",
      "mani",
      "selvam",
      "meena",
    ]);
  });

  it("matches partial locations", () => {
    const results = filterWorkers(testWorkers, "", "Cudd");

    expect(results.map((worker) => worker.id)).toEqual([
      "suresh",
      "mani",
      "selvam",
      "meena",
    ]);
  });

  it("keeps partial offered service matching with a location filter", () => {
    const results = filterWorkers(testWorkers, "wiring", "Cudd");

    expect(results.map((worker) => worker.id)).toEqual(["suresh"]);
  });

  it("includes registered workers in location searches", () => {
    const results = filterWorkers(
      [...testWorkers, registeredWorker],
      "",
      "port",
    );

    expect(results.map((worker) => worker.id)).toEqual([
      "registered-solar-electrician",
    ]);
  });

  it("includes registered workers in service and location searches", () => {
    const results = filterWorkers(
      [...testWorkers, registeredWorker],
      "solar",
      "Cuddalore",
    );

    expect(results.map((worker) => worker.id)).toEqual([
      "registered-solar-electrician",
    ]);
  });

  it("returns all workers when search values are empty", () => {
    expect(filterWorkers(testWorkers, " ", " ")).toHaveLength(
      testWorkers.length,
    );
  });
});
