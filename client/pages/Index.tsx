import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  MapPin,
  ChevronDown,
  Search,
  Zap,
  Wrench,
  Hammer,
  Paintbrush,
  Brush,
  ChevronRight,
  Navigation,
  X,
  Sparkles,
  Heart,
  UserRound,
  ArrowRight,
} from "lucide-react";
import type { Worker } from "@shared/workers";
import type { WorkersResponse } from "@shared/api";
import { logAnalyticsEvent } from "@/lib/analytics";
import TrustStripWorkerCard from "@/components/TrustStripWorkerCard";
import NavBar from "@/components/NavBar";
import PostNeedModal from "@/components/PostNeedModal";
import {
  getStandardLocation,
  setStandardLocation,
  detectGpsLocation,
  isLocationMatch,
  autoDetectLocationIfGranted,
} from "@/lib/location";
import { supabase } from "@/lib/supabase";

const categories = [
  { name: "Electrician", icon: Zap, countText: "Wiring, Switchboard & Fan" },
  { name: "Plumber", icon: Wrench, countText: "Pipes, Leakage & Motor" },
  { name: "Carpenter", icon: Hammer, countText: "Furniture & Door Repair" },
  { name: "Painter", icon: Paintbrush, countText: "Interior & Exterior Wall" },
  { name: "Cleaner", icon: Brush, countText: "Deep Clean & Kitchen" },
  { name: "All Services", icon: ChevronRight, countText: "Browse all trades" },
];

