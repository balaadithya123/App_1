import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { BadgeCheck, Check, MapPin, MessageCircle, Share2, Truck } from "lucide-react";
import PageShell from "@/components/PageShell";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategoryMeta } from "@/components/materials/categoryMeta";
import { supabase } from "@/lib/supabase";
import {
  buildQuoteMessage,
  daysSince,
  formatPrice,
  isPriceStale,
  isValidPincode,
  loadSavedPincode,
  savePincode,
  toWhatsappNumber,
  type Supplier,
} from "@/lib/materials";

// The catalogue tables are not in the generated Supabase types.
const db = supabase as any;

const inputClass =
  "w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0D0D10] px-3 py-2.5 text-sm outline-none transition focus:border-neutral-500";

export default function SupplierProfile() {
  const { id } = useParams<{ id: string }>();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  // productId -> quantity text; presence of the key means the product is selected.
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [contactId, setContactId] = useState("");
  const [pincode, setPincode] = useState(() => loadSavedPincode());
  const [sending, setSending] = useState(false);

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
          .eq("id", id)
          .eq("is_verified", true)
          .maybeSingle();
        if (error) throw error;
        if (!mounted) return;
        setSupplier((data ?? null) as Supplier | null);
        setContactId(data?.supplier_contacts?.[0]?.id ?? "");
      } catch (err) {
        console.warn("[SupplierProfile] Unable to load supplier:", err);
        if (mounted) setFailed(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [id]);

  const products = supplier?.supplier_products ?? [];
  const contacts = supplier?.supplier_contacts ?? [];
  const contact = contacts.find((c) => c.id === contactId) ?? contacts[0];

  const items = useMemo(
    () =>
      products
        .filter((p) => p.id in selected)
        .map((p) => ({ product: p, quantity: Number(selected[p.id]) })),
    [products, selected],
  );
  const validItems = items.filter((i) => Number.isFinite(i.quantity) && i.quantity > 0);
  const canSend = Boolean(contact) && validItems.length > 0 && validItems.length === items.length && isValidPincode(pincode);

  const toggle = (productId: string) =>
    setSelected((cur) => {
      const next = { ...cur };
      if (productId in next) delete next[productId];
      else next[productId] = "";
      return next;
    });

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: supplier?.name ?? "Supplier", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      // Share sheet dismissed or clipboard blocked; nothing to recover.
    }
  };

  const sendQuote = async () => {
    if (!supplier || !contact || !canSend) return;
    setSending(true);
    savePincode(pincode);
    try {
      await db.from("quote_requests").insert(
        validItems.map((i) => ({
          supplier_id: supplier.id,
          product_id: i.product.id,
          quantity: i.quantity,
          pincode: pincode.trim(),
        })),
      );
    } catch {
      // Logging is best-effort; never block the customer from reaching the supplier.
    }
    const message = buildQuoteMessage({
      contactName: contact.person_name,
      supplierName: supplier.name,
      items: validItems.map((i) => ({ name: i.product.name, quantity: i.quantity, unit: i.product.unit })),
      pincode,
    });
    window.open(
      `https://wa.me/${toWhatsappNumber(contact.whatsapp)}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
    setSending(false);
  };

  if (loading) {
    return (
      <PageShell backTo="/materials" backLabel="Materials" containerWidth="md">
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      </PageShell>
    );
  }

  if (failed || !supplier) {
    return (
      <PageShell backTo="/materials" backLabel="Materials" containerWidth="md">
        <div className="space-y-3 py-16 text-center">
          <p className="text-sm text-[#71717A]">
            {failed ? "Couldn't load this supplier. Please try again." : "This supplier isn't listed or isn't verified yet."}
          </p>
          <Link to="/materials" className="inline-block rounded-full border border-neutral-300 px-4 py-2 text-xs font-semibold dark:border-neutral-700">
            Back to suppliers
          </Link>
        </div>
      </PageShell>
    );
  }

  const { icon: Icon, tone } = getCategoryMeta(supplier.category);
  const place = [supplier.area, supplier.city].filter(Boolean).join(", ");
  const quoteHelp = !contact
    ? "This supplier has no WhatsApp contact listed yet."
    : validItems.length === 0
      ? "Select products and enter quantities."
      : !isValidPincode(pincode)
        ? "Enter your 6-digit delivery pincode."
        : items.length !== validItems.length
          ? "Enter a quantity for each selected product."
          : "";

  return (
    <PageShell
      backTo="/materials"
      backLabel="Materials"
      containerWidth="md"
      headerRight={
        <button
          type="button"
          onClick={() => void share()}
          aria-label="Share supplier"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 transition hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-[#1E1F24]"
        >
          <Share2 size={15} />
        </button>
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-5 pb-28"
      >
        <header className="flex items-start gap-3">
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${tone}`}>
            <Icon size={26} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xl font-bold tracking-tight">{supplier.name}</h1>
              <BadgeCheck size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400" aria-label="Verified" />
            </div>
            <p className="text-sm text-[#71717A] dark:text-[#A1A1AA]">{supplier.category}</p>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#52525B] dark:text-[#A1A1AA]">
              {place && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={12} /> {place}
                </span>
              )}
              {supplier.delivery_radius_km ? (
                <span className="inline-flex items-center gap-1">
                  <Truck size={12} /> delivers up to {supplier.delivery_radius_km} km
                </span>
              ) : null}
            </div>
          </div>
        </header>

        {supplier.description && (
          <p className="text-sm text-[#52525B] dark:text-[#A1A1AA]">{supplier.description}</p>
        )}

        <section aria-labelledby="products-heading" className="space-y-2.5">
          <div>
            <h2 id="products-heading" className="text-base font-semibold">
              Price list
            </h2>
            <p className="text-xs text-[#71717A]">Select what you need to build one quote.</p>
          </div>
          {products.length === 0 ? (
            <p className="rounded-2xl border border-[#E4E4E7] p-6 text-center text-sm text-[#71717A] dark:border-[#27272A]">
              No products listed yet.
            </p>
          ) : (
            <ul className="divide-y divide-[#E4E4E7] overflow-hidden rounded-2xl border border-[#E4E4E7] bg-white dark:divide-[#27272A] dark:border-[#27272A] dark:bg-[#141416]">
              {products.map((p) => {
                const isOn = p.id in selected;
                const price = formatPrice(p);
                const age = daysSince(p.price_updated_at);
                return (
                  <li key={p.id} className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={isOn}
                        aria-label={`Select ${p.name}`}
                        onClick={() => toggle(p.id)}
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition ${
                          isOn
                            ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                            : "border-neutral-300 dark:border-neutral-700"
                        }`}
                      >
                        {isOn && <Check size={14} />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-[#71717A] dark:text-[#A1A1AA]">
                          {price ? `from ${price}` : "Ask for price"}
                          {price &&
                            (isPriceStale(p.price_updated_at) ? (
                              <span className="ml-1 text-amber-600 dark:text-amber-400">· may be outdated</span>
                            ) : (
                              <span className="ml-1">· updated {age === 0 ? "today" : `${age}d ago`}</span>
                            ))}
                        </p>
                      </div>
                      {isOn && (
                        <input
                          autoFocus
                          className="w-24 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-800 dark:bg-[#0D0D10]"
                          inputMode="decimal"
                          placeholder={p.unit ? `Qty (${p.unit})` : "Qty"}
                          aria-label={`Quantity of ${p.name}`}
                          value={selected[p.id]}
                          onChange={(e) =>
                            setSelected((cur) => ({ ...cur, [p.id]: e.target.value.replace(/[^\d.]/g, "") }))
                          }
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="quote-heading" className="space-y-3 rounded-2xl border border-[#E4E4E7] bg-zinc-50 p-4 dark:border-[#27272A] dark:bg-[#0D0D10]">
          <h2 id="quote-heading" className="text-base font-semibold">
            Get a quote
          </h2>
          <input
            className={inputClass}
            inputMode="numeric"
            maxLength={6}
            placeholder="Delivery pincode"
            aria-label="Delivery pincode"
            value={pincode}
            onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
          />
          {contacts.length > 1 && (
            <select
              className={inputClass}
              aria-label="Who to contact"
              value={contact?.id ?? ""}
              onChange={(e) => setContactId(e.target.value)}
            >
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.person_name}
                  {c.role ? ` (${c.role})` : ""}
                </option>
              ))}
            </select>
          )}
          {quoteHelp && <p className="text-xs text-[#71717A]">{quoteHelp}</p>}
          <button
            type="button"
            onClick={() => void sendQuote()}
            disabled={!canSend || sending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
          >
            <MessageCircle size={15} />
            <span>
              Request quote on WhatsApp
              {validItems.length > 0 ? ` (${validItems.length} ${validItems.length === 1 ? "item" : "items"})` : ""}
            </span>
          </button>
          {contact && (
            <a
              href={`https://wa.me/${toWhatsappNumber(contact.whatsapp)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-xs font-semibold text-[#52525B] underline-offset-2 hover:underline dark:text-[#A1A1AA]"
            >
              Or just message {contact.person_name}
            </a>
          )}
        </section>

        <p className="px-1 text-[11px] text-[#71717A]">
          Prices are indicative and set by suppliers. Confirm the final price and delivery on WhatsApp.
        </p>
      </motion.div>
    </PageShell>
  );
}
