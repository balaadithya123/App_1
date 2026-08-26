import { useCallback, useEffect, useState } from "react";
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

const normalizeText = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
const stemWord = (word: string) => {
  const w = normalizeText(word);
  if (w.endsWith("ians") || w.endsWith("ian")) return w.replace(/ians?$/, "");
  if (w.endsWith("ers") || w.endsWith("er")) return w.replace(/ers?$/, "");
  if (w.endsWith("ors") || w.endsWith("or")) return w.replace(/ors?$/, "");
  if (w.endsWith("ing")) return w.replace(/ing$/, "");
  if (w.endsWith("s") && w.length > 3) return w.slice(0, -1);
  return w;
};
const categoryAliases: Record<string, string[]> = {
  electrician: ["electrician", "electrical", "electric works", "electrician services"],
  painter: ["painter", "painting", "paint", "painting services"],
  plumber: ["plumber", "plumbing", "plumbing services"],
  carpenter: ["carpenter", "carpentry", "woodwork", "wood worker"],
  cleaner: ["cleaner", "cleaning", "house cleaning", "deep cleaning"],
  "ac repair": ["ac repair", "ac service", "air conditioner", "air conditioning", "hvac"],
};
const categoryMatches = (value: unknown, query: unknown) => {
  const v = normalizeText(value);
  const q = normalizeText(query);
  if (!v || !q) return false;
  if (v === q || v.includes(q) || q.includes(v) || stemWord(v) === stemWord(q)) return true;
  const aliases = categoryAliases[q] || [];
  const reverseAliases = Object.entries(categoryAliases).filter(([, vals]) => vals.some((x) => normalizeText(x) === v)).map(([key]) => key);
  return aliases.some((x) => normalizeText(x) === v || normalizeText(x).includes(v) || v.includes(normalizeText(x))) || reverseAliases.some((key) => categoryAliases[key].some((x) => normalizeText(x) === q || normalizeText(x).includes(q) || q.includes(normalizeText(x))));
};
const matchStandardCategory = (val: string) => {
  if (!val || normalizeText(val) === "all") return "All";
  const found = categories.find((c) => categoryMatches(c, val));
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

  useEffect(() => {
    const t = searchParams.get("type")?.toLowerCase();
    if (t === "agencies" && searchType !== "agencies") setSearchType("agencies");
    else if (t === "workers" && searchType !== "workers") setSearchType("workers");
    else if (!t && searchType !== "all" && rawType !== "agencies" && rawType !== "workers") setSearchType("all");
    setCategory(matchStandardCategory(searchParams.get("service")?.trim() || ""));
    setLocality(searchParams.get("location")?.trim() || "");
  }, [searchParams]);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/workers?availability_refresh=${Date.now()}`, { cache: "no-store" });
      if (r.ok) setAvailableWorkers(((await r.json()) as WorkersResponse).workers);
    } catch {}
    try {
      const session = (await supabase?.auth.getSession())?.data.session;
      const token = session?.access_token;
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      let clientRes: any = null;
      if (supabase) {
        try { clientRes = await supabase.from("agencies").select("id,name,phone,email,categories,service_locations,location,team_size_band,logo_url,description,verified,agency_code,created_at"); } catch {}
      }
      const serverRes = await fetch(`/api/agencies?_=${Date.now()}`, { headers, cache: "no-store" }).catch(() => null);
      const serverAgencies = serverRes && serverRes.ok ? ((await serverRes.json())?.agencies as Agency[]) : [];
      const clientAgencies = clientRes && !clientRes.error && Array.isArray(clientRes.data) ? (clientRes.data as Agency[]) : [];
      const mergedMap = new Map<string, Agency>();
      for (const a of serverAgencies || []) if (a?.id) mergedMap.set(a.id, a);
      for (const a of clientAgencies || []) if (a?.id && !mergedMap.has(a.id)) mergedMap.set(a.id, { ...a, categories: Array.isArray(a.categories) ? a.categories : [String(a.categories || "")], service_locations: Array.isArray(a.service_locations) ? a.service_locations : [String(a.service_locations || a.location || "")] });
      setAgencies(Array.from(mergedMap.values()));
    } catch {}
  }, []);
  useEffect(() => { void load(); const i = window.setInterval(() => void load(), 10000); return () => window.clearInterval(i); }, [load]);
  useEffect(() => { const refresh = () => setSavedIds(getSavedWorkerIds()); window.addEventListener("saved-workers-changed", refresh); return () => window.removeEventListener("saved-workers-changed", refresh); }, []);
  useEffect(() => { void logAnalyticsEvent("search_performed", null, { search_term: requestedService, location: requestedLocation, type: searchType }); }, [requestedService, requestedLocation, searchType]);

  const handleToggleSaved = (id: string, e: React.MouseEvent) => { e.stopPropagation(); toggleSavedWorker(id); setSavedIds(getSavedWorkerIds()); };
  const handleTypeChange = (newType: SearchType) => { setSearchType(newType); const nextParams = new URLSearchParams(searchParams); if (newType === "all") nextParams.delete("type"); else nextParams.set("type", newType); setSearchParams(nextParams, { replace: true }); };
  const handleCategoryChange = (newCat: string) => { setCategory(newCat); const next = new URLSearchParams(searchParams); if (newCat === "All") next.delete("service"); else next.set("service", newCat); setSearchParams(next, { replace: true }); };
  const handleLocalityChange = (newLoc: string) => { setLocality(newLoc); const next = new URLSearchParams(searchParams); if (!newLoc.trim()) next.delete("location"); else next.set("location", newLoc.trim()); setSearchParams(next, { replace: true }); };
  const handleResetFilters = () => { setCategory("All"); setLocality(""); setSearchType("all"); setSearchParams(new URLSearchParams(), { replace: true }); };

  const targetCategory = category !== "All" ? category : requestedService;
  const targetLocality = locality.trim() || requestedLocation.trim();
  const matchingWorkers = availableWorkers.filter((w) => {
    const searchable = [w.category, ...(w.services || []), w.about, w.name].join(" ");
    const catMatched = !targetCategory || targetCategory === "All" || categoryMatches(searchable, targetCategory) || (w.services || []).some((s) => categoryMatches(s, targetCategory));
    const locMatched = !targetLocality || normalizeText(w.locality).includes(normalizeText(targetLocality));
    return catMatched && locMatched;
  });
  const matchingAgencies = agencies.filter((a) => {
    const searchable = [a.name, ...(a.categories || []), a.description].join(" ");
    const catMatched = !targetCategory || targetCategory === "All" || (a.categories || []).some((c) => categoryMatches(c, targetCategory)) || categoryMatches(searchable, targetCategory);
    const locMatched = !targetLocality || (a.service_locations || []).some((l) => normalizeText(l).includes(normalizeText(targetLocality))) || Boolean(a.location && normalizeText(a.location).includes(normalizeText(targetLocality)));
    return catMatched && locMatched;
  });

  const combined: Array<{ type: "agency"; data: Agency } | { type: "worker"; data: Worker }> = [];
  if (searchType === "agencies") matchingAgencies.forEach((a) => combined.push({ type: "agency", data: a }));
  else if (searchType === "workers") matchingWorkers.forEach((w) => combined.push({ type: "worker", data: w }));
  else { let wi = 0, ai = 0; while (wi < matchingWorkers.length || ai < matchingAgencies.length) { if (ai < matchingAgencies.length) combined.push({ type: "agency", data: matchingAgencies[ai++] }); for (let n = 0; n < 2 && wi < matchingWorkers.length; n++) if (wi < matchingWorkers.length) combined.push({ type: "worker", data: matchingWorkers[wi++] }); } }

  const getHeading = () => { if (targetCategory && targetCategory !== "All") { if (searchType === "agencies") return `${targetCategory} Agencies`; if (searchType === "workers") return `${targetCategory} Specialists`; return `${targetCategory} Listings`; } if (targetLocality) { if (searchType === "agencies") return `Agencies in ${targetLocality}`; if (searchType === "workers") return `Workers in ${targetLocality}`; return `Listings in ${targetLocality}`; } if (searchType === "agencies") return "Registered Agencies"; if (searchType === "workers") return "Individual Specialists"; return "Verified Local Directory"; };
  const hasActiveFilters = category !== "All" || locality.trim() !== "" || searchType !== "all";

  return (
    <PageShell backLabel="Search">
      <div className="mb-5 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground"><span>Directory</span><span>/</span><span>{searchType === "agencies" ? "Agencies" : searchType === "workers" ? "Workers" : "All Listings"}</span></div><h1 className="mt-0.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{getHeading()}</h1><p className="mt-1 text-xs text-muted-foreground">{combined.length} available {combined.length === 1 ? "listing" : "listings"} found{targetLocality ? ` near ${targetLocality}` : ""}</p></div><div className="flex items-center gap-2 self-start sm:self-center"><Link to="/saved" aria-label="Saved listings" className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground transition hover:bg-secondary"><Heart size={13} className={savedIds.length ? "text-primary fill-primary" : "text-muted-foreground"} /><span>Saved ({savedIds.length})</span></Link></div></div>
        <div className="flex flex-wrap items-center gap-2 border-y border-border py-2.5">
          <div className="inline-flex rounded-lg border border-border bg-secondary/50 p-0.5 text-xs"><button type="button" onClick={() => handleTypeChange("all")} className={`rounded-md px-2.5 py-1 font-semibold transition cursor-pointer ${searchType === "all" ? "bg-foreground text-background shadow-xs" : "text-muted-foreground hover:text-foreground"}`}>All ({matchingWorkers.length + matchingAgencies.length})</button><button type="button" onClick={() => handleTypeChange("workers")} className={`rounded-md px-2.5 py-1 font-semibold transition cursor-pointer ${searchType === "workers" ? "bg-foreground text-background shadow-xs" : "text-muted-foreground hover:text-foreground"}`}>Workers ({matchingWorkers.length})</button><button type="button" onClick={() => handleTypeChange("agencies")} className={`rounded-md px-2.5 py-1 font-semibold transition cursor-pointer ${searchType === "agencies" ? "bg-foreground text-background shadow-xs" : "text-muted-foreground hover:text-foreground"}`}>Agencies ({matchingAgencies.length})</button></div>
          <select value={category} onChange={(e) => handleCategoryChange(e.target.value)} aria-label="Filter by category" className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs font-semibold text-foreground outline-hidden focus:border-foreground/40 cursor-pointer">{categories.map((c) => <option key={c} value={c}>{c === "All" ? "All Categories" : c}</option>)}</select>
          <div className="relative flex-1 min-w-[140px] max-w-[240px]"><input value={locality} onChange={(e) => handleLocalityChange(e.target.value)} placeholder="Filter by locality..." aria-label="Filter by locality" className="h-8 w-full rounded-lg border border-border bg-card px-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-hidden focus:border-foreground/40" /></div>
          {hasActiveFilters && <button type="button" onClick={handleResetFilters} className="text-xs font-semibold text-primary hover:underline cursor-pointer">Reset</button>}
        </div>
      </div>
      <div className="space-y-3">
        {combined.length === 0 ? <div className="rounded-xl border border-border bg-card p-8 text-center"><SearchIcon className="mx-auto mb-3 text-muted-foreground" size={28}/><p className="font-semibold text-foreground">No listings found</p><p className="mt-1 text-sm text-muted-foreground">Try another category or locality.</p></div> : combined.map((item) => <div key={`${item.type}-${item.data.id}`} className="rounded-xl border border-border bg-card p-4">{item.type === "agency" ? <><div className="flex items-center gap-2"><Building2 size={18}/><div><h2 className="font-semibold">{item.data.name}</h2><p className="text-xs text-muted-foreground">{item.data.categories?.join(", ")}</p></div></div></> : <><div className="flex items-center gap-2"><UserRound size={18}/><div><h2 className="font-semibold">{item.data.name}</h2><p className="text-xs text-muted-foreground">{item.data.category}</p></div></div></>}</div>)}
      </div>
    </PageShell>
  );
}
