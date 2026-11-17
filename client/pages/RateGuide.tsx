import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import PageShell from "@/components/PageShell";
import { RateGuideSkeleton } from "@/components/PageSkeletons";
import { getStandardLocation } from "@/lib/location";
import { TRADE_CATEGORIES, formatRupees, passbookApi } from "@/lib/passbook";
import { RATE_UNIT_LABEL, type RateGuideResponse } from "@shared/passbook";
import { useLanguage } from "@/lib/i18n";

const inputClass =
  "w-full rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] px-3.5 py-2.5 text-sm text-[#141210] dark:text-[#FAFAFA] outline-none transition focus:border-[#F4512C]";

export default function RateGuide() {
  const { t, translateCategory } = useLanguage();
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
    <PageShell backTo="/home" backLabel={t("nav.home")} containerWidth="md">
      <div className="space-y-6 pb-24">
        <section className="rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-gradient-to-br from-[#FFF4EF] via-[#FAF8F5] to-[#F5EAE2] dark:from-[#261B16] dark:via-[#1C1512] dark:to-[#15110F] p-6 sm:p-7 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#F4512C]">
            {t("rate.eyebrow")}
          </span>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#141210] dark:text-[#FAFAFA]">
            {t("rate.title")}
          </h1>
          <p className="mt-1.5 text-sm text-[#6B645F] dark:text-[#9E958F]">
            {t("rate.sub")}
          </p>
        </section>

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
                {translateCategory(c)}
              </option>
            ))}
          </select>
          <input className={inputClass} value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t("rate.areaPlaceholder")} aria-label={t("rate.areaPlaceholder")} />
          <button type="submit" className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#F4512C] hover:bg-[#E04320] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition cursor-pointer active:scale-95">
            <Search size={14} /> {t("rate.showRates")}
          </button>
        </form>

        {loading ? (
          <RateGuideSkeleton />
        ) : error ? (
          <p className="rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-8 text-center text-sm text-[#6B645F] dark:text-[#9E958F]">{error}</p>
        ) : result && result.groups.length > 0 ? (
          <div className="space-y-3">
            {result.groups.map((g) => (
              <article key={g.unit} className="space-y-1.5 rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#F4512C]">{RATE_UNIT_LABEL[g.unit]}</p>
                <p className="text-2xl font-extrabold tracking-tight text-[#141210] dark:text-[#FAFAFA]">
                  {formatRupees(g.low ?? 0)} – {formatRupees(g.high ?? 0)}
                </p>
                <p className="text-sm font-medium text-[#6B645F] dark:text-[#9E958F]">
                  {t("rate.middlePrice")}{" "}
                  <span className="font-bold text-[#141210] dark:text-[#FAFAFA]">
                    {formatRupees(g.typical ?? 0)}
                  </span>
                </p>
                <p className="text-xs text-[#6B645F] dark:text-[#9E958F]">
                  {g.source === "jobs"
                    ? `Based on ${g.sample_size} jobs confirmed by customers in the last year`
                    : `Based on rates listed by ${g.sample_size} workers. It will use real confirmed jobs as they build up`}
                </p>
              </article>
            ))}
            <p className="px-1 text-[11px] text-[#6B645F] dark:text-[#9E958F]">
              {t("rate.disclaimer")}
            </p>
          </div>
        ) : (
          <div className="space-y-3 rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-8 text-center shadow-sm">
            <p className="text-sm text-[#6B645F] dark:text-[#9E958F]">
              Not enough prices yet for {query.category.toLowerCase()}s{query.location.trim() ? ` in ${query.location.trim()}` : ""}. Try a wider area.
            </p>
            <Link to={searchHref} className="inline-flex items-center gap-1.5 rounded-full bg-[#141210] text-white dark:bg-white dark:text-[#11100F] px-4 py-2 text-xs font-bold hover:opacity-90 transition">
              Browse {query.category.toLowerCase()}s instead
            </Link>
          </div>
        )}
      </div>
    </PageShell>
  );
}
