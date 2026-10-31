import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import BrandLogo from "@/components/BrandLogo";
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
  Package,
  IndianRupee,
} from "lucide-react";
import type { Worker } from "@shared/workers";
import type { WorkersResponse } from "@shared/api";
import { logAnalyticsEvent } from "@/lib/analytics";
import TrustStripWorkerCard from "@/components/TrustStripWorkerCard";
import NavBar from "@/components/NavBar";
import { getCategoryMeta } from "@/components/materials/categoryMeta";
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
    return { displayPros: [], isExactLocationMatch: false };
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
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#09090B] text-[#141518] dark:text-[#FAFAFA] flex flex-col selection:bg-[#F7C7B7] dark:selection:bg-neutral-800 pb-28 lg:pb-10 font-sans">
      {/* TOP HEADER — Clean, Polished Translucent Header */}
      <header className="sticky top-0 z-40 w-full border-b border-[#E8E2D9] dark:border-[#27272A] bg-[#FAF8F5]/90 dark:bg-[#09090B]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between gap-3 lg:gap-6 px-4 sm:px-6 lg:px-8 relative">
          {/* Left: Brand Logo & Location Chip */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <Link
              to="/home"
              className="flex items-center gap-2.5 shrink-0 group"
              aria-label="Builderco Home"
            >
              <BrandLogo className="h-7 w-auto transition-transform group-hover:scale-105" />
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

                  {/* Popular Localities Quick Select */}
                  <div className="mb-3">
                    <p className="text-[11px] font-semibold text-[#71717A] dark:text-[#A1A1AA] mb-1.5 uppercase tracking-wider">
                      Popular Localities
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "Indiranagar",
                        "Koramangala",
                        "HSR Layout",
                        "Whitefield",
                        "Jayanagar",
                        "Coimbatore",
                      ].map((locName) => (
                        <button
                          key={locName}
                          type="button"
                          onClick={() => handleApplyLocation(locName)}
                          className="rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#1B1B1F] hover:bg-neutral-100 dark:hover:bg-[#26262B] px-2.5 py-1 text-[11px] font-medium text-[#09090B] dark:text-[#FAFAFA] transition cursor-pointer"
                        >
                          {locName}
                        </button>
                      ))}
                    </div>
                  </div>

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

          {/* Right: Actions & Profile */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Desktop navigation stays in the header; mobile uses the floating dock below. */}
            <nav aria-label="Primary navigation" className="hidden lg:flex items-center gap-1 text-[13px] font-semibold text-[#5A5D64] dark:text-[#A1A1AA]">
              <Link to="/home" aria-current={routerLocation.pathname === "/home" || routerLocation.pathname === "/app" ? "page" : undefined} className={routerLocation.pathname === "/home" || routerLocation.pathname === "/app" ? "rounded-full bg-[#FCE4D8] px-3.5 py-2 text-[#C94725] dark:bg-[#42251D] dark:text-[#FF9A79]" : "rounded-full px-3.5 py-2 transition hover:bg-[#F4EFEA] hover:text-[#141518] dark:hover:bg-white/10 dark:hover:text-white"}>Home</Link>
              <Link to="/search" aria-current={routerLocation.pathname === "/search" ? "page" : undefined} className={routerLocation.pathname === "/search" ? "rounded-full bg-[#FCE4D8] px-3.5 py-2 text-[#C94725] dark:bg-[#42251D] dark:text-[#FF9A79]" : "rounded-full px-3.5 py-2 transition hover:bg-[#F4EFEA] hover:text-[#141518] dark:hover:bg-white/10 dark:hover:text-white"}>Search</Link>
              <Link to="/saved" aria-current={routerLocation.pathname === "/saved" ? "page" : undefined} className={routerLocation.pathname === "/saved" ? "rounded-full bg-[#FCE4D8] px-3.5 py-2 text-[#C94725] dark:bg-[#42251D] dark:text-[#FF9A79]" : "rounded-full px-3.5 py-2 transition hover:bg-[#F4EFEA] hover:text-[#141518] dark:hover:bg-white/10 dark:hover:text-white"}>Saved</Link>
              <Link to="/inbox" aria-current={routerLocation.pathname === "/inbox" ? "page" : undefined} className="relative rounded-full px-3.5 py-2 transition hover:bg-[#F4EFEA] hover:text-[#141518] dark:hover:bg-white/10 dark:hover:text-white">
                Inbox
                {dueCount > 0 && <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#DE542C] px-1 text-[10px] font-bold text-white">{dueCount > 9 ? "9+" : dueCount}</span>}
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
            <div className="lg:hidden">
              <MobileMenu />
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT — Clean max-w-5xl Desktop Canvas */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 lg:px-8 pt-5 sm:pt-8 pb-10 space-y-10 sm:space-y-14">
        {/* Editorial hero */}
        <section className="relative isolate overflow-hidden rounded-[30px] sm:rounded-[36px] border border-[#EAD9CD] bg-[#F3E5DA] dark:border-[#3B2D28] dark:bg-[#211B19] min-h-[390px] sm:min-h-[430px]">
          <div className="absolute inset-0 bg-gradient-to-br from-[#FBF3EC] via-[#F5E8DE] to-[#EED5C5] dark:from-[#241D1A] dark:via-[#211B19] dark:to-[#34231E]" />
          <div className="absolute right-[-8%] bottom-0 h-[82%] w-[70%] sm:w-[58%] opacity-75 dark:opacity-45" aria-hidden="true">
            <svg viewBox="0 0 620 430" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M70 430V204L280 58L510 204V430H70Z" fill="#D8B9A3" opacity=".55"/>
              <path d="M105 430V218L280 94L475 218V430H105Z" fill="#F9F0E8" stroke="#B88F77" strokeWidth="5"/>
              <path d="M70 208L280 58L510 208" stroke="#9F7158" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M205 430V274C205 248 226 227 252 227H312C338 227 359 248 359 274V430" fill="#C99F83" stroke="#A87D63" strokeWidth="5"/>
              <path d="M137 252H190V309H137V252ZM375 252H435V309H375V252Z" fill="#A9B7B5" stroke="#9A7865" strokeWidth="5"/>
              <path d="M164 252V309M137 280H190M405 252V309M375 280H435" stroke="#F8EEE6" strokeWidth="4"/>
              <path d="M30 430C36 374 49 340 76 315C103 339 115 376 119 430" fill="#87947C"/>
              <path d="M10 430C14 386 22 357 45 333C68 357 75 389 78 430" fill="#A4AE91"/>
              <path d="M485 430C490 365 516 324 548 298C580 324 603 368 610 430" fill="#7C8B72"/>
              <path d="M510 430C514 382 530 351 550 333C570 351 587 386 591 430" fill="#9EAA8C"/>
              <circle cx="505" cy="88" r="43" fill="#F7D7B9" opacity=".7"/>
              <path d="M0 430H620" stroke="#B88F77" strokeWidth="5"/>
            </svg>
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#FBF3EC] via-[#FBF3EC]/95 to-transparent dark:from-[#241D1A] dark:via-[#241D1A]/90 dark:to-transparent" />
          <div className="relative z-10 flex min-h-[390px] sm:min-h-[430px] max-w-2xl flex-col justify-center px-5 py-9 sm:px-10 sm:py-12">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#E6CDBD] bg-white/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#A34A31] dark:border-[#684234] dark:bg-black/20 dark:text-[#F6A184]">
              <ShieldCheck size={13} /> Local help, built on trust
            </span>
            <h1 className="mt-5 max-w-xl text-[clamp(2.5rem,7vw,4.8rem)] font-bold leading-[1.02] tracking-[-0.055em] text-[#17191D] dark:text-[#FFF8F2]">
              The right people.
              <span className="block text-[#DE542C]">The right help.</span>
            </h1>
            <p className="mt-4 max-w-md text-sm sm:text-base leading-relaxed text-[#5A5D64] dark:text-[#D4C6BD]">
              Find trusted local professionals for every job, without the middleman.
            </p>
            <form onSubmit={handleSearchSubmit} className="mt-7 flex w-full max-w-[560px] items-center gap-2 rounded-full border border-[#E9D9CF] bg-white/95 p-1.5 pl-4 shadow-[0_12px_34px_rgba(76,48,31,0.12)] dark:border-white/10 dark:bg-[#171719]/95">
              <Search size={19} className="shrink-0 text-[#8B817B]" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="What do you need help with?"
                aria-label="Search services"
                className="h-11 min-w-0 flex-1 bg-transparent text-sm text-[#141518] outline-none placeholder:text-[#938A84] dark:text-white"
              />
              <button type="submit" aria-label="Search" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F4512C] text-white shadow-sm transition hover:bg-[#D94423] active:scale-95">
                <ChevronRight size={22} />
              </button>
            </form>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-semibold text-[#6E625B] dark:text-[#D4C6BD]">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} className="text-[#DE542C]" /> Verified local trades</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} className="text-[#DE542C]" /> Direct contact</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} className="text-[#DE542C]" /> Zero commission</span>
            </div>
          </div>
        </section>

        {/* Service discovery */}
        <section aria-labelledby="categories-heading">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#DE542C]">Find your specialist</p>
              <h2 id="categories-heading" className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-[#17191D] dark:text-white">Explore services</h2>
            </div>
            <Link to="/search" className="mb-1 inline-flex items-center gap-1 text-sm font-semibold text-[#DE542C] hover:text-[#B83D20]">View all <ChevronRight size={17} /></Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {categories.map(({ name, icon: Icon, countText }) => (
              <button key={name} type="button" onClick={() => handleCategoryClick(name)} className="group flex min-h-[126px] flex-col items-start justify-between rounded-[22px] border border-[#EDE0D7] bg-white/80 p-4 text-left shadow-[0_4px_14px_rgba(66,43,30,0.035)] transition hover:-translate-y-0.5 hover:border-[#E8B9A5] hover:bg-white hover:shadow-[0_12px_24px_rgba(66,43,30,0.08)] dark:border-white/10 dark:bg-[#171719] dark:hover:bg-[#211B19]">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FFF0E8] text-[#E6532D] dark:bg-[#42251D] dark:text-[#FF9A79]"><Icon size={20} strokeWidth={2.1} /></span>
                <span>
                  <span className="block text-sm font-bold text-[#17191D] dark:text-white">{name}</span>
                  <span className="mt-1 block text-[10px] leading-snug text-[#8A817B] dark:text-[#A1A1AA] line-clamp-2">{countText}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Only real professionals returned by the workers API are shown. */}
        <section aria-labelledby="verified-pros-heading">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#DE542C]">Registered in your area</p>
              <h2 id="verified-pros-heading" className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-[#17191D] dark:text-white">Professionals near you</h2>
              <p className="mt-1 text-sm text-[#7A716B] dark:text-[#A1A1AA]">{location ? "Showing registered professionals for " + location : "Showing registered local professionals"}</p>
            </div>
            <button type="button" onClick={handleGps} disabled={gpsLoading} className="inline-flex items-center gap-2 rounded-full border border-[#E7D9D0] bg-white/80 px-4 py-2 text-xs font-semibold text-[#625A55] transition hover:border-[#DE542C] hover:text-[#DE542C] dark:border-white/10 dark:bg-[#171719] dark:text-[#D4D4D8]">
              <Navigation size={14} className={gpsLoading ? "animate-spin" : ""} /> {gpsLoading ? "Locating…" : "Refresh location"}
            </button>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => <div key={i} className="h-44 animate-pulse rounded-[22px] border border-[#EDE0D7] bg-white/80 dark:border-white/10 dark:bg-[#171719]" />)}
            </div>
          ) : displayPros.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {displayPros.map((worker) => <TrustStripWorkerCard key={worker.id} worker={worker} />)}
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-[#DCC9BC] bg-white/65 px-6 py-10 text-center dark:border-white/15 dark:bg-[#171719]">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF0E8] text-[#DE542C] dark:bg-[#42251D]"><ShieldCheck size={22} /></span>
              <h3 className="mt-4 text-base font-bold text-[#17191D] dark:text-white">No registered professionals here yet</h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-[#7A716B] dark:text-[#A1A1AA]">We only show real registered profiles. Try another area or browse all services.</p>
              <Link to="/search" className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#DE542C] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#C84725]">Browse professionals <ChevronRight size={15} /></Link>
            </div>
          )}
        </section>

        {/* Trust statement */}
        <section className="relative overflow-hidden rounded-[26px] bg-[#17191D] px-5 py-7 text-white sm:px-8 sm:py-8">
          <div className="absolute -right-8 -top-16 h-56 w-56 rounded-full border border-white/10" />
          <div className="absolute -right-1 top-[-4.5rem] h-56 w-56 rounded-full border border-[#DE542C]/35" />
          <div className="relative flex items-center gap-4 sm:gap-6">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#DE542C] text-white"><ShieldCheck size={27} /></span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#F39A7D]">Built around trust</p>
              <h2 className="mt-1 text-lg sm:text-2xl font-bold">Trusted & verified professionals</h2>
              <p className="mt-1 text-xs sm:text-sm text-white/65">Clear profiles. Direct contact. No broker commission.</p>
            </div>
          </div>
        </section>

        {/* Useful links */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to="/rate-guide" className="group flex items-center gap-4 rounded-[22px] border border-[#EDE0D7] bg-white/80 p-5 transition hover:border-[#E8B9A5] hover:bg-white dark:border-white/10 dark:bg-[#171719]">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FFF0E8] text-[#DE542C] dark:bg-[#42251D]"><IndianRupee size={21} /></span>
            <span className="min-w-0 flex-1"><span className="block font-bold text-[#17191D] dark:text-white">Fair rate guide</span><span className="mt-1 block text-xs text-[#7A716B] dark:text-[#A1A1AA]">Know typical job costs before you call</span></span>
            <ChevronRight size={19} className="text-[#9B8C82] transition group-hover:translate-x-1 group-hover:text-[#DE542C]" />
          </Link>
          <Link to="/materials" className="group flex items-center gap-4 rounded-[22px] border border-[#EDE0D7] bg-white/80 p-5 transition hover:border-[#E8B9A5] hover:bg-white dark:border-white/10 dark:bg-[#171719]">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FFF0E8] text-[#DE542C] dark:bg-[#42251D]"><Package size={21} /></span>
            <span className="min-w-0 flex-1"><span className="block font-bold text-[#17191D] dark:text-white">Materials & suppliers</span><span className="mt-1 block text-xs text-[#7A716B] dark:text-[#A1A1AA]">Source materials and rentals from local suppliers</span></span>
            <ChevronRight size={19} className="text-[#9B8C82] transition group-hover:translate-x-1 group-hover:text-[#DE542C]" />
          </Link>
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
