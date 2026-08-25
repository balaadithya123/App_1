/* Agency dashboard: profile/code loading uses the authenticated agency row directly as a fallback. */
import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Building2,
  Check,
  Copy,
  LogOut,
  MapPin,
  Phone,
  Users,
  Wrench,
  ShieldAlert,
  ArrowRight,
  MessageSquare,
  ClipboardList,
  ExternalLink,
  ArrowUpRight,
  CheckCircle2,
  Circle,
  Sparkles,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { supabase } from "@/lib/supabase";

type Worker = {
  id: string;
  name: string;
  category: string;
  locality: string;
  initials: string;
  photo_url?: string | null;
  phone_verified: boolean;
  contact_events_count: number;
};

type Agency = {
  id: string;
  name: string;
  phone: string;
  email: string;
  location: string;
  categories: string[];
  service_locations: string[];
  team_size_band: string;
  verified: boolean;
  description: string;
  agency_code?: string;
  logo_url?: string | null;
};

type Callback = {
  id: string;
  worker_id: string;
  client_name: string;
  client_phone: string;
  service_needed: string;
  preferred_time: string;
  notes?: string | null;
  created_at: string;
  status: "new" | "contacted" | "closed";
};

type Dashboard = {
  agency: Agency;
  workers: Worker[];
  stats: { linkedWorkers: number; whatsappClicks7d: number; callbacks7d: number };
  callbacks: Callback[];
};

