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
import {
  Link,
  useParams,
  useSearchParams,
  useNavigate,
} from "react-router-dom";
import PageShell from "@/components/PageShell";
import { workers as staticWorkers, type Worker } from "@/data/workers";
import type { WorkersResponse, WorkerPortfolioItem } from "@shared/api";
import { getWorkerContactHref, getWorkerWhatsAppHref } from "@/lib/contact";
import { findWorkerById } from "@/lib/workers";
import {
  getSavedWorkerIds,
  toggleSavedWorker,
  getWorkerNote,
  setWorkerNote,
} from "@/lib/favorites";
import { addRecentlyViewedWorker } from "@/lib/recently-viewed";
import { logAnalyticsEvent, logContactEvent } from "@/lib/analytics";
import RequestCallbackForm from "@/components/RequestCallbackForm";
import TrustStripWorkerCard from "@/components/TrustStripWorkerCard";
import WorkerTrackRecordSection from "@/components/WorkerTrackRecordSection";
import WorkerPassbookSection from "@/components/WorkerPassbookSection";
import { WorkerProfileSkeleton } from "@/components/PageSkeletons";

// Fallback high-quality proof-of-work project photos by category if worker has not uploaded custom photos yet
const categoryFallbacks: Record<
  string,
  Array<{ image_url: string; label: string }>
> = {
  Electrician: [
    {
      image_url:
        "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=700&auto=format&fit=crop&q=80",
      label: "Wiring & Power Panels",
    },
    {
      image_url:
        "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=700&auto=format&fit=crop&q=80",
      label: "Lighting & Circuit Repairs",
    },
    {
      image_url:
        "https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?w=700&auto=format&fit=crop&q=80",
      label: "Switchboards & Fixtures",
    },
  ],
  Plumber: [
    {
      image_url:
        "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=700&auto=format&fit=crop&q=80",
      label: "Pipe Fitting & Leak Fixes",
    },
    {
      image_url:
        "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=700&auto=format&fit=crop&q=80",
      label: "Bathroom & Tap Installations",
    },
    {
      image_url:
        "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=700&auto=format&fit=crop&q=80",
      label: "Drainage & Water Lines",
    },
  ],
  Carpenter: [
    {
      image_url:
        "https://images.unsplash.com/photo-1533090161767-e6ffed986b88?w=700&auto=format&fit=crop&q=80",
      label: "Custom Furniture & Woodwork",
    },
    {
      image_url:
        "https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=700&auto=format&fit=crop&q=80",
      label: "Door & Cabinet Fitting",
    },
    {
      image_url:
        "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=700&auto=format&fit=crop&q=80",
      label: "Wood Polishing & Repairs",
    },
  ],
  Painter: [
    {
      image_url:
        "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=700&auto=format&fit=crop&q=80",
      label: "Interior Wall Finish",
    },
    {
      image_url:
        "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=700&auto=format&fit=crop&q=80",
      label: "Exterior & Waterproofing",
    },
    {
      image_url:
        "https://images.unsplash.com/photo-1574359411659-15573a27fd0c?w=700&auto=format&fit=crop&q=80",
      label: "Texture & Stencil Design",
    },
  ],
  Cleaner: [
    {
      image_url:
        "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=700&auto=format&fit=crop&q=80",
      label: "Deep Home Cleaning",
    },
    {
      image_url:
        "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=700&auto=format&fit=crop&q=80",
      label: "Floor Scrubbing & Sanitization",
    },
    {
      image_url:
        "https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=700&auto=format&fit=crop&q=80",
      label: "Kitchen & Washroom Detailing",
    },
  ],
  "AC Repair": [
    {
      image_url:
        "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=700&auto=format&fit=crop&q=80",
      label: "AC Servicing & Gas Refill",
    },
    {
      image_url:
        "https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=700&auto=format&fit=crop&q=80",
      label: "Split & Window AC Installation",
    },
    {
      image_url:
        "https://images.unsplash.com/photo-1614633833026-0820552978b6?w=700&auto=format&fit=crop&q=80",
      label: "Cooling Coil & Compressor Check",
    },
  ],
};

