import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  Star,
  MapPin,
  Phone,
  MessageCircle,
  Heart,
  Clock,
} from "lucide-react";
import type { Worker } from "@shared/workers";
import { getWorkerContactHref, getWorkerWhatsAppHref } from "@/lib/contact";
import { logAnalyticsEvent, logContactEvent } from "@/lib/analytics";
import { isWorkerSaved, toggleSavedWorker } from "@/lib/favorites";
import { getComputedWorkerRating } from "@/lib/ratings";
import RateWorkerModal from "./RateWorkerModal";

interface TrustStripWorkerCardProps {
  worker: Worker;
}

export default function TrustStripWorkerCard({
  worker,
}: TrustStripWorkerCardProps) {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(() => isWorkerSaved(worker.id));
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);

  // Reactive computed rating & review count based on base worker data + customer reviews
  const [ratingStats, setRatingStats] = useState(() =>
    getComputedWorkerRating(worker)
  );

  useEffect(() => {
    const handleSavedChange = () => {
      setSaved(isWorkerSaved(worker.id));
    };
    const handleRatingUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ workerId: string }>;
      if (!customEvent.detail || customEvent.detail.workerId === worker.id) {
        setRatingStats(getComputedWorkerRating(worker));
      }
    };

    window.addEventListener("saved-workers-changed", handleSavedChange);
    window.addEventListener("worker-rating-updated", handleRatingUpdate);
    return () => {
      window.removeEventListener("saved-workers-changed", handleSavedChange);
      window.removeEventListener("worker-rating-updated", handleRatingUpdate);
    };
  }, [worker]);

  const phoneHref = getWorkerContactHref(worker);
  const whatsappHref = getWorkerWhatsAppHref(worker);

  const services = Array.isArray(worker.services) ? worker.services : [];
  const isAvailableToday = Boolean(worker.available_today);

  const handleToggleSaved = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSavedWorker(worker.id);
    setSaved(isWorkerSaved(worker.id));
  };

  const handleRateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRateModalOpen(true);
  };

  const handleQuickCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    void logContactEvent(worker.id, "call", {
      name: worker.name,
      category: worker.category,
    });
    void logAnalyticsEvent("call_click", worker.id, {
      source: "card_quick_action",
    });
    window.location.href = phoneHref;
  };

  const handleQuickWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    void logContactEvent(worker.id, "whatsapp", {
      name: worker.name,
      category: worker.category,
    });
    void logAnalyticsEvent("whatsapp_click", worker.id, {
      source: "card_quick_action",
    });
    window.open(whatsappHref, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <article
        onClick={() => navigate(`/worker?worker=${encodeURIComponent(worker.id)}`)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            navigate(`/worker?worker=${encodeURIComponent(worker.id)}`);
          }
        }}
        tabIndex={0}
        role="button"
        aria-label={`View profile of ${worker.name}`}
        className="rounded-[22px] border border-[#F0E2DA] dark:border-[#342A27] bg-white dark:bg-[#171719] p-4 shadow-[0_4px_16px_rgba(67,44,32,0.05)] flex flex-col justify-between hover:border-[#F4A58E] transition-all duration-200 group w-full h-full cursor-pointer select-none"
      >
        <div>
          {/* Header with Avatar, Name, Verification, Rating & Bookmark */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h4
                    className="text-sm sm:text-base font-bold text-[#09090B] dark:text-[#FAFAFA] group-hover:text-black dark:group-hover:text-white transition truncate"
                    title={worker.name}
                  >
                    {worker.name}
                  </h4>
                  <BadgeCheck size={15} className="text-emerald-500 shrink-0" />
                </div>
                <p className="text-xs font-medium text-[#71717A] dark:text-[#A1A1AA] truncate mt-0.5">
                  {worker.category}{worker.experience ? ` · ${worker.experience}` : ""}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Clickable Customer Rating System */}
              {ratingStats.reviewsCount > 0 && <button
                type="button"
                onClick={handleRateClick}
                title="Click to rate this professional"
                className="group/rate flex items-center gap-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 px-2 py-1 text-xs font-bold text-amber-700 dark:text-amber-400 transition cursor-pointer border border-amber-500/20"
                aria-label={`Rating: ${ratingStats.rating.toFixed(1)}. Click to rate ${worker.name}`}
              >
                <Star size={12} className="fill-amber-400 text-amber-400 group-hover/rate:scale-110 transition-transform" />
                <span>{ratingStats.rating.toFixed(1)}</span>
                <span className="text-[11px] font-normal opacity-80">
                  ({ratingStats.reviewsCount})
                </span>
              </button>}

              {/* Heart Bookmark */}
              <button
                type="button"
                onClick={handleToggleSaved}
                className="text-[#71717A] hover:text-rose-500 transition p-1 cursor-pointer"
                aria-label={saved ? `Unsave ${worker.name}` : `Save ${worker.name}`}
              >
                <Heart
                  size={15}
                  className={saved ? "text-rose-500 fill-rose-500" : ""}
                />
              </button>
            </div>
          </div>

          {/* Location & Availability Status */}
          <div className="mt-3 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-[#52525B] dark:text-[#A1A1AA] text-xs">
              <span className="flex items-center gap-1.5 font-medium truncate max-w-[150px]">
                <MapPin size={12} className="shrink-0 text-[#71717A]" />
                <span className="truncate">{worker.locality || "Location not provided"}</span>
              </span>
              <span
                className={`font-semibold inline-flex items-center gap-1 ${
                  isAvailableToday
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-[#71717A] dark:text-[#A1A1AA]"
                }`}
              >
                <Clock size={11} />
                <span>{isAvailableToday ? "Available today" : "Book ahead"}</span>
              </span>
            </div>

            {worker.about && <p className="text-xs text-[#52525B] dark:text-[#D4D4D8] line-clamp-1 leading-relaxed">{worker.about}</p>}
          </div>

          {/* Services Tags */}
          {services.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {services.slice(0, 2).map((s, idx) => (
                <span
                  key={idx}
                  className="rounded-md bg-neutral-100 dark:bg-white/5 border border-[#E4E4E7] dark:border-white/5 px-2 py-0.5 text-[11px] text-[#52525B] dark:text-[#D4D4D8] font-medium truncate max-w-[120px]"
                >
                  {s}
                </span>
              ))}
              {services.length > 2 && (
                <span className="text-[11px] text-[#71717A] dark:text-[#A1A1AA] self-center font-medium">
                  +{services.length - 2} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-3.5 pt-3 border-t border-[#E4E4E7] dark:border-[#27272A] flex items-center gap-2">
          {whatsappHref && (
            <button
              type="button"
              onClick={handleQuickWhatsApp}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#128C7E] hover:bg-[#075E54] text-white py-2 text-xs font-bold shadow-xs transition cursor-pointer active:scale-95"
            >
              <MessageCircle size={13} />
              <span>WhatsApp</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleQuickCall}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#09090B] hover:bg-neutral-800 text-white dark:bg-[#FAFAFA] dark:hover:bg-neutral-200 dark:text-[#09090B] py-2 text-xs font-bold shadow-xs transition cursor-pointer active:scale-95"
          >
            <Phone size={12} />
            <span>Call</span>
          </button>
        </div>
      </article>

      {/* Customer Rating Modal */}
      <RateWorkerModal
        worker={worker}
        isOpen={isRateModalOpen}
        onClose={() => setIsRateModalOpen(false)}
        onRatingSuccess={() => {
          setRatingStats(getComputedWorkerRating(worker));
        }}
      />
    </>
  );
}
