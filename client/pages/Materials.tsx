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
import { useLanguage } from "@/lib/i18n";

// The catalogue tables are not in the generated Supabase types.
const db = supabase as any;

const inputClass =
  "w-full rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] px-3.5 py-2.5 text-sm text-[#141210] dark:text-[#FAFAFA] outline-none transition focus:border-[#F4512C]";

export default function Materials() {
  const { t } = useLanguage();
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
    <PageShell backTo="/home" backLabel={t("nav.home")} containerWidth="lg">
      <div className="space-y-6 pb-24">
        <section className="rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-gradient-to-br from-[#FFF4EF] via-[#FAF8F5] to-[#F5EAE2] dark:from-[#261B16] dark:via-[#1C1512] dark:to-[#15110F] p-6 sm:p-7 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#F4512C]">
            {t("materials.eyebrow")}
          </span>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#141210] dark:text-[#FAFAFA]">
            {t("materials.title")}
          </h1>
          <p className="mt-1.5 text-sm text-[#6B645F] dark:text-[#9E958F]">
            {t("materials.sub")}
          </p>
        </section>

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
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                  active
                    ? "border-[#F4512C] bg-[#F4512C] text-white shadow-xs"
                    : "border-[#EAE2DC] bg-white text-[#6B645F] hover:border-[#F4512C]/40 hover:text-[#141210] dark:border-white/10 dark:bg-[#161514] dark:text-[#9E958F] dark:hover:text-[#FAFAFA]"
                }`}
              >
                {Icon && <Icon size={13} />}
                <span>{c}</span>
                {!loading && !failed && (
                  <span className={`text-[10px] ${active ? "opacity-85" : "text-[#6B645F] dark:text-[#9E958F]"}`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div className="relative">
            <MapPin size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B645F] dark:text-[#9E958F]" />
            <input
              className={`${inputClass} pl-9`}
              placeholder={t("materials.cityPlaceholder")}
              aria-label={t("materials.cityPlaceholder")}
              value={place}
              onChange={(e) => setPlace(e.target.value)}
            />
          </div>
          <div className="relative">
            <Truck size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B645F] dark:text-[#9E958F]" />
            <input
              className={`${inputClass} pl-9`}
              inputMode="numeric"
              maxLength={6}
              placeholder={t("materials.pincodePlaceholder")}
              aria-label={t("materials.pincodePlaceholder")}
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
            />
          </div>
        </div>
        {pincode !== "" && !isValidPincode(pincode) && (
          <p className="-mt-3 text-xs text-[#6B645F] dark:text-[#9E958F]">Enter all 6 digits to filter by delivery area.</p>
        )}

        {!loading && !failed && (
          <div className="flex items-center justify-between text-xs text-[#6B645F] dark:text-[#9E958F]">
            <span aria-live="polite" className="font-semibold">
              {visible.length} {visible.length === 1 ? "supplier" : "suppliers"}
            </span>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 font-bold text-[#F4512C] hover:underline cursor-pointer"
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
          <div className="space-y-3 rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-8 text-center shadow-sm">
            <p className="text-sm text-[#6B645F] dark:text-[#9E958F]">Couldn't load suppliers. Check your connection and try again.</p>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-4 py-2 text-xs font-bold text-[#141210] dark:text-[#FAFAFA] hover:border-[#F4512C]/50 transition cursor-pointer"
            >
              Try again
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="space-y-3 rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-8 text-center shadow-sm">
            <p className="text-sm text-[#6B645F] dark:text-[#9E958F]">
              {suppliers.length === 0
                ? "No verified suppliers are listed yet."
                : "No suppliers match these filters."}
            </p>
            {hasFilters && suppliers.length > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-4 py-2 text-xs font-bold text-[#141210] dark:text-[#FAFAFA] hover:border-[#F4512C]/50 transition cursor-pointer"
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
          className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-[#EAE2DC] dark:border-white/15 bg-white/70 dark:bg-[#161514]/70 p-4 text-sm font-bold text-[#141210] dark:text-[#FAFAFA] transition hover:border-[#F4512C]/50 hover:bg-[#FFF4EF]/60 dark:hover:bg-[#261B16]/40"
        >
          <Store size={16} className="text-[#F4512C]" />
          <span>Sell materials? List your business</span>
        </Link>

        <p className="px-1 text-[11px] text-[#6B645F] dark:text-[#9E958F]">
          Prices are indicative and set by suppliers. Confirm the final price and delivery on WhatsApp.
        </p>
      </div>
    </PageShell>
  );
}
