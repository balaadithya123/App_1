import { describe, expect, it } from "vitest";
import { staticWorkers } from "../../shared/workers";
import { filterWorkers } from "../../client/lib/search";
import { findWorkerById } from "../../client/lib/workers";
import { createWorker, createWorkerId, workerRegistrationSchema } from "./workers";

const registration = {
  fullName: "Anika Rao",
  phone: "9876543210",
  category: "Electrician",
  location: "Cuddalore",
  experience: "5 years",
  services: "Solar panel wiring, Fan repair",
  about: "Careful electrician helping homes with wiring and repairs.",
};

describe("worker registration flow", () => {
  it("creates a complete worker record with correct initial values", () => {
    const parsed = workerRegistrationSchema.parse(registration);
    const worker = createWorker(parsed, staticWorkers);

    expect(worker).toMatchObject({
      id: "9876543210",
      name: "Anika Rao",
      phone: "9876543210",
      category: "Electrician",
      locality: "Cuddalore",
      experience: "5 years",
      initials: "AR",
      tone: "bg-[#f5f6f4]",
      about: "Careful electrician helping homes with wiring and repairs.",
      services: ["Solar panel wiring", "Fan repair"],
      available_today: false,
      urgent_today: false,
    });
  });

  it("rejects missing required worker registration fields", () => {
    const result = workerRegistrationSchema.safeParse({
      ...registration,
      fullName: "",
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.fullName).toContain("Full name is required");
  });

  it("rejects invalid worker phone numbers", () => {
    const result = workerRegistrationSchema.safeParse({
      ...registration,
      phone: "123",
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.phone).toContain("Phone number must be exactly 10 digits");
  });

  it("includes created worker in search results", () => {
    const worker = createWorker(workerRegistrationSchema.parse(registration), staticWorkers);
    const allWorkers = [...staticWorkers, worker];
    const results = filterWorkers(allWorkers, "solar", "cuddalore");

    expect(results.map((w) => w.id)).toContain("9876543210");
  });

  it("can look up a worker by id", () => {
    const worker = createWorker(workerRegistrationSchema.parse(registration), staticWorkers);
    const profileWorker = findWorkerById([worker], "9876543210");

    expect(profileWorker).toMatchObject({
      id: "9876543210",
      name: "Anika Rao",
      phone: "9876543210",
    });
  });

  it("returns no worker for an invalid or missing worker profile id", () => {
    expect(findWorkerById(staticWorkers, "does-not-exist")).toBeUndefined();
    expect(findWorkerById(staticWorkers, "   ")).toBeUndefined();
    expect(findWorkerById(staticWorkers, null)).toBeUndefined();
  });

  it("uses a submitted URL-safe id when provided and avoids duplicate ids", () => {
    const requested = workerRegistrationSchema.parse({
      ...registration,
      id: "My Custom ID!",
    });
    const firstWorker = createWorker(requested, staticWorkers);
    expect(firstWorker.id).toBe("my-custom-id");

    const secondWorker = createWorker(requested, [...staticWorkers, firstWorker]);
    expect(secondWorker.id).toBe("my-custom-id-2");
  });

  it("generates unique ids using createWorkerId helper", () => {
    const id1 = createWorkerId("Ravi Kumar", []);
    expect(id1).toBe("ravi-kumar");

    const id2 = createWorkerId("Ravi Kumar", [{ id: "ravi-kumar" } as any]);
    expect(id2).toBe("ravi-kumar-2");
  });
});
