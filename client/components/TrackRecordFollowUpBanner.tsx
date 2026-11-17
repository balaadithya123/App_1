import { useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  X,
  Camera,
  Send,
  Clock,
  Sparkles,
} from "lucide-react";
import {
  getPendingConfirmations,
  getPromptableConfirmation,
  dismissPendingConfirmation,
  submitTrackRecordResponse,
  type PendingTrackConfirmation,
} from "@/lib/track-record";

export default function TrackRecordFollowUpBanner() {
  const [activeItem, setActiveItem] = useState<PendingTrackConfirmation | null>(
    null,
  );
  const [allowImmediate, setAllowImmediate] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [selectedOutcome, setSelectedOutcome] = useState<boolean | null>(null);
  const [note, setNote] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState(false);

  const refreshPending = () => {
    const pending = getPendingConfirmations();
    setPendingCount(pending.length);
    const item = getPromptableConfirmation(allowImmediate);
    setActiveItem(item);
  };

  useEffect(() => {
    refreshPending();
    window.addEventListener("pending-track-record-changed", refreshPending);
    return () =>
      window.removeEventListener(
        "pending-track-record-changed",
        refreshPending,
      );
  }, [allowImmediate]);

  if (!activeItem && pendingCount === 0) {
    return null;
  }

  // If there are pending contacts but < 24h, show a tiny test hint if user wants to test immediately
  if (!activeItem && pendingCount > 0) {
    return (
      <div className="fixed bottom-20 right-4 z-50">
        <button
          type="button"
          onClick={() => {
            setAllowImmediate(true);
            refreshPending();
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#F4512C]/30 bg-[#FCEAE4]/95 dark:bg-[#3A2018]/95 backdrop-blur-md px-3.5 py-1.5 text-[11px] font-bold text-[#F4512C] shadow-md transition hover:bg-[#FCEAE4] cursor-pointer"
        >
          <Clock size={12} className="text-[#F4512C] animate-spin-slow" />
          <span>Test Follow-up Banner ({pendingCount} pending)</span>
        </button>
      </div>
    );
  }

  if (!activeItem) return null;

  const contactDate = new Date(activeItem.timestamp).toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
    },
  );

  const handleDismiss = () => {
    dismissPendingConfirmation(activeItem.id);
    setSelectedOutcome(null);
    setNote("");
    setPhotoUrl(null);
    refreshPending();
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Compress & convert file to lightweight base64 Data URL
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 600;
        const scale = Math.min(1, MAX_WIDTH / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.7);
          setPhotoUrl(compressedDataUrl);
        }
      };
      if (typeof event.target?.result === "string") {
        img.src = event.target.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (selectedOutcome === null) return;
    setSubmitting(true);
    await submitTrackRecordResponse(
      activeItem.id,
      activeItem.workerId,
      selectedOutcome,
      note,
      photoUrl || undefined,
    );
    setSubmitting(false);
    setSubmittedMessage(true);

    setTimeout(() => {
      setSubmittedMessage(false);
      setSelectedOutcome(null);
      setNote("");
      setPhotoUrl(null);
      refreshPending();
    }, 2000);
  };

  return (
    <aside
      aria-label="Job Follow-up Prompt"
      className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="relative overflow-hidden rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-4 shadow-xl backdrop-blur-md">
        {/* Close / Dismiss Button */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss follow-up prompt"
          className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full text-[#8C847E] dark:text-[#766F6A] hover:bg-[#FAF8F5] dark:hover:bg-[#242220] hover:text-[#141210] dark:hover:text-white transition cursor-pointer"
        >
          <X size={14} />
        </button>

        {submittedMessage ? (
          <div className="flex items-center gap-3 py-2 text-[#0F8A73] dark:text-[#3DD1B3]">
            <CheckCircle2 size={22} className="shrink-0" />
            <div>
              <p className="text-xs font-bold">Thank you for updating!</p>
              <p className="text-[11px] text-[#6B645F] dark:text-[#9E958F]">
                Your response helps keep worker timelines transparent and
                honest.
              </p>
            </div>
          </div>
        ) : selectedOutcome === null ? (
          /* Step 1: Initial Yes / No Prompt */
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 pr-6">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C] shrink-0">
                <Sparkles size={15} />
              </span>
              <div>
                <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-[#F4512C]">
                  Job Follow-up
                </span>
                <h3 className="text-xs sm:text-sm font-bold text-[#141210] dark:text-[#FAFAFA] leading-snug">
                  Did{" "}
                  <span className="text-[#F4512C]">{activeItem.workerName}</span>{" "}
                  show up for your {activeItem.category} job on {contactDate}?
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setSelectedOutcome(true)}
                className="flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-[#0F8A73] hover:bg-[#0B6E5B] text-white text-xs font-bold transition cursor-pointer active:scale-95"
              >
                <CheckCircle2 size={15} />
                <span>Yes, Showed Up</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedOutcome(false)}
                className="flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-rose-300 dark:border-rose-800/50 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-xs font-bold transition cursor-pointer active:scale-95"
              >
                <XCircle size={15} />
                <span>No, Didn't Show</span>
              </button>
            </div>
          </div>
        ) : (
          /* Step 2: Optional Note & Photo */
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-[#EAE2DC] dark:border-white/10 pb-2">
              <div className="flex items-center gap-2">
                {selectedOutcome ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#0F8A73] dark:text-[#3DD1B3]">
                    <CheckCircle2 size={16} />
                    <span>Confirmed Showed Up</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                    <XCircle size={16} />
                    <span>Marked Didn't Show Up</span>
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedOutcome(null)}
                className="text-[11px] font-semibold text-[#F4512C] hover:underline cursor-pointer"
              >
                Change
              </button>
            </div>

            {/* Note input */}
            <div>
              <label
                htmlFor="tr-note-input"
                className="block text-[11px] font-semibold text-[#6B645F] dark:text-[#9E958F] mb-1"
              >
                Optional Note{" "}
                <span className="font-normal text-[10px] text-[#8C847E] dark:text-[#766F6A]">
                  (max 100 characters)
                </span>
              </label>
              <input
                id="tr-note-input"
                type="text"
                maxLength={100}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Arrived punctually and completed the work..."
                className="w-full rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-3 py-2 text-xs text-[#141210] dark:text-[#FAFAFA] placeholder:text-[#8C847E] dark:placeholder:text-[#766F6A] focus:border-[#F4512C] focus:ring-2 focus:ring-[#F4512C]/15 focus:bg-white dark:focus:bg-[#161514] focus:outline-none"
              />
            </div>

            {/* Photo attachment option */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B645F] dark:text-[#9E958F] cursor-pointer hover:text-[#F4512C] transition">
                <Camera size={14} className="text-[#F4512C]" />
                <span>
                  {photoUrl ? "Photo attached ✓" : "Attach photo (optional)"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </label>

              {photoUrl && (
                <button
                  type="button"
                  onClick={() => setPhotoUrl(null)}
                  className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                >
                  Remove photo
                </button>
              )}
            </div>

            {photoUrl && (
              <div className="relative h-14 w-20 overflow-hidden rounded-lg border border-[#EAE2DC] dark:border-white/10">
                <img
                  src={photoUrl}
                  alt="Attached job photo"
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            {/* Submit button */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                className="flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-[#F4512C] hover:bg-[#E04320] text-white text-xs font-bold transition cursor-pointer disabled:opacity-50 active:scale-95"
              >
                <Send size={13} />
                <span>{submitting ? "Submitting..." : "Submit Record"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
