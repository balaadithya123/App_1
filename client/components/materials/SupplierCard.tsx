import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BadgeCheck, ChevronRight, MapPin, Truck } from "lucide-react";
import { getCategoryMeta } from "./categoryMeta";
import {
  formatPrice,
  isPriceStale,
  latestPriceUpdate,
  type Supplier,
} from "@/lib/materials";

const PREVIEW_COUNT = 3;

export default function SupplierCard({ supplier, index }: { supplier: Supplier; index: number }) {
  const { icon: Icon, tone } = getCategoryMeta(supplier.category);
  const products = supplier.supplier_products ?? [];
  const place = [supplier.area, supplier.city].filter(Boolean).join(", ");
  const latest = latestPriceUpdate(products);
  const stale = latest ? isPriceStale(latest) : false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index, 8) * 0.04 }}
    >
      <Link
        to={`/materials/${supplier.id}`}
        className="group block space-y-3 rounded-2xl border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] p-4 shadow-2xs transition-all hover:border-neutral-500 hover:shadow-xs active:scale-[0.99]"
      >
        <div className="flex items-start gap-3">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}>
            <Icon size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate text-base font-semibold">{supplier.name}</h3>
              <BadgeCheck size={15} className="shrink-0 text-emerald-600 dark:text-emerald-400" aria-label="Verified" />
            </div>
            <p className="text-xs text-[#71717A] dark:text-[#A1A1AA]">{supplier.category}</p>
          </div>
          <ChevronRight size={18} className="mt-1 shrink-0 text-[#71717A] transition-transform group-hover:translate-x-0.5" />
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#52525B] dark:text-[#A1A1AA]">
          {place && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} /> {place}
            </span>
          )}
          {supplier.delivery_radius_km ? (
            <span className="inline-flex items-center gap-1">
              <Truck size={12} /> up to {supplier.delivery_radius_km} km
            </span>
          ) : null}
        </div>

        {products.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {products.slice(0, PREVIEW_COUNT).map((p) => {
              const price = formatPrice(p);
              return (
                <span
                  key={p.id}
                  className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-[#3F3F46] dark:bg-white/5 dark:text-[#D4D4D8]"
                >
                  {p.name}
                  {price ? ` · ${price}` : ""}
                </span>
              );
            })}
            {products.length > PREVIEW_COUNT && (
              <span className="rounded-full px-2 py-1 text-[11px] font-medium text-[#71717A]">
                +{products.length - PREVIEW_COUNT} more
              </span>
            )}
          </div>
        )}

        {stale && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400">Prices may be outdated</p>
        )}
      </Link>
    </motion.div>
  );
}
