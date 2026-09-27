import { useEffect, useState } from "react";
import {
  Heart,
  MapPin,
  Trash2,
  ArrowRight,
  MessageCircle,
  Phone,
  Star,
  StickyNote,
  ShieldCheck,
  Search,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import NavBar from "@/components/NavBar";
import { workers as staticWorkers, type Worker } from "@/data/workers";
import type { WorkersResponse } from "@shared/api";
import {
  getSavedWorkerIds,
  toggleSavedWorker,
  getWorkerNote,
  setWorkerNote,
} from "@/lib/favorites";
import { logAnalyticsEvent, logContactEvent } from "@/lib/analytics";

function WorkerNoteInput({ workerId }: { workerId: string }) {
  const [note, setNote] = useState(() => getWorkerNote(workerId));

  useEffect(() => {
    setNote(getWorkerNote(workerId));
  }, [workerId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNote(val);
    setWorkerNote(workerId, val);
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="mt-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 p-3 transition-colors focus-within:border-zinc-950 dark:focus-within:border-white focus-within:bg-white dark:focus-within:bg-zinc-800"
    >
      <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-300">
        <StickyNote size={13} className="text-zinc-900 dark:text-zinc-100" />
        <span>Personal Note</span>
      </div>
      <input
        type="text"
        value={note}
        onChange={handleChange}
        placeholder="Add note (e.g. 'Fixed geyser in May, punctual')..."
        className="mt-1 w-full bg-transparent text-xs sm:text-sm font-semibold text-zinc-950 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none"
      />
    </div>
  );
}

export default function SavedWorkers() {
  const navigate = useNavigate();
  const [workers, setWorkers] = useState<Worker[]>(staticWorkers);
  const [savedIds, setSavedIds] = useState<string[]>(getSavedWorkerIds);

  const refreshSaved = () => setSavedIds(getSavedWorkerIds());

  useEffect(() => {
    fetch("/api/workers", { cache: "no-store" })
      .then(async (response) =>
        response.ok
          ? ((await response.json()) as WorkersResponse).workers
          : staticWorkers,
      )
      .then(setWorkers)
      .catch(() => setWorkers(staticWorkers));

    window.addEventListener("saved-workers-changed", refreshSaved);
    return () =>
      window.removeEventListener("saved-workers-changed", refreshSaved);
  }, []);

  const savedWorkers = workers.filter((worker) => savedIds.includes(worker.id));
  const remove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSavedWorker(id);
    refreshSaved();
  };

  return (
    <PageShell
      backTo="/search"
      backLabel="Back"
      headerTitle="My Circle"
      containerWidth="lg"
      className="pb-28"
    >
      <div className="space-y-4">
        {/* Header Card */}
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-2xs shrink-0">
                <Heart size={22} className="fill-current" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
                  My Circle
                </h1>
                <p className="mt-0.5 text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-300">
                  Your saved directory of trusted local specialists.
                </p>
              </div>
            </div>
            <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-3 py-1 text-xs font-extrabold text-zinc-900 dark:text-zinc-100 shrink-0">
              {savedWorkers.length} saved
            </span>
          </div>
        </section>

        {/* Workers List */}
        <section className="pt-1">
          {savedWorkers.length ? (
            <div className="space-y-3.5">
              {savedWorkers.map((worker) => {
                const phone = String(worker.phone || "").replace(/\D/g, "");
                const whatsappUrl = phone
                  ? `https://wa.me/${phone.length === 10 ? `91${phone}` : phone}`
                  : "";
                const rating = Number(
                  worker.avg_rating || worker.rating || 4.8,
                );

                const handleCall = (e: React.MouseEvent) => {
                  e.stopPropagation();
                  void logContactEvent(worker.id, "call", {
                    name: worker.name,
                    category: worker.category,
                  });
                  void logAnalyticsEvent("call_click", worker.id, {
                    source: "my_circle_card",
                  });
                  window.location.href = `tel:${worker.phone}`;
                };

                const handleWhatsApp = (e: React.MouseEvent) => {
                  e.stopPropagation();
                  void logContactEvent(worker.id, "whatsapp", {
                    name: worker.name,
                    category: worker.category,
                  });
                  void logAnalyticsEvent("whatsapp_click", worker.id, {
                    source: "my_circle_card",
                  });
                  window.open(whatsappUrl, "_blank", "noopener,noreferrer");
                };

                return (
                  <article
                    key={worker.id}
                    onClick={() =>
                      navigate(
                        `/worker?worker=${encodeURIComponent(worker.id)}`,
                      )
                    }
                    className="group relative rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 transition-all hover:border-zinc-400 dark:hover:border-zinc-600 shadow-xs cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        <div className="flex h-13 w-13 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 text-sm font-bold text-zinc-950 dark:text-zinc-50 shadow-2xs">
                          {worker.photo_url ? (
                            <img
                              src={worker.photo_url}
                              alt={worker.name}
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            worker.initials ||
                            worker.name.slice(0, 2).toUpperCase()
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h2 className="truncate text-base sm:text-lg font-extrabold text-zinc-950 dark:text-zinc-50 transition-colors">
                            {worker.name}
                          </h2>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                            <span className="font-extrabold text-zinc-900 dark:text-zinc-100">
                              {worker.category}
                            </span>
                            <span className="text-zinc-400">·</span>
                            <div className="inline-flex items-center gap-1 font-bold text-zinc-900 dark:text-zinc-100">
                              <Star
                                size={12}
                                className="fill-amber-400 text-amber-400"
                              />
                              <span>{rating.toFixed(1)}</span>
                            </div>
                          </div>
                          {worker.locality && (
                            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-zinc-600 dark:text-zinc-300 truncate">
                              <MapPin
                                size={13}
                                className="shrink-0 text-emerald-600 dark:text-emerald-400"
                              />
                              <span className="truncate">
                                {worker.locality}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Quick Call */}
                        <button
                          type="button"
                          onClick={handleCall}
                          title={`Call ${worker.name}`}
                          aria-label={`Call ${worker.name}`}
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:border-zinc-400 transition shadow-2xs active:scale-95 cursor-pointer"
                        >
                          <Phone size={14} />
                        </button>

                        {/* Quick WhatsApp */}
                        {whatsappUrl && (
                          <button
                            type="button"
                            onClick={handleWhatsApp}
                            title={`WhatsApp ${worker.name}`}
                            aria-label={`WhatsApp ${worker.name}`}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#128C7E] hover:bg-[#075E54] text-white transition shadow-2xs active:scale-95 cursor-pointer"
                          >
                            <MessageCircle size={14} />
                          </button>
                        )}

                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={(e) => remove(worker.id, e)}
                          title="Remove from My Circle"
                          aria-label={`Remove ${worker.name} from My Circle`}
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer shadow-2xs active:scale-95"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Personal Note Field */}
                    <WorkerNoteInput workerId={worker.id} />

                    {/* Action Bar */}
                    <div className="mt-3.5 pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2.5">
                      {whatsappUrl && (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => {
                            e.stopPropagation();
                            void logContactEvent(worker.id, "whatsapp");
                          }}
                          className="flex-1 inline-flex h-9 sm:h-10 items-center justify-center gap-1.5 rounded-full bg-[#128C7E] px-4 text-xs sm:text-sm font-bold text-white transition hover:bg-[#075E54] cursor-pointer shadow-2xs"
                        >
                          <MessageCircle size={15} />
                          <span>WhatsApp</span>
                        </a>
                      )}
                      <Link
                        to={`/worker?worker=${encodeURIComponent(worker.id)}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 inline-flex h-9 sm:h-10 items-center justify-center gap-1.5 rounded-full border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 text-xs sm:text-sm font-bold text-zinc-950 dark:text-zinc-50 transition hover:bg-zinc-100 dark:hover:bg-zinc-700 shadow-2xs"
                      >
                        <span>View Profile</span>
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 sm:p-10 text-center shadow-xs">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 mb-3.5">
                <ShieldCheck size={28} />
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-zinc-950 dark:text-zinc-50">
                Your Circle is Empty
              </h2>
              <p className="mt-1 text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-300 max-w-sm mx-auto leading-relaxed">
                Save pros you contact to easily reach them again.
              </p>
              <Link
                to="/search"
                className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 px-6 text-xs sm:text-sm font-bold transition shadow-xs cursor-pointer"
              >
                <Search size={14} />
                <span>Find Specialists</span>
              </Link>
            </div>
          )}
        </section>
      </div>

      <NavBar />
    </PageShell>
  );
}