export default function AgencyDashboard() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [notAnAgency, setNotAnAgency] = useState(false);
  const [copied, setCopied] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  const load = async () => {
    if (!supabase) {
      setError("Agency portal is unavailable.");
      setLoading(false);
      return;
    }
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session) {
      navigate("/login", { replace: true });
      return;
    }
    const role = session.user.user_metadata?.role;
    setUserRole(role || "user");
    if (role !== "agency") {
      setNotAnAgency(true);
      setLoading(false);
      return;
    }

    try {
      const r = await fetch("/api/agencies/dashboard", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      const result = await r.json().catch(() => null);
      if (!r.ok) throw new Error(result?.message || "Unable to load agency dashboard.");
      if (!result?.agency?.agency_code) {
        const { data: a } = await supabase
          .from("agencies")
          .select("agency_code,name,location,service_locations,categories,team_size_band,phone,email,verified,description,logo_url")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (a) result.agency = { ...result.agency, ...a, agency_code: a.agency_code || result.agency.agency_code };
      }
      setDashboard(result);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load agency dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [navigate]);

  const copy = async (kind: string, value: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(""), 1600);
    } catch {
      setError("Copy failed. Please copy manually.");
    }
  };

  const updateStatus = async (id: string, status: Callback["status"]) => {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    setUpdating(id);
    try {
      const r = await fetch(`/api/agencies/callbacks/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error(j?.message || "Unable to update callback.");
      setDashboard((d) => (d ? { ...d, callbacks: d.callbacks.map((c) => (c.id === id ? { ...c, status } : c)) } : d));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update callback.");
    } finally {
      setUpdating(null);
    }
  };

  const shareUrl = dashboard?.agency.agency_code
    ? `${window.location.origin}/join?ref=${dashboard.agency.agency_code}`
    : "";
  const pending = useMemo(
    () => dashboard?.callbacks.filter((c) => c.status !== "closed").length || 0,
    [dashboard],
  );

  if (loading) {
    return (
      <PageShell hideBack hideHome>
        <section className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-sm font-medium text-muted-foreground">Loading agency portal...</p>
        </section>
      </PageShell>
    );
  }

  // Not an agency guard
  if (notAnAgency) {
    return (
      <PageShell backTo="/" backLabel="Home">
        <section className="mx-auto max-w-xl rounded-xl border border-border bg-card p-6 sm:p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-secondary text-primary">
            <ShieldAlert size={24} />
          </div>
          <h1 className="mt-4 text-xl font-bold tracking-tight text-foreground">
            Agency Account Required
          </h1>
          <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
            The agency portal is reserved for registered service agencies and business teams. You are currently signed in as a <span className="font-semibold text-foreground capitalize">{userRole}</span>.
          </p>
          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <Link
              to="/register-agency"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
            >
              <span>Register Your Agency</span>
              <ArrowRight size={14} />
            </Link>
            <Link
              to="/search"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-secondary px-4 text-xs font-semibold text-foreground transition hover:bg-foreground hover:text-background"
            >
              Browse Directory
            </Link>
          </div>
        </section>
      </PageShell>
    );
  }

  if (!dashboard) {
    return (
      <PageShell hideBack hideHome>
        <section className="rounded-xl border border-border bg-card p-6 sm:p-8 text-center">
          <h1 className="text-lg font-bold text-foreground">Unable to load agency dashboard</h1>
          <p className="mt-1 text-xs text-muted-foreground">{error || "Please check your network and try again."}</p>
          <div className="mt-4 flex justify-center gap-2">
            <button
              onClick={() => {
                setLoading(true);
                void load();
              }}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground cursor-pointer"
            >
              Try again
            </button>
            <Link
              to="/register-agency"
              className="rounded-lg border border-border bg-secondary px-4 py-2 text-xs font-bold text-foreground"
            >
              Register Agency
            </Link>
          </div>
        </section>
      </PageShell>
    );
  }

  const locations = dashboard.agency.service_locations?.filter(Boolean) || [];
  const locationText = locations.length
    ? locations.join(", ")
    : dashboard.agency.location || "Service area not added yet";
  const categories = dashboard.agency.categories?.filter(Boolean) || [];

  return (
    <PageShell hideBack hideHome>
      <div className="mx-auto max-w-4xl space-y-4">
        {error && (
          <section className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
            {error}
          </section>
        )}

        {/* Agency Profile Header Card */}
        <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-13 w-13 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary text-foreground">
                {dashboard.agency.logo_url ? (
                  <img src={dashboard.agency.logo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Building2 size={24} className="text-muted-foreground" />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Agency Portal
                  </span>
                  {dashboard.agency.verified && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/80 px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
                      <BadgeCheck size={12} className="text-primary" />
                      Verified Business
                    </span>
                  )}
                </div>

                <h1 className="mt-0.5 truncate text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  {dashboard.agency.name}
                </h1>

                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground truncate">
                  <MapPin size={13} className="shrink-0" />
                  <span className="truncate">{locationText}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/agency/profile/edit"
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-secondary px-3 text-xs font-semibold text-foreground transition hover:bg-foreground hover:text-background"
              >
                <span>Edit Profile</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Agency Profile Completeness Card */}
        {(() => {
          const checks = [
            { label: "Agency Name", done: Boolean(dashboard.agency.name?.trim()) },
            { label: "Phone Number", done: Boolean(dashboard.agency.phone?.trim()) },
            { label: "Email Address", done: Boolean(dashboard.agency.email?.trim()) },
            { label: "Service Locations", done: Boolean(dashboard.agency.service_locations?.length || dashboard.agency.location) },
            { label: "Trade Categories", done: Boolean(dashboard.agency.categories?.length) },
            { label: "Agency Description", done: Boolean(dashboard.agency.description?.trim()) },
            { label: "Agency Logo", done: Boolean(dashboard.agency.logo_url?.trim()) },
            { label: "Team Size", done: Boolean(dashboard.agency.team_size_band?.trim()) },
          ];
          const completedCount = checks.filter((c) => c.done).length;
          const percent = Math.round((completedCount / checks.length) * 100);

          return (
            <section className="rounded-xl border border-border bg-card p-4 transition-colors">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-primary">
                    <Building2 size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Profile Completeness
                      </span>
                      <span className="text-xs font-bold text-foreground">
                        {percent}% Complete
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {completedCount} of {checks.length} business profile sections completed.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to="/agency/profile-completeness"
                    className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-secondary px-3 text-xs font-semibold text-foreground transition hover:bg-foreground hover:text-background"
                  >
                    <span>View Checklist</span>
                    <ArrowUpRight size={13} />
                  </Link>
                  <Link
                    to="/agency/profile/edit"
                    className="inline-flex h-8 items-center gap-1 rounded-md bg-foreground px-3 text-xs font-semibold text-background transition hover:opacity-90"
                  >
                    <span>Improve Completeness</span>
                  </Link>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${percent}%` }}
                />
              </div>

              {/* Suggestions chips */}
              {percent < 100 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-medium text-muted-foreground mr-1">Missing:</span>
                  {checks
                    .filter((c) => !c.done)
                    .slice(0, 4)
                    .map((c) => (
                      <Link
                        key={c.label}
                        to="/agency/profile/edit"
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/60 px-2 py-0.5 text-[11px] font-semibold text-foreground transition hover:border-foreground/40 hover:bg-secondary"
                      >
                        <span>+ {c.label}</span>
                      </Link>
                    ))}
                </div>
              )}
            </section>
          );
        })()}

        {/* Metric Summaries Grid - Modern Minimalist Cards */}
        <section className="grid gap-3 sm:grid-cols-3">
          {/* Metric 1: Linked Workers */}
          <div className="rounded-xl border border-border bg-card p-4 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Linked Workers
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-secondary text-muted-foreground">
                <Users size={14} />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-foreground">
                {dashboard.stats.linkedWorkers}
              </span>
              <span className="text-xs text-muted-foreground">active pro roster</span>
            </div>
            <div className="mt-3 border-t border-border/80 pt-2.5 text-[11px] text-muted-foreground">
              Total registered workers
            </div>
          </div>

          {/* Metric 2: WhatsApp Inquiries */}
          <div className="rounded-xl border border-border bg-card p-4 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Inquiries (7d)
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-secondary text-muted-foreground">
                <MessageSquare size={14} />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-foreground">
                {dashboard.stats.whatsappClicks7d}
              </span>
              <span className="text-xs text-muted-foreground">clicks this week</span>
            </div>
            <div className="mt-3 border-t border-border/80 pt-2.5 text-[11px] text-muted-foreground">
              WhatsApp client outreach
            </div>
          </div>

          {/* Metric 3: Callback Requests */}
          <div className="rounded-xl border border-border bg-card p-4 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Callbacks
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-secondary text-muted-foreground">
                <ClipboardList size={14} />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-foreground">
                {dashboard.stats.callbacks7d}
              </span>
              <span className="text-xs text-muted-foreground">{pending} pending</span>
            </div>
            <div className="mt-3 border-t border-border/80 pt-2.5 text-[11px] text-muted-foreground">
              Direct booking requests
            </div>
          </div>
        </section>

        {/* Invite Workers / Agency Code Card */}
        <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Worker Recruitment
              </span>
              <h2 className="mt-0.5 text-sm font-bold text-foreground">Agency Invite Code</h2>
            </div>
            <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              Share to link
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex h-9 flex-1 items-center justify-center rounded-md border border-border bg-background px-3 font-mono text-base font-bold tracking-widest text-foreground select-all">
              {dashboard.agency.agency_code || "CODE UNAVAILABLE"}
            </div>

            <button
              type="button"
              onClick={() => copy("code", dashboard.agency.agency_code || "")}
              disabled={!dashboard.agency.agency_code}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-border bg-secondary px-3.5 text-xs font-semibold text-foreground transition hover:bg-foreground hover:text-background disabled:opacity-50 cursor-pointer"
            >
              {copied === "code" ? <Check size={13} className="text-primary" /> : <Copy size={13} />}
              <span>{copied === "code" ? "Copied" : "Copy Code"}</span>
            </button>

            <button
              type="button"
              onClick={() => copy("link", shareUrl)}
              disabled={!shareUrl}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-foreground px-3.5 text-xs font-semibold text-background transition hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {copied === "link" ? <Check size={13} /> : <ExternalLink size={13} />}
              <span>{copied === "link" ? "Copied" : "Copy Join Link"}</span>
            </button>
          </div>
        </section>

        {/* Team Roster Section */}
        <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center justify-between border-b border-border/80 pb-3">
            <div>
              <h2 className="text-sm font-bold text-foreground">Team Roster</h2>
              <p className="text-xs text-muted-foreground">Active workers linked under your agency umbrella.</p>
            </div>
            <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-xs font-semibold text-foreground">
              {dashboard.workers.length} workers
            </span>
          </div>

          {dashboard.workers.length ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[550px] text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="pb-2.5 font-semibold">Worker</th>
                    <th className="pb-2.5 font-semibold">Category</th>
                    <th className="pb-2.5 font-semibold">Phone Status</th>
                    <th className="pb-2.5 font-semibold">Inquiries</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {dashboard.workers.map((w) => (
                    <tr key={w.id} className="text-foreground">
                      <td className="py-3">
                        <p className="font-bold">{w.name}</p>
                        <p className="text-[11px] text-muted-foreground">{w.locality}</p>
                      </td>
                      <td className="py-3 text-muted-foreground">{w.category || "—"}</td>
                      <td className="py-3">
                        {w.phone_verified ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-500">
                            <Check size={12} /> Verified
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">Unverified</span>
                        )}
                      </td>
                      <td className="py-3 font-semibold">{w.contact_events_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              No workers linked yet. Share your agency code to invite workers.
            </div>
          )}
        </section>

        {/* Callback Requests Section */}
        <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center justify-between border-b border-border/80 pb-3">
            <div>
              <h2 className="text-sm font-bold text-foreground">Callback Requests</h2>
              <p className="text-xs text-muted-foreground">Direct leads submitted by clients for your workers.</p>
            </div>
            <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-xs font-semibold text-foreground">
              {pending} open
            </span>
          </div>

          {dashboard.callbacks.length ? (
            <div className="mt-4 space-y-2.5">
              {dashboard.callbacks.map((c) => (
                <div key={c.id} className="rounded-lg border border-border bg-secondary/30 p-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-foreground">{c.client_name}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {c.service_needed} · Preferred: {c.preferred_time}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-xs font-medium text-foreground">
                        <Phone size={12} className="text-muted-foreground" />
                        {c.client_phone}
                      </p>
                    </div>
                    <span className="rounded-md border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase">
                      {c.status}
                    </span>
                  </div>

                  {c.notes && (
                    <p className="mt-2.5 rounded-md border border-border bg-background p-2.5 text-[11px] text-muted-foreground">
                      {c.notes}
                    </p>
                  )}

                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-2.5">
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-2">
                      {c.status !== "contacted" && (
                        <button
                          disabled={updating === c.id}
                          onClick={() => void updateStatus(c.id, "contacted")}
                          className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground transition hover:bg-secondary cursor-pointer disabled:opacity-50"
                        >
                          Mark Contacted
                        </button>
                      )}
                      {c.status !== "closed" && (
                        <button
                          disabled={updating === c.id}
                          onClick={() => void updateStatus(c.id, "closed")}
                          className="rounded-md bg-foreground px-2.5 py-1 text-xs font-semibold text-background transition hover:opacity-90 cursor-pointer disabled:opacity-50"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              No callback requests received yet.
            </div>
          )}
        </section>

        {/* Agency Details */}
        <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-sm font-bold text-foreground">Agency Details</h2>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-secondary/30 p-3">
              <span className="text-[11px] text-muted-foreground">Contact Phone</span>
              <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Phone size={13} />
                {dashboard.agency.phone || "Not set"}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/30 p-3">
              <span className="text-[11px] text-muted-foreground">Team Size Band</span>
              <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Users size={13} />
                {dashboard.agency.team_size_band || "1-5 workers"}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/30 p-3">
              <span className="text-[11px] text-muted-foreground">Specializations</span>
              <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-foreground truncate">
                <Wrench size={13} className="shrink-0" />
                <span className="truncate">{categories.length ? categories.join(", ") : "All"}</span>
              </p>
            </div>
          </div>
        </section>

        {/* Log Out Button */}
        <button
          onClick={async () => {
            await supabase?.auth.signOut();
            navigate("/", { replace: true });
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-bold text-destructive transition hover:bg-destructive/15 cursor-pointer"
        >
          <LogOut size={15} />
          <span>Log out of Agency Account</span>
        </button>
      </div>
    </PageShell>
  );
}

