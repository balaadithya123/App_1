import React, { useState } from "react";
import { Star, X, CheckCircle2, BadgeCheck } from "lucide-react";
import type { Worker } from "@shared/workers";
import { saveCustomerRating } from "@/lib/ratings";

interface RateWorkerModalProps {
  worker: Worker;
  isOpen: boolean;
  onClose: () => void;
  onRatingSuccess?: (newRating: number) => void;
}

const QUICK_TAGS = [
  "On time",
  "Reasonable price",
  "Polite & professional",
  "Clean work",
  "Quick turnaround",
  "Came fully equipped",
];

const STAR_LABELS: Record<number, string> = {
  1: "Poor service",
  2: "Could be better",
  3: "Average / satisfactory",
  4: "Very good & reliable",
  5: "Excellent & highly recommended!",
};

export default function RateWorkerModal({
  worker,
  isOpen,
  onClose,
  onRatingSuccess,
}: RateWorkerModalProps) {
  const [selectedStars, setSelectedStars] = useState<number>(5);
  const [hoveredStars, setHoveredStars] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState<string>("");
  const [comment, setComment] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>(["On time", "Clean work"]);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentStars = hoveredStars !== null ? hoveredStars : selectedStars;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      saveCustomerRating({
        workerId: worker.id,
        rating: selectedStars,
        customerName: customerName.trim() || "Customer",
        comment: comment.trim(),
        tags: selectedTags,
      });

      setSubmitted(true);
      if (onRatingSuccess) {
        onRatingSuccess(selectedStars);
      }

      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 1800);
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-black/[0.08] dark:border-white/[0.12] bg-white dark:bg-[#121316] p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-[#09090B] dark:text-[#FAFAFA]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full p-1.5 text-[#71717A] hover:bg-black/5 dark:hover:bg-white/10 hover:text-[#09090B] dark:hover:text-white transition cursor-pointer"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {submitted ? (
          <div className="py-8 text-center space-y-3 animate-in fade-in duration-300">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-lg font-bold">Rating Submitted!</h3>
            <p className="text-xs sm:text-sm text-[#71717A] dark:text-[#A1A1AA] max-w-xs mx-auto">
              Thank you for reviewing <strong>{worker.name}</strong>. Your feedback helps verified local specialists and the community.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Worker Header Info */}
            <div className="flex items-center gap-3 pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#09090B] text-white dark:bg-[#FAFAFA] dark:text-[#09090B] font-extrabold text-sm overflow-hidden">
                {worker.photo_url ? (
                  <img
                    src={worker.photo_url}
                    alt={worker.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>{worker.initials || worker.name.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-base font-bold">{worker.name}</h3>
                  <BadgeCheck size={16} className="text-emerald-500 shrink-0" />
                </div>
                <p className="text-xs text-[#71717A] dark:text-[#A1A1AA]">
                  {worker.category} · {worker.locality || "Local area"}
                </p>
              </div>
            </div>

            {/* Star Rating Section */}
            <div className="text-center py-2 space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA]">
                How was your experience?
              </label>

              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isActive = star <= currentStars;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setSelectedStars(star)}
                      onMouseEnter={() => setHoveredStars(star)}
                      onMouseLeave={() => setHoveredStars(null)}
                      className="p-1 rounded-lg transition-transform hover:scale-115 active:scale-95 cursor-pointer focus:outline-none"
                      aria-label={`${star} star`}
                    >
                      <Star
                        size={28}
                        className={
                          isActive
                            ? "fill-amber-400 text-amber-400 drop-shadow-xs"
                            : "text-slate-300 dark:text-neutral-600"
                        }
                      />
                    </button>
                  );
                })}
              </div>

              <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 min-h-[18px]">
                {STAR_LABELS[currentStars] || `${currentStars} Stars`}
              </div>
            </div>

            {/* Quick Experience Tags */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#71717A] dark:text-[#A1A1AA]">
                What stood out? (Optional)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition cursor-pointer border ${
                        isSelected
                          ? "bg-[#09090B] text-white dark:bg-[#FAFAFA] dark:text-[#09090B] border-transparent"
                          : "bg-black/5 dark:bg-white/5 border-black/[0.08] dark:border-white/[0.08] text-[#52525B] dark:text-[#D4D4D8] hover:border-black/20"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Customer Name */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-[#71717A] dark:text-[#A1A1AA]">
                Your Name (Optional)
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Ramesh K. or Resident"
                className="w-full rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-black/5 dark:bg-white/5 px-3 py-2 text-xs sm:text-sm outline-none focus:border-black/30 dark:focus:border-white/30 text-[#09090B] dark:text-[#FAFAFA]"
              />
            </div>

            {/* Customer Review / Comments */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-[#71717A] dark:text-[#A1A1AA]">
                Write a brief review
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Describe the job done, pricing, punctuality, or quality..."
                className="w-full resize-none rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-black/5 dark:bg-white/5 p-3 text-xs sm:text-sm outline-none focus:border-black/30 dark:focus:border-white/30 text-[#09090B] dark:text-[#FAFAFA]"
              />
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-black/[0.08] dark:border-white/[0.08] px-4 py-2 text-xs sm:text-sm font-semibold text-[#71717A] hover:text-[#09090B] dark:hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-[#09090B] hover:bg-neutral-800 text-white dark:bg-[#FAFAFA] dark:hover:bg-neutral-200 dark:text-[#09090B] px-5 py-2 text-xs sm:text-sm font-bold shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit Rating"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
