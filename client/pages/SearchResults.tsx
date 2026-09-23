import { useCallback, useEffect, useMemo, useState } from "react";
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
import { workers as staticWorkers, type Worker } from "@/data/workers";
import type { WorkersResponse } from "@shared/api";
import { getSavedWorkerIds, toggleSavedWorker } from "@/lib/favorites";
import { logAnalyticsEvent, logContactEvent } from "@/lib/analytics";
import { supabase } from "@/lib/supabase";
import {
  getStandardLocation,
  setStandardLocation,
  detectGpsLocation,
} from "@/lib/location";

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
        w.locality.toLowerCase().includes(targetLocality.toLowerCase()) ||
        targetLocality.toLowerCase().includes(w.locality.toLowerCase());

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
      backLabel="Back"
      backTo="/"
      headerTitle={getCategoryHeaderTitle(category)}
      headerRight={
        <Link
          to="/saved"
          aria-label="Saved listings"
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-[#E7ECF1] dark:border-[#1F1F1F] bg-white dark:bg-[#0A0A0A] px-3 text-xs font-semibold text-[#2C2C2C] dark:text-[#F4F4F5] shadow-subtle hover:border-primary/40 active:scale-95"
        >
          <Heart
            size={13}
            className={
              savedIds.length ? "text-primary fill-primary" : "text-[#989EA7]"
            }
          />
          <span>{savedIds.length}</span>
        </Link>
      }
      containerWidth="lg"
      className="pb-24"
    >
      {/* 1. HORIZONTAL CATEGORY SELECTOR CAROUSEL */}
      <div className="mb-3.5">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0">
          {categoryList.map((cat) => {
            const Icon = cat.icon;
            const isSelected =
              (category === "All" && cat.name === "All") ||
              category.toLowerCase() === cat.name.toLowerCase();

            return (
              <button
                key={cat.name}
                type="button"
                onClick={() => handleCategoryChange(cat.name)}
                className={`inline-flex shrink-0 snap-start items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-subtle ${
                  isSelected
                    ? "bg-primary text-white ring-2 ring-primary/30 shadow-soft"
                    : "border border-[#E7ECF1] dark:border-[#1F1F1F] bg-white dark:bg-[#0A0A0A] text-[#2C2C2C] dark:text-[#F4F4F5] hover:border-primary/50 hover:bg-[#F6F9FC] dark:hover:bg-[#141414]"
                }`}
              >
                <Icon
                  size={13}
                  className={isSelected ? "text-white" : "text-primary"}
                />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. COMPACT TOOLBAR & FILTER STRIP (Decluttered - No giant boxed banner) */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5">
        {/* Count and quick filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Active Standard Location Pill with GPS trigger */}
          <button
            type="button"
            onClick={handleQuickGps}
            disabled={gpsDetecting}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition cursor-pointer shadow-subtle ${
              locality
                ? "border border-primary/40 bg-primary/10 text-primary dark:text-sky-300"
                : "border border-[#E7ECF1] dark:border-[#1F1F1F] bg-white dark:bg-[#0A0A0A] text-[#67696D] dark:text-[#A1A1AA] hover:border-primary/40"
            }`}
            title="Current search location (Click to refresh via GPS)"
          >
            <MapPin
              size={12}
              className={locality ? "text-primary" : "text-[#989EA7]"}
            />
            <span>
              {gpsDetecting
                ? "Detecting GPS..."
                : locality
                  ? locality
                  : "All Locations (Tap GPS)"}
            </span>
          </button>

          {/* Quick Filter Pill Buttons */}
          <button
            type="button"
            onClick={() => setOnlyAvailableToday(!onlyAvailableToday)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition cursor-pointer shadow-subtle ${
              onlyAvailableToday
                ? "bg-emerald-500 text-white shadow-soft"
                : "border border-[#E7ECF1] dark:border-[#1F1F1F] bg-white dark:bg-[#0A0A0A] text-[#2C2C2C] dark:text-[#F4F4F5] hover:border-emerald-400"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${onlyAvailableToday ? "bg-white" : "bg-emerald-500 animate-pulse"}`}
            />
            <span>Available Today</span>
          </button>

          <button
            type="button"
            onClick={() => setOnlyVerified(!onlyVerified)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition cursor-pointer shadow-subtle ${
              onlyVerified
                ? "bg-primary text-white shadow-soft"
                : "border border-[#E7ECF1] dark:border-[#1F1F1F] bg-white dark:bg-[#0A0A0A] text-[#2C2C2C] dark:text-[#F4F4F5] hover:border-primary/40"
            }`}
          >
            <BadgeCheck
              size={12}
              className={onlyVerified ? "text-white" : "text-primary"}
            />
            <span>Verified</span>
          </button>

          <button
            type="button"
            onClick={() => setMinRating4Plus(!minRating4Plus)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition cursor-pointer shadow-subtle ${
              minRating4Plus
                ? "bg-amber-500 text-white shadow-soft"
                : "border border-[#E7ECF1] dark:border-[#1F1F1F] bg-white dark:bg-[#0A0A0A] text-[#2C2C2C] dark:text-[#F4F4F5] hover:border-amber-400"
            }`}
          >
            <Star
              size={11}
              className={
                minRating4Plus
                  ? "fill-white text-white"
                  : "fill-amber-400 text-amber-400"
              }
            />
            <span>4.5+ Rating</span>
          </button>

          {/* Quick Filter Reset */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer ml-1"
            >
              <RotateCcw size={11} />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Segmented Type Switcher (All / Workers / Agencies) */}
        <div className="inline-flex rounded-full border border-[#E7ECF1] dark:border-[#1F1F1F] bg-white dark:bg-[#0A0A0A] p-0.5 text-xs shadow-subtle">
          <button
            type="button"
            onClick={() => handleTypeChange("all")}
            className={`rounded-full px-3 py-1 font-semibold transition cursor-pointer ${
              searchType === "all"
                ? "bg-primary text-white shadow-subtle"
                : "text-[#67696D] dark:text-[#A1A1AA] hover:text-[#2C2C2C] dark:hover:text-[#F4F4F5]"
            }`}
          >
            All ({matchingWorkers.length + matchingAgencies.length})
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange("workers")}
            className={`rounded-full px-3 py-1 font-semibold transition cursor-pointer ${
              searchType === "workers"
                ? "bg-primary text-white shadow-subtle"
                : "text-[#67696D] dark:text-[#A1A1AA] hover:text-[#2C2C2C] dark:hover:text-[#F4F4F5]"
            }`}
          >
            Pros ({matchingWorkers.length})
          </button>
          {matchingAgencies.length > 0 && (
            <button
              type="button"
              onClick={() => handleTypeChange("agencies")}
              className={`rounded-full px-3 py-1 font-semibold transition cursor-pointer ${
                searchType === "agencies"
                  ? "bg-primary text-white shadow-subtle"
                  : "text-[#67696D] dark:text-[#A1A1AA] hover:text-[#2C2C2C] dark:hover:text-[#F4F4F5]"
              }`}
            >
              Agencies ({matchingAgencies.length})
            </button>
          )}
        </div>
      </div>

      {/* 3. WORKER & AGENCY LISTINGS (Starts directly under the compact header) */}
      <section className="space-y-3.5">
        {combined.length ? (
          <div className="space-y-3.5">
            {combined.map((item, index) =>
              item.type === "agency" ? (
                <AgencyCard
                  key={`a-${item.data.id}-${index}`}
                  agency={item.data}
                />
              ) : (
                <WorkerCard
                  key={`w-${item.data.id}`}
                  worker={item.data}
                  navigate={navigate}
                  rankInfo={rankingMap[item.data.id]}
                  isSaved={savedIds.includes(item.data.id)}
                  onToggleSaved={(e) => handleToggleSaved(item.data.id, e)}
                />
              ),
            )}
          </div>
        ) : (
          /* Empty State */
          <div className="rounded-[20px] border border-[#E7ECF1] dark:border-[#1F1F1F] bg-white dark:bg-[#0A0A0A] p-8 text-center shadow-soft">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-100/15 text-primary mb-3.5">
              <SearchIcon size={24} />
            </div>
            <h3 className="text-base font-bold text-[#2C2C2C] dark:text-[#F4F4F5]">
              No Specialists Found
            </h3>
            <p className="mt-1 text-xs text-[#67696D] dark:text-[#A1A1AA] max-w-sm mx-auto">
              We couldn't find any{" "}
              {category !== "All" ? category.toLowerCase() : ""} professionals
              matching your current filters
              {targetLocality ? ` near ${targetLocality}` : ""}.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2.5">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex h-9 items-center justify-center rounded-full bg-primary px-4 text-xs font-bold text-white transition hover:bg-[#157ad4] cursor-pointer shadow-subtle"
                >
                  Clear Filters
                </button>
              )}
              <Link
                to="/assistant"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-primary-100/40 bg-primary-100/10 px-4 text-xs font-bold text-primary transition hover:bg-primary-100/20"
              >
                <Sparkles size={13} />
                <span>Ask AI Matchmaker</span>
              </Link>
            </div>
          </div>
        )}

        {/* Excluded Candidates Section */}
        {excludedWorkers.length > 0 && (
          <div className="mt-6 rounded-[16px] border border-[#E7ECF1] dark:border-[#1F1F1F] bg-white dark:bg-[#0A0A0A] p-4 shadow-subtle">
            <button
              type="button"
              onClick={() => setShowExcluded(!showExcluded)}
              className="flex items-center justify-between w-full text-xs font-semibold text-[#67696D] dark:text-[#A1A1AA] hover:text-[#2C2C2C] dark:hover:text-[#F4F4F5] cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <AlertTriangle size={13} className="text-amber-500" />
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
              <div className="mt-3 space-y-2 pt-2 border-t border-[#E7ECF1] dark:border-[#1F1F1F]">
                {excludedWorkers.map((ex, idx) => (
                  <div
                    key={`${ex.worker_id}-${idx}`}
                    className="rounded-[12px] border border-[#E7ECF1] dark:border-[#1F1F1F] bg-[#F6F9FC] dark:bg-[#141414] p-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between text-[#67696D] dark:text-[#A1A1AA]">
                      <span className="font-bold text-[#2C2C2C] dark:text-[#F4F4F5]">
                        Candidate ID: {ex.worker_id}
                      </span>
                      <span className="text-[10px] text-red-600 font-bold">
                        Filtered
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#67696D] dark:text-[#A1A1AA]">
                      {ex.reason}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 4. BOTTOM NAVIGATION BAR */}
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
    <article className="rounded-[20px] border border-[#E7ECF1] dark:border-[#1F1F1F] bg-white dark:bg-[#0A0A0A] p-4 sm:p-5 transition-all hover:border-primary/40 hover:shadow-soft shadow-subtle">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[16px] border border-[#E7ECF1] dark:border-[#1F1F1F] bg-[#F6F9FC] dark:bg-[#141414] text-[#2C2C2C] dark:text-[#F4F4F5] shadow-subtle">
            {agency.logo_url ? (
              <img
                src={agency.logo_url}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            ) : (
              <Building2 size={22} className="text-primary" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="text-base font-bold text-[#2C2C2C] dark:text-[#F4F4F5] truncate">
                {agency.name}
              </h3>
              {agency.verified && (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary-100/40 bg-primary-100/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                  <BadgeCheck size={11} className="text-primary" />
                  Verified Agency
                </span>
              )}
            </div>

            <p className="mt-0.5 text-xs font-semibold text-primary">
              {agency.categories.join(" · ")}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#67696D] dark:text-[#A1A1AA]">
              <span className="inline-flex items-center gap-1 truncate max-w-[200px]">
                <MapPin size={12} className="text-[#989EA7] shrink-0" />
                <span className="truncate">
                  {agency.service_locations.join(", ")}
                </span>
              </span>
              <span className="text-[#989EA7]">·</span>
              <span className="inline-flex items-center gap-1">
                <Users size={12} className="text-primary shrink-0" />
                <span>{agency.team_size_band} Team</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 sm:pt-0">
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 sm:h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-[#25D366] px-4 text-xs font-bold text-white transition hover:bg-[#20ba5a] shadow-subtle cursor-pointer sm:flex-initial"
            >
              <MessageCircle size={14} />
              <span>WhatsApp</span>
            </a>
          )}
          <Link
            to={`/agency-profile?agency=${encodeURIComponent(agency.id)}`}
            className="inline-flex h-9 sm:h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-[#E7ECF1] dark:border-[#1F1F1F] bg-[#F6F9FC] dark:bg-[#141414] px-4 text-xs font-bold text-[#2C2C2C] dark:text-[#F4F4F5] transition hover:border-primary/50 hover:bg-white dark:hover:bg-[#1E1E1E] hover:text-primary shadow-subtle sm:flex-initial"
          >
            <span>View Agency</span>
            <ArrowRight size={13} />
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
  const photos = Array.isArray(
    (worker as Worker & { work_photos?: string[] }).work_photos,
  )
    ? (worker as Worker & { work_photos?: string[] }).work_photos!.filter(
        Boolean,
      )
    : [];

  const phone = String(worker.phone || "").replace(/\D/g, "");
  const whatsappUrl = phone
    ? `https://wa.me/${phone.length === 10 ? `91${phone}` : phone}`
    : "";
  const phoneHref = `tel:${worker.phone}`;

  const isAvailableToday = (worker as any).available_today !== false;
  const acceptsUrgent = Boolean((worker as any).accepts_urgent);
  const rating = Number(worker.avg_rating || worker.rating || 4.8);
  const reviewsCount = Number(worker.reviews_count || 18);

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
    <article className="group relative rounded-[20px] border border-[#E7ECF1] dark:border-[#1F1F1F] bg-white dark:bg-[#0A0A0A] p-4 sm:p-5 transition-all hover:border-primary/50 hover:shadow-soft shadow-subtle">
      {/* Top Header Section */}
      <div className="flex items-start justify-between gap-3">
        <div
          onClick={() =>
            navigate(`/worker?worker=${encodeURIComponent(worker.id)}`)
          }
          className="flex flex-1 items-start gap-3.5 min-w-0 cursor-pointer"
        >
          {/* Avatar with Status Indicator */}
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[18px] border border-[#E7ECF1] dark:border-[#1F1F1F] bg-[#F6F9FC] dark:bg-[#141414] text-sm font-bold text-primary shadow-subtle">
            {worker.photo_url ? (
              <img
                src={worker.photo_url}
                alt={worker.name}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-base">
                {worker.initials || worker.name.slice(0, 2).toUpperCase()}
              </span>
            )}
            {isAvailableToday && (
              <span
                title="Available Today"
                className="absolute bottom-1 right-1 h-3 w-3 rounded-full border-2 border-white dark:border-[#0A0A0A] bg-emerald-500"
              />
            )}
          </div>

          {/* Details Column */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="truncate text-base sm:text-lg font-bold text-[#2C2C2C] dark:text-[#F4F4F5] group-hover:text-primary transition-colors">
                {worker.name}
              </h3>
              {worker.phone_verified && (
                <span
                  title="Verified Professional"
                  className="inline-flex items-center gap-1 rounded-full bg-primary-100/15 border border-primary-100/30 px-2 py-0.5 text-[10px] font-bold text-primary shrink-0"
                >
                  <BadgeCheck size={11} className="text-primary" />
                  <span>Verified</span>
                </span>
              )}
              {rankInfo && (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary-100/50 bg-primary-100/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                  <BrainCircuit size={11} />
                  <span>#{rankInfo.rank} AI Match</span>
                </span>
              )}
            </div>

            {/* Category, Experience & Rating */}
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-primary">{worker.category}</span>
              {worker.experience && (
                <>
                  <span className="text-[#989EA7]">·</span>
                  <span className="text-[#67696D] dark:text-[#A1A1AA]">
                    {worker.experience} exp
                  </span>
                </>
              )}
              <span className="text-[#989EA7]">·</span>
              <div className="inline-flex items-center gap-1 font-bold text-[#2C2C2C] dark:text-[#F4F4F5]">
                <Star size={12} className="fill-amber-400 text-amber-400" />
                <span>{rating.toFixed(1)}</span>
                <span className="text-[10px] font-normal text-[#67696D] dark:text-[#A1A1AA]">
                  ({reviewsCount})
                </span>
              </div>
            </div>

            {/* Locality & Badges Row */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
              {worker.locality && (
                <span className="inline-flex items-center gap-1 text-[#67696D] dark:text-[#A1A1AA] font-medium mr-1">
                  <MapPin size={12} className="shrink-0 text-primary" />
                  <span className="truncate">{worker.locality}</span>
                </span>
              )}

              {isAvailableToday ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Available Today
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#E7ECF1] dark:border-[#1F1F1F] bg-[#F6F9FC] dark:bg-[#141414] px-2 py-0.5 text-[10px] font-semibold text-[#67696D] dark:text-[#A1A1AA]">
                  <Clock size={10} />
                  Busy
                </span>
              )}

              {acceptsUrgent && (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary-100/30 bg-primary-100/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  <Sparkles size={10} />
                  Urgent Requests
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Top Right Quick Contact & Bookmark Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Quick Call Icon Button */}
          <button
            type="button"
            onClick={handleQuickCall}
            title={`Call ${worker.name}`}
            aria-label={`Call ${worker.name}`}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E7ECF1] dark:border-[#262626] bg-white dark:bg-[#141414] text-[#2C2C2C] dark:text-[#F4F4F5] hover:border-primary hover:text-primary transition shadow-subtle active:scale-95 cursor-pointer"
          >
            <Phone size={13} />
          </button>

          {/* Quick WhatsApp Icon Button */}
          {whatsappUrl && (
            <button
              type="button"
              onClick={handleQuickWhatsApp}
              title={`WhatsApp ${worker.name}`}
              aria-label={`WhatsApp ${worker.name}`}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-white transition shadow-subtle active:scale-95 cursor-pointer"
            >
              <MessageCircle size={13} />
            </button>
          )}

          {/* Bookmark / Heart Toggle Button */}
          <button
            type="button"
            onClick={onToggleSaved}
            aria-label={
              isSaved
                ? `Remove ${worker.name} from saved`
                : `Save ${worker.name}`
            }
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E7ECF1] dark:border-[#262626] bg-white dark:bg-[#141414] text-[#67696D] dark:text-[#A1A1AA] transition hover:border-primary hover:text-primary cursor-pointer shadow-subtle active:scale-95"
          >
            <Heart
              size={14}
              className={
                isSaved ? "text-primary fill-primary" : "text-[#989EA7]"
              }
            />
          </button>
        </div>
      </div>

      {/* Services Chips List */}
      {services.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {services.slice(0, 4).map((service, sIdx) => (
            <span
              key={`${service}-${sIdx}`}
              className="inline-flex items-center rounded-full bg-[#F6F9FC] dark:bg-[#141414] border border-[#E7ECF1] dark:border-[#1F1F1F] px-2.5 py-0.5 text-[10px] font-semibold text-[#67696D] dark:text-[#A1A1AA]"
            >
              #{service}
            </span>
          ))}
          {services.length > 4 && (
            <span className="text-[10px] font-semibold text-[#989EA7] self-center">
              +{services.length - 4} more
            </span>
          )}
        </div>
      )}

      {/* AI Reasoning Rank Explanation Banner */}
      {rankInfo && (
        <div className="mt-3 rounded-[14px] border border-primary-100/40 bg-primary-100/10 p-2.5 text-xs text-[#2C2C2C] dark:text-[#F4F4F5]">
          <div className="flex items-start gap-2">
            <BrainCircuit size={14} className="text-primary shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-primary">
                  Why this recommendation (#{rankInfo.rank}):
                </span>
                <span className="text-[10px] text-[#67696D] dark:text-[#A1A1AA] font-bold">
                  Fit Score: {rankInfo.score}/100
                </span>
              </div>
              <p className="text-[11px] text-[#67696D] dark:text-[#D4D4D8] leading-relaxed">
                {rankInfo.reason}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Optional Work Photos Showcase */}
      {photos.length > 0 && (
        <div
          onClick={() =>
            navigate(`/worker?worker=${encodeURIComponent(worker.id)}`)
          }
          className="mt-3 grid grid-cols-3 gap-2 cursor-pointer"
        >
          {photos.slice(0, 3).map((photo, index) => (
            <div
              key={`${photo}-${index}`}
              className="relative h-20 overflow-hidden rounded-[14px] border border-[#E7ECF1] dark:border-[#1F1F1F] bg-[#F6F9FC] dark:bg-[#141414] shadow-subtle"
            >
              <img
                src={photo}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
              {index === 2 && photos.length > 3 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs font-bold text-white">
                  +{photos.length - 3}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons Row */}
      <div className="mt-3.5 pt-3 border-t border-[#E7ECF1] dark:border-[#1F1F1F] flex items-center gap-2">
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => {
              void logContactEvent(worker.id, "whatsapp");
              void logAnalyticsEvent("whatsapp_click", worker.id, {
                source: "card_bottom_action",
              });
            }}
            className="flex-1 inline-flex h-9 sm:h-10 items-center justify-center gap-1.5 rounded-full bg-[#25D366] px-4 text-xs font-bold text-white transition hover:bg-[#20ba5a] cursor-pointer shadow-subtle active:scale-[0.98]"
          >
            <MessageCircle size={14} />
            <span>WhatsApp</span>
          </a>
        )}
        <button
          type="button"
          onClick={() =>
            navigate(`/worker?worker=${encodeURIComponent(worker.id)}`)
          }
          className="flex-1 inline-flex h-9 sm:h-10 items-center justify-center gap-1 rounded-full border border-[#E7ECF1] dark:border-[#1F1F1F] bg-[#F6F9FC] dark:bg-[#141414] px-4 text-xs font-bold text-[#2C2C2C] dark:text-[#F4F4F5] transition hover:border-primary/50 hover:bg-white dark:hover:bg-[#1E1E1E] hover:text-primary cursor-pointer shadow-subtle active:scale-[0.98]"
        >
          <span>View Profile</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </article>
  );
}
