import { useEffect, useState, useCallback } from "react";
import {
  FolderKanban,
  MapPin,
  Phone,
  MessageSquare,
  Clock,
  CheckCircle2,
  Play,
  RotateCcw,
  Loader2,
  Building2,
  Calendar,
  AlertCircle,
  Check,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export interface AssignedProject {
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
}

interface WorkerAssignedProjectsProps {
  workerId?: string;
  workerPhone?: string;
  workerName?: string;
}

export default function WorkerAssignedProjects({
  workerId,
  workerPhone,
  workerName,
}: WorkerAssignedProjectsProps) {
  const [projects, setProjects] = useState<AssignedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<
    "all" | "active" | "in_progress" | "completed"
  >("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  const loadProjects = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      try {
        const cleanPhone = String(workerPhone || "")
          .replace(/^\+91/, "")
          .replace(/\D/g, "")
          .slice(-10);
        const { data: sessionData } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (sessionData?.session?.access_token) {
          headers["Authorization"] =
            `Bearer ${sessionData.session.access_token}`;
        }

        const res = await fetch(
          `/api/workers/projects?workerId=${encodeURIComponent(workerId || "")}&phone=${encodeURIComponent(cleanPhone)}`,
          { headers, cache: "no-store" },
        );

        if (res.ok) {
          const data = await res.json();
          setProjects(data.projects || []);
        }
      } catch (e) {
        console.warn("[WorkerAssignedProjects] Error loading projects:", e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [workerId, workerPhone],
  );

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const updateStatus = async (
    projectId: string,
    nextStatus: AssignedProject["status"],
  ) => {
    setUpdatingId(projectId);
    try {
      const res = await fetch(
        `/api/workers/projects/${encodeURIComponent(projectId)}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        },
      );

      if (res.ok) {
        setProjects((prev) =>
          prev.map((p) =>
            p.id === projectId ? { ...p, status: nextStatus } : p,
          ),
        );
        showToast(`Project status updated to ${nextStatus.replace("_", " ")}.`);
      } else {
        showToast("Unable to update project status.");
      }
    } catch {
      showToast("Network error updating status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = projects.filter((p) => {
    if (filter === "all") return true;
    return p.status === filter;
  });

  const activeCount = projects.filter(
    (p) => p.status === "active" || p.status === "in_progress",
  ).length;

  return (
    <section className="rounded-[16px] border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] p-5 sm:p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#E4E4E7] dark:border-[#27272A] pb-4 mb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E4E4E7] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#09090B] text-[#09090B] dark:text-[#FAFAFA]">
            <FolderKanban size={16} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#09090B] dark:text-[#FAFAFA]">
                Agency Assigned Projects
              </h2>
              <span className="rounded-full border border-[#E4E4E7] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#09090B] px-2.5 py-0.5 text-[10px] font-semibold text-[#71717A] dark:text-[#A1A1AA]">
                {activeCount} active job{activeCount === 1 ? "" : "s"}
              </span>
            </div>
            <p className="text-xs text-[#71717A] dark:text-[#A1A1AA]">
              Client contracts and field job assignments dispatched to you by
              your affiliated agency.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadProjects(true)}
          disabled={refreshing}
          className="inline-flex h-8 items-center gap-1.5 self-start rounded-full border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] px-3 text-xs font-semibold text-[#09090B] dark:text-[#FAFAFA] transition hover:bg-[#FAFAFA] dark:hover:bg-[#27272A] disabled:opacity-50 cursor-pointer shadow-sm sm:self-auto"
          title="Refresh assigned jobs"
        >
          <RotateCcw
            size={12}
            className={refreshing ? "animate-spin text-current" : ""}
          />
          <span>Refresh</span>
        </button>
      </div>

      {notice && (
        <div className="mb-4 flex items-center gap-2 rounded-[12px] border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          <Check size={14} />
          <span>{notice}</span>
        </div>
      )}

      {/* Filter Tabs */}
      {projects.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5 text-xs">
          {(["all", "active", "in_progress", "completed"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilter(t)}
              className={`rounded-full px-3 py-1 font-semibold transition cursor-pointer capitalize ${
                filter === t
                  ? "bg-black text-white dark:bg-white dark:text-black shadow-xs"
                  : "border border-[#E4E4E7] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#09090B] text-[#71717A] dark:text-[#A1A1AA] hover:text-[#09090B] dark:hover:text-[#FAFAFA]"
              }`}
            >
              {t === "all" ? `All (${projects.length})` : t.replace("_", " ")}
            </button>
          ))}
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="flex items-center justify-center p-8 text-xs text-[#71717A] dark:text-[#A1A1AA]">
          <Loader2 size={16} className="mr-2 animate-spin text-current" />
          Loading assigned projects...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-[#E4E4E7] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#09090B] p-6 text-center text-xs text-[#71717A] dark:text-[#A1A1AA]">
          <FolderKanban size={24} className="mx-auto mb-2 text-[#71717A] dark:text-[#A1A1AA]" />
          <p className="font-bold text-[#09090B] dark:text-[#FAFAFA]">
            No assigned projects{" "}
            {filter !== "all" ? `with status "${filter}"` : "yet"}
          </p>
          <p className="mt-1 text-[11px] text-[#71717A] dark:text-[#A1A1AA]">
            When your affiliated agency assigns you to a client project or
            repair contract, the job details and client contacts will appear
            here in real-time.
          </p>
        </div>
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2">
          {filtered.map((proj) => {
            const isUpdating = updatingId === proj.id;
            const phoneDigits = (proj.client_phone || "").replace(/\D/g, "");

            return (
              <div
                key={proj.id}
                className="flex flex-col justify-between rounded-[16px] border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] p-4 shadow-sm transition hover:border-neutral-400 dark:hover:border-neutral-500"
              >
                <div>
                  {/* Top Badge & Title */}
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-block rounded-md bg-[#FAFAFA] dark:bg-[#09090B] border border-[#E4E4E7] dark:border-[#27272A] px-2.5 py-0.5 text-[10px] font-bold text-[#09090B] dark:text-[#FAFAFA] uppercase tracking-wide">
                      {proj.service || "Contract"}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize ${
                        proj.status === "completed"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : proj.status === "in_progress"
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {proj.status.replace("_", " ")}
                    </span>
                  </div>

                  <h3 className="mt-2 text-sm font-bold text-[#09090B] dark:text-[#FAFAFA]">
                    {proj.title}
                  </h3>

                  {/* Details Grid */}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    {/* Client Name & Phone */}
                    <div className="rounded-[12px] border border-[#E4E4E7] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#09090B] p-2.5">
                      <span className="text-[10px] uppercase font-bold text-[#71717A] dark:text-[#A1A1AA]">
                        Client Name
                      </span>
                      <p className="mt-0.5 font-semibold text-[#09090B] dark:text-[#FAFAFA] truncate">
                        {proj.client_name}
                      </p>
                      {proj.client_phone && (
                        <p className="mt-0.5 text-[11px] font-mono text-[#71717A] dark:text-[#A1A1AA]">
                          +91 {proj.client_phone}
                        </p>
                      )}
                    </div>

                    {/* Site Location */}
                    <div className="rounded-[12px] border border-[#E4E4E7] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#09090B] p-2.5">
                      <span className="text-[10px] uppercase font-bold text-[#71717A] dark:text-[#A1A1AA] flex items-center gap-1">
                        <MapPin size={10} /> Location
                      </span>
                      <p className="mt-0.5 font-semibold text-[#09090B] dark:text-[#FAFAFA] truncate">
                        {proj.location || "Site location"}
                      </p>
                    </div>

                    {/* Target Deadline */}
                    {proj.deadline && (
                      <div className="rounded-[12px] border border-[#E4E4E7] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#09090B] p-2.5 col-span-2">
                        <span className="text-[10px] uppercase font-bold text-[#71717A] dark:text-[#A1A1AA] flex items-center gap-1">
                          <Calendar size={10} /> Target Completion
                        </span>
                        <p className="mt-0.5 font-semibold text-[#09090B] dark:text-[#FAFAFA]">
                          {proj.deadline}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Action Bar */}
                <div className="mt-3.5 space-y-2 border-t border-[#E4E4E7] dark:border-[#27272A] pt-3">
                  {/* Contact Buttons */}
                  <div className="flex items-center gap-1.5">
                    {proj.client_phone && (
                      <>
                        <a
                          href={`tel:+91${phoneDigits}`}
                          className="flex-1 inline-flex h-8 items-center justify-center gap-1 rounded-full border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] px-2 text-xs font-semibold text-[#09090B] dark:text-[#FAFAFA] transition hover:bg-[#FAFAFA] dark:hover:bg-[#27272A] shadow-sm"
                        >
                          <Phone size={12} />
                          <span>Call Client</span>
                        </a>
                        <a
                          href={`https://wa.me/91${phoneDigits}?text=${encodeURIComponent(
                            `Hello ${proj.client_name}, I am your assigned technician for "${proj.title}" on LocalWorker.`,
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 inline-flex h-8 items-center justify-center gap-1 rounded-full bg-[#128C7E] px-2 text-xs font-semibold text-white transition hover:bg-[#075E54] shadow-sm"
                        >
                          <MessageSquare size={12} />
                          <span>WhatsApp</span>
                        </a>
                      </>
                    )}
                  </div>

                  {/* Status update controls */}
                  <div className="flex items-center justify-between gap-1.5 pt-1">
                    <span className="text-[10px] text-[#71717A] dark:text-[#A1A1AA]">
                      Assigned {new Date(proj.created_at).toLocaleDateString()}
                    </span>

                    <div className="flex items-center gap-1">
                      {proj.status === "active" && (
                        <button
                          type="button"
                          onClick={() => updateStatus(proj.id, "in_progress")}
                          disabled={isUpdating}
                          className="inline-flex h-7 items-center gap-1 rounded-full border border-[#E4E4E7] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#09090B] px-2.5 text-[11px] font-semibold text-[#09090B] dark:text-[#FAFAFA] hover:bg-neutral-200 dark:hover:bg-neutral-800 transition cursor-pointer"
                        >
                          <Play size={10} />
                          <span>Start Work</span>
                        </button>
                      )}

                      {proj.status !== "completed" && (
                        <button
                          type="button"
                          onClick={() => updateStatus(proj.id, "completed")}
                          disabled={isUpdating}
                          className="inline-flex h-7 items-center gap-1 rounded-full bg-black text-white dark:bg-white dark:text-black px-3 text-[11px] font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition cursor-pointer shadow-sm active:scale-95"
                        >
                          <CheckCircle2 size={11} />
                          <span>Mark Done</span>
                        </button>
                      )}

                      {proj.status === "completed" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 size={13} /> Completed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
