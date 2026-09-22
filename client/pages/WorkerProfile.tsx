import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Check,
  MapPin,
  ShieldCheck,
  X,
  Heart,
  MessageCircle,
  Phone,
  Briefcase,
  Star,
  Camera,
  Share2,
  StickyNote,
  UserX,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { Link, useParams, useSearchParams, useNavigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { workers as staticWorkers, type Worker } from "@/data/workers";
import type { WorkersResponse, WorkerPortfolioItem } from "@shared/api";
import { getWorkerContactHref, getWorkerWhatsAppHref } from "@/lib/contact";
import { findWorkerById } from "@/lib/workers";
import { getSavedWorkerIds, toggleSavedWorker, getWorkerNote, setWorkerNote } from "@/lib/favorites";
import { addRecentlyViewedWorker } from "@/lib/recently-viewed";
import { logAnalyticsEvent, logContactEvent } from "@/lib/analytics";
import RequestCallbackForm from "@/components/RequestCallbackForm";
import TrustStripWorkerCard from "@/components/TrustStripWorkerCard";
import WorkerTrackRecordSection from "@/components/WorkerTrackRecordSection";

// Fallback high-quality proof-of-work project photos by category if worker has not uploaded custom photos yet
const categoryFallbacks: Record<string, Array<{ image_url: string; label: string }>> = {
  Electrician: [
    { image_url: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=700&auto=format&fit=crop&q=80", label: "Wiring & Power Panels" },
    { image_url: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=700&auto=format&fit=crop&q=80", label: "Lighting & Circuit Repairs" },
    { image_url: "https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?w=700&auto=format&fit=crop&q=80", label: "Switchboards & Fixtures" },
  ],
  Plumber: [
    { image_url: "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=700&auto=format&fit=crop&q=80", label: "Pipe Fitting & Leak Fixes" },
    { image_url: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=700&auto=format&fit=crop&q=80", label: "Bathroom & Tap Installations" },
    { image_url: "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=700&auto=format&fit=crop&q=80", label: "Drainage & Water Lines" },
  ],
  Carpenter: [
    { image_url: "https://images.unsplash.com/photo-1533090161767-e6ffed986b88?w=700&auto=format&fit=crop&q=80", label: "Custom Furniture & Woodwork" },
    { image_url: "https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=700&auto=format&fit=crop&q=80", label: "Door & Cabinet Fitting" },
    { image_url: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=700&auto=format&fit=crop&q=80", label: "Wood Polishing & Repairs" },
  ],
  Painter: [
    { image_url: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=700&auto=format&fit=crop&q=80", label: "Interior Wall Finish" },
    { image_url: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=700&auto=format&fit=crop&q=80", label: "Exterior & Waterproofing" },
    { image_url: "https://images.unsplash.com/photo-1574359411659-15573a27fd0c?w=700&auto=format&fit=crop&q=80", label: "Texture & Stencil Design" },
  ],
  Cleaner: [
    { image_url: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=700&auto=format&fit=crop&q=80", label: "Deep Home Cleaning" },
    { image_url: "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=700&auto=format&fit=crop&q=80", label: "Floor Scrubbing & Sanitization" },
    { image_url: "https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=700&auto=format&fit=crop&q=80", label: "Kitchen & Washroom Detailing" },
  ],
  "AC Repair": [
    { image_url: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=700&auto=format&fit=crop&q=80", label: "AC Servicing & Gas Refill" },
    { image_url: "https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=700&auto=format&fit=crop&q=80", label: "Split & Window AC Installation" },
    { image_url: "https://images.unsplash.com/photo-1614633833026-0820552978b6?w=700&auto=format&fit=crop&q=80", label: "Cooling Coil & Compressor Check" },
  ],
};

const defaultGeneralFallbacks = [
  { image_url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=700&auto=format&fit=crop&q=80", label: "Professional Service & Workmanship" },
  { image_url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=700&auto=format&fit=crop&q=80", label: "Quality Tools & Equipment" },
];

export default function WorkerProfile() {
  const routeParams = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [availableWorkers, setAvailableWorkers] = useState<Worker[]>(staticWorkers);
  const [portfolioPhotos, setPortfolioPhotos] = useState<WorkerPortfolioItem[]>([]);
  const [showContact, setShowContact] = useState(false);
  const [showCallback, setShowCallback] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [personalNote, setPersonalNote] = useState("");
  const [activePhoto, setActivePhoto] = useState<{ image_url: string; label?: string } | null>(null);
  const [loadingWorkers, setLoadingWorkers] = useState(true);
  const [loadingError, setLoadingError] = useState(false);

  const requestedWorkerId = routeParams.id || searchParams.get("worker") || searchParams.get("id");
  const worker = findWorkerById(availableWorkers, requestedWorkerId);

  useEffect(() => {
    setSaved(requestedWorkerId ? getSavedWorkerIds().includes(requestedWorkerId) : false);
    if (requestedWorkerId) {
      setPersonalNote(getWorkerNote(requestedWorkerId));
    }
  }, [requestedWorkerId]);

  const handleNoteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!worker?.id) return;
    const val = e.target.value;
    setPersonalNote(val);
    setWorkerNote(worker.id, val);
  };

  useEffect(() => {
    let mounted = true;
    setLoadingWorkers(true);
    fetch("/api/workers", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return r.json() as Promise<WorkersResponse>;
      })
      .then((data) => {
        if (mounted && Array.isArray(data.workers)) {
          setAvailableWorkers(data.workers);
          setLoadingError(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setLoadingError(true);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoadingWorkers(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch worker portfolio photos
  useEffect(() => {
    if (!worker?.id) return;
    let mounted = true;
    fetch(`/api/workers/${worker.id}/portfolio`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return { photos: [] };
        return res.json();
      })
      .then((data) => {
        if (mounted && Array.isArray(data.photos)) {
          setPortfolioPhotos(data.photos);
        }
      })
      .catch(() => {
        if (mounted) setPortfolioPhotos([]);
      });

    return () => {
      mounted = false;
    };
  }, [worker?.id]);

  useEffect(() => {
    if (worker?.id) {
      addRecentlyViewedWorker(worker.id);
      void logAnalyticsEvent("profile_view", worker.id);
    }
  }, [worker?.id]);

  // Proof-of-work photo strip source: real uploaded portfolio photos, with category-themed fallback
  const workPhotos = useMemo(() => {
    if (!worker) return [];
    if (portfolioPhotos.length > 0) {
      return portfolioPhotos.map((p) => ({
        image_url: p.image_url,
        label: p.label || `${worker.name}'s work sample`,
      }));
    }
    const inlinePhotos = Array.isArray((worker as any).work_photos)
      ? ((worker as any).work_photos as string[]).filter(Boolean).map((url, i) => ({
          image_url: url,
          label: `${worker.category} project #${i + 1}`,
        }))
      : [];
    if (inlinePhotos.length > 0) return inlinePhotos;

    // Fall back to category-themed proof of work samples (never broken)
    const categoryKey = Object.keys(categoryFallbacks).find(
      (c) => c.toLowerCase() === (worker.category || "").trim().toLowerCase(),
    );
    return (categoryKey ? categoryFallbacks[categoryKey] : null) || defaultGeneralFallbacks;
  }, [worker, portfolioPhotos]);

  // "More [category] near you" - horizontal scroll of other workers sorted by verified + rating + location match
  const relatedWorkers = useMemo(() => {
    if (!worker) return [];
    const others = availableWorkers.filter((w) => w.id !== worker.id);
    const targetCat = (worker.category || "").trim().toLowerCase();
    const targetLoc = (worker.locality || "").trim().toLowerCase();

    const isLocMatch = (w: Worker) => {
      if (!targetLoc) return false;
      const wLoc = (w.locality || "").trim().toLowerCase();
      return wLoc.includes(targetLoc) || targetLoc.includes(wLoc);
    };

    const isCatMatch = (w: Worker) => {
      if (!targetCat) return false;
      const wCat = (w.category || "").trim().toLowerCase();
      return wCat.includes(targetCat) || targetCat.includes(wCat);
    };

    const sorted = [...others].sort((a, b) => {
      // Priority 1: Category match
      const aCat = isCatMatch(a) ? 1 : 0;
      const bCat = isCatMatch(b) ? 1 : 0;
      if (bCat !== aCat) return bCat - aCat;

      // Priority 2: Locality match
      const aLoc = isLocMatch(a) ? 1 : 0;
      const bLoc = isLocMatch(b) ? 1 : 0;
      if (bLoc !== aLoc) return bLoc - aLoc;

      // Priority 3: Verified phone
      const aVer = a.phone_verified ? 1 : 0;
      const bVer = b.phone_verified ? 1 : 0;
      if (bVer !== aVer) return bVer - aVer;

      // Priority 4: Rating
      const aRating = Number(a.avg_rating || a.rating || 4.8);
      const bRating = Number(b.avg_rating || b.rating || 4.8);
      if (bRating !== aRating) return bRating - aRating;

      // Priority 5: Available today
      if (b.available_today && !a.available_today) return 1;
      if (!b.available_today && a.available_today) return -1;

      return 0;
    });

    return sorted.slice(0, 8);
  }, [availableWorkers, worker]);

  if (loadingWorkers && !worker) {
    return (
      <PageShell backTo="/search" backLabel="Search specialists">
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center rounded-[20px] border border-[#E7ECF1] dark:border-[#1F1F1F] bg-white dark:bg-[#0A0A0A] shadow-soft">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary-100/15 text-primary border border-primary-100/30 mb-5">
            <span className="absolute inset-0 animate-ping rounded-full bg-primary-100/10" />
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
          <h2 className="text-base font-bold text-[#2C2C2C] dark:text-[#F4F4F5] tracking-tight">
            Loading Specialist Profile
          </h2>
          <p className="mt-1 text-xs text-[#67696D] dark:text-[#A1A1AA] max-w-[280px]">
            Please wait while we retrieve the verified profile and customer track records.
          </p>
        </div>
      </PageShell>
    );
  }

  if (!worker) {
    return (
      <PageShell backTo="/search" backLabel="Search specialists">
        <div className="flex flex-col items-center justify-center min-h-[420px] p-6 sm:p-10 text-center rounded-[24px] border border-[#E7ECF1] dark:border-[#1F1F1F] bg-white dark:bg-[#0A0A0A] shadow-soft max-w-2xl mx-auto my-6 sm:my-10">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100/30 dark:bg-rose-950/20 text-rose-500 border border-rose-100 dark:border-rose-950/30 mb-6 shrink-0 shadow-subtle">
            {loadingError ? <AlertCircle size={28} /> : <UserX size={28} />}
          </div>
          
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#2C2C2C] dark:text-[#F4F4F5]">
            {loadingError ? "Connection Failed" : "Profile Not Found"}
          </h1>
          
          <p className="mt-2.5 text-xs sm:text-sm text-[#67696D] dark:text-[#A1A1AA] max-w-md leading-relaxed">
            {loadingError 
              ? "We encountered a temporary issue loading our directory of specialists. Check your internet connection and try again."
              : "The requested specialist profile is currently unavailable. The profile may have been unlisted, moved, or the ID is incorrect."}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <Link
              to="/search"
              className="flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-primary px-6 text-xs font-bold text-white hover:bg-[#157ad4] shadow-subtle transition-all duration-200 active:scale-[0.98]"
            >
              <ArrowLeft size={14} />
              <span>Back to search</span>
            </Link>

            {loadingError && (
              <button
                type="button"
                onClick={() => {
                  setLoadingWorkers(true);
                  // Trigger a re-fetch of available workers
                  fetch("/api/workers", { cache: "no-store" })
                    .then(async (r) => {
                      if (!r.ok) throw new Error();
                      return r.json() as Promise<WorkersResponse>;
                    })
                    .then((data) => {
                      if (Array.isArray(data.workers)) {
                        setAvailableWorkers(data.workers);
                        setLoadingError(false);
                      }
                    })
                    .catch(() => {
                      setLoadingError(true);
                    })
                    .finally(() => {
                      setLoadingWorkers(false);
                    });
                }}
                className="flex h-11 w-full sm:w-auto items-center justify-center rounded-full border border-[#E7ECF1] dark:border-[#222222] bg-[#F6F9FC] dark:bg-[#121212] px-6 text-xs font-bold text-[#2C2C2C] dark:text-[#F4F4F5] hover:bg-[#EDF2F7] dark:hover:bg-[#1A1A1A] transition-all duration-200 active:scale-[0.98]"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </PageShell>
    );
  }

  const contactHref = getWorkerContactHref(worker);
  const whatsappHref = getWorkerWhatsAppHref(worker);

  const handleShare = async () => {
    if (!worker) return;
    const shareUrl = window.location.href;
    const shareTitle = `${worker.name} - Verified ${worker.category}`;
    const shareText = `Check out ${worker.name}, a verified ${worker.category} in ${worker.locality || "your area"} with verified track record stats on Fusion Starter!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        void logAnalyticsEvent("share_profile_native", worker.id, { category: worker.category });
      } catch (err) {
        // Fallback if the user cancelled or native share throws an error
        if (err instanceof Error && err.name !== "AbortError") {
          copyToClipboard(shareUrl);
        }
      }
    } else {
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = (url: string) => {
    if (!worker) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      void logAnalyticsEvent("share_profile_copy", worker.id, { category: worker.category });
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {
      // fallback fail silently
    });
  };

  const save = () => {
    toggleSavedWorker(worker.id);
    setSaved(getSavedWorkerIds().includes(worker.id));
  };

  // Only render rating/reviews if they exist in the data (no fabricated stats)
  const hasRating = worker.avg_rating !== undefined || worker.rating !== undefined;
  const ratingValue = Number(worker.avg_rating || worker.rating);
  const hasReviewsCount = typeof worker.reviews_count === "number" && worker.reviews_count > 0;

  return (
    <PageShell
      backTo="/search"
      backLabel="Back"
      containerWidth="md"
      className="pb-28 sm:pb-32 relative"
    >
      {/* Toast Notification */}
      {copied && (
        <div className="fixed top-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-emerald-200 dark:border-emerald-800 bg-white/95 dark:bg-[#121212]/95 px-4 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-200 shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-300">
          <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Profile link copied to clipboard!</span>
        </div>
      )}

      {/* 1. HERO SECTION: PROOF-OF-WORK PHOTO STRIP (Replaces large centered headshot) */}
      <section className="relative overflow-hidden rounded-[20px] border border-[#E7ECF1] dark:border-[#1F1F1F] bg-white dark:bg-[#0A0A0A] shadow-soft">
        {/* Full-width horizontal scrollable photo strip */}
        <div className="relative bg-[#0F172A]">
          <div className="flex h-44 sm:h-56 w-full gap-2 overflow-x-auto p-2 scrollbar-none snap-x snap-mandatory">
            {workPhotos.map((item, idx) => (
              <div
                key={`${item.image_url}-${idx}`}
                onClick={() => setActivePhoto(item)}
                role="button"
                tabIndex={0}
                className="group relative h-full w-[240px] sm:w-[280px] shrink-0 snap-start overflow-hidden rounded-[14px] bg-[#1E293B] cursor-pointer"
              >
                <img
                  src={item.image_url}
                  alt={item.label || `${worker.name} work sample`}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    // Fallback pattern if remote photo fails
                    const target = e.currentTarget;
                    target.src = "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=700&auto=format&fit=crop&q=80";
                  }}
                />
                {/* Proof of Work Badge Overlay */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-2.5 text-white">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold truncate">
                    <Camera size={11} className="shrink-0 text-primary-100" />
                    <span className="truncate">{item.label}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Top Floating Action Controls (Bookmark & Share) */}
          <div className="absolute top-3.5 right-3.5 flex items-center gap-2 z-10">
            <button
              type="button"
              onClick={handleShare}
              title="Share specialist profile"
              aria-label="Share"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 dark:bg-black/80 text-[#2C2C2C] dark:text-[#F4F4F5] backdrop-blur-md shadow-md transition hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Share2 size={14} className="text-[#67696D] dark:text-[#A1A1AA]" />
            </button>
            <button
              type="button"
              onClick={save}
              title={saved ? "Saved to bookmarks" : "Save to bookmarks"}
              aria-label={saved ? "Saved" : "Save"}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 dark:bg-black/80 text-[#2C2C2C] dark:text-[#F4F4F5] backdrop-blur-md shadow-md transition hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Heart
                size={15}
                fill={saved ? "currentColor" : "none"}
                className={saved ? "text-rose-500" : "text-[#67696D] dark:text-[#A1A1AA]"}
              />
            </button>
          </div>
        </div>

        {/* 2. COMPACT DETAILS HEADER WITH OVERLAPPING SMALL AVATAR */}
        <div className="px-4 pb-5 sm:px-6">
          {/* Avatar overlapping the bottom-left corner of the photo strip */}
          <div className="-mt-8 sm:-mt-9 flex items-end gap-3.5 mb-2">
            <div className="relative flex h-16 w-16 sm:h-18 sm:w-18 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white dark:border-[#0A0A0A] bg-[#F6F9FC] dark:bg-[#141414] font-bold text-primary text-xl shadow-soft">
              {worker.photo_url ? (
                <img
                  src={worker.photo_url}
                  alt={worker.name}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{worker.initials || worker.name.slice(0, 2).toUpperCase()}</span>
              )}
            </div>

            {/* Availability status tag next to avatar */}
            {worker.available_today && (
              <span className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Available Today
              </span>
            )}
          </div>

          {/* Name, verified badge (if applicable), primary trade/category tag — single compact row */}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#2C2C2C] dark:text-[#F4F4F5]">
              {worker.name}
            </h1>

            {worker.phone_verified && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary-100/40 bg-primary-100/15 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                <BadgeCheck size={13} className="text-primary" />
                <span>Verified Pro</span>
              </span>
            )}

            <span className="rounded-full border border-[#E7ECF1] dark:border-[#262626] bg-[#F6F9FC] dark:bg-[#141414] px-2.5 py-0.5 text-[11px] font-bold text-primary">
              {worker.category}
            </span>

            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1 text-[11px] font-bold border border-[#E7ECF1] dark:border-[#262626] bg-white dark:bg-[#121212] hover:bg-[#F6F9FC] dark:hover:bg-[#1A1A1A] text-[#67696D] dark:text-[#A1A1AA] hover:text-primary dark:hover:text-primary px-2.5 py-0.5 rounded-full transition cursor-pointer shadow-subtle active:scale-[0.98]"
            >
              <Share2 size={11} className="text-[#989EA7]" />
              <span>Share</span>
            </button>
          </div>

          {/* Row: star rating + review count (if it exists) + area/locality served. No fabricated stats */}
          <div className="mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-xs text-[#67696D] dark:text-[#A1A1AA]">
            {hasRating && (
              <div className="inline-flex items-center gap-1 font-bold text-[#2C2C2C] dark:text-[#F4F4F5]">
                <Star size={13} className="fill-amber-400 text-amber-400" />
                <span>{ratingValue.toFixed(1)}</span>
                {hasReviewsCount && (
                  <span className="font-normal text-[#67696D] dark:text-[#A1A1AA]">
                    ({worker.reviews_count} {worker.reviews_count === 1 ? "review" : "reviews"})
                  </span>
                )}
              </div>
            )}

            {worker.locality && (
              <span className="flex items-center gap-1">
                <MapPin size={13} className="text-primary shrink-0" />
                <span>{worker.locality}</span>
              </span>
            )}

            {worker.experience && (
              <span className="flex items-center gap-1">
                <Briefcase size={13} className="text-[#989EA7] shrink-0" />
                <span>{worker.experience} experience</span>
              </span>
            )}
          </div>
        </div>
      </section>

      {/* 3. CONTENT SECTIONS: PERSONAL NOTE, ABOUT & SERVICES */}
      <div className="mt-4 space-y-4">
        {/* Personal Note if in My Circle or if note exists */}
        {(saved || personalNote.trim().length > 0) && worker && (
          <section className="rounded-[16px] border border-primary-100/40 bg-primary-100/10 dark:bg-primary-100/5 p-4 sm:p-5 shadow-soft space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-primary">
              <StickyNote size={14} className="text-primary" />
              <span>My Circle Personal Note</span>
            </div>
            <input
              type="text"
              value={personalNote}
              onChange={handleNoteChange}
              placeholder="Add a note (e.g. 'Fixed geyser in May, very punctual')..."
              className="w-full rounded-[12px] border border-[#E7ECF1] dark:border-[#222222] bg-white dark:bg-[#121212] px-3.5 py-2 text-xs text-[#2C2C2C] dark:text-[#F4F4F5] placeholder-[#989EA7] focus:border-primary focus:outline-none"
            />
            <p className="text-[10px] text-[#989EA7]">Saved privately on this device.</p>
          </section>
        )}
        {/* Short "About" bio text, if that field exists */}
        {worker.about && worker.about.trim().length > 0 && (
          <section className="rounded-[16px] border border-[#E7ECF1] dark:border-[#1F1F1F] bg-white dark:bg-[#0A0A0A] p-4 sm:p-5 shadow-soft">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#67696D] dark:text-[#A1A1AA]">About</h2>
            <p className="mt-2 text-xs leading-relaxed text-[#2C2C2C] dark:text-[#D4D4D8]">{worker.about}</p>
          </section>
        )}

        {/* "Services offered" — existing skill/category tags as small pill chips */}
        {Array.isArray(worker.services) && worker.services.length > 0 && (
          <section className="rounded-[16px] border border-[#E7ECF1] dark:border-[#1F1F1F] bg-white dark:bg-[#0A0A0A] p-4 sm:p-5 shadow-soft">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#67696D] dark:text-[#A1A1AA]">
              Services Offered
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {worker.services.map((service) => (
                <span
                  key={service}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary-100/40 bg-primary-100/10 dark:bg-primary-100/5 px-3 py-1.5 text-xs font-medium text-[#2C2C2C] dark:text-[#F4F4F5]"
                >
                  <Check size={13} className="text-primary" />
                  <span>{service}</span>
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Track Record Section (Unmoderated Public Timeline) */}
        {worker && <WorkerTrackRecordSection workerId={worker.id} workerName={worker.name} />}

        {/* 4. "MORE [CATEGORY] NEAR YOU" — Horizontal scroll on every worker profile */}
        {relatedWorkers.length > 0 && (
          <section className="rounded-[16px] border border-[#E7ECF1] dark:border-[#1F1F1F] bg-white dark:bg-[#0A0A0A] p-4 sm:p-5 shadow-soft">
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="text-sm sm:text-base font-bold text-[#2C2C2C] dark:text-[#F4F4F5]">
                More {worker.category ? `${worker.category}s` : "Pros"} Near You
              </h2>
              <Link
                to={`/search?service=${encodeURIComponent(worker.category || "")}&location=${encodeURIComponent(worker.locality || "")}`}
                className="text-xs font-bold text-primary hover:underline"
              >
                View all &rarr;
              </Link>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory -mx-2 px-2 sm:mx-0 sm:px-0">
              {relatedWorkers.map((relWorker) => (
                <TrustStripWorkerCard key={relWorker.id} worker={relWorker} />
              ))}
            </div>
          </section>
        )}

        {/* Feedback / Report Link */}
        <div className="pt-1 text-center">
          <Link
            to="/report"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#67696D] dark:text-[#A1A1AA] transition hover:text-foreground"
          >
            <ShieldCheck size={13} />
            <span>Report or Provide Feedback</span>
          </Link>
        </div>
      </div>

      {/* 5. LIGHTBOX PHOTO MODAL */}
      {activePhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          onClick={() => setActivePhoto(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-2xl overflow-hidden rounded-[20px] bg-white dark:bg-[#0A0A0A] border border-[#E7ECF1] dark:border-[#1F1F1F] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActivePhoto(null)}
              className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80 cursor-pointer"
              aria-label="Close photo preview"
            >
              <X size={18} />
            </button>
            <img
              src={activePhoto.image_url}
              alt={activePhoto.label || "Proof of work photo"}
              className="max-h-[75vh] w-full object-contain bg-black"
            />
            {activePhoto.label && (
              <div className="p-4 border-t border-[#E7ECF1] dark:border-[#1F1F1F]">
                <p className="text-xs font-semibold text-[#2C2C2C] dark:text-[#F4F4F5]">{activePhoto.label}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. DIRECT CALL MODAL */}
      {showContact && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-[20px] border border-[#E7ECF1] dark:border-[#1F1F1F] bg-white dark:bg-[#0A0A0A] p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#2C2C2C] dark:text-[#F4F4F5]">Call {worker.name}</h2>
                <p className="mt-0.5 text-xs text-[#67696D] dark:text-[#A1A1AA] select-all font-mono">+91 {worker.phone}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowContact(false)}
                aria-label="Close"
                className="rounded-full p-1.5 text-[#989EA7] hover:bg-secondary hover:text-foreground cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <a
              href={contactHref}
              onClick={() => setShowContact(false)}
              className="mt-5 flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-primary text-xs font-bold text-white transition hover:bg-[#157ad4] shadow-subtle active:scale-[0.98]"
            >
              <Phone size={14} />
              <span>Call Now</span>
            </a>
          </div>
        </div>
      )}

      {/* 7. REQUEST CALLBACK MODAL */}
      {showCallback && (
        <RequestCallbackForm
          workerId={worker.id}
          workerName={worker.name}
          service={worker.category}
          onClose={() => setShowCallback(false)}
        />
      )}

      {/* 8. STICKY BOTTOM BAR (Always visible while scrolling this screen) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#E7ECF1] dark:border-[#1F1F1F] bg-white/95 dark:bg-black/95 backdrop-blur-md px-4 py-3 shadow-2xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          {/* Call button: Outline style */}
          <button
            type="button"
            onClick={() => {
              void logContactEvent(worker.id, "call", { name: worker.name, category: worker.category });
              void logAnalyticsEvent("call_click", worker.id, { source: "sticky_bottom_bar" });
              setShowContact(true);
            }}
            className="flex-1 flex h-11 items-center justify-center gap-2 rounded-full border-2 border-[#2C2C2C] dark:border-[#F4F4F5] bg-transparent text-xs sm:text-sm font-bold text-[#2C2C2C] dark:text-[#F4F4F5] hover:bg-black/5 dark:hover:bg-white/10 active:scale-[0.98] transition cursor-pointer"
          >
            <Phone size={16} />
            <span>Call</span>
          </button>

          {/* WhatsApp button: Solid standard WhatsApp green */}
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              void logContactEvent(worker.id, "whatsapp", { name: worker.name, category: worker.category });
              void logAnalyticsEvent("whatsapp_click", worker.id, { source: "sticky_bottom_bar" });
            }}
            className="flex-1 flex h-11 items-center justify-center gap-2 rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-xs sm:text-sm font-bold text-white shadow-subtle active:scale-[0.98] transition cursor-pointer"
          >
            <MessageCircle size={16} />
            <span>WhatsApp</span>
          </a>
        </div>
      </div>
    </PageShell>
  );
}
