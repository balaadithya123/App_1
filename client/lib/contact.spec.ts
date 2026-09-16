import { describe, expect, it } from "vitest";
import { getWorkerContactHref } from "./contact";

describe("worker contact actions", () => {
  it("uses the selected worker's phone number for a tel action", () => {
    const worker = {
      id: "ravi-kumar",
      phone: "+1-555-0101",
      name: "Ravi Kumar",
      category: "Electrician",
      locality: "Villupuram",
      experience: "6 years",
      initials: "RK",
      tone: "bg-[#f5f6f4]",
      about: "Electrician",
      services: ["House wiring"],
    };

    expect(worker).toBeDefined();
    expect(worker.phone).toBe("+1-555-0101");
    expect(getWorkerContactHref(worker)).toBe("tel:+15550101");
  });

  it("strips phone formatting before creating the tel href", () => {
    expect(getWorkerContactHref({ phone: " +1 (555) 0101 " })).toBe(
      "tel:+15550101",
    );
  });
});
