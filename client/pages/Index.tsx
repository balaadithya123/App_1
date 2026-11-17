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
  ShieldCheck,
  CheckCircle2,
  Package,
  IndianRupee,
  ArrowRight,
  Mic,
} from "lucide-react";
import type { Worker } from "@shared/workers";
import type { WorkersResponse } from "@shared/api";
import { logAnalyticsEvent } from "@/lib/analytics";
import TrustStripWorkerCard from "@/components/TrustStripWorkerCard";
import { WorkerCardSkeleton } from "@/components/PageSkeletons";
import NavBar from "@/components/NavBar";
import PostNeedModal from "@/components/PostNeedModal";
import TopBar from "@/components/TopBar";
import { useLanguage } from "@/lib/i18n";
import { useVoiceAssistant } from "@/lib/voice-assistant-context";
import {
  getStandardLocation,
  setStandardLocation,
  detectGpsLocation,
  isLocationMatch,
} from "@/lib/location";
import { supabase } from "@/lib/supabase";

const categories = [
  {
    name: "Electrician",
    icon: Zap,
    countText: "Wiring, switchboards, inverter & fan repairs",
  },
  {
    name: "Plumber",
    icon: Wrench,
    countText: "Pipes, leakage, taps, geyser & motors",
  },
  {
    name: "Carpenter",
    icon: Hammer,
    countText: "Furniture assembly, door lock & wood repair",
  },
  {
    name: "Painter",
    icon: Paintbrush,
    countText: "Interior wall, exterior & waterproofing",
  },
  {
    name: "Cleaner",
    icon: Brush,
    countText: "Deep cleaning, kitchen, sofa & bathroom",
  },
  {
    name: "All Services",
    icon: ChevronRight,
    countText: "Browse all verified trade specialists",
  },
];

