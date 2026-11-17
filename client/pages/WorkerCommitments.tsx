import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { ListRowsSkeleton } from "@/components/PageSkeletons";
import { supabase } from "@/lib/supabase";

type Commitment = {
  id: string;
  job_type: string;
  location: string | null;
  description: string | null;
  start_time: string;
  end_time: string;
  status: string;
  cancellation_reason: string | null;
  worker_notes: string | null;
};

const tabs = ["upcoming", "past", "cancelled"] as const;

export default function WorkerCommitments() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<(typeof tabs)[number]>("upcoming");
  const [items, setItems] = useState<Commitment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user || user.user_metadata?.role !== "worker") {
        navigate("/", { replace: true });
        return;
      }
      const { data, error } = await supabase
        .from("commitments")
        .select(
          "id,job_type,location,description,start_time,end_time,status,cancellation_reason,worker_notes",
        )
        .eq("worker_id", user.id)
        .order("start_time", { ascending: true });
      if (!error) setItems((data ?? []) as Commitment[]);
      setLoading(false);
    })();
  }, [navigate]);

  const filtered = items.filter((x) =>
    tab === "upcoming"
      ? x.status === "pending" || x.status === "confirmed"
      : tab === "past"
        ? x.status === "completed"
        : x.status === "cancelled" || x.status === "no_show",
  );

  return (
    <PageShell backTo="/worker-dashboard" backLabel="Back" headerTitle="My Commitments">
      <div className="mx-auto max-w-4xl space-y-5">
        <section className="rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-gradient-to-br from-[#FFF4EF] via-[#FAF8F5] to-[#F5EAE2] dark:from-[#261B16] dark:via-[#1C1512] dark:to-[#15110F] p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#F4512C]">
            Worker Portal
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-[#141210] dark:text-[#FAFAFA] tracking-tight">
            Job Commitments
          </h1>
          <p className="mt-1 text-sm text-[#6B645F] dark:text-[#9E958F]">
            Your scheduled, completed, and cancelled client appointments.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-full px-4 py-2 text-xs font-bold capitalize transition-all cursor-pointer ${
                  tab === t
                    ? "bg-[#F4512C] text-white"
                    : "border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] text-[#6B645F] dark:text-[#9E958F] hover:text-[#141210] dark:hover:text-white hover:border-[#F4512C]/50"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3.5">
          {loading ? (
            <ListRowsSkeleton count={3} columns={1} />
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-8 text-center text-sm font-medium text-[#6B645F] dark:text-[#9E958F]">
              No {tab} commitments found.
            </div>
          ) : (
            filtered.map((job) => (
              <article
                key={job.id}
                className="rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 sm:p-6 transition hover:border-[#F4512C]/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-[#141210] dark:text-[#FAFAFA] text-base sm:text-lg">
                      {job.job_type}
                    </h2>
                    <p className="mt-1 text-xs sm:text-sm text-[#6B645F] dark:text-[#9E958F]">
                      {job.location || "Location not specified"}
                    </p>
                  </div>
                  <span className="rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-3 py-1 text-xs font-bold capitalize text-[#141210] dark:text-[#FAFAFA]">
                    {job.status.replace("_", " ")}
                  </span>
                </div>
                <div className="mt-3.5 grid gap-2.5 text-xs sm:text-sm font-semibold text-[#141210] dark:text-[#FAFAFA] sm:grid-cols-2">
                  <span className="flex items-center gap-2">
                    <CalendarDays size={15} className="text-[#F4512C]" />
                    {new Date(job.start_time).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span className="flex items-center gap-2">
                    <Clock3 size={15} className="text-[#F4512C]" />
                    {new Date(job.start_time).toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}{" "}
                    –{" "}
                    {new Date(job.end_time).toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {job.description && (
                  <p className="mt-3 text-xs sm:text-sm text-[#141210] dark:text-[#FAFAFA] p-3 rounded-xl bg-[#FAF8F5] dark:bg-[#0B0A09] border border-[#EAE2DC] dark:border-white/10">
                    {job.description}
                  </p>
                )}
                {job.cancellation_reason && (
                  <p className="mt-3 flex items-center gap-2 text-xs sm:text-sm font-bold text-rose-700 dark:text-rose-400">
                    <span>Cancellation reason:</span>
                    <span>{job.cancellation_reason}</span>
                  </p>
                )}
              </article>
            ))
          )}
        </section>
      </div>
    </PageShell>
  );
}
