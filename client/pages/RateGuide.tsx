import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Search } from "lucide-react";
import PageShell from "@/components/PageShell";
import { getStandardLocation } from "@/lib/location";
import { TRADE_CATEGORIES, formatRupees, passbookApi } from "@/lib/passbook";
import { RATE_UNIT_LABEL, type RateGuideResponse } from "@shared/passbook";

const inputClass =
  "w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0D0D10] px-3 py-2.5 text-sm outline-none transition focus:border-neutral-500";

export default function RateGuide() {
  const [category, setCategory] = useState<string>(TRADE_CATEGORIES[0]);
  const [location, setLocation] = useState(() => getStandardLocation());
  const [query, setQuery] = useState({ category: TRADE_CATEGORIES[0] as string, location: getStandardLocation() });
  const [result, setResult] = useState<RateGuideResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ category: query.category });
    if (query.location.trim()) params.set("location", query.location.trim());
    passbookApi<RateGuideResponse>(`/api/rate-guide?${params.toString()}`)
      .then((r) => {
        if (mounted) setResult(r);
      })
      .catch((err) => {
        if (!mounted) return;
        setResult(null);
        setError(err?.code === "not_ready" ? "The Fair Rate Guide is not available yet." : err?.message || "Couldn't load rates.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [query]);

  const searchHref = `/search?service=${encodeURIComponent(query.category)}${
    query.location.trim() ? `&location=${encodeURIComponent(query.location.trim())}` : ""
  }`;

  return (
    <PageShell backTo="/home" backLabel="Home" containerWidth="md">
      <div className="space-y-5 pb-24">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fair Rate Guide</h1>
          <p className="mt-0.5 text-sm text-[#71717A]">
            See what jobs usually cost in your area before you call a worker.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setQuery({ category, location });
          }}
          className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_1fr_auto]"
        >
          <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Trade">
            {TRADE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input className={inputClass} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Area or city" aria-label="Area or city" />
          <button type="submit" className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-black">
            <Search size={14} /> Show
          </button>
        </form>

        {loading ? (
          <div className="flex min-h-[20vh] items-center justify-center" aria-busy="true">
            <Loader2 className="h-7 w-7 animate-spin" />
          </div>
        ) : error ? (
          <p className="rounded-2xl border border-[#E4E4E7] dark:border-[#27272A] p-8 text-center text-sm text-[#71717A]">{error}</p>
        ) : result && result.groups.length > 0 ? (
          <div className="space-y-3">
            {result.groups.map((g) => (
              <article key={g.unit} className="space-y-1 rounded-2xl border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#71717A]">{RATE_UNIT_LABEL[g.unit]}</p>
                <p className="text-2xl font-bold tracking-tight">
                  {formatRupees(g.low ?? 0)} – {formatRupees(g.high ?? 0)}
                </p>
                <p className="text-sm text-[#52525B] dark:text-[#A1A1AA]">
                  Middle price about {formatRupees(g.typical ?? 0)}
                </p>
                <p className="text-xs text-[#71717A]">
                  {g.source === "jobs"
                    ? `Based on ${g.sample_size} jobs confirmed by customers in the last year`
                    : `Based on rates listed by ${g.sample_size} workers. It will use real confirmed jobs as they build up`}
                </p>
              </article>
            ))}
            <p className="px-1 text-[11px] text-[#71717A]">
              This is a guide, not a fixed price. The final rate depends on the job, materials and distance, so always agree it with the worker first.
            </p>
          </div>
        ) : (
          <div className="space-y-3 rounded-2xl border border-[#E4E4E7] dark:border-[#27272A] p-8 text-center">
            <p className="text-sm text-[#71717A]">
              Not enough prices yet for {query.category.toLowerCase()}s{query.location.trim() ? ` in ${query.location.trim()}` : ""}. Try a wider area.
            </p>
            <Link to={searchHref} className="inline-block text-xs font-semibold underline">
              Browse {query.category.toLowerCase()}s instead
            </Link>
          </div>
        )}
      </div>
    </PageShell>
  );
}
