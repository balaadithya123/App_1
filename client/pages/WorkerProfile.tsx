import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Check,
  MapPin,
  ShieldCheck,
  X,
  Heart,
  MessageCircle,
  Phone,
  Briefcase,
  Building2,
  Calendar,
  Sparkles,
} from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { workers as staticWorkers, type Worker } from "@/data/workers";
import type { WorkersResponse } from "@shared/api";
import { getWorkerContactHref, getWorkerWhatsAppHref } from "@/lib/contact";
import { findWorkerById } from "@/lib/workers";
import { getSavedWorkerIds, toggleSavedWorker } from "@/lib/favorites";
import { addRecentlyViewedWorker } from "@/lib/recently-viewed";
import { logAnalyticsEvent, logContactEvent } from "@/lib/analytics";
import RequestCallbackForm from "@/components/RequestCallbackForm";
import WorkerPortfolioGallery from "@/components/WorkerPortfolioGallery";

export default function WorkerProfile() {
  const routeParams = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const [availableWorkers, setAvailableWorkers] = useState<Worker[]>(staticWorkers);
  const [showContact, setShowContact] = useState(false);
  const [showCallback, setShowCallback] = useState(false);
  const [saved, setSaved] = useState(false);
  const requestedWorkerId = routeParams.id || searchParams.get("worker") || searchParams.get("id");
  const worker = findWorkerById(availableWorkers, requestedWorkerId);

  useEffect(() => {
    setSaved(requestedWorkerId ? getSavedWorkerIds().includes(requestedWorkerId) : false);
  }, [requestedWorkerId]);

  useEffect(() => {
    let mounted = true;
    fetch("/api/workers", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return r.json() as Promise<WorkersResponse>;
      })
      .then((data) => {
        if (mounted && Array.isArray(data.workers)) {
          setAvailableWorkers(data.workers);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (worker?.id) {
      addRecentlyViewedWorker(worker.id);
      void logAnalyticsEvent("profile_view", worker.id);
    }
  }, [worker?.id]);

  if (!worker) {
    return (
      <PageShell backTo="/search" backLabel="Search results">
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <h1 className="text-xl font-bold text-foreground">Worker Profile Unavailable</h1>
          <p className="mt-1.5 text-xs text-muted-foreground">
            We could not find that worker. The profile might have been unlisted or moved.
          </p>
          <Link
            to="/search"
            className="mt-4 inline-flex h-9 items-center justify-center rounded-lg bg-foreground px-4 text-xs font-semibold text-background hover:opacity-90"
          >
            Browse All Workers
          </Link>
        </div>
      </PageShell>
    );
  }

  const contactHref = getWorkerContactHref(worker);
  const whatsappHref = getWorkerWhatsAppHref(worker);
  const save = () => {
    toggleSavedWorker(worker.id);
    setSaved(getSavedWorkerIds().includes(worker.id));
  };

  return (
    <PageShell backTo="/search" backLabel="Back" containerWidth="md">
      {/* Profile Header Hero Card */}
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary font-bold text-foreground text-xl">
            {worker.photo_url ? (
              <img src={worker.photo_url} alt={worker.name} className="h-full w-full object-cover" />
            ) : (
              worker.initials
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{worker.name}</h1>
              {worker.phone_verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <BadgeCheck size={13} /> Verified
                </span>
              )}
            </div>

            <p className="mt-1 text-xs font-semibold text-primary">{worker.category}</p>

            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin size={13} /> {worker.locality}
              </span>
              {worker.experience && (
                <span className="flex items-center gap-1">
                  <Briefcase size={13} /> {worker.experience} experience
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button
            type="button"
            onClick={save}
            className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary text-xs font-semibold text-foreground transition hover:bg-card cursor-pointer"
          >
            <Heart size={14} fill={saved ? "currentColor" : "none"} className={saved ? "text-rose-500" : ""} />
            <span>{saved ? "Saved" : "Save"}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowContact(true)}
            className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-foreground text-xs font-semibold text-background transition hover:opacity-90 cursor-pointer"
          >
            <Phone size={14} />
            <span>Call</span>
          </button>

          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              void logContactEvent(worker.id, "whatsapp");
              void logAnalyticsEvent("whatsapp_click", worker.id, { source: "whatsapp" });
            }}
            className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-700"
          >
            <MessageCircle size={14} />
            <span>WhatsApp</span>
          </a>

          <button
            type="button"
            onClick={() => setShowCallback(true)}
            className="flex h-10 items-center justify-center rounded-lg border border-border bg-secondary text-xs font-semibold text-foreground transition hover:bg-card cursor-pointer"
          >
            <span>Request Call</span>
          </button>
        </div>
      </section>

      {/* Direct Call Modal */}
      {showContact && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground">Call {worker.name}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground select-all font-mono">+91 {worker.phone}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowContact(false)}
                aria-label="Close"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <a
              href={contactHref}
              onClick={() => setShowContact(false)}
              className="mt-4 flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-foreground text-xs font-semibold text-background transition hover:opacity-90"
            >
              <Phone size={14} />
              <span>Call Now</span>
            </a>
          </div>
        </div>
      )}

      {/* Request Callback Modal */}
      {showCallback && (
        <RequestCallbackForm
          workerId={worker.id}
          workerName={worker.name}
          service={worker.category}
          onClose={() => setShowCallback(false)}
        />
      )}

      {/* Content Details Sections */}
      <div className="mt-4 space-y-4">
        {/* About Section */}
        {worker.about && (
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">About</h2>
            <p className="mt-2 text-xs leading-relaxed text-foreground">{worker.about}</p>
          </section>
        )}

        {/* Portfolio Gallery */}
        <WorkerPortfolioGallery workerId={worker.id} workerName={worker.name} />

        {/* Services List */}
        {Array.isArray(worker.services) && worker.services.length > 0 && (
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Services Offered</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {worker.services.map((service) => (
                <span
                  key={service}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/40 px-3 py-1.5 text-xs font-medium text-foreground"
                >
                  <Check size={13} className="text-primary" />
                  <span>{service}</span>
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Feedback / Report Link */}
        <div className="pt-2 text-center">
          <Link
            to="/report"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >
            <ShieldCheck size={14} />
            <span>Report or Provide Feedback</span>
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
