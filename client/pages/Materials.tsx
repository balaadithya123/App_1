import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, RotateCcw, Store, Truck } from "lucide-react";
import PageShell from "@/components/PageShell";
import SupplierCard from "@/components/materials/SupplierCard";
import SupplierSkeleton from "@/components/materials/SupplierSkeleton";
import { getCategoryMeta } from "@/components/materials/categoryMeta";
import { supabase } from "@/lib/supabase";
import {
  MATERIAL_CATEGORIES,
  filterSuppliers,
  isValidPincode,
  loadSavedPincode,
  savePincode,
  type Supplier,
} from "@/lib/materials";

// The catalogue tables are not in the generated Supabase types.
const db = supabase as any;

const inputClass =
  "w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0D0D10] px-3 py-2.5 text-sm outline-none transition focus:border-neutral-500";

export default function Materials() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [category, setCategory] = useState("All");
  const [place, setPlace] = useState("");
  const [pincode, setPincode] = useState(() => loadSavedPincode());

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setFailed(false);
    const load = async () => {
      try {
        const { data, error } = await db
          .from("suppliers")
          .select(
            "id,name,category,description,area,city,delivery_radius_km,service_pincodes,supplier_contacts(id,person_name,role,whatsapp),supplier_products(id,name,unit,indicative_price,price_updated_at)",
          )
          .eq("is_verified", true)
          .order("name");
        if (error) throw error;
        if (mounted) setSuppliers((data ?? []) as Supplier[]);
      } catch (err) {
        console.warn("[Materials] Unable to load suppliers:", err);
        if (mounted) setFailed(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    savePincode(pincode);
  }, [pincode]);

  const visible = useMemo(
    () => filterSuppliers(suppliers, { category, place, pincode }),
    [suppliers, category, place, pincode],
  );

  // Counts reflect the location and pincode filters, so a chip never promises
  // suppliers that the other filters would hide.
  const counts = useMemo(() => {
    const base = filterSuppliers(suppliers, { category: "All", place, pincode });
    const byCategory: Record<string, number> = { All: base.length };
    for (const s of base) byCategory[s.category] = (byCategory[s.category] ?? 0) + 1;
    return byCategory;
  }, [suppliers, place, pincode]);

  const hasFilters = category !== "All" || place.trim() !== "" || pincode !== "";
  const chips = ["All", ...MATERIAL_CATEGORIES];

  const clearFilters = () => {
    setCategory("All");
    setPlace("");
    setPincode("");
  };

  return (
    <PageShell backTo="/home" backLabel="Home" containerWidth="lg">
      <div className="space-y-5 pb-24">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Materials & Suppliers</h1>
          <p className="mt-0.5 text-sm text-[#71717A] dark:text-[#A1A1AA]">
            Compare verified suppliers and get quotes on WhatsApp
          </p>
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="tablist" aria-label="Material categories">
          {chips.map((c) => {
            const active = category === c;
            const count = counts[c] ?? 0;
            const meta = c === "All" ? null : getCategoryMeta(c);
            const Icon = meta?.icon;
            return (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCategory(c)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition ${
                  active
                    ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                    : "border-neutral-200 bg-white text-[#52525B] hover:bg-neutral-100 dark:border-neutral-800 dark:bg-[#141416] dark:text-[#A1A1AA] dark:hover:bg-[#1E1F24]"
                }`}
              >
                {Icon && <Icon size={13} />}
                <span>{c}</span>
                {!loading && !failed && (
                  <span className={`text-[10px] ${active ? "opacity-70" : "text-[#A1A1AA]"}`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div className="relative">
            <MapPin size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
            <input
              className={`${inputClass} pl-9`}
              placeholder="City or area"
              aria-label="City or area"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
            />
          </div>
          <div className="relative">
            <Truck size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
            <input
              className={`${inputClass} pl-9`}
              inputMode="numeric"
              maxLength={6}
              placeholder="Delivery pincode"
              aria-label="Delivery pincode"
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
            />
          </div>
        </div>
        {pincode !== "" && !isValidPincode(pincode) && (
          <p className="-mt-3 text-xs text-[#71717A]">Enter all 6 digits to filter by delivery area.</p>
        )}

        {!loading && !failed && (
          <div className="flex items-center justify-between text-xs text-[#71717A]">
            <span aria-live="polite">
              {visible.length} {visible.length === 1 ? "supplier" : "suppliers"}
            </span>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 font-semibold text-[#09090B] dark:text-[#FAFAFA]"
              >
                <RotateCcw size={12} /> Clear filters
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2" aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <SupplierSkeleton key={i} />
            ))}
          </div>
        ) : failed ? (
          <div className="space-y-3 rounded-2xl border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] p-8 text-center">
            <p className="text-sm text-[#71717A]">Couldn't load suppliers. Check your connection and try again.</p>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="rounded-full border border-neutral-300 px-4 py-2 text-xs font-semibold transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-[#1E1F24]"
            >
              Try again
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="space-y-3 rounded-2xl border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] p-8 text-center">
            <p className="text-sm text-[#71717A]">
              {suppliers.length === 0
                ? "No verified suppliers are listed yet."
                : "No suppliers match these filters."}
            </p>
            {hasFilters && suppliers.length > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-full border border-neutral-300 px-4 py-2 text-xs font-semibold transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-[#1E1F24]"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {visible.map((s, i) => (
              <SupplierCard key={s.id} supplier={s} index={i} />
            ))}
          </div>
        )}

        <Link
          to="/register-supplier"
          className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 p-4 text-sm font-semibold transition hover:bg-neutral-100 dark:hover:bg-[#1E1F24]"
        >
          <Store size={16} />
          <span>Sell materials? List your business</span>
        </Link>

        <p className="px-1 text-[11px] text-[#71717A]">
          Prices are indicative and set by suppliers. Confirm the final price and delivery on WhatsApp.
        </p>
      </div>
    </PageShell>
  );
}
