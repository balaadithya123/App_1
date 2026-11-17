import { useEffect, useState } from "react";
import { Clock3, Trash2, MapPin, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { workers as staticWorkers, type Worker } from "@/data/workers";
import type { WorkersResponse } from "@shared/api";
import {
  getRecentlyViewedWorkerIds,
  clearRecentlyViewedWorkers,
} from "@/lib/recently-viewed";
import {
  loadCachedDirectoryWorkers,
  saveCachedDirectoryWorkers,
} from "@/lib/offline-cache";

export default function RecentlyViewed() {
  const navigate = useNavigate();
  const [workers, setWorkers] = useState<Worker[]>(
    () => loadCachedDirectoryWorkers<Worker>()?.workers || staticWorkers,
  );
  const [ids, setIds] = useState<string[]>(getRecentlyViewedWorkerIds);

  useEffect(() => {
    let mounted = true;
    fetch("/api/workers")
      .then((r) =>
        r.ok
          ? (r.json() as unknown as Promise<WorkersResponse>)
          : Promise.reject(),
      )
      .then((data) => {
        if (mounted && Array.isArray(data?.workers) && data.workers.length > 0) {
          setWorkers(data.workers);
          saveCachedDirectoryWorkers(data.workers);
        }
      })
      .catch(() => {});

    const refresh = () => setIds(getRecentlyViewedWorkerIds());
    window.addEventListener("recently-viewed-changed", refresh);
    return () => {
      mounted = false;
      window.removeEventListener("recently-viewed-changed", refresh);
    };
  }, []);

  const viewed = ids
    .map((id) => workers.find((w) => w.id === id))
    .filter((w): w is Worker => Boolean(w));

  return (
    <PageShell backTo="/search" backLabel="Back">
      <div className="space-y-4">
        {/* Header Card */}
        <section className="rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-gradient-to-br from-[#FFF4EF] via-[#FAF8F5] to-[#F5EAE2] dark:from-[#261B16] dark:via-[#1C1512] dark:to-[#15110F] p-5 sm:p-7">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F4512C] text-white">
                <Clock3 size={22} />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#F4512C]">
                  Browsing History
                </span>
                <h1 className="mt-0.5 text-xl font-extrabold tracking-tight text-[#141210] dark:text-[#FAFAFA] sm:text-2xl">
                  Recently Viewed
                </h1>
              </div>
            </div>

            {viewed.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  clearRecentlyViewedWorkers();
                  setIds([]);
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#EAE2DC] dark:border-white/10 bg-white/80 dark:bg-[#161514]/80 px-3.5 text-xs font-semibold text-[#6B645F] dark:text-[#9E958F] transition hover:border-rose-500/40 hover:text-rose-500 cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Clear</span>
              </button>
            )}
          </div>
          <p className="mt-3 text-xs text-[#6B645F] dark:text-[#9E958F] sm:text-sm">
            Workers whose full profiles you checked recently.
          </p>
        </section>

        {/* List Section */}
        <section className="pt-2">
          {viewed.length ? (
            <div className="space-y-3">
              {viewed.map((worker) => (
                <article
                  key={worker.id}
                  onClick={() =>
                    navigate(`/worker?worker=${encodeURIComponent(worker.id)}`)
                  }
                  className="group relative flex flex-col justify-between gap-3 rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-4 transition-colors hover:border-[#F4512C]/50 cursor-pointer sm:flex-row sm:items-center sm:p-5"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FCEAE4] dark:bg-[#3A2018] text-sm font-bold text-[#F4512C]">
                      {worker.photo_url ? (
                        <img
                          src={worker.photo_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        worker.initials
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-base font-extrabold text-[#141210] dark:text-[#FAFAFA] group-hover:text-[#F4512C] transition-colors">
                        {worker.name}
                      </h2>
                      <p className="mt-0.5 text-xs font-semibold text-[#F4512C]">
                        {worker.category}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-[#6B645F] dark:text-[#9E958F] truncate">
                        <MapPin size={13} className="shrink-0" />
                        <span className="truncate">{worker.locality}</span>
                        {worker.experience && (
                          <>
                            <span className="text-[10px]">·</span>
                            <span>{worker.experience} exp</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 border-t border-[#EAE2DC] dark:border-white/10 pt-3 sm:border-0 sm:pt-0">
                    <Link
                      to={`/worker?worker=${encodeURIComponent(worker.id)}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-[#141210] text-white dark:bg-white dark:text-[#11100F] px-4 text-xs font-semibold transition hover:opacity-90 sm:flex-initial"
                    >
                      <span>View Profile</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C]">
                <Clock3 size={24} />
              </div>
              <h2 className="mt-3 text-base font-extrabold text-[#141210] dark:text-[#FAFAFA]">
                No recently viewed workers
              </h2>
              <p className="mt-1 text-xs text-[#6B645F] dark:text-[#9E958F]">
                Profiles you open while browsing will appear here automatically.
              </p>
              <Link
                to="/search"
                className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-[#F4512C] hover:bg-[#E04320] px-5 text-xs font-semibold text-white transition"
              >
                Browse Directory
              </Link>
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}
