import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
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
  ShieldCheck,
  CheckCircle2,
  Clock,
  Building2,
} from "lucide-react";
import type { Worker } from "@shared/workers";
import type { WorkersResponse } from "@shared/api";
import { logAnalyticsEvent } from "@/lib/analytics";
import TrustStripWorkerCard from "@/components/TrustStripWorkerCard";
import NavBar from "@/components/NavBar";
import PostNeedModal from "@/components/PostNeedModal";
import ThemeToggle from "@/components/ThemeToggle";
import MobileMenu from "@/components/MobileMenu";
import { getStoredDueBadgeCount, getLiveDueBadgeCount } from "@/lib/home-items";
import {
  getStandardLocation,
  setStandardLocation,
  detectGpsLocation,
  isLocationMatch,
} from "@/lib/location";
import { supabase } from "@/lib/supabase";

const categories = [
  { name: "Electrician", icon: Zap, countText: "Wiring, switchboards, inverter & fan repairs" },
  { name: "Plumber", icon: Wrench, countText: "Pipes, leakage, taps, geyser & motors" },
  { name: "Carpenter", icon: Hammer, countText: "Furniture assembly, door lock & wood repair" },
  { name: "Painter", icon: Paintbrush, countText: "Interior wall, exterior & waterproofing" },
  { name: "Cleaner", icon: Brush, countText: "Deep cleaning, kitchen, sofa & bathroom" },
  { name: "All Services", icon: ChevronRight, countText: "Browse all verified trade specialists" },
];

