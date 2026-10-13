import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, MapPin, MessageCircle, Store } from "lucide-react";
import PageShell from "@/components/PageShell";
import { supabase } from "@/lib/supabase";
import {
  MATERIAL_CATEGORIES,
  daysSince,
  filterSuppliers,
  isPriceStale,
  isValidPincode,
  toWhatsappNumber,
  type Supplier,
  type SupplierProduct,
} from "@/lib/materials";

// The catalogue tables are not in the generated Supabase types.
const db = supabase as any;

const fieldClass =
  "w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0D0D10] px-3 py-2 text-xs outline-none focus:border-neutral-500";

function PriceLine({ product }: { product: SupplierProduct }) {
  if (product.indicative_price == null) {
    return <span className="text-xs text-[#71717A]">Ask for price</span>;
  }
  const age = daysSince(product.price_updated_at);
  return (
    <span className="text-xs text-[#52525B] dark:text-[#A1A1AA]">
      from ₹{product.indicative_price}
      {product.unit ? ` / ${product.unit}` : ""}
      {isPriceStale(product.price_updated_at) ? (
        <span className="ml-1 text-amber-600 dark:text-amber-400">· price may be outdated</span>
      ) : (
        <span className="ml-1">· updated {age === 0 ? "today" : `${age}d ago`}</span>
      )}
    </span>
  );
}

function QuoteForm({ supplier, defaultPincode }: { supplier: Supplier; defaultPincode: string }) {
  const products = supplier.supplier_products ?? [];
  const contacts = supplier.supplier_contacts ?? [];
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [contactId, setContactId] = useState(contacts[0]?.id ?? "");
  const [quantity, setQuantity] = useState("");
  const [pincode, setPincode] = useState(isValidPincode(defaultPincode) ? defaultPincode.trim() : "");
  const [sending, setSending] = useState(false);

  const product = products.find((p) => p.id === productId);
  const contact = contacts.find((c) => c.id === contactId);
  const canSend = Boolean(product && contact && Number(quantity) > 0 && isValidPincode(pincode));

  if (products.length === 0 || contacts.length === 0) {
    return (
      <p className="text-xs text-[#71717A]">
        Quotes unavailable: this supplier has no products or contacts listed yet.
      </p>
    );
  }

  const send = async () => {
    if (!product || !contact || !canSend) return;
    setSending(true);
    try {
      await db.from("quote_requests").insert({
        supplier_id: supplier.id,
        product_id: product.id,
        quantity: Number(quantity),
        pincode: pincode.trim(),
      });
    } catch {
      // Logging is best-effort; never block the customer from reaching the supplier.
    }
    const message =
      `Hi ${contact.person_name}, I found ${supplier.name} on Builderco. ` +
      `I need a quote for ${quantity} ${product.unit ?? "units"} of ${product.name}. ` +
      `Delivery pincode: ${pincode.trim()}. Please share your best price and delivery time.`;
    window.open(
      `https://wa.me/${toWhatsappNumber(contact.whatsapp)}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
    setSending(false);
  };

  return (
    <div className="space-y-2.5 rounded-xl border border-[#E4E4E7] dark:border-[#27272A] bg-zinc-50 dark:bg-[#0D0D10] p-3">
      <select className={fieldClass} value={productId} onChange={(e) => setProductId(e.target.value)}>
        {products.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-2.5">
        <input
          className={fieldClass}
          inputMode="decimal"
          placeholder={`Quantity${product?.unit ? ` (${product.unit})` : ""}`}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
        <input
          className={fieldClass}
          inputMode="numeric"
          maxLength={6}
          placeholder="Delivery pincode"
          value={pincode}
          onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
        />
      </div>
      {contacts.length > 1 && (
        <select className={fieldClass} value={contactId} onChange={(e) => setContactId(e.target.value)}>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.person_name}
              {c.role ? ` (${c.role})` : ""}
            </option>
          ))}
        </select>
      )}
      <button
        type="button"
        onClick={() => void send()}
        disabled={!canSend || sending}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-black px-4 py-2 text-xs font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
      >
        <MessageCircle size={13} />
        <span>Request quote on WhatsApp</span>
      </button>
    </div>
  );
}

function SupplierCard({ supplier, pincode }: { supplier: Supplier; pincode: string }) {
  const [quoteOpen, setQuoteOpen] = useState(false);
  const products = supplier.supplier_products ?? [];
  const place = [supplier.area, supplier.city].filter(Boolean).join(", ");

  return (
    <article className="space-y-3 rounded-2xl border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] p-4 shadow-2xs">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">{supplier.name}</h3>
          <p className="text-xs text-[#71717A] dark:text-[#A1A1AA]">
            {supplier.category}
            {place ? ` · ${place}` : ""}
            {supplier.delivery_radius_km ? ` · delivers up to ${supplier.delivery_radius_km} km` : ""}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
          Verified
        </span>
      </div>

      {supplier.description && (
        <p className="text-xs text-[#52525B] dark:text-[#A1A1AA]">{supplier.description}</p>
      )}

      {products.length > 0 && (
        <ul className="divide-y divide-[#E4E4E7] dark:divide-[#27272A] rounded-xl border border-[#E4E4E7] dark:border-[#27272A]">
          {products.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="text-sm font-medium">{p.name}</span>
              <PriceLine product={p} />
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setQuoteOpen((v) => !v)}
        className="w-full rounded-full border border-neutral-300 dark:border-neutral-700 py-2 text-xs font-semibold transition hover:bg-neutral-100 dark:hover:bg-[#1E1F24]"
      >
        {quoteOpen ? "Close" : "Get a quote"}
      </button>
      {quoteOpen && <QuoteForm supplier={supplier} defaultPincode={pincode} />}
    </article>
  );
}

export default function Materials() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [category, setCategory] = useState("All");
  const [place, setPlace] = useState("");
  const [pincode, setPincode] = useState("");

  useEffect(() => {
    let mounted = true;
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
  }, []);

  const visible = useMemo(
    () => filterSuppliers(suppliers, { category, place, pincode }),
    [suppliers, category, place, pincode],
  );

  const chips = ["All", ...MATERIAL_CATEGORIES];

  return (
    <PageShell backTo="/home" backLabel="Home" containerWidth="lg">
      <div className="space-y-5 pb-24">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Materials & Suppliers</h1>
          <p className="text-xs text-[#71717A] dark:text-[#A1A1AA]">
            Sand, stone, cement, tools & rentals from verified suppliers
          </p>
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                category === c
                  ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                  : "border-neutral-200 bg-white text-[#52525B] hover:bg-neutral-100 dark:border-neutral-800 dark:bg-[#141416] dark:text-[#A1A1AA]"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="relative">
            <MapPin size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
            <input
              className={`${fieldClass} pl-8`}
              placeholder="City or area"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
            />
          </div>
          <input
            className={fieldClass}
            inputMode="numeric"
            maxLength={6}
            placeholder="Delivery pincode"
            value={pincode}
            onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
          />
        </div>

        {loading ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : failed ? (
          <p className="rounded-2xl border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] p-8 text-center text-sm text-[#71717A]">
            Couldn't load suppliers. Please try again in a moment.
          </p>
        ) : visible.length === 0 ? (
          <p className="rounded-2xl border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] p-8 text-center text-sm text-[#71717A]">
            No verified suppliers match these filters yet.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {visible.map((s) => (
              <SupplierCard key={s.id} supplier={s} pincode={pincode} />
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
