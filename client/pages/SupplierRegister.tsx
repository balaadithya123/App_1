import { useState } from "react";
import { CheckCircle2, Loader2, Plus, X } from "lucide-react";
import PageShell from "@/components/PageShell";
import { supabase } from "@/lib/supabase";
import { MATERIAL_CATEGORIES, isValidPincode } from "@/lib/materials";

// The catalogue tables are not in the generated Supabase types.
const db = supabase as any;

type ProductRow = { name: string; unit: string; price: string };

const fieldClass =
  "w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0D0D10] px-3 py-2.5 text-sm outline-none focus:border-neutral-500";

export default function SupplierRegister() {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(MATERIAL_CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("");
  const [radius, setRadius] = useState("");
  const [pincodes, setPincodes] = useState("");
  const [contactName, setContactName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [products, setProducts] = useState<ProductRow[]>([{ name: "", unit: "", price: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const updateProduct = (i: number, patch: Partial<ProductRow>) =>
    setProducts((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const pins = pincodes
      .split(/[\s,]+/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (!name.trim() || !city.trim() || !contactName.trim()) {
      setError("Please fill in business name, city and contact name.");
      return;
    }
    if (whatsapp.replace(/\D/g, "").length < 10) {
      setError("Enter a valid WhatsApp number.");
      return;
    }
    if (pins.some((p) => !isValidPincode(p))) {
      setError("Delivery pincodes must be 6 digits each, separated by commas.");
      return;
    }
    const validProducts = products.filter((p) => p.name.trim());
    if (validProducts.length === 0) {
      setError("Add at least one product.");
      return;
    }

    setSubmitting(true);
    try {
      // Generated here because unverified rows cannot be read back by the public.
      const supplierId = crypto.randomUUID();
      const { error: sErr } = await db.from("suppliers").insert({
        id: supplierId,
        name: name.trim(),
        category,
        description: description.trim() || null,
        area: area.trim() || null,
        city: city.trim(),
        delivery_radius_km: radius ? Number(radius) : null,
        service_pincodes: pins,
        is_verified: false,
      });
      if (sErr) throw sErr;

      const { error: cErr } = await db.from("supplier_contacts").insert({
        supplier_id: supplierId,
        person_name: contactName.trim(),
        whatsapp: whatsapp.trim(),
      });
      if (cErr) throw cErr;

      const { error: pErr } = await db.from("supplier_products").insert(
        validProducts.map((p) => ({
          supplier_id: supplierId,
          name: p.name.trim(),
          unit: p.unit.trim() || null,
          indicative_price: p.price ? Number(p.price) : null,
          price_updated_at: p.price ? new Date().toISOString().slice(0, 10) : null,
        })),
      );
      if (pErr) throw pErr;

      setDone(true);
    } catch (err) {
      console.warn("[SupplierRegister] failed:", err);
      setError("Couldn't submit your listing. Please try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <PageShell backTo="/materials" backLabel="Materials" containerWidth="md">
        <div className="space-y-3 py-16 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
          <h1 className="text-xl font-bold">Thanks, your listing is submitted</h1>
          <p className="text-sm text-[#71717A]">
            We'll verify your business and then it will appear in Materials & Suppliers.
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell backTo="/materials" backLabel="Materials" containerWidth="md">
      <form onSubmit={(e) => void submit(e)} className="space-y-4 pb-24">
        <div>
          <h1 className="text-xl font-bold tracking-tight">List your business</h1>
          <p className="text-xs text-[#71717A]">
            Your listing is shown to customers only after verification.
          </p>
        </div>

        <input className={fieldClass} placeholder="Business name" value={name} onChange={(e) => setName(e.target.value)} />
        <select className={fieldClass} value={category} onChange={(e) => setCategory(e.target.value)}>
          {MATERIAL_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <textarea
          className={fieldClass}
          rows={2}
          placeholder="Short description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-3">
          <input className={fieldClass} placeholder="Area" value={area} onChange={(e) => setArea(e.target.value)} />
          <input className={fieldClass} placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input
            className={fieldClass}
            inputMode="numeric"
            placeholder="Delivery radius (km)"
            value={radius}
            onChange={(e) => setRadius(e.target.value.replace(/\D/g, ""))}
          />
          <input
            className={fieldClass}
            placeholder="Delivery pincodes, comma separated"
            value={pincodes}
            onChange={(e) => setPincodes(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <input
            className={fieldClass}
            placeholder="Contact person"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
          />
          <input
            className={fieldClass}
            inputMode="tel"
            placeholder="WhatsApp number"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
          />
        </div>

        <div className="space-y-2.5">
          <p className="text-sm font-semibold">Products</p>
          {products.map((p, i) => (
            <div key={i} className="grid grid-cols-[1fr_5rem_5rem_auto] items-center gap-2">
              <input className={fieldClass} placeholder="Product" value={p.name} onChange={(e) => updateProduct(i, { name: e.target.value })} />
              <input className={fieldClass} placeholder="Unit" value={p.unit} onChange={(e) => updateProduct(i, { unit: e.target.value })} />
              <input
                className={fieldClass}
                inputMode="decimal"
                placeholder="₹"
                value={p.price}
                onChange={(e) => updateProduct(i, { price: e.target.value.replace(/[^\d.]/g, "") })}
              />
              <button
                type="button"
                aria-label="Remove product"
                disabled={products.length === 1}
                onClick={() => setProducts((rows) => rows.filter((_, idx) => idx !== i))}
                className="rounded-full p-1.5 text-[#71717A] hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-[#1E1F24]"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setProducts((rows) => [...rows, { name: "", unit: "", price: "" }])}
            className="inline-flex items-center gap-1 text-xs font-semibold"
          >
            <Plus size={13} /> Add product
          </button>
        </div>

        {error && <p className="text-xs font-medium text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {submitting && <Loader2 size={15} className="animate-spin" />}
          <span>Submit for verification</span>
        </button>
      </form>
    </PageShell>
  );
}
