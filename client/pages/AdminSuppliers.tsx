import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2, Trash2 } from "lucide-react";
import PageShell from "@/components/PageShell";
import { supabase } from "@/lib/supabase";
import type { Supplier } from "@/lib/materials";

// The catalogue tables are not in the generated Supabase types.
const db = supabase as any;

type Row = Supplier & { is_verified: boolean; created_at: string };
type Tab = "pending" | "verified";

export default function AdminSuppliers() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("pending");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      const isAdmin =
        user?.app_metadata?.is_admin === true || user?.email === "pgbalaadithya@gmail.com";
      if (!user || !isAdmin) {
        navigate("/", { replace: true });
        return;
      }
      // Real access control is enforced by database policies, not this redirect.
      const { data, error: err } = await db
        .from("suppliers")
        .select(
          "id,name,category,description,area,city,delivery_radius_km,service_pincodes,is_verified,created_at,supplier_contacts(id,person_name,role,whatsapp),supplier_products(id,name,unit,indicative_price,price_updated_at)",
        )
        .order("created_at", { ascending: false });
      if (err) throw err;
      setRows((data ?? []) as Row[]);
    } catch (e) {
      console.warn("[AdminSuppliers] load failed:", e);
      setError("Couldn't load suppliers. Check that the admin migration has been applied.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  const setVerified = async (id: string, verified: boolean) => {
    setBusyId(id);
    setError("");
    const { error: err } = await db.from("suppliers").update({ is_verified: verified }).eq("id", id);
    if (err) setError("Couldn't update this supplier.");
    else setRows((rs) => rs.map((r) => (r.id === id ? { ...r, is_verified: verified } : r)));
    setBusyId(null);
  };

  const remove = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}" and all its products and contacts? This cannot be undone.`)) return;
    setBusyId(id);
    setError("");
    const { error: err } = await db.from("suppliers").delete().eq("id", id);
    if (err) setError("Couldn't delete this supplier.");
    else setRows((rs) => rs.filter((r) => r.id !== id));
    setBusyId(null);
  };

  const visible = rows.filter((r) => (tab === "pending" ? !r.is_verified : r.is_verified));
  const pendingCount = rows.filter((r) => !r.is_verified).length;

  return (
    <PageShell backTo="/materials" backLabel="Materials" containerWidth="lg">
      <div className="space-y-5 pb-24">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Supplier approvals</h1>
          <p className="text-xs text-[#71717A]">Approve new suppliers before customers can see them.</p>
        </div>

        <div className="flex gap-2">
          {(["pending", "verified"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-full border px-4 py-1.5 text-xs font-semibold capitalize transition ${
                tab === t
                  ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                  : "border-neutral-200 dark:border-neutral-800"
              }`}
            >
              {t}
              {t === "pending" ? ` (${pendingCount})` : ""}
            </button>
          ))}
        </div>

        {error && <p className="text-xs font-medium text-red-600">{error}</p>}

        {loading ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <p className="rounded-2xl border border-[#E4E4E7] dark:border-[#27272A] p-8 text-center text-sm text-[#71717A]">
            Nothing {tab === "pending" ? "waiting for approval" : "verified yet"}.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {visible.map((r) => (
              <article
                key={r.id}
                className="space-y-2.5 rounded-2xl border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] p-4"
              >
                <div>
                  <h3 className="text-base font-semibold">{r.name}</h3>
                  <p className="text-xs text-[#71717A]">
                    {r.category} · {[r.area, r.city].filter(Boolean).join(", ")}
                    {r.delivery_radius_km ? ` · ${r.delivery_radius_km} km` : ""}
                  </p>
                </div>
                {r.description && <p className="text-xs text-[#52525B] dark:text-[#A1A1AA]">{r.description}</p>}
                <ul className="text-xs text-[#52525B] dark:text-[#A1A1AA]">
                  {(r.supplier_contacts ?? []).map((c) => (
                    <li key={c.id}>
                      {c.person_name}: {c.whatsapp}
                    </li>
                  ))}
                  {(r.supplier_products ?? []).map((p) => (
                    <li key={p.id}>
                      {p.name}
                      {p.indicative_price != null ? ` · ₹${p.indicative_price}` : ""}
                      {p.unit ? ` / ${p.unit}` : ""}
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => void setVerified(r.id, !r.is_verified)}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-black px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-black"
                  >
                    <CheckCircle2 size={13} />
                    {r.is_verified ? "Unverify" : "Approve"}
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${r.name}`}
                    disabled={busyId === r.id}
                    onClick={() => void remove(r.id, r.name)}
                    className="rounded-full border border-neutral-300 px-3 text-red-600 disabled:opacity-50 dark:border-neutral-700"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
