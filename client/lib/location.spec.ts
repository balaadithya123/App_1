import { describe, it, expect } from "vitest";
import { isLocationMatch } from "./location";

describe("isLocationMatch", () => {
  it("returns true when target locality is empty or whitespace", () => {
    expect(isLocationMatch("Coimbatore", "")).toBe(true);
    expect(isLocationMatch("Coimbatore", "   ")).toBe(true);
    expect(isLocationMatch("Coimbatore", undefined)).toBe(true);
  });

  it("returns false when worker locality is empty and target locality is provided", () => {
    expect(isLocationMatch("", "Coimbatore")).toBe(false);
    expect(isLocationMatch("   ", "Coimbatore")).toBe(false);
    expect(isLocationMatch(undefined, "Coimbatore")).toBe(false);
  });

  it("matches exact localities and substring localities case-insensitively", () => {
    expect(isLocationMatch("Coimbatore", "coimbatore")).toBe(true);
    expect(isLocationMatch("RS Puram, Coimbatore", "Coimbatore")).toBe(true);
    expect(isLocationMatch("Coimbatore", "RS Puram, Coimbatore")).toBe(true);
  });

  it("matches city aliases and synonyms correctly", () => {
    expect(isLocationMatch("Kovai", "Coimbatore")).toBe(true);
    expect(isLocationMatch("Coimbatore", "Kovai")).toBe(true);
    expect(isLocationMatch("Bangalore", "Bengaluru")).toBe(true);
    expect(isLocationMatch("Bengaluru Urban", "Bangalore")).toBe(true);
    expect(isLocationMatch("Madras", "Chennai")).toBe(true);
  });

  it("filters out stop words and matches word tokens", () => {
    expect(isLocationMatch("Near Main Road Gandhipuram", "Gandhipuram Nagar")).toBe(true);
  });

  it("returns false for non-matching distinct localities", () => {
    expect(isLocationMatch("Chennai", "Coimbatore")).toBe(false);
    expect(isLocationMatch("Madurai", "Trichy")).toBe(false);
  });
});
