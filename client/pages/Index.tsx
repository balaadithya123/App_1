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
  { name: "Materials & Suppliers", icon: Package, countText: "Sand, stone, cement, tools & rentals" },
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

      const aRating = Number(a.avg_rating || a.rating || 0);
      const bRating = Number(b.avg_rating || b.rating || 0);
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
    if (categoryName === "Materials & Suppliers") {
      navigate("/materials");
      return;
    }
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

      {/* MOBILE APP HOME — premium editorial layout */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6 lg:px-8 pt-5 sm:pt-7 pb-8 space-y-8 sm:space-y-10">
        <section className="relative overflow-hidden rounded-[30px] bg-[#FFF1E8] dark:bg-[#241A17] px-5 sm:px-8 pt-7 sm:pt-10 pb-6 sm:pb-8">
          <div className="pointer-events-none absolute -right-10 -top-8 h-64 w-64 rounded-full border-[24px] border-[#F8D8C7]/70 dark:border-[#5A3025]/50" />
          <div className="pointer-events-none absolute right-5 bottom-0 text-[#E9B49B]/60 dark:text-[#8A5140]/40"><Building2 size={150} strokeWidth={0.7} /></div>
          <div className="relative z-10 max-w-xl">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#C84A2D]">BUILDERCO • HOME SERVICES</p>
            <h1 className="max-w-[520px] text-[34px] sm:text-5xl font-bold leading-[1.06] tracking-[-0.045em] text-[#17191E] dark:text-[#FFF8F4]">The right people.<br /><span className="text-[#F05A36]">The right help.</span></h1>
            <p className="mt-3 max-w-sm text-sm sm:text-base leading-relaxed text-[#5F5551] dark:text-[#D9C5BC]">Find trusted professionals for every job, right around you.</p>
          </div>
          <form onSubmit={handleSearchSubmit} className="relative z-10 mt-6 flex items-center gap-2 rounded-full border border-[#E8DAD2] dark:border-white/10 bg-white dark:bg-[#171719] p-1.5 pl-4 shadow-[0_12px_30px_rgba(115,65,43,0.12)]">
            <Search size={19} className="shrink-0 text-[#81756F]" />
            <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search for services..." aria-label="Search for services" className="min-w-0 flex-1 bg-transparent py-2 text-sm text-[#17191E] dark:text-white outline-none placeholder:text-[#958A84]" />
            <button type="submit" aria-label="Search" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F4512C] text-white transition hover:bg-[#D94322] active:scale-95"><ChevronRight size={23} /></button>
          </form>
        </section>
        <section aria-labelledby="categories-heading">
          <div className="mb-4 flex items-end justify-between">
            <div><h2 id="categories-heading" className="text-xl sm:text-2xl font-bold tracking-tight text-[#17191E] dark:text-white">Explore services</h2><p className="mt-1 text-xs sm:text-sm text-[#77716D] dark:text-[#A1A1AA]">Choose what you need help with</p></div>
            <button type="button" onClick={() => handleCategoryClick("All Services")} className="inline-flex items-center gap-1 text-sm font-semibold text-[#E94F2B]">View all <ChevronRight size={16} /></button>
          </div>
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
            {categories.filter(({name})=>name!=="Materials & Suppliers").map(({name,icon:Icon})=>(
              <button key={name} type="button" onClick={()=>handleCategoryClick(name)} className="group flex min-h-[112px] flex-col items-center justify-center gap-3 rounded-[22px] border border-[#F0E2DA] dark:border-[#342A27] bg-[#FFF9F5] dark:bg-[#171719] px-2 py-4 text-center shadow-[0_3px_10px_rgba(67,44,32,0.035)] transition hover:-translate-y-0.5 hover:border-[#F4A58E] hover:bg-[#FFF1E8] dark:hover:bg-[#241A17]">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FCE4D8] dark:bg-[#42251D] text-[#F05A36]"><Icon size={21} strokeWidth={2.1}/></span>
                <span className="text-xs sm:text-sm font-semibold text-[#262326] dark:text-[#F4EEEA]">{name==="All Services"?"More":name==="Painter"?"Painting":name==="Cleaner"?"Cleaning":name}</span>
              </button>
            ))}
          </div>
        </section>
        <section aria-labelledby="verified-pros-heading">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div><h2 id="verified-pros-heading" className="text-xl sm:text-2xl font-bold tracking-tight text-[#17191E] dark:text-white">Professionals near you</h2><p className="mt-1 text-xs sm:text-sm text-[#77716D] dark:text-[#A1A1AA]">Real profiles from registered service providers</p></div>
            <Link to={location? `/search?location=${encodeURIComponent(location)}`:"/search"} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[#E94F2B]">See all <ChevronRight size={16}/></Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{[1,2,3].map(i=><div key={i} className="h-36 animate-pulse rounded-[22px] bg-[#F4ECE7] dark:bg-[#1C1C20]"/>)}</div>
          ) : displayPros.length>0 ? (
            <>
              {!isExactLocationMatch && location && <p className="mb-3 rounded-xl bg-[#FFF4E8] dark:bg-[#302319] px-3 py-2 text-xs text-[#8A5A36] dark:text-[#E7BE93]">No professionals registered in {location} yet. Showing other verified profiles nearby.</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">{displayPros.map(worker=><TrustStripWorkerCard key={worker.id} worker={worker}/>)}</div>
            </>
          ) : (
            <div className="rounded-[24px] border border-[#F0E2DA] dark:border-[#342A27] bg-[#FFF9F5] dark:bg-[#171719] px-5 py-8 text-center">
              <ShieldCheck size={28} className="mx-auto mb-3 text-[#E95A37]"/>
              <h3 className="text-base font-semibold text-[#262326] dark:text-white">No professionals listed yet</h3>
              <p className="mx-auto mt-1 max-w-xs text-sm text-[#77716D] dark:text-[#A1A1AA]">New registered professionals will appear here when they join your area.</p>
              <Link to="/search" className="mt-4 inline-flex rounded-full bg-[#F4512C] px-5 py-2.5 text-sm font-semibold text-white">Browse services</Link>
            </div>
          )}
        </section>
        <Link to="/materials" className="flex items-center justify-between gap-4 overflow-hidden rounded-[24px] bg-[#202124] px-5 py-5 text-white">
          <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F4512C]"><ShieldCheck size={23}/></span><div><p className="font-semibold">Trusted & verified professionals</p><p className="mt-0.5 text-xs text-white/65">Quality help for your home and projects</p></div></div>
          <ChevronRight size={20} className="shrink-0 text-white/70"/>
        </Link>
      </main>
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
