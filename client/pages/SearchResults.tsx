import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Search as SearchIcon,
  Heart,
  BadgeCheck,
  Building2,
  Users,
  MessageCircle,
  Phone,
  Clock,
  Sparkles,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  BrainCircuit,
  RotateCcw,
  AlertTriangle,
  X,
  Zap,
  Wrench,
  Hammer,
  Paintbrush,
  Brush,
  Wind,
  LayoutGrid,
  Star,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import PageShell from "@/components/PageShell";
import NavBar from "@/components/NavBar";
import RateWorkerModal from "@/components/RateWorkerModal";
import { workers as staticWorkers, type Worker } from "@/data/workers";
import type { WorkersResponse } from "@shared/api";
import { getSavedWorkerIds, toggleSavedWorker } from "@/lib/favorites";
import { getComputedWorkerRating } from "@/lib/ratings";
import { logAnalyticsEvent, logContactEvent } from "@/lib/analytics";
import { supabase } from "@/lib/supabase";
import {
  getStandardLocation,
  setStandardLocation,
  detectGpsLocation,
  isLocationMatch,
} from "@/lib/location";
import { useLanguage } from "@/lib/i18n";

const categoryList = [
  { name: "All", label: "All Services", icon: LayoutGrid },
  { name: "Electrician", label: "Electricians", icon: Zap },
  { name: "Plumber", label: "Plumbers", icon: Wrench },
  { name: "Carpenter", label: "Carpenters", icon: Hammer },
  { name: "Painter", label: "Painters", icon: Paintbrush },
  { name: "Cleaner", label: "Cleaners", icon: Brush },
  { name: "AC Repair", label: "AC Repair", icon: Wind },
];

const stemWord = (word: string) => {
  const w = word.trim().toLowerCase();
  if (w.endsWith("ians") || w.endsWith("ian")) return w.replace(/ians?$/, "");
  if (w.endsWith("ers") || w.endsWith("er")) return w.replace(/ers?$/, "");
  if (w.endsWith("ors") || w.endsWith("or")) return w.replace(/ors?$/, "");
  if (w.endsWith("ing")) return w.replace(/ing$/, "");
  if (w.endsWith("s") && w.length > 3) return w.slice(0, -1);
  return w;
};

const matchStandardCategory = (val: string) => {
  if (
    !val ||
    val.toLowerCase() === "all" ||
    val.toLowerCase() === "all services"
  )
    return "All";
  const v = val.trim().toLowerCase().replace(/-/g, " ");
  if (v.includes("ac") || v.includes("air conditioner")) return "AC Repair";
  if (
    v.includes("plumb") ||
    v.includes("geyser") ||
    v.includes("water purifier") ||
    v.includes("ro") ||
    v.includes("water pump") ||
    v.includes("tank") ||
    v.includes("sump")
  )
    return "Plumber";
  if (
    v.includes("electric") ||
    v.includes("inverter") ||
    v.includes("battery") ||
    v.includes("washing machine")
  )
    return "Electrician";
  if (
    v.includes("clean") ||
    v.includes("pest") ||
    v.includes("chimney") ||
    v.includes("exhaust")
  )
    return "Cleaner";
  if (v.includes("paint")) return "Painter";
  if (v.includes("carpent")) return "Carpenter";
  const found = categoryList.find((c) => {
    const cl = c.name.toLowerCase();
    return (
      cl === v ||
      v.startsWith(cl.slice(0, 4)) ||
      cl.startsWith(v.slice(0, 4)) ||
      stemWord(cl) === stemWord(v)
    );
  });
  return found ? found.name : val;
};

const getCategoryHeaderTitle = (cat: string) => {
  if (!cat || cat === "All") return "All Services";
  const match = categoryList.find(
    (c) => c.name.toLowerCase() === cat.toLowerCase(),
  );
  if (match) return match.label;
  return `${cat}s`;
};

type Agency = {
  id: string;
  name: string;
  phone?: string;
  categories: string[];
  service_locations: string[];
  location?: string;
  team_size_band: string;
  logo_url?: string | null;
  description: string;
  verified: boolean;
  worker_count: number;
};

type SearchType = "all" | "workers" | "agencies";

