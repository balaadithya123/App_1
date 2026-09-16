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
  Search,
  MessageCircle,
  Briefcase,
  Star,
  Clock,
  Zap,
  X,
  Eye,
  Calendar,
  Grid,
  List,
  UserMinus,
  Trash2,
  Plus,
  FolderKanban,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { supabase } from "@/lib/supabase";
import ConfirmDialog from "@/components/ConfirmDialog";

type Worker = {
  id: string;
  name: string;
  category: string;
  locality: string;
  initials: string;
  photo_url?: string | null;
  phone_verified?: boolean;
  contact_events_count?: number;
  phone?: string;
  services?: string[] | string;
  experience?: string | number;
  available_today?: boolean;
  urgent_today?: boolean;
  agency_id?: string;
  created_at?: string;
  rating?: number;
  reviews_count?: number;
  daily_rate?: number;
  about?: string;
  bio?: string;
  whatsapp_number?: string;
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

type ProjectAssignment = {
  id: string;
  agency_id: string;
  worker_id: string;
  worker_name: string;
  title: string;
  client_name: string;
  client_phone: string;
  service: string;
  location: string;
  deadline?: string;
  status: "active" | "in_progress" | "completed" | "cancelled";
  created_at: string;
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
  const [bannerMessage, setBannerMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Roster Search & Modal State
  const [workerSearch, setWorkerSearch] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);

  // Destructive Actions State: Remove Worker from Roster
  const [workerToRemove, setWorkerToRemove] = useState<Worker | null>(null);
  const [removeWorkerLoading, setRemoveWorkerLoading] = useState(false);

  // Active Project Assignments State
  const [projects, setProjects] = useState<ProjectAssignment[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<ProjectAssignment | null>(null);
  const [deleteProjectLoading, setDeleteProjectLoading] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectLoading, setNewProjectLoading] = useState(false);
  const [newProjectForm, setNewProjectForm] = useState({
    title: "",
    client_name: "",
    client_phone: "",
    worker_id: "",
    service: "",
    location: "",
    deadline: "",
  });

  const loadProjects = async (agencyId: string) => {
    try {
      setProjectsLoading(true);
      const res = await fetch(`/api/agencies/projects?agencyId=${encodeURIComponent(agencyId || "agency-admin")}`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (e) {
      console.warn("Could not load projects:", e);
    } finally {
      setProjectsLoading(false);
    }
  };

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
    const email = String(session.user.email || "").toLowerCase();
    const isAdmin = session.user.app_metadata?.is_admin === true || role === "admin" || email === "pgbalaadithya@gmail.com";
    setUserRole(role || "user");
    if (role !== "agency" && !isAdmin) {
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
      if (result?.agency?.id) {
        void loadProjects(result.agency.id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [navigate]);

  const copy = (key: string, text: string) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 2200);
  };

  const updateStatus = async (id: string, status: "new" | "contacted" | "closed") => {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    setUpdating(id);
    try {
      const res = await fetch(`/api/agencies/callbacks/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setDashboard((prev) =>
          prev
            ? {
                ...prev,
                callbacks: prev.callbacks.map((c) => (c.id === id ? { ...c, status } : c)),
              }
            : prev,
        );
      }
    } catch {
      // ignore
    } finally {
      setUpdating(null);
    }
  };

  // Handler for Removing a Worker after Confirmation Dialog
  const handleConfirmRemoveWorker = async () => {
    if (!workerToRemove) return;
    setRemoveWorkerLoading(true);
    try {
      const res = await fetch("/api/agencies/remove-worker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workerId: workerToRemove.id,
          phone: workerToRemove.phone,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || "Failed to remove worker from agency roster.");
      }

      // Update local dashboard workers state
      setDashboard((prev) => {
        if (!prev) return prev;
        const updated = prev.workers.filter((w) => w.id !== workerToRemove.id);
        return {
          ...prev,
          workers: updated,
          stats: {
            ...prev.stats,
            linkedWorkers: updated.length,
          },
        };
      });

      setBannerMessage({
        type: "success",
        text: `Specialist "${workerToRemove.name}" has been removed from your agency roster.`,
      });
      setWorkerToRemove(null);
    } catch (err: any) {
      setBannerMessage({
        type: "error",
        text: err.message || "Unable to remove worker from roster.",
      });
    } finally {
      setRemoveWorkerLoading(false);
    }
  };

  // Handler for Deleting a Project Assignment after Confirmation Dialog
  const handleConfirmDeleteProject = async () => {
    if (!projectToDelete) return;
    setDeleteProjectLoading(true);
    try {
      const res = await fetch(`/api/agencies/projects/${encodeURIComponent(projectToDelete.id)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || "Failed to delete project assignment.");
      }

      setProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));
      setBannerMessage({
        type: "success",
        text: `Active project "${projectToDelete.title}" for client ${projectToDelete.client_name} was deleted.`,
      });
      setProjectToDelete(null);
    } catch (err: any) {
      setBannerMessage({
        type: "error",
        text: err.message || "Unable to delete project assignment.",
      });
    } finally {
      setDeleteProjectLoading(false);
    }
  };

  // Handler for creating a new project assignment
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectForm.title.trim() || !newProjectForm.client_name.trim() || !newProjectForm.worker_id) {
      return;
    }
    setNewProjectLoading(true);
    try {
      const assignedWorker = dashboard?.workers.find((w) => w.id === newProjectForm.worker_id);
      const res = await fetch("/api/agencies/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newProjectForm,
          worker_name: assignedWorker?.name || "Specialist",
          service: newProjectForm.service || assignedWorker?.category || "General Service",
          agency_id: dashboard?.agency?.id || "agency-admin",
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || "Unable to create project assignment.");
      }

      if (data.project) {
        setProjects((prev) => [data.project, ...prev]);
      }

      setNewProjectForm({
        title: "",
        client_name: "",
        client_phone: "",
        worker_id: "",
        service: "",
        location: "",
        deadline: "",
      });
      setShowNewProjectModal(false);
      setBannerMessage({
        type: "success",
        text: "New active project assignment created successfully.",
      });
    } catch (err: any) {
      setBannerMessage({
        type: "error",
        text: err.message || "Failed to create project assignment.",
      });
    } finally {
      setNewProjectLoading(false);
    }
  };

  const shareUrl = useMemo(() => {
    if (!dashboard?.agency?.agency_code) return "";
    return `${window.location.origin}/register?agency=${encodeURIComponent(dashboard.agency.agency_code)}`;
  }, [dashboard?.agency?.agency_code]);

  const filteredWorkers = useMemo(() => {
    if (!dashboard?.workers) return [];
    if (!workerSearch.trim()) return dashboard.workers;
    const q = workerSearch.toLowerCase().trim();
    return dashboard.workers.filter((w) => {
      const name = (w.name || "").toLowerCase();
      const cat = (w.category || "").toLowerCase();
      const loc = (w.locality || "").toLowerCase();
      const ph = (w.phone || "").toLowerCase();
      const serv = Array.isArray(w.services) ? w.services.join(" ").toLowerCase() : String(w.services || "").toLowerCase();
      return name.includes(q) || cat.includes(q) || loc.includes(q) || ph.includes(q) || serv.includes(q);
    });
  }, [dashboard?.workers, workerSearch]);

  if (loading) {
    return (
      <PageShell backTo="/" backLabel="Home">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
            <span>Loading agency dashboard...</span>
          </div>
        </div>
      </PageShell>
    );
  }

  if (notAnAgency) {
    return (
      <PageShell backTo="/" backLabel="Home">
        <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-6 text-center">
          <Building2 size={36} className="mx-auto text-primary" />
          <h1 className="mt-3 text-lg font-bold text-foreground">Agency Portal</h1>
          <p className="mt-1.5 text-xs text-muted-foreground">
            This account is currently registered as a {userRole || "client"}. To manage a team of workers, please register an agency profile.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <Link
              to="/agency/register"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground"
            >
              Register Agency Profile
            </Link>
            <Link
              to="/"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-secondary px-4 text-xs font-semibold text-foreground"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </PageShell>
    );
  }

  if (error || !dashboard) {
    return (
      <PageShell backTo="/" backLabel="Back">
        <div className="mx-auto max-w-md rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
          <ShieldAlert size={36} className="mx-auto text-destructive" />
          <h1 className="mt-3 text-base font-bold text-foreground">Error Loading Dashboard</h1>
          <p className="mt-1 text-xs text-muted-foreground">{error || "Unable to retrieve agency information."}</p>
          <button
            onClick={() => {
              setLoading(true);
              setError("");
              void load();
            }}
            className="mt-4 inline-flex h-9 items-center justify-center rounded-lg bg-foreground px-4 text-xs font-semibold text-background cursor-pointer"
          >
            Retry
          </button>
        </div>
      </PageShell>
    );
  }

  const categories = dashboard.agency.categories || [];
  const pending = dashboard.callbacks.filter((c) => c.status === "new").length;

  return (
    <PageShell backTo="/" backLabel="Back" containerWidth="lg">
      <div className="space-y-6">
        {/* Agency Profile Header Card */}
        <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary font-bold text-foreground text-xl">
                {dashboard.agency.logo_url ? (
                  <img
                    src={dashboard.agency.logo_url}
                    alt={dashboard.agency.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Building2 size={24} className="text-primary" />
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg font-bold text-foreground sm:text-xl">{dashboard.agency.name}</h1>
                  {dashboard.agency.verified && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <BadgeCheck size={13} /> Verified Agency
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {dashboard.agency.location && (
                    <span className="flex items-center gap-1">
                      <MapPin size={12} /> {dashboard.agency.location}
                    </span>
                  )}
                  {dashboard.agency.phone && (
                    <span className="flex items-center gap-1">
                      <Phone size={12} /> {dashboard.agency.phone}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users size={12} /> {dashboard.workers.length} Team Members
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={`/agency/${dashboard.agency.id}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 text-xs font-semibold text-foreground transition hover:bg-foreground hover:text-background"
              >
                <ExternalLink size={13} />
                <span>Public Page</span>
              </Link>
              <Link
                to="/agency/edit"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-foreground px-3.5 text-xs font-semibold text-background transition hover:opacity-90"
              >
                <span>Edit Profile</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Notification Banner */}
        {bannerMessage && (
          <div
            className={`flex items-center justify-between rounded-xl border p-4 text-xs font-medium ${
              bannerMessage.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
          >
            <div className="flex items-center gap-2">
              {bannerMessage.type === "success" ? (
                <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle size={16} className="text-destructive shrink-0" />
              )}
              <span>{bannerMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setBannerMessage(null)}
              className="rounded p-1 opacity-70 hover:opacity-100 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Overview Stats */}
        <section className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <span className="text-[11px] font-semibold text-muted-foreground">Total Workers</span>
            <p className="mt-1 text-2xl font-bold text-foreground">{dashboard.stats.linkedWorkers}</p>
            <div className="mt-2 text-[11px] text-muted-foreground">Under agency code</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <span className="text-[11px] font-semibold text-muted-foreground">Client Contacts (7d)</span>
            <p className="mt-1 text-2xl font-bold text-foreground">{dashboard.stats.whatsappClicks7d}</p>
            <div className="mt-2 text-[11px] text-muted-foreground">Direct inquiries</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <span className="text-[11px] font-semibold text-muted-foreground">Callbacks (7d)</span>
            <p className="mt-1 text-2xl font-bold text-foreground">{dashboard.stats.callbacks7d}</p>
            <div className="mt-2 text-[11px] text-muted-foreground">{pending} pending resolution</div>
          </div>
        </section>

        {/* Worker Recruitment / Invite Code Card */}
        <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Recruit & Link Workers
              </span>
              <h2 className="mt-0.5 text-sm font-bold text-foreground">Your Agency Invite Code</h2>
            </div>
            <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              Share with workers
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex h-10 flex-1 items-center justify-center rounded-lg border border-border bg-background px-4 font-mono text-lg font-bold tracking-widest text-foreground select-all">
              {dashboard.agency.agency_code || "CODE UNAVAILABLE"}
            </div>

            <button
              type="button"
              onClick={() => copy("code", dashboard.agency.agency_code || "")}
              disabled={!dashboard.agency.agency_code}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary px-4 text-xs font-semibold text-foreground transition hover:bg-foreground hover:text-background disabled:opacity-50 cursor-pointer"
            >
              {copied === "code" ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
              <span>{copied === "code" ? "Code Copied!" : "Copy Code"}</span>
            </button>

            <button
              type="button"
              onClick={() => copy("link", shareUrl)}
              disabled={!shareUrl}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-foreground px-4 text-xs font-semibold text-background transition hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {copied === "link" ? <Check size={14} /> : <ExternalLink size={14} />}
              <span>{copied === "link" ? "Link Copied!" : "Copy Join Link"}</span>
            </button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Workers enter this code during registration or from their dashboard to link under your agency.
          </p>
        </section>

        {/* Complete Worker Roster Section */}
        <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">Worker Team Details</h2>
                <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-xs font-semibold text-foreground">
                  {dashboard.workers.length} active
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Full profile details, direct phone contacts, skill specializations, and daily status of your workers.
              </p>
            </div>

            {/* View Mode Toggle & Search */}
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg border border-border bg-secondary/50 p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("cards")}
                  className={`flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium transition cursor-pointer ${
                    viewMode === "cards"
                      ? "bg-card text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Card View"
                >
                  <Grid size={13} />
                  <span>Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium transition cursor-pointer ${
                    viewMode === "table"
                      ? "bg-card text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Table View"
                >
                  <List size={13} />
                  <span>Table</span>
                </button>
              </div>
            </div>
          </div>

          {/* Search Filter Bar */}
          {dashboard.workers.length > 0 && (
            <div className="mt-3.5 flex items-center rounded-lg bg-secondary/40 px-3 py-1.5 focus-within:bg-secondary">
              <Search size={14} className="mr-2 text-muted-foreground shrink-0" />
              <input
                value={workerSearch}
                onChange={(e) => setWorkerSearch(e.target.value)}
                placeholder="Search workers by name, trade, phone or locality..."
                className="w-full bg-transparent text-xs text-foreground outline-hidden placeholder:text-muted-foreground"
              />
              {workerSearch && (
                <button
                  type="button"
                  onClick={() => setWorkerSearch("")}
                  className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {/* Render Workers */}
          {filteredWorkers.length > 0 ? (
            viewMode === "cards" ? (
              /* Rich Card Grid: Shows all details */
              <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
                {filteredWorkers.map((w) => {
                  const servicesList = Array.isArray(w.services)
                    ? w.services
                    : typeof w.services === "string" && w.services
                      ? w.services.split(",").map((s) => s.trim())
                      : [];

                  return (
                    <div
                      key={w.id}
                      className="group flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition hover:border-foreground/30 hover:shadow-2xs"
                    >
                      <div>
                        {/* Top: Avatar, Name, Verification & Category */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary font-bold text-foreground text-sm">
                              {w.photo_url ? (
                                <img src={w.photo_url} alt={w.name} className="h-full w-full object-cover" />
                              ) : (
                                w.initials || w.name?.slice(0, 2).toUpperCase()
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h3 className="text-sm font-bold text-foreground">{w.name}</h3>
                                {w.phone_verified && (
                                  <span title="Verified Worker">
                                    <BadgeCheck size={14} className="text-emerald-500" />
                                  </span>
                                )}
                              </div>
                              <span className="inline-block rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                                {w.category || "General Specialist"}
                              </span>
                            </div>
                          </div>

                          {/* Availability Badge */}
                          {w.available_today ? (
                            <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Available
                            </span>
                          ) : (
                            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                              Off-duty
                            </span>
                          )}
                        </div>

                        {/* Middle: Details Grid */}
                        <div className="mt-3.5 grid grid-cols-2 gap-2 text-xs">
                          {/* Phone */}
                          <div className="rounded-lg bg-secondary/30 p-2">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                              <Phone size={10} /> Phone
                            </span>
                            <p className="mt-0.5 font-semibold text-foreground select-all">
                              {w.phone ? `+91 ${w.phone}` : "No phone listed"}
                            </p>
                          </div>

                          {/* Locality */}
                          <div className="rounded-lg bg-secondary/30 p-2">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                              <MapPin size={10} /> Location
                            </span>
                            <p className="mt-0.5 font-semibold text-foreground truncate">
                              {w.locality || "All locations"}
                            </p>
                          </div>

                          {/* Experience */}
                          <div className="rounded-lg bg-secondary/30 p-2">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                              <Briefcase size={10} /> Experience
                            </span>
                            <p className="mt-0.5 font-semibold text-foreground">
                              {w.experience ? `${w.experience} yrs` : "Experienced"}
                            </p>
                          </div>

                          {/* Inquiries */}
                          <div className="rounded-lg bg-secondary/30 p-2">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                              <MessageSquare size={10} /> Inquiries
                            </span>
                            <p className="mt-0.5 font-semibold text-foreground">
                              {w.contact_events_count || 0} leads
                            </p>
                          </div>
                        </div>

                        {/* Services List */}
                        {servicesList.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap gap-1">
                            {servicesList.slice(0, 3).map((s, idx) => (
                              <span
                                key={idx}
                                className="rounded-md border border-border/80 bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground"
                              >
                                {s}
                              </span>
                            ))}
                            {servicesList.length > 3 && (
                              <span className="rounded-md border border-border/80 bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                +{servicesList.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Bottom Action Buttons */}
                      <div className="mt-4 flex items-center gap-1.5 border-t border-border/70 pt-3">
                        {w.phone && (
                          <a
                            href={`tel:+91${w.phone}`}
                            className="flex-1 inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-border bg-secondary px-2 text-xs font-semibold text-foreground transition hover:bg-foreground hover:text-background"
                            title="Call worker"
                          >
                            <Phone size={12} />
                            <span>Call</span>
                          </a>
                        )}

                        {w.phone && (
                          <a
                            href={`https://wa.me/91${w.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                              `Hello ${w.name}, connecting from ${dashboard.agency.name}.`,
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 inline-flex h-8 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                            title="WhatsApp worker"
                          >
                            <MessageCircle size={12} />
                            <span>WhatsApp</span>
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedWorker(w)}
                          className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-border bg-card px-2 text-xs font-semibold text-foreground transition hover:bg-secondary cursor-pointer"
                          title="View all worker details"
                        >
                          <Eye size={12} />
                          <span>Details</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setWorkerToRemove(w)}
                          className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-destructive/30 bg-destructive/5 px-2 text-xs font-medium text-destructive transition hover:bg-destructive hover:text-destructive-foreground cursor-pointer"
                          title={`Remove ${w.name} from agency roster`}
                        >
                          <UserMinus size={13} />
                          <span>Remove</span>
                        </button>

                        <Link
                          to={`/worker?worker=${w.id}`}
                          className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-card px-2 text-muted-foreground transition hover:text-foreground"
                          title="Public Profile"
                        >
                          <ExternalLink size={12} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Detailed Table View */
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[750px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="pb-2.5 font-semibold">Worker</th>
                      <th className="pb-2.5 font-semibold">Contact Phone</th>
                      <th className="pb-2.5 font-semibold">Category & Services</th>
                      <th className="pb-2.5 font-semibold">Status</th>
                      <th className="pb-2.5 font-semibold">Experience</th>
                      <th className="pb-2.5 font-semibold">Inquiries</th>
                      <th className="pb-2.5 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredWorkers.map((w) => (
                      <tr key={w.id} className="text-foreground hover:bg-secondary/20">
                        <td className="py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary font-bold text-foreground text-xs">
                              {w.photo_url ? (
                                <img src={w.photo_url} alt={w.name} className="h-full w-full object-cover" />
                              ) : (
                                w.initials || w.name?.slice(0, 2).toUpperCase()
                              )}
                            </div>
                            <div>
                              <p className="font-bold flex items-center gap-1">
                                {w.name}
                                {w.phone_verified && <BadgeCheck size={12} className="text-emerald-500" />}
                              </p>
                              <p className="text-[11px] text-muted-foreground">{w.locality || "—"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 font-mono font-medium">
                          {w.phone ? (
                            <a href={`tel:+91${w.phone}`} className="hover:underline text-foreground">
                              +91 {w.phone}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3">
                          <span className="font-semibold text-foreground">{w.category || "General"}</span>
                          {Array.isArray(w.services) && w.services.length > 0 && (
                            <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                              {w.services.join(", ")}
                            </p>
                          )}
                        </td>
                        <td className="py-3">
                          {w.available_today ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-500">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Available
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">Off-duty</span>
                          )}
                        </td>
                        <td className="py-3 text-muted-foreground">{w.experience ? `${w.experience} yrs` : "—"}</td>
                        <td className="py-3 font-semibold">{w.contact_events_count || 0}</td>
                        <td className="py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setSelectedWorker(w)}
                              className="rounded-md border border-border bg-secondary px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-foreground hover:text-background cursor-pointer"
                            >
                              Details
                            </button>
                            {w.phone && (
                              <a
                                href={`https://wa.me/91${w.phone.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                              >
                                WhatsApp
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => setWorkerToRemove(w)}
                              className="rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1 text-[11px] font-medium text-destructive hover:bg-destructive hover:text-destructive-foreground cursor-pointer"
                              title="Remove from roster"
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              {workerSearch
                ? "No workers matching your search."
                : "No workers linked yet. Share your agency invite code to add workers."}
            </div>
          )}
        </section>

        {/* Active Project Assignments Section */}
        <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">Active Project Assignments</h2>
                <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-xs font-semibold text-foreground">
                  {projects.length} assigned
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage ongoing client contracts, assigned team specialists, and delivery timelines.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowNewProjectModal(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-foreground px-3.5 text-xs font-semibold text-background transition hover:opacity-90 cursor-pointer self-start sm:self-auto"
            >
              <Plus size={14} />
              <span>Assign New Project</span>
            </button>
          </div>

          {projectsLoading ? (
            <div className="mt-4 flex items-center justify-center p-8 text-xs text-muted-foreground">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-foreground border-t-transparent mr-2" />
              Loading project assignments...
            </div>
          ) : projects.length > 0 ? (
            <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition hover:border-foreground/30 hover:shadow-2xs"
                >
                  <div>
                    {/* Top: Project Title & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="inline-block rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary uppercase tracking-wide">
                          {p.service || "Contract"}
                        </span>
                        <h3 className="mt-1 text-sm font-bold text-foreground">{p.title}</h3>
                      </div>
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 capitalize">
                        {p.status.replace("_", " ")}
                      </span>
                    </div>

                    {/* Details Grid */}
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      {/* Client */}
                      <div className="rounded-lg bg-secondary/30 p-2">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Client</span>
                        <p className="mt-0.5 font-semibold text-foreground truncate">{p.client_name}</p>
                        {p.client_phone && (
                          <a
                            href={`tel:${p.client_phone}`}
                            className="mt-0.5 block text-[11px] text-muted-foreground hover:underline"
                          >
                            {p.client_phone}
                          </a>
                        )}
                      </div>

                      {/* Assigned Specialist */}
                      <div className="rounded-lg bg-secondary/30 p-2">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Assigned To</span>
                        <p className="mt-0.5 font-semibold text-foreground truncate">{p.worker_name}</p>
                        <span className="text-[10px] text-muted-foreground">Specialist</span>
                      </div>

                      {/* Location */}
                      {p.location && (
                        <div className="rounded-lg bg-secondary/30 p-2">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                            <MapPin size={10} /> Location
                          </span>
                          <p className="mt-0.5 font-semibold text-foreground truncate">{p.location}</p>
                        </div>
                      )}

                      {/* Due Date */}
                      {p.deadline && (
                        <div className="rounded-lg bg-secondary/30 p-2">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                            <Clock size={10} /> Target Date
                          </span>
                          <p className="mt-0.5 font-semibold text-foreground truncate">{p.deadline}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-3.5 flex items-center justify-between border-t border-border/70 pt-2.5">
                    <span className="text-[10px] text-muted-foreground">
                      Created {new Date(p.created_at).toLocaleDateString()}
                    </span>

                    <button
                      type="button"
                      onClick={() => setProjectToDelete(p)}
                      className="inline-flex h-7 items-center gap-1 rounded-md border border-destructive/30 bg-destructive/5 px-2 text-xs font-semibold text-destructive transition hover:bg-destructive hover:text-destructive-foreground cursor-pointer"
                      title="Delete project assignment"
                    >
                      <Trash2 size={12} />
                      <span>Delete Assignment</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              No active project assignments. Click "Assign New Project" to dispatch your specialists to client sites.
            </div>
          )}
        </section>

        {/* Callback Requests Section */}
        <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center justify-between border-b border-border/80 pb-3">
            <div>
              <h2 className="text-base font-bold text-foreground">Client Callback Requests</h2>
              <p className="text-xs text-muted-foreground">Direct service leads submitted by customers for your workers.</p>
            </div>
            <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-xs font-semibold text-foreground">
              {pending} pending
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
                        <a href={`tel:${c.client_phone}`} className="hover:underline">
                          {c.client_phone}
                        </a>
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
                      <a
                        href={`tel:${c.client_phone}`}
                        className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground transition hover:bg-secondary"
                      >
                        Call Client
                      </a>
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
                          Mark Resolved
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              No callback requests received yet. Client inquiries will appear here.
            </div>
          )}
        </section>

        {/* Agency Profile Details */}
        <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-base font-bold text-foreground">Agency Information</h2>
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
                <span className="truncate">{categories.length ? categories.join(", ") : "All Trades"}</span>
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

      {/* Worker Full Details Modal */}
      {selectedWorker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary font-bold text-foreground text-base">
                  {selectedWorker.photo_url ? (
                    <img src={selectedWorker.photo_url} alt={selectedWorker.name} className="h-full w-full object-cover" />
                  ) : (
                    selectedWorker.initials || selectedWorker.name?.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-bold text-foreground">{selectedWorker.name}</h3>
                    {selectedWorker.phone_verified && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        <BadgeCheck size={11} /> Verified
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-primary">{selectedWorker.category || "Specialist"}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedWorker(null)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="mt-4 space-y-4 text-xs">
              {/* Quick Contact Bar */}
              <div className="grid grid-cols-2 gap-2">
                {selectedWorker.phone && (
                  <a
                    href={`tel:+91${selectedWorker.phone}`}
                    className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary font-semibold text-foreground hover:bg-foreground hover:text-background transition"
                  >
                    <Phone size={13} />
                    <span>Call (+91 {selectedWorker.phone})</span>
                  </a>
                )}
                {selectedWorker.phone && (
                  <a
                    href={`https://wa.me/91${selectedWorker.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                      `Hello ${selectedWorker.name}, this is your agency manager from ${dashboard.agency.name}.`,
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 font-semibold text-white hover:bg-emerald-700 transition"
                  >
                    <MessageCircle size={13} />
                    <span>WhatsApp</span>
                  </a>
                )}
              </div>

              {/* Complete Information Grid */}
              <div className="grid grid-cols-2 gap-2.5 rounded-xl border border-border bg-secondary/20 p-3.5">
                <div>
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Mobile Phone</span>
                  <p className="mt-0.5 font-semibold text-foreground select-all">
                    {selectedWorker.phone ? `+91 ${selectedWorker.phone}` : "Not listed"}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Service Locality</span>
                  <p className="mt-0.5 font-semibold text-foreground">
                    {selectedWorker.locality || "All local areas"}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Work Experience</span>
                  <p className="mt-0.5 font-semibold text-foreground">
                    {selectedWorker.experience ? `${selectedWorker.experience} Years` : "Experienced"}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Today's Availability</span>
                  <p className="mt-0.5 font-semibold">
                    {selectedWorker.available_today ? (
                      <span className="text-emerald-500 font-bold">● Available Today</span>
                    ) : (
                      <span className="text-muted-foreground">Off-duty</span>
                    )}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Customer Inquiries</span>
                  <p className="mt-0.5 font-semibold text-foreground">
                    {selectedWorker.contact_events_count || 0} direct leads
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Urgent Work Ready</span>
                  <p className="mt-0.5 font-semibold text-foreground">
                    {selectedWorker.urgent_today ? "Yes (Emergency jobs)" : "Standard jobs"}
                  </p>
                </div>
              </div>

              {/* Bio / About */}
              {(selectedWorker.about || selectedWorker.bio) && (
                <div className="rounded-xl border border-border bg-secondary/10 p-3.5">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">About & Bio</span>
                  <p className="mt-1 text-xs leading-relaxed text-foreground">
                    {selectedWorker.about || selectedWorker.bio}
                  </p>
                </div>
              )}

              {/* Full Services List */}
              {selectedWorker.services && (
                <div className="rounded-xl border border-border bg-secondary/10 p-3.5">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">All Services Offered</span>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(Array.isArray(selectedWorker.services)
                      ? selectedWorker.services
                      : String(selectedWorker.services).split(",")
                    ).map((s, idx) => (
                      <span
                        key={idx}
                        className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground"
                      >
                        {String(s).trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Public Link */}
              <div className="pt-2 flex justify-end gap-2">
                <Link
                  to={`/worker?worker=${selectedWorker.id}`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-foreground px-4 text-xs font-semibold text-background hover:opacity-90 transition"
                >
                  <ExternalLink size={13} />
                  <span>View Public Profile Page</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Project Assignment Modal */}
      {showNewProjectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3.5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FolderKanban size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Assign Project</h3>
                  <p className="text-[11px] text-muted-foreground">Create and dispatch an active job assignment</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewProjectModal(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-foreground">Project / Job Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Commercial 3-Phase Wiring & Panel Setup"
                  value={newProjectForm.title}
                  onChange={(e) => setNewProjectForm({ ...newProjectForm, title: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-hidden focus:border-foreground"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-foreground">Assign Specialist *</label>
                <select
                  required
                  value={newProjectForm.worker_id}
                  onChange={(e) => {
                    const sel = dashboard?.workers.find((w) => w.id === e.target.value);
                    setNewProjectForm({
                      ...newProjectForm,
                      worker_id: e.target.value,
                      service: sel?.category || newProjectForm.service,
                    });
                  }}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-hidden focus:border-foreground cursor-pointer"
                >
                  <option value="">Select a roster specialist...</option>
                  {dashboard?.workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} — {w.category || "Specialist"} ({w.locality || "All locations"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-foreground">Client Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Client or Company Name"
                    value={newProjectForm.client_name}
                    onChange={(e) => setNewProjectForm({ ...newProjectForm, client_name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-hidden focus:border-foreground"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-foreground">Client Phone</label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={newProjectForm.client_phone}
                    onChange={(e) => setNewProjectForm({ ...newProjectForm, client_phone: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-hidden focus:border-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-foreground">Job Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Indiranagar 100ft Rd"
                    value={newProjectForm.location}
                    onChange={(e) => setNewProjectForm({ ...newProjectForm, location: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-hidden focus:border-foreground"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-foreground">Target Deadline</label>
                  <input
                    type="text"
                    placeholder="e.g. By end of week / 3 Days"
                    value={newProjectForm.deadline}
                    onChange={(e) => setNewProjectForm({ ...newProjectForm, deadline: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-hidden focus:border-foreground"
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewProjectModal(false)}
                  className="rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-secondary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newProjectLoading || !newProjectForm.title || !newProjectForm.worker_id || !newProjectForm.client_name}
                  className="rounded-lg bg-foreground px-4 py-2 text-xs font-semibold text-background hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {newProjectLoading ? "Creating..." : "Create Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Remove Worker from Agency Roster */}
      <ConfirmDialog
        isOpen={Boolean(workerToRemove)}
        title="Remove Specialist from Agency Roster"
        description={`Are you sure you want to remove "${workerToRemove?.name}" from ${dashboard?.agency.name || "your agency"}'s roster? They will be unlinked from your team, but their independent specialist profile will remain safe.`}
        itemDetails={
          workerToRemove
            ? {
                label: "Specialist",
                value: workerToRemove.name,
                subValue: `${workerToRemove.category || "Specialist"} · ${workerToRemove.phone ? `+91 ${workerToRemove.phone}` : "No phone"}`,
              }
            : undefined
        }
        confirmText="Remove Specialist"
        cancelText="Keep in Roster"
        variant="danger"
        iconType="remove-user"
        loading={removeWorkerLoading}
        onConfirm={handleConfirmRemoveWorker}
        onClose={() => {
          if (!removeWorkerLoading) {
            setWorkerToRemove(null);
          }
        }}
      />

      {/* Confirmation Dialog: Delete Active Project Assignment */}
      <ConfirmDialog
        isOpen={Boolean(projectToDelete)}
        title="Delete Active Project Assignment"
        description={`Are you sure you want to delete the active assignment "${projectToDelete?.title}" for client "${projectToDelete?.client_name}"? This will cancel the recorded assignment.`}
        itemDetails={
          projectToDelete
            ? {
                label: "Project Assignment",
                value: projectToDelete.title,
                subValue: `Client: ${projectToDelete.client_name} · Assigned: ${projectToDelete.worker_name}`,
              }
            : undefined
        }
        confirmText="Delete Assignment"
        cancelText="Keep Project"
        variant="danger"
        iconType="delete"
        loading={deleteProjectLoading}
        onConfirm={handleConfirmDeleteProject}
        onClose={() => {
          if (!deleteProjectLoading) {
            setProjectToDelete(null);
          }
        }}
      />
    </PageShell>
  );
}
