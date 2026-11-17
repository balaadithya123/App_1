import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { BadgeCheck, CalendarDays, CheckCircle2, MapPin, XCircle } from "lucide-react";
import PageShell from "@/components/PageShell";
import { FormCardSkeleton } from "@/components/PageSkeletons";
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
        {view === "loading" && <FormCardSkeleton />}

        {view === "signed-out" && (
          <div className="space-y-4 rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-6 sm:p-8 text-center shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#F4512C]">
              Work Passbook
            </span>
            <h1 className="text-xl font-extrabold tracking-tight text-[#141210] dark:text-[#FAFAFA]">Confirm your job</h1>
            <p className="text-sm text-[#6B645F] dark:text-[#9E958F]">
              A worker shared a job with you. Sign in to see the details and confirm it. Confirming builds the
              worker's Work Passbook, so future customers can trust them.
            </p>
            <Link
              to={`/login?next=${nextParam}`}
              className="inline-flex w-full items-center justify-center rounded-full bg-[#F4512C] hover:bg-[#E04320] px-4 py-3 text-sm font-bold text-white shadow-sm transition"
            >
              Sign in
            </Link>
            <Link to="/register" className="block text-xs font-bold text-[#F4512C] hover:underline">
              New here? Create an account, then open this link again
            </Link>
          </div>
        )}

        {view === "error" && (
          <div className="space-y-3 rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-8 text-center shadow-sm">
            <p className="text-sm text-[#6B645F] dark:text-[#9E958F]">{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-4 py-2 text-xs font-bold text-[#141210] dark:text-[#FAFAFA] hover:border-[#F4512C]/50 transition cursor-pointer"
            >
              Try again
            </button>
          </div>
        )}

        {view === "ready" && preview && (
          <article className="space-y-4 rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-6 shadow-sm">
            <div className="flex items-center gap-3">
              {preview.slip.worker_photo_url ? (
                <img src={preview.slip.worker_photo_url} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-[#EAE2DC] dark:ring-white/10" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FCEAE4] dark:bg-[#3A2018] text-sm font-bold text-[#F4512C]">
                  {preview.slip.worker_name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-[#141210] dark:text-[#FAFAFA]">{preview.slip.worker_name}</p>
                <p className="text-xs text-[#6B645F] dark:text-[#9E958F]">{preview.slip.worker_category ?? "Worker"}</p>
              </div>
            </div>

            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-[#141210] dark:text-[#FAFAFA]">{preview.slip.service_label}</h1>
              {preview.slip.description && (
                <p className="mt-1 text-sm text-[#6B645F] dark:text-[#9E958F]">{preview.slip.description}</p>
              )}
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] p-3">
                <dt className="text-[11px] font-bold uppercase tracking-wider text-[#6B645F] dark:text-[#9E958F]">Agreed rate</dt>
                <dd className="mt-0.5 font-bold text-[#141210] dark:text-[#FAFAFA]">
                  {formatRupees(preview.slip.agreed_rate)} {RATE_UNIT_LABEL[preview.slip.rate_unit]}
                </dd>
              </div>
              <div className="rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] p-3">
                <dt className="text-[11px] font-bold uppercase tracking-wider text-[#6B645F] dark:text-[#9E958F]">Advance</dt>
                <dd className="mt-0.5 font-bold text-[#141210] dark:text-[#FAFAFA]">
                  {preview.slip.advance > 0 ? formatRupees(preview.slip.advance) : "None"}
                </dd>
              </div>
            </dl>

            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#6B645F] dark:text-[#9E958F]">
              <span className="inline-flex items-center gap-1">
                <CalendarDays size={13} className="text-[#F4512C]" /> {preview.slip.job_date}
              </span>
              {preview.slip.locality && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={13} className="text-[#0F8A73]" /> {preview.slip.locality}
                </span>
              )}
            </p>

            {preview.is_own ? (
              <p className="rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] p-3 text-xs text-[#6B645F] dark:text-[#9E958F]">
                This is your own job slip. Send the link to your customer so they can confirm it.
              </p>
            ) : preview.can_respond ? (
              <div className="space-y-2.5 pt-2 border-t border-[#EAE2DC] dark:border-white/10">
                <p className="text-xs text-[#6B645F] dark:text-[#9E958F]">
                  Only confirm if this matches what you and the worker agreed. The app does not handle any payment.
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void respond("confirm")}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0F8A73] hover:bg-[#0B6E5B] px-4 py-3 text-sm font-bold text-white shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  <BadgeCheck size={16} /> Yes, this is correct
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void respond("decline")}
                  className="w-full rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-4 py-3 text-sm font-bold text-[#141210] dark:text-[#FAFAFA] hover:border-rose-500/40 transition disabled:opacity-50 cursor-pointer"
                >
                  No, this is not right
                </button>
              </div>
            ) : (
              <p
                className={`inline-flex items-center gap-2 text-sm font-bold ${
                  preview.slip.status === "confirmed" ? "text-[#0F8A73] dark:text-[#3DD1B3]" : "text-[#6B645F] dark:text-[#9E958F]"
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
