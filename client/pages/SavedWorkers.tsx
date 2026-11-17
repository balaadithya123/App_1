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
import {
  loadCachedDirectoryWorkers,
  saveCachedDirectoryWorkers,
} from "@/lib/offline-cache";
import { useLanguage } from "@/lib/i18n";

function WorkerNoteInput({ workerId }: { workerId: string }) {
  const { t } = useLanguage();
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
      className="mt-3 rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] p-3 transition-colors focus-within:border-[#F4512C]"
    >
      <div className="flex items-center gap-1.5 text-xs font-bold text-[#F4512C]">
        <StickyNote size={13} />
        <span>{t("saved.personalNote")}</span>
      </div>
      <input
        type="text"
        value={note}
        onChange={handleChange}
        placeholder={t("saved.notePlaceholder")}
        className="mt-1 w-full bg-transparent text-xs sm:text-sm font-semibold text-[#141210] dark:text-[#FAFAFA] placeholder:text-[#6B645F] dark:placeholder:text-[#9E958F] focus:outline-none"
      />
    </div>
  );
}

export default function SavedWorkers() {
  const navigate = useNavigate();
  const { t, translateCategory } = useLanguage();
  const [workers, setWorkers] = useState<Worker[]>(
    () => loadCachedDirectoryWorkers<Worker>()?.workers || staticWorkers,
  );
  const [savedIds, setSavedIds] = useState<string[]>(getSavedWorkerIds);

  const refreshSaved = () => setSavedIds(getSavedWorkerIds());

  useEffect(() => {
    fetch("/api/workers")
      .then(async (response) =>
        response.ok
          ? ((await response.json()) as WorkersResponse).workers
          : null,
      )
      .then((fresh) => {
        if (fresh && fresh.length > 0) {
          setWorkers(fresh);
          saveCachedDirectoryWorkers(fresh);
        }
      })
      .catch(() => {});

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
      backLabel={t("callbacks.back")}
      headerTitle={t("saved.title")}
      containerWidth="lg"
      className="pb-28"
    >
      <div className="space-y-4">
        {/* Header Card */}
        <section className="rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-gradient-to-br from-[#FFF4EF] via-[#FAF8F5] to-[#F5EAE2] dark:from-[#261B16] dark:via-[#1C1512] dark:to-[#15110F] p-5 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F4512C] text-white shrink-0">
                <Heart size={22} className="fill-current" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#F4512C]">
                  {t("saved.eyebrow")}
                </span>
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#141210] dark:text-[#FAFAFA]">
                  {t("saved.title")}
                </h1>
                <p className="mt-0.5 text-xs sm:text-sm font-medium text-[#6B645F] dark:text-[#9E958F]">
                  {t("saved.sub")}
                </p>
              </div>
            </div>
            <span className="rounded-full bg-white/80 dark:bg-[#161514]/80 border border-[#EAE2DC] dark:border-white/10 px-3.5 py-1 text-xs font-extrabold text-[#141210] dark:text-[#FAFAFA] shrink-0">
              {t("saved.count", { count: savedWorkers.length })}
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
                    className="group relative rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 transition-all hover:border-[#F4512C]/50 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        <div className="flex h-13 w-13 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-[#FCEAE4] dark:bg-[#3A2018] text-sm font-bold text-[#F4512C]">
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
                          <h2 className="truncate text-base sm:text-lg font-extrabold text-[#141210] dark:text-[#FAFAFA] group-hover:text-[#F4512C] transition-colors">
                            {worker.name}
                          </h2>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                            <span className="font-bold text-[#6B645F] dark:text-[#9E958F]">
                              {translateCategory(worker.category)}
                            </span>
                            <span className="text-[#6B645F] dark:text-[#9E958F]">·</span>
                            <div className="inline-flex items-center gap-1 font-bold text-[#141210] dark:text-[#FAFAFA]">
                              <Star
                                size={12}
                                className="fill-amber-400 text-amber-400"
                              />
                              <span>{rating.toFixed(1)}</span>
                            </div>
                          </div>
                          {worker.locality && (
                            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-[#6B645F] dark:text-[#9E958F] truncate">
                              <MapPin
                                size={13}
                                className="shrink-0 text-[#F4512C]"
                              />
                              <span className="truncate">
                                {worker.locality}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={handleCall}
                          title={`Call ${worker.name}`}
                          aria-label={`Call ${worker.name}`}
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] text-[#141210] dark:text-[#FAFAFA] hover:border-[#F4512C]/50 transition active:scale-95 cursor-pointer"
                        >
                          <Phone size={14} />
                        </button>

                        {whatsappUrl && (
                          <button
                            type="button"
                            onClick={handleWhatsApp}
                            title={`WhatsApp ${worker.name}`}
                            aria-label={`WhatsApp ${worker.name}`}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0F8A73] hover:bg-[#0B6E5B] text-white transition active:scale-95 cursor-pointer"
                          >
                            <MessageCircle size={14} />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => remove(worker.id, e)}
                          title="Remove from My Circle"
                          aria-label={`Remove ${worker.name} from My Circle`}
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] text-[#6B645F] dark:text-[#9E958F] hover:text-rose-500 hover:border-rose-500/40 transition cursor-pointer active:scale-95"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <WorkerNoteInput workerId={worker.id} />

                    <div className="mt-3.5 pt-3 border-t border-[#EAE2DC] dark:border-white/10 flex items-center gap-2.5">
                      {whatsappUrl && (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => {
                            e.stopPropagation();
                            void logContactEvent(worker.id, "whatsapp");
                          }}
                          className="flex-1 inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#0F8A73] hover:bg-[#0B6E5B] px-4 text-xs sm:text-sm font-bold text-white transition cursor-pointer"
                        >
                          <MessageCircle size={15} />
                          <span>{t("card.whatsapp")}</span>
                        </a>
                      )}
                      <Link
                        to={`/worker?worker=${encodeURIComponent(worker.id)}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#141210] text-white dark:bg-white dark:text-[#11100F] px-4 text-xs sm:text-sm font-bold transition hover:opacity-90"
                      >
                        <span>{t("saved.viewProfile")}</span>
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-8 sm:p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C] mb-3.5">
                <ShieldCheck size={28} />
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-[#141210] dark:text-[#FAFAFA]">
                {t("saved.emptyTitle")}
              </h2>
              <p className="mt-1 text-xs sm:text-sm font-medium text-[#6B645F] dark:text-[#9E958F] max-w-sm mx-auto leading-relaxed">
                {t("saved.emptySub")}
              </p>
              <Link
                to="/search"
                className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#F4512C] hover:bg-[#E04320] text-white px-6 text-xs sm:text-sm font-bold transition cursor-pointer"
              >
                <Search size={14} />
                <span>{t("saved.findPros")}</span>
              </Link>
            </div>
          )}
        </section>
      </div>

      <NavBar />
    </PageShell>
  );
}
