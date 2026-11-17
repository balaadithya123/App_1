import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Trash2 } from "lucide-react";
import PageShell from "@/components/PageShell";
import { ListRowsSkeleton } from "@/components/PageSkeletons";
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
      <div className="space-y-6 pb-24">
        <section className="rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-gradient-to-br from-[#FFF4EF] via-[#FAF8F5] to-[#F5EAE2] dark:from-[#261B16] dark:via-[#1C1512] dark:to-[#15110F] p-6 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#F4512C]">
            Admin Moderation
          </span>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#141210] dark:text-[#FAFAFA]">
            Supplier Approvals
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#6B645F] dark:text-[#9E958F]">
            Approve new suppliers before customers can see them.
          </p>
        </section>

        <div className="flex gap-2">
          {(["pending", "verified"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-full border px-4 py-1.5 text-xs font-bold capitalize transition cursor-pointer ${
                tab === t
                  ? "border-[#F4512C] bg-[#F4512C] text-white shadow-xs"
                  : "border-[#EAE2DC] bg-white text-[#6B645F] hover:border-[#F4512C]/40 dark:border-white/10 dark:bg-[#161514] dark:text-[#9E958F]"
              }`}
            >
              {t}
              {t === "pending" ? ` (${pendingCount})` : ""}
            </button>
          ))}
        </div>

        {error && <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{error}</p>}

        {loading ? (
          <ListRowsSkeleton count={4} columns={2} />
        ) : visible.length === 0 ? (
          <p className="rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-8 text-center text-sm text-[#6B645F] dark:text-[#9E958F] shadow-sm">
            Nothing {tab === "pending" ? "waiting for approval" : "verified yet"}.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {visible.map((r) => (
              <article
                key={r.id}
                className="space-y-3 rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 shadow-sm"
              >
                <div>
                  <h3 className="text-base font-extrabold text-[#141210] dark:text-[#FAFAFA]">{r.name}</h3>
                  <p className="text-xs text-[#6B645F] dark:text-[#9E958F]">
                    {r.category} · {[r.area, r.city].filter(Boolean).join(", ")}
                    {r.delivery_radius_km ? ` · ${r.delivery_radius_km} km` : ""}
                  </p>
                </div>
                {r.description && <p className="text-xs text-[#6B645F] dark:text-[#9E958F]">{r.description}</p>}
                <ul className="space-y-1 text-xs text-[#6B645F] dark:text-[#9E958F] rounded-xl bg-[#FAF8F5] dark:bg-[#0B0A09] p-3 border border-[#EAE2DC] dark:border-white/10">
                  {(r.supplier_contacts ?? []).map((c) => (
                    <li key={c.id} className="font-semibold text-[#141210] dark:text-[#FAFAFA]">
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
                    className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition cursor-pointer disabled:opacity-50 ${
                      r.is_verified
                        ? "border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] text-[#141210] dark:text-[#FAFAFA]"
                        : "bg-[#0F8A73] hover:bg-[#0B6E5B] text-white"
                    }`}
                  >
                    <CheckCircle2 size={13} />
                    {r.is_verified ? "Unverify" : "Approve"}
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${r.name}`}
                    disabled={busyId === r.id}
                    onClick={() => void remove(r.id, r.name)}
                    className="rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-3 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-50 cursor-pointer transition"
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
