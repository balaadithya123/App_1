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
import {
  CompactSectionSkeleton,
  DashboardSkeleton,
} from "@/components/PageSkeletons";

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
  stats: {
    linkedWorkers: number;
    whatsappClicks7d: number;
    callbacks7d: number;
  };
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
  const [bannerMessage, setBannerMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

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
  const [projectToDelete, setProjectToDelete] =
    useState<ProjectAssignment | null>(null);
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
      const res = await fetch(
        `/api/agencies/projects?agencyId=${encodeURIComponent(agencyId || "agency-admin")}`,
      );
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
    const isAdmin =
      session.user.app_metadata?.is_admin === true ||
      role === "admin" ||
      email === "pgbalaadithya@gmail.com";
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
      if (!r.ok)
        throw new Error(result?.message || "Unable to load agency dashboard.");
      if (!result?.agency?.agency_code) {
        const { data: a } = await supabase
          .from("agencies")
          .select(
            "agency_code,name,location,service_locations,categories,team_size_band,phone,email,verified,description,logo_url",
          )
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (a)
          result.agency = {
            ...result.agency,
            ...a,
            agency_code: a.agency_code || result.agency.agency_code,
          };
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

  const updateStatus = async (
    id: string,
    status: "new" | "contacted" | "closed",
  ) => {
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
                callbacks: prev.callbacks.map((c) =>
                  c.id === id ? { ...c, status } : c,
                ),
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
        throw new Error(
          data?.message || "Failed to remove worker from agency roster.",
        );
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
      const res = await fetch(
        `/api/agencies/projects/${encodeURIComponent(projectToDelete.id)}`,
        {
          method: "DELETE",
        },
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          data?.message || "Failed to delete project assignment.",
        );
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
    if (
      !newProjectForm.title.trim() ||
      !newProjectForm.client_name.trim() ||
      !newProjectForm.worker_id
    ) {
      return;
    }
    setNewProjectLoading(true);
    try {
      const assignedWorker = dashboard?.workers.find(
        (w) => w.id === newProjectForm.worker_id,
      );
      const res = await fetch("/api/agencies/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newProjectForm,
          worker_name: assignedWorker?.name || "Specialist",
          service:
            newProjectForm.service ||
            assignedWorker?.category ||
            "General Service",
          agency_id: dashboard?.agency?.id || "agency-admin",
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          data?.message || "Unable to create project assignment.",
        );
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
      const serv = Array.isArray(w.services)
        ? w.services.join(" ").toLowerCase()
        : String(w.services || "").toLowerCase();
      return (
        name.includes(q) ||
        cat.includes(q) ||
        loc.includes(q) ||
        ph.includes(q) ||
        serv.includes(q)
      );
    });
  }, [dashboard?.workers, workerSearch]);

  if (loading) {
    return (
      <PageShell hideBack hideHome containerWidth="lg">
        <DashboardSkeleton statCount={4} cardCount={2} />
      </PageShell>
    );
  }

  if (notAnAgency) {
    return (
      <PageShell hideBack hideHome containerWidth="lg">
        <div className="mx-auto max-w-md rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-7 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C]">
            <Building2 size={24} />
          </div>
          <h1 className="mt-4 text-lg font-extrabold tracking-tight text-[#141210] dark:text-[#FAFAFA]">
            Agency Portal
          </h1>
          <p className="mt-1.5 text-xs leading-relaxed text-[#6B645F] dark:text-[#9E958F]">
            This account is currently registered as a {userRole || "client"}. To
            manage a team of workers, please register an agency profile.
          </p>
          <div className="mt-5 flex flex-col gap-2.5">
            <Link
              to="/agency/register"
              className="inline-flex h-10 items-center justify-center rounded-full bg-[#F4512C] px-5 text-xs font-semibold text-white hover:bg-[#E04320] transition"
            >
              Register Agency Profile
            </Link>
            <Link
              to="/"
              className="inline-flex h-10 items-center justify-center rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-5 text-xs font-semibold text-[#141210] dark:text-[#FAFAFA] hover:border-[#F4512C]/50 transition"
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
      <PageShell hideBack hideHome containerWidth="lg">
        <div className="mx-auto max-w-md rounded-[24px] border border-rose-500/20 bg-rose-500/5 p-7 text-center">
          <ShieldAlert size={36} className="mx-auto text-rose-500" />
          <h1 className="mt-3 text-base font-extrabold text-[#141210] dark:text-[#FAFAFA]">
            Error Loading Dashboard
          </h1>
          <p className="mt-1 text-xs text-[#6B645F] dark:text-[#9E958F]">
            {error || "Unable to retrieve agency information."}
          </p>
          <button
            onClick={() => {
              setLoading(true);
              setError("");
              void load();
            }}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-[#F4512C] px-5 text-xs font-semibold text-white hover:bg-[#E04320] transition cursor-pointer"
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
    <PageShell hideBack hideHome containerWidth="lg">
      <div className="space-y-6">
        {/* Agency Profile Hero Header Card */}
        <section className="relative overflow-hidden rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-gradient-to-br from-[#FFF4EF] via-[#FAF8F5] to-[#F5EAE2] dark:from-[#261B16] dark:via-[#1C1512] dark:to-[#15110F] p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#F4512C] font-bold text-white text-xl shadow-sm">
                {dashboard.agency.logo_url ? (
                  <img
                    src={dashboard.agency.logo_url}
                    alt={dashboard.agency.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Building2 size={26} className="text-white" />
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#F4512C]">
                    Agency Management Hub
                  </span>
                  {dashboard.agency.verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#0F8A73]/10 border border-[#0F8A73]/30 px-2.5 py-0.5 text-[11px] font-semibold text-[#0F8A73]">
                      <BadgeCheck size={13} /> Verified Agency
                    </span>
                  )}
                </div>
                <h1 className="mt-1 text-xl font-extrabold tracking-tight text-[#141210] dark:text-[#FAFAFA] sm:text-2xl">
                  {dashboard.agency.name}
                </h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-[#6B645F] dark:text-[#9E958F]">
                  {dashboard.agency.location && (
                    <span className="flex items-center gap-1">
                      <MapPin size={12} className="text-[#F4512C]" /> {dashboard.agency.location}
                    </span>
                  )}
                  {dashboard.agency.phone && (
                    <span className="flex items-center gap-1">
                      <Phone size={12} className="text-[#F4512C]" /> {dashboard.agency.phone}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users size={12} className="text-[#F4512C]" /> {dashboard.workers.length} Team Members
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                to={`/agency/${dashboard.agency.id}`}
                className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[#EAE2DC] dark:border-white/10 bg-white/80 dark:bg-[#161514]/80 px-4 text-xs font-semibold text-[#141210] dark:text-[#FAFAFA] transition hover:border-[#F4512C]/50"
              >
                <ExternalLink size={13} />
                <span>Public Page</span>
              </Link>
              <Link
                to="/agency/edit"
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#141210] text-white dark:bg-white dark:text-[#11100F] px-5 text-xs font-semibold transition hover:opacity-90"
              >
                <span>Edit Profile</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Notification Banner */}
        {bannerMessage && (
          <div
            className={`flex items-center justify-between rounded-2xl border p-4 text-xs font-medium ${
              bannerMessage.type === "success"
                ? "border-[#0F8A73]/30 bg-[#0F8A73]/10 text-[#0F8A73]"
                : "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
            }`}
          >
            <div className="flex items-center gap-2">
              {bannerMessage.type === "success" ? (
                <CheckCircle2 size={16} className="text-[#0F8A73] shrink-0" />
              ) : (
                <AlertTriangle size={16} className="text-rose-500 shrink-0" />
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
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="rounded-[20px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 transition hover:border-[#F4512C]/40">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#6B645F] dark:text-[#9E958F]">
                Total Workers
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C]">
                <Users size={15} />
              </span>
            </div>
            <p className="mt-2 text-3xl font-extrabold text-[#141210] dark:text-[#FAFAFA]">
              {dashboard.stats.linkedWorkers}
            </p>
            <div className="mt-1.5 text-[11px] text-[#6B645F] dark:text-[#9E958F]">
              Linked under agency code
            </div>
          </div>

          <div className="rounded-[20px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 transition hover:border-[#F4512C]/40">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#6B645F] dark:text-[#9E958F]">
                Client Contacts (7d)
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C]">
                <MessageCircle size={15} />
              </span>
            </div>
            <p className="mt-2 text-3xl font-extrabold text-[#141210] dark:text-[#FAFAFA]">
              {dashboard.stats.whatsappClicks7d}
            </p>
            <div className="mt-1.5 text-[11px] text-[#6B645F] dark:text-[#9E958F]">
              Direct customer inquiries
            </div>
          </div>

          <div className="rounded-[20px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 transition hover:border-[#F4512C]/40">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#6B645F] dark:text-[#9E958F]">
                Callbacks (7d)
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C]">
                <Phone size={15} />
              </span>
            </div>
            <p className="mt-2 text-3xl font-extrabold text-[#141210] dark:text-[#FAFAFA]">
              {dashboard.stats.callbacks7d}
            </p>
            <div className="mt-1.5 text-[11px] text-[#6B645F] dark:text-[#9E958F]">
              {pending} pending resolution
            </div>
          </div>
        </section>

        {/* Worker Recruitment / Invite Code Card */}
        <section className="rounded-[20px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#F4512C]">
                Recruit & Link Workers
              </span>
              <h2 className="mt-0.5 text-base font-extrabold text-[#141210] dark:text-[#FAFAFA]">
                Your Agency Invite Code
              </h2>
            </div>
            <span className="rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#F5EFEA] dark:bg-[#242220] px-3 py-1 text-[11px] font-semibold text-[#6B645F] dark:text-[#9E958F]">
              Share with workers
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="flex h-11 flex-1 items-center justify-center rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-4 font-mono text-lg font-bold tracking-widest text-[#141210] dark:text-[#FAFAFA] select-all">
              {dashboard.agency.agency_code || "CODE UNAVAILABLE"}
            </div>

            <button
              type="button"
              onClick={() => copy("code", dashboard.agency.agency_code || "")}
              disabled={!dashboard.agency.agency_code}
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-5 text-xs font-semibold text-[#141210] dark:text-[#FAFAFA] transition hover:border-[#F4512C]/50 disabled:opacity-50 cursor-pointer"
            >
              {copied === "code" ? (
                <Check size={14} className="text-[#0F8A73]" />
              ) : (
                <Copy size={14} />
              )}
              <span>{copied === "code" ? "Code Copied!" : "Copy Code"}</span>
            </button>

            <button
              type="button"
              onClick={() => copy("link", shareUrl)}
              disabled={!shareUrl}
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-[#F4512C] hover:bg-[#E04320] text-white px-5 text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
            >
              {copied === "link" ? (
                <Check size={14} />
              ) : (
                <ExternalLink size={14} />
              )}
              <span>
                {copied === "link" ? "Link Copied!" : "Copy Join Link"}
              </span>
            </button>
          </div>
          <p className="mt-2.5 text-[11px] text-[#6B645F] dark:text-[#9E958F]">
            Workers enter this code during registration or from their dashboard
            to link under your agency.
          </p>
        </section>

        {/* Complete Worker Roster Section */}
        <section className="rounded-[20px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#EAE2DC] dark:border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-[#141210] dark:text-[#FAFAFA]">
                  Worker Team Details
                </h2>
                <span className="rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#F5EFEA] dark:bg-[#242220] px-2.5 py-0.5 text-xs font-semibold text-[#141210] dark:text-[#FAFAFA]">
                  {dashboard.workers.length} active
                </span>
              </div>
              <p className="text-xs text-[#6B645F] dark:text-[#9E958F] mt-0.5">
                Full profile details, direct phone contacts, skill
                specializations, and daily status of your workers.
              </p>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("cards")}
                  className={`flex h-7 items-center gap-1 rounded-full px-3 text-xs font-semibold transition cursor-pointer ${
                    viewMode === "cards"
                      ? "bg-[#141210] text-white dark:bg-white dark:text-[#11100F]"
                      : "text-[#6B645F] dark:text-[#9E958F] hover:text-[#141210] dark:hover:text-[#FAFAFA]"
                  }`}
                  title="Card View"
                >
                  <Grid size={13} />
                  <span>Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`flex h-7 items-center gap-1 rounded-full px-3 text-xs font-semibold transition cursor-pointer ${
                    viewMode === "table"
                      ? "bg-[#141210] text-white dark:bg-white dark:text-[#11100F]"
                      : "text-[#6B645F] dark:text-[#9E958F] hover:text-[#141210] dark:hover:text-[#FAFAFA]"
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
            <div className="mt-4 flex items-center rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-3.5 py-2 focus-within:border-[#F4512C]">
              <Search
                size={14}
                className="mr-2.5 text-[#6B645F] dark:text-[#9E958F] shrink-0"
              />
              <input
                value={workerSearch}
                onChange={(e) => setWorkerSearch(e.target.value)}
                placeholder="Search workers by name, trade, phone or locality..."
                className="w-full bg-transparent text-xs text-[#141210] dark:text-[#FAFAFA] outline-hidden placeholder:text-[#6B645F] dark:placeholder:text-[#9E958F]"
              />
              {workerSearch && (
                <button
                  type="button"
                  onClick={() => setWorkerSearch("")}
                  className="text-xs font-semibold text-[#F4512C] hover:underline cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {/* Render Workers */}
          {filteredWorkers.length > 0 ? (
            viewMode === "cards" ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {filteredWorkers.map((w) => {
                  const servicesList = Array.isArray(w.services)
                    ? w.services
                    : typeof w.services === "string" && w.services
                      ? w.services.split(",").map((s) => s.trim())
                      : [];

                  return (
                    <div
                      key={w.id}
                      className="group flex flex-col justify-between rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5]/60 dark:bg-[#0B0A09]/60 p-4 transition hover:border-[#F4512C]/50"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FCEAE4] dark:bg-[#3A2018] font-bold text-[#F4512C] text-sm">
                              {w.photo_url ? (
                                <img
                                  src={w.photo_url}
                                  alt={w.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                w.initials || w.name?.slice(0, 2).toUpperCase()
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h3 className="text-sm font-bold text-[#141210] dark:text-[#FAFAFA]">
                                  {w.name}
                                </h3>
                                {w.phone_verified && (
                                  <span title="Verified Worker">
                                    <BadgeCheck
                                      size={14}
                                      className="text-[#0F8A73]"
                                    />
                                  </span>
                                )}
                              </div>
                              <span className="mt-0.5 inline-block rounded-md bg-[#F5EFEA] dark:bg-[#242220] px-2 py-0.5 text-[11px] font-semibold text-[#6B645F] dark:text-[#9E958F]">
                                {w.category || "General Specialist"}
                              </span>
                            </div>
                          </div>

                          {w.available_today ? (
                            <span className="flex items-center gap-1 rounded-full bg-[#0F8A73]/10 border border-[#0F8A73]/30 px-2.5 py-0.5 text-[10px] font-bold text-[#0F8A73]">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#0F8A73] animate-pulse" />
                              Available
                            </span>
                          ) : (
                            <span className="rounded-full bg-[#F5EFEA] dark:bg-[#242220] border border-[#EAE2DC] dark:border-white/10 px-2.5 py-0.5 text-[10px] font-medium text-[#6B645F] dark:text-[#9E958F]">
                              Off-duty
                            </span>
                          )}
                        </div>

                        <div className="mt-3.5 grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-2.5">
                            <span className="text-[10px] uppercase font-bold text-[#6B645F] dark:text-[#9E958F] flex items-center gap-1">
                              <Phone size={10} className="text-[#F4512C]" /> Phone
                            </span>
                            <p className="mt-0.5 font-semibold text-[#141210] dark:text-[#FAFAFA] select-all">
                              {w.phone ? `+91 ${w.phone}` : "No phone listed"}
                            </p>
                          </div>

                          <div className="rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-2.5">
                            <span className="text-[10px] uppercase font-bold text-[#6B645F] dark:text-[#9E958F] flex items-center gap-1">
                              <MapPin size={10} className="text-[#F4512C]" /> Location
                            </span>
                            <p className="mt-0.5 font-semibold text-[#141210] dark:text-[#FAFAFA] truncate">
                              {w.locality || "All locations"}
                            </p>
                          </div>

                          <div className="rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-2.5">
                            <span className="text-[10px] uppercase font-bold text-[#6B645F] dark:text-[#9E958F] flex items-center gap-1">
                              <Briefcase size={10} className="text-[#F4512C]" /> Experience
                            </span>
                            <p className="mt-0.5 font-semibold text-[#141210] dark:text-[#FAFAFA]">
                              {w.experience
                                ? `${w.experience} yrs`
                                : "Experienced"}
                            </p>
                          </div>

                          <div className="rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-2.5">
                            <span className="text-[10px] uppercase font-bold text-[#6B645F] dark:text-[#9E958F] flex items-center gap-1">
                              <MessageSquare size={10} className="text-[#F4512C]" /> Inquiries
                            </span>
                            <p className="mt-0.5 font-semibold text-[#141210] dark:text-[#FAFAFA]">
                              {w.contact_events_count || 0} leads
                            </p>
                          </div>
                        </div>

                        {servicesList.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap gap-1">
                            {servicesList.slice(0, 3).map((s, idx) => (
                              <span
                                key={idx}
                                className="rounded-md border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] px-2 py-0.5 text-[10px] text-[#6B645F] dark:text-[#9E958F]"
                              >
                                {s}
                              </span>
                            ))}
                            {servicesList.length > 3 && (
                              <span className="rounded-md border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] px-2 py-0.5 text-[10px] text-[#6B645F] dark:text-[#9E958F]">
                                +{servicesList.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-[#EAE2DC] dark:border-white/10 pt-3">
                        {w.phone && (
                          <a
                            href={`tel:+91${w.phone}`}
                            className="flex-1 inline-flex h-8 items-center justify-center gap-1 rounded-full bg-[#141210] text-white dark:bg-white dark:text-[#11100F] px-2.5 text-xs font-semibold transition hover:opacity-90"
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
                            className="flex-1 inline-flex h-8 items-center justify-center gap-1 rounded-full bg-[#0F8A73] hover:bg-[#0B6E5B] px-2.5 text-xs font-semibold text-white transition"
                            title="WhatsApp worker"
                          >
                            <MessageCircle size={12} />
                            <span>WhatsApp</span>
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedWorker(w)}
                          className="inline-flex h-8 items-center justify-center gap-1 rounded-full border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] px-2.5 text-xs font-semibold text-[#141210] dark:text-[#FAFAFA] transition hover:border-[#F4512C]/50 cursor-pointer"
                          title="View all worker details"
                        >
                          <Eye size={12} />
                          <span>Details</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setWorkerToRemove(w)}
                          className="inline-flex h-8 items-center justify-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 text-xs font-medium text-rose-600 dark:text-rose-400 transition hover:bg-rose-600 hover:text-white cursor-pointer"
                          title={`Remove ${w.name} from agency roster`}
                        >
                          <UserMinus size={13} />
                          <span>Remove</span>
                        </button>

                        <Link
                          to={`/worker?worker=${w.id}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] text-[#6B645F] dark:text-[#9E958F] transition hover:text-[#F4512C]"
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
                    <tr className="border-b border-[#EAE2DC] dark:border-white/10 text-[#6B645F] dark:text-[#9E958F]">
                      <th className="pb-2.5 font-semibold">Worker</th>
                      <th className="pb-2.5 font-semibold">Contact Phone</th>
                      <th className="pb-2.5 font-semibold">
                        Category & Services
                      </th>
                      <th className="pb-2.5 font-semibold">Status</th>
                      <th className="pb-2.5 font-semibold">Experience</th>
                      <th className="pb-2.5 font-semibold">Inquiries</th>
                      <th className="pb-2.5 font-semibold text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAE2DC] dark:divide-white/10">
                    {filteredWorkers.map((w) => (
                      <tr
                        key={w.id}
                        className="text-[#141210] dark:text-[#FAFAFA] hover:bg-[#FAF8F5] dark:hover:bg-[#0B0A09]/50"
                      >
                        <td className="py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FCEAE4] dark:bg-[#3A2018] font-bold text-[#F4512C] text-xs">
                              {w.photo_url ? (
                                <img
                                  src={w.photo_url}
                                  alt={w.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                w.initials || w.name?.slice(0, 2).toUpperCase()
                              )}
                            </div>
                            <div>
                              <p className="font-bold flex items-center gap-1">
                                {w.name}
                                {w.phone_verified && (
                                  <BadgeCheck
                                    size={12}
                                    className="text-[#0F8A73]"
                                  />
                                )}
                              </p>
                              <p className="text-[11px] text-[#6B645F] dark:text-[#9E958F]">
                                {w.locality || "—"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 font-mono font-medium">
                          {w.phone ? (
                            <a
                              href={`tel:+91${w.phone}`}
                              className="hover:underline text-[#141210] dark:text-[#FAFAFA]"
                            >
                              +91 {w.phone}
                            </a>
                          ) : (
                            <span className="text-[#6B645F] dark:text-[#9E958F]">—</span>
                          )}
                        </td>
                        <td className="py-3">
                          <span className="font-semibold text-[#141210] dark:text-[#FAFAFA]">
                            {w.category || "General"}
                          </span>
                          {Array.isArray(w.services) &&
                            w.services.length > 0 && (
                              <p className="text-[10px] text-[#6B645F] dark:text-[#9E958F] truncate max-w-[150px]">
                                {w.services.join(", ")}
                              </p>
                            )}
                        </td>
                        <td className="py-3">
                          {w.available_today ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0F8A73]">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#0F8A73]" />{" "}
                              Available
                            </span>
                          ) : (
                            <span className="text-[11px] text-[#6B645F] dark:text-[#9E958F]">
                              Off-duty
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-[#6B645F] dark:text-[#9E958F]">
                          {w.experience ? `${w.experience} yrs` : "—"}
                        </td>
                        <td className="py-3 font-semibold">
                          {w.contact_events_count || 0}
                        </td>
                        <td className="py-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedWorker(w)}
                              className="rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-2.5 py-1 text-[11px] font-semibold text-[#141210] dark:text-[#FAFAFA] hover:border-[#F4512C]/50 cursor-pointer"
                            >
                              Details
                            </button>
                            {w.phone && (
                              <a
                                href={`https://wa.me/91${w.phone.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-full bg-[#0F8A73] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#0B6E5B]"
                              >
                                WhatsApp
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => setWorkerToRemove(w)}
                              className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white cursor-pointer"
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
            <div className="mt-4 rounded-xl border border-dashed border-[#EAE2DC] dark:border-white/10 p-6 text-center text-xs text-[#6B645F] dark:text-[#9E958F]">
              {workerSearch
                ? "No workers matching your search."
                : "No workers linked yet. Share your agency invite code to add workers."}
            </div>
          )}
        </section>

        {/* Active Project Assignments Section */}
        <section className="rounded-[20px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#EAE2DC] dark:border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-[#141210] dark:text-[#FAFAFA]">
                  Active Project Assignments
                </h2>
                <span className="rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#F5EFEA] dark:bg-[#242220] px-2.5 py-0.5 text-xs font-semibold text-[#141210] dark:text-[#FAFAFA]">
                  {projects.length} assigned
                </span>
              </div>
              <p className="text-xs text-[#6B645F] dark:text-[#9E958F] mt-0.5">
                Manage ongoing client contracts, assigned team specialists, and
                delivery timelines.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowNewProjectModal(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#F4512C] hover:bg-[#E04320] px-4 text-xs font-semibold text-white transition cursor-pointer self-start sm:self-auto"
            >
              <Plus size={14} />
              <span>Assign New Project</span>
            </button>
          </div>

          {projectsLoading ? (
            <CompactSectionSkeleton variant="grid" />
          ) : projects.length > 0 ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col justify-between rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5]/60 dark:bg-[#0B0A09]/60 p-4 transition hover:border-[#F4512C]/50"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="inline-block rounded-md bg-[#FCEAE4] dark:bg-[#3A2018] px-2 py-0.5 text-[10px] font-bold text-[#F4512C] uppercase tracking-wide">
                          {p.service || "Contract"}
                        </span>
                        <h3 className="mt-1.5 text-sm font-bold text-[#141210] dark:text-[#FAFAFA]">
                          {p.title}
                        </h3>
                      </div>
                      <span className="rounded-full bg-[#0F8A73]/10 border border-[#0F8A73]/30 px-2.5 py-0.5 text-[10px] font-bold text-[#0F8A73] capitalize">
                        {p.status.replace("_", " ")}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-2.5">
                        <span className="text-[10px] uppercase font-bold text-[#6B645F] dark:text-[#9E958F]">
                          Client
                        </span>
                        <p className="mt-0.5 font-semibold text-[#141210] dark:text-[#FAFAFA] truncate">
                          {p.client_name}
                        </p>
                        {p.client_phone && (
                          <a
                            href={`tel:${p.client_phone}`}
                            className="mt-0.5 block text-[11px] text-[#6B645F] dark:text-[#9E958F] hover:underline"
                          >
                            {p.client_phone}
                          </a>
                        )}
                      </div>

                      <div className="rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-2.5">
                        <span className="text-[10px] uppercase font-bold text-[#6B645F] dark:text-[#9E958F]">
                          Assigned To
                        </span>
                        <p className="mt-0.5 font-semibold text-[#141210] dark:text-[#FAFAFA] truncate">
                          {p.worker_name}
                        </p>
                        <span className="text-[10px] text-[#6B645F] dark:text-[#9E958F]">
                          Specialist
                        </span>
                      </div>

                      {p.location && (
                        <div className="rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-2.5">
                          <span className="text-[10px] uppercase font-bold text-[#6B645F] dark:text-[#9E958F] flex items-center gap-1">
                            <MapPin size={10} className="text-[#F4512C]" /> Location
                          </span>
                          <p className="mt-0.5 font-semibold text-[#141210] dark:text-[#FAFAFA] truncate">
                            {p.location}
                          </p>
                        </div>
                      )}

                      {p.deadline && (
                        <div className="rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-2.5">
                          <span className="text-[10px] uppercase font-bold text-[#6B645F] dark:text-[#9E958F] flex items-center gap-1">
                            <Clock size={10} className="text-[#F4512C]" /> Target Date
                          </span>
                          <p className="mt-0.5 font-semibold text-[#141210] dark:text-[#FAFAFA] truncate">
                            {p.deadline}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3.5 flex items-center justify-between border-t border-[#EAE2DC] dark:border-white/10 pt-2.5">
                    <span className="text-[10px] text-[#6B645F] dark:text-[#9E958F]">
                      Created {new Date(p.created_at).toLocaleDateString()}
                    </span>

                    <button
                      type="button"
                      onClick={() => setProjectToDelete(p)}
                      className="inline-flex h-7 items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400 transition hover:bg-rose-600 hover:text-white cursor-pointer"
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
            <div className="mt-4 rounded-xl border border-dashed border-[#EAE2DC] dark:border-white/10 p-6 text-center text-xs text-[#6B645F] dark:text-[#9E958F]">
              No active project assignments. Click &ldquo;Assign New Project&rdquo; to
              dispatch your specialists to client sites.
            </div>
          )}
        </section>

        {/* Callback Requests Section */}
        <section className="rounded-[20px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 sm:p-6">
          <div className="flex items-center justify-between border-b border-[#EAE2DC] dark:border-white/10 pb-4">
            <div>
              <h2 className="text-base font-extrabold text-[#141210] dark:text-[#FAFAFA]">
                Client Callback Requests
              </h2>
              <p className="text-xs text-[#6B645F] dark:text-[#9E958F]">
                Direct service leads submitted by customers for your workers.
              </p>
            </div>
            <span className="rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FCEAE4] dark:bg-[#3A2018] px-3 py-0.5 text-xs font-bold text-[#F4512C]">
              {pending} pending
            </span>
          </div>

          {dashboard.callbacks.length ? (
            <div className="mt-4 space-y-3">
              {dashboard.callbacks.map((c) => (
                <div
                  key={c.id}
                  className="rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-[#141210] dark:text-[#FAFAFA]">
                        {c.client_name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#6B645F] dark:text-[#9E958F]">
                        {c.service_needed} · Preferred: {c.preferred_time}
                      </p>
                      <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-[#141210] dark:text-[#FAFAFA]">
                        <Phone size={12} className="text-[#F4512C]" />
                        <a
                          href={`tel:${c.client_phone}`}
                          className="hover:underline"
                        >
                          {c.client_phone}
                        </a>
                      </p>
                    </div>
                    <span className="rounded-full border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] px-2.5 py-0.5 text-[10px] font-bold text-[#6B645F] dark:text-[#9E958F] uppercase">
                      {c.status}
                    </span>
                  </div>

                  {c.notes && (
                    <p className="mt-2.5 rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-3 text-[11px] text-[#6B645F] dark:text-[#9E958F]">
                      {c.notes}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#EAE2DC] dark:border-white/10 pt-3">
                    <span className="text-[11px] text-[#6B645F] dark:text-[#9E958F]">
                      {new Date(c.created_at).toLocaleDateString()}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={`tel:${c.client_phone}`}
                        className="rounded-full bg-[#141210] text-white dark:bg-white dark:text-[#11100F] px-3.5 py-1.5 text-xs font-semibold transition hover:opacity-90"
                      >
                        Call Client
                      </a>
                      {c.status !== "contacted" && (
                        <button
                          disabled={updating === c.id}
                          onClick={() => void updateStatus(c.id, "contacted")}
                          className="rounded-full border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] px-3.5 py-1.5 text-xs font-semibold text-[#141210] dark:text-[#FAFAFA] transition hover:border-[#F4512C]/50 cursor-pointer disabled:opacity-50"
                        >
                          Mark Contacted
                        </button>
                      )}
                      {c.status !== "closed" && (
                        <button
                          disabled={updating === c.id}
                          onClick={() => void updateStatus(c.id, "closed")}
                          className="rounded-full bg-[#F4512C] hover:bg-[#E04320] px-3.5 py-1.5 text-xs font-semibold text-white transition cursor-pointer disabled:opacity-50"
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
            <div className="mt-4 rounded-xl border border-dashed border-[#EAE2DC] dark:border-white/10 p-6 text-center text-xs text-[#6B645F] dark:text-[#9E958F]">
              No callback requests received yet. Client inquiries will appear
              here.
            </div>
          )}
        </section>

        {/* Agency Profile Details */}
        <section className="rounded-[20px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 sm:p-6">
          <h2 className="text-base font-extrabold text-[#141210] dark:text-[#FAFAFA]">
            Agency Information
          </h2>
          <div className="mt-3.5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] p-3.5">
              <span className="text-[11px] text-[#6B645F] dark:text-[#9E958F]">
                Contact Phone
              </span>
              <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-[#141210] dark:text-[#FAFAFA]">
                <Phone size={13} className="text-[#F4512C]" />
                {dashboard.agency.phone || "Not set"}
              </p>
            </div>
            <div className="rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] p-3.5">
              <span className="text-[11px] text-[#6B645F] dark:text-[#9E958F]">
                Team Size Band
              </span>
              <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-[#141210] dark:text-[#FAFAFA]">
                <Users size={13} className="text-[#F4512C]" />
                {dashboard.agency.team_size_band || "1-5 workers"}
              </p>
            </div>
            <div className="rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] p-3.5">
              <span className="text-[11px] text-[#6B645F] dark:text-[#9E958F]">
                Specializations
              </span>
              <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-[#141210] dark:text-[#FAFAFA] truncate">
                <Wrench size={13} className="shrink-0 text-[#F4512C]" />
                <span className="truncate">
                  {categories.length ? categories.join(", ") : "All Trades"}
                </span>
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
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs font-bold text-rose-600 dark:text-rose-400 transition hover:bg-rose-500/15 cursor-pointer"
        >
          <LogOut size={15} />
          <span>Log out of Agency Account</span>
        </button>
      </div>

      {/* Worker Full Details Modal */}
      {selectedWorker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-[#EAE2DC] dark:border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FCEAE4] dark:bg-[#3A2018] font-bold text-[#F4512C] text-base">
                  {selectedWorker.photo_url ? (
                    <img
                      src={selectedWorker.photo_url}
                      alt={selectedWorker.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    selectedWorker.initials ||
                    selectedWorker.name?.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-extrabold text-[#141210] dark:text-[#FAFAFA]">
                      {selectedWorker.name}
                    </h3>
                    {selectedWorker.phone_verified && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-[#0F8A73]/10 border border-[#0F8A73]/30 px-2 py-0.5 text-[10px] font-bold text-[#0F8A73]">
                        <BadgeCheck size={11} /> Verified
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-[#F4512C]">
                    {selectedWorker.category || "Specialist"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedWorker(null)}
                className="rounded-full p-1.5 text-[#6B645F] dark:text-[#9E958F] hover:bg-[#F5EFEA] dark:hover:bg-[#242220] hover:text-[#141210] dark:hover:text-[#FAFAFA] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                {selectedWorker.phone && (
                  <a
                    href={`tel:+91${selectedWorker.phone}`}
                    className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-[#141210] text-white dark:bg-white dark:text-[#11100F] font-semibold hover:opacity-90 transition"
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
                    className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-[#0F8A73] font-semibold text-white hover:bg-[#0B6E5B] transition"
                  >
                    <MessageCircle size={13} />
                    <span>WhatsApp</span>
                  </a>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5 rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] p-4">
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#6B645F] dark:text-[#9E958F]">
                    Mobile Phone
                  </span>
                  <p className="mt-0.5 font-semibold text-[#141210] dark:text-[#FAFAFA] select-all">
                    {selectedWorker.phone
                      ? `+91 ${selectedWorker.phone}`
                      : "Not listed"}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-[#6B645F] dark:text-[#9E958F]">
                    Service Locality
                  </span>
                  <p className="mt-0.5 font-semibold text-[#141210] dark:text-[#FAFAFA]">
                    {selectedWorker.locality || "All local areas"}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-[#6B645F] dark:text-[#9E958F]">
                    Work Experience
                  </span>
                  <p className="mt-0.5 font-semibold text-[#141210] dark:text-[#FAFAFA]">
                    {selectedWorker.experience
                      ? `${selectedWorker.experience} Years`
                      : "Experienced"}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-[#6B645F] dark:text-[#9E958F]">
                    Today&apos;s Availability
                  </span>
                  <p className="mt-0.5 font-semibold">
                    {selectedWorker.available_today ? (
                      <span className="text-[#0F8A73] font-bold">
                        ● Available Today
                      </span>
                    ) : (
                      <span className="text-[#6B645F] dark:text-[#9E958F]">Off-duty</span>
                    )}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-[#6B645F] dark:text-[#9E958F]">
                    Customer Inquiries
                  </span>
                  <p className="mt-0.5 font-semibold text-[#141210] dark:text-[#FAFAFA]">
                    {selectedWorker.contact_events_count || 0} direct leads
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-[#6B645F] dark:text-[#9E958F]">
                    Urgent Work Ready
                  </span>
                  <p className="mt-0.5 font-semibold text-[#141210] dark:text-[#FAFAFA]">
                    {selectedWorker.urgent_today
                      ? "Yes (Emergency jobs)"
                      : "Standard jobs"}
                  </p>
                </div>
              </div>

              {(selectedWorker.about || selectedWorker.bio) && (
                <div className="rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] p-4">
                  <span className="text-[10px] font-bold uppercase text-[#6B645F] dark:text-[#9E958F]">
                    About &amp; Bio
                  </span>
                  <p className="mt-1 text-xs leading-relaxed text-[#141210] dark:text-[#FAFAFA]">
                    {selectedWorker.about || selectedWorker.bio}
                  </p>
                </div>
              )}

              {selectedWorker.services && (
                <div className="rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] p-4">
                  <span className="text-[10px] font-bold uppercase text-[#6B645F] dark:text-[#9E958F]">
                    All Services Offered
                  </span>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(Array.isArray(selectedWorker.services)
                      ? selectedWorker.services
                      : String(selectedWorker.services).split(",")
                    ).map((s, idx) => (
                      <span
                        key={idx}
                        className="rounded-md border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] px-2.5 py-1 text-xs font-medium text-[#141210] dark:text-[#FAFAFA]"
                      >
                        {String(s).trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <Link
                  to={`/worker?worker=${selectedWorker.id}`}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#F4512C] hover:bg-[#E04320] px-5 text-xs font-semibold text-white transition"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EAE2DC] dark:border-white/10 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C]">
                  <FolderKanban size={17} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#141210] dark:text-[#FAFAFA]">
                    Assign Project
                  </h3>
                  <p className="text-[11px] text-[#6B645F] dark:text-[#9E958F]">
                    Create and dispatch an active job assignment
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewProjectModal(false)}
                className="rounded-full p-1.5 text-[#6B645F] dark:text-[#9E958F] hover:bg-[#F5EFEA] dark:hover:bg-[#242220] hover:text-[#141210] dark:hover:text-[#FAFAFA] cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={handleCreateProject}
              className="mt-4 space-y-3.5 text-xs"
            >
              <div>
                <label className="block text-[11px] font-bold text-[#141210] dark:text-[#FAFAFA]">
                  Project / Job Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Commercial 3-Phase Wiring & Panel Setup"
                  value={newProjectForm.title}
                  onChange={(e) =>
                    setNewProjectForm({
                      ...newProjectForm,
                      title: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-3 py-2.5 text-xs text-[#141210] dark:text-[#FAFAFA] placeholder:text-[#6B645F] dark:placeholder:text-[#9E958F] outline-hidden focus:border-[#F4512C]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#141210] dark:text-[#FAFAFA]">
                  Assign Specialist *
                </label>
                <select
                  required
                  value={newProjectForm.worker_id}
                  onChange={(e) => {
                    const sel = dashboard?.workers.find(
                      (w) => w.id === e.target.value,
                    );
                    setNewProjectForm({
                      ...newProjectForm,
                      worker_id: e.target.value,
                      service: sel?.category || newProjectForm.service,
                    });
                  }}
                  className="mt-1 w-full rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-3 py-2.5 text-xs text-[#141210] dark:text-[#FAFAFA] outline-hidden focus:border-[#F4512C] cursor-pointer"
                >
                  <option value="">Select a roster specialist...</option>
                  {dashboard?.workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} — {w.category || "Specialist"} (
                      {w.locality || "All locations"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-[#141210] dark:text-[#FAFAFA]">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Client or Company Name"
                    value={newProjectForm.client_name}
                    onChange={(e) =>
                      setNewProjectForm({
                        ...newProjectForm,
                        client_name: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-3 py-2.5 text-xs text-[#141210] dark:text-[#FAFAFA] placeholder:text-[#6B645F] dark:placeholder:text-[#9E958F] outline-hidden focus:border-[#F4512C]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#141210] dark:text-[#FAFAFA]">
                    Client Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={newProjectForm.client_phone}
                    onChange={(e) =>
                      setNewProjectForm({
                        ...newProjectForm,
                        client_phone: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-3 py-2.5 text-xs text-[#141210] dark:text-[#FAFAFA] placeholder:text-[#6B645F] dark:placeholder:text-[#9E958F] outline-hidden focus:border-[#F4512C]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-[#141210] dark:text-[#FAFAFA]">
                    Job Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Indiranagar 100ft Rd"
                    value={newProjectForm.location}
                    onChange={(e) =>
                      setNewProjectForm({
                        ...newProjectForm,
                        location: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-3 py-2.5 text-xs text-[#141210] dark:text-[#FAFAFA] placeholder:text-[#6B645F] dark:placeholder:text-[#9E958F] outline-hidden focus:border-[#F4512C]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#141210] dark:text-[#FAFAFA]">
                    Target Deadline
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. By end of week / 3 Days"
                    value={newProjectForm.deadline}
                    onChange={(e) =>
                      setNewProjectForm({
                        ...newProjectForm,
                        deadline: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-3 py-2.5 text-xs text-[#141210] dark:text-[#FAFAFA] placeholder:text-[#6B645F] dark:placeholder:text-[#9E958F] outline-hidden focus:border-[#F4512C]"
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2 border-t border-[#EAE2DC] dark:border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewProjectModal(false)}
                  className="rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-4 py-2 text-xs font-semibold text-[#141210] dark:text-[#FAFAFA] hover:border-[#F4512C]/50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    newProjectLoading ||
                    !newProjectForm.title ||
                    !newProjectForm.worker_id ||
                    !newProjectForm.client_name
                  }
                  className="rounded-full bg-[#F4512C] hover:bg-[#E04320] px-5 py-2 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer"
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
