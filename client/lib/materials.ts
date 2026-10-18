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
 * Performance Optimization:
 * - Uses an indexed for loop to avoid creating closure instances with .some().
 */
export function supplierCoversPincode(supplier: Pick<Supplier, "service_pincodes">, pincode: string): boolean {
  const pin = pincode.trim();
  if (!isValidPincode(pin)) return true;
  const served = supplier.service_pincodes;
  if (!served || served.length === 0) return true;
  const district = pin.slice(0, 3);
  for (let i = 0; i < served.length; i++) {
    const p = served[i];
    if (p === pin || p.slice(0, 3) === district) {
      return true;
    }
  }
  return false;
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
      // Performance Optimization: Fast-path individual checks on lowercased area/city
      // to avoid template string concatenation for single-field matches.
      const area = s.area ? s.area.toLowerCase() : "";
      const city = s.city ? s.city.toLowerCase() : "";
      if (!area.includes(place) && !city.includes(place)) {
        if (!area || !city || !`${area} ${city}`.includes(place)) {
          return false;
        }
      }
    }
    return supplierCoversPincode(s, filters.pincode);
  });
}

export type QuoteItem = {
  name: string;
  quantity: number;
  unit: string | null;
};

export function buildQuoteMessage(input: {
  contactName: string;
  supplierName: string;
  items: QuoteItem[];
  pincode: string;
}): string {
  const lines = input.items.map((i) => `- ${i.quantity} ${i.unit ?? "units"} of ${i.name}`);
  return [
    `Hi ${input.contactName}, I found ${input.supplierName} on Builderco.`,
    input.items.length === 1 ? "I need a quote for:" : "I need a quote for these items:",
    ...lines,
    `Delivery pincode: ${input.pincode.trim()}.`,
    "Please share your best price and delivery time.",
  ].join("\n");
}

export function formatPrice(product: Pick<SupplierProduct, "indicative_price" | "unit">): string | null {
  if (product.indicative_price == null) return null;
  const amount = new Intl.NumberFormat("en-IN").format(product.indicative_price);
  return `₹${amount}${product.unit ? ` / ${product.unit}` : ""}`;
}

/**
 * Newest price update across a supplier's products, or null when none is dated.
 * Performance Optimization:
 * - Single-pass loop avoiding dynamic array allocations (.map, .filter, .reduce)
 *   and object allocations by using primitive Date.parse() timestamp comparisons.
 */
export function latestPriceUpdate(products: SupplierProduct[]): string | null {
  let latestStr: string | null = null;
  let latestTime = -1;
  for (let i = 0; i < products.length; i++) {
    const dateStr = products[i].price_updated_at;
    if (dateStr) {
      const time = Date.parse(dateStr);
      if (!Number.isNaN(time) && time >= latestTime) {
        latestTime = time;
        latestStr = dateStr;
      }
    }
  }
  return latestStr;
}

const PINCODE_KEY = "builderco.materials.pincode";

export function loadSavedPincode(): string {
  try {
    const v = window.localStorage.getItem(PINCODE_KEY) ?? "";
    return isValidPincode(v) ? v : "";
  } catch {
    return "";
  }
}

export function savePincode(pincode: string): void {
  try {
    if (isValidPincode(pincode)) window.localStorage.setItem(PINCODE_KEY, pincode.trim());
  } catch {
    // Storage can be unavailable (private mode); remembering is only a convenience.
  }
}
