import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Loader2, Plus, X } from "lucide-react";
import PageShell from "@/components/PageShell";
import { supabase } from "@/lib/supabase";
import { MATERIAL_CATEGORIES, isValidPincode } from "@/lib/materials";

// The catalogue tables are not in the generated Supabase types.
const db = supabase as any;

type ProductRow = { name: string; unit: string; price: string };

const STEPS = ["Business", "Delivery", "Contact & products"] as const;

const fieldClass =
  "w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0D0D10] px-3 py-2.5 text-sm outline-none transition focus:border-neutral-500";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-[#3F3F46] dark:text-[#D4D4D8]">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-[#71717A]">{hint}</span>}
    </label>
  );
}

export default function SupplierRegister() {
  const [step, setStep] = useState(0);
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

  const parsedPins = () =>
    pincodes
      .split(/[\s,]+/)
      .map((p) => p.trim())
      .filter(Boolean);

  /** Returns an error message for the given step, or "" when it is valid. */
  const validate = (s: number): string => {
    if (s === 0) {
      if (!name.trim()) return "Enter your business name.";
    }
    if (s === 1) {
      if (!city.trim()) return "Enter your city.";
      if (parsedPins().some((p) => !isValidPincode(p))) {
        return "Delivery pincodes must be 6 digits each, separated by commas.";
      }
    }
    if (s === 2) {
      if (!contactName.trim()) return "Enter a contact person.";
      if (whatsapp.replace(/\D/g, "").length < 10) return "Enter a valid WhatsApp number.";
      if (products.every((p) => !p.name.trim())) return "Add at least one product.";
    }
    return "";
  };

  const next = () => {
    const msg = validate(step);
    setError(msg);
    if (!msg) setStep((s) => s + 1);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Pressing Enter on an earlier step should advance, not submit.
    if (step < STEPS.length - 1) {
      next();
      return;
    }
    const msg = validate(2);
    setError(msg);
    if (msg) return;

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
        service_pincodes: parsedPins(),
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
        products
          .filter((p) => p.name.trim())
          .map((p) => ({
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
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-3 py-16 text-center"
        >
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
          <h1 className="text-xl font-bold">Thanks, your listing is submitted</h1>
          <p className="mx-auto max-w-xs text-sm text-[#71717A]">
            We'll verify your business, and then it will appear in Materials & Suppliers.
          </p>
          <Link
            to="/materials"
            className="inline-block rounded-full border border-neutral-300 px-4 py-2 text-xs font-semibold dark:border-neutral-700"
          >
            Back to suppliers
          </Link>
        </motion.div>
      </PageShell>
    );
  }

  const isLast = step === STEPS.length - 1;

  return (
    <PageShell backTo="/materials" backLabel="Materials" containerWidth="md">
      <form onSubmit={(e) => void submit(e)} className="space-y-5 pb-24" noValidate>
        <div>
          <h1 className="text-xl font-bold tracking-tight">List your business</h1>
          <p className="text-xs text-[#71717A]">Shown to customers only after verification.</p>
        </div>

        <div aria-label={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`} className="space-y-2">
          <div className="flex gap-1.5">
            {STEPS.map((label, i) => (
              <div
                key={label}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= step ? "bg-black dark:bg-white" : "bg-neutral-200 dark:bg-neutral-800"
                }`}
              />
            ))}
          </div>
          <p className="text-xs font-semibold text-[#52525B] dark:text-[#A1A1AA]">
            Step {step + 1} of {STEPS.length} · {STEPS[step]}
          </p>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.15 }}
            className="space-y-4"
          >
            {step === 0 && (
              <>
                <Field label="Business name">
                  <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} />
                </Field>
                <Field label="Main category">
                  <select className={fieldClass} value={category} onChange={(e) => setCategory(e.target.value)}>
                    {MATERIAL_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Short description (optional)">
                  <textarea
                    className={fieldClass}
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </Field>
              </>
            )}

            {step === 1 && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Area">
                    <input className={fieldClass} value={area} onChange={(e) => setArea(e.target.value)} />
                  </Field>
                  <Field label="City">
                    <input className={fieldClass} value={city} onChange={(e) => setCity(e.target.value)} />
                  </Field>
                </div>
                <Field label="Delivery radius (km, optional)">
                  <input
                    className={fieldClass}
                    inputMode="numeric"
                    value={radius}
                    onChange={(e) => setRadius(e.target.value.replace(/\D/g, ""))}
                  />
                </Field>
                <Field
                  label="Delivery pincodes (optional)"
                  hint="Comma separated, e.g. 600032, 600016. Customers in these areas will find you when they filter by pincode."
                >
                  <input className={fieldClass} value={pincodes} onChange={(e) => setPincodes(e.target.value)} />
                </Field>
              </>
            )}

            {step === 2 && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Contact person">
                    <input className={fieldClass} value={contactName} onChange={(e) => setContactName(e.target.value)} />
                  </Field>
                  <Field label="WhatsApp number">
                    <input
                      className={fieldClass}
                      inputMode="tel"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                    />
                  </Field>
                </div>

                <div className="space-y-2.5">
                  <p className="text-xs font-semibold text-[#3F3F46] dark:text-[#D4D4D8]">
                    Products and indicative prices
                  </p>
                  {products.map((p, i) => (
                    <div key={i} className="grid grid-cols-[1fr_4.5rem_5rem_auto] items-center gap-2">
                      <input
                        className={fieldClass}
                        placeholder="Product"
                        aria-label={`Product ${i + 1} name`}
                        value={p.name}
                        onChange={(e) => updateProduct(i, { name: e.target.value })}
                      />
                      <input
                        className={fieldClass}
                        placeholder="Unit"
                        aria-label={`Product ${i + 1} unit`}
                        value={p.unit}
                        onChange={(e) => updateProduct(i, { unit: e.target.value })}
                      />
                      <input
                        className={fieldClass}
                        inputMode="decimal"
                        placeholder="₹"
                        aria-label={`Product ${i + 1} price`}
                        value={p.price}
                        onChange={(e) => updateProduct(i, { price: e.target.value.replace(/[^\d.]/g, "") })}
                      />
                      <button
                        type="button"
                        aria-label={`Remove product ${i + 1}`}
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
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {error && (
          <p role="alert" className="text-xs font-medium text-red-600">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={() => {
                setError("");
                setStep((s) => s - 1);
              }}
              className="rounded-full border border-neutral-300 px-5 py-3 text-sm font-semibold transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-[#1E1F24]"
            >
              Back
            </button>
          )}
          {isLast ? (
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-black"
            >
              {submitting && <Loader2 size={15} className="animate-spin" />}
              <span>Submit for verification</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={next}
              className="flex-1 rounded-full bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 dark:bg-white dark:text-black"
            >
              Continue
            </button>
          )}
        </div>
      </form>
    </PageShell>
  );
}
