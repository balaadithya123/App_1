import { useEffect, useState } from "react";
import { Heart, MapPin, Trash2, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { workers as staticWorkers, type Worker } from "@/data/workers";
import type { WorkersResponse } from "@shared/api";
import { getSavedWorkerIds, toggleSavedWorker } from "@/lib/favorites";

export default function SavedWorkers() {
  const navigate = useNavigate();
  const [workers, setWorkers] = useState<Worker[]>(staticWorkers);
  const [savedIds, setSavedIds] = useState<string[]>(getSavedWorkerIds);

  const refreshSaved = () => setSavedIds(getSavedWorkerIds());

  useEffect(() => {
    fetch("/api/workers", { cache: "no-store" })
      .then(async (response) => (response.ok ? ((await response.json()) as WorkersResponse).workers : staticWorkers))
      .then(setWorkers)
      .catch(() => setWorkers(staticWorkers));

    window.addEventListener("saved-workers-changed", refreshSaved);
    return () => window.removeEventListener("saved-workers-changed", refreshSaved);
  }, []);

  const savedWorkers = workers.filter((worker) => savedIds.includes(worker.id));
  const remove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSavedWorker(id);
    refreshSaved();
  };

  return (
    <PageShell backTo="/search" backLabel="Find Workers">
      <div className="space-y-4">
        {/* Header Card */}
        <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-secondary text-primary">
                <Heart size={20} className="fill-primary text-primary" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Saved Bookmarks
                </span>
                <h1 className="mt-0.5 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  Saved Workers
                </h1>
              </div>
            </div>
            <span className="rounded-md border border-border bg-secondary px-2.5 py-1 text-xs font-semibold text-foreground">
              {savedWorkers.length} saved
            </span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground sm:text-sm">
            Quickly access and contact local specialists you have bookmarked.
          </p>
        </section>

        {/* Workers List */}
        <section className="pt-2">
          {savedWorkers.length ? (
            <div className="space-y-3">
              {savedWorkers.map((worker) => (
                <article
                  key={worker.id}
                  onClick={() => navigate(`/worker?worker=${encodeURIComponent(worker.id)}`)}
                  className="group relative flex flex-col justify-between gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/30 cursor-pointer sm:flex-row sm:items-center sm:p-5"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary text-sm font-bold text-foreground">
                      {worker.photo_url ? (
                        <img src={worker.photo_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        worker.initials
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-base font-bold text-foreground group-hover:text-primary transition-colors">
                        {worker.name}
                      </h2>
                      <p className="mt-0.5 text-xs font-semibold text-primary">{worker.category}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground truncate">
                        <MapPin size={13} className="shrink-0" />
                        <span className="truncate">{worker.locality}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 border-t border-border/60 pt-3 sm:border-0 sm:pt-0">
                    <button
                      type="button"
                      onClick={(e) => remove(worker.id, e)}
                      aria-label={`Remove ${worker.name} from saved workers`}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground transition hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                    <Link
                      to={`/worker?worker=${encodeURIComponent(worker.id)}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary px-3.5 text-xs font-semibold text-foreground transition hover:bg-foreground hover:text-background sm:flex-initial"
                    >
                      <span>View Profile</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-10 text-center">
              <Heart className="mx-auto text-muted-foreground" size={28} />
              <h2 className="mt-3 text-base font-bold text-foreground">Nothing saved yet</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Tap the heart on any worker card or profile in search to save them here.
              </p>
              <Link
                to="/search"
                className="mt-5 inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
              >
                Find Workers
              </Link>
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}

