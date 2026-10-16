import { useEffect, useState } from "react";
import { BadgeCheck } from "lucide-react";
import { formatRupees, passbookApi } from "@/lib/passbook";
import { RATE_UNIT_LABEL, type PublicPassbook } from "@shared/passbook";

/**
 * Public Work Passbook summary on a worker's profile. Renders nothing until
 * the worker has a confirmed job or a listed rate, and stays silent if the
 * feature is not available yet.
 */
export default function WorkerPassbookSection({ workerId }: { workerId: string }) {
  const [data, setData] = useState<PublicPassbook | null>(null);

  useEffect(() => {
    let mounted = true;
    setData(null);
    passbookApi<PublicPassbook>(`/api/passbook/workers/${encodeURIComponent(workerId)}`)
      .then((result) => {
        if (mounted) setData(result);
      })
      .catch(() => {
        // Optional section: a failed load just hides it.
      });
    return () => {
      mounted = false;
    };
  }, [workerId]);

  if (!data || (data.confirmed_jobs === 0 && data.rates.length === 0)) return null;

  return (
    <section
      aria-labelledby="passbook-heading"
      className="rounded-[16px] border border-[#E7ECF1] dark:border-[#1F1F1F] bg-white dark:bg-[#0A0A0A] p-4 sm:p-5 shadow-soft"
    >
      <h2 id="passbook-heading" className="flex items-center gap-2 text-sm sm:text-base font-bold">
        <BadgeCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
        Work Passbook
      </h2>

      {data.confirmed_jobs > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-sm">
            <span className="font-semibold">{data.confirmed_jobs}</span> job{data.confirmed_jobs === 1 ? "" : "s"}{" "}
            confirmed by customers
            {data.distinct_customers > 0 ? ` (${data.distinct_customers} different customer${data.distinct_customers === 1 ? "" : "s"})` : ""}
          </p>
          <ul className="space-y-1 text-xs text-[#52525B] dark:text-[#A1A1AA]">
            {data.recent.map((job, i) => (
              <li key={`${job.service_label}-${i}`}>
                {job.service_label} · {job.month}
                {job.locality ? ` · ${job.locality}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.rates.length > 0 && (
        <div className="mt-3 space-y-1">
          <p className="text-xs font-semibold text-[#71717A]">Typical rates (set by the worker)</p>
          <ul className="space-y-1 text-sm">
            {data.rates.map((r, i) => (
              <li key={`${r.service_label}-${i}`} className="flex justify-between gap-3">
                <span>{r.service_label}</span>
                <span className="font-medium">
                  {formatRupees(r.rate_min)}
                  {r.rate_max !== r.rate_min ? ` – ${formatRupees(r.rate_max)}` : ""} {RATE_UNIT_LABEL[r.rate_unit]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
