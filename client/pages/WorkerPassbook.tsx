import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, MessageCircle, Plus, Trash2, X } from "lucide-react";
import PageShell from "@/components/PageShell";
import { ListRowsSkeleton } from "@/components/PageSkeletons";
import { supabase } from "@/lib/supabase";
import { PassbookError, formatRupees, passbookApi, todayIso } from "@/lib/passbook";
import {
  RATE_UNITS,
  RATE_UNIT_LABEL,
  buildSlipShareMessage,
  validateJobSlip,
  validateWorkerRate,
  type JobRecord,
  type RateUnit,
  type WorkerRate,
} from "@shared/passbook";

type MineResponse = {
  worker: { id: string; name: string; category: string | null };
  jobs: JobRecord[];
  rates: WorkerRate[];
};

const fieldClass =
  "w-full rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-3.5 py-2.5 text-sm text-[#141210] dark:text-[#FAFAFA] placeholder:text-[#6B645F] dark:placeholder:text-[#9E958F] outline-none transition focus:border-[#F4512C]";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  confirmed: "bg-[#0F8A73]/10 text-[#0F8A73]",
  declined: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  cancelled: "bg-[#F5EFEA] dark:bg-[#242220] text-[#6B645F] dark:text-[#9E958F]",
};

export default function WorkerPassbook() {
  const navigate = useNavigate();
  const [state, setState] = useState<"loading" | "ready" | "blocked" | "error">("loading");
  const [message, setMessage] = useState("");
  const [data, setData] = useState<MineResponse | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState("");
  const [details, setDetails] = useState("");
  const [date, setDate] = useState(todayIso());
  const [rate, setRate] = useState("");
  const [unit, setUnit] = useState<RateUnit>("job");
  const [advance, setAdvance] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [rates, setRates] = useState<WorkerRate[]>([]);
  const [savingRates, setSavingRates] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        navigate("/login", { replace: true });
        return;
      }
      if (auth.user.user_metadata?.role !== "worker") {
        navigate("/", { replace: true });
        return;
      }
      const result = await passbookApi<MineResponse>("/api/passbook/mine", { auth: true });
      setData(result);
      setRates(result.rates);
      setState("ready");
    } catch (err) {
      const e = err instanceof PassbookError ? err : null;
      setMessage(err instanceof Error ? err.message : "Couldn't load your Work Passbook.");
      setState(e && (e.code === "phone_not_verified" || e.code === "not_ready" || e.code === "worker_not_found") ? "blocked" : "error");
    }
  }, [navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  const shareSlip = (job: JobRecord, workerName: string) => {
    const url = `${window.location.origin}/job/${job.claim_token}`;
    const text = buildSlipShareMessage({
      workerName,
      serviceLabel: job.service_label,
      jobDate: job.job_date,
      agreedRate: Number(job.agreed_rate),
      rateUnit: job.rate_unit,
      advance: Number(job.advance),
      url,
    });
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  const createSlip = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const input = {
      service_label: label.trim(),
      description: details.trim() || null,
      job_date: date,
      agreed_rate: Number(rate),
      rate_unit: unit,
      advance: advance ? Number(advance) : 0,
    };
    const problem = validateJobSlip(input);
    if (problem) {
      setFormError(problem);
      return;
    }
    setSaving(true);
    try {
      const result = await passbookApi<{ job: JobRecord; worker_name: string }>("/api/passbook/jobs", {
        method: "POST",
        auth: true,
        body: input,
      });
      toast.success("Job slip created. Send it to your customer.");
      setLabel("");
      setDetails("");
      setRate("");
      setAdvance("");
      setShowForm(false);
      await load();
      shareSlip(result.job, result.worker_name);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Couldn't create the job slip.");
    } finally {
      setSaving(false);
    }
  };

  const cancelSlip = async (id: string) => {
    try {
      await passbookApi(`/api/passbook/jobs/${id}/cancel`, { method: "POST", auth: true });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't cancel this job.");
      await load();
    }
  };

  const updateRate = (i: number, patch: Partial<WorkerRate>) =>
    setRates((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const saveRates = async () => {
    for (const r of rates) {
      const problem = validateWorkerRate(r);
      if (problem) {
        toast.error(problem);
        return;
      }
    }
    setSavingRates(true);
    try {
      await passbookApi("/api/passbook/rates", { method: "PUT", auth: true, body: { rates } });
      toast.success("Rates saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save your rates.");
    } finally {
      setSavingRates(false);
    }
  };

  return (
    <PageShell backTo="/worker-dashboard" backLabel="Dashboard" containerWidth="md">
      <div className="space-y-6 pb-24">
        <div className="rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-gradient-to-br from-[#FFF4EF] via-[#FAF8F5] to-[#F5EAE2] dark:from-[#261B16] dark:via-[#1C1512] dark:to-[#15110F] p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#F4512C]">
            Verified Work Ledger
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#141210] dark:text-[#FAFAFA]">
            Work Passbook
          </h1>
          <p className="mt-1 text-sm text-[#6B645F] dark:text-[#9E958F]">
            Record each job with your customer. When they confirm it, it becomes part of your public work history.
          </p>
        </div>

        {state === "loading" && <ListRowsSkeleton count={3} columns={1} />}

        {(state === "blocked" || state === "error") && (
          <div className="space-y-3 rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-8 text-center">
            <p className="text-sm text-[#6B645F] dark:text-[#9E958F]">{message}</p>
            {state === "error" ? (
              <button
                type="button"
                onClick={() => {
                  setState("loading");
                  void load();
                }}
                className="rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-4 py-2 text-xs font-semibold text-[#141210] dark:text-[#FAFAFA] hover:border-[#F4512C]/50 cursor-pointer"
              >
                Try again
              </button>
            ) : (
              <Link to="/worker-dashboard" className="text-xs font-semibold text-[#F4512C] underline">
                Back to dashboard
              </Link>
            )}
          </div>
        )}

        {state === "ready" && data && (
          <>
            <section className="space-y-3 rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#141210] dark:text-[#FAFAFA]">Jobs</h2>
                <button
                  type="button"
                  onClick={() => setShowForm((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#F4512C] hover:bg-[#E04320] px-4 py-2 text-xs font-bold text-white transition cursor-pointer"
                >
                  {showForm ? <X size={13} /> : <Plus size={13} />}
                  {showForm ? "Close" : "New job slip"}
                </button>
              </div>

              {showForm && (
                <form
                  onSubmit={(e) => void createSlip(e)}
                  className="space-y-3 rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] p-4"
                >
                  <input className={fieldClass} placeholder="Job (e.g. Kitchen tap repair)" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} />
                  <textarea className={fieldClass} rows={2} placeholder="Details (optional)" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={300} />
                  <div className="grid grid-cols-2 gap-3">
                    <input className={fieldClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Job date" />
                    <select className={fieldClass} value={unit} onChange={(e) => setUnit(e.target.value as RateUnit)} aria-label="Rate type">
                      {RATE_UNITS.map((u) => (
                        <option key={u} value={u}>
                          {RATE_UNIT_LABEL[u]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input className={fieldClass} inputMode="decimal" placeholder="Agreed rate (₹)" value={rate} onChange={(e) => setRate(e.target.value.replace(/[^\d.]/g, ""))} />
                    <input className={fieldClass} inputMode="decimal" placeholder="Advance (₹, optional)" value={advance} onChange={(e) => setAdvance(e.target.value.replace(/[^\d.]/g, ""))} />
                  </div>
                  {formError && <p className="text-xs font-medium text-rose-500">{formError}</p>}
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0F8A73] hover:bg-[#0B6E5B] px-4 py-3 text-sm font-bold text-white disabled:opacity-50 transition cursor-pointer"
                  >
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <MessageCircle size={15} />}
                    Create and send on WhatsApp
                  </button>
                </form>
              )}

              {data.jobs.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] p-8 text-center text-sm text-[#6B645F] dark:text-[#9E958F]">
                  No jobs yet. After you agree a job with a customer, create a slip and send it to them.
                </p>
              ) : (
                <ul className="space-y-3">
                  {data.jobs.map((job) => (
                    <li key={job.id} className="space-y-2 rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-[#141210] dark:text-[#FAFAFA]">{job.service_label}</p>
                          <p className="text-xs text-[#6B645F] dark:text-[#9E958F]">
                            {job.job_date} · {formatRupees(Number(job.agreed_rate))} {RATE_UNIT_LABEL[job.rate_unit]}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLE[job.status] ?? ""}`}>
                          {job.status}
                        </span>
                      </div>
                      {job.status === "pending" && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => shareSlip(job, data.worker.name)}
                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#0F8A73] hover:bg-[#0B6E5B] px-3 py-2 text-xs font-bold text-white transition cursor-pointer"
                          >
                            <MessageCircle size={13} /> Send again
                          </button>
                          <button
                            type="button"
                            aria-label={`Cancel ${job.service_label}`}
                            onClick={() => void cancelSlip(job.id)}
                            className="rounded-full border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] px-3 text-rose-600 dark:text-rose-400 hover:border-rose-500/40 cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-3 rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 sm:p-6">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#F4512C]">
                  Pricing Transparency
                </p>
                <h2 className="mt-0.5 text-base font-bold text-[#141210] dark:text-[#FAFAFA]">My typical rates</h2>
                <p className="text-xs text-[#6B645F] dark:text-[#9E958F]">
                  Shown on your profile and used in the Fair Rate Guide, so customers know what to expect.
                </p>
              </div>
              {rates.map((r, i) => (
                <div key={i} className="space-y-2 rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] p-3.5">
                  <input className={fieldClass} placeholder="Service (e.g. Tap repair)" value={r.service_label} onChange={(e) => updateRate(i, { service_label: e.target.value })} maxLength={60} />
                  <div className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2">
                    <input className={fieldClass} inputMode="decimal" placeholder="From ₹" value={r.rate_min || ""} onChange={(e) => updateRate(i, { rate_min: Number(e.target.value.replace(/[^\d.]/g, "")) })} />
                    <input className={fieldClass} inputMode="decimal" placeholder="To ₹" value={r.rate_max || ""} onChange={(e) => updateRate(i, { rate_max: Number(e.target.value.replace(/[^\d.]/g, "")) })} />
                    <select className={fieldClass} value={r.rate_unit} onChange={(e) => updateRate(i, { rate_unit: e.target.value as RateUnit })} aria-label="Rate type">
                      {RATE_UNITS.map((u) => (
                        <option key={u} value={u}>
                          {RATE_UNIT_LABEL[u]}
                        </option>
                      ))}
                    </select>
                    <button type="button" aria-label="Remove rate" onClick={() => setRates((rows) => rows.filter((_, idx) => idx !== i))} className="rounded-full p-1.5 text-[#6B645F] dark:text-[#9E958F] hover:text-rose-500 cursor-pointer">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex gap-2">
                {rates.length < 10 && (
                  <button
                    type="button"
                    onClick={() => setRates((rows) => [...rows, { service_label: "", rate_min: 0, rate_max: 0, rate_unit: "job" }])}
                    className="inline-flex items-center gap-1 rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-4 py-2 text-xs font-semibold text-[#141210] dark:text-[#FAFAFA] hover:border-[#F4512C]/50 cursor-pointer"
                  >
                    <Plus size={13} /> Add a rate
                  </button>
                )}
                <button
                  type="button"
                  disabled={savingRates}
                  onClick={() => void saveRates()}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#141210] text-white dark:bg-white dark:text-[#11100F] px-5 py-2 text-xs font-bold disabled:opacity-50 hover:opacity-90 cursor-pointer"
                >
                  {savingRates && <Loader2 size={13} className="animate-spin" />} Save rates
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </PageShell>
  );
}