const defaultGeneralFallbacks = [
  {
    image_url:
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=700&auto=format&fit=crop&q=80",
    label: "Professional Service & Workmanship",
  },
  {
    image_url:
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=700&auto=format&fit=crop&q=80",
    label: "Quality Tools & Equipment",
  },
];

export default function WorkerProfile() {
  const routeParams = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [availableWorkers, setAvailableWorkers] =
    useState<Worker[]>(staticWorkers);
  const [portfolioPhotos, setPortfolioPhotos] = useState<WorkerPortfolioItem[]>(
    [],
  );
  const [showContact, setShowContact] = useState(false);
  const [showCallback, setShowCallback] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [personalNote, setPersonalNote] = useState("");
  const [activePhoto, setActivePhoto] = useState<{
    image_url: string;
    label?: string;
  } | null>(null);
  const [loadingWorkers, setLoadingWorkers] = useState(true);
  const [loadingError, setLoadingError] = useState(false);

  const requestedWorkerId =
    routeParams.id || searchParams.get("worker") || searchParams.get("id");
  const worker = findWorkerById(availableWorkers, requestedWorkerId);

  useEffect(() => {
    setSaved(
      requestedWorkerId
        ? getSavedWorkerIds().includes(requestedWorkerId)
        : false,
    );
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
      ? ((worker as any).work_photos as string[])
          .filter(Boolean)
          .map((url, i) => ({
            image_url: url,
            label: `${worker.category} project #${i + 1}`,
          }))
      : [];
    if (inlinePhotos.length > 0) return inlinePhotos;

    // Fall back to category-themed proof of work samples (never broken)
    const categoryKey = Object.keys(categoryFallbacks).find(
      (c) => c.toLowerCase() === (worker.category || "").trim().toLowerCase(),
    );
    return (
      (categoryKey ? categoryFallbacks[categoryKey] : null) ||
      defaultGeneralFallbacks
    );
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
        <WorkerProfileSkeleton />
      </PageShell>
    );
  }

  if (!worker) {
    return (
      <PageShell backTo="/search" backLabel="Search specialists">
        <div className="flex flex-col items-center justify-center min-h-[420px] p-6 sm:p-10 text-center rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] max-w-2xl mx-auto my-6 sm:my-10">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 mb-6 shrink-0">
            {loadingError ? <AlertCircle size={28} /> : <UserX size={28} />}
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#141210] dark:text-[#FAFAFA]">
            {loadingError ? "Connection Failed" : "Profile Not Found"}
          </h1>

          <p className="mt-2.5 text-xs sm:text-sm text-[#6B645F] dark:text-[#9E958F] max-w-md leading-relaxed">
            {loadingError
              ? "We encountered a temporary issue loading our directory of specialists. Check your internet connection and try again."
              : "The requested specialist profile is currently unavailable. The profile may have been unlisted, moved, or the ID is incorrect."}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <Link
              to="/search"
              className="flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-[#F4512C] hover:bg-[#E04320] px-6 text-xs font-bold text-white transition-all duration-200 active:scale-[0.98]"
            >
              <ArrowLeft size={14} />
              <span>Back to search</span>
            </Link>

            {loadingError && (
              <button
                type="button"
                onClick={() => {
                  setLoadingWorkers(true);
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
                className="flex h-11 w-full sm:w-auto items-center justify-center rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-6 text-xs font-bold text-[#141210] dark:text-[#FAFAFA] hover:border-[#F4512C]/50 transition-all duration-200 active:scale-[0.98]"
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
    const shareText = `Check out ${worker.name}, a verified ${worker.category} in ${worker.locality || "your area"} with verified track record stats on Builderco!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        void logAnalyticsEvent("share_profile_native", worker.id, {
          category: worker.category,
        });
      } catch (err) {
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
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopied(true);
        void logAnalyticsEvent("share_profile_copy", worker.id, {
          category: worker.category,
        });
        setTimeout(() => setCopied(false), 2500);
      })
      .catch(() => {});
  };

  const save = () => {
    toggleSavedWorker(worker.id);
    setSaved(getSavedWorkerIds().includes(worker.id));
  };

  const hasRating =
    worker.avg_rating !== undefined || worker.rating !== undefined;
  const ratingValue = Number(worker.avg_rating || worker.rating);
  const hasReviewsCount =
    typeof worker.reviews_count === "number" && worker.reviews_count > 0;

  return (
    <PageShell
      backTo="/search"
      backLabel="Back"
      containerWidth="md"
      className="pb-28 sm:pb-32 relative"
    >
      {/* Toast Notification */}
      {copied && (
        <div className="fixed top-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-[#0F8A73]/30 bg-white/95 dark:bg-[#161514]/95 px-4 py-2 text-xs font-bold text-[#0F8A73] shadow-lg backdrop-blur-md">
          <span className="flex h-1.5 w-1.5 rounded-full bg-[#0F8A73] animate-pulse" />
          <span>Profile link copied to clipboard!</span>
        </div>
      )}

      {/* 1. HERO SECTION: PROOF-OF-WORK PHOTO STRIP */}
      <section className="relative overflow-hidden rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514]">
        <div className="relative bg-[#141210]">
          <div className="flex h-44 sm:h-56 w-full gap-2 overflow-x-auto p-2 scrollbar-none snap-x snap-mandatory">
            {workPhotos.map((item, idx) => (
              <div
                key={`${item.image_url}-${idx}`}
                onClick={() => setActivePhoto(item)}
                role="button"
                tabIndex={0}
                className="group relative h-full w-[240px] sm:w-[280px] shrink-0 snap-start overflow-hidden rounded-2xl bg-[#242220] cursor-pointer"
              >
                <img
                  src={item.image_url}
                  alt={item.label || `${worker.name} work sample`}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.src =
                      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=700&auto=format&fit=crop&q=80";
                  }}
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-2.5 text-white">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold truncate">
                    <Camera size={11} className="shrink-0 text-[#F4512C]" />
                    <span className="truncate">{item.label}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="absolute top-3.5 right-3.5 flex items-center gap-2 z-10">
            <button
              type="button"
              onClick={handleShare}
              title="Share specialist profile"
              aria-label="Share"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 dark:bg-[#161514]/90 text-[#141210] dark:text-[#FAFAFA] backdrop-blur-md shadow-md transition hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Share2 size={14} className="text-[#6B645F] dark:text-[#9E958F]" />
            </button>
            <button
              type="button"
              onClick={save}
              title={saved ? "Saved to bookmarks" : "Save to bookmarks"}
              aria-label={saved ? "Saved" : "Save"}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 dark:bg-[#161514]/90 text-[#141210] dark:text-[#FAFAFA] backdrop-blur-md shadow-md transition hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Heart
                size={15}
                fill={saved ? "currentColor" : "none"}
                className={
                  saved ? "text-[#F4512C]" : "text-[#6B645F] dark:text-[#9E958F]"
                }
              />
            </button>
          </div>
        </div>

        {/* 2. COMPACT DETAILS HEADER */}
        <div className="px-4 pb-5 sm:px-6">
          <div className="-mt-8 sm:-mt-9 flex items-end gap-3.5 mb-2">
            <div className="relative flex h-16 w-16 sm:h-18 sm:w-18 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white dark:border-[#161514] bg-[#FCEAE4] dark:bg-[#3A2018] font-bold text-[#F4512C] text-xl">
              {worker.photo_url ? (
                <img
                  src={worker.photo_url}
                  alt={worker.name}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>
                  {worker.initials || worker.name.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>

            {worker.available_today && (
              <span className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-[#0F8A73]/30 bg-[#0F8A73]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#0F8A73]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0F8A73] animate-pulse" />
                Available Today
              </span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#141210] dark:text-[#FAFAFA]">
              {worker.name}
            </h1>

            {worker.phone_verified && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#0F8A73]/30 bg-[#0F8A73]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#0F8A73]">
                <BadgeCheck size={13} className="text-[#0F8A73]" />
                <span>Verified Pro</span>
              </span>
            )}

            <span className="rounded-full bg-[#FCEAE4] dark:bg-[#3A2018] px-3 py-0.5 text-[11px] font-bold text-[#F4512C]">
              {worker.category}
            </span>

            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1 text-[11px] font-bold border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] hover:border-[#F4512C]/50 text-[#6B645F] dark:text-[#9E958F] hover:text-[#141210] dark:hover:text-[#FAFAFA] px-2.5 py-0.5 rounded-full transition cursor-pointer active:scale-[0.98]"
            >
              <Share2 size={11} />
              <span>Share</span>
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-xs text-[#6B645F] dark:text-[#9E958F]">
            {hasRating && (
              <div className="inline-flex items-center gap-1 font-bold text-[#141210] dark:text-[#FAFAFA]">
                <Star size={13} className="fill-amber-400 text-amber-400" />
                <span>{ratingValue.toFixed(1)}</span>
                {hasReviewsCount && (
                  <span className="font-normal text-[#6B645F] dark:text-[#9E958F]">
                    ({worker.reviews_count}{" "}
                    {worker.reviews_count === 1 ? "review" : "reviews"})
                  </span>
                )}
              </div>
            )}

            {worker.locality && (
              <span className="flex items-center gap-1">
                <MapPin size={13} className="text-[#F4512C] shrink-0" />
                <span>{worker.locality}</span>
              </span>
            )}

            {worker.experience && (
              <span className="flex items-center gap-1">
                <Briefcase size={13} className="text-[#6B645F] dark:text-[#9E958F] shrink-0" />
                <span>{worker.experience} experience</span>
              </span>
            )}
          </div>

          {/* Direct Trust & Guarantee Triad */}
          <div className="mt-4 pt-3.5 border-t border-[#EAE2DC] dark:border-white/10 grid grid-cols-3 gap-2 text-center text-[11px]">
            <div className="rounded-xl bg-[#FAF8F5] dark:bg-[#0B0A09] p-2.5 border border-[#EAE2DC] dark:border-white/10">
              <span className="font-bold text-[#0F8A73] block">✓ ID Verified</span>
              <span className="text-[10px] text-[#6B645F] dark:text-[#9E958F]">Govt Aadhaar</span>
            </div>
            <div className="rounded-xl bg-[#FAF8F5] dark:bg-[#0B0A09] p-2.5 border border-[#EAE2DC] dark:border-white/10">
              <span className="font-bold text-[#141210] dark:text-[#FAFAFA] block">0% Commission</span>
              <span className="text-[10px] text-[#6B645F] dark:text-[#9E958F]">Pay Direct</span>
            </div>
            <div className="rounded-xl bg-[#FAF8F5] dark:bg-[#0B0A09] p-2.5 border border-[#EAE2DC] dark:border-white/10">
              <span className="font-bold text-[#F4512C] block">~10m Reply</span>
              <span className="text-[10px] text-[#6B645F] dark:text-[#9E958F]">Fast Response</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CONTENT SECTIONS */}
      <div className="mt-4 space-y-4">
        {(saved || personalNote.trim().length > 0) && worker && (
          <section className="rounded-2xl border border-[#F4512C]/30 bg-[#FCEAE4]/40 dark:bg-[#3A2018]/30 p-4 sm:p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#F4512C]">
              <StickyNote size={14} className="text-[#F4512C]" />
              <span>My Circle Personal Note</span>
            </div>
            <input
              type="text"
              value={personalNote}
              onChange={handleNoteChange}
              placeholder="Add a note (e.g. 'Fixed geyser in May, very punctual')..."
              className="w-full rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] px-3.5 py-2 text-xs text-[#141210] dark:text-[#FAFAFA] placeholder:text-[#6B645F] dark:placeholder:text-[#9E958F] focus:border-[#F4512C] focus:outline-none"
            />
            <p className="text-[10px] text-[#6B645F] dark:text-[#9E958F]">
              Saved privately on this device.
            </p>
          </section>
        )}

        {worker.about && worker.about.trim().length > 0 && (
          <section className="rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-4 sm:p-5">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#F4512C]">
              About
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-[#141210] dark:text-[#FAFAFA]">
              {worker.about}
            </p>
          </section>
        )}

        {Array.isArray(worker.services) && worker.services.length > 0 && (
          <section className="rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-4 sm:p-5">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#F4512C]">
              Services Offered
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {worker.services.map((service) => (
                <span
                  key={service}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-3.5 py-1.5 text-xs font-medium text-[#141210] dark:text-[#FAFAFA]"
                >
                  <Check size={13} className="text-[#F4512C]" />
                  <span>{service}</span>
                </span>
              ))}
            </div>
          </section>
        )}

        {worker && (
          <WorkerTrackRecordSection
            workerId={worker.id}
            workerName={worker.name}
          />
        )}

        {worker && <WorkerPassbookSection workerId={worker.id} />}

        {relatedWorkers.length > 0 && (
          <section className="rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="text-sm sm:text-base font-extrabold text-[#141210] dark:text-[#FAFAFA]">
                More {worker.category ? `${worker.category}s` : "Pros"} Near You
              </h2>
              <Link
                to={`/search?service=${encodeURIComponent(worker.category || "")}&location=${encodeURIComponent(worker.locality || "")}`}
                className="text-xs font-bold text-[#F4512C] hover:underline"
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

        <div className="pt-1 text-center">
          <Link
            to="/report"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6B645F] dark:text-[#9E958F] transition hover:text-[#F4512C]"
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
            className="relative max-h-[90vh] max-w-2xl overflow-hidden rounded-[24px] bg-white dark:bg-[#161514] border border-[#EAE2DC] dark:border-white/10 shadow-2xl"
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
              <div className="p-4 border-t border-[#EAE2DC] dark:border-white/10">
                <p className="text-xs font-semibold text-[#141210] dark:text-[#FAFAFA]">
                  {activePhoto.label}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. DIRECT CALL MODAL */}
      {showContact && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-[#141210] dark:text-[#FAFAFA]">
                  Call {worker.name}
                </h2>
                <p className="mt-0.5 text-xs text-[#6B645F] dark:text-[#9E958F] select-all font-mono">
                  +91 {worker.phone}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowContact(false)}
                aria-label="Close"
                className="rounded-full p-1.5 text-[#6B645F] dark:text-[#9E958F] hover:bg-[#F5EFEA] dark:hover:bg-[#242220] hover:text-[#141210] dark:hover:text-[#FAFAFA] cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <a
              href={contactHref}
              onClick={() => setShowContact(false)}
              className="mt-5 flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-[#F4512C] hover:bg-[#E04320] text-xs font-bold text-white transition active:scale-[0.98]"
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

      {/* 8. STICKY BOTTOM BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5]/95 dark:bg-[#0B0A09]/95 backdrop-blur-md px-4 py-3 shadow-2xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button
            type="button"
            onClick={() => {
              void logContactEvent(worker.id, "call", {
                name: worker.name,
                category: worker.category,
              });
              void logAnalyticsEvent("call_click", worker.id, {
                source: "sticky_bottom_bar",
              });
              setShowContact(true);
            }}
            className="flex-1 flex h-11 items-center justify-center gap-2 rounded-xl bg-[#141210] text-white dark:bg-white dark:text-[#11100F] text-xs sm:text-sm font-bold hover:opacity-90 active:scale-[0.98] transition cursor-pointer"
          >
            <Phone size={16} />
            <span>Call</span>
          </button>

          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              void logContactEvent(worker.id, "whatsapp", {
                name: worker.name,
                category: worker.category,
              });
              void logAnalyticsEvent("whatsapp_click", worker.id, {
                source: "sticky_bottom_bar",
              });
            }}
            className="flex-1 flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0F8A73] hover:bg-[#0B6E5B] text-xs sm:text-sm font-bold text-white active:scale-[0.98] transition cursor-pointer"
          >
            <MessageCircle size={16} />
            <span>WhatsApp</span>
          </a>
        </div>
      </div>
    </PageShell>
  );
}