export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, translateCategory } = useLanguage();

  const rawType = searchParams.get("type")?.toLowerCase();
  const initialType: SearchType =
    rawType === "agencies"
      ? "agencies"
      : rawType === "workers"
        ? "workers"
        : "all";

  const requestedService =
    searchParams.get("service") || searchParams.get("category") || "";
  const requestedLocation = searchParams.get("location")?.trim() || "";

  const [searchType, setSearchType] = useState<SearchType>(initialType);
  const [availableWorkers, setAvailableWorkers] =
    useState<Worker[]>(staticWorkers);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>(getSavedWorkerIds);
  const [category, setCategory] = useState(() =>
    matchStandardCategory(requestedService),
  );
  const [locality, setLocality] = useState(requestedLocation);

  // Search filter inputs
  const [freeTextNeed, setFreeTextNeed] = useState(
    searchParams.get("need") || searchParams.get("q") || "",
  );
  const [onlyAvailableToday, setOnlyAvailableToday] = useState(false);
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [minRating4Plus, setMinRating4Plus] = useState(false);

  // Reasoning Ranker State
  const [rankingMap, setRankingMap] = useState<
    Record<string, { rank: number; score: number; reason: string }>
  >({});
  const [excludedWorkers, setExcludedWorkers] = useState<
    Array<{ worker_id: string; reason: string }>
  >([]);
  const [showExcluded, setShowExcluded] = useState(false);

  // Sync state when URL params change
  useEffect(() => {
    const t = searchParams.get("type")?.toLowerCase();
    if (t === "agencies" && searchType !== "agencies")
      setSearchType("agencies");
    else if (t === "workers" && searchType !== "workers")
      setSearchType("workers");
    else if (
      !t &&
      searchType !== "all" &&
      rawType !== "agencies" &&
      rawType !== "workers"
    )
      setSearchType("all");

    const s = searchParams.get("service") || searchParams.get("category") || "";
    setCategory(matchStandardCategory(s));

    const l = searchParams.get("location")?.trim() || "";
    setLocality(l);

    const n = searchParams.get("need") || searchParams.get("q") || "";
    if (n) setFreeTextNeed(n);
  }, [searchParams]);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/workers?availability_refresh=${Date.now()}`, {
        cache: "no-store",
      });
      if (r.ok) {
        const d = (await r.json()) as WorkersResponse;
        setAvailableWorkers(d.workers);
      }
    } catch {}
    try {
      const session = (await supabase?.auth.getSession())?.data.session;
      const token = session?.access_token;
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      let clientRes: any = null;
      if (supabase) {
        try {
          clientRes = await supabase
            .from("agencies")
            .select(
              "id,name,phone,email,categories,service_locations,location,team_size_band,logo_url,description,verified,agency_code,created_at",
            );
        } catch {}
      }

      const serverRes = await fetch(`/api/agencies?_=${Date.now()}`, {
        headers,
        cache: "no-store",
      }).catch(() => null);

      const serverAgencies =
        serverRes && serverRes.ok
          ? ((await serverRes.json())?.agencies as Agency[])
          : [];
      const clientAgencies =
        clientRes && !clientRes.error && Array.isArray(clientRes.data)
          ? (clientRes.data as Agency[])
          : [];

      const mergedMap = new Map<string, Agency>();
      for (const a of serverAgencies || []) {
        if (a?.id) mergedMap.set(a.id, a);
      }
      for (const a of clientAgencies || []) {
        if (a?.id && !mergedMap.has(a.id)) {
          mergedMap.set(a.id, {
            ...a,
            categories: Array.isArray(a.categories)
              ? a.categories
              : [String(a.categories || "")],
            service_locations: Array.isArray(a.service_locations)
              ? a.service_locations
              : [String(a.service_locations || a.location || "")],
          });
        }
      }

      setAgencies(Array.from(mergedMap.values()));
    } catch {}
  }, []);

  useEffect(() => {
    void load();
    const i = window.setInterval(() => void load(), 10000);
    return () => window.clearInterval(i);
  }, [load]);

  useEffect(() => {
    const refresh = () => setSavedIds(getSavedWorkerIds());
    window.addEventListener("saved-workers-changed", refresh);
    return () => window.removeEventListener("saved-workers-changed", refresh);
  }, []);

  useEffect(() => {
    void logAnalyticsEvent("search_performed", null, {
      search_term: requestedService,
      location: requestedLocation,
      type: searchType,
    });
  }, [requestedService, requestedLocation, searchType]);

  const handleToggleSaved = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSavedWorker(id);
    setSavedIds(getSavedWorkerIds());
  };

  const handleTypeChange = (newType: SearchType) => {
    setSearchType(newType);
    const nextParams = new URLSearchParams(searchParams);
    if (newType === "all") {
      nextParams.delete("type");
    } else {
      nextParams.set("type", newType);
    }
    setSearchParams(nextParams, { replace: true });
  };

  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    const next = new URLSearchParams(searchParams);
    if (newCat === "All") {
      next.delete("service");
      next.delete("category");
    } else {
      next.set("service", newCat);
      next.set("category", newCat);
    }
    setSearchParams(next, { replace: true });
  };

  const handleLocalityChange = (newLoc: string) => {
    const trimmed = newLoc.trim();
    setLocality(trimmed);
    if (trimmed) {
      setStandardLocation(trimmed);
    }
    const next = new URLSearchParams(searchParams);
    if (!trimmed) next.delete("location");
    else next.set("location", trimmed);
    setSearchParams(next, { replace: true });
  };

  const [gpsDetecting, setGpsDetecting] = useState(false);
  const handleQuickGps = async () => {
    if (!navigator.geolocation) return;
    setGpsDetecting(true);
    try {
      const details = await detectGpsLocation(true);
      if (details) {
        const detected = details.locality || details.city || details.formatted;
        if (detected) {
          handleLocalityChange(detected);
        }
      }
    } catch {
    } finally {
      setGpsDetecting(false);
    }
  };

  const handleResetFilters = () => {
    setCategory("All");
    setLocality("");
    setFreeTextNeed("");
    setSearchType("all");
    setOnlyAvailableToday(false);
    setOnlyVerified(false);
    setMinRating4Plus(false);
    const next = new URLSearchParams();
    setSearchParams(next, { replace: true });
  };

  // Trigger Reasoning-Based Ranking
  const runRankingEvaluation = useCallback(
    async (
      workersToRank: Worker[],
      userNeed: string,
      cat: string,
      loc: string,
    ) => {
      if (!workersToRank.length) {
        setRankingMap({});
        setExcludedWorkers([]);
        return;
      }

      try {
        const candidates = workersToRank.map((w) => {
          const isLocMatch = loc
            ? w.locality.toLowerCase().includes(loc.toLowerCase())
            : true;
          return {
            worker_id: w.id,
            name: w.name,
            categories: [w.category, ...(w.services || [])],
            years_experience: parseInt(w.experience || "3") || 3,
            locality: w.locality,
            distance_km: isLocMatch ? 1.2 : 4.8,
            avg_rating: Number(
              (w as any).avg_rating || (w as any).rating || 4.8,
            ),
            num_ratings: Number(
              (w as any).num_ratings || (w as any).reviews_count || 18,
            ),
            last_active_days_ago: (w as any).available_today ? 0 : 2,
            responds_on_whatsapp: Boolean(w.phone_verified || true),
            profile_completeness_pct: (w as any).work_photos?.length ? 92 : 78,
            trust_flags: Array.isArray((w as any).trust_flags)
              ? (w as any).trust_flags
              : [],
          };
        });

        const res = await fetch("/api/ranking/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            search: {
              category: cat && cat !== "All" ? cat : "General",
              locality: loc || "Local area",
              free_text_need: userNeed.trim() || null,
            },
            candidates,
          }),
        });

        const data = await res.json();
        if (data.ranked && Array.isArray(data.ranked)) {
          const map: Record<
            string,
            { rank: number; score: number; reason: string }
          > = {};
          for (const item of data.ranked) {
            map[item.worker_id] = {
              rank: item.rank,
              score: item.score,
              reason: item.reason,
            };
          }
          setRankingMap(map);
          setExcludedWorkers(Array.isArray(data.excluded) ? data.excluded : []);
        }
      } catch (err) {
        console.warn("[ranking] Evaluation warning:", err);
      }
    },
    [],
  );

  const targetCategory = category !== "All" ? category : requestedService;
  const targetLocality = locality.trim() || requestedLocation.trim();

  const matchingWorkers = useMemo(() => {
    const qLower = freeTextNeed.trim().toLowerCase();

    return availableWorkers.filter((w) => {
      const catMatched =
        !targetCategory ||
        targetCategory === "All" ||
        w.category.toLowerCase().includes(targetCategory.toLowerCase()) ||
        targetCategory.toLowerCase().includes(w.category.toLowerCase()) ||
        stemWord(w.category) === stemWord(targetCategory);

      const locMatched =
        !targetLocality ||
        isLocationMatch(w.locality, targetLocality);

      const availMatched = !onlyAvailableToday || Boolean(w.available_today);
      const verifiedMatched = !onlyVerified || Boolean(w.phone_verified);
      const ratingMatched =
        !minRating4Plus || Number(w.avg_rating || w.rating || 4.8) >= 4.5;

      const qMatched =
        !qLower ||
        w.name.toLowerCase().includes(qLower) ||
        w.category.toLowerCase().includes(qLower) ||
        (w.locality || "").toLowerCase().includes(qLower) ||
        (w.services || []).some((s) => s.toLowerCase().includes(qLower));

      return (
        catMatched &&
        locMatched &&
        qMatched &&
        availMatched &&
        verifiedMatched &&
        ratingMatched
      );
    });
  }, [
    availableWorkers,
    targetCategory,
    targetLocality,
    freeTextNeed,
    onlyAvailableToday,
    onlyVerified,
    minRating4Plus,
  ]);

  // Auto-run ranking when matching workers or search filters change
  useEffect(() => {
    if (matchingWorkers.length > 0 && freeTextNeed.trim()) {
      const timer = setTimeout(() => {
        void runRankingEvaluation(
          matchingWorkers,
          freeTextNeed,
          targetCategory,
          targetLocality,
        );
      }, 350);
      return () => clearTimeout(timer);
    } else {
      setRankingMap({});
      setExcludedWorkers([]);
    }
  }, [
    matchingWorkers,
    freeTextNeed,
    targetCategory,
    targetLocality,
    runRankingEvaluation,
  ]);

  const sortedWorkers = useMemo(() => {
    return [...matchingWorkers].sort((a, b) => {
      // 1. AI Reasoning rank if available
      const rA = rankingMap[a.id]?.rank;
      const rB = rankingMap[b.id]?.rank;
      if (rA !== undefined && rB !== undefined) return rA - rB;
      if (rA !== undefined) return -1;
      if (rB !== undefined) return 1;

      // 2. Locality match priority
      if (targetLocality) {
        const aLoc = (a.locality || "")
          .toLowerCase()
          .includes(targetLocality.toLowerCase())
          ? 1
          : 0;
        const bLoc = (b.locality || "")
          .toLowerCase()
          .includes(targetLocality.toLowerCase())
          ? 1
          : 0;
        if (bLoc !== aLoc) return bLoc - aLoc;
      }

      // 3. Verified pro priority
      const aVer = a.phone_verified ? 1 : 0;
      const bVer = b.phone_verified ? 1 : 0;
      if (bVer !== aVer) return bVer - aVer;

      // 4. Rating priority
      const aRating = Number(a.avg_rating || a.rating || 4.8);
      const bRating = Number(b.avg_rating || b.rating || 4.8);
      if (bRating !== aRating) return bRating - aRating;

      // 5. Available today
      if (b.available_today && !a.available_today) return 1;
      if (!b.available_today && a.available_today) return -1;

      return 0;
    });
  }, [matchingWorkers, rankingMap, targetLocality]);

  const matchingAgencies = agencies.filter((a) => {
    const qLower = freeTextNeed.trim().toLowerCase();

    const catMatched =
      !targetCategory ||
      targetCategory === "All" ||
      (a.categories || []).some((c) =>
        String(c).toLowerCase().includes(targetCategory.toLowerCase()),
      ) ||
      (a.categories || []).some(
        (c) => stemWord(String(c)) === stemWord(targetCategory),
      );

    const locMatched =
      !targetLocality ||
      (a.service_locations || []).some((l) =>
        String(l).toLowerCase().includes(targetLocality.toLowerCase()),
      ) ||
      Boolean(
        a.location &&
        String(a.location).toLowerCase().includes(targetLocality.toLowerCase()),
      );

    const qMatched =
      !qLower ||
      a.name.toLowerCase().includes(qLower) ||
      (a.categories || []).some((c) =>
        String(c).toLowerCase().includes(qLower),
      ) ||
      (a.service_locations || []).some((l) =>
        String(l).toLowerCase().includes(qLower),
      );

    const verifiedMatched = !onlyVerified || Boolean(a.verified);

    return catMatched && locMatched && qMatched && verifiedMatched;
  });

  // Combine or filter strictly according to selected searchType
  const combined: Array<
    { type: "agency"; data: Agency } | { type: "worker"; data: Worker }
  > = [];

  if (searchType === "agencies") {
    matchingAgencies.forEach((a) => combined.push({ type: "agency", data: a }));
  } else if (searchType === "workers") {
    sortedWorkers.forEach((w) => combined.push({ type: "worker", data: w }));
  } else {
    let wi = 0,
      ai = 0;
    while (wi < sortedWorkers.length || ai < matchingAgencies.length) {
      if (ai < matchingAgencies.length)
        combined.push({ type: "agency", data: matchingAgencies[ai++] });
      for (let n = 0; n < 2 && wi < sortedWorkers.length; n++) {
        combined.push({ type: "worker", data: sortedWorkers[wi++] });
      }
    }
  }

  const hasActiveFilters =
    category !== "All" ||
    locality.trim() !== "" ||
    searchType !== "all" ||
    onlyAvailableToday ||
    onlyVerified ||
    minRating4Plus ||
    freeTextNeed.trim() !== "";

  return (
    <PageShell
      backLabel={t("callbacks.back")}
      backTo="/home"
      headerTitle={category === "All" ? t("cat.All Services") : translateCategory(category)}
      headerRight={
        <Link
          to="/saved"
          aria-label="Saved listings"
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] px-3 text-xs font-semibold text-[#141210] dark:text-[#FAFAFA] hover:border-[#F4512C]/50 active:scale-95 transition"
        >
          <Heart
            size={13}
            className={
              savedIds.length ? "text-[#F4512C] fill-[#F4512C]" : "text-[#6B645F] dark:text-[#9E958F]"
            }
          />
          <span>{savedIds.length}</span>
        </Link>
      }
      containerWidth="lg"
      className="pb-24"
    >
      {/* 1. CATEGORY HEADER OR CATEGORY SELECTOR CAROUSEL */}
      {category !== "All" ? (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[#EAE2DC] dark:border-white/10 bg-gradient-to-br from-[#FFF4EF] via-[#FAF8F5] to-[#F5EAE2] dark:from-[#261B16] dark:via-[#1C1512] dark:to-[#15110F] p-5"
        >
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#F4512C]">
              Service Directory
            </span>
            <div className="mt-1 flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#141210] dark:text-[#FAFAFA]">
                {translateCategory(category)}
              </h1>
              <span className="rounded-full bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C] px-2.5 py-0.5 text-xs font-mono font-bold">
                {matchingWorkers.length} {matchingWorkers.length === 1 ? "pro" : "pros"}
              </span>
            </div>
            <p className="text-xs text-[#6B645F] dark:text-[#9E958F] mt-1">
              Verified {category.toLowerCase()} professionals{targetLocality ? ` near ${targetLocality}` : ""}
            </p>
          </div>

          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => handleCategoryChange("All")}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#EAE2DC] dark:border-white/10 bg-white/80 dark:bg-[#161514]/80 px-4 py-2 text-xs font-semibold text-[#141210] dark:text-[#FAFAFA] hover:border-[#F4512C]/50 transition cursor-pointer"
          >
            <span>All Categories</span>
          </motion.button>
        </motion.div>
      ) : (
        <div className="mb-4">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0">
            {categoryList.map((cat) => {
              const Icon = cat.icon;
              const isSelected =
                (category === "All" && cat.name === "All") ||
                category.toLowerCase() === cat.name.toLowerCase();

              return (
                <motion.button
                  key={cat.name}
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleCategoryChange(cat.name)}
                  className={`inline-flex shrink-0 snap-start items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#F4512C] text-white"
                      : "border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] text-[#141210] dark:text-[#FAFAFA] hover:border-[#F4512C]/50"
                  }`}
                >
                  <Icon
                    size={13}
                    className={
                      isSelected
                        ? "text-white"
                        : "text-[#F4512C]"
                    }
                  />
                  <span>
                    {cat.name === "All"
                      ? t("cat.All Services")
                      : translateCategory(cat.name)}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. COMPACT TOOLBAR & FILTER STRIP */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleQuickGps}
            disabled={gpsDetecting}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
              locality
                ? "border border-[#F4512C]/40 bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C]"
                : "border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] text-[#6B645F] dark:text-[#9E958F] hover:border-[#F4512C]/50"
            }`}
            title="Current search location (Click to refresh via GPS)"
          >
            <MapPin size={12} className="text-[#F4512C]" />
            <span>
              {gpsDetecting
                ? "Detecting GPS..."
                : locality
                  ? locality
                  : "All Locations (Tap GPS)"}
            </span>
          </button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => setOnlyAvailableToday(!onlyAvailableToday)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
              onlyAvailableToday
                ? "bg-[#0F8A73] text-white"
                : "border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] text-[#141210] dark:text-[#FAFAFA] hover:border-[#0F8A73]/50"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${onlyAvailableToday ? "bg-white" : "bg-[#0F8A73] animate-pulse"}`}
            />
            <span>{t("card.availableToday")}</span>
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => setOnlyVerified(!onlyVerified)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
              onlyVerified
                ? "bg-[#141210] text-white dark:bg-white dark:text-[#11100F]"
                : "border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] text-[#141210] dark:text-[#FAFAFA] hover:border-[#F4512C]/50"
            }`}
          >
            <BadgeCheck
              size={12}
              className={onlyVerified ? "text-current" : "text-[#0F8A73]"}
            />
            <span>Verified</span>
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => setMinRating4Plus(!minRating4Plus)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
              minRating4Plus
                ? "bg-[#141210] text-white dark:bg-white dark:text-[#11100F]"
                : "border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] text-[#141210] dark:text-[#FAFAFA] hover:border-[#F4512C]/50"
            }`}
          >
            <Star size={11} className="fill-amber-400 text-amber-400" />
            <span>4.5+ Rating</span>
          </motion.button>

          {hasActiveFilters && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#F4512C] hover:underline cursor-pointer ml-1"
            >
              <RotateCcw size={11} />
              <span>Reset</span>
            </motion.button>
          )}
        </div>

        {/* Segmented Type Switcher */}
        <div className="inline-flex rounded-full border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-1 text-xs">
          <button
            type="button"
            onClick={() => handleTypeChange("all")}
            className={`rounded-full px-3.5 py-1 font-semibold transition cursor-pointer ${
              searchType === "all"
                ? "bg-[#141210] text-white dark:bg-white dark:text-[#11100F]"
                : "text-[#6B645F] dark:text-[#9E958F] hover:text-[#141210] dark:hover:text-[#FAFAFA]"
            }`}
          >
            All ({matchingWorkers.length + matchingAgencies.length})
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange("workers")}
            className={`rounded-full px-3.5 py-1 font-semibold transition cursor-pointer ${
              searchType === "workers"
                ? "bg-[#141210] text-white dark:bg-white dark:text-[#11100F]"
                : "text-[#6B645F] dark:text-[#9E958F] hover:text-[#141210] dark:hover:text-[#FAFAFA]"
            }`}
          >
            Pros ({matchingWorkers.length})
          </button>
          {matchingAgencies.length > 0 && (
            <button
              type="button"
              onClick={() => handleTypeChange("agencies")}
              className={`rounded-full px-3.5 py-1 font-semibold transition cursor-pointer ${
                searchType === "agencies"
                  ? "bg-[#141210] text-white dark:bg-white dark:text-[#11100F]"
                  : "text-[#6B645F] dark:text-[#9E958F] hover:text-[#141210] dark:hover:text-[#FAFAFA]"
              }`}
            >
              Agencies ({matchingAgencies.length})
            </button>
          )}
        </div>
      </div>

      {/* 3. WORKER & AGENCY LISTINGS */}
      <section>
        <AnimatePresence mode="wait">
          {combined.length ? (
            <motion.div
              key={`${category}-${searchType}-${locality}-${onlyAvailableToday ? "today" : ""}-${onlyVerified ? "ver" : ""}-${minRating4Plus ? "star" : ""}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {combined.map((item, index) => (
                <motion.div
                  key={item.type === "agency" ? `a-${item.data.id}-${index}` : `w-${item.data.id}`}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.18 }}
                >
                  {item.type === "agency" ? (
                    <AgencyCard agency={item.data} />
                  ) : (
                    <WorkerCard
                      worker={item.data}
                      navigate={navigate}
                      rankInfo={rankingMap[item.data.id]}
                      isSaved={savedIds.includes(item.data.id)}
                      onToggleSaved={(e) => handleToggleSaved(item.data.id, e)}
                    />
                  )}
                </motion.div>
              ))}
            </motion.div>
          ) : (
            /* Empty State */
            <motion.div
              key="empty-state"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-8 text-center"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C] mb-3.5">
                <SearchIcon size={24} />
              </div>
              <h3 className="text-base font-extrabold text-[#141210] dark:text-[#FAFAFA]">
                No Specialists Found
              </h3>
              <p className="mt-1 text-xs text-[#6B645F] dark:text-[#9E958F] max-w-sm mx-auto">
                We couldn&apos;t find any{" "}
                {category !== "All" ? category.toLowerCase() : ""} professionals
                matching your current filters
                {targetLocality ? ` near ${targetLocality}` : ""}.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="inline-flex h-10 items-center justify-center rounded-full bg-[#F4512C] hover:bg-[#E04320] text-white px-5 text-xs font-bold transition cursor-pointer"
                  >
                    Clear Filters
                  </button>
                )}
                <Link
                  to="/assistant"
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-5 text-xs font-bold text-[#141210] dark:text-[#FAFAFA] transition hover:border-[#F4512C]/50"
                >
                  <Sparkles size={13} className="text-[#F4512C]" />
                  <span>Ask Matchmaker</span>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Excluded Candidates Section */}
        {excludedWorkers.length > 0 && (
          <div className="mt-6 rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-4">
            <button
              type="button"
              onClick={() => setShowExcluded(!showExcluded)}
              className="flex items-center justify-between w-full text-xs font-semibold text-[#6B645F] dark:text-[#9E958F] hover:text-[#141210] dark:hover:text-[#FAFAFA] cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <AlertTriangle size={13} className="text-[#F4512C]" />
                <span>
                  Excluded from Top Recommendations ({excludedWorkers.length})
                </span>
              </span>
              {showExcluded ? (
                <ChevronUp size={13} />
              ) : (
                <ChevronDown size={13} />
              )}
            </button>
            {showExcluded && (
              <div className="mt-3 space-y-2 pt-2 border-t border-[#EAE2DC] dark:border-white/10">
                {excludedWorkers.map((ex, idx) => (
                  <div
                    key={`${ex.worker_id}-${idx}`}
                    className="rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] p-3 text-xs"
                  >
                    <div className="flex items-center justify-between text-[#6B645F] dark:text-[#9E958F]">
                      <span className="font-bold text-[#141210] dark:text-[#FAFAFA]">
                        Candidate ID: {ex.worker_id}
                      </span>
                      <span className="text-[10px] text-rose-500 font-bold">
                        Filtered
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#6B645F] dark:text-[#9E958F]">
                      {ex.reason}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <NavBar />
    </PageShell>
  );
}

function AgencyCard({ agency }: { agency: Agency }) {
  const phone = String(agency.phone || "").replace(/\D/g, "");
  const whatsappUrl = phone
    ? `https://wa.me/${phone.length === 10 ? `91${phone}` : phone}`
    : "";

  return (
    <article className="rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 flex flex-col justify-between hover:border-[#F4512C]/50 transition-all group">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C]">
              {agency.logo_url ? (
                <img
                  src={agency.logo_url}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                <Building2 size={20} className="text-current" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-base font-bold text-[#141210] dark:text-[#FAFAFA] group-hover:text-[#F4512C] transition">
                  {agency.name}
                </h4>
                {agency.verified && (
                  <BadgeCheck size={15} className="text-[#0F8A73] shrink-0" />
                )}
              </div>
              <p className="text-xs font-medium text-[#6B645F] dark:text-[#9E958F]">
                {agency.team_size_band} Team · Agency Hub
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 rounded-full bg-[#F5EFEA] dark:bg-[#242220] border border-[#EAE2DC] dark:border-white/10 px-2.5 py-0.5 text-[11px] font-bold text-[#141210] dark:text-[#FAFAFA]">
            Agency
          </span>
        </div>

        <div className="mt-3 space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-[#6B645F] dark:text-[#9E958F]">
            <span className="flex items-center gap-1 truncate max-w-[190px]">
              <MapPin size={12} className="shrink-0 text-[#F4512C]" /> {agency.service_locations.join(", ")}
            </span>
            <span className="font-semibold text-[#0F8A73]">Active Agency</span>
          </div>
          <p className="text-xs text-[#6B645F] dark:text-[#9E958F] line-clamp-2 leading-relaxed">
            {agency.description || agency.categories.join(" · ")}
          </p>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {agency.categories.map((cat, idx) => (
            <span
              key={idx}
              className="rounded-md bg-[#F5EFEA] dark:bg-[#242220] px-2.5 py-0.5 text-[11px] text-[#6B645F] dark:text-[#9E958F] font-medium"
            >
              {cat}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[#EAE2DC] dark:border-white/10 flex items-center justify-between gap-2">
        <Link
          to={`/agency-profile?agency=${encodeURIComponent(agency.id)}`}
          className="text-xs font-bold text-[#141210] dark:text-[#FAFAFA] hover:text-[#F4512C] transition cursor-pointer"
        >
          View Agency
        </Link>

        <div className="flex items-center gap-2">
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#0F8A73] hover:bg-[#0B6E5B] text-white px-3.5 text-xs font-semibold transition cursor-pointer active:scale-95"
            >
              <MessageCircle size={13} />
              <span>WhatsApp</span>
            </a>
          )}
          <Link
            to={`/agency-profile?agency=${encodeURIComponent(agency.id)}`}
            className="inline-flex h-9 items-center gap-1 rounded-xl bg-[#141210] text-white dark:bg-white dark:text-[#11100F] px-3.5 text-xs font-semibold transition hover:opacity-90 cursor-pointer active:scale-95"
          >
            <span>Connect</span>
            <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </article>
  );
}

function WorkerCard({
  worker,
  navigate,
  rankInfo,
  isSaved,
  onToggleSaved,
}: {
  worker: Worker;
  navigate: (to: string) => void;
  rankInfo?: { rank: number; score: number; reason: string };
  isSaved: boolean;
  onToggleSaved: (e: React.MouseEvent) => void;
}) {
  const { t, translateCategory } = useLanguage();
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [ratingStats, setRatingStats] = useState(() =>
    getComputedWorkerRating(worker)
  );

  useEffect(() => {
    const handleRatingUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ workerId: string }>;
      if (!customEvent.detail || customEvent.detail.workerId === worker.id) {
        setRatingStats(getComputedWorkerRating(worker));
      }
    };
    window.addEventListener("worker-rating-updated", handleRatingUpdate);
    return () =>
      window.removeEventListener("worker-rating-updated", handleRatingUpdate);
  }, [worker]);

  const phone = String(worker.phone || "").replace(/\D/g, "");
  const whatsappUrl = phone
    ? `https://wa.me/${phone.length === 10 ? `91${phone}` : phone}`
    : "";
  const phoneHref = `tel:${worker.phone}`;

  const isAvailableToday = (worker as any).available_today !== false;

  const services = Array.isArray(worker.services)
    ? worker.services.filter(Boolean)
    : [];

  const handleQuickCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    void logContactEvent(worker.id, "call", {
      name: worker.name,
      category: worker.category,
    });
    void logAnalyticsEvent("call_click", worker.id, {
      source: "list_card_quick_action",
    });
    window.location.href = phoneHref;
  };

  const handleQuickWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    void logContactEvent(worker.id, "whatsapp", {
      name: worker.name,
      category: worker.category,
    });
    void logAnalyticsEvent("whatsapp_click", worker.id, {
      source: "list_card_quick_action",
    });
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <article
        onClick={() => navigate(`/worker?worker=${encodeURIComponent(worker.id)}`)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            navigate(`/worker?worker=${encodeURIComponent(worker.id)}`);
          }
        }}
        tabIndex={0}
        role="button"
        aria-label={`View profile of ${worker.name}`}
        className="rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 flex flex-col justify-between hover:border-[#F4512C]/50 transition-all group cursor-pointer select-none"
      >
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C] font-extrabold text-sm overflow-hidden">
                {worker.photo_url ? (
                  <img
                    src={worker.photo_url}
                    alt={worker.name}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  worker.initials || worker.name.charAt(0)
                )}
                {isAvailableToday && (
                  <span
                    title="Available Today"
                    className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-[#161514] bg-[#0F8A73]"
                  />
                )}
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-base font-bold text-[#141210] dark:text-[#FAFAFA] group-hover:text-[#F4512C] transition">
                    {worker.name}
                  </h4>
                  <BadgeCheck size={15} className="text-[#0F8A73] shrink-0" />
                </div>
                <p className="text-xs font-medium text-[#6B645F] dark:text-[#9E958F]">
                  {translateCategory(worker.category)} · {worker.experience || "5+ yrs exp"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsRateModalOpen(true);
                }}
                title="Click to rate this professional"
                className="group/rate flex items-center gap-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 px-2 py-0.5 text-xs font-bold font-mono text-amber-600 dark:text-amber-400 transition cursor-pointer border border-amber-500/20"
                aria-label={`Rating: ${ratingStats.rating.toFixed(1)}. Click to rate ${worker.name}`}
              >
                <Star size={11} className="fill-amber-400 text-amber-400" />
                <span>{ratingStats.rating.toFixed(1)}</span>
                <span className="text-[10px] font-normal opacity-80">
                  ({ratingStats.reviewsCount})
                </span>
              </button>
              <button
                type="button"
                onClick={onToggleSaved}
                className="text-[#6B645F] dark:text-[#9E958F] hover:text-[#F4512C] transition p-1 cursor-pointer"
                aria-label={isSaved ? `Unsave ${worker.name}` : `Save ${worker.name}`}
              >
                <Heart
                  size={15}
                  className={isSaved ? "text-[#F4512C] fill-[#F4512C]" : ""}
                />
              </button>
            </div>
          </div>

          <div className="mt-3 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-[#6B645F] dark:text-[#9E958F]">
              <span className="flex items-center gap-1 truncate max-w-[190px]">
                <MapPin size={12} className="shrink-0 text-[#6B645F] dark:text-[#9E958F]" /> {worker.locality || "Local area"}
              </span>
              <span className="flex items-center gap-1 font-medium text-[#6B645F] dark:text-[#9E958F]">
                <Clock size={12} />
                {isAvailableToday ? t("card.availableToday") : t("card.bookAhead")}
              </span>
            </div>
            <p className="text-xs text-[#6B645F] dark:text-[#9E958F] line-clamp-2 leading-relaxed">
              {worker.about || "Verified home service professional with guaranteed workmanship."}
            </p>
          </div>

          {services.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {services.slice(0, 3).map((s, idx) => (
                <span
                  key={idx}
                  className="rounded-md bg-[#F5EFEA] dark:bg-[#242220] px-2.5 py-0.5 text-[11px] text-[#6B645F] dark:text-[#9E958F] font-medium"
                >
                  {s}
                </span>
              ))}
              {services.length > 3 && (
                <span className="text-xs text-[#6B645F] dark:text-[#9E958F] self-center">
                  {t("card.more", { count: services.length - 3 })}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-[#EAE2DC] dark:border-white/10 flex items-center gap-2.5">
          {whatsappUrl && (
            <button
              type="button"
              onClick={handleQuickWhatsApp}
              className="flex-1 inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#0F8A73] hover:bg-[#0B6E5B] text-white text-xs font-semibold transition cursor-pointer active:scale-95"
            >
              <MessageCircle size={14} />
              <span>{t("card.whatsapp")}</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleQuickCall}
            className="flex-1 inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#141210] text-white dark:bg-white dark:text-[#11100F] text-xs font-semibold transition hover:opacity-90 cursor-pointer active:scale-95"
          >
            <Phone size={13} />
            <span>{t("card.call")}</span>
          </button>
        </div>
      </article>

      <RateWorkerModal
        worker={worker}
        isOpen={isRateModalOpen}
        onClose={() => setIsRateModalOpen(false)}
        onRatingSuccess={() => {
          setRatingStats(getComputedWorkerRating(worker));
        }}
      />
    </>
  );
}
