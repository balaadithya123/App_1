import { useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Link2,
  Loader2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Unlink,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import ConfirmDialog from "@/components/ConfirmDialog";

interface WorkerAgencyAffiliationProps {
  userId?: string;
  userPhone?: string;
}

export default function WorkerAgencyAffiliation({
  userId,
  userPhone,
}: WorkerAgencyAffiliationProps) {
  const [loading, setLoading] = useState(true);
  const [agency, setAgency] = useState<any>(null);
  const [workerRecord, setWorkerRecord] = useState<any>(null);
  const [agencyCodeInput, setAgencyCodeInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const loadAffiliation = async () => {
    if (!userId && !userPhone) {
      setLoading(false);
      return;
    }

    const cleanPhone = String(userPhone || "")
      .replace(/^\+91/, "")
      .replace(/\D/g, "")
      .slice(-10);

    // 1. Check local storage cache for instant render
    const cacheKey = `lw_affiliation_${userId || cleanPhone}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.agency) setAgency(parsed.agency);
        if (parsed.worker) setWorkerRecord(parsed.worker);
      }
    } catch {}

    try {
      // 2. Fetch from backend API
      const { data: sessionData } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (sessionData?.session?.access_token) {
        headers["Authorization"] = `Bearer ${sessionData.session.access_token}`;
      }

      const res = await fetch(
        `/api/agencies/worker-affiliation?phone=${encodeURIComponent(cleanPhone)}&workerId=${encodeURIComponent(userId || "")}`,
        {
          headers,
        },
      );

      if (res.ok) {
        const data = await res.json();
        if (data.agency) {
          setAgency(data.agency);
          setWorkerRecord(data.worker);
          try {
            localStorage.setItem(
              cacheKey,
              JSON.stringify({ agency: data.agency, worker: data.worker }),
            );
          } catch {}
          setLoading(false);
          return;
        } else if (data.worker) {
          setWorkerRecord(data.worker);
          setAgency(null);
          try {
            localStorage.removeItem(cacheKey);
          } catch {}
          setLoading(false);
          return;
        }
      }

      // 3. Fallback to direct Supabase query
      if (supabase) {
        let query = supabase
          .from("workers")
          .select("id,name,phone,agency_id,category,locality");
        if (userId && cleanPhone) {
          query = query.or(
            `id.eq.${userId},phone.eq.${cleanPhone},phone.eq.+91${cleanPhone}`,
          );
        } else if (userId) {
          query = query.eq("id", userId);
        } else if (cleanPhone) {
          query = query.or(`phone.eq.${cleanPhone},phone.eq.+91${cleanPhone}`);
        }

        const { data: workers } = await query;
        const worker =
          Array.isArray(workers) && workers.length > 0 ? workers[0] : null;

        if (worker) {
          setWorkerRecord(worker);
          if (worker.agency_id) {
            const { data: ag } = await supabase
              .from("agencies")
              .select(
                "id,name,phone,email,agency_code,verified,team_size_band,categories,service_locations,description",
              )
              .or(
                `id.eq.${worker.agency_id},agency_code.eq.${worker.agency_id}`,
              );

            const agencyObj = Array.isArray(ag) && ag.length > 0 ? ag[0] : null;
            if (agencyObj) {
              setAgency(agencyObj);
              try {
                localStorage.setItem(
                  cacheKey,
                  JSON.stringify({ agency: agencyObj, worker }),
                );
              } catch {}
            } else {
              setAgency({
                id: worker.agency_id,
                name: "Affiliated Agency",
                verified: true,
              });
            }
          } else {
            setAgency(null);
            try {
              localStorage.removeItem(cacheKey);
            } catch {}
          }
        }
      }
    } catch (e) {
      console.warn("[WorkerAgencyAffiliation] Error loading affiliation:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAffiliation();
  }, [userId, userPhone]);

  const handleJoinAgency = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const code = agencyCodeInput.trim();
    if (!code) {
      setError(
        "Please enter an agency code or ID (e.g. AGN-ADMN or agency-admin).",
      );
      return;
    }

    const cleanPhone = String(userPhone || workerRecord?.phone || "")
      .replace(/^\+91/, "")
      .replace(/\D/g, "")
      .slice(-10);
    const workerIdToUse = workerRecord?.id || cleanPhone || userId;
    if (!workerIdToUse) {
      setError(
        "Worker record could not be found. Please update your profile first.",
      );
      return;
    }

    setSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (sessionData?.session?.access_token) {
        headers["Authorization"] = `Bearer ${sessionData.session.access_token}`;
      }

      const res = await fetch("/api/agencies/join", {
        method: "POST",
        headers,
        body: JSON.stringify({
          workerId: workerIdToUse,
          agencyCode: code,
          agencyId: code,
          phone: cleanPhone,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to link with agency.");
      }

      // Also directly update in Supabase if client session has rights
      if (supabase && (workerRecord?.id || userId)) {
        try {
          await supabase
            .from("workers")
            .update({ agency_id: data.agency.id })
            .eq("id", workerRecord?.id || userId);
        } catch {}
      }

      setAgency(data.agency);
      setAgencyCodeInput("");
      setSuccess(
        `Successfully affiliated with ${data.agency.name || "Agency"}! Link is active in your dashboard.`,
      );

      const cacheKey = `lw_affiliation_${userId || cleanPhone}`;
      try {
        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            agency: data.agency,
            worker: data.worker || workerRecord,
          }),
        );
      } catch {}

      void loadAffiliation();
    } catch (err: any) {
      setError(err.message || "Unable to join agency.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLeaveAgency = async () => {
    setError("");
    setSuccess("");
    setSubmitting(true);
    setShowLeaveConfirm(false);
    try {
      const cleanPhone = String(userPhone || workerRecord?.phone || "")
        .replace(/^\+91/, "")
        .replace(/\D/g, "")
        .slice(-10);
      const targetId = workerRecord?.id || userId || cleanPhone;

      const { data: sessionData } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (sessionData?.session?.access_token) {
        headers["Authorization"] = `Bearer ${sessionData.session.access_token}`;
      }

      const res = await fetch("/api/agencies/leave", {
        method: "POST",
        headers,
        body: JSON.stringify({ workerId: targetId, phone: cleanPhone }),
      });

      const resData = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(resData?.message || "Failed to unlink from agency.");
      }

      if (supabase && targetId) {
        try {
          await supabase
            .from("workers")
            .update({ agency_id: null })
            .eq("id", targetId);
        } catch {}
      }
      if (supabase && cleanPhone) {
        try {
          await supabase
            .from("workers")
            .update({ agency_id: null })
            .or(`phone.eq.${cleanPhone},phone.eq.+91${cleanPhone}`);
        } catch {}
      }

      const cacheKey = `lw_affiliation_${userId || cleanPhone}`;
      try {
        localStorage.removeItem(cacheKey);
      } catch {}

      setAgency(null);
      setSuccess("You are now registered as an independent specialist.");
      void loadAffiliation();
    } catch (err: any) {
      setError(err.message || "Unable to unlink from agency.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-[16px] border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] p-5 animate-pulse shadow-sm">
        <div className="h-5 w-40 bg-[#FAFAFA] dark:bg-[#09090B] rounded-full mb-2" />
        <div className="h-4 w-60 bg-[#FAFAFA] dark:bg-[#09090B] rounded-full" />
      </div>
    );
  }

  return (
    <section className="rounded-[16px] border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] p-5 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-[#E4E4E7] dark:border-[#27272A] pb-4 mb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E4E4E7] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#09090B] text-[#09090B] dark:text-[#FAFAFA]">
            <Building2 size={16} />
          </span>
          <div>
            <h2 className="text-sm font-bold text-[#09090B] dark:text-[#FAFAFA]">
              Agency Affiliation
            </h2>
            <p className="text-xs text-[#71717A] dark:text-[#A1A1AA]">
              Work independently or join a licensed agency team for bulk
              contracts.
            </p>
          </div>
        </div>

        {agency ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
            <ShieldCheck size={12} />
            <span>Agency Member</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#E4E4E7] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#09090B] px-2.5 py-0.5 text-[11px] font-semibold text-[#71717A] dark:text-[#A1A1AA]">
            Independent Pro
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-[12px] border border-rose-500/30 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs font-medium text-rose-600 dark:text-rose-400">
          <AlertCircle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-[12px] border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 p-3 text-xs font-medium text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 size={14} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {agency ? (
        <div className="space-y-3">
          <div className="rounded-[12px] border border-[#E4E4E7] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#09090B] p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[#09090B] dark:text-[#FAFAFA]">
                    {agency.name}
                  </h3>
                  {agency.verified && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck size={11} />
                      Verified Agency
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#71717A] dark:text-[#A1A1AA]">
                  <span>
                    Code:{" "}
                    <strong className="font-mono text-[#09090B] dark:text-[#FAFAFA]">
                      {agency.agency_code || "AGN-..."}
                    </strong>
                  </span>
                  {agency.team_size_band && (
                    <span>· Team Size: {agency.team_size_band}</span>
                  )}
                  {agency.phone && <span>· Helpline: {agency.phone}</span>}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to={`/agency-profile?id=${agency.id}`}
                  className="inline-flex h-8 items-center gap-1 rounded-full border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] px-3 text-xs font-semibold text-[#09090B] dark:text-[#FAFAFA] hover:bg-[#FAFAFA] dark:hover:bg-[#27272A] shadow-sm transition"
                >
                  <span>View Profile</span>
                  <ArrowRight size={12} />
                </Link>
                {!showLeaveConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowLeaveConfirm(true)}
                    disabled={submitting}
                    className="inline-flex h-8 items-center gap-1 rounded-full border border-rose-500/30 bg-rose-50 dark:bg-rose-950/40 px-3 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition cursor-pointer"
                    title="Unlink from Agency"
                  >
                    <Unlink size={12} />
                    <span>Leave Agency</span>
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {/* Confirmation Dialog for Leave Agency */}
          <ConfirmDialog
            isOpen={showLeaveConfirm}
            onClose={() => setShowLeaveConfirm(false)}
            onConfirm={handleLeaveAgency}
            title="Leave Agency Roster?"
            description="Are you sure you want to unlink from this agency? You will become an independent specialist, and your public profile will no longer display the agency badge or receive team job dispatches."
            itemDetails={{
              label: "Current Agency",
              value: agency.name || "Affiliated Agency",
              subValue: agency.agency_code
                ? `Invite Code: ${agency.agency_code}`
                : undefined,
            }}
            confirmText="Leave Agency"
            cancelText="Cancel"
            variant="danger"
            iconType="remove-user"
            loading={submitting}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-[12px] border border-[#E4E4E7] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#09090B] p-4">
            <h3 className="text-xs font-bold text-[#09090B] dark:text-[#FAFAFA] mb-1">
              Have an Agency Joining Code?
            </h3>
            <p className="text-xs text-[#71717A] dark:text-[#A1A1AA] mb-3">
              If your contractor or agency gave you a 4–6 character invite code
              (e.g. <code>AGN-ADMN</code> or <code>AGN-7K2P</code>), enter it
              below to join their verified roster.
            </p>

            <form
              onSubmit={handleJoinAgency}
              className="flex flex-col sm:flex-row gap-2"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={agencyCodeInput}
                  onChange={(e) =>
                    setAgencyCodeInput(e.target.value.toUpperCase())
                  }
                  placeholder="e.g. AGN-ADMN"
                  className="h-10 w-full rounded-[12px] border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] px-3 font-mono text-sm uppercase tracking-wider text-[#09090B] dark:text-[#FAFAFA] placeholder:text-[#71717A] dark:placeholder:text-[#A1A1AA] outline-hidden focus:border-neutral-400 dark:focus:border-neutral-500 focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={submitting || !agencyCodeInput.trim()}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-black text-white dark:bg-white dark:text-black px-5 text-xs font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-200 shadow-sm transition disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {submitting ? (
                  <>
                    <Loader2 size={13} className="animate-spin text-current" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <Link2 size={13} />
                    <span>Join Agency</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="flex items-center justify-between text-xs text-[#71717A] dark:text-[#A1A1AA] px-1">
            <span>Looking for agencies to collaborate with?</span>
            <Link
              to="/search?type=agencies"
              className="text-[#09090B] dark:text-[#FAFAFA] hover:underline font-semibold inline-flex items-center gap-1"
            >
              <span>Browse registered agencies</span>
              <ArrowRight size={11} />
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
