import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MapPin,
  Search as SearchIcon,
  Heart,
  SlidersHorizontal,
  BadgeCheck,
  Building2,
  Users,
  MessageCircle,
  Clock,
  Sparkles,
  ArrowRight,
  UserRound,
  Bot,
  Send,
  Loader2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  BrainCircuit,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { workers as staticWorkers, type Worker } from "@/data/workers";
import type { WorkersResponse } from "@shared/api";
import { filterWorkers } from "@/lib/search";
import { getSavedWorkerIds, toggleSavedWorker } from "@/lib/favorites";
import { logAnalyticsEvent } from "@/lib/analytics";
import { supabase } from "@/lib/supabase";

const categories = ["All", "Electrician", "Painter", "Plumber", "Carpenter", "Cleaner", "AC Repair", "Other"];

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
  if (!val || val.toLowerCase() === "all") return "All";
  const v = val.trim().toLowerCase();
  const found = categories.find((c) => {
    const cl = c.toLowerCase();
    return cl === v || v.startsWith(cl.slice(0, 5)) || cl.startsWith(v.slice(0, 5)) || stemWord(cl) === stemWord(v);
  });
  return found || val;
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
  const initialType: SearchType = rawType === "agencies" ? "agencies" : rawType === "workers" ? "workers" : "all";

  const requestedService = searchParams.get("service")?.trim() || "";
  const requestedLocation = searchParams.get("location")?.trim() || "";

  const [searchType, setSearchType] = useState<SearchType>(initialType);
  const [availableWorkers, setAvailableWorkers] = useState<Worker[]>(staticWorkers);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>(getSavedWorkerIds);
  const [category, setCategory] = useState(() => matchStandardCategory(requestedService));
  const [locality, setLocality] = useState(requestedLocation);

  // Reasoning Ranker State
  const [freeTextNeed, setFreeTextNeed] = useState(searchParams.get("need") || searchParams.get("q") || "");
  const [rankingMap, setRankingMap] = useState<Record<string, { rank: number; score: number; reason: string }>>({});
  const [excludedWorkers, setExcludedWorkers] = useState<Array<{ worker_id: string; reason: string }>>([]);
  const [isRankingLoading, setIsRankingLoading] = useState(false);
  const [rankingModelUsed, setRankingModelUsed] = useState<string | null>(null);
  const [showExcluded, setShowExcluded] = useState(false);

  // AI Matchmaker State
  const [showAiAssistant, setShowAiAssistant] = useState(searchParams.get("ai") === "1");
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [onlyAvailableToday, setOnlyAvailableToday] = useState(false);
  const [onlyVerified, setOnlyVerified] = useState(false);

  // Sync state when URL params change
  useEffect(() => {
    const t = searchParams.get("type")?.toLowerCase();
    if (t === "agencies" && searchType !== "agencies") setSearchType("agencies");
    else if (t === "workers" && searchType !== "workers") setSearchType("workers");
    else if (!t && searchType !== "all" && rawType !== "agencies" && rawType !== "workers") setSearchType("all");

    const s = searchParams.get("service")?.trim() || "";
    setCategory(matchStandardCategory(s));

    const l = searchParams.get("location")?.trim() || "";
    setLocality(l);

    const n = searchParams.get("need") || searchParams.get("q") || "";
    if (n) setFreeTextNeed(n);

    if (searchParams.get("ai") === "1") {
      setShowAiAssistant(true);
    }
  }, [searchParams]);

  const handleAskAi = async (customQuery?: string) => {
    const queryToAsk = customQuery || aiQuestion;
    if (!queryToAsk.trim()) return;

    setAiLoading(true);
    setAiResponse(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Service: ${category !== "All" ? category : requestedService || "Any"}, Location: ${locality || requestedLocation || "Local"}. Question: ${queryToAsk}`,
            },
          ],
          clientLocation: locality || requestedLocation,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not retrieve AI recommendation.");
      setAiResponse(data.text);
    } catch (err: any) {
      setAiResponse(err.message || "AI Concierge is temporarily unavailable.");
    } finally {
      setAiLoading(false);
    }
  };

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/workers?availability_refresh=${Date.now()}`, { cache: "no-store" });
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
            .select("id,name,phone,email,categories,service_locations,location,team_size_band,logo_url,description,verified,agency_code,created_at");
        } catch {}
      }

      const serverRes = await fetch(`/api/agencies?_=${Date.now()}`, { headers, cache: "no-store" }).catch(() => null);

      const serverAgencies = serverRes && serverRes.ok ? ((await serverRes.json())?.agencies as Agency[]) : [];
      const clientAgencies = clientRes && !clientRes.error && Array.isArray(clientRes.data) ? (clientRes.data as Agency[]) : [];

      const mergedMap = new Map<string, Agency>();
      for (const a of serverAgencies || []) {
        if (a?.id) mergedMap.set(a.id, a);
      }
      for (const a of clientAgencies || []) {
        if (a?.id && !mergedMap.has(a.id)) {
          mergedMap.set(a.id, {
            ...a,
            categories: Array.isArray(a.categories) ? a.categories : [String(a.categories || "")],
            service_locations: Array.isArray(a.service_locations) ? a.service_locations : [String(a.service_locations || a.location || "")],
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
    if (newCat === "All") next.delete("service");
    else next.set("service", newCat);
    setSearchParams(next, { replace: true });
  };

  const handleLocalityChange = (newLoc: string) => {
    setLocality(newLoc);
    const next = new URLSearchParams(searchParams);
    if (!newLoc.trim()) next.delete("location");
    else next.set("location", newLoc.trim());
    setSearchParams(next, { replace: true });
  };

  const handleResetFilters = () => {
    setCategory("All");
    setLocality("");
    setSearchType("all");
    const next = new URLSearchParams();
    setSearchParams(next, { replace: true });
  };

  // Trigger Reasoning-Based Ranking
  const runRankingEvaluation = useCallback(
    async (workersToRank: Worker[], userNeed: string, cat: string, loc: string) => {
      if (!workersToRank.length) {
        setRankingMap({});
        setExcludedWorkers([]);
        return;
      }

      setIsRankingLoading(true);
      try {
        const candidates = workersToRank.map((w) => {
          const isLocMatch = loc ? w.locality.toLowerCase().includes(loc.toLowerCase()) : true;
          return {
            worker_id: w.id,
            name: w.name,
            categories: [w.category, ...(w.services || [])],
            years_experience: parseInt(w.experience || "3") || 3,
            locality: w.locality,
            distance_km: isLocMatch ? 1.2 : 4.8,
            avg_rating: Number((w as any).avg_rating || (w as any).rating || 4.8),
            num_ratings: Number((w as any).num_ratings || (w as any).reviews_count || 18),
            last_active_days_ago: (w as any).available_today ? 0 : 2,
            responds_on_whatsapp: Boolean(w.phone_verified || true),
            profile_completeness_pct: (w as any).work_photos?.length ? 92 : 78,
            trust_flags: Array.isArray((w as any).trust_flags) ? (w as any).trust_flags : [],
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
          const map: Record<string, { rank: number; score: number; reason: string }> = {};
          for (const item of data.ranked) {
            map[item.worker_id] = {
              rank: item.rank,
              score: item.score,
              reason: item.reason,
            };
          }
          setRankingMap(map);
          setExcludedWorkers(Array.isArray(data.excluded) ? data.excluded : []);
          setRankingModelUsed(data.model_used || "AI Reasoning Ranker");
        }
      } catch (err) {
        console.warn("[ranking] Evaluation warning:", err);
      } finally {
        setIsRankingLoading(false);
      }
    },
    [],
  );

  const targetCategory = category !== "All" ? category : requestedService;
  const targetLocality = locality.trim() || requestedLocation.trim();

  const matchingWorkers = useMemo(() => {
    return availableWorkers.filter((w) => {
      const catMatched =
        !targetCategory ||
        targetCategory === "All" ||
        w.category.toLowerCase() === targetCategory.toLowerCase() ||
        w.category.toLowerCase().includes(targetCategory.toLowerCase()) ||
        targetCategory.toLowerCase().includes(w.category.toLowerCase()) ||
        stemWord(w.category) === stemWord(targetCategory);

      const locMatched = !targetLocality || w.locality.toLowerCase().includes(targetLocality.toLowerCase());
      const availMatched = !onlyAvailableToday || Boolean(w.available_today);
      const verifiedMatched = !onlyVerified || Boolean(w.phone_verified);

      return catMatched && locMatched && availMatched && verifiedMatched;
    });
  }, [availableWorkers, targetCategory, targetLocality, onlyAvailableToday, onlyVerified]);

  // Auto-run ranking when matching workers or search filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      void runRankingEvaluation(matchingWorkers, freeTextNeed, targetCategory, targetLocality);
    }, 350);
    return () => clearTimeout(timer);
  }, [matchingWorkers, freeTextNeed, targetCategory, targetLocality, runRankingEvaluation]);

  // Sort matching workers according to AI reasoning rank
  const sortedWorkers = useMemo(() => {
    const excludedIds = new Set(excludedWorkers.map((e) => e.worker_id));
    const active = matchingWorkers.filter((w) => !excludedIds.has(w.id));
    return [...active].sort((a, b) => {
      const rankA = rankingMap[a.id]?.rank ?? 999;
      const rankB = rankingMap[b.id]?.rank ?? 999;
      return rankA - rankB;
    });
  }, [matchingWorkers, rankingMap, excludedWorkers]);

  const matchingAgencies = agencies.filter((a) => {
    const catMatched =
      !targetCategory ||
      targetCategory === "All" ||
      (a.categories || []).some((c) => {
        const cl = String(c).toLowerCase();
        const ql = targetCategory.toLowerCase();
        return cl.includes(ql) || ql.includes(cl) || stemWord(cl) === stemWord(ql);
      });

    const locMatched =
      !targetLocality ||
      (a.service_locations || []).some((l) => String(l).toLowerCase().includes(targetLocality.toLowerCase())) ||
      Boolean(a.location && String(a.location).toLowerCase().includes(targetLocality.toLowerCase()));

    const verifiedMatched = !onlyVerified || Boolean(a.verified);

    return catMatched && locMatched && verifiedMatched;
  });

  // Combine or filter strictly according to selected searchType
  const combined: Array<{ type: "agency"; data: Agency } | { type: "worker"; data: Worker }> = [];

  if (searchType === "agencies") {
    matchingAgencies.forEach((a) => combined.push({ type: "agency", data: a }));
  } else if (searchType === "workers") {
    sortedWorkers.forEach((w) => combined.push({ type: "worker", data: w }));
  } else {
    let wi = 0,
      ai = 0;
    while (wi < sortedWorkers.length || ai < matchingAgencies.length) {
      if (ai < matchingAgencies.length) combined.push({ type: "agency", data: matchingAgencies[ai++] });
      for (let n = 0; n < 2 && wi < sortedWorkers.length; n++) {
        combined.push({ type: "worker", data: sortedWorkers[wi++] });
      }
    }
  }

  const getHeading = () => {
    if (targetCategory && targetCategory !== "All") {
      if (searchType === "agencies") return `${targetCategory} Agencies`;
      if (searchType === "workers") return `${targetCategory} Specialists`;
      return `${targetCategory} Listings`;
    }
    if (targetLocality) {
      if (searchType === "agencies") return `Agencies in ${targetLocality}`;
      if (searchType === "workers") return `Workers in ${targetLocality}`;
      return `Listings in ${targetLocality}`;
    }
    if (searchType === "agencies") return "Registered Agencies";
    if (searchType === "workers") return "Individual Specialists";
    return "Verified Local Directory";
  };

  const hasActiveFilters = category !== "All" || locality.trim() !== "" || searchType !== "all";

  return (
    <PageShell backLabel="Search">
      {/* Streamlined Clean Header */}
      <div className="mb-5 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <span>Directory</span>
              <span>/</span>
              <span>
                {searchType === "agencies" ? "Agencies" : searchType === "workers" ? "Workers" : "All Listings"}
              </span>
            </div>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {getHeading()}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {combined.length} available {combined.length === 1 ? "listing" : "listings"} found
              {targetLocality ? ` near ${targetLocality}` : ""}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <Link
              to="/saved"
              aria-label="Saved listings"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground transition hover:bg-secondary"
            >
              <Heart size={13} className={savedIds.length ? "text-primary fill-primary" : "text-muted-foreground"} />
              <span>Saved ({savedIds.length})</span>
            </Link>
          </div>
        </div>

        {/* Clean Filter Controls Bar */}
        <div className="space-y-2 border-y border-border py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Type Toggle */}
            <div className="inline-flex rounded-lg border border-border bg-secondary/50 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => handleTypeChange("all")}
                className={`rounded-md px-2.5 py-1 font-semibold transition cursor-pointer ${
                  searchType === "all"
                    ? "bg-foreground text-background shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All ({matchingWorkers.length + matchingAgencies.length})
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange("workers")}
                className={`rounded-md px-2.5 py-1 font-semibold transition cursor-pointer ${
                  searchType === "workers"
                    ? "bg-foreground text-background shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Workers ({matchingWorkers.length})
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange("agencies")}
                className={`rounded-md px-2.5 py-1 font-semibold transition cursor-pointer ${
                  searchType === "agencies"
                    ? "bg-foreground text-background shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Agencies ({matchingAgencies.length})
              </button>
            </div>

            {/* Category Dropdown */}
            <select
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              aria-label="Filter by category"
              className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs font-semibold text-foreground outline-hidden focus:border-foreground/40 cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === "All" ? "All Categories" : c}
                </option>
              ))}
            </select>

            {/* Locality Input */}
            <div className="relative flex-1 min-w-[140px] max-w-[240px]">
              <input
                value={locality}
                onChange={(e) => handleLocalityChange(e.target.value)}
                placeholder="Filter by locality..."
                aria-label="Filter by locality"
                className="h-8 w-full rounded-lg border border-border bg-card px-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-hidden focus:border-foreground/40"
              />
            </div>

            {/* Reset Filter Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-semibold text-primary hover:underline cursor-pointer ml-auto"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Quick Filter Tags */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-medium text-muted-foreground mr-1">Quick Filters:</span>
          <button
            type="button"
            onClick={() => setOnlyAvailableToday(!onlyAvailableToday)}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold transition cursor-pointer ${
              onlyAvailableToday
                ? "bg-emerald-500 text-white shadow-xs"
                : "border border-border bg-secondary/40 text-foreground hover:bg-secondary"
            }`}
          >
            <span>⚡ Available Today</span>
          </button>

          <button
            type="button"
            onClick={() => setOnlyVerified(!onlyVerified)}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold transition cursor-pointer ${
              onlyVerified
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border border-border bg-secondary/40 text-foreground hover:bg-secondary"
            }`}
          >
            <BadgeCheck size={11} />
            <span>Verified Only</span>
          </button>

          <button
            type="button"
            onClick={() => handleTypeChange(searchType === "agencies" ? "all" : "agencies")}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold transition cursor-pointer ${
              searchType === "agencies"
                ? "bg-foreground text-background shadow-xs"
                : "border border-border bg-secondary/40 text-foreground hover:bg-secondary"
            }`}
          >
            <Building2 size={11} />
            <span>Licensed Agencies</span>
          </button>
        </div>
      </div>

      {/* Available Listings Display Section */}
      <section className="space-y-3">
        {combined.length ? (
          <div className="space-y-3">
            {combined.map((item, index) =>
              item.type === "agency" ? (
                <AgencyCard key={`a-${item.data.id}-${index}`} agency={item.data} />
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
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              {searchType === "agencies"
                ? "No registered agencies found matching your current filters."
                : searchType === "workers"
                  ? "No individual workers found matching your search filters."
                  : "No workers or agencies found matching your search criteria."}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-foreground px-4 text-xs font-semibold text-background transition hover:opacity-90 cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
              <Link
                to="/assistant"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-4 text-xs font-semibold text-foreground transition hover:bg-primary/20 hover:text-primary"
              >
                <Sparkles size={13} className="text-primary" />
                <span>Ask AI Assistant</span>
              </Link>
            </div>
          </div>
        )}

        {/* Excluded Candidates Section */}
        {excludedWorkers.length > 0 && (
          <div className="mt-6 rounded-xl border border-border/80 bg-secondary/30 p-4">
            <button
              type="button"
              onClick={() => setShowExcluded(!showExcluded)}
              className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <AlertTriangle size={13} className="text-amber-500" />
                <span>Excluded from Top Recommendations ({excludedWorkers.length})</span>
              </span>
              {showExcluded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            {showExcluded && (
              <div className="mt-3 space-y-2 pt-2 border-t border-border/60">
                {excludedWorkers.map((ex, idx) => (
                  <div key={`${ex.worker_id}-${idx}`} className="rounded-lg border border-border bg-card p-2.5 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="font-medium text-foreground">Candidate: {ex.worker_id}</span>
                      <span className="text-[10px] text-destructive font-semibold">Excluded by reasoning</span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">{ex.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </PageShell>
  );
}

function AgencyCard({ agency }: { agency: Agency }) {
  const phone = String(agency.phone || "").replace(/\D/g, "");
  const whatsappUrl = phone ? `https://wa.me/${phone.length === 10 ? `91${phone}` : phone}` : "";

  return (
    <article className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/30 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary text-foreground">
            {agency.logo_url ? (
              <img src={agency.logo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <Building2 size={22} className="text-muted-foreground" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="text-base font-bold text-foreground truncate">{agency.name}</h3>
              {agency.verified && (
                <span className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
                  <BadgeCheck size={12} className="text-primary" />
                  Verified
                </span>
              )}
              <span className="rounded-md border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                Agency
              </span>
            </div>

            <p className="mt-1 text-xs font-semibold text-primary">{agency.categories.join(" · ")}</p>
            <p className="mt-1 text-xs text-muted-foreground truncate">{agency.service_locations.join(", ")}</p>

            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users size={13} />
              <span>
                {agency.team_size_band} Team
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
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:opacity-90 cursor-pointer sm:flex-initial"
            >
              <MessageCircle size={14} />
              <span>WhatsApp</span>
            </a>
          )}
          <Link
            to={`/agency-profile?agency=${encodeURIComponent(agency.id)}`}
            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary px-3.5 text-xs font-semibold text-foreground transition hover:bg-foreground hover:text-background sm:flex-initial"
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
  const photos = Array.isArray((worker as Worker & { work_photos?: string[] }).work_photos)
    ? (worker as Worker & { work_photos?: string[] }).work_photos!.filter(Boolean)
    : [];

  const agencyLinked = Boolean(worker.agency_id);
  const phone = String(worker.phone || "").replace(/\D/g, "");
  const whatsappUrl = phone ? `https://wa.me/${phone.length === 10 ? `91${phone}` : phone}` : "";

  const isAvailableToday = (worker as any).available_today !== false;
  const acceptsUrgent = Boolean((worker as any).accepts_urgent);

  return (
    <article className="group relative rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/30 sm:p-5">
      {/* Top Main Section */}
      <div className="flex items-start justify-between gap-3">
        <div
          onClick={() => navigate(`/worker?worker=${encodeURIComponent(worker.id)}`)}
          className="flex flex-1 items-start gap-3.5 min-w-0 cursor-pointer"
        >
          {/* Avatar */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary text-sm font-bold text-foreground">
            {worker.photo_url ? (
              <img src={worker.photo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span>{worker.initials}</span>
            )}
          </div>

          {/* Info Column */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="truncate text-base font-bold text-foreground group-hover:text-primary transition-colors">
                {worker.name}
              </h3>
              {worker.phone_verified && (
                <span title="Verified phone">
                  <BadgeCheck size={15} className="shrink-0 text-primary" />
                </span>
              )}
              {rankInfo && (
                <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                  rankInfo.rank === 1
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                    : rankInfo.rank === 2
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "bg-secondary text-foreground border border-border"
                }`}>
                  <BrainCircuit size={11} />
                  <span>#{rankInfo.rank} AI Match</span>
                </span>
              )}
            </div>

            {/* Category & Experience */}
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-primary">{worker.category}</span>
              {worker.experience && (
                <>
                  <span className="text-muted-foreground text-[10px]">·</span>
                  <span className="text-xs text-muted-foreground">{worker.experience} exp</span>
                </>
              )}
            </div>

            {/* Location & Status Badges */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <MapPin size={13} className="shrink-0" />
                <span className="truncate">{worker.locality}</span>
              </span>

              {isAvailableToday ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Available Today
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  <Clock size={10} />
                  Busy
                </span>
              )}

              {acceptsUrgent && (
                <span className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
                  <Sparkles size={10} className="text-primary" />
                  Urgent
                </span>
              )}

              {agencyLinked && (
                <span className="rounded-md border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  Agency Linked
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bookmark / Save Button */}
        <button
          type="button"
          onClick={onToggleSaved}
          aria-label={isSaved ? `Remove ${worker.name} from saved` : `Save ${worker.name}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-foreground transition hover:bg-foreground hover:text-background cursor-pointer"
        >
          <Heart
            size={15}
            className={isSaved ? "text-primary fill-primary" : "text-muted-foreground"}
          />
        </button>
      </div>

      {/* AI Reasoning Rank Explanation Banner */}
      {rankInfo && (
        <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-xs text-foreground">
          <div className="flex items-start gap-2">
            <BrainCircuit size={14} className="text-primary shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-primary">Why this rank (#{rankInfo.rank}):</span>
                <span className="text-[10px] text-muted-foreground font-medium">Fit Score: {rankInfo.score}/100</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{rankInfo.reason}</p>
            </div>
          </div>
        </div>
      )}

      {/* Optional Work Photos Showcase */}
      {photos.length > 0 && (
        <div
          onClick={() => navigate(`/worker?worker=${encodeURIComponent(worker.id)}`)}
          className="mt-3.5 grid grid-cols-3 gap-2 cursor-pointer"
        >
          {photos.slice(0, 3).map((photo, index) => (
            <div
              key={`${photo}-${index}`}
              className="relative h-20 overflow-hidden rounded-md border border-border bg-secondary"
            >
              <img src={photo} alt="" className="h-full w-full object-cover" />
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
      <div className="mt-4 pt-3 border-t border-border/80 flex items-center gap-2">
        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="flex-1 inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:opacity-90 cursor-pointer"
          >
            <MessageCircle size={15} />
            <span>WhatsApp</span>
          </a>
        ) : null}
        <button
          type="button"
          onClick={() => navigate(`/worker?worker=${encodeURIComponent(worker.id)}`)}
          className="flex-1 inline-flex h-10 items-center justify-center rounded-lg border border-border bg-secondary px-3 text-xs font-semibold text-foreground transition hover:bg-foreground hover:text-background cursor-pointer"
        >
          View Profile
        </button>
      </div>
    </article>
  );
}

