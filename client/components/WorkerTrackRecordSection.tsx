import { useEffect, useState } from "react";
import { ShieldCheck, CheckCircle2, XCircle, Clock, Sparkles, Image as ImageIcon, X } from "lucide-react";
import { fetchWorkerTrackRecord, type TrackRecordData, type TrackRecordEntry } from "@/lib/track-record";

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

    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "Recently";
  }
}

export default function WorkerTrackRecordSection({ workerId, workerName }: WorkerTrackRecordSectionProps) {
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
      <section className="rounded-[20px] border border-[#E7ECF1] dark:border-[#1F1F1F] bg-white dark:bg-[#0A0A0A] p-5 shadow-soft">
        <div className="flex items-center gap-2 text-xs text-[#67696D] dark:text-[#A1A1AA]">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>Loading Track Record timeline...</span>
        </div>
      </section>
    );
  }

  const entries = data?.entries || [];
  const summary = data?.summary || { total: 0, showed_up_count: 0, showed_up_percentage: 0 };

  return (
    <section className="rounded-[20px] border border-[#E7ECF1] dark:border-[#1F1F1F] bg-white dark:bg-[#0A0A0A] p-5 sm:p-6 shadow-soft space-y-4">
      {/* Photo Modal */}
      {activePhotoModal && (
        <div
          onClick={() => setActivePhotoModal(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in cursor-pointer"
        >
          <div className="relative max-w-lg max-h-[85vh] overflow-hidden rounded-20 border border-white/20 bg-black p-1 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setActivePhotoModal(null)}
              className="absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black transition cursor-pointer"
            >
              <X size={16} />
            </button>
            <img src={activePhotoModal} alt="Job proof thumbnail" className="max-h-[80vh] w-auto max-w-full rounded-16 object-contain" />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E7ECF1] dark:border-[#1F1F1F] pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-primary-100/40 bg-primary-100/15 text-primary shadow-subtle shrink-0">
            <ShieldCheck size={20} className="text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#2C2C2C] dark:text-[#F4F4F5]">
                Track Record
              </h2>
              <span className="rounded-full bg-primary-100/20 border border-primary-100/40 px-2 py-0.5 text-[10px] font-bold text-primary">
                Public Timeline
              </span>
            </div>
            <p className="text-xs text-[#67696D] dark:text-[#A1A1AA]">
              Unmoderated, chronological confirmation timeline logged directly by customers.
            </p>
          </div>
        </div>

        {/* Computed Summary Line / Badge */}
        {summary.total > 0 ? (
          <div className="rounded-[16px] border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/30 p-2.5 px-3.5 text-right shrink-0">
            <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />
              <span>
                Showed up {summary.showed_up_count} of {summary.total} times
              </span>
            </div>
            <p className="text-[11px] font-semibold text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
              {summary.showed_up_percentage}% Reliability Rate
            </p>
          </div>
        ) : (
          <div className="rounded-[14px] border border-[#E7ECF1] dark:border-[#1F1F1F] bg-[#F6F9FC] dark:bg-[#141414] px-3 py-2 text-xs text-[#67696D] dark:text-[#A1A1AA]">
            No track record responses yet
          </div>
        )}
      </div>

      {/* Progress Bar Visual if records exist */}
      {summary.total > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] font-semibold text-[#67696D] dark:text-[#A1A1AA]">
            <span>Attendance Score</span>
            <span className="font-bold text-[#2C2C2C] dark:text-[#F4F4F5]">{summary.showed_up_percentage}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#E7ECF1] dark:bg-[#1F1F1F]">
            <div
              className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
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
              className="flex items-start gap-3 rounded-[16px] border border-[#E7ECF1] dark:border-[#1F1F1F] bg-[#F6F9FC] dark:bg-[#121212] p-3.5 transition-colors hover:border-primary/40"
            >
              <div className="shrink-0 pt-0.5">
                {entry.showed_up ? (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
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
                  <span className={`text-xs font-bold ${entry.showed_up ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
                    {entry.showed_up ? "Confirmed Showed Up" : "Marked Did Not Show Up"}
                  </span>
                  <span className="text-[11px] font-medium text-[#989EA7] dark:text-[#71717A] flex items-center gap-1">
                    <Clock size={11} />
                    <span>{formatRelativeTime(entry.created_at)}</span>
                  </span>
                </div>

                {/* Optional Note */}
                {entry.note && (
                  <p className="mt-1 text-xs text-[#2C2C2C] dark:text-[#F4F4F5] italic bg-white dark:bg-[#181818] rounded-xl border border-[#E7ECF1] dark:border-[#222222] p-2.5">
                    "{entry.note}"
                  </p>
                )}

                {/* Optional Photo Thumbnail */}
                {entry.photo_url && (
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActivePhotoModal(entry.photo_url || null)}
                      className="group flex items-center gap-1.5 rounded-xl border border-[#E7ECF1] dark:border-[#222222] bg-white dark:bg-[#181818] p-1 pr-2.5 text-[11px] font-semibold text-[#67696D] dark:text-[#A1A1AA] hover:border-primary hover:text-primary transition cursor-pointer"
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
          <div className="rounded-[16px] border border-dashed border-[#E7ECF1] dark:border-[#222222] p-6 text-center">
            <Sparkles size={24} className="mx-auto text-primary mb-2 opacity-60" />
            <p className="text-xs font-semibold text-[#2C2C2C] dark:text-[#F4F4F5]">
              No confirmed track records yet for {workerName || "this specialist"}
            </p>
            <p className="mt-1 text-[11px] text-[#67696D] dark:text-[#A1A1AA]">
              Contact this worker via Call or WhatsApp. You'll receive a quick follow-up prompt to verify attendance!
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
