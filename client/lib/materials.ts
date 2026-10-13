export type SupplierContact = {
  id: string;
  person_name: string;
  role: string | null;
  whatsapp: string;
};

export type SupplierProduct = {
  id: string;
  name: string;
  unit: string | null;
  indicative_price: number | null;
  price_updated_at: string | null;
};

export type Supplier = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  area: string | null;
  city: string | null;
  delivery_radius_km: number | null;
  service_pincodes: string[] | null;
  supplier_contacts: SupplierContact[] | null;
  supplier_products: SupplierProduct[] | null;
};

export const MATERIAL_CATEGORIES = [
  "Sand",
  "Stone & Aggregates",
  "Cement",
  "Bricks & Blocks",
  "Steel",
  "Tiles",
  "Tools & Rental",
  "Other",
] as const;

export const STALE_AFTER_DAYS = 14;

export function toWhatsappNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
}

export function daysSince(dateStr: string | null, now = Date.now()): number | null {
  if (!dateStr) return null;
  const t = new Date(dateStr).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((now - t) / 86_400_000);
}

export function isPriceStale(dateStr: string | null, now = Date.now()): boolean {
  const age = daysSince(dateStr, now);
  return age == null || age > STALE_AFTER_DAYS;
}

export function isValidPincode(value: string): boolean {
  return /^\d{6}$/.test(value.trim());
}

/**
 * A supplier covers a pincode when it lists that exact pincode, or lists one in
 * the same postal district (first 3 digits). Suppliers with no listed pincodes
 * are never excluded by a pincode check.
 */
export function supplierCoversPincode(supplier: Pick<Supplier, "service_pincodes">, pincode: string): boolean {
  const pin = pincode.trim();
  if (!isValidPincode(pin)) return true;
  const served = supplier.service_pincodes ?? [];
  if (served.length === 0) return true;
  return served.some((p) => p === pin || p.slice(0, 3) === pin.slice(0, 3));
}

export type SupplierFilters = {
  category: string;
  place: string;
  pincode: string;
};

export function filterSuppliers(suppliers: Supplier[], filters: SupplierFilters): Supplier[] {
  const place = filters.place.trim().toLowerCase();
  return suppliers.filter((s) => {
    if (filters.category !== "All" && s.category !== filters.category) return false;
    if (place) {
      const haystack = `${s.area ?? ""} ${s.city ?? ""}`.toLowerCase();
      if (!haystack.includes(place)) return false;
    }
    return supplierCoversPincode(s, filters.pincode);
  });
}
