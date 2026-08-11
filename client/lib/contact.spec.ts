import { describe, expect, it } from "vitest";
import { workers } from "@/data/workers";
import { getWorkerContactHref } from "./contact";

describe("worker contact actions", () => {
  it("uses the selected worker's phone number for a tel action", () => {
    const worker = workers.find((item) => item.id === "ravi-kumar");

    expect(worker).toBeDefined();
    expect(worker?.phone).toBe("+1-555-0101");
    expect(worker && getWorkerContactHref(worker)).toBe("tel:+15550101");
  });

  it("strips phone formatting before creating the tel href", () => {
    expect(getWorkerContactHref({ phone: " +1 (555) 0101 " })).toBe(
      "tel:+15550101",
    );
  });
});
