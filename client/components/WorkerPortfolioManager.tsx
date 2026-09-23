import { useEffect, useState, useRef } from "react";
import {
  Camera,
  Image as ImageIcon,
  Trash2,
  Upload,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { WorkerPortfolioItem } from "@shared/api";

export default function WorkerPortfolioManager() {
  const [photos, setPhotos] = useState<WorkerPortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPortfolio = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;
      const res = await fetch("/api/workers/portfolio/my", {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setPhotos(data.photos || []);
      }
    } catch (e) {
      console.error("Failed to load portfolio photos:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    setSuccess("");
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 10 - photos.length;
    if (remainingSlots <= 0) {
      setError(
        "Maximum limit reached. Each worker profile can have at most 10 portfolio photos.",
      );
      return;
    }

    const selectedFiles = Array.from(files).slice(0, remainingSlots);
    setUploading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Your session expired. Please sign in again.");
      }

      const encodedImages = await Promise.all(
        selectedFiles.map(
          (file) =>
            new Promise<{ data: string; name: string }>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () =>
                resolve({ data: reader.result as string, name: file.name });
              reader.onerror = reject;
              reader.readAsDataURL(file);
            }),
        ),
      );

      const response = await fetch("/api/workers/portfolio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({ images: encodedImages }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Photo couldn't be used.");
      }

      setPhotos(result.photos || []);
      setSuccess(
        result.message ||
          `${selectedFiles.length} photo(s) added to your portfolio.`,
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      setError(err.message || "Photo couldn't be used.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (photoId: string) => {
    setError("");
    setSuccess("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;
      const res = await fetch(`/api/workers/portfolio/${photoId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });
      if (res.ok) {
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
        setSuccess("Photo deleted from portfolio.");
      } else {
        const err = await res.json().catch(() => null);
        setError(err?.message || "Unable to delete photo.");
      }
    } catch {
      setError("Unable to delete photo.");
    }
  };

  return (
    <section className="rounded-[16px] border border-[#E7ECF1] bg-white p-5 sm:p-6 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E7ECF1] bg-[#F6F9FC] text-primary">
            <Camera size={16} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#2C2C2C]">
                Work Portfolio
              </h2>
              <span className="rounded-full border border-[#E7ECF1] bg-[#F6F9FC] px-2 py-0.5 text-[10px] font-semibold text-[#67696D]">
                {photos.length} / 10 photos
              </span>
            </div>
            <p className="text-xs text-[#67696D]">
              Upload photos of your completed work to showcase your trade skills
              to clients.
            </p>
          </div>
        </div>

        {photos.length < 10 && (
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              multiple
              className="hidden"
              id="portfolio-file-upload"
              disabled={uploading}
            />
            <label
              htmlFor="portfolio-file-upload"
              className={`inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-subtle transition hover:bg-[#157ad4] cursor-pointer active:scale-95 ${
                uploading ? "opacity-60 cursor-not-allowed" : ""
              }`}
            >
              {uploading ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Saving photos...</span>
                </>
              ) : (
                <>
                  <Upload size={13} />
                  <span>Upload work photos</span>
                </>
              )}
            </label>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-[12px] border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
          {error}
        </p>
      )}

      {success && (
        <p className="mt-3 flex items-center gap-1.5 rounded-[12px] border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-600">
          <CheckCircle2 size={14} />
          {success}
        </p>
      )}

      {loading ? (
        <div className="mt-4 flex items-center justify-center p-8 text-xs text-[#67696D]">
          <Loader2 size={16} className="mr-2 animate-spin" />
          Loading work portfolio...
        </div>
      ) : photos.length === 0 ? (
        <div className="mt-4 flex flex-col items-center justify-center rounded-[16px] border border-dashed border-[#E7ECF1] bg-[#F6F9FC] p-8 text-center">
          <ImageIcon size={28} className="text-[#989EA7] mb-2" />
          <p className="text-xs font-bold text-[#2C2C2C]">
            No work photos uploaded yet
          </p>
          <p className="mt-1 text-[11px] text-[#67696D] max-w-xs">
            Adding 3–5 pictures of your finished jobs builds trust and helps
            customers choose your service.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="group relative aspect-square overflow-hidden rounded-[12px] border border-[#E7ECF1] bg-[#F6F9FC]"
            >
              <img
                src={photo.image_url}
                alt={photo.label || "Completed work"}
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />

              <button
                type="button"
                onClick={() => handleDelete(photo.id)}
                className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity hover:bg-destructive group-hover:opacity-100 cursor-pointer"
                title="Delete photo"
                aria-label="Delete work photo"
              >
                <Trash2 size={12} />
              </button>

              {photo.label && (
                <div className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent p-1.5 text-[10px] font-medium text-white">
                  {photo.label}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
