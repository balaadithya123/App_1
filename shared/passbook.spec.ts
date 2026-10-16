import { describe, expect, it } from "vitest";
import {
  buildSlipShareMessage,
  percentile,
  summarizeRates,
  validateJobSlip,
  validateWorkerRate,
} from "./passbook";

const today = new Date("2026-10-15T00:00:00Z");
const validSlip = {
  service_label: "Kitchen tap repair",
  job_date: "2026-10-17",
  agreed_rate: 600,
  rate_unit: "job" as const,
  advance: 0,
};

describe("percentile", () => {
  it("interpolates between values", () => {
    expect(percentile([100, 200, 300, 400], 0.5)).toBe(250);
    expect(percentile([100, 200, 300, 400], 0.25)).toBe(175);
    expect(percentile([5], 0.9)).toBe(5);
    expect(percentile([], 0.5)).toBeNaN();
  });
});

describe("summarizeRates", () => {
  it("uses real jobs once there are enough of them", () => {
    const g = summarizeRates("job", [250, 300, 350, 400, 450], [1, 2, 3]);
    expect(g.source).toBe("jobs");
    expect(g.sample_size).toBe(5);
    expect(g.typical).toBe(350);
    expect(g.low).toBe(300);
    expect(g.high).toBe(400);
  });

  it("falls back to listed rates when jobs are too few", () => {
    const g = summarizeRates("job", [300, 320], [250, 300, 350]);
    expect(g.source).toBe("listed");
    expect(g.typical).toBe(300);
  });

  it("never presents a guide from too little data", () => {
    const g = summarizeRates("day", [500], [600, 700]);
    expect(g.source).toBe("none");
    expect(g.typical).toBeNull();
    expect(g.sample_size).toBe(2);
  });

  it("ignores invalid values", () => {
    const g = summarizeRates("job", [0, -5, NaN, 100, 200, 300, 400, 500], []);
    expect(g.source).toBe("jobs");
    expect(g.sample_size).toBe(5);
  });
});

describe("validateJobSlip", () => {
  it("accepts a normal slip", () => {
    expect(validateJobSlip(validSlip, today)).toBeNull();
  });

  it("rejects bad dates, rates and advances", () => {
    expect(validateJobSlip({ ...validSlip, job_date: "17/10/2026" }, today)).toMatch(/date/i);
    expect(validateJobSlip({ ...validSlip, job_date: "2027-03-01" }, today)).toMatch(/60 days/);
    expect(validateJobSlip({ ...validSlip, job_date: "2026-06-01" }, today)).toMatch(/60 days/);
    expect(validateJobSlip({ ...validSlip, agreed_rate: 0 }, today)).toMatch(/rate/i);
    expect(validateJobSlip({ ...validSlip, advance: -1 }, today)).toMatch(/advance/i);
    expect(validateJobSlip({ ...validSlip, service_label: " " }, today)).toMatch(/job/i);
  });
});

describe("validateWorkerRate", () => {
  it("checks range order and units", () => {
    const ok = { service_label: "Tap repair", rate_min: 200, rate_max: 400, rate_unit: "job" as const };
    expect(validateWorkerRate(ok)).toBeNull();
    expect(validateWorkerRate({ ...ok, rate_min: 500 })).toMatch(/lowest/);
    expect(validateWorkerRate({ ...ok, rate_unit: "week" as any })).toMatch(/per job/);
  });
});

describe("buildSlipShareMessage", () => {
  it("includes the advance only when there is one", () => {
    const base = {
      workerName: "Ravi",
      serviceLabel: "Tap repair",
      jobDate: "2026-10-17",
      agreedRate: 125000,
      rateUnit: "job" as const,
      url: "https://x.test/job/abc",
    };
    const without = buildSlipShareMessage({ ...base, advance: 0 });
    expect(without).toContain("₹1,25,000 per job");
    expect(without).not.toContain("Advance");
    const withAdvance = buildSlipShareMessage({ ...base, advance: 200 });
    expect(withAdvance).toContain("- Advance: ₹200");
    expect(withAdvance).toContain("https://x.test/job/abc");
  });
});
