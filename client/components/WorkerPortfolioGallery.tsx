import { useEffect, useState } from "react";
import { Camera, X } from "lucide-react";
import type { WorkerPortfolioItem } from "@shared/api";

interface Props {
  workerId: string;
  workerName: string;
}

export default function WorkerPortfolioGallery({
  workerId,
  workerName,
}: Props) {
  const [photos, setPhotos] = useState<WorkerPortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState<WorkerPortfolioItem | null>(
    null,
  );

  useEffect(() => {
    let mounted = true;
    fetch(`/api/workers/${workerId}/portfolio`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return { photos: [] };
        return res.json();
      })
      .then((data) => {
        if (mounted) {
          setPhotos(data.photos || []);
        }
      })
      .catch(() => {
        if (mounted) setPhotos([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [workerId]);

  if (loading) return null;
  if (photos.length === 0) return null;

  return (
    <section className="rounded-[16px] border border-[#E7ECF1] bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera size={18} className="text-primary" />
          <h2 className="font-bold text-base text-[#2C2C2C]">Work Portfolio</h2>
        </div>
        <span className="text-xs font-semibold text-[#67696D]">
          {photos.length} {photos.length === 1 ? "photo" : "photos"}
        </span>
      </div>

      <p className="mt-1 text-xs text-[#67696D]">
        Recent projects and completed jobs by {workerName}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {photos.map((photo, idx) => (
          <button
            key={photo.id || idx}
            type="button"
            onClick={() => setActivePhoto(photo)}
            className="group relative aspect-square overflow-hidden rounded-[12px] border border-[#E7ECF1] bg-[#F6F9FC] text-left transition hover:border-primary hover:shadow-subtle cursor-pointer"
          >
            <img
              src={photo.image_url}
              alt={photo.label || `${workerName}'s work sample`}
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
            {photo.label && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 text-[11px] font-medium text-white truncate">
                {photo.label}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Clean lightbox preview modal */}
      {activePhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          onClick={() => setActivePhoto(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-2xl overflow-hidden rounded-[20px] bg-white border border-[#E7ECF1] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActivePhoto(null)}
              className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80 cursor-pointer"
              aria-label="Close photo preview"
            >
              <X size={18} />
            </button>
            <img
              src={activePhoto.image_url}
              alt={activePhoto.label || "Completed work"}
              className="max-h-[80vh] w-full object-contain"
              referrerPolicy="no-referrer"
            />
            {activePhoto.label && (
              <div className="p-3.5 text-center text-xs font-semibold text-[#2C2C2C] border-t border-[#E7ECF1]">
                {activePhoto.label}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
