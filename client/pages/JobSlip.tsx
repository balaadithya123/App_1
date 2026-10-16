import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { BadgeCheck, CalendarDays, CheckCircle2, Loader2, MapPin, XCircle } from "lucide-react";
import PageShell from "@/components/PageShell";
import { supabase } from "@/lib/supabase";
import { PassbookError, formatRupees, passbookApi } from "@/lib/passbook";
import { RATE_UNIT_LABEL, type JobSlipPreview } from "@shared/passbook";

type Preview = { slip: JobSlipPreview; can_respond: boolean; is_own: boolean };
type ViewState = "loading" | "signed-out" | "ready" | "error";

export default function JobSlip() {
  const { token = "" } = useParams<{ token: string }>();
  const [view, setView] = useState<ViewState>("loading");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setView("loading");
    try {
      const { data } = await supabase.auth.getSession();
      if (!data?.session) {
        setView("signed-out");
        return;
      }
      const result = await passbookApi<Preview>(`/api/passbook/slips/${token}`, { auth: true });
      setPreview(result);
      setView("ready");
    } catch (err) {
      if (err instanceof PassbookError && err.code === "unauthorized") {
        setView("signed-out");
        return;
      }
      setError(err instanceof Error ? err.message : "Couldn't open this job.");
      setView("error");
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const respond = async (action: "confirm" | "decline") => {
    setBusy(true);
    try {
      await passbookApi(`/api/passbook/slips/${token}/respond`, {
        method: "POST",
        auth: true,
        body: { action },
      });
      toast.success(action === "confirm" ? "Job confirmed" : "Job declined");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save your answer.");
      await load();
    } finally {
      setBusy(false);
    }
  };

  const nextParam = encodeURIComponent(`/job/${token}`);

  return (
    <PageShell backTo="/home" backLabel="Home" containerWidth="sm">
      <div className="space-y-5 pb-24">
        {view === "loading" && (
          <div className="flex min-h-[30vh] items-center justify-center" aria-busy="true">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}

        {view === "signed-out" && (
          <div className="space-y-4 rounded-2xl border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] p-6 text-center">
            <h1 className="text-xl font-bold tracking-tight">Confirm your job</h1>
            <p className="text-sm text-[#71717A]">
              A worker shared a job with you. Sign in to see the details and confirm it. Confirming builds the
              worker's Work Passbook, so future customers can trust them.
            </p>
            <Link
              to={`/login?next=${nextParam}`}
              className="inline-flex w-full items-center justify-center rounded-full bg-black px-4 py-3 text-sm font-semibold text-white dark:bg-white dark:text-black"
            >
              Sign in
            </Link>
            <Link to="/register" className="block text-xs font-semibold underline">
              New here? Create an account, then open this link again
            </Link>
          </div>
        )}

        {view === "error" && (
          <div className="space-y-3 rounded-2xl border border-[#E4E4E7] dark:border-[#27272A] p-8 text-center">
            <p className="text-sm text-[#71717A]">{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-full border border-neutral-300 px-4 py-2 text-xs font-semibold dark:border-neutral-700"
            >
              Try again
            </button>
          </div>
        )}

        {view === "ready" && preview && (
          <article className="space-y-4 rounded-2xl border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] p-5">
            <div className="flex items-center gap-3">
              {preview.slip.worker_photo_url ? (
                <img src={preview.slip.worker_photo_url} alt="" className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-sm font-bold dark:bg-white/5">
                  {preview.slip.worker_name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">{preview.slip.worker_name}</p>
                <p className="text-xs text-[#71717A]">{preview.slip.worker_category ?? "Worker"}</p>
              </div>
            </div>

            <div>
              <h1 className="text-lg font-bold tracking-tight">{preview.slip.service_label}</h1>
              {preview.slip.description && (
                <p className="mt-1 text-sm text-[#52525B] dark:text-[#A1A1AA]">{preview.slip.description}</p>
              )}
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-zinc-50 p-3 dark:bg-white/5">
                <dt className="text-[11px] text-[#71717A]">Agreed rate</dt>
                <dd className="font-semibold">
                  {formatRupees(preview.slip.agreed_rate)} {RATE_UNIT_LABEL[preview.slip.rate_unit]}
                </dd>
              </div>
              <div className="rounded-xl bg-zinc-50 p-3 dark:bg-white/5">
                <dt className="text-[11px] text-[#71717A]">Advance</dt>
                <dd className="font-semibold">
                  {preview.slip.advance > 0 ? formatRupees(preview.slip.advance) : "None"}
                </dd>
              </div>
            </dl>

            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#52525B] dark:text-[#A1A1AA]">
              <span className="inline-flex items-center gap-1">
                <CalendarDays size={13} /> {preview.slip.job_date}
              </span>
              {preview.slip.locality && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={13} /> {preview.slip.locality}
                </span>
              )}
            </p>

            {preview.is_own ? (
              <p className="rounded-xl bg-zinc-50 p-3 text-xs text-[#52525B] dark:bg-white/5 dark:text-[#A1A1AA]">
                This is your own job slip. Send the link to your customer so they can confirm it.
              </p>
            ) : preview.can_respond ? (
              <div className="space-y-2.5">
                <p className="text-xs text-[#71717A]">
                  Only confirm if this matches what you and the worker agreed. The app does not handle any payment.
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void respond("confirm")}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-black"
                >
                  <BadgeCheck size={16} /> Yes, this is correct
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void respond("decline")}
                  className="w-full rounded-full border border-neutral-300 px-4 py-3 text-sm font-semibold disabled:opacity-50 dark:border-neutral-700"
                >
                  No, this is not right
                </button>
              </div>
            ) : (
              <p
                className={`inline-flex items-center gap-2 text-sm font-semibold ${
                  preview.slip.status === "confirmed" ? "text-emerald-600 dark:text-emerald-400" : "text-[#71717A]"
                }`}
              >
                {preview.slip.status === "confirmed" ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                This job is {preview.slip.status}.
              </p>
            )}
          </article>
        )}
      </div>
    </PageShell>
  );
}
