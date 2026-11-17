import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { BadgeCheck, Check, MapPin, MessageCircle, Share2, Truck } from "lucide-react";
import PageShell from "@/components/PageShell";
import { SupplierDetailSkeleton } from "@/components/PageSkeletons";
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
  "w-full rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-3.5 py-2.5 text-sm text-[#141210] dark:text-[#FAFAFA] outline-none transition focus:border-[#F4512C]";

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
        <SupplierDetailSkeleton />
      </PageShell>
    );
  }

  if (failed || !supplier) {
    return (
      <PageShell backTo="/materials" backLabel="Materials" containerWidth="md">
        <div className="space-y-3 rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] py-14 px-6 text-center shadow-sm">
          <p className="text-sm text-[#6B645F] dark:text-[#9E958F]">
            {failed ? "Couldn't load this supplier. Please try again." : "This supplier isn't listed or isn't verified yet."}
          </p>
          <Link to="/materials" className="inline-block rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-4 py-2 text-xs font-bold text-[#141210] dark:text-[#FAFAFA] hover:border-[#F4512C]/50 transition">
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
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] text-[#141210] dark:text-[#FAFAFA] transition hover:border-[#F4512C]/50 cursor-pointer"
        >
          <Share2 size={15} />
        </button>
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-6 pb-28"
      >
        <header className="rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-gradient-to-br from-[#FFF4EF] via-[#FAF8F5] to-[#F5EAE2] dark:from-[#261B16] dark:via-[#1C1512] dark:to-[#15110F] p-5 sm:p-6 shadow-sm">
          <div className="flex items-start gap-3.5">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${tone}`}>
              <Icon size={26} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#141210] dark:text-[#FAFAFA]">{supplier.name}</h1>
                <BadgeCheck size={18} className="shrink-0 text-[#0F8A73]" aria-label="Verified" />
              </div>
              <p className="text-sm font-medium text-[#F4512C]">{supplier.category}</p>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#6B645F] dark:text-[#9E958F]">
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
          </div>
          {supplier.description && (
            <p className="mt-3 pt-3 border-t border-[#EAE2DC] dark:border-white/10 text-sm text-[#6B645F] dark:text-[#9E958F]">{supplier.description}</p>
          )}
        </header>

        <section aria-labelledby="products-heading" className="space-y-2.5">
          <div>
            <h2 id="products-heading" className="text-base font-extrabold text-[#141210] dark:text-[#FAFAFA]">
              Price list
            </h2>
            <p className="text-xs text-[#6B645F] dark:text-[#9E958F]">Select what you need to build one quote.</p>
          </div>
          {products.length === 0 ? (
            <p className="rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-6 text-center text-sm text-[#6B645F] dark:text-[#9E958F]">
              No products listed yet.
            </p>
          ) : (
            <ul className="divide-y divide-[#EAE2DC] dark:divide-white/10 overflow-hidden rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] shadow-sm">
              {products.map((p) => {
                const isOn = p.id in selected;
                const price = formatPrice(p);
                const age = daysSince(p.price_updated_at);
                return (
                  <li key={p.id} className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={isOn}
                        aria-label={`Select ${p.name}`}
                        onClick={() => toggle(p.id)}
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition cursor-pointer ${
                          isOn
                            ? "border-[#F4512C] bg-[#F4512C] text-white"
                            : "border-[#EAE2DC] dark:border-white/20 bg-[#FAF8F5] dark:bg-[#0B0A09]"
                        }`}
                      >
                        {isOn && <Check size={14} />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#141210] dark:text-[#FAFAFA]">{p.name}</p>
                        <p className="text-xs text-[#6B645F] dark:text-[#9E958F]">
                          {price ? `from ${price}` : "Ask for price"}
                          {price &&
                            (isPriceStale(p.price_updated_at) ? (
                              <span className="ml-1 text-[#F4512C]">· may be outdated</span>
                            ) : (
                              <span className="ml-1">· updated {age === 0 ? "today" : `${age}d ago`}</span>
                            ))}
                        </p>
                      </div>
                      {isOn && (
                        <input
                          autoFocus
                          className="w-24 rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-3 py-2 text-sm text-[#141210] dark:text-[#FAFAFA] outline-none focus:border-[#F4512C]"
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

        <section aria-labelledby="quote-heading" className="space-y-3 rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 shadow-sm">
          <h2 id="quote-heading" className="text-base font-extrabold text-[#141210] dark:text-[#FAFAFA]">
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
          {quoteHelp && <p className="text-xs text-[#6B645F] dark:text-[#9E958F]">{quoteHelp}</p>}
          <button
            type="button"
            onClick={() => void sendQuote()}
            disabled={!canSend || sending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0F8A73] hover:bg-[#0B6E5B] px-4 py-3 text-sm font-bold text-white shadow-sm transition disabled:opacity-50 cursor-pointer"
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
              className="block text-center text-xs font-semibold text-[#6B645F] dark:text-[#9E958F] underline-offset-2 hover:text-[#141210] dark:hover:text-[#FAFAFA] hover:underline"
            >
              Or just message {contact.person_name}
            </a>
          )}
        </section>

        <p className="px-1 text-[11px] text-[#6B645F] dark:text-[#9E958F]">
          Prices are indicative and set by suppliers. Confirm the final price and delivery on WhatsApp.
        </p>
      </motion.div>
    </PageShell>
  );
}
