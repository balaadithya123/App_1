import { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  MapPin,
  CheckCircle2,
  Phone,
  MessageCircle,
  BadgeCheck,
  Star,
  Zap,
  Wrench,
  Hammer,
  Paintbrush,
  Brush,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  Loader2,
  Heart,
} from "lucide-react";
import type { Worker } from "@shared/workers";
import type { PostNeedResponse } from "@shared/api";
import { getStandardLocation } from "@/lib/location";
import { logAnalyticsEvent, logContactEvent } from "@/lib/analytics";
import { isWorkerSaved, toggleSavedWorker } from "@/lib/favorites";

// Existing service categories supported by the app
const SERVICE_CATEGORIES = [
  "Electrician",
  "Plumber",
  "Carpenter",
  "Painter",
  "Cleaner",
  "AC Repair",
  "Mason",
  "General Repair",
];

interface PostNeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: string;
  initialLocation?: string;
}

export default function PostNeedModal({
  isOpen,
  onClose,
  initialCategory = "Electrician",
  initialLocation = "",
}: PostNeedModalProps) {
  const [category, setCategory] = useState(initialCategory);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState(initialLocation || getStandardLocation() || "Coimbatore");
  const [customerPhone, setCustomerPhone] = useState("");

  const [step, setStep] = useState<"form" | "results">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [matchedWorkers, setMatchedWorkers] = useState<Worker[]>([]);
  const [notifiedWorkerIds, setNotifiedWorkerIds] = useState<Record<string, boolean>>({});

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setCategory(initialCategory && SERVICE_CATEGORIES.includes(initialCategory) ? initialCategory : "Electrician");
      setLocation(initialLocation || getStandardLocation() || "Coimbatore");
      setDescription("");
      setStep("form");
      setError(null);
      setMatchedWorkers([]);
      setNotifiedWorkerIds({});
    }
  }, [isOpen, initialCategory, initialLocation]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError("Please provide a short description of what you need.");
      return;
    }
    if (!location.trim()) {
      setError("Please enter your locality / area.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/workers/post-a-need", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          description: description.trim(),
          location: location.trim(),
          customerPhone: customerPhone.trim() || undefined,
        }),
      });

      const data = (await response.json()) as PostNeedResponse | { message?: string };

      if (!response.ok) {
        throw new Error("message" in data && data.message ? data.message : "Unable to find matches");
      }

      const results = "matchedWorkers" in data ? data.matchedWorkers : [];
      setMatchedWorkers(results);
      setStep("results");
      void logAnalyticsEvent("post_a_need_matches_found", null, {
        category,
        location,
        count: results.length,
      });
    } catch (err) {
      console.error("[PostNeedModal] Error:", err);
      setError(err instanceof Error ? err.message : "Unable to post your need right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleNotifyWhatsApp = async (worker: Worker) => {
    // Record lead in backend (monetization scaffold: increments leadsReceived)
    try {
      void fetch(`/api/workers/${encodeURIComponent(worker.id)}/lead`, {
        method: "POST",
      });
      void logContactEvent(worker.id, "whatsapp");
      void logAnalyticsEvent("post_a_need_whatsapp_notify", worker.id, {
        category,
        location,
      });
    } catch {}

    // Format WhatsApp deep link
    const cleanPhone = worker.phone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const textMessage = `Hi ${worker.name}, I need a ${category}: "${description.trim()}". Location: ${location.trim()}.${
      customerPhone.trim() ? ` Please contact me at ${customerPhone.trim()}.` : ""
    } (Found via LocalWorker)`;

    const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(textMessage)}`;

    // Mark as notified in state
    setNotifiedWorkerIds((prev) => ({ ...prev, [worker.id]: true }));

    // Open WhatsApp
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg rounded-t-[24px] sm:rounded-[24px] border border-[#E7ECF1] dark:border-[#222222] bg-white dark:bg-[#0A0A0A] p-5 sm:p-6 shadow-soft max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 text-[#2C2C2C] dark:text-[#F4F4F5]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#E7ECF1] dark:border-[#1F1F1F] shrink-0">
          <div className="flex items-center gap-2">
            {step === "results" ? (
              <button
                type="button"
                onClick={() => setStep("form")}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-[#E7ECF1] dark:border-[#222222] bg-[#F6F9FC] dark:bg-[#141414] text-[#67696D] dark:text-[#A1A1AA] hover:text-[#2C2C2C] dark:hover:text-white transition cursor-pointer"
                title="Back to request form"
              >
                <ArrowLeft size={14} />
              </button>
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100/20 text-primary">
                <Sparkles size={16} />
              </div>
            )}
            <div>
              <h2 className="text-base font-bold tracking-tight">
                {step === "form" ? "Post a Need" : "Matched Professionals"}
              </h2>
              <p className="text-[11px] font-medium text-[#67696D] dark:text-[#A1A1AA]">
                {step === "form"
                  ? "Describe what you need & reach nearby pros"
                  : `${matchedWorkers.length} top pros matched for ${category}`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E7ECF1] dark:border-[#222222] bg-[#F6F9FC] dark:bg-[#141414] text-[#989EA7] dark:text-[#71717A] hover:text-[#2C2C2C] dark:hover:text-white transition cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto py-4 space-y-4 flex-1 scrollbar-thin">
          {error && (
            <div className="rounded-[12px] bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 p-3 text-xs font-semibold text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {step === "form" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category Selection */}
              <div>
                <label className="block text-xs font-bold text-[#2C2C2C] dark:text-[#F4F4F5] mb-1.5">
                  Category
                </label>
                <div className="relative">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full appearance-none rounded-[12px] border border-[#E7ECF1] dark:border-[#222222] bg-[#F6F9FC] dark:bg-[#141414] px-3.5 py-2.5 text-xs font-semibold text-[#2C2C2C] dark:text-[#F4F4F5] outline-none transition focus:border-primary focus:bg-white dark:focus:bg-[#0A0A0A] focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  >
                    {SERVICE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <ChevronRight
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-[#989EA7] pointer-events-none"
                  />
                </div>
              </div>

              {/* Short Description */}
              <div>
                <label className="block text-xs font-bold text-[#2C2C2C] dark:text-[#F4F4F5] mb-1.5">
                  Short Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Tap in kitchen leaking, Need ceiling fan installation"
                  maxLength={120}
                  className="w-full rounded-[12px] border border-[#E7ECF1] dark:border-[#222222] bg-[#F6F9FC] dark:bg-[#141414] px-3.5 py-2.5 text-xs font-medium text-[#2C2C2C] dark:text-[#F4F4F5] placeholder:text-[#989EA7] dark:placeholder:text-[#71717A] outline-none transition focus:border-primary focus:bg-white dark:focus:bg-[#0A0A0A] focus:ring-2 focus:ring-primary/20"
                  autoFocus
                />
                <span className="text-[10px] text-[#989EA7] mt-1 block">
                  Keep it brief so workers understand the job instantly.
                </span>
              </div>

              {/* Location / Area */}
              <div>
                <label className="block text-xs font-bold text-[#2C2C2C] dark:text-[#F4F4F5] mb-1.5">
                  Area / Locality
                </label>
                <div className="relative flex items-center">
                  <MapPin size={14} className="absolute left-3 text-primary pointer-events-none shrink-0" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. RS Puram, Gandhipuram"
                    className="w-full rounded-[12px] border border-[#E7ECF1] dark:border-[#222222] bg-[#F6F9FC] dark:bg-[#141414] pl-9 pr-3.5 py-2.5 text-xs font-medium text-[#2C2C2C] dark:text-[#F4F4F5] placeholder:text-[#989EA7] dark:placeholder:text-[#71717A] outline-none transition focus:border-primary focus:bg-white dark:focus:bg-[#0A0A0A] focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Optional Customer Phone Number */}
              <div>
                <label className="block text-xs font-bold text-[#2C2C2C] dark:text-[#F4F4F5] mb-1.5">
                  Your Phone Number <span className="font-normal text-[#989EA7]">(Optional)</span>
                </label>
                <div className="relative flex items-center">
                  <Phone size={14} className="absolute left-3 text-[#989EA7] pointer-events-none shrink-0" />
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. 9876543210 (included in message for worker callback)"
                    className="w-full rounded-[12px] border border-[#E7ECF1] dark:border-[#222222] bg-[#F6F9FC] dark:bg-[#141414] pl-9 pr-3.5 py-2.5 text-xs font-medium text-[#2C2C2C] dark:text-[#F4F4F5] placeholder:text-[#989EA7] dark:placeholder:text-[#71717A] outline-none transition focus:border-primary focus:bg-white dark:focus:bg-[#0A0A0A] focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Action Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-full bg-primary py-3 px-5 text-xs font-bold text-white shadow-subtle hover:bg-[#157ad4] active:scale-[0.98] transition cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 size={15} className="animate-spin text-white" />
                      <span>Matching nearby pros...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} />
                      <span>Match Nearby Workers</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Results Step */
            <div className="space-y-3">
              {/* Request Summary Badge */}
              <div className="flex items-center justify-between rounded-[14px] border border-[#E7ECF1] dark:border-[#222222] bg-[#F6F9FC] dark:bg-[#141414] p-3 text-xs">
                <div>
                  <span className="font-bold text-[#2C2C2C] dark:text-[#F4F4F5]">Need: </span>
                  <span className="font-medium text-primary">{category}</span>
                  <p className="text-[11px] text-[#67696D] dark:text-[#A1A1AA] truncate max-w-[260px] sm:max-w-[320px] mt-0.5">
                    "{description}" • {location}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep("form")}
                  className="text-xs font-semibold text-primary hover:underline cursor-pointer shrink-0"
                >
                  Edit Need
                </button>
              </div>

              {/* Matched Workers Cards */}
              {matchedWorkers.length === 0 ? (
                <div className="rounded-[16px] border border-[#E7ECF1] dark:border-[#222222] bg-white dark:bg-[#0A0A0A] p-6 text-center">
                  <p className="text-xs font-medium text-[#67696D]">
                    No workers matched your criteria in this area. Try selecting another area or category.
                  </p>
                  <button
                    type="button"
                    onClick={() => setStep("form")}
                    className="mt-3 inline-flex items-center gap-1 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-white shadow-subtle hover:bg-[#157ad4] cursor-pointer"
                  >
                    <span>Change location/category</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {matchedWorkers.map((worker) => {
                    const rating = Number(worker.avg_rating || worker.rating || 4.8);
                    const reviewsCount = Number(worker.reviews_count || 18);
                    const isVerified = Boolean(worker.phone_verified);
                    const isNotified = Boolean(notifiedWorkerIds[worker.id]);
                    const isSaved = isWorkerSaved(worker.id);

                    const handleToggleSave = (e: React.MouseEvent) => {
                      e.stopPropagation();
                      toggleSavedWorker(worker.id);
                      setNotifiedWorkerIds((prev) => ({ ...prev })); // trigger re-render
                    };

                    return (
                      <article
                        key={worker.id}
                        className="rounded-[16px] border border-[#E7ECF1] dark:border-[#1F1F1F] bg-white dark:bg-[#0A0A0A] p-3.5 shadow-subtle transition-all hover:border-primary/40 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            {/* Avatar */}
                            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#E7ECF1] dark:border-[#1F1F1F] bg-[#F6F9FC] dark:bg-[#141414] text-xs font-bold text-primary shadow-subtle">
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

                            {/* Worker Info */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h3 className="truncate text-xs sm:text-sm font-bold text-[#2C2C2C] dark:text-[#F4F4F5]">
                                  {worker.name}
                                </h3>
                                {isVerified && (
                                  <span className="inline-flex items-center gap-0.5 rounded-full bg-primary-100/15 border border-primary-100/30 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                                    <BadgeCheck size={10} className="text-primary" />
                                    <span>Verified</span>
                                  </span>
                                )}
                              </div>

                              <p className="text-[11px] font-semibold text-primary truncate mt-0.5">
                                {worker.category} • {worker.experience ? `${worker.experience} exp` : "Local pro"}
                              </p>

                              <div className="mt-1 flex items-center gap-2 text-[11px] text-[#67696D] dark:text-[#A1A1AA]">
                                <div className="inline-flex items-center gap-0.5 font-bold text-[#2C2C2C] dark:text-[#F4F4F5]">
                                  <Star size={11} className="fill-amber-400 text-amber-400" />
                                  <span>{rating.toFixed(1)}</span>
                                  <span className="font-normal text-[10px] text-[#67696D]">({reviewsCount})</span>
                                </div>
                                {worker.locality && (
                                  <div className="inline-flex items-center gap-0.5 truncate max-w-[120px]">
                                    <MapPin size={10} className="shrink-0 text-primary" />
                                    <span className="truncate">{worker.locality}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Save / Bookmark Button */}
                          <button
                            type="button"
                            onClick={handleToggleSave}
                            aria-label={isSaved ? `Remove ${worker.name} from My Circle` : `Save ${worker.name} to My Circle`}
                            title={isSaved ? "Saved to My Circle" : "Save to My Circle"}
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-[#E7ECF1] dark:border-[#262626] bg-white dark:bg-[#141414] text-[#67696D] dark:text-[#A1A1AA] hover:border-primary hover:text-primary transition shadow-subtle active:scale-95 cursor-pointer shrink-0"
                          >
                            <Heart
                              size={13}
                              className={isSaved ? "text-primary fill-primary" : "text-[#989EA7]"}
                            />
                          </button>
                        </div>

                        {/* WhatsApp Action Button */}
                        <div className="pt-2 border-t border-[#E7ECF1] dark:border-[#1F1F1F] flex items-center justify-between gap-2">
                          <span className="text-[10px] text-[#989EA7]">
                            Direct WhatsApp connection
                          </span>

                          <button
                            type="button"
                            onClick={() => handleNotifyWhatsApp(worker)}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold text-white transition shadow-subtle active:scale-95 cursor-pointer ${
                              isNotified
                                ? "bg-emerald-700 hover:bg-emerald-800"
                                : "bg-[#25D366] hover:bg-[#20ba5a]"
                            }`}
                          >
                            {isNotified ? (
                              <>
                                <CheckCircle2 size={13} />
                                <span>WhatsApp Opened</span>
                              </>
                            ) : (
                              <>
                                <MessageCircle size={13} />
                                <span>Notify on WhatsApp</span>
                              </>
                            )}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
