import { describe, expect, it } from "vitest";
import {
  filterSuppliers,
  isPriceStale,
  supplierCoversPincode,
  toWhatsappNumber,
  type Supplier,
} from "./materials";

const base: Supplier = {
  id: "1",
  name: "A",
  category: "Sand",
  description: null,
  area: "Guindy",
  city: "Chennai",
  delivery_radius_km: 20,
  service_pincodes: ["600032"],
  supplier_contacts: [],
  supplier_products: [],
};

describe("materials helpers", () => {
  it("adds the India country code to 10 digit numbers", () => {
    expect(toWhatsappNumber("98765 43210")).toBe("919876543210");
    expect(toWhatsappNumber("+91 98765 43210")).toBe("919876543210");
  });

  it("treats missing or old price dates as stale", () => {
    const now = new Date("2026-10-13").getTime();
    expect(isPriceStale(null, now)).toBe(true);
    expect(isPriceStale("2026-10-01", now)).toBe(false);
    expect(isPriceStale("2026-09-01", now)).toBe(true);
  });

  it("matches pincodes exactly or by postal district, and ignores incomplete pincodes", () => {
    expect(supplierCoversPincode(base, "600032")).toBe(true);
    expect(supplierCoversPincode(base, "600099")).toBe(true);
    expect(supplierCoversPincode(base, "605602")).toBe(false);
    expect(supplierCoversPincode(base, "6006")).toBe(true);
    expect(supplierCoversPincode({ service_pincodes: [] }, "605602")).toBe(true);
  });

  it("filters by category, place and pincode together", () => {
    const other: Supplier = { ...base, id: "2", category: "Cement", city: "Villupuram", area: null, service_pincodes: ["605602"] };
    const all = [base, other];
    expect(filterSuppliers(all, { category: "All", place: "", pincode: "" })).toHaveLength(2);
    expect(filterSuppliers(all, { category: "Cement", place: "", pincode: "" })).toEqual([other]);
    expect(filterSuppliers(all, { category: "All", place: "guindy", pincode: "" })).toEqual([base]);
    expect(filterSuppliers(all, { category: "All", place: "", pincode: "605602" })).toEqual([other]);
  });
});
