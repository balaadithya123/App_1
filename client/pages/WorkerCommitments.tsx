import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { supabase } from "@/lib/supabase";

type Commitment={id:string;job_type:string;location:string|null;description:string|null;start_time:string;end_time:string;status:string;cancellation_reason:string|null;worker_notes:string|null};
const tabs=["upcoming","past","cancelled"] as const;
export default function WorkerCommitments() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<typeof tabs[number]>("upcoming");
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
        .select("id,job_type,location,description,start_time,end_time,status,cancellation_reason,worker_notes")
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
      : x.status === "cancelled" || x.status === "no_show"
  );

  return (
    <PageShell backTo="/worker-dashboard" backLabel="Back">
      <section className="rounded-[16px] border border-[#E7ECF1] bg-white p-5 sm:p-7 shadow-soft">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Worker Portal</p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-[#2C2C2C]">My Commitments</h1>
        <p className="mt-1 text-sm text-[#67696D]">Your upcoming, completed and cancelled jobs.</p>
        <div className="mt-6 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-2 text-xs font-semibold capitalize transition-colors cursor-pointer shadow-subtle ${
                tab === t
                  ? "bg-primary text-white"
                  : "border border-[#E7ECF1] bg-white text-[#67696D] hover:bg-[#F6F9FC]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-5 space-y-3">
        {loading ? (
          <p className="rounded-[16px] border border-[#E7ECF1] bg-white p-6 text-center text-sm text-[#67696D] shadow-soft">
            Loading commitments...
          </p>
        ) : filtered.length === 0 ? (
          <p className="rounded-[16px] border border-[#E7ECF1] bg-white p-6 text-center text-sm text-[#67696D] shadow-soft">
            No {tab} commitments yet.
          </p>
        ) : (
          filtered.map((job) => (
            <article key={job.id} className="rounded-[16px] border border-[#E7ECF1] bg-white p-5 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-[#2C2C2C] text-base">{job.job_type}</h2>
                  <p className="mt-1 text-xs text-[#67696D]">{job.location || "Location not set"}</p>
                </div>
                <span className="rounded-full border border-[#E7ECF1] bg-[#F6F9FC] px-3 py-1 text-[11px] font-bold capitalize text-[#2C2C2C]">
                  {job.status.replace("_", " ")}
                </span>
              </div>
              <div className="mt-3 grid gap-2 text-xs text-[#67696D] sm:grid-cols-2">
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={14} className="text-primary" />
                  {new Date(job.start_time).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock3 size={14} className="text-primary" />
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
              {job.description && <p className="mt-3 text-sm text-[#67696D]">{job.description}</p>}
              {job.cancellation_reason && (
                <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-rose-600">
                  <XCircle size={14} />
                  {job.cancellation_reason}
                </p>
              )}
              {job.status === "completed" && (
                <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 size={14} />
                  Completed
                </p>
              )}
            </article>
          ))
        )}
      </section>
    </PageShell>
  );
}
