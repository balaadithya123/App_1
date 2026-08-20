import { useEffect, useState } from "react";
import { ArrowLeft, CalendarClock, ClipboardList, Phone, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { supabase } from "@/lib/supabase";

type CallbackRequest = {
  id: number;
  client_name: string;
  client_phone: string;
  service_needed: string;
  preferred_time: string;
  notes: string | null;
  created_at: string;
  status: "new" | "contacted" | "closed" | string;
};

export default function WorkerCallbackRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<CallbackRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!supabase) {
        if (!cancelled) {
          setError("Callback requests are temporarily unavailable.");
          setLoading(false);
        }
        return;
      }

      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session) {
          navigate("/login", { replace: true });
          return;
        }

        if (sessionData.session.user.user_metadata?.role !== "worker") {
          navigate("/", { replace: true });
          return;
        }

        const response = await fetch("/api/callback-requests", {
          headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
        });
        const data = (await response.json().catch(() => null)) as { requests?: CallbackRequest[]; message?: string } | null;

        if (!response.ok) throw new Error(data?.message || "Unable to load callback requests.");
        if (!cancelled) setRequests(data?.requests ?? []);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load callback requests.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <PageShell hideBack hideHome>
      <div className="mx-auto max-w-[760px] space-y-5">
        <section className="rounded-[20px] border border-black/10 bg-white/70 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.055] sm:p-7">
          <button type="button" onClick={() => navigate("/worker-dashboard")} className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-slate hover:text-navy dark:text-slate-300 dark:hover:text-white">
            <ArrowLeft size={15} /> Back to Worker Portal
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy text-white"><ClipboardList size={20} /></div>
            <div>
              <h1 className="text-[25px] font-extrabold tracking-tight text-navy dark:text-white">Callback Requests</h1>
              <p className="mt-1 text-xs text-slate dark:text-slate-400">People who asked you to contact them about your services.</p>
            </div>
          </div>
        </section>

        {loading && (
          <section className="rounded-[16px] border border-line bg-white p-7 text-center dark:border-white/10 dark:bg-black">
            <p className="text-sm text-slate dark:text-slate-300">Loading your requests...</p>
          </section>
        )}

        {!loading && error && (
          <section role="alert" className="rounded-[16px] border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
            {error}
          </section>
        )}

        {!loading && !error && requests.length === 0 && (
          <section className="rounded-[18px] border border-black/10 bg-white/70 p-8 text-center dark:border-white/10 dark:bg-white/[0.055]">
            <ClipboardList className="mx-auto text-slate" size={30} />
            <h2 className="mt-3 text-lg font-extrabold text-navy dark:text-white">No callback requests yet</h2>
            <p className="mt-1 text-sm text-slate dark:text-slate-400">When someone requests a callback from your profile, it will appear here.</p>
          </section>
        )}

        {!loading && !error && requests.map((request) => (
          <article key={request.id} className="rounded-[18px] border border-black/10 bg-white/70 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.055] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-navy dark:bg-white/10 dark:text-white"><UserRound size={19} /></div>
                <div className="min-w-0">
                  <h2 className="truncate text-base font-extrabold text-navy dark:text-white">{request.client_name}</h2>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate dark:text-slate-400"><Phone size={13} /> {request.client_phone}</p>
                </div>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${request.status === "new" ? "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300" : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"}`}>
                {request.status}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[12px] border border-black/10 bg-white/50 p-3 dark:border-white/10 dark:bg-black/20">
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate dark:text-slate-400">Service needed</p>
                <p className="mt-1 text-sm font-bold text-navy dark:text-white">{request.service_needed}</p>
              </div>
              <div className="rounded-[12px] border border-black/10 bg-white/50 p-3 dark:border-white/10 dark:bg-black/20">
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate dark:text-slate-400">Preferred time</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-navy dark:text-white"><CalendarClock size={14} /> {request.preferred_time}</p>
              </div>
            </div>

            {request.notes && (
              <div className="mt-3 rounded-[12px] border border-black/10 bg-white/50 p-3 dark:border-white/10 dark:bg-black/20">
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate dark:text-slate-400">Notes</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-navy dark:text-white">{request.notes}</p>
              </div>
            )}

            <p className="mt-4 text-[11px] text-slate dark:text-slate-400">
              Requested {new Date(request.created_at).toLocaleString()}
            </p>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
