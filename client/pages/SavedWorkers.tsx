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
      className="mt-3 rounded-[14px] border border-[#E7ECF1] dark:border-[#222222] bg-[#F6F9FC] dark:bg-[#121212] p-2.5 transition-colors focus-within:border-primary/50 focus-within:bg-white dark:focus-within:bg-[#181818]"
    >
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#67696D] dark:text-[#A1A1AA]">
        <StickyNote size={12} className="text-primary" />
        <span>Personal Note</span>
      </div>
      <input
        type="text"
        value={note}
        onChange={handleChange}
        placeholder="Add a note (e.g. 'Fixed geyser in May, very punctual')..."
        className="mt-1 w-full bg-transparent text-xs text-[#2C2C2C] dark:text-[#F4F4F5] placeholder-[#989EA7] focus:outline-none"
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
        <section className="rounded-[20px] border border-[#E7ECF1] dark:border-[#1F1F1F] bg-white dark:bg-[#0A0A0A] p-5 sm:p-6 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-[16px] border border-primary-100/40 bg-primary-100/15 text-primary shadow-subtle shrink-0">
                <Heart size={22} className="fill-primary text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-[#2C2C2C] dark:text-[#F4F4F5] sm:text-2xl">
                  My Circle
                </h1>
                <p className="mt-0.5 text-xs text-[#67696D] dark:text-[#A1A1AA]">
                  Your private list of trusted professionals. Go straight back
                  to the same person instead of re-browsing.
                </p>
              </div>
            </div>
            <span className="rounded-full border border-primary-100/30 bg-primary-100/15 px-3 py-1 text-xs font-bold text-primary shrink-0">
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
                    className="group relative rounded-[20px] border border-[#E7ECF1] dark:border-[#1F1F1F] bg-white dark:bg-[#0A0A0A] p-4 sm:p-5 transition-all hover:border-primary/50 hover:shadow-soft shadow-subtle cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        <div className="flex h-13 w-13 shrink-0 items-center justify-center overflow-hidden rounded-[16px] border border-[#E7ECF1] dark:border-[#1F1F1F] bg-[#F6F9FC] dark:bg-[#141414] text-sm font-bold text-primary shadow-subtle">
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
                          <h2 className="truncate text-base font-bold text-[#2C2C2C] dark:text-[#F4F4F5] group-hover:text-primary transition-colors">
                            {worker.name}
                          </h2>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
                            <span className="font-bold text-primary">
                              {worker.category}
                            </span>
                            <span className="text-[#989EA7]">·</span>
                            <div className="inline-flex items-center gap-1 font-bold text-[#2C2C2C] dark:text-[#F4F4F5]">
                              <Star
                                size={11}
                                className="fill-amber-400 text-amber-400"
                              />
                              <span>{rating.toFixed(1)}</span>
                            </div>
                          </div>
                          {worker.locality && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-[#67696D] dark:text-[#A1A1AA] truncate">
                              <MapPin
                                size={12}
                                className="shrink-0 text-primary"
                              />
                              <span className="truncate">
                                {worker.locality}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Quick Call */}
                        <button
                          type="button"
                          onClick={handleCall}
                          title={`Call ${worker.name}`}
                          aria-label={`Call ${worker.name}`}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E7ECF1] dark:border-[#262626] bg-white dark:bg-[#141414] text-[#2C2C2C] dark:text-[#F4F4F5] hover:border-primary hover:text-primary transition shadow-subtle active:scale-95 cursor-pointer"
                        >
                          <Phone size={13} />
                        </button>

                        {/* Quick WhatsApp */}
                        {whatsappUrl && (
                          <button
                            type="button"
                            onClick={handleWhatsApp}
                            title={`WhatsApp ${worker.name}`}
                            aria-label={`WhatsApp ${worker.name}`}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#128C7E] hover:bg-[#075E54] text-white transition shadow-subtle active:scale-95 cursor-pointer"
                          >
                            <MessageCircle size={13} />
                          </button>
                        )}

                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={(e) => remove(worker.id, e)}
                          title="Remove from My Circle"
                          aria-label={`Remove ${worker.name} from My Circle`}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E7ECF1] dark:border-[#262626] bg-white dark:bg-[#141414] text-[#989EA7] transition hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 cursor-pointer shadow-subtle active:scale-95"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Personal Note Field */}
                    <WorkerNoteInput workerId={worker.id} />

                    {/* Action Bar */}
                    <div className="mt-3.5 pt-3 border-t border-[#E7ECF1] dark:border-[#1F1F1F] flex items-center gap-2">
                      {whatsappUrl && (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => {
                            e.stopPropagation();
                            void logContactEvent(worker.id, "whatsapp");
                          }}
                          className="flex-1 inline-flex h-9 sm:h-10 items-center justify-center gap-1.5 rounded-full bg-[#128C7E] px-4 text-xs font-bold text-white transition hover:bg-[#075E54] cursor-pointer shadow-subtle"
                        >
                          <MessageCircle size={14} />
                          <span>WhatsApp</span>
                        </a>
                      )}
                      <Link
                        to={`/worker?worker=${encodeURIComponent(worker.id)}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 inline-flex h-9 sm:h-10 items-center justify-center gap-1.5 rounded-full border border-[#E7ECF1] dark:border-[#1F1F1F] bg-[#F6F9FC] dark:bg-[#141414] px-4 text-xs font-bold text-[#2C2C2C] dark:text-[#F4F4F5] transition hover:border-primary/50 hover:bg-white dark:hover:bg-[#1E1E1E] hover:text-primary shadow-subtle"
                      >
                        <span>View Profile</span>
                        <ArrowRight size={13} />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[20px] border border-[#E7ECF1] dark:border-[#1F1F1F] bg-white dark:bg-[#0A0A0A] p-8 sm:p-10 text-center shadow-soft">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-100/15 text-primary mb-3.5">
                <ShieldCheck size={28} className="text-primary" />
              </div>
              <h2 className="text-lg font-bold text-[#2C2C2C] dark:text-[#F4F4F5]">
                Your Circle is Empty
              </h2>
              <p className="mt-1.5 text-xs text-[#67696D] dark:text-[#A1A1AA] max-w-sm mx-auto leading-relaxed">
                Save a worker after you contact them, so you can find them again
                next time.
              </p>
              <p className="mt-1 text-[11px] text-[#989EA7] dark:text-[#71717A]">
                Stored privately on this device — no account needed.
              </p>
              <Link
                to="/search"
                className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-5 text-xs font-bold text-white transition hover:bg-[#0f766e] shadow-subtle cursor-pointer"
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
