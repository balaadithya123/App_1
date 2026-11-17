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
  ArrowLeft,
  ChevronRight,
  Loader2,
  Heart,
} from "lucide-react";
import type { Worker } from "@shared/workers";
import type { PostNeedResponse } from "@shared/api";
import { getStandardLocation } from "@/lib/location";
import { logAnalyticsEvent, logContactEvent } from "@/lib/analytics";
import { isWorkerSaved, toggleSavedWorker } from "@/lib/favorites";

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
  const [location, setLocation] = useState(
    initialLocation || getStandardLocation() || "Coimbatore",
  );
  const [customerPhone, setCustomerPhone] = useState("");

  const [step, setStep] = useState<"form" | "results">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [matchedWorkers, setMatchedWorkers] = useState<Worker[]>([]);
  const [notifiedWorkerIds, setNotifiedWorkerIds] = useState<
    Record<string, boolean>
  >({});

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setCategory(
        initialCategory && SERVICE_CATEGORIES.includes(initialCategory)
          ? initialCategory
          : "Electrician",
      );
      setLocation(initialLocation || getStandardLocation() || "Coimbatore");
      setDescription("");
      setStep("form");
      setError(null);
      setMatchedWorkers([]);
      setNotifiedWorkerIds({});
    }
  }, [isOpen, initialCategory, initialLocation]);

  // Keyboard Escape listener and background scroll lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !loading) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError("Please briefly describe what work you need done.");
      return;
    }
    if (!location.trim()) {
      setError("Please specify your locality or area.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      void logAnalyticsEvent("post_need_submitted", null, {
        category,
        location,
        hasPhone: Boolean(customerPhone.trim()),
      });

      const res = await fetch("/api/needs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          description: description.trim(),
          location: location.trim(),
          customer_phone: customerPhone.trim() || undefined,
        }),
      });

      const data = (await res.json()) as PostNeedResponse;
      if (!res.ok) {
        throw new Error("Failed to post your request");
      }

      setMatchedWorkers(data.matchedWorkers || []);
      setStep("results");
    } catch (err: any) {
      setError(
        err.message ||
          "Unable to connect to the server. Please try again in a moment.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleNotifyWhatsApp = (worker: Worker) => {
    const rawPhone = worker.phone || "";
    const cleanPhone = rawPhone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.startsWith("91")
      ? cleanPhone
      : `91${cleanPhone}`;

    void logContactEvent(worker.id, "whatsapp", {
      name: worker.name,
      category: worker.category,
    });

    void logAnalyticsEvent("whatsapp_click", worker.id, {
      source: "post_need_match",
      needCategory: category,
    });

    const textMessage = `Hi ${worker.name}, I need a ${category}: "${description.trim()}". Location: ${location.trim()}.${
      customerPhone.trim()
        ? ` Please contact me at ${customerPhone.trim()}.`
        : ""
    } (Found via Builderco)`;

    const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(textMessage)}`;

    setNotifiedWorkerIds((prev) => ({ ...prev, [worker.id]: true }));
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-need-modal-title"
      aria-describedby="post-need-modal-desc"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-lg rounded-t-[24px] sm:rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 sm:p-6 shadow-2xl max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 text-[#141210] dark:text-[#FAFAFA]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#EAE2DC] dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            {step === "results" ? (
              <button
                type="button"
                onClick={() => setStep("form")}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] text-[#6B645F] dark:text-[#9E958F] hover:text-[#141210] dark:hover:text-white transition cursor-pointer"
                title="Back to request form"
              >
                <ArrowLeft size={14} />
              </button>
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C] font-bold text-xs">
                <Sparkles size={15} />
              </div>
            )}
            <div>
              <h2
                id="post-need-modal-title"
                className="text-base font-bold tracking-tight"
              >
                {step === "form" ? "Post a Need" : "Matched Professionals"}
              </h2>
              <p
                id="post-need-modal-desc"
                className="text-[11px] font-medium text-[#6B645F] dark:text-[#9E958F]"
              >
                {step === "form"
                  ? "Describe what you need & reach nearby pros"
                  : `${matchedWorkers.length} top pros matched for ${category}`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] text-[#6B645F] dark:text-[#9E958F] hover:text-[#141210] dark:hover:text-white transition cursor-pointer"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto py-4 space-y-4 flex-1 scrollbar-thin">
          {error && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 p-3 text-xs font-semibold text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {step === "form" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category Selection */}
              <div>
                <label className="block text-xs font-bold text-[#141210] dark:text-[#FAFAFA] mb-1.5">
                  Category
                </label>
                <div className="relative">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-3.5 py-2.5 text-xs font-semibold text-[#141210] dark:text-[#FAFAFA] outline-none transition focus:border-[#F4512C] focus:ring-2 focus:ring-[#F4512C]/20 cursor-pointer"
                  >
                    {SERVICE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <ChevronRight
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-[#6B645F] dark:text-[#9E958F] pointer-events-none"
                  />
                </div>
              </div>

              {/* Short Description */}
              <div>
                <label className="block text-xs font-bold text-[#141210] dark:text-[#FAFAFA] mb-1.5">
                  Short Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Tap in kitchen leaking, Need ceiling fan installation"
                  maxLength={120}
                  className="w-full rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-3.5 py-2.5 text-xs font-medium text-[#141210] dark:text-[#FAFAFA] placeholder:text-[#8C847E] dark:placeholder:text-[#766F6A] outline-none transition focus:border-[#F4512C] focus:ring-2 focus:ring-[#F4512C]/20"
                  autoFocus
                />
                <span className="text-[10px] text-[#6B645F] dark:text-[#9E958F] mt-1 block">
                  Keep it brief so workers understand the job instantly.
                </span>
              </div>

              {/* Location / Area */}
              <div>
                <label className="block text-xs font-bold text-[#141210] dark:text-[#FAFAFA] mb-1.5">
                  Area / Locality
                </label>
                <div className="relative flex items-center">
                  <MapPin
                    size={14}
                    className="absolute left-3 text-[#F4512C] pointer-events-none shrink-0"
                  />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. RS Puram, Gandhipuram"
                    className="w-full rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] pl-9 pr-3.5 py-2.5 text-xs font-medium text-[#141210] dark:text-[#FAFAFA] placeholder:text-[#8C847E] dark:placeholder:text-[#766F6A] outline-none transition focus:border-[#F4512C] focus:ring-2 focus:ring-[#F4512C]/20"
                  />
                </div>
              </div>

              {/* Optional Customer Phone Number */}
              <div>
                <label className="block text-xs font-bold text-[#141210] dark:text-[#FAFAFA] mb-1.5">
                  Your Phone Number{" "}
                  <span className="font-normal text-[#6B645F] dark:text-[#9E958F]">(Optional)</span>
                </label>
                <div className="relative flex items-center">
                  <Phone
                    size={14}
                    className="absolute left-3 text-[#6B645F] dark:text-[#9E958F] pointer-events-none shrink-0"
                  />
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. 9876543210 (included in message for worker callback)"
                    className="w-full rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] pl-9 pr-3.5 py-2.5 text-xs font-medium text-[#141210] dark:text-[#FAFAFA] placeholder:text-[#8C847E] dark:placeholder:text-[#766F6A] outline-none transition focus:border-[#F4512C] focus:ring-2 focus:ring-[#F4512C]/20"
                  />
                </div>
              </div>

              {/* Action Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-full bg-[#F4512C] text-white py-3 px-5 text-xs font-bold shadow-md hover:bg-[#E04320] active:scale-[0.98] transition cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 size={15} className="animate-spin text-current" />
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
              <div className="flex items-center justify-between rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] p-3 text-xs">
                <div>
                  <span className="font-bold text-[#141210] dark:text-[#FAFAFA]">
                    Need:{" "}
                  </span>
                  <span className="font-semibold text-[#F4512C]">{category}</span>
                  <p className="text-[11px] text-[#6B645F] dark:text-[#9E958F] truncate max-w-[260px] sm:max-w-[320px] mt-0.5">
                    "{description}" • {location}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep("form")}
                  className="text-xs font-semibold text-[#F4512C] hover:underline cursor-pointer shrink-0"
                >
                  Edit Need
                </button>
              </div>

              {/* Matched Workers Cards */}
              {matchedWorkers.length === 0 ? (
                <div className="rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] p-6 text-center">
                  <p className="text-xs font-medium text-[#6B645F] dark:text-[#9E958F]">
                    No workers matched your criteria in this area. Try selecting
                    another area or category.
                  </p>
                  <button
                    type="button"
                    onClick={() => setStep("form")}
                    className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#F4512C] text-white px-4 py-1.5 text-xs font-semibold shadow-sm hover:bg-[#E04320] cursor-pointer"
                  >
                    <span>Change location/category</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {matchedWorkers.map((worker) => {
                    const rating = Number(
                      worker.avg_rating || worker.rating || 4.8,
                    );
                    const reviewsCount = Number(worker.reviews_count || 18);
                    const isVerified = Boolean(worker.phone_verified);
                    const isNotified = Boolean(notifiedWorkerIds[worker.id]);
                    const isSaved = isWorkerSaved(worker.id);

                    const handleToggleSave = (e: React.MouseEvent) => {
                      e.stopPropagation();
                      toggleSavedWorker(worker.id);
                      setNotifiedWorkerIds((prev) => ({ ...prev }));
                    };

                    return (
                      <article
                        key={worker.id}
                        className="rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-3.5 shadow-sm transition-all hover:border-[#F4512C]/40 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            {/* Avatar */}
                            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FCEAE4] dark:bg-[#3A2018] text-xs font-bold text-[#F4512C] shadow-sm">
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
                                  {worker.initials ||
                                    worker.name.slice(0, 2).toUpperCase()}
                                </span>
                              )}
                            </div>

                            {/* Worker Info */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h3 className="truncate text-xs sm:text-sm font-bold text-[#141210] dark:text-[#FAFAFA]">
                                  {worker.name}
                                </h3>
                                {isVerified && (
                                  <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-[#0F8A73] dark:text-[#3DD1B3]">
                                    <BadgeCheck
                                      size={10}
                                      className="text-current"
                                    />
                                    <span>Verified</span>
                                  </span>
                                )}
                              </div>

                              <p className="text-[11px] font-semibold text-[#6B645F] dark:text-[#9E958F] truncate mt-0.5">
                                {worker.category} •{" "}
                                {worker.experience
                                  ? `${worker.experience} exp`
                                  : "Local pro"}
                              </p>

                              <div className="mt-1 flex items-center gap-2 text-[11px] text-[#6B645F] dark:text-[#9E958F]">
                                <div className="inline-flex items-center gap-0.5 font-bold text-[#141210] dark:text-[#FAFAFA]">
                                  <Star
                                    size={11}
                                    className="fill-amber-400 text-amber-400"
                                  />
                                  <span>{rating.toFixed(1)}</span>
                                  <span className="font-normal text-[10px] text-[#6B645F] dark:text-[#9E958F]">
                                    ({reviewsCount})
                                  </span>
                                </div>
                                {worker.locality && (
                                  <div className="inline-flex items-center gap-0.5 truncate max-w-[120px]">
                                    <MapPin
                                      size={10}
                                      className="shrink-0 text-[#F4512C]"
                                    />
                                    <span className="truncate">
                                      {worker.locality}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Save / Bookmark Button */}
                          <button
                            type="button"
                            onClick={handleToggleSave}
                            aria-label={
                              isSaved
                                ? `Remove ${worker.name} from My Circle`
                                : `Save ${worker.name} to My Circle`
                            }
                            title={
                              isSaved
                                ? "Saved to My Circle"
                                : "Save to My Circle"
                            }
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] text-[#6B645F] dark:text-[#9E958F] hover:text-[#141210] dark:hover:text-white transition shadow-sm active:scale-95 cursor-pointer shrink-0"
                          >
                            <Heart
                              size={13}
                              className={
                                isSaved
                                  ? "text-rose-500 fill-rose-500"
                                  : "text-[#6B645F] dark:text-[#9E958F]"
                              }
                            />
                          </button>
                        </div>

                        {/* WhatsApp Action Button */}
                        <div className="pt-2 border-t border-[#EAE2DC] dark:border-white/10 flex items-center justify-between gap-2">
                          <span className="text-[10px] text-[#6B645F] dark:text-[#9E958F]">
                            Direct WhatsApp connection
                          </span>

                          <button
                            type="button"
                            onClick={() => handleNotifyWhatsApp(worker)}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold text-white transition shadow-sm active:scale-95 cursor-pointer ${
                              isNotified
                                ? "bg-[#0B6E5B] hover:bg-[#085345]"
                                : "bg-[#0F8A73] hover:bg-[#0B6E5B]"
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
