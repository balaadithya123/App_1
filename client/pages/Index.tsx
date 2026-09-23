import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
} from "@/lib/location";
import { supabase } from "@/lib/supabase";

// Existing service categories supported by the app
const categories = [
  { name: "Electrician", icon: Zap },
  { name: "Plumber", icon: Wrench },
  { name: "Carpenter", icon: Hammer },
  { name: "Painter", icon: Paintbrush },
  { name: "Cleaner", icon: Brush },
  { name: "All Services", icon: ChevronRight },
];

export default function Index() {
  const navigate = useNavigate();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);

  // Redirect workers and agencies to their dashboards as their primary homepage
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

  // Search input state for inline header input
  const [searchQuery, setSearchQuery] = useState("");

  // Location state & location picker toggle
  const [location, setLocation] = useState(() => getStandardLocation());
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [customLocationInput, setCustomLocationInput] = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [postNeedOpen, setPostNeedOpen] = useState(false);
  const locationPickerRef = useRef<HTMLDivElement>(null);

  // Sync standard location updates across tabs / components
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

  // If no location saved yet in storage, attempt initial GPS detection
  useEffect(() => {
    try {
      const saved =
        localStorage.getItem("user_selected_location") ||
        localStorage.getItem("user_registered_location");
      if (!saved && navigator.geolocation) {
        void detectGpsLocation(true).then((details) => {
          if (details) {
            const locName =
              details.locality || details.city || details.formatted;
            if (locName) setLocation(locName);
          }
        });
      }
    } catch {}
  }, []);

  // Fetch existing workers data
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

  // Close location picker on outside click
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

  // Handle GPS reverse geocode using existing API
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
      // ignore fallback
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

  // 1. "VERIFIED PROS NEAR YOU" — trust strip
  // Sorted primarily by worker's location matching user's selected area (header indicator)
  // Within that, ordered by verified status, then rating
  const verifiedPros = useMemo(() => {
    const selectedLoc = location.trim().toLowerCase();

    const isLocMatch = (w: Worker) => {
      if (!selectedLoc) return false;
      const workerLoc = (w.locality || "").trim().toLowerCase();
      if (!workerLoc) return false;
      return workerLoc.includes(selectedLoc) || selectedLoc.includes(workerLoc);
    };

    return [...workers]
      .sort((a, b) => {
        // Priority 1: Worker's locality matches header's location indicator
        const aMatch = isLocMatch(a) ? 1 : 0;
        const bMatch = isLocMatch(b) ? 1 : 0;
        if (bMatch !== aMatch) return bMatch - aMatch;

        // Priority 2: Verified phone / trust status
        const aVer = a.phone_verified ? 1 : 0;
        const bVer = b.phone_verified ? 1 : 0;
        if (bVer !== aVer) return bVer - aVer;

        // Priority 3: Star rating (fallback to existing default 4.8)
        const aRating = Number(a.avg_rating || a.rating || 4.8);
        const bRating = Number(b.avg_rating || b.rating || 4.8);
        if (bRating !== aRating) return bRating - aRating;

        // Priority 4: Availability today
        if (b.available_today && !a.available_today) return 1;
        if (!b.available_today && a.available_today) return -1;

        return 0;
      })
      .slice(0, 6);
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

  const handleOpenSearch = () => {
    handleSearchSubmit();
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
    <div className="min-h-screen bg-[#F6F9FC] dark:bg-black text-[#2C2C2C] dark:text-[#F4F4F5] flex flex-col selection:bg-primary-100/25 selection:text-primary pb-24">
      {/* 1. TOP BAR (Compact, single-row: Left location chip, Right inline search input) */}
      <header className="sticky top-0 z-30 w-full border-b border-[#E7ECF1] dark:border-[#1F1F1F] bg-white/95 dark:bg-black/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-2 px-4 sm:px-6">
          {/* Left: Tappable Location Chip showing current/selected area (e.g. "Coimbatore ▾") */}
          <div className="relative shrink-0" ref={locationPickerRef}>
            <button
              type="button"
              onClick={() => {
                setCustomLocationInput(location);
                setShowLocationPicker((prev) => !prev);
              }}
              aria-label="Select location area"
              className="inline-flex h-9 items-center gap-1 rounded-full border border-[#E7ECF1] dark:border-[#222222] bg-[#F6F9FC] dark:bg-[#0c0c0c] px-2.5 sm:px-3 text-xs font-semibold text-[#2C2C2C] dark:text-[#F4F4F5] transition-all hover:border-primary/40 hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 cursor-pointer max-w-[125px] sm:max-w-[155px] shadow-subtle"
            >
              <MapPin size={13} className="text-primary shrink-0" />
              <span className="truncate">{location || "Coimbatore"}</span>
              <ChevronDown
                size={12}
                className={`text-[#67696D] dark:text-[#A1A1AA] shrink-0 transition-transform duration-200 ${
                  showLocationPicker ? "rotate-180 text-primary" : ""
                }`}
              />
            </button>

            {/* Existing Location Selector Popover */}
            {showLocationPicker && (
              <div className="absolute left-0 top-11 z-50 w-72 rounded-[16px] border border-[#E7ECF1] dark:border-[#222222] bg-white dark:bg-[#0A0A0A] p-3.5 shadow-soft animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-[#E7ECF1] dark:border-[#1F1F1F] mb-2.5">
                  <span className="text-xs font-bold text-[#2C2C2C] dark:text-[#F4F4F5]">
                    Choose Area
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowLocationPicker(false)}
                    className="text-[#989EA7] hover:text-[#2C2C2C] dark:hover:text-[#F4F4F5] cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* GPS Auto-Detect Button */}
                <button
                  type="button"
                  onClick={handleGps}
                  disabled={gpsLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-[#E7ECF1] dark:border-[#222222] bg-[#F6F9FC] dark:bg-[#141414] py-2 text-xs font-semibold text-primary transition hover:border-primary/40 hover:bg-primary-100/10 cursor-pointer disabled:opacity-60 mb-2.5"
                >
                  <Navigation
                    size={13}
                    className={
                      gpsLoading ? "animate-spin text-primary" : "text-primary"
                    }
                  />
                  <span>
                    {gpsLoading
                      ? "Detecting location..."
                      : "Use Current Location (GPS)"}
                  </span>
                </button>

                {/* Custom Location Input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleApplyLocation(customLocationInput);
                  }}
                  className="space-y-2"
                >
                  <div className="flex items-center rounded-[12px] border border-[#E7ECF1] dark:border-[#222222] bg-[#F6F9FC] dark:bg-[#141414] px-3 py-1.5 focus-within:border-primary focus-within:bg-white dark:focus-within:bg-[#0A0A0A] focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                    <MapPin
                      size={14}
                      className="text-[#989EA7] dark:text-[#71717A] mr-2 shrink-0"
                    />
                    <input
                      type="text"
                      value={customLocationInput}
                      onChange={(e) => setCustomLocationInput(e.target.value)}
                      placeholder="e.g. RS Puram, Gandhipuram"
                      className="w-full bg-transparent text-xs text-[#2C2C2C] dark:text-[#F4F4F5] outline-none placeholder:text-[#989EA7] dark:placeholder:text-[#71717A]"
                      autoFocus
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="submit"
                      className="flex-1 rounded-full bg-primary py-1.5 text-xs font-semibold text-white transition hover:bg-[#157ad4] cursor-pointer shadow-subtle"
                    >
                      Apply
                    </button>
                    {location && (
                      <button
                        type="button"
                        onClick={() => handleApplyLocation("")}
                        className="rounded-full border border-[#E7ECF1] dark:border-[#222222] px-3 py-1.5 text-xs font-medium text-[#67696D] dark:text-[#A1A1AA] hover:text-[#2C2C2C] dark:hover:text-white cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Right: Inline Search Input with rounded Clarity input styling */}
          <form onSubmit={handleSearchSubmit} className="flex-1 min-w-0">
            <div className="relative flex items-center w-full">
              <Search
                size={14}
                className="absolute left-3 text-[#989EA7] dark:text-[#71717A] pointer-events-none shrink-0"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for a service or worker"
                className="h-9 w-full rounded-full border border-[#E7ECF1] dark:border-[#222222] bg-[#F6F9FC] dark:bg-[#0c0c0c] pl-8.5 pr-8 text-xs text-[#2C2C2C] dark:text-[#F4F4F5] placeholder:text-[#989EA7] dark:placeholder:text-[#71717A] outline-none transition-all focus:border-primary focus:bg-white dark:focus:bg-[#141414] focus:ring-2 focus:ring-primary/20 shadow-subtle"
              />
              <button
                type="submit"
                aria-label="Search"
                title="Search"
                className="absolute right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white transition hover:bg-[#157ad4] active:scale-95 cursor-pointer shadow-subtle"
              >
                <Search size={12} />
              </button>
            </div>
          </form>
        </div>
      </header>

      {/* MAIN CONTENT (Mobile-first, compact, clean layout) */}
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pt-5 sm:px-6 space-y-7">
        {/* Prominent "Post a Need" Hero Action Card */}
        <section className="rounded-[20px] border border-primary/20 bg-gradient-to-br from-primary-100/15 via-white to-[#F6F9FC] dark:from-primary-950/20 dark:via-[#0A0A0A] dark:to-black p-4.5 sm:p-5 shadow-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-100/30 dark:bg-primary-950/50 px-2.5 py-0.5 text-[10px] font-bold text-primary">
              <Sparkles size={11} />
              <span>Instant Matching</span>
            </span>
            <h2 className="text-sm sm:text-base font-bold text-[#2C2C2C] dark:text-[#F4F4F5] tracking-tight">
              Have a specific repair or job?
            </h2>
            <p className="text-xs text-[#67696D] dark:text-[#A1A1AA]">
              Post what you need and get matched directly with nearby verified
              pros.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPostNeedOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-soft hover:bg-[#157ad4] active:scale-[0.98] transition-all cursor-pointer shrink-0 w-full sm:w-auto"
          >
            <Sparkles size={15} />
            <span>Post a Need</span>
          </button>
        </section>

        {/* 2. "VERIFIED PROS NEAR YOU" — trust strip */}
        <section aria-labelledby="verified-pros-heading">
          <div className="flex items-center justify-between mb-3 px-0.5">
            <h2
              id="verified-pros-heading"
              className="text-sm sm:text-base font-bold text-[#2C2C2C] tracking-tight"
            >
              Verified pros near you
            </h2>
            <button
              type="button"
              onClick={handleOpenSearch}
              className="text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              View all
            </button>
          </div>

          {loading ? (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x -mx-4 px-4 sm:mx-0 sm:px-0">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-[200px] shrink-0 rounded-[16px] border border-[#E7ECF1] bg-white p-3.5 shadow-subtle animate-pulse space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-12 w-12 rounded-full bg-[#E7ECF1]" />
                    <div className="h-5 w-14 rounded-full bg-[#E7ECF1]" />
                  </div>
                  <div className="h-4 w-28 rounded bg-[#E7ECF1]" />
                  <div className="h-3 w-20 rounded bg-[#E7ECF1]" />
                  <div className="h-3 w-16 rounded bg-[#E7ECF1]" />
                </div>
              ))}
            </div>
          ) : verifiedPros.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0">
              {verifiedPros.map((worker) => (
                <TrustStripWorkerCard key={worker.id} worker={worker} />
              ))}
            </div>
          ) : (
            <div className="rounded-[16px] border border-[#E7ECF1] bg-white p-5 text-center shadow-subtle">
              <p className="text-xs font-medium text-[#67696D]">
                No verified professionals found in this area yet.
              </p>
              <button
                type="button"
                onClick={handleOpenSearch}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-white shadow-subtle hover:bg-[#157ad4] cursor-pointer"
              >
                <span>Browse all workers</span>
              </button>
            </div>
          )}
        </section>

        {/* 3. CATEGORY GRID (2-column grid of rounded icon tiles — existing categories only) */}
        <section aria-labelledby="categories-heading">
          <div className="mb-3 px-0.5">
            <h2
              id="categories-heading"
              className="text-sm sm:text-base font-bold text-[#2C2C2C] tracking-tight"
            >
              Explore by category
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {categories.map(({ name, icon: Icon }) => (
              <button
                key={name}
                type="button"
                onClick={() => handleCategoryClick(name)}
                className="group flex items-center gap-3 rounded-[16px] border border-[#E7ECF1] bg-white p-4 text-left shadow-subtle transition-all hover:border-primary/50 hover:shadow-soft active:scale-[0.98] cursor-pointer"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100/15 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-xs sm:text-sm font-bold text-[#2C2C2C] group-hover:text-primary transition-colors">
                    {name}
                  </span>
                  <span className="text-[10px] text-[#67696D]">
                    {name === "All Services" ? "Browse all" : "Find pros"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>

      {/* 4. BOTTOM NAVIGATION (Icon-only rounded nav bar per existing Clarity nav styling) */}
      <NavBar />

      {/* Floating Action Button (FAB) for Post a Need */}
      <button
        type="button"
        onClick={() => setPostNeedOpen(true)}
        className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-soft hover:bg-[#157ad4] active:scale-95 transition-all cursor-pointer border border-white/20"
        title="Post a Need"
      >
        <Sparkles size={15} />
        <span>Post a Need</span>
      </button>

      {/* Post a Need Modal / Bottom Sheet */}
      <PostNeedModal
        isOpen={postNeedOpen}
        onClose={() => setPostNeedOpen(false)}
        initialLocation={location}
      />
    </div>
  );
}
