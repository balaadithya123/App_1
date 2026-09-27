import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
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
      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 sm:p-6 shadow-xs">
        <p className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Worker Portal
        </p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-zinc-950 dark:text-zinc-50 tracking-tight">
          Job Commitments
        </h1>
        <p className="mt-1 text-sm font-medium text-zinc-600 dark:text-zinc-300">
          Your scheduled, completed, and cancelled client appointments.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4.5 py-2 text-xs font-bold capitalize transition-all cursor-pointer shadow-xs ${
                tab === t
                  ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                  : "border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-5 space-y-3.5">
        {loading ? (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center text-sm font-semibold text-zinc-600 dark:text-zinc-300 shadow-xs">
            Loading commitments...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center text-sm font-semibold text-zinc-600 dark:text-zinc-300 shadow-xs">
            No {tab} commitments found.
          </div>
        ) : (
          filtered.map((job) => (
            <article
              key={job.id}
              className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 sm:p-6 shadow-xs"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-extrabold text-zinc-950 dark:text-zinc-50 text-base sm:text-lg">
                    {job.job_type}
                  </h2>
                  <p className="mt-1 text-xs sm:text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                    {job.location || "Location not specified"}
                  </p>
                </div>
                <span className="rounded-full border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 text-xs font-bold capitalize text-zinc-900 dark:text-zinc-100">
                  {job.status.replace("_", " ")}
                </span>
              </div>
              <div className="mt-3.5 grid gap-2.5 text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 sm:grid-cols-2">
                <span className="flex items-center gap-2">
                  <CalendarDays size={15} className="text-zinc-950 dark:text-zinc-50" />
                  {new Date(job.start_time).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <span className="flex items-center gap-2">
                  <Clock3 size={15} className="text-zinc-950 dark:text-zinc-50" />
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
                <p className="mt-3 text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800">
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
    </PageShell>
  );
}