export default function Index() {
  const navigate = useNavigate();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => {
      const role = data.session?.user?.user_metadata?.role;
      if (role === "worker") {
        navigate("/worker-dashboard", { replace: true });
      } else if (role === "agency") {
        navigate("/agency", { replace: true });
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      const role = s?.user?.user_metadata?.role;
      if (role === "worker") {
        navigate("/worker-dashboard", { replace: true });
      } else if (role === "agency") {
        navigate("/agency", { replace: true });
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [navigate]);

  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState(() => getStandardLocation());
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [customLocationInput, setCustomLocationInput] = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [postNeedOpen, setPostNeedOpen] = useState(false);
  const locationPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleLocationChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ location: string }>;
      if (customEvent.detail?.location) {
        setLocation(customEvent.detail.location);
      } else {
        setLocation(getStandardLocation());
      }
    };
    window.addEventListener("user-location-changed", handleLocationChange);
    return () =>
      window.removeEventListener("user-location-changed", handleLocationChange);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      const userHasCustomSaved = localStorage.getItem("user_selected_location");
      if (!userHasCustomSaved) {
        setGpsLoading(true);
        void detectGpsLocation(true)
          .then((details) => {
            if (details) {
              const detected =
                details.locality || details.city || details.formatted;
              if (detected && detected !== "Local Area") {
                setLocation(detected);
                setStandardLocation(detected);
              }
            }
          })
          .finally(() => {
            setGpsLoading(false);
          });
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const fetchWorkers = async () => {
      try {
        const res = await fetch(`/api/workers?_=${Date.now()}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = (await res.json()) as WorkersResponse;
          if (mounted && Array.isArray(data.workers)) {
            setWorkers(data.workers);
          }
        }
      } catch (err) {
        console.warn("[Index] Unable to load workers:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void fetchWorkers();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!showLocationPicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        locationPickerRef.current &&
        !locationPickerRef.current.contains(e.target as Node)
      ) {
        setShowLocationPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showLocationPicker]);

  const handleGps = async () => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    try {
      const details = await detectGpsLocation(true);
      if (details) {
        const detected = details.locality || details.city || details.formatted;
        if (detected) {
          setLocation(detected);
          setStandardLocation(detected);
          setShowLocationPicker(false);
        }
      }
    } catch {
      // fallback
    } finally {
      setGpsLoading(false);
    }
  };

  const handleApplyLocation = (newLoc: string) => {
    const trimmed = newLoc.trim();
    if (trimmed) {
      setLocation(trimmed);
      setStandardLocation(trimmed);
    }
    setShowLocationPicker(false);
  };

  const { displayPros, isExactLocationMatch } = useMemo(() => {
    const target = location.trim();
    const sorted = [...workers].sort((a, b) => {
      const aVer = a.phone_verified ? 1 : 0;
      const bVer = b.phone_verified ? 1 : 0;
      if (bVer !== aVer) return bVer - aVer;

      const aRating = Number(a.avg_rating || a.rating || 4.8);
      const bRating = Number(b.avg_rating || b.rating || 4.8);
      if (bRating !== aRating) return bRating - aRating;

      if (b.available_today && !a.available_today) return 1;
      if (!b.available_today && a.available_today) return -1;

      return 0;
    });

    if (!target) {
      return { displayPros: sorted.slice(0, 6), isExactLocationMatch: true };
    }

    const matched = sorted.filter((w) => isLocationMatch(w.locality, target));
    if (matched.length > 0) {
      return { displayPros: matched.slice(0, 6), isExactLocationMatch: true };
    }

    // Fallback to top verified pros if exact locality has no registered workers yet
    return { displayPros: sorted.slice(0, 6), isExactLocationMatch: false };
  }, [workers, location]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    void logAnalyticsEvent("search_performed", null, {
      query: searchQuery,
      location,
    });
    const params = new URLSearchParams();
    if (searchQuery.trim()) {
      params.set("q", searchQuery.trim());
      params.set("service", searchQuery.trim());
    }
    if (location.trim()) {
      params.set("location", location.trim());
    }
    navigate(`/search${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const handleCategoryClick = (categoryName: string) => {
    void logAnalyticsEvent("category_tile_clicked", null, {
      category: categoryName,
      location,
    });
    const params = new URLSearchParams();
    if (categoryName !== "All Services") {
      params.set("service", categoryName);
    }
    if (location) {
      params.set("location", location);
    }
    navigate(`/search${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#09090B] text-[#09090B] dark:text-[#FAFAFA] flex flex-col selection:bg-neutral-200 dark:selection:bg-neutral-800 pb-24 font-sans relative resend-spotlight">
      {/* Background Micro Dot Grid Texture */}
      <div className="absolute inset-0 resend-grid-bg pointer-events-none opacity-40" />

      {/* TOP HEADER — Sleek Resend-Style Translucent Header */}
      <header className="sticky top-0 z-30 w-full border-b border-black/[0.06] dark:border-white/[0.08] bg-[#FAFAFA]/80 dark:bg-[#09090B]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 md:h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6 relative">
          {/* App Logo & Name */}
          <Link
            to="/home"
            className="flex items-center gap-2.5 shrink-0 group"
            aria-label="LocalWorker Home"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-black text-white dark:bg-white dark:text-black font-extrabold text-sm shadow-sm transition-transform group-hover:scale-105 border border-white/10 dark:border-black/10">
              L
            </span>
            <span className="text-base font-bold tracking-tight text-[#09090B] dark:text-[#FAFAFA]">
              LocalWorker
            </span>
          </Link>

          {/* Location Chip */}
          <div
            className="relative shrink-0 md:order-none"
            ref={locationPickerRef}
          >
            <button
              type="button"
              onClick={() => {
                setCustomLocationInput(location);
                setShowLocationPicker((prev) => !prev);
              }}
              aria-label="Select location area"
              className="inline-flex h-8 md:h-9 items-center gap-1.5 rounded-full border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#0D0D10] px-2.5 sm:px-3.5 text-xs font-semibold text-[#09090B] dark:text-[#FAFAFA] transition-all hover:border-black/25 dark:hover:border-white/25 active:scale-95 cursor-pointer max-w-[130px] sm:max-w-[170px] shadow-xs"
            >
              <MapPin size={12} className="text-[#71717A] dark:text-[#A1A1AA] shrink-0" />
              <span className="truncate">{location || "Select Area"}</span>
              <ChevronDown
                size={12}
                className={`text-[#71717A] dark:text-[#A1A1AA] shrink-0 transition-transform duration-200 ${
                  showLocationPicker ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Location Selector Popover */}
            {showLocationPicker && (
              <div className="absolute right-0 md:left-0 md:right-auto top-10 md:top-11 z-50 w-72 sm:w-80 rounded-[20px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#0D0D10] p-4 shadow-xl dark:shadow-[0_10px_30px_rgba(0,0,0,0.6)] animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-black/[0.06] dark:border-white/[0.08] mb-3">
                  <span className="text-xs font-bold text-[#09090B] dark:text-[#FAFAFA] tracking-tight">
                    Choose Area
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowLocationPicker(false)}
                    className="text-[#71717A] hover:text-[#09090B] dark:hover:text-[#FAFAFA] cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* GPS Auto-Detect */}
                <button
                  type="button"
                  onClick={handleGps}
                  disabled={gpsLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-black/[0.08] dark:border-white/[0.08] bg-[#F4F4F5] dark:bg-[#18181B] py-2 text-xs font-bold text-[#09090B] dark:text-[#FAFAFA] transition hover:bg-[#E4E4E7] dark:hover:bg-[#27272A] cursor-pointer disabled:opacity-60 mb-3 font-mono"
                >
                  <Navigation
                    size={13}
                    className={
                      gpsLoading ? "animate-spin text-current" : "text-current"
                    }
                  />
                  <span>
                    {gpsLoading
                      ? "Detecting GPS..."
                      : "Detect Current Location (GPS)"}
                  </span>
                </button>

                {/* Custom Location Input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleApplyLocation(customLocationInput);
                  }}
                  className="space-y-2.5"
                >
                  <div className="flex items-center rounded-[12px] border border-black/[0.08] dark:border-white/[0.08] bg-[#FAFAFA] dark:bg-[#141416] px-3 py-2 focus-within:border-black/30 dark:focus-within:border-white/30 transition-all">
                    <MapPin
                      size={14}
                      className="text-[#71717A] dark:text-[#A1A1AA] mr-2 shrink-0"
                    />
                    <input
                      type="text"
                      value={customLocationInput}
                      onChange={(e) => setCustomLocationInput(e.target.value)}
                      placeholder="e.g. RS Puram, Gandhipuram, Chennai"
                      className="w-full bg-transparent text-xs text-[#09090B] dark:text-[#FAFAFA] outline-none placeholder:text-[#A1A1AA] dark:placeholder:text-[#71717A]"
                      autoFocus
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="submit"
                      className="flex-1 rounded-full bg-black text-white dark:bg-white dark:text-black py-2 text-xs font-semibold transition hover:bg-neutral-800 dark:hover:bg-neutral-200 cursor-pointer shadow-sm"
                    >
                      Apply
                    </button>
                    {location && (
                      <button
                        type="button"
                        onClick={() => handleApplyLocation("")}
                        className="rounded-full border border-black/[0.08] dark:border-white/[0.08] px-3 py-2 text-xs font-medium text-[#71717A] dark:text-[#A1A1AA] hover:text-[#09090B] dark:hover:text-white cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Desktop Search Bar (Single clean input) */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex flex-1 max-w-md min-w-0"
          >
            <div className="relative flex items-center w-full">
              <Search
                size={15}
                className="absolute left-3.5 text-[#71717A] dark:text-[#A1A1AA] pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search services, pros or skills (e.g. Electrician)"
                className="h-10 w-full rounded-full border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#0D0D10] pl-10 pr-9 text-xs sm:text-sm text-[#09090B] dark:text-[#FAFAFA] placeholder:text-[#A1A1AA] dark:placeholder:text-[#71717A] outline-none transition-all focus:border-black/30 dark:focus:border-white/30 shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 text-[#71717A] hover:text-[#09090B] dark:hover:text-white cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </form>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 shrink-0 text-xs font-semibold text-[#71717A] dark:text-[#A1A1AA]">
            <Link
              to="/saved"
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 transition hover:bg-black/5 dark:hover:bg-white/10 hover:text-[#09090B] dark:hover:text-white"
            >
              <Heart size={14} />
              <span>My Circle</span>
            </Link>
            <Link
              to="/profile"
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 transition hover:bg-black/5 dark:hover:bg-white/10 hover:text-[#09090B] dark:hover:text-white"
            >
              <UserRound size={14} />
              <span>Profile</span>
            </Link>
          </nav>

          {/* Quick Post Need Action (Desktop) */}
          <button
            type="button"
            onClick={() => setPostNeedOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-xs font-bold shadow-sm hover:bg-neutral-800 dark:hover:bg-neutral-200 active:scale-[0.98] transition-all cursor-pointer shrink-0 border border-white/10 dark:border-black/10"
          >
            <Sparkles size={13} />
            <span>Post a Need</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="mx-auto w-full max-w-lg md:max-w-4xl flex-1 px-4 pt-5 sm:px-6 space-y-7 relative">

        {/* 1. "VERIFIED PROS NEAR YOU" — Strictly Location-Filtered with GPS check */}
        <section aria-labelledby="verified-pros-heading">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id="verified-pros-heading"
                className="text-sm sm:text-base font-bold text-[#09090B] dark:text-[#FAFAFA] tracking-tight"
              >
                Verified pros near you
              </h2>
              {location && (
                <button
                  type="button"
                  onClick={handleGps}
                  disabled={gpsLoading}
                  className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#0D0D10] px-2.5 py-0.5 text-[10px] font-mono font-medium text-[#09090B] dark:text-[#FAFAFA] hover:border-black/20 dark:hover:border-white/20 transition cursor-pointer shadow-xs"
                  title="Click to refresh via GPS"
                >
                  <MapPin
                    size={10}
                    className={gpsLoading ? "animate-spin text-[#71717A]" : "text-[#71717A]"}
                  />
                  <span className="truncate max-w-[120px]">{location}</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleGps}
                disabled={gpsLoading}
                className="inline-flex items-center gap-1 rounded-full border border-black/[0.08] dark:border-white/[0.08] bg-[#F4F4F5] dark:bg-[#18181B] px-2 py-0.5 text-[10px] font-mono text-[#71717A] dark:text-[#A1A1AA] hover:text-[#09090B] dark:hover:text-white transition cursor-pointer shadow-xs"
                title="Detect exact location via GPS"
              >
                <Navigation size={10} className={gpsLoading ? "animate-spin" : ""} />
                <span>{gpsLoading ? "Checking GPS..." : "Check GPS"}</span>
              </button>
            </div>

            <Link
              to={
                location
                  ? `/search?location=${encodeURIComponent(location)}`
                  : "/search"
              }
              className="text-xs font-semibold text-[#09090B] dark:text-[#FAFAFA] hover:opacity-80 inline-flex items-center gap-0.5 font-mono"
            >
              <span>View all</span>
              <ChevronRight size={13} />
            </Link>
          </div>

          {!isExactLocationMatch && location && displayPros.length > 0 && (
            <div className="mb-3 flex items-center justify-between rounded-[14px] border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-[#71717A] dark:text-[#A1A1AA]">
              <span>
                No pros found strictly inside <strong>{location}</strong> yet. Showing top verified professionals nearby:
              </span>
              <button
                type="button"
                onClick={handleGps}
                disabled={gpsLoading}
                className="ml-2 shrink-0 font-mono text-[11px] font-bold text-[#09090B] dark:text-white underline cursor-pointer"
              >
                Re-check GPS
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex md:grid md:grid-cols-3 gap-3 overflow-x-auto pb-2 scrollbar-none snap-x -mx-4 px-4 sm:mx-0 sm:px-0 md:mx-0 md:px-0">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-[230px] sm:w-[250px] md:w-full shrink-0 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#16171B] p-3.5 shadow-sm animate-pulse space-y-2.5"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-10 w-10 rounded-xl bg-[#F4F4F5] dark:bg-[#18181B]" />
                      <div className="space-y-1">
                        <div className="h-3.5 w-24 rounded bg-[#F4F4F5] dark:bg-[#18181B]" />
                        <div className="h-2.5 w-16 rounded bg-[#F4F4F5] dark:bg-[#18181B]" />
                      </div>
                    </div>
                    <div className="h-5 w-12 rounded bg-[#F4F4F5] dark:bg-[#18181B]" />
                  </div>
                  <div className="h-2.5 w-full rounded bg-[#F4F4F5] dark:bg-[#18181B]" />
                  <div className="flex gap-2 pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
                    <div className="h-6 w-12 rounded bg-[#F4F4F5] dark:bg-[#18181B]" />
                    <div className="h-6 flex-1 rounded bg-[#F4F4F5] dark:bg-[#18181B]" />
                  </div>
                </div>
              ))}
            </div>
          ) : displayPros.length > 0 ? (
            <div className="flex md:grid md:grid-cols-3 gap-3 overflow-x-auto md:overflow-visible pb-2 md:pb-0 scrollbar-none snap-x snap-mandatory md:snap-none -mx-4 px-4 sm:mx-0 sm:px-0 md:mx-0 md:px-0 md:[&>article]:w-full md:[&>article]:max-w-none">
              {displayPros.map((worker) => (
                <TrustStripWorkerCard key={worker.id} worker={worker} />
              ))}
            </div>
          ) : (
            <div className="rounded-[18px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#0D0D10] p-6 text-center shadow-xs">
              <p className="text-xs font-medium text-[#71717A] dark:text-[#A1A1AA]">
                No verified professionals found near{" "}
                <span className="font-semibold text-[#09090B] dark:text-white">
                  {location || "your area"}
                </span>
                .
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleGps}
                  disabled={gpsLoading}
                  className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#0D0D10] px-3.5 py-1.5 text-xs font-semibold text-[#09090B] dark:text-[#FAFAFA] hover:bg-[#F4F4F5] dark:hover:bg-[#18181B] cursor-pointer shadow-xs font-mono"
                >
                  <Navigation
                    size={12}
                    className={gpsLoading ? "animate-spin" : ""}
                  />
                  <span>Check GPS</span>
                </button>
                <Link
                  to="/search"
                  className="inline-flex items-center gap-1.5 rounded-full bg-black text-white dark:bg-white dark:text-black px-4 py-1.5 text-xs font-semibold shadow-sm hover:bg-neutral-800 dark:hover:bg-neutral-200"
                >
                  <span>Browse all workers</span>
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* 2. CATEGORIES */}
        <section aria-labelledby="categories-heading">
          <div className="flex items-center justify-between mb-3 px-0.5">
            <div>
              <h2
                id="categories-heading"
                className="text-sm sm:text-base font-bold text-[#09090B] dark:text-[#FAFAFA] tracking-tight"
              >
                Explore by category
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {categories.map(({ name, icon: Icon, countText }) => (
              <button
                key={name}
                type="button"
                onClick={() => handleCategoryClick(name)}
                className="group flex items-center gap-3.5 rounded-[18px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#0D0D10] p-4 text-left shadow-xs transition-all hover:border-black/25 dark:hover:border-white/20 hover:shadow-sm active:scale-[0.98] cursor-pointer"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F4F4F5] dark:bg-[#18181B] text-[#09090B] dark:text-[#FAFAFA] transition-all group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black group-hover:scale-105 border border-black/[0.04] dark:border-white/[0.06]">
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-xs sm:text-sm font-bold text-[#09090B] dark:text-[#FAFAFA] group-hover:text-black dark:group-hover:text-white transition-colors tracking-tight">
                    {name}
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-[#71717A] dark:text-[#A1A1AA] line-clamp-1 mt-0.5">
                    {countText}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>

      {/* BOTTOM NAVIGATION (Mobile floating island) */}
      <NavBar />

      {/* Floating Action Button for Post a Need (Mobile) */}
      <button
        type="button"
        onClick={() => setPostNeedOpen(true)}
        className="sm:hidden fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full bg-black text-white dark:bg-white dark:text-black px-4 py-2.5 text-xs font-bold shadow-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 active:scale-95 transition-all cursor-pointer border border-white/20"
        title="Post a Need"
      >
        <Sparkles size={15} />
        <span>Post a Need</span>
      </button>

      {/* Post a Need Modal */}
      <PostNeedModal
        isOpen={postNeedOpen}
        onClose={() => setPostNeedOpen(false)}
        initialLocation={location}
      />
    </div>
  );
}