export default function Index() {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [dueCount, setDueCount] = useState<number>(0);

  useEffect(() => {
    if (routerLocation.state && (routerLocation.state as any).openPostNeed) {
      setPostNeedOpen(true);
    }
  }, [routerLocation.state]);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      const role = data.session?.user?.user_metadata?.role;
      if (role === "worker") {
        navigate("/worker-dashboard", { replace: true });
      } else if (role === "agency") {
        navigate("/agency", { replace: true });
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      const role = s?.user?.user_metadata?.role;
      if (role === "worker") {
        navigate("/worker-dashboard", { replace: true });
      } else if (role === "agency") {
        navigate("/agency", { replace: true });
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const updateDue = () => {
      setDueCount(getStoredDueBadgeCount(session?.user?.id));
      void getLiveDueBadgeCount(session?.user?.id).then((c) => setDueCount(c));
    };
    updateDue();
    window.addEventListener("home-items-changed", updateDue);
    return () => window.removeEventListener("home-items-changed", updateDue);
  }, [session?.user?.id]);

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
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#09090B] text-[#09090B] dark:text-[#FAFAFA] flex flex-col selection:bg-neutral-200 dark:selection:bg-neutral-800 pb-24 font-sans">
      {/* TOP HEADER — Clean, Polished Translucent Header */}
      <header className="sticky top-0 z-40 w-full border-b border-[#E4E4E7] dark:border-[#27272A] bg-white/90 dark:bg-[#09090B]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 lg:gap-6 px-4 sm:px-6 lg:px-8 relative">
          {/* Left: Brand Logo & Location Chip */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <Link
              to="/home"
              className="flex items-center gap-2.5 shrink-0 group"
              aria-label="LocalWorker Home"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-black text-white dark:bg-white dark:text-black font-extrabold text-sm shadow-xs transition-transform group-hover:scale-105 border border-white/10 dark:border-black/10">
                L
              </span>
              <span className="text-base sm:text-lg font-bold tracking-tight text-[#09090B] dark:text-[#FAFAFA]">
                LocalWorker
              </span>
            </Link>

            {/* Subtle Divider */}
            <div className="hidden sm:block h-5 w-px bg-[#E4E4E7] dark:bg-[#27272A] shrink-0" />

            {/* Location Chip Selector */}
            <div className="relative shrink-0" ref={locationPickerRef}>
              <button
                type="button"
                onClick={() => {
                  setCustomLocationInput(location);
                  setShowLocationPicker((prev) => !prev);
                }}
                aria-label="Select location area"
                className="inline-flex h-9 items-center gap-1.5 sm:gap-2 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-[#141416] px-3 sm:px-3.5 text-xs font-medium text-[#09090B] dark:text-[#FAFAFA] transition hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 active:scale-95 cursor-pointer max-w-[130px] sm:max-w-[180px] shadow-2xs"
              >
                <MapPin size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="truncate">{location || "Select Area"}</span>
                <ChevronDown
                  size={13}
                  className={`text-[#71717A] dark:text-[#A1A1AA] shrink-0 transition-transform duration-200 ${
                    showLocationPicker ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Location Selector Popover */}
              {showLocationPicker && (
                <div className="absolute left-0 top-11 z-50 w-72 sm:w-80 rounded-2xl border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] p-4 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#E4E4E7] dark:border-[#27272A] mb-3">
                    <span className="text-xs font-bold text-[#09090B] dark:text-[#FAFAFA]">
                      Select Your Area
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowLocationPicker(false)}
                      className="text-[#71717A] hover:text-[#09090B] dark:hover:text-[#FAFAFA] cursor-pointer"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  {/* GPS Auto-Detect */}
                  <button
                    type="button"
                    onClick={handleGps}
                    disabled={gpsLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-neutral-200 dark:border-neutral-800 bg-zinc-50 dark:bg-[#1E1F24] py-2 text-xs font-semibold text-[#09090B] dark:text-[#FAFAFA] transition hover:bg-zinc-100 dark:hover:bg-[#27272A] cursor-pointer disabled:opacity-60 mb-3"
                  >
                    <Navigation
                      size={13}
                      className={
                        gpsLoading ? "animate-spin text-current" : "text-current"
                      }
                    />
                    <span>
                      {gpsLoading
                        ? "Detecting location..."
                        : "Use Current GPS Location"}
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
                    <div className="flex items-center rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0D0D10] px-3 py-2 focus-within:border-neutral-500 transition">
                      <MapPin
                        size={14}
                        className="text-[#71717A] dark:text-[#A1A1AA] mr-2 shrink-0"
                      />
                      <input
                        type="text"
                        value={customLocationInput}
                        onChange={(e) => setCustomLocationInput(e.target.value)}
                        placeholder="e.g. Indiranagar, Koramangala, Whitefield"
                        className="w-full bg-transparent text-xs text-[#09090B] dark:text-[#FAFAFA] outline-none placeholder:text-[#A1A1AA] dark:placeholder:text-[#71717A]"
                        autoFocus
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="submit"
                        className="flex-1 rounded-full bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 py-2 text-xs font-semibold transition cursor-pointer shadow-xs"
                      >
                        Apply Area
                      </button>
                      {location && (
                        <button
                          type="button"
                          onClick={() => handleApplyLocation("")}
                          className="rounded-full border border-neutral-200 dark:border-neutral-800 px-3.5 py-2 text-xs font-medium text-[#71717A] dark:text-[#A1A1AA] hover:text-[#09090B] dark:hover:text-white cursor-pointer"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>

          {/* Center: Desktop Search Input (Clean & Sleek) */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex flex-1 max-w-md min-w-0"
          >
            <div className="relative flex items-center w-full">
              <Search
                size={14}
                className="absolute left-3.5 text-[#71717A] dark:text-[#A1A1AA] pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search electricians, plumbers, carpenters..."
                className="h-9.5 w-full rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-[#141416] pl-9.5 pr-8 text-xs font-normal text-[#09090B] dark:text-[#FAFAFA] placeholder:text-[#71717A] dark:placeholder:text-[#A1A1AA] outline-none transition focus:bg-white dark:focus:bg-[#0D0D10] focus:border-neutral-400 dark:focus:border-neutral-600 focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 text-[#71717A] hover:text-[#09090B] dark:hover:text-white cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </form>

          {/* Right: Actions & Profile */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1 text-xs font-semibold text-[#52525B] dark:text-[#A1A1AA]">
              <Link
                to="/saved"
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 transition hover:bg-neutral-100 dark:hover:bg-[#1E1F24] hover:text-[#09090B] dark:hover:text-white"
              >
                <Heart size={14} />
                <span>Saved</span>
              </Link>
              <Link
                to="/inbox"
                className="relative flex items-center gap-1.5 rounded-full px-3 py-1.5 transition hover:bg-neutral-100 dark:hover:bg-[#1E1F24] hover:text-[#09090B] dark:hover:text-white"
              >
                <Clock size={14} />
                <span>Inbox</span>
                {dueCount > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-extrabold text-white shadow-xs">
                    {dueCount > 9 ? "9+" : dueCount}
                  </span>
                )}
              </Link>
            </nav>

            {/* Quick Post Need Action (Desktop) */}
            <button
              type="button"
              onClick={() => setPostNeedOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 px-3.5 py-1.5 text-xs font-semibold shadow-2xs active:scale-95 transition cursor-pointer shrink-0"
            >
              <Sparkles size={13} />
              <span>Post a Need</span>
            </button>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* User Profile or Sign In */}
            {!session ? (
              <Link
                to="/login"
                state={{ from: "main" }}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-black/10 dark:border-white/15 bg-black text-white dark:bg-white dark:text-black px-3.5 py-1.5 text-xs font-bold transition hover:opacity-90 shadow-2xs"
              >
                Sign In
              </Link>
            ) : (
              <Link
                to="/profile"
                aria-label="Profile Settings"
                title="Profile Settings"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#141416] text-[#09090B] dark:text-[#FAFAFA] transition hover:border-neutral-400 dark:hover:border-neutral-500 shadow-2xs"
              >
                <UserRound size={15} />
              </Link>
            )}

            {/* Mobile / Tablet Menu */}
            <div className="md:hidden">
              <MobileMenu />
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT — Clean max-w-5xl Desktop Canvas */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 sm:px-6 pt-6 sm:pt-8 space-y-8 sm:space-y-10">

        {/* HERO INTRO BAR (Desktop & Mobile) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E4E4E7] dark:border-[#27272A]">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1.5">
              <CheckCircle2 size={13} />
              <span>Zero Broker Markup · Direct Connection</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#09090B] dark:text-[#FAFAFA]">
              Find trusted neighborhood pros
            </h1>
            <p className="text-xs sm:text-sm text-[#71717A] dark:text-[#A1A1AA] mt-1 font-normal leading-relaxed">
              Verified background credentials, customer feedback, and instant WhatsApp / phone calling.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to="/join"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#D4D4D8] dark:border-[#3F3F46] bg-white dark:bg-[#141416] px-4 py-2 text-xs font-semibold text-[#09090B] dark:text-[#FAFAFA] hover:bg-zinc-50 dark:hover:bg-zinc-800 transition shadow-2xs"
            >
              <span>Join as Worker</span>
            </Link>
            <button
              type="button"
              onClick={() => setPostNeedOpen(true)}
              className="inline-flex sm:hidden items-center gap-1.5 rounded-full bg-[#09090B] text-white hover:bg-neutral-800 dark:bg-white dark:text-[#09090B] px-4 py-2 text-xs font-semibold shadow-xs transition"
            >
              <Sparkles size={13} />
              <span>Post Need</span>
            </button>
          </div>
        </div>

        {/* 1. "VERIFIED PROS NEAR YOU" SECTION */}
        <section aria-labelledby="verified-pros-heading">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 px-0.5">
            <div>
              <div className="flex items-center gap-2.5">
                <h2
                  id="verified-pros-heading"
                  className="text-lg sm:text-xl font-bold tracking-tight text-[#09090B] dark:text-[#FAFAFA]"
                >
                  Verified pros near you
                </h2>
                {location && (
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-zinc-100 dark:bg-white/10 px-2.5 py-0.5 text-xs font-medium text-[#52525B] dark:text-[#D4D4D8]">
                    <MapPin size={11} className="text-neutral-500" />
                    <span>{location}</span>
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-[#71717A] dark:text-[#A1A1AA] mt-0.5 font-normal">
                Top-rated background-checked specialists ready for direct booking
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGps}
                disabled={gpsLoading}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#D4D4D8] dark:border-[#3F3F46] bg-white dark:bg-[#141416] px-3 py-1 text-xs font-medium text-[#52525B] dark:text-[#A1A1AA] hover:text-[#09090B] dark:hover:text-white hover:border-neutral-500 transition shadow-2xs cursor-pointer"
                title="Refresh location via GPS"
              >
                <Navigation size={12} className={gpsLoading ? "animate-spin text-current" : "text-current"} />
                <span>{gpsLoading ? "Locating..." : "Refresh GPS"}</span>
              </button>

              <Link
                to={
                  location
                    ? `/search?location=${encodeURIComponent(location)}`
                    : "/search"
                }
                className="text-xs sm:text-sm font-semibold text-[#09090B] dark:text-[#FAFAFA] hover:underline inline-flex items-center gap-0.5 transition"
              >
                <span>View all</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>

          {!isExactLocationMatch && location && displayPros.length > 0 && (
            <div className="mb-4 flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/5 px-3.5 py-2.5 text-xs text-[#52525B] dark:text-[#A1A1AA]">
              <span>
                No pros registered strictly inside <strong>{location}</strong> yet. Showing top verified professionals nearby:
              </span>
              <button
                type="button"
                onClick={handleGps}
                disabled={gpsLoading}
                className="ml-2 shrink-0 text-xs font-bold text-[#09090B] dark:text-white underline cursor-pointer"
              >
                Re-check GPS
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex md:grid md:grid-cols-3 gap-4 md:gap-5 overflow-x-auto pb-2 scrollbar-none snap-x -mx-4 px-4 sm:mx-0 sm:px-0 md:mx-0 md:px-0">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-[240px] sm:w-[260px] md:w-full shrink-0 rounded-2xl border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] p-4 shadow-sm animate-pulse space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-xl bg-zinc-100 dark:bg-zinc-800" />
                      <div className="space-y-1.5">
                        <div className="h-4 w-24 rounded bg-zinc-100 dark:bg-zinc-800" />
                        <div className="h-3 w-16 rounded bg-zinc-100 dark:bg-zinc-800" />
                      </div>
                    </div>
                    <div className="h-6 w-12 rounded bg-zinc-100 dark:bg-zinc-800" />
                  </div>
                  <div className="h-3 w-full rounded bg-zinc-100 dark:bg-zinc-800" />
                  <div className="flex gap-2 pt-2 border-t border-[#E4E4E7] dark:border-[#27272A]">
                    <div className="h-7 flex-1 rounded bg-zinc-100 dark:bg-zinc-800" />
                    <div className="h-7 flex-1 rounded bg-zinc-100 dark:bg-zinc-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : displayPros.length > 0 ? (
            <div className="flex md:grid md:grid-cols-3 gap-4 md:gap-5 overflow-x-auto md:overflow-visible pb-2 md:pb-0 scrollbar-none snap-x snap-mandatory md:snap-none -mx-4 px-4 sm:mx-0 sm:px-0 md:mx-0 md:px-0 md:[&>article]:w-full md:[&>article]:max-w-none">
              {displayPros.map((worker) => (
                <TrustStripWorkerCard key={worker.id} worker={worker} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] p-8 text-center shadow-xs">
              <p className="text-sm font-normal text-[#71717A] dark:text-[#A1A1AA]">
                No verified professionals found near{" "}
                <span className="font-semibold text-[#09090B] dark:text-white">
                  {location || "your area"}
                </span>
                .
              </p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleGps}
                  disabled={gpsLoading}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#D4D4D8] dark:border-[#3F3F46] bg-white dark:bg-[#141416] px-4 py-2 text-xs font-semibold text-[#09090B] dark:text-[#FAFAFA] hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer shadow-xs"
                >
                  <Navigation
                    size={13}
                    className={gpsLoading ? "animate-spin" : ""}
                  />
                  <span>Check GPS</span>
                </button>
                <Link
                  to="/search"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#09090B] text-white hover:bg-neutral-800 dark:bg-white dark:text-[#09090B] dark:hover:bg-neutral-200 px-4.5 py-2 text-xs font-semibold shadow-xs"
                >
                  <span>Browse all workers</span>
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* 2. "EXPLORE BY CATEGORY" SECTION */}
        <section aria-labelledby="categories-heading">
          <div className="flex items-center justify-between mb-4 px-0.5">
            <div>
              <h2
                id="categories-heading"
                className="text-lg sm:text-xl font-bold tracking-tight text-[#09090B] dark:text-[#FAFAFA]"
              >
                Explore by trade category
              </h2>
              <p className="text-xs sm:text-sm text-[#71717A] dark:text-[#A1A1AA] mt-0.5 font-normal">
                Choose a specialized service to find available neighborhood technicians
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4">
            {categories.map(({ name, icon: Icon, countText }) => (
              <button
                key={name}
                type="button"
                onClick={() => handleCategoryClick(name)}
                className="group flex items-start sm:items-center gap-3.5 rounded-2xl border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] p-4 sm:p-4.5 text-left shadow-2xs transition-all hover:border-neutral-500 hover:shadow-xs active:scale-[0.99] cursor-pointer"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-white/5 text-[#09090B] dark:text-[#FAFAFA] transition group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black border border-black/[0.04] dark:border-white/[0.06]">
                  <Icon size={19} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm sm:text-base font-semibold text-[#09090B] dark:text-[#FAFAFA] group-hover:text-black dark:group-hover:text-white transition-colors">
                    {name}
                  </span>
                  <span className="text-xs text-[#71717A] dark:text-[#A1A1AA] line-clamp-1 mt-0.5 font-normal">
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

      {/* Post a Need Modal */}
      <PostNeedModal
        isOpen={postNeedOpen}
        onClose={() => setPostNeedOpen(false)}
        initialLocation={location}
      />
    </div>
  );
}
