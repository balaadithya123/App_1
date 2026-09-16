import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, CheckCircle2, RefreshCw, AlertTriangle, ShieldAlert, Camera, Phone, Building2, Copy, Check, Users, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { supabase } from "@/lib/supabase";

type EventRow = { event_type: string; created_at: string; metadata: Record<string, unknown> };
type CallbackRow = { id: number; worker_id: string; client_name: string; client_phone: string; service_needed: string; preferred_time: string; notes: string | null; created_at: string; status: "new" | "contacted" | "closed" };
type AgencyRow = { id: string; name: string; phone: string; email: string; location: string; services: string; verified: boolean; agency_code?: string; worker_count?: number; created_at: string };
type AdminWorkerRow = {
  id: string;
  name: string;
  category: string;
  locality: string;
  phone: string;
  phone_verified?: boolean;
  portfolio_count?: number;
  has_flags?: boolean;
  agency_id?: string | null;
  agency_name?: string | null;
  agency_code?: string | null;
  trust_flags?: Array<{ id: string; flag_type: string; reason: string; resolved: boolean; created_at: string }>;
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [workersCount, setWorkersCount] = useState(0);
  const [callbacks, setCallbacks] = useState<CallbackRow[]>([]);
  const [agencies, setAgencies] = useState<AgencyRow[]>([]);
  const [adminWorkers, setAdminWorkers] = useState<AdminWorkerRow[]>([]);
  const [workerFilter, setWorkerFilter] = useState<"all" | "agency" | "independent" | "flagged">("all");
  const [expandedAgencies, setExpandedAgencies] = useState<Record<string, boolean>>({});
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

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

      const [eventResult, workerResult, callbackResult, agenciesRes, adminWorkersRes] = await Promise.all([
        supabase.from("analytics_events").select("event_type,created_at,metadata").gte("created_at", iso).order("created_at", { ascending: false }),
        supabase.from("workers").select("id", { count: "exact", head: true }).gte("created_at", iso),
        supabase.from("callback_requests").select("id,worker_id,client_name,client_phone,service_needed,preferred_time,notes,created_at,status").order("created_at", { ascending: false }).limit(100),
        fetch("/api/agencies", { cache: "no-store" }).catch(() => null),
        fetch("/api/admin/workers", { cache: "no-store" }).catch(() => null),
      ]);

      setEvents((eventResult.data ?? []) as EventRow[]);
      setWorkersCount(workerResult.count ?? 0);
      setCallbacks((callbackResult.data ?? []) as CallbackRow[]);

      let fetchedAgencies: AgencyRow[] = [];
      if (agenciesRes && agenciesRes.ok) {
        const agJson = await agenciesRes.json();
        fetchedAgencies = (agJson.agencies || []).map((a: any) => ({
          ...a,
          location: Array.isArray(a.service_locations) ? a.service_locations.join(", ") : a.location || "—",
          services: Array.isArray(a.categories) ? a.categories.join(", ") : a.services || "—",
          agency_code: a.agency_code || a.id,
          worker_count: a.worker_count ?? 0,
        }));
      } else {
        const { data: dbAgencies } = await supabase.from("agencies").select("id,name,phone,email,location,service_locations,categories,verified,agency_code,created_at").order("created_at", { ascending: false }).limit(100);
        fetchedAgencies = (dbAgencies ?? []).map((a: any) => ({
          ...a,
          location: Array.isArray(a.service_locations) ? a.service_locations.join(", ") : a.location || "—",
          services: Array.isArray(a.categories) ? a.categories.join(", ") : a.services || "—",
          agency_code: a.agency_code || a.id,
          worker_count: 0,
        }));
      }
      setAgencies(fetchedAgencies);

      if (adminWorkersRes && adminWorkersRes.ok) {
        const workersData = await adminWorkersRes.json();
        setAdminWorkers(workersData.workers || []);
      }
    } catch { setError("Analytics are temporarily unavailable."); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { void load(); }, []);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const toggleExpand = (agencyId: string) => {
    setExpandedAgencies(prev => ({ ...prev, [agencyId]: !prev[agencyId] }));
  };

  const filteredWorkers = useMemo(() => {
    return adminWorkers.filter(w => {
      if (workerFilter === "agency") return Boolean(w.agency_id || w.agency_code);
      if (workerFilter === "independent") return !w.agency_id && !w.agency_code;
      if (workerFilter === "flagged") return w.has_flags || (w.trust_flags && w.trust_flags.length > 0);
      return true;
    });
  }, [adminWorkers, workerFilter]);

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
    if (updateError) setError("Could not update agency verification.");
    else setAgencies(rows => rows.map(row => row.id === agency.id ? { ...row, verified: next } : row));
  };

  const toggleWorkerVerification = async (workerId: string, current: boolean) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (sessionData?.session?.access_token) {
        headers.Authorization = `Bearer ${sessionData.session.access_token}`;
      }
      const res = await fetch(`/api/admin/workers/${workerId}/toggle-verify`, {
        method: "POST",
        headers,
        body: JSON.stringify({ verified: !current }),
      });
      if (res.ok) {
        setAdminWorkers(prev => prev.map(w => w.id === workerId ? { ...w, phone_verified: !current } : w));
      } else {
        setError("Could not update worker verification.");
      }
    } catch {
      setError("Could not update worker verification.");
    }
  };

  const resolveWorkerFlags = async (workerId: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (sessionData?.session?.access_token) {
        headers.Authorization = `Bearer ${sessionData.session.access_token}`;
      }
      const res = await fetch(`/api/admin/workers/${workerId}/resolve-flags`, {
        method: "POST",
        headers,
      });
      if (res.ok) {
        setAdminWorkers(prev => prev.map(w => w.id === workerId ? { ...w, has_flags: false, trust_flags: [] } : w));
      } else {
        setError("Could not resolve flags.");
      }
    } catch {
      setError("Could not resolve flags.");
    }
  };

  if (loading) return <PageShell hideBack hideHome><div className="rounded-[16px] border border-line bg-white p-8 text-center dark:border-white/10 dark:bg-[#151515]">Loading admin dashboard...</div></PageShell>;

  return (
    <PageShell hideBack hideHome>
      <div className="mx-auto max-w-[1000px] space-y-6">
        {/* Growth Dashboard Header */}
        <section className="rounded-[20px] border border-line bg-white p-6 dark:border-white/10 dark:bg-[#151515]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate dark:text-slate-400">Internal</p>
              <h1 className="text-2xl font-extrabold text-navy dark:text-white">Admin Operations Portal</h1>
              <p className="mt-1 text-sm text-slate dark:text-slate-300">Live directory, agency rosters, phone verification, and moderation</p>
            </div>
            <button type="button" onClick={load} disabled={refreshing} className="rounded-full border border-line p-2 dark:border-white/10" aria-label="Refresh analytics">
              <RefreshCw size={17} className={refreshing ? "animate-spin" : ""}/>
            </button>
          </div>
          {error && <p className="mt-4 rounded-[10px] bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:bg-red-950/20 dark:text-red-300">{error}</p>}
          <div className="mt-6 grid gap-3 sm:grid-cols-5">
            {[["Total Workers", adminWorkers.length], ["Active Agencies", agencies.length], ["Profile Views", stats.profileViews], ["WhatsApp Leads", stats.whatsappClicks], ["Callbacks", stats.callbackSubmissions]].map(([label, value]) => (
              <div key={String(label)} className="rounded-[14px] border border-line p-4 dark:border-white/10">
                <p className="text-xs font-bold text-slate dark:text-slate-400">{label}</p>
                <p className="mt-1 text-2xl font-extrabold text-navy dark:text-white">{value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Agencies & Affiliated Teams Roster */}
        <section className="rounded-[18px] border border-line bg-white p-5 dark:border-white/10 dark:bg-[#151515]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="text-teal" size={20} />
                <h2 className="font-extrabold text-navy dark:text-white text-lg">Agencies & Linked Teams</h2>
              </div>
              <p className="mt-1 text-sm text-slate dark:text-slate-300">
                Manage agency codes, verify businesses, and view workers affiliated via referral codes.
              </p>
            </div>
            <span className="rounded-lg bg-teal/10 px-3 py-1 text-xs font-bold text-teal">
              {agencies.length} Registered {agencies.length === 1 ? "Agency" : "Agencies"}
            </span>
          </div>

          <div className="mt-4 space-y-4">
            {agencies.map((agency) => {
              const code = agency.agency_code || agency.id;
              const isExpanded = Boolean(expandedAgencies[agency.id]);
              // Find workers linked to this agency
              const targetIds = [agency.id, agency.agency_code, "agency-admin", "AGN-ADMN"].filter(Boolean).map(x => String(x).toLowerCase());
              const linkedWorkers = adminWorkers.filter(w => {
                if (!w.agency_id && !w.agency_code) return false;
                const wAid = String(w.agency_id || "").toLowerCase();
                const wCode = String(w.agency_code || "").toLowerCase();
                return targetIds.some(tid => tid === wAid || tid === wCode);
              });

              return (
                <div key={agency.id} className="rounded-[14px] border border-line p-4 dark:border-white/10">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-navy dark:text-white text-base">{agency.name}</p>
                        {agency.verified && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
                            <BadgeCheck size={13}/>Verified Agency
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => copyCode(code)}
                          className="inline-flex items-center gap-1 rounded-md bg-secondary/80 px-2 py-0.5 font-mono text-xs font-bold text-foreground hover:bg-secondary cursor-pointer border border-border/50"
                          title="Click to copy Agency Code"
                        >
                          Code: {code}
                          {copiedCode === code ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} className="text-muted-foreground" />}
                        </button>
                      </div>
                      <p className="text-xs text-slate dark:text-slate-400">
                        {agency.location} · {agency.phone} · {agency.email}
                      </p>
                      <p className="text-xs text-slate dark:text-slate-400">
                        <span className="font-semibold text-foreground">Trades:</span> {agency.services || "General"}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                      <button
                        type="button"
                        onClick={() => toggleExpand(agency.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-slate dark:text-slate-300 dark:border-white/10 hover:bg-secondary cursor-pointer"
                      >
                        <Users size={13} className="text-teal" />
                        <span>{linkedWorkers.length} {linkedWorkers.length === 1 ? "Worker" : "Workers"}</span>
                        {isExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleAgencyVerification(agency)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold cursor-pointer ${
                          agency.verified
                            ? "border border-line dark:border-white/10 text-slate hover:bg-secondary"
                            : "bg-navy text-white hover:bg-navy/90"
                        }`}
                      >
                        {agency.verified ? "Remove Verification" : "Verify Agency"}
                      </button>
                    </div>
                  </div>

                  {/* Expandable worker roster under this agency */}
                  {isExpanded && (
                    <div className="mt-3.5 border-t border-line/60 pt-3 dark:border-white/10">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate dark:text-slate-400 mb-2">
                        Workers Linked to {agency.name} ({linkedWorkers.length})
                      </p>
                      {linkedWorkers.length === 0 ? (
                        <p className="text-xs text-slate dark:text-slate-400 py-2">
                          No workers have linked via code <strong>{code}</strong> yet. Workers can join by entering this code in their profile or during registration.
                        </p>
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {linkedWorkers.map(w => (
                            <div key={w.id} className="flex items-center justify-between rounded-lg border border-border/50 bg-secondary/30 p-2.5 text-xs">
                              <div>
                                <p className="font-bold text-navy dark:text-white">{w.name}</p>
                                <p className="text-muted-foreground">{w.category} · {w.locality} · {w.phone}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                {w.phone_verified ? (
                                  <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
                                    <BadgeCheck size={12}/>Verified
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground">Unverified</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {!agencies.length && <p className="text-sm text-slate">No agencies registered yet.</p>}
          </div>
        </section>

        {/* Worker Profiles Directory with Integrated Agency Affiliation & Silent Moderation */}
        <section className="rounded-[18px] border border-line bg-white p-5 dark:border-white/10 dark:bg-[#151515]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="font-extrabold text-navy dark:text-white text-lg">Worker Profiles & Directory</h2>
              <p className="mt-1 text-sm text-slate dark:text-slate-300">
                Review registered service professionals, agency links, and profiles flagged by screening.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {(["all", "agency", "independent", "flagged"] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setWorkerFilter(tab)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold capitalize transition-colors cursor-pointer ${
                    workerFilter === tab
                      ? "bg-navy text-white dark:bg-white dark:text-navy"
                      : "bg-secondary text-foreground hover:bg-secondary/80"
                  }`}
                >
                  {tab === "all" ? `All (${adminWorkers.length})` : tab}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 divide-y divide-border/60">
            {filteredWorkers.map(w => {
              const isFlagged = w.has_flags || (w.trust_flags && w.trust_flags.length > 0);
              return (
                <div key={w.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-navy dark:text-white">{w.name}</p>
                        {w.phone_verified ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                            <BadgeCheck size={13}/>Verified Pro
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
                            Unverified
                          </span>
                        )}

                        {/* Agency affiliation badge */}
                        {w.agency_name || w.agency_code ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-teal/10 px-2.5 py-0.5 text-xs font-bold text-teal">
                            <Building2 size={12}/> {w.agency_name || "Agency"} ({w.agency_code || w.agency_id})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            Independent
                          </span>
                        )}

                        {isFlagged && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                            <AlertTriangle size={12} className="text-amber-600"/> Flagged Profile
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-xs text-slate dark:text-slate-400">
                        <span className="font-semibold text-teal">{w.category}</span> · {w.locality} · <span className="inline-flex items-center gap-1"><Phone size={11}/>{w.phone}</span>
                        {typeof w.portfolio_count === "number" && (
                          <span className="ml-2 inline-flex items-center gap-1 text-muted-foreground">
                            <Camera size={11}/> {w.portfolio_count} work photos
                          </span>
                        )}
                      </p>

                      {/* Surface background flagged issues right on the row */}
                      {isFlagged && w.trust_flags && w.trust_flags.length > 0 && (
                        <div className="mt-2.5 space-y-1.5 rounded-lg border border-amber-300/40 bg-amber-50/60 p-2.5 dark:border-amber-900/40 dark:bg-amber-950/20">
                          {w.trust_flags.map((flag, idx) => (
                            <div key={flag.id || idx} className="flex items-start gap-1.5 text-xs text-amber-800 dark:text-amber-300">
                              <ShieldAlert size={14} className="shrink-0 mt-0.5 text-amber-600"/>
                              <span><strong>Flag ({flag.flag_type.replace(/_/g, " ")}):</strong> {flag.reason}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                      {isFlagged && (
                        <button
                          type="button"
                          onClick={() => resolveWorkerFlags(w.id)}
                          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200 cursor-pointer"
                        >
                          Clear Flag
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleWorkerVerification(w.id, Boolean(w.phone_verified))}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold cursor-pointer ${
                          w.phone_verified
                            ? "border border-line dark:border-white/10 text-slate hover:bg-secondary"
                            : "bg-navy text-white hover:bg-navy/90"
                        }`}
                      >
                        {w.phone_verified ? "Revoke Verification" : "Verify Worker"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {!filteredWorkers.length && <p className="py-4 text-sm text-slate">No workers match this filter.</p>}
          </div>
        </section>

        {/* Analytics Breakdown */}
        <section className="grid gap-5 sm:grid-cols-2">
          <div className="rounded-[18px] border border-line bg-white p-5 dark:border-white/10 dark:bg-[#151515]"><h2 className="font-extrabold text-navy dark:text-white">Conversion</h2><div className="mt-4 space-y-3 text-sm"><p className="flex justify-between"><span>Search → profile view</span><strong>{stats.searchToProfile.toFixed(1)}%</strong></p><p className="flex justify-between"><span>Profile view → WhatsApp</span><strong>{stats.profileToWhatsapp.toFixed(1)}%</strong></p></div></div>
          <div className="rounded-[18px] border border-line bg-white p-5 dark:border-white/10 dark:bg-[#151515]"><h2 className="font-extrabold text-navy dark:text-white">Top searches</h2><div className="mt-3 space-y-2 text-sm">{stats.topSearches.length ? stats.topSearches.map(([term,total]) => <p key={term} className="flex justify-between"><span>{term}</span><strong>{total}</strong></p>) : <p className="text-slate">No search terms yet.</p>}</div></div>
        </section>

        {/* Categories Breakdown */}
        <section className="rounded-[18px] border border-line bg-white p-5 dark:border-white/10 dark:bg-[#151515]"><h2 className="font-extrabold text-navy dark:text-white">Top categories</h2><div className="mt-3 grid gap-2 sm:grid-cols-2">{stats.topCategories.map(([category,total]) => <p key={category} className="flex justify-between rounded-lg border border-line px-3 py-2 text-sm dark:border-white/10"><span>{category}</span><strong>{total}</strong></p>)}</div></section>

        {/* Callback requests */}
        <section className="rounded-[18px] border border-line bg-white p-5 dark:border-white/10 dark:bg-[#151515]"><h2 className="font-extrabold text-navy dark:text-white">Callback requests</h2><div className="mt-4 space-y-3">{callbacks.map(callback => <div key={callback.id} className="rounded-[14px] border border-line p-4 dark:border-white/10"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold text-navy dark:text-white">{callback.client_name} · {callback.service_needed}</p><p className="mt-1 text-xs text-slate dark:text-slate-400">{callback.client_phone} · {callback.preferred_time}</p>{callback.notes && <p className="mt-2 text-sm text-slate dark:text-slate-300">{callback.notes}</p>}</div><div className="flex gap-2"><button type="button" onClick={() => updateCallbackStatus(callback.id,"contacted")} className="rounded-lg border border-line px-3 py-2 text-xs font-bold dark:border-white/10"><CheckCircle2 size={14} className="mr-1 inline"/>Contacted</button><button type="button" onClick={() => updateCallbackStatus(callback.id,"closed")} className="rounded-lg bg-navy px-3 py-2 text-xs font-bold text-white">Resolved</button></div></div><p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate">Status: {callback.status}</p></div>)}{!callbacks.length && <p className="text-sm text-slate">No callback requests yet.</p>}</div></section>
      </div>
    </PageShell>
  );
}
