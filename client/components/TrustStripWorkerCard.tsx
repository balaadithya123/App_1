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
import { useLanguage } from "@/lib/i18n";
import RateWorkerModal from "./RateWorkerModal";

interface TrustStripWorkerCardProps {
  worker: Worker;
}

export default function TrustStripWorkerCard({
  worker,
}: TrustStripWorkerCardProps) {
  const navigate = useNavigate();
  const { t, translateCategory } = useLanguage();
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
        className="rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 flex flex-col justify-between hover:border-[#F4512C]/50 transition-all duration-200 group w-full h-full cursor-pointer select-none shadow-2xs"
      >
        <div>
          {/* Header with Name, Verification, Rating & Bookmark */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h4
                  className="text-base font-bold text-[#141210] dark:text-white transition truncate"
                  title={worker.name}
                >
                  {worker.name}
                </h4>
                <BadgeCheck size={16} className="text-emerald-500 shrink-0" />
              </div>
              <p className="text-xs font-medium text-[#6B645F] dark:text-[#9E958F] truncate mt-0.5">
                {translateCategory(worker.category)}{worker.experience ? ` · ${worker.experience}` : ""}
              </p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {ratingStats.reviewsCount > 0 && (
                <button
                  type="button"
                  onClick={handleRateClick}
                  title="Click to rate this professional"
                  className="group/rate flex items-center gap-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 px-2 py-1 text-xs font-bold text-amber-600 dark:text-amber-400 transition cursor-pointer border border-amber-500/20"
                  aria-label={`Rating: ${ratingStats.rating.toFixed(1)}. Click to rate ${worker.name}`}
                >
                  <Star size={12} className="fill-amber-400 text-amber-400 group-hover/rate:scale-110 transition-transform" />
                  <span>{ratingStats.rating.toFixed(1)}</span>
                  <span className="text-[11px] font-normal opacity-80">
                    ({ratingStats.reviewsCount})
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={handleToggleSaved}
                className="text-[#8C847E] hover:text-rose-500 transition p-1 cursor-pointer"
                aria-label={saved ? `Unsave ${worker.name}` : `Save ${worker.name}`}
              >
                <Heart
                  size={16}
                  className={saved ? "text-rose-500 fill-rose-500" : ""}
                />
              </button>
            </div>
          </div>

          {/* Location & Availability Status */}
          <div className="mt-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between text-[#6B645F] dark:text-[#A19994] text-xs">
              <span className="flex items-center gap-1.5 font-medium truncate max-w-[160px]">
                <MapPin size={13} className="shrink-0 text-[#8C847E]" />
                <span className="truncate">{worker.locality || t("card.locationMissing")}</span>
              </span>
              <span
                className={`font-medium inline-flex items-center gap-1 shrink-0 ${
                  isAvailableToday
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-[#8C847E] dark:text-[#9E958F]"
                }`}
              >
                <Clock size={12} />
                <span>{isAvailableToday ? t("card.availableToday") : t("card.bookAhead")}</span>
              </span>
            </div>

            {worker.about && (
              <p className="text-xs text-[#524B47] dark:text-[#D4CFCB] line-clamp-1 leading-relaxed">
                {worker.about}
              </p>
            )}
          </div>

          {/* Services Tags */}
          {services.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {services.slice(0, 2).map((s, idx) => (
                <span
                  key={idx}
                  className="rounded-full bg-[#F5EFEA] dark:bg-[#242220] border border-[#EAE2DC] dark:border-white/10 px-3 py-0.5 text-[11px] text-[#524B47] dark:text-[#D4CFCB] font-medium truncate max-w-[140px]"
                >
                  {s}
                </span>
              ))}
              {services.length > 2 && (
                <span className="text-[11px] text-[#8C847E] dark:text-[#9E958F] self-center font-medium px-1">
                  {t("card.more", { count: services.length - 2 })}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-4 pt-3.5 border-t border-[#EAE2DC] dark:border-white/10 flex items-center gap-2.5">
          {whatsappHref && (
            <button
              type="button"
              onClick={handleQuickWhatsApp}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0F8A73] hover:bg-[#0B6E5B] text-white py-2.5 text-xs font-bold transition cursor-pointer active:scale-95"
            >
              <MessageCircle size={14} />
              <span>{t("card.whatsapp")}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleQuickCall}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#141210] hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-[#11100F] py-2.5 text-xs font-bold transition cursor-pointer active:scale-95"
          >
            <Phone size={13} />
            <span>{t("card.call")}</span>
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
