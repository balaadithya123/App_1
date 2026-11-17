import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  ShieldAlert,
  Camera,
  Phone,
  Building2,
  Copy,
  Check,
  Users,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { DashboardSkeleton } from "@/components/PageSkeletons";
import { supabase } from "@/lib/supabase";

type EventRow = {
  event_type: string;
  created_at: string;
  metadata: Record<string, unknown>;
};
type CallbackRow = {
  id: number;
  worker_id: string;
  client_name: string;
  client_phone: string;
  service_needed: string;
  preferred_time: string;
  notes: string | null;
  created_at: string;
  status: "new" | "contacted" | "closed";
};
type AgencyRow = {
  id: string;
  name: string;
  phone: string;
  email: string;
  location: string;
  services: string;
  verified: boolean;
  agency_code?: string;
  worker_count?: number;
  created_at: string;
};
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
  trust_flags?: Array<{
    id: string;
    flag_type: string;
    reason: string;
    resolved: boolean;
    created_at: string;
  }>;
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
  const [workerFilter, setWorkerFilter] = useState<
    "all" | "agency" | "independent" | "flagged"
  >("all");
  const [expandedAgencies, setExpandedAgencies] = useState<
    Record<string, boolean>
  >({});
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const load = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setRefreshing(true);
    setError("");
    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      // user_metadata is user-editable, so it cannot grant admin (the server
      // enforces the same rule on every /api/admin route).
      const isAdmin =
        user?.app_metadata?.is_admin === true ||
        user?.email === "pgbalaadithya@gmail.com";
      if (!user || !isAdmin) {
        navigate("/", { replace: true });
        return;
      }
      const { data: sessionData } = await supabase.auth.getSession();
      const adminAuthHeaders: Record<string, string> = sessionData?.session
        ?.access_token
        ? { Authorization: `Bearer ${sessionData.session.access_token}` }
        : {};
      const since = new Date();
      since.setDate(since.getDate() - 7);
      const iso = since.toISOString();

      const [
        eventResult,
        workerResult,
        callbackResult,
        agenciesRes,
        adminWorkersRes,
      ] = await Promise.all([
        supabase
          .from("analytics_events")
          .select("event_type,created_at,metadata")
          .gte("created_at", iso)
          .order("created_at", { ascending: false }),
        supabase
          .from("workers")
          .select("id", { count: "exact", head: true })
          .gte("created_at", iso),
        supabase
          .from("callback_requests")
          .select(
            "id,worker_id,client_name,client_phone,service_needed,preferred_time,notes,created_at,status",
          )
          .order("created_at", { ascending: false })
          .limit(100),
        fetch("/api/agencies", { cache: "no-store" }).catch(() => null),
        fetch("/api/admin/workers", {
          cache: "no-store",
          headers: adminAuthHeaders,
        }).catch(() => null),
      ]);

      setEvents((eventResult.data ?? []) as EventRow[]);
      setWorkersCount(workerResult.count ?? 0);
      setCallbacks((callbackResult.data ?? []) as CallbackRow[]);

      let fetchedAgencies: AgencyRow[] = [];
      if (agenciesRes && agenciesRes.ok) {
        const agJson = await agenciesRes.json();
        fetchedAgencies = (agJson.agencies || []).map((a: any) => ({
          ...a,
          location: Array.isArray(a.service_locations)
            ? a.service_locations.join(", ")
            : a.location || "—",
          services: Array.isArray(a.categories)
            ? a.categories.join(", ")
            : a.services || "—",
          agency_code: a.agency_code || a.id,
          worker_count: a.worker_count ?? 0,
        }));
      } else {
        const { data: dbAgencies } = await supabase
          .from("agencies")
          .select(
            "id,name,phone,email,location,service_locations,categories,verified,agency_code,created_at",
          )
          .order("created_at", { ascending: false })
          .limit(100);
        fetchedAgencies = (dbAgencies ?? []).map((a: any) => ({
          ...a,
          location: Array.isArray(a.service_locations)
            ? a.service_locations.join(", ")
            : a.location || "—",
          services: Array.isArray(a.categories)
            ? a.categories.join(", ")
            : a.services || "—",
          agency_code: a.agency_code || a.id,
          worker_count: 0,
        }));
      }
      setAgencies(fetchedAgencies);

      if (adminWorkersRes && adminWorkersRes.ok) {
        const workersData = await adminWorkersRes.json();
        setAdminWorkers(workersData.workers || []);
      }
    } catch {
      setError("Analytics are temporarily unavailable.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const toggleExpand = (agencyId: string) => {
    setExpandedAgencies((prev) => ({ ...prev, [agencyId]: !prev[agencyId] }));
  };

  const filteredWorkers = useMemo(() => {
    return adminWorkers.filter((w) => {
      if (workerFilter === "agency")
        return Boolean(w.agency_id || w.agency_code);
      if (workerFilter === "independent") return !w.agency_id && !w.agency_code;
      if (workerFilter === "flagged")
        return w.has_flags || (w.trust_flags && w.trust_flags.length > 0);
      return true;
    });
  }, [adminWorkers, workerFilter]);

  const stats = useMemo(() => {
    const count = (type: string) =>
      events.filter((e) => e.event_type === type).length;
    const searches = count("search_performed");
    const profileViews = count("profile_view");
    const whatsappClicks = count("whatsapp_click");
    const callbackSubmissions = count("callback_submitted");
    const searchTerms = new Map<string, number>();
    const categories = new Map<string, number>();
    events.forEach((e) => {
      if (e.event_type === "search_performed") {
        const term = String(e.metadata?.search_term || "").trim();
        if (term) searchTerms.set(term, (searchTerms.get(term) || 0) + 1);
      }
      if (e.event_type === "category_filter_used") {
        const category = String(e.metadata?.category || "").trim();
        if (category)
          categories.set(category, (categories.get(category) || 0) + 1);
      }
    });
    const top = (m: Map<string, number>) =>
      [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    return {
      searches,
      profileViews,
      whatsappClicks,
      callbackSubmissions,
      searchToProfile: searches ? (profileViews / searches) * 100 : 0,
      profileToWhatsapp: profileViews
        ? (whatsappClicks / profileViews) * 100
        : 0,
      topSearches: top(searchTerms),
      topCategories: top(categories),
    };
  }, [events]);

  const updateCallbackStatus = async (
    id: number,
    status: CallbackRow["status"],
  ) => {
    if (!supabase) return;
    const { error: updateError } = await supabase
      .from("callback_requests")
      .update({ status })
      .eq("id", id);
    if (updateError) setError("Could not update callback status.");
    else
      setCallbacks((rows) =>
        rows.map((row) => (row.id === id ? { ...row, status } : row)),
      );
  };

  const toggleAgencyVerification = async (agency: AgencyRow) => {
    if (!supabase) return;
    const next = !agency.verified;
    const { error: updateError } = await supabase
      .from("agencies")
      .update({ verified: next, updated_at: new Date().toISOString() })
      .eq("id", agency.id);
    if (updateError) setError("Could not update agency verification.");
    else
      setAgencies((rows) =>
        rows.map((row) =>
          row.id === agency.id ? { ...row, verified: next } : row,
        ),
      );
  };

  const toggleWorkerVerification = async (
    workerId: string,
    current: boolean,
  ) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (sessionData?.session?.access_token) {
        headers.Authorization = `Bearer ${sessionData.session.access_token}`;
      }
      const res = await fetch(`/api/admin/workers/${workerId}/toggle-verify`, {
        method: "POST",
        headers,
        body: JSON.stringify({ verified: !current }),
      });
      if (res.ok) {
        setAdminWorkers((prev) =>
          prev.map((w) =>
            w.id === workerId ? { ...w, phone_verified: !current } : w,
          ),
        );
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
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (sessionData?.session?.access_token) {
        headers.Authorization = `Bearer ${sessionData.session.access_token}`;
      }
      const res = await fetch(`/api/admin/workers/${workerId}/resolve-flags`, {
        method: "POST",
        headers,
      });
      if (res.ok) {
        setAdminWorkers((prev) =>
          prev.map((w) =>
            w.id === workerId ? { ...w, has_flags: false, trust_flags: [] } : w,
          ),
        );
      } else {
        setError("Could not resolve flags.");
      }
    } catch {
      setError("Could not resolve flags.");
    }
  };

  if (loading)
    return (
      <PageShell hideBack hideHome>
        <DashboardSkeleton statCount={4} cardCount={2} />
      </PageShell>
    );

  return (
    <PageShell hideBack hideHome>
      <div className="mx-auto max-w-[1000px] space-y-6">
        {/* Growth Dashboard Header */}
        <section className="rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-gradient-to-br from-[#FFF4EF] via-[#FAF8F5] to-[#F5EAE2] dark:from-[#261B16] dark:via-[#1C1512] dark:to-[#15110F] p-6 shadow-sm sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#F4512C]">
                Internal Operations
              </p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#141210] dark:text-[#FAFAFA]">
                Admin Operations Portal
              </h1>
              <p className="mt-1 text-sm text-[#6B645F] dark:text-[#9E958F]">
                Live directory, agency rosters, phone verification, and
                moderation
              </p>
            </div>
            <button
              type="button"
              onClick={load}
              disabled={refreshing}
              className="rounded-full border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-2.5 text-[#141210] dark:text-[#FAFAFA] hover:border-[#F4512C]/50 shadow-sm cursor-pointer transition"
              aria-label="Refresh analytics"
            >
              <RefreshCw
                size={17}
                className={
                  refreshing
                    ? "animate-spin text-[#F4512C]"
                    : "text-[#6B645F] dark:text-[#9E958F]"
                }
              />
            </button>
          </div>
          {error && (
            <p className="mt-4 rounded-xl border border-rose-500/20 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 text-sm font-semibold text-rose-600 dark:text-rose-400">
              {error}
            </p>
          )}
          <div className="mt-6 grid gap-3 sm:grid-cols-5">
            {[
              ["Total Workers", adminWorkers.length],
              ["Active Agencies", agencies.length],
              ["Profile Views", stats.profileViews],
              ["WhatsApp Leads", stats.whatsappClicks],
              ["Callbacks", stats.callbackSubmissions],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white/90 dark:bg-[#161514]/90 p-4 shadow-xs"
              >
                <p className="text-xs font-bold text-[#6B645F] dark:text-[#9E958F]">
                  {label}
                </p>
                <p className="mt-1 text-2xl font-extrabold text-[#141210] dark:text-[#FAFAFA]">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Agencies & Affiliated Teams Roster */}
        <section className="rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 sm:p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C]">
                  <Building2 size={18} />
                </span>
                <h2 className="font-extrabold text-[#141210] dark:text-[#FAFAFA] text-lg">
                  Agencies & Linked Teams
                </h2>
              </div>
              <p className="mt-1 text-sm text-[#6B645F] dark:text-[#9E958F]">
                Manage agency codes, verify businesses, and view workers
                affiliated via referral codes.
              </p>
            </div>
            <span className="rounded-full bg-[#FCEAE4] dark:bg-[#3A2018] px-3 py-1 text-xs font-bold text-[#F4512C]">
              {agencies.length} Registered{" "}
              {agencies.length === 1 ? "Agency" : "Agencies"}
            </span>
          </div>

          <div className="mt-4 space-y-4">
            {agencies.map((agency) => {
              const code = agency.agency_code || agency.id;
              const isExpanded = Boolean(expandedAgencies[agency.id]);
              const targetIds = [
                agency.id,
                agency.agency_code,
                "agency-admin",
                "AGN-ADMN",
              ]
                .filter(Boolean)
                .map((x) => String(x).toLowerCase());
              const linkedWorkers = adminWorkers.filter((w) => {
                if (!w.agency_id && !w.agency_code) return false;
                const wAid = String(w.agency_id || "").toLowerCase();
                const wCode = String(w.agency_code || "").toLowerCase();
                return targetIds.some((tid) => tid === wAid || tid === wCode);
              });

              return (
                <div
                  key={agency.id}
                  className="rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] p-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-[#141210] dark:text-[#FAFAFA] text-base">
                          {agency.name}
                        </p>
                        {agency.verified && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-[#0F8A73] dark:text-[#3DD1B3]">
                            <BadgeCheck size={13} />
                            Verified Agency
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => copyCode(code)}
                          className="inline-flex items-center gap-1 rounded-full bg-white dark:bg-[#161514] px-2.5 py-0.5 font-mono text-xs font-bold text-[#141210] dark:text-[#FAFAFA] hover:border-[#F4512C]/50 cursor-pointer border border-[#EAE2DC] dark:border-white/10 shadow-2xs transition"
                          title="Click to copy Agency Code"
                        >
                          Code: {code}
                          {copiedCode === code ? (
                            <Check size={11} className="text-[#0F8A73] dark:text-[#3DD1B3]" />
                          ) : (
                            <Copy size={11} className="text-[#8C847E] dark:text-[#766F6A]" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-[#6B645F] dark:text-[#9E958F]">
                        {agency.location} · {agency.phone} · {agency.email}
                      </p>
                      <p className="text-xs text-[#6B645F] dark:text-[#9E958F]">
                        <span className="font-semibold text-[#141210] dark:text-[#FAFAFA]">
                          Trades:
                        </span>{" "}
                        {agency.services || "General"}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                      <button
                        type="button"
                        onClick={() => toggleExpand(agency.id)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] px-3.5 py-1.5 text-xs font-bold text-[#141210] dark:text-[#FAFAFA] hover:border-[#F4512C]/50 cursor-pointer shadow-2xs transition"
                      >
                        <Users size={13} className="text-[#F4512C]" />
                        <span>
                          {linkedWorkers.length}{" "}
                          {linkedWorkers.length === 1 ? "Worker" : "Workers"}
                        </span>
                        {isExpanded ? (
                          <ChevronUp size={14} />
                        ) : (
                          <ChevronDown size={14} />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleAgencyVerification(agency)}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-bold cursor-pointer transition shadow-2xs ${
                          agency.verified
                            ? "border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] text-[#6B645F] dark:text-[#9E958F] hover:text-[#141210] dark:hover:text-[#FAFAFA]"
                            : "bg-[#0F8A73] text-white hover:bg-[#0B6E5B]"
                        }`}
                      >
                        {agency.verified
                          ? "Remove Verification"
                          : "Verify Agency"}
                      </button>
                    </div>
                  </div>

                  {/* Expandable worker roster under this agency */}
                  {isExpanded && (
                    <div className="mt-3.5 border-t border-[#EAE2DC] dark:border-white/10 pt-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-[#6B645F] dark:text-[#9E958F] mb-2">
                        Workers Linked to {agency.name} ({linkedWorkers.length})
                      </p>
                      {linkedWorkers.length === 0 ? (
                        <p className="text-xs text-[#6B645F] dark:text-[#9E958F] py-2">
                          No workers have linked via code{" "}
                          <strong className="text-[#141210] dark:text-[#FAFAFA]">{code}</strong> yet. Workers can join by
                          entering this code in their profile or during
                          registration.
                        </p>
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {linkedWorkers.map((w) => (
                            <div
                              key={w.id}
                              className="flex items-center justify-between rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-2.5 text-xs shadow-2xs"
                            >
                              <div>
                                <p className="font-bold text-[#141210] dark:text-[#FAFAFA]">
                                  {w.name}
                                </p>
                                <p className="text-[#6B645F] dark:text-[#9E958F]">
                                  {w.category} · {w.locality} · {w.phone}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                {w.phone_verified ? (
                                  <span className="text-[11px] font-bold text-[#0F8A73] dark:text-[#3DD1B3] flex items-center gap-0.5">
                                    <BadgeCheck size={12} />
                                    Verified
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-[#8C847E] dark:text-[#766F6A]">
                                    Unverified
                                  </span>
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
            {!agencies.length && (
              <p className="text-sm text-[#6B645F] dark:text-[#9E958F]">
                No agencies registered yet.
              </p>
            )}
          </div>
        </section>

        {/* Worker Profiles Directory with Integrated Agency Affiliation & Silent Moderation */}
        <section className="rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="font-extrabold text-[#141210] dark:text-[#FAFAFA] text-lg">
                Worker Profiles & Directory
              </h2>
              <p className="mt-1 text-sm text-[#6B645F] dark:text-[#9E958F]">
                Review registered service professionals, agency links, and
                profiles flagged by screening.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {(["all", "agency", "independent", "flagged"] as const).map(
                (tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setWorkerFilter(tab)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-bold capitalize transition-colors cursor-pointer ${
                      workerFilter === tab
                        ? "bg-[#F4512C] text-white shadow-2xs"
                        : "bg-[#FAF8F5] dark:bg-[#0B0A09] text-[#6B645F] dark:text-[#9E958F] hover:text-[#141210] dark:hover:text-[#FAFAFA] border border-[#EAE2DC] dark:border-white/10"
                    }`}
                  >
                    {tab === "all" ? `All (${adminWorkers.length})` : tab}
                  </button>
                ),
              )}
            </div>
          </div>

          <div className="mt-4 divide-y divide-[#EAE2DC] dark:divide-white/10">
            {filteredWorkers.map((w) => {
              const isFlagged =
                w.has_flags || (w.trust_flags && w.trust_flags.length > 0);
              return (
                <div key={w.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-[#141210] dark:text-[#FAFAFA]">
                          {w.name}
                        </p>
                        {w.phone_verified ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-[#0F8A73] dark:text-[#3DD1B3]">
                            <BadgeCheck size={13} />
                            Verified Pro
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#FAF8F5] dark:bg-[#0B0A09] border border-[#EAE2DC] dark:border-white/10 px-2.5 py-0.5 text-xs font-medium text-[#6B645F] dark:text-[#9E958F]">
                            Unverified
                          </span>
                        )}

                        {/* Agency affiliation badge */}
                        {w.agency_name || w.agency_code ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#FCEAE4] dark:bg-[#3A2018] px-2.5 py-0.5 text-xs font-bold text-[#F4512C]">
                            <Building2 size={12} /> {w.agency_name || "Agency"}{" "}
                            ({w.agency_code || w.agency_id})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#FAF8F5] dark:bg-[#0B0A09] border border-[#EAE2DC] dark:border-white/10 px-2.5 py-0.5 text-xs font-medium text-[#6B645F] dark:text-[#9E958F]">
                            Independent
                          </span>
                        )}

                        {isFlagged && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-300/60 dark:border-amber-700/40 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                            <AlertTriangle
                              size={12}
                              className="text-amber-600 dark:text-amber-400"
                            />{" "}
                            Flagged Profile
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-xs text-[#6B645F] dark:text-[#9E958F]">
                        <span className="font-semibold text-[#F4512C]">
                          {w.category}
                        </span>{" "}
                        · {w.locality} ·{" "}
                        <span className="inline-flex items-center gap-1">
                          <Phone size={11} />
                          {w.phone}
                        </span>
                        {typeof w.portfolio_count === "number" && (
                          <span className="ml-2 inline-flex items-center gap-1 text-[#8C847E] dark:text-[#766F6A]">
                            <Camera size={11} /> {w.portfolio_count} work photos
                          </span>
                        )}
                      </p>

                      {/* Surface background flagged issues right on the row */}
                      {isFlagged &&
                        w.trust_flags &&
                        w.trust_flags.length > 0 && (
                          <div className="mt-2.5 space-y-1.5 rounded-xl border border-amber-300/40 dark:border-amber-700/40 bg-amber-50/60 dark:bg-amber-950/30 p-2.5">
                            {w.trust_flags.map((flag, idx) => (
                              <div
                                key={flag.id || idx}
                                className="flex items-start gap-1.5 text-xs text-amber-800 dark:text-amber-300"
                              >
                                <ShieldAlert
                                  size={14}
                                  className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400"
                                />
                                <span>
                                  <strong>
                                    Flag ({flag.flag_type.replace(/_/g, " ")}):
                                  </strong>{" "}
                                  {flag.reason}
                                </span>
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
                          className="rounded-full border border-amber-300 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-950/40 px-3.5 py-1.5 text-xs font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/60 transition cursor-pointer"
                        >
                          Clear Flag
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          toggleWorkerVerification(
                            w.id,
                            Boolean(w.phone_verified),
                          )
                        }
                        className={`rounded-full px-3.5 py-1.5 text-xs font-bold cursor-pointer transition ${
                          w.phone_verified
                            ? "border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] text-[#6B645F] dark:text-[#9E958F] hover:text-[#141210] dark:hover:text-[#FAFAFA]"
                            : "bg-[#0F8A73] text-white hover:bg-[#0B6E5B]"
                        }`}
                      >
                        {w.phone_verified
                          ? "Revoke Verification"
                          : "Verify Worker"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {!filteredWorkers.length && (
              <p className="py-4 text-sm text-[#6B645F] dark:text-[#9E958F]">
                No workers match this filter.
              </p>
            )}
          </div>
        </section>

        {/* Analytics Breakdown */}
        <section className="grid gap-5 sm:grid-cols-2">
          <div className="rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 sm:p-6 shadow-sm">
            <h2 className="font-bold text-[#141210] dark:text-[#FAFAFA] text-base">
              Conversion
            </h2>
            <div className="mt-4 space-y-3 text-sm">
              <p className="flex justify-between text-[#6B645F] dark:text-[#9E958F]">
                <span>Search → profile view</span>
                <strong className="text-[#141210] dark:text-[#FAFAFA]">
                  {stats.searchToProfile.toFixed(1)}%
                </strong>
              </p>
              <p className="flex justify-between text-[#6B645F] dark:text-[#9E958F]">
                <span>Profile view → WhatsApp</span>
                <strong className="text-[#141210] dark:text-[#FAFAFA]">
                  {stats.profileToWhatsapp.toFixed(1)}%
                </strong>
              </p>
            </div>
          </div>
          <div className="rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 sm:p-6 shadow-sm">
            <h2 className="font-bold text-[#141210] dark:text-[#FAFAFA] text-base">
              Top searches
            </h2>
            <div className="mt-3 space-y-2 text-sm">
              {stats.topSearches.length ? (
                stats.topSearches.map(([term, total]) => (
                  <p key={term} className="flex justify-between text-[#6B645F] dark:text-[#9E958F]">
                    <span className="text-[#141210] dark:text-[#FAFAFA]">{term}</span>
                    <strong className="text-[#141210] dark:text-[#FAFAFA]">{total}</strong>
                  </p>
                ))
              ) : (
                <p className="text-[#6B645F] dark:text-[#9E958F]">No search terms yet.</p>
              )}
            </div>
          </div>
        </section>

        {/* Categories Breakdown */}
        <section className="rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 sm:p-6 shadow-sm">
          <h2 className="font-bold text-[#141210] dark:text-[#FAFAFA] text-base">
            Top categories
          </h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {stats.topCategories.map(([category, total]) => (
              <p
                key={category}
                className="flex justify-between rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-3.5 py-2.5 text-sm text-[#141210] dark:text-[#FAFAFA]"
              >
                <span>{category}</span>
                <strong>{total}</strong>
              </p>
            ))}
          </div>
        </section>

        {/* Callback requests */}
        <section className="rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 sm:p-6 shadow-sm">
          <h2 className="font-bold text-[#141210] dark:text-[#FAFAFA] text-base">
            Callback requests
          </h2>
          <div className="mt-4 space-y-3">
            {callbacks.map((callback) => (
              <div
                key={callback.id}
                className="rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-[#141210] dark:text-[#FAFAFA]">
                      {callback.client_name} · {callback.service_needed}
                    </p>
                    <p className="mt-1 text-xs text-[#6B645F] dark:text-[#9E958F]">
                      {callback.client_phone} · {callback.preferred_time}
                    </p>
                    {callback.notes && (
                      <p className="mt-2 text-sm text-[#6B645F] dark:text-[#9E958F]">
                        {callback.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateCallbackStatus(callback.id, "contacted")
                      }
                      className="rounded-full border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] px-3 py-1.5 text-xs font-bold text-[#141210] dark:text-[#FAFAFA] hover:border-[#F4512C]/50 transition cursor-pointer"
                    >
                      <CheckCircle2
                        size={14}
                        className="mr-1 inline text-[#0F8A73] dark:text-[#3DD1B3]"
                      />
                      Contacted
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateCallbackStatus(callback.id, "closed")
                      }
                      className="rounded-full bg-[#0F8A73] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#0B6E5B] transition cursor-pointer"
                    >
                      Resolved
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-xs font-bold uppercase tracking-wide text-[#8C847E] dark:text-[#766F6A]">
                  Status: {callback.status}
                </p>
              </div>
            ))}
            {!callbacks.length && (
              <p className="text-sm text-[#6B645F] dark:text-[#9E958F]">
                No callback requests yet.
              </p>
            )}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
