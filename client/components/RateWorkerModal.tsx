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
        className="relative w-full max-w-md overflow-hidden rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-[#141210] dark:text-[#FAFAFA]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full p-1.5 text-[#6B645F] dark:text-[#9E958F] hover:bg-[#FAF8F5] dark:hover:bg-white/10 hover:text-[#141210] dark:hover:text-white transition cursor-pointer"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {submitted ? (
          <div className="py-8 text-center space-y-3 animate-in fade-in duration-300">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-[#0F8A73] dark:text-[#3DD1B3]">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-lg font-bold">Rating Submitted!</h3>
            <p className="text-xs sm:text-sm text-[#6B645F] dark:text-[#9E958F] max-w-xs mx-auto">
              Thank you for reviewing <strong>{worker.name}</strong>. Your feedback helps verified local specialists and the community.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Worker Header Info */}
            <div className="flex items-center gap-3 pb-3 border-b border-[#EAE2DC] dark:border-white/10">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C] font-extrabold text-sm overflow-hidden">
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
                  <BadgeCheck size={16} className="text-[#0F8A73] dark:text-[#3DD1B3] shrink-0" />
                </div>
                <p className="text-xs text-[#6B645F] dark:text-[#9E958F]">
                  {worker.category} · {worker.locality || "Local area"}
                </p>
              </div>
            </div>

            {/* Star Rating Section */}
            <div className="text-center py-2 space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B645F] dark:text-[#9E958F]">
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
                            : "text-[#EAE2DC] dark:text-white/20"
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
              <label className="block text-xs font-medium text-[#6B645F] dark:text-[#9E958F]">
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
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer border ${
                        isSelected
                          ? "bg-[#F4512C] text-white border-transparent"
                          : "bg-[#FAF8F5] dark:bg-[#0B0A09] border-[#EAE2DC] dark:border-white/10 text-[#6B645F] dark:text-[#9E958F] hover:border-[#F4512C]/50"
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
              <label className="block text-xs font-medium text-[#6B645F] dark:text-[#9E958F]">
                Your Name (Optional)
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Ramesh K. or Resident"
                className="w-full rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-3 py-2 text-xs sm:text-sm outline-none focus:border-[#F4512C] focus:ring-2 focus:ring-[#F4512C]/20 text-[#141210] dark:text-[#FAFAFA]"
              />
            </div>

            {/* Customer Review / Comments */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-[#6B645F] dark:text-[#9E958F]">
                Write a brief review
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Describe the job done, pricing, punctuality, or quality..."
                className="w-full resize-none rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] p-3 text-xs sm:text-sm outline-none focus:border-[#F4512C] focus:ring-2 focus:ring-[#F4512C]/20 text-[#141210] dark:text-[#FAFAFA]"
              />
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-4 py-2 text-xs sm:text-sm font-semibold text-[#6B645F] dark:text-[#9E958F] hover:text-[#141210] dark:hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-[#F4512C] hover:bg-[#E04320] text-white px-5 py-2 text-xs sm:text-sm font-bold shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
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
