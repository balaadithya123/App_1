import { afterEach, describe, expect, it } from "vitest";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { staticWorkers, type Worker } from "../../shared/workers";
import { filterWorkers } from "../../client/lib/search";
import { findWorkerById } from "../../client/lib/workers";
import { readRegisteredWorkers, saveRegisteredWorker } from "../lib/registered-workers";
import { createWorker, getAllWorkers, workerRegistrationSchema } from "./workers";

const registeredWorkersFile = path.join(process.cwd(), "data", "registered-workers.json");

const registration = {
  fullName: "Anika Rao",
  phone: "+1-555-0199",
  category: "Electrician",
  location: "Cuddalore",
  experience: "5 years",
  services: "Solar panel wiring, Fan repair",
  about: "Careful electrician helping homes with wiring and repairs.",
};

afterEach(async () => {
  await rm(registeredWorkersFile, { force: true });
});

describe("worker registration flow", () => {
  it("persists a complete worker record with a stable URL-safe id", async () => {
    const parsed = workerRegistrationSchema.parse(registration);
    const worker = createWorker(parsed, staticWorkers);

    await saveRegisteredWorker(worker);

    const persistedWorkers = JSON.parse(await readFile(registeredWorkersFile, "utf8")) as Worker[];

    expect(worker).toEqual({
      id: "anika-rao",
      name: "Anika Rao",
      phone: "+1-555-0199",
      category: "Electrician",
      locality: "Cuddalore",
      experience: "5 years",
      initials: "AR",
      tone: "bg-[#f5f6f4]",
      about: "Careful electrician helping homes with wiring and repairs.",
      services: ["Solar panel wiring", "Fan repair"],
    });
    expect(persistedWorkers).toEqual([worker]);
  });

  it("keeps demo workers and includes registered workers in search results", async () => {
    const worker = createWorker(workerRegistrationSchema.parse(registration), staticWorkers);
    await saveRegisteredWorker(worker);

    const allWorkers = await getAllWorkers();
    const results = filterWorkers(allWorkers, "solar", "cuddalore");

    expect(allWorkers.slice(0, staticWorkers.length)).toEqual(staticWorkers);
    expect(results.map((worker) => worker.id)).toContain("anika-rao");
  });

  it("can look up a registered worker for the existing profile route", async () => {
    const worker = createWorker(workerRegistrationSchema.parse(registration), staticWorkers);
    await saveRegisteredWorker(worker);

    const allWorkers = await getAllWorkers();
    const profileWorker = findWorkerById(allWorkers, "anika-rao");

    expect(profileWorker).toMatchObject({
      id: "anika-rao",
      name: "Anika Rao",
      phone: "+1-555-0199",
    });
  });

  it("uses a submitted URL-safe id when provided and avoids duplicate ids", async () => {
    const requested = workerRegistrationSchema.parse({
      ...registration,
      id: "My Custom ID!",
    });
    const firstWorker = createWorker(requested, staticWorkers);
    await saveRegisteredWorker(firstWorker);

    const secondWorker = createWorker(requested, await getAllWorkers());
    await saveRegisteredWorker(secondWorker);

    expect((await readRegisteredWorkers()).map((worker) => worker.id)).toEqual([
      "my-custom-id",
      "my-custom-id-2",
    ]);
  });
});
