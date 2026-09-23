import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  Star,
  MapPin,
  Phone,
  MessageCircle,
  Heart,
} from "lucide-react";
import type { Worker } from "@shared/workers";
import { getWorkerContactHref, getWorkerWhatsAppHref } from "@/lib/contact";
import { logAnalyticsEvent, logContactEvent } from "@/lib/analytics";
import { isWorkerSaved, toggleSavedWorker } from "@/lib/favorites";

interface TrustStripWorkerCardProps {
  worker: Worker;
}

export default function TrustStripWorkerCard({
  worker,
}: TrustStripWorkerCardProps) {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(() => isWorkerSaved(worker.id));

  useEffect(() => {
    const handleSavedChange = () => {
      setSaved(isWorkerSaved(worker.id));
    };
    window.addEventListener("saved-workers-changed", handleSavedChange);
    return () =>
      window.removeEventListener("saved-workers-changed", handleSavedChange);
  }, [worker.id]);

  const rating = Number(worker.avg_rating || worker.rating || 4.8);
  const reviewsCount = Number(worker.reviews_count || 18);
  const isVerified = Boolean(worker.phone_verified);

  const phoneHref = getWorkerContactHref(worker);
  const whatsappHref = getWorkerWhatsAppHref(worker);

  const handleClick = () => {
    navigate(`/worker?worker=${encodeURIComponent(worker.id)}`);
  };

  const handleToggleSaved = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSavedWorker(worker.id);
    setSaved(isWorkerSaved(worker.id));
  };

  const handleCall = (e: React.MouseEvent) => {
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

  const handleWhatsApp = (e: React.MouseEvent) => {
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
    <article
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className="group relative flex w-[210px] sm:w-[230px] shrink-0 snap-start flex-col justify-between rounded-[16px] border border-[#E7ECF1] dark:border-[#1F1F1F] bg-white dark:bg-[#0A0A0A] p-3.5 shadow-subtle transition-all hover:border-primary/50 hover:shadow-soft cursor-pointer select-none text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div>
        {/* Top Header with Avatar & Verified Badge & Heart Toggle */}
        <div className="flex items-start justify-between gap-2">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#E7ECF1] dark:border-[#1F1F1F] bg-[#F6F9FC] dark:bg-[#141414] text-sm font-bold text-primary shadow-subtle">
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

          <div className="flex items-center gap-1.5 shrink-0">
            {isVerified ? (
              <span
                title="Verified Pro"
                className="inline-flex items-center gap-1 rounded-full bg-primary-100/15 border border-primary-100/30 px-1.5 py-0.5 text-[9px] font-bold text-primary shrink-0"
              >
                <BadgeCheck size={10} className="text-primary" />
                <span>Verified</span>
              </span>
            ) : worker.available_today ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Available</span>
              </span>
            ) : null}

            {/* Bookmark / Heart Toggle Button */}
            <button
              type="button"
              onClick={handleToggleSaved}
              title={saved ? "Saved to My Circle" : "Save to My Circle"}
              aria-label={saved ? "Saved" : "Save"}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-[#E7ECF1] dark:border-[#262626] bg-white dark:bg-[#141414] text-[#67696D] dark:text-[#A1A1AA] hover:border-primary hover:text-primary transition shadow-subtle active:scale-95 cursor-pointer"
            >
              <Heart
                size={12}
                className={
                  saved ? "text-primary fill-primary" : "text-[#989EA7]"
                }
              />
            </button>
          </div>
        </div>

        {/* Worker Name & Category */}
        <div className="mt-2.5">
          <h3 className="truncate text-sm font-bold text-[#2C2C2C] dark:text-[#F4F4F5] group-hover:text-primary transition-colors">
            {worker.name}
          </h3>
          <p className="truncate text-xs font-semibold text-primary mt-0.5">
            {worker.category}
          </p>
        </div>

        {/* Rating & Locality */}
        <div className="mt-2 flex items-center justify-between gap-1 text-xs">
          <div className="inline-flex items-center gap-1 text-[#2C2C2C] dark:text-[#F4F4F5] font-bold">
            <Star size={12} className="fill-amber-400 text-amber-400" />
            <span>{rating.toFixed(1)}</span>
            <span className="text-[10px] font-normal text-[#67696D] dark:text-[#A1A1AA]">
              ({reviewsCount})
            </span>
          </div>

          {worker.locality && (
            <div className="inline-flex items-center gap-0.5 text-[11px] text-[#67696D] dark:text-[#A1A1AA] truncate max-w-[95px]">
              <MapPin size={10} className="shrink-0 text-primary" />
              <span className="truncate">{worker.locality}</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Contact & Info Footer */}
      <div className="mt-3 pt-2.5 border-t border-[#E7ECF1] dark:border-[#1F1F1F] flex items-center justify-between gap-2">
        <span className="text-[11px] text-[#67696D] dark:text-[#A1A1AA] truncate">
          {worker.experience ? `${worker.experience} exp` : "Profile"}
        </span>

        {/* Quick Contact Icons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleCall}
            title={`Call ${worker.name}`}
            aria-label={`Call ${worker.name}`}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-[#E7ECF1] dark:border-[#262626] bg-white dark:bg-[#141414] text-[#2C2C2C] dark:text-[#F4F4F5] hover:border-primary hover:text-primary hover:bg-primary-100/10 transition shadow-subtle active:scale-95 cursor-pointer"
          >
            <Phone size={12} />
          </button>

          <button
            type="button"
            onClick={handleWhatsApp}
            title={`WhatsApp ${worker.name}`}
            aria-label={`WhatsApp ${worker.name}`}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-white transition shadow-subtle active:scale-95 cursor-pointer"
          >
            <MessageCircle size={12} />
          </button>
        </div>
      </div>
    </article>
  );
}
