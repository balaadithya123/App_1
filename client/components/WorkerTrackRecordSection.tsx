import { useEffect, useState } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Image as ImageIcon,
  X,
} from "lucide-react";
import {
  fetchWorkerTrackRecord,
  type TrackRecordData,
  type TrackRecordEntry,
} from "@/lib/track-record";
import { CompactSectionSkeleton } from "@/components/PageSkeletons";

interface WorkerTrackRecordSectionProps {
  workerId: string;
  workerName?: string;
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Recently";
  }
}

export default function WorkerTrackRecordSection({
  workerId,
  workerName,
}: WorkerTrackRecordSectionProps) {
  const [data, setData] = useState<TrackRecordData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePhotoModal, setActivePhotoModal] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetchWorkerTrackRecord(workerId)
      .then((res) => {
        if (isMounted) {
          setData(res);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [workerId]);

  if (loading) {
    return (
      <section className="rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5">
        <CompactSectionSkeleton variant="rows" />
      </section>
    );
  }

  const entries = data?.entries || [];
  const summary = data?.summary || {
    total: 0,
    showed_up_count: 0,
    showed_up_percentage: 0,
  };

  return (
    <section className="rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 sm:p-6 space-y-4">
      {/* Photo Modal */}
      {activePhotoModal && (
        <div
          onClick={() => setActivePhotoModal(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in cursor-pointer"
        >
          <div
            className="relative max-w-lg max-h-[85vh] overflow-hidden rounded-2xl border border-white/10 bg-[#0B0A09] p-1 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActivePhotoModal(null)}
              className="absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black transition cursor-pointer"
            >
              <X size={16} />
            </button>
            <img
              src={activePhotoModal}
              alt="Job proof thumbnail"
              className="max-h-[80vh] w-auto max-w-full rounded-xl object-contain"
            />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EAE2DC] dark:border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C] shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#141210] dark:text-[#FAFAFA]">
                Track Record
              </h2>
              <span className="rounded-full bg-[#FAF8F5] dark:bg-[#0B0A09] border border-[#EAE2DC] dark:border-white/10 px-2.5 py-0.5 text-[10px] font-bold text-[#6B645F] dark:text-[#9E958F]">
                Public Timeline
              </span>
            </div>
            <p className="text-xs text-[#6B645F] dark:text-[#9E958F]">
              Unmoderated, chronological confirmation timeline logged directly
              by customers.
            </p>
          </div>
        </div>

        {/* Computed Summary Line / Badge */}
        {summary.total > 0 ? (
          <div className="rounded-2xl border border-[#0F8A73]/30 bg-[#0F8A73]/10 p-2.5 px-3.5 text-right shrink-0">
            <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-[#0F8A73]">
              <CheckCircle2 size={15} />
              <span>
                Showed up {summary.showed_up_count} of {summary.total} times
              </span>
            </div>
            <p className="text-[11px] font-semibold text-[#0F8A73]/80 mt-0.5">
              {summary.showed_up_percentage}% Reliability Rate
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-3 py-2 text-xs text-[#6B645F] dark:text-[#9E958F]">
            No track record responses yet
          </div>
        )}
      </div>

      {/* Progress Bar Visual if records exist */}
      {summary.total > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] font-semibold text-[#6B645F] dark:text-[#9E958F]">
            <span>Attendance Score</span>
            <span className="font-bold text-[#141210] dark:text-[#FAFAFA]">
              {summary.showed_up_percentage}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#EAE2DC] dark:bg-[#242220]">
            <div
              className="h-full bg-[#0F8A73] transition-all duration-500 rounded-full"
              style={{ width: `${summary.showed_up_percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Timeline Entries List */}
      <div className="pt-1 space-y-3">
        {entries.length > 0 ? (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-3 rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] p-3.5 transition-colors hover:border-[#F4512C]/50"
            >
              <div className="shrink-0 pt-0.5">
                {entry.showed_up ? (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0F8A73]/15 text-[#0F8A73]">
                    <CheckCircle2 size={16} />
                  </span>
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                    <XCircle size={16} />
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-xs font-bold ${entry.showed_up ? "text-[#0F8A73]" : "text-rose-700 dark:text-rose-400"}`}
                  >
                    {entry.showed_up
                      ? "Confirmed Showed Up"
                      : "Marked Did Not Show Up"}
                  </span>
                  <span className="text-[11px] font-medium text-[#6B645F] dark:text-[#9E958F] flex items-center gap-1">
                    <Clock size={11} />
                    <span>{formatRelativeTime(entry.created_at)}</span>
                  </span>
                </div>

                {/* Optional Note */}
                {entry.note && (
                  <p className="mt-1.5 text-xs text-[#141210] dark:text-[#FAFAFA] italic bg-white dark:bg-[#161514] rounded-xl border border-[#EAE2DC] dark:border-white/10 p-2.5">
                    "{entry.note}"
                  </p>
                )}

                {/* Optional Photo Thumbnail */}
                {entry.photo_url && (
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setActivePhotoModal(entry.photo_url || null)
                      }
                      className="group flex items-center gap-1.5 rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-1 pr-2.5 text-[11px] font-semibold text-[#6B645F] dark:text-[#9E958F] hover:border-[#F4512C]/50 hover:text-[#141210] dark:hover:text-white transition cursor-pointer"
                    >
                      <img
                        src={entry.photo_url}
                        alt="Job photo proof"
                        className="h-8 w-8 rounded-lg object-cover"
                      />
                      <span className="flex items-center gap-1">
                        <ImageIcon size={12} />
                        <span>View Photo</span>
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] p-6 text-center">
            <Sparkles
              size={24}
              className="mx-auto text-[#F4512C] mb-2 opacity-80"
            />
            <p className="text-xs font-semibold text-[#141210] dark:text-[#FAFAFA]">
              No confirmed track records yet for{" "}
              {workerName || "this specialist"}
            </p>
            <p className="mt-1 text-[11px] text-[#6B645F] dark:text-[#9E958F]">
              Contact this worker via Call or WhatsApp. You'll receive a quick
              follow-up prompt to verify attendance!
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
