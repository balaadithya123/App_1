import { useEffect, useState } from "react";
import { ArrowRight, Check, MapPin, ShieldCheck, X } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { workers as staticWorkers, type Worker } from "@/data/workers";
import type { WorkersResponse } from "@shared/api";
import { getWorkerContactHref } from "@/lib/contact";
import { findWorkerById } from "@/lib/workers";

export default function WorkerProfile() {
  const [searchParams] = useSearchParams();
  const [availableWorkers, setAvailableWorkers] = useState<Worker[]>(staticWorkers);
  const [showContact, setShowContact] = useState(false);
  const requestedWorkerId = searchParams.get("worker");
  const worker = findWorkerById(availableWorkers, requestedWorkerId);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/workers")
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load workers");
        return response.json() as Promise<WorkersResponse>;
      })
      .then((data) => {
        if (isMounted) setAvailableWorkers(data.workers);
      })
      .catch(() => {
        if (isMounted) setAvailableWorkers(staticWorkers);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!worker) {
    return (
      <PageShell backTo="/search" backLabel="Search results">
        <section className="rounded-[16px] border border-[#dcece7] bg-[#edf7f3] px-5 py-7 sm:px-8 sm:py-9">
          <h1 className="text-[27px] font-extrabold tracking-[-0.04em] text-navy">Worker profile unavailable</h1>
          <p className="mt-2 text-[14px] leading-6 text-slate">We could not find that worker profile. Please return to search results and try again.</p>
        </section>
      </PageShell>
    );
  }

  const contactHref = getWorkerContactHref(worker);

  return (
    <PageShell backTo="/search" backLabel="Search results">
      <section className="rounded-[16px] border border-[#dcece7] bg-[#edf7f3] px-5 py-7 sm:px-8 sm:py-9">
        <div className="flex items-center gap-4">
          <span className={`flex h-16 w-16 items-center justify-center rounded-full text-lg font-extrabold text-navy ${worker.tone}`}>{worker.initials}</span>
          <div>
            <h1 className="text-[27px] font-extrabold tracking-[-0.04em] text-navy">{worker.name}</h1>
            <p className="mt-1 text-sm font-bold text-teal">{worker.category}</p>
            <p className="mt-1 flex items-center gap-1.5 text-[13px] text-slate"><MapPin size={14} /> {worker.locality}</p>
          </div>
        </div>
        <button type="button" onClick={() => setShowContact(true)} aria-label={`Contact ${worker.name}`} className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-navy text-sm font-bold text-white shadow-[0_5px_12px_rgba(18,63,75,0.18)] transition-colors hover:bg-[#234b59] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2">
          Contact <ArrowRight size={16} />
        </button>
      </section>

      {showContact && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="contact-worker-title" onClick={() => setShowContact(false)}>
          <section className="w-full max-w-md rounded-[16px] border border-line bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h2 id="contact-worker-title" className="text-lg font-extrabold text-navy">Contact {worker.name}</h2>
                <p className="mt-1 text-sm text-slate">Phone: {worker.phone}</p>
              </div>
              <button type="button" onClick={() => setShowContact(false)} aria-label="Close contact dialog" className="rounded-full p-2 text-slate hover:bg-slate-100"><X size={18} /></button>
            </div>
            <a href={contactHref} onClick={() => setShowContact(false)} className="mt-5 flex h-11 w-full items-center justify-center rounded-[10px] bg-navy text-sm font-bold text-white hover:bg-[#234b59] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2">Call {worker.name}</a>
          </section>
        </div>
      )}

      <div className="space-y-3 pt-7">
        <section className="rounded-[13px] border border-line bg-white p-5">
          <h2 className="font-extrabold text-navy">About</h2>
          <p className="mt-2 text-[14px] leading-6 text-slate">{worker.about}</p>
        </section>
        <section className="rounded-[13px] border border-line bg-white p-5">
          <h2 className="font-extrabold text-navy">Experience</h2>
          <p className="mt-2 text-[14px] text-slate">{worker.experience} of experience</p>
        </section>
        <section className="rounded-[13px] border border-line bg-white p-5">
          <h2 className="font-extrabold text-navy">Services</h2>
          <ul className="mt-3 space-y-2 text-[14px] text-slate">
            {worker.services.map((service) => (
              <li key={service} className="flex items-center gap-2"><Check size={16} className="text-teal" />{service}</li>
            ))}
          </ul>
        </section>
      </div>

      <Link to="/report" className="mt-7 flex items-center justify-center gap-2 text-[13px] font-bold text-teal transition-colors hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2">
        <ShieldCheck size={16} /> Report / Give Feedback
      </Link>
    </PageShell>
  );
}
