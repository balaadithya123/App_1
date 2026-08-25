import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, CheckCircle2, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { supabase } from "@/lib/supabase";

type EventRow = { event_type: string; created_at: string; metadata: Record<string, unknown> };
type CallbackRow = { id: number; worker_id: string; client_name: string; client_phone: string; service_needed: string; preferred_time: string; notes: string | null; created_at: string; status: "new" | "contacted" | "closed" };
type AgencyRow = { id: string; name: string; phone: string; email: string; location: string; services: string; verified: boolean; created_at: string };

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [workers, setWorkers] = useState(0);
  const [callbacks, setCallbacks] = useState<CallbackRow[]>([]);
  const [agencies, setAgencies] = useState<AgencyRow[]>([]);

  const load = async () => {
    if (!supabase) { setLoading(false); return; }
    setRefreshing(true); setError("");
    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      const role = user?.user_metadata?.role || user?.app_metadata?.role;
      const isAdmin = user?.app_metadata?.is_admin === true || role === "admin" || user?.email === "pgbalaadithya@gmail.com";
      if (!user || !isAdmin) {
        navigate("/", { replace: true });
        return;
      }
      const since = new Date();
      since.setDate(since.getDate() - 7);
      const iso = since.toISOString();
      const [eventResult, workerResult, callbackResult, agencyResult] = await Promise.all([
        supabase.from("analytics_events").select("event_type,created_at,metadata").gte("created_at", iso).order("created_at", { ascending: false }),
        supabase.from("workers").select("id", { count: "exact", head: true }).gte("created_at", iso),
        supabase.from("callback_requests").select("id,worker_id,client_name,client_phone,service_needed,preferred_time,notes,created_at,status").order("created_at", { ascending: false }).limit(100),
        supabase.from("agencies").select("id,name,phone,email,location,service_locations,categories,verified,created_at").order("created_at", { ascending: false }).limit(100),
      ]);
      if (eventResult.error || workerResult.error || callbackResult.error || agencyResult.error) {
        console.warn("[AdminDashboard] Query warning:", { eventResult, workerResult, callbackResult, agencyResult });
      }
      setEvents((eventResult.data ?? []) as EventRow[]);
      setWorkers(workerResult.count ?? 0);
      setCallbacks((callbackResult.data ?? []) as CallbackRow[]);
      setAgencies((agencyResult.data ?? []).map((a: any) => ({
        ...a,
        location: Array.isArray(a.service_locations) ? a.service_locations.join(", ") : a.location || "—",
        services: Array.isArray(a.categories) ? a.categories.join(", ") : a.services || "—",
      })) as AgencyRow[]);
    } catch { setError("Analytics are temporarily unavailable."); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const count = (type: string) => events.filter(e => e.event_type === type).length;
    const searches = count("search_performed");
    const profileViews = count("profile_view");
    const whatsappClicks = count("whatsapp_click");
    const callbackSubmissions = count("callback_submitted");
    const searchTerms = new Map<string, number>();
    const categories = new Map<string, number>();
    events.forEach(e => {
      if (e.event_type === "search_performed") { const term = String(e.metadata?.search_term || "").trim(); if (term) searchTerms.set(term, (searchTerms.get(term) || 0) + 1); }
      if (e.event_type === "category_filter_used") { const category = String(e.metadata?.category || "").trim(); if (category) categories.set(category, (categories.get(category) || 0) + 1); }
    });
    const top = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { searches, profileViews, whatsappClicks, callbackSubmissions, searchToProfile: searches ? profileViews / searches * 100 : 0, profileToWhatsapp: profileViews ? whatsappClicks / profileViews * 100 : 0, topSearches: top(searchTerms), topCategories: top(categories) };
  }, [events]);

  const updateCallbackStatus = async (id: number, status: CallbackRow["status"]) => {
    if (!supabase) return;
    const { error: updateError } = await supabase.from("callback_requests").update({ status }).eq("id", id);
    if (updateError) setError("Could not update callback status.");
    else setCallbacks(rows => rows.map(row => row.id === id ? { ...row, status } : row));
  };

  const toggleAgencyVerification = async (agency: AgencyRow) => {
    if (!supabase) return;
    const next = !agency.verified;
    const { error: updateError } = await supabase.from("agencies").update({ verified: next, updated_at: new Date().toISOString() }).eq("id", agency.id);
    if (updateError) setError("Could not update agency verification. Apply the agencies migration in Supabase first if needed.");
    else setAgencies(rows => rows.map(row => row.id === agency.id ? { ...row, verified: next } : row));
  };

  if (loading) return <PageShell hideBack hideHome><div className="rounded-[16px] border border-line bg-white p-8 text-center dark:border-white/10 dark:bg-[#151515]">Loading admin dashboard...</div></PageShell>;

  return <PageShell hideBack hideHome><div className="mx-auto max-w-[1000px] space-y-5">
    <section className="rounded-[20px] border border-line bg-white p-6 dark:border-white/10 dark:bg-[#151515]">
      <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-slate dark:text-slate-400">Internal</p><h1 className="text-2xl font-extrabold text-navy dark:text-white">Growth Dashboard</h1><p className="mt-1 text-sm text-slate dark:text-slate-300">Last 7 days</p></div><button type="button" onClick={load} disabled={refreshing} className="rounded-full border border-line p-2 dark:border-white/10" aria-label="Refresh analytics"><RefreshCw size={17} className={refreshing ? "animate-spin" : ""}/></button></div>
      {error && <p className="mt-4 rounded-[10px] bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:bg-red-950/20 dark:text-red-300">{error}</p>}
      <div className="mt-6 grid gap-3 sm:grid-cols-5">{[["New workers", workers],["Searches", stats.searches],["Profile views", stats.profileViews],["WhatsApp clicks", stats.whatsappClicks],["Callbacks", stats.callbackSubmissions]].map(([label, value]) => <div key={String(label)} className="rounded-[14px] border border-line p-4 dark:border-white/10"><p className="text-xs font-bold text-slate dark:text-slate-400">{label}</p><p className="mt-1 text-2xl font-extrabold text-navy dark:text-white">{value}</p></div>)}</div>
    </section>
    <section className="grid gap-5 sm:grid-cols-2">
      <div className="rounded-[18px] border border-line bg-white p-5 dark:border-white/10 dark:bg-[#151515]"><h2 className="font-extrabold text-navy dark:text-white">Conversion</h2><div className="mt-4 space-y-3 text-sm"><p className="flex justify-between"><span>Search → profile view</span><strong>{stats.searchToProfile.toFixed(1)}%</strong></p><p className="flex justify-between"><span>Profile view → WhatsApp</span><strong>{stats.profileToWhatsapp.toFixed(1)}%</strong></p></div></div>
      <div className="rounded-[18px] border border-line bg-white p-5 dark:border-white/10 dark:bg-[#151515]"><h2 className="font-extrabold text-navy dark:text-white">Top searches</h2><div className="mt-3 space-y-2 text-sm">{stats.topSearches.length ? stats.topSearches.map(([term,total]) => <p key={term} className="flex justify-between"><span>{term}</span><strong>{total}</strong></p>) : <p className="text-slate">No search terms yet.</p>}</div></div>
    </section>
    <section className="rounded-[18px] border border-line bg-white p-5 dark:border-white/10 dark:bg-[#151515]"><h2 className="font-extrabold text-navy dark:text-white">Top categories</h2><div className="mt-3 grid gap-2 sm:grid-cols-2">{stats.topCategories.map(([category,total]) => <p key={category} className="flex justify-between rounded-lg border border-line px-3 py-2 text-sm dark:border-white/10"><span>{category}</span><strong>{total}</strong></p>)}</div></section>
    <section className="rounded-[18px] border border-line bg-white p-5 dark:border-white/10 dark:bg-[#151515]"><h2 className="font-extrabold text-navy dark:text-white">Agency verification</h2><p className="mt-1 text-sm text-slate dark:text-slate-300">Review agencies and grant or remove the verified badge. Agencies cannot self-verify.</p><div className="mt-4 space-y-3">{agencies.map(agency => <div key={agency.id} className="rounded-[14px] border border-line p-4 dark:border-white/10"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold text-navy dark:text-white">{agency.name} {agency.verified&&<span className="ml-1 inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950/30 dark:text-blue-300"><BadgeCheck size={13}/>Verified</span>}</p><p className="mt-1 text-xs text-slate dark:text-slate-400">{agency.location} · {agency.phone} · {agency.email}</p><p className="mt-1 text-xs text-slate dark:text-slate-400">{agency.services||"No services listed"}</p></div><button type="button" onClick={()=>toggleAgencyVerification(agency)} className={`rounded-lg px-3 py-2 text-xs font-bold ${agency.verified?"border border-line dark:border-white/10":"bg-navy text-white"}`}>{agency.verified?"Remove verification":"Verify agency"}</button></div></div>)}{!agencies.length&&<p className="text-sm text-slate">No agencies registered yet.</p>}</div></section>
    <section className="rounded-[18px] border border-line bg-white p-5 dark:border-white/10 dark:bg-[#151515]"><h2 className="font-extrabold text-navy dark:text-white">Callback requests</h2><div className="mt-4 space-y-3">{callbacks.map(callback => <div key={callback.id} className="rounded-[14px] border border-line p-4 dark:border-white/10"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold text-navy dark:text-white">{callback.client_name} · {callback.service_needed}</p><p className="mt-1 text-xs text-slate dark:text-slate-400">{callback.client_phone} · {callback.preferred_time}</p>{callback.notes && <p className="mt-2 text-sm text-slate dark:text-slate-300">{callback.notes}</p>}</div><div className="flex gap-2"><button type="button" onClick={() => updateCallbackStatus(callback.id,"contacted")} className="rounded-lg border border-line px-3 py-2 text-xs font-bold dark:border-white/10"><CheckCircle2 size={14} className="mr-1 inline"/>Contacted</button><button type="button" onClick={() => updateCallbackStatus(callback.id,"closed")} className="rounded-lg bg-navy px-3 py-2 text-xs font-bold text-white">Resolved</button></div></div><p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate">Status: {callback.status}</p></div>)}{!callbacks.length && <p className="text-sm text-slate">No callback requests yet.</p>}</div></section>
  </div></PageShell>;
}