export default function Index() {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const { t, translateCategory } = useLanguage();
  const { openCall } = useVoiceAssistant();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState(() => getStandardLocation());
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [customLocationInput, setCustomLocationInput] = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [postNeedOpen, setPostNeedOpen] = useState(false);
  const [postNeedInitialCategory, setPostNeedInitialCategory] = useState<string | undefined>(undefined);
  const locationPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const state = routerLocation.state as any;
    if (state?.openPostNeed) {
      if (state.initialCategory) setPostNeedInitialCategory(state.initialCategory);
      setPostNeedOpen(true);
    }
  }, [routerLocation.state]);

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
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#0B0A09] text-[#141210] dark:text-[#FAFAFA] flex flex-col selection:bg-[#F4512C]/20 pb-24 font-sans">
      <TopBar onPostNeed={() => setPostNeedOpen(true)} />

      {/* MAIN CONTENT */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-12 sm:space-y-14">
        {/* 1. HERO BANNER CARD */}
        <section
          aria-label="Find local professionals"
          className="relative overflow-hidden rounded-[28px] border border-[#EEDFD6] dark:border-white/10 bg-gradient-to-br from-[#FFF6F2] via-[#FAF1EB] to-[#F3E5DC] dark:from-[#261B16] dark:via-[#1C1512] dark:to-[#15110F] p-7 sm:p-11 lg:p-14"
        >
          {/* Minimalist Architectural Home Illustration (Right Background) */}
          <svg
            aria-hidden="true"
            viewBox="0 0 520 420"
            fill="none"
            className="pointer-events-none select-none hidden md:block absolute right-0 bottom-0 h-full w-auto opacity-80 dark:opacity-100"
          >
            {/* Sun / Moon Circle */}
            <circle
              cx="450"
              cy="92"
              r="34"
              className="fill-[#E9D7CC] dark:fill-[#493D37]"
            />
            {/* House Body */}
            <path
              d="M110 210L275 88L440 210V420H110V210Z"
              className="fill-[#E7D8CE] dark:fill-[#443B37]"
            />
            {/* Roof Overhang */}
            <path
              d="M92 216L275 80L458 216"
              strokeWidth="12"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="stroke-[#D5C0B3] dark:stroke-[#594A42]"
            />
            {/* Arched Doorway */}
            <path
              d="M210 420V296C210 264 236 240 275 240C314 240 340 264 340 296V420H210Z"
              className="fill-[#D6C2B6] dark:fill-[#54463E]"
            />
            {/* Left Window */}
            <rect
              x="140"
              y="246"
              width="48"
              height="48"
              rx="4"
              className="fill-[#F3E7E0] dark:fill-[#393330]"
            />
            <line
              x1="164"
              y1="246"
              x2="164"
              y2="294"
              strokeWidth="2"
              className="stroke-[#D6C2B6] dark:stroke-[#54463E]"
            />
            <line
              x1="140"
              y1="270"
              x2="188"
              y2="270"
              strokeWidth="2"
              className="stroke-[#D6C2B6] dark:stroke-[#54463E]"
            />
            {/* Right Window */}
            <rect
              x="362"
              y="246"
              width="48"
              height="48"
              rx="4"
              className="fill-[#F3E7E0] dark:fill-[#393330]"
            />
            <line
              x1="386"
              y1="246"
              x2="386"
              y2="294"
              strokeWidth="2"
              className="stroke-[#D6C2B6] dark:stroke-[#54463E]"
            />
            <line
              x1="362"
              y1="270"
              x2="410"
              y2="270"
              strokeWidth="2"
              className="stroke-[#D6C2B6] dark:stroke-[#54463E]"
            />
            {/* Left Foliage Bushes */}
            <path
              d="M24 420C24 365 56 320 92 320C128 320 156 365 156 420H24Z"
              className="fill-[#CAD5C0] dark:fill-[#3C4134]"
            />
            <path
              d="M84 420C84 378 106 346 132 346C158 346 180 378 180 420H84Z"
              className="fill-[#D4DFCA] dark:fill-[#494E3E]"
            />
            {/* Right Foliage Bushes */}
            <path
              d="M370 420C370 365 402 320 438 320C474 320 506 365 506 420H370Z"
              className="fill-[#CAD5C0] dark:fill-[#3C4134]"
            />
            <path
              d="M346 420C346 378 368 346 394 346C420 346 442 378 442 420H346Z"
              className="fill-[#D4DFCA] dark:fill-[#494E3E]"
            />
          </svg>

          {/* Left Column Content */}
          <div className="relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#F4512C]/30 bg-[#F4512C]/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#D84E2B] dark:text-[#EA7352]">
              <ShieldCheck size={13} />
              <span>{t("hero.badge")}</span>
            </div>

            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-[54px] font-extrabold tracking-tight leading-[1.06]">
              <span className="block text-[#141210] dark:text-white">
                {t("hero.titleLine1")}
              </span>
              <span className="block text-[#F4512C]">{t("hero.titleLine2")}</span>
            </h1>

            <p className="mt-4 text-sm sm:text-base text-[#6B645F] dark:text-[#A19994] max-w-md leading-relaxed">
              {t("hero.subtitle")}
            </p>

            {/* Hero Search & Area Selector Bar */}
            <div className="relative mt-7 max-w-2xl" ref={locationPickerRef}>
              <form
                onSubmit={handleSearchSubmit}
                className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-0 rounded-2xl sm:rounded-full border border-[#E2D6CE] dark:border-white/10 bg-white dark:bg-[#131211] p-1.5 pl-4 shadow-sm focus-within:border-[#F4512C]/60 transition"
              >
                <div className="flex flex-1 items-center min-w-[180px]">
                  <Search
                    size={16}
                    className="text-[#8C847E] dark:text-[#766F6A] shrink-0 mr-2.5"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("hero.searchPlaceholder")}
                    aria-label={t("hero.searchPlaceholder")}
                    className="flex-1 bg-transparent text-sm text-[#141210] dark:text-white placeholder:text-[#8C847E] dark:placeholder:text-[#766F6A] outline-none min-w-0 py-1.5 sm:py-0"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="mr-1.5 p-1 text-[#8C847E] hover:text-[#141210] dark:hover:text-white cursor-pointer"
                      aria-label="Clear search"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="hidden sm:block h-5 w-px bg-[#EAE2DC] dark:bg-white/10 mx-2 shrink-0" />

                <div className="flex w-full sm:w-auto items-center justify-between sm:justify-end gap-1.5 border-t border-[#EAE2DC]/70 dark:border-white/10 sm:border-t-0 pt-1.5 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomLocationInput(location);
                      setShowLocationPicker((prev) => !prev);
                    }}
                    aria-label={t("hero.selectArea")}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-[#141210] dark:text-[#FAFAFA] hover:bg-[#FAF8F5] dark:hover:bg-[#242220] transition cursor-pointer max-w-[175px]"
                  >
                    <MapPin size={13} className="text-[#F4512C] shrink-0" />
                    <span className="truncate">{location || t("hero.selectArea")}</span>
                    <ChevronDown
                      size={13}
                      className={`text-[#6B645F] dark:text-[#9E958F] shrink-0 transition-transform duration-200 ${
                        showLocationPicker ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => openCall(true)}
                    aria-label={t("hero.voiceCta")}
                    title={t("hero.voiceCta")}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#1E1C1A] text-[#F4512C] hover:border-[#F4512C]/60 transition active:scale-95 cursor-pointer"
                  >
                    <Mic size={15} />
                  </button>

                  <button
                    type="submit"
                    aria-label={t("nav.search")}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F4512C] hover:bg-[#E04320] text-white transition active:scale-95 cursor-pointer"
                  >
                    <ArrowRight size={17} />
                  </button>
                </div>
              </form>

              {showLocationPicker && (
                <div className="absolute right-0 sm:right-12 top-full mt-2 z-50 w-72 sm:w-80 rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#EAE2DC] dark:border-white/10 mb-3">
                    <span className="text-xs font-bold text-[#141210] dark:text-white">
                      {t("area.title")}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowLocationPicker(false)}
                      className="text-[#6B645F] hover:text-[#141210] dark:hover:text-white cursor-pointer"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleGps}
                    disabled={gpsLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] py-2 text-xs font-semibold text-[#141210] dark:text-white transition hover:border-[#F4512C]/50 cursor-pointer disabled:opacity-60 mb-3"
                  >
                    <Navigation
                      size={13}
                      className={gpsLoading ? "animate-spin text-[#F4512C]" : "text-[#F4512C]"}
                    />
                    <span>
                      {gpsLoading ? t("area.detecting") : t("area.useGps")}
                    </span>
                  </button>

                  <div className="mb-3">
                    <p className="text-[11px] font-semibold text-[#6B645F] dark:text-[#9E958F] mb-1.5 uppercase tracking-wider">
                      {t("area.popular")}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "Sriperumbudur",
                        "Indiranagar",
                        "Koramangala",
                        "HSR Layout",
                        "Whitefield",
                        "Coimbatore",
                      ].map((locName) => (
                        <button
                          key={locName}
                          type="button"
                          onClick={() => handleApplyLocation(locName)}
                          className="rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#242220] hover:border-[#F4512C]/50 px-2.5 py-1 text-[11px] font-medium text-[#141210] dark:text-[#FAFAFA] transition cursor-pointer"
                        >
                          {locName}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-center rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-3 py-2 focus-within:border-[#F4512C] transition">
                      <MapPin
                        size={14}
                        className="text-[#6B645F] dark:text-[#9E958F] mr-2 shrink-0"
                      />
                      <input
                        type="text"
                        value={customLocationInput}
                        onChange={(e) => setCustomLocationInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleApplyLocation(customLocationInput);
                          }
                        }}
                        placeholder={t("area.placeholder")}
                        className="w-full bg-transparent text-xs text-[#141210] dark:text-white outline-none placeholder:text-[#8C847E]"
                        autoFocus
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleApplyLocation(customLocationInput)}
                        className="flex-1 rounded-full bg-[#F4512C] hover:bg-[#E04320] text-white py-2 text-xs font-bold transition cursor-pointer"
                      >
                        {t("area.apply")}
                      </button>
                      {location && (
                        <button
                          type="button"
                          onClick={() => handleApplyLocation("")}
                          className="rounded-full border border-[#EAE2DC] dark:border-white/10 px-3.5 py-2 text-xs font-medium text-[#6B645F] dark:text-[#9E958F] hover:text-[#141210] dark:hover:text-white cursor-pointer"
                        >
                          {t("area.reset")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Trust Checkmarks */}
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-[#6B645F] dark:text-[#A19994]">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-[#F4512C]" />
                <span>{t("hero.trust1")}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-[#F4512C]" />
                <span>{t("hero.trust2")}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-[#F4512C]" />
                <span>{t("hero.trust3")}</span>
              </span>
            </div>
          </div>
        </section>

        {/* 2. EXPLORE SERVICES */}
        <section aria-labelledby="categories-heading">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#F4512C]">
            {t("services.eyebrow")}
          </p>
          <div className="mt-1 flex items-center justify-between gap-4">
            <h2
              id="categories-heading"
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#141210] dark:text-white"
            >
              {t("services.heading")}
            </h2>
            <Link
              to={
                location
                  ? `/search?location=${encodeURIComponent(location)}`
                  : "/search"
              }
              className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-[#F4512C] hover:underline shrink-0"
            >
              <span>{t("services.viewAll")}</span>
              <ChevronRight size={15} />
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map(({ name, icon: Icon }) => (
              <button
                key={name}
                type="button"
                onClick={() => handleCategoryClick(name)}
                className="group rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 text-left flex flex-col items-start gap-4 hover:border-[#F4512C]/50 transition-all active:scale-[0.99] cursor-pointer shadow-2xs"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C] transition group-hover:bg-[#F4512C] group-hover:text-white">
                  <Icon size={18} />
                </div>
                <div className="min-w-0">
                  <span className="block text-sm font-bold text-[#141210] dark:text-white">
                    {translateCategory(name)}
                  </span>
                  <span className="mt-1 block text-xs text-[#6B645F] dark:text-[#9E958F] leading-relaxed line-clamp-2">
                    {t(`cat.${name}.desc`)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* 3. PROFESSIONALS NEAR YOU */}
        <section aria-labelledby="verified-pros-heading">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#F4512C]">
            {t("pros.eyebrow")}
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2
                id="verified-pros-heading"
                className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#141210] dark:text-white"
              >
                {t("pros.heading")}
              </h2>
              <p className="text-xs sm:text-sm text-[#6B645F] dark:text-[#9E958F] mt-1">
                {t("pros.showingFor", {
                  area: location || t("pros.yourLocalArea"),
                })}
              </p>
            </div>

            <button
              type="button"
              onClick={handleGps}
              disabled={gpsLoading}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] px-4 text-xs font-semibold text-[#141210] dark:text-[#FAFAFA] hover:border-[#F4512C]/50 transition cursor-pointer shrink-0"
              title={t("pros.refreshLocation")}
            >
              <Navigation
                size={13}
                className={gpsLoading ? "animate-spin text-[#F4512C]" : ""}
              />
              <span>
                {gpsLoading ? t("pros.locating") : t("pros.refreshLocation")}
              </span>
            </button>
          </div>

          {!isExactLocationMatch && location && displayPros.length > 0 && (
            <div className="mt-4 flex items-center justify-between rounded-2xl border border-[#F4512C]/25 bg-[#FCEAE4]/60 dark:bg-[#3A2018]/40 px-4 py-3 text-xs text-[#524B47] dark:text-[#D4CFCB]">
              <span>{t("pros.noStrictMatch", { area: location })}</span>
              <button
                type="button"
                onClick={handleGps}
                disabled={gpsLoading}
                className="ml-2 shrink-0 text-xs font-bold text-[#F4512C] hover:underline cursor-pointer"
              >
                {t("pros.recheckGps")}
              </button>
            </div>
          )}

          {loading ? (
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <WorkerCardSkeleton key={i} />
              ))}
            </div>
          ) : displayPros.length > 0 ? (
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayPros.map((worker) => (
                <TrustStripWorkerCard key={worker.id} worker={worker} />
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-8 text-center">
              <p className="text-sm text-[#6B645F] dark:text-[#9E958F]">
                {t("pros.noneFound", { area: location || t("pros.yourLocalArea") })}
              </p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleGps}
                  disabled={gpsLoading}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-4 py-2 text-xs font-semibold cursor-pointer"
                >
                  <Navigation
                    size={13}
                    className={gpsLoading ? "animate-spin" : ""}
                  />
                  <span>{t("pros.checkGps")}</span>
                </button>
                <Link
                  to="/search"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#F4512C] hover:bg-[#E04320] text-white px-4 py-2 text-xs font-bold"
                >
                  <span>{t("pros.browseAll")}</span>
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* 4. BUILT AROUND TRUST BANNER */}
        <section
          aria-label={t("trust.heading")}
          className="relative overflow-hidden rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-6 sm:p-8 flex items-center gap-5 shadow-2xs"
        >
          {/* Decorative concentric arcs on the right edge */}
          <div
            aria-hidden="true"
            className="pointer-events-none hidden sm:block absolute -right-12 top-1/2 -translate-y-1/2 h-56 w-56 rounded-full border border-[#F4512C]/15"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none hidden sm:block absolute -right-24 top-1/2 -translate-y-1/2 h-72 w-72 rounded-full border border-[#F4512C]/10"
          />

          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#F4512C] text-white shadow-sm">
            <ShieldCheck size={26} />
          </div>
          <div className="relative z-10 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#C87D64] dark:text-[#D98B72]">
              {t("trust.eyebrow")}
            </p>
            <h2 className="mt-0.5 text-xl sm:text-2xl font-extrabold tracking-tight text-[#141210] dark:text-white">
              {t("trust.heading")}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-[#6B645F] dark:text-[#9E958F]">
              {t("trust.sub")}
            </p>
          </div>
        </section>

        {/* 5. BOTTOM 2-COLUMN UTILITY CARDS (Fair rate guide & Materials & suppliers) */}
        <section
          aria-label="Tools and materials"
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <Link
            to="/rate-guide"
            className="group flex items-center gap-4 rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 sm:p-6 transition-all hover:border-[#F4512C]/50 active:scale-[0.99] shadow-2xs"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C] transition group-hover:bg-[#F4512C] group-hover:text-white">
              <IndianRupee size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-[#141210] dark:text-white">
                {t("promo.rateTitle")}
              </h2>
              <p className="text-xs text-[#6B645F] dark:text-[#9E958F] mt-0.5">
                {t("promo.rateSub")}
              </p>
            </div>
            <ChevronRight
              size={18}
              className="shrink-0 text-[#8C847E] group-hover:text-[#F4512C] transition"
            />
          </Link>

          <Link
            to="/materials"
            className="group flex items-center gap-4 rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 sm:p-6 transition-all hover:border-[#F4512C]/50 active:scale-[0.99] shadow-2xs"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C] transition group-hover:bg-[#F4512C] group-hover:text-white">
              <Package size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-[#141210] dark:text-white">
                {t("promo.materialsTitle")}
              </h2>
              <p className="text-xs text-[#6B645F] dark:text-[#9E958F] mt-0.5">
                {t("promo.materialsSub")}
              </p>
            </div>
            <ChevronRight
              size={18}
              className="shrink-0 text-[#8C847E] group-hover:text-[#F4512C] transition"
            />
          </Link>
        </section>
      </main>

      {/* BOTTOM NAVIGATION (Mobile floating island) */}
      <NavBar />

      {/* Post a Need Modal */}
      <PostNeedModal
        isOpen={postNeedOpen}
        onClose={() => setPostNeedOpen(false)}
        initialCategory={postNeedInitialCategory}
        initialLocation={location}
      />
    </div>
  );
}
