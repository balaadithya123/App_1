import { useEffect, useState } from "react";
import { MapPin, Search as SearchIcon } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { workers as staticWorkers, type Worker } from "@/data/workers";
import type { WorkersResponse } from "@shared/api";
import { filterWorkers } from "@/lib/search";

const categories = ["Electrician", "Painter", "Plumber", "Carpenter", "Cleaner", "Other"];

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const requestedService = searchParams.get("service")?.trim() || "";
  const requestedLocation = searchParams.get("location")?.trim() || "";
  const [availableWorkers, setAvailableWorkers] = useState<Worker[]>(staticWorkers);
  const category = categories.find((item) => item.toLowerCase() === requestedService.toLowerCase()) || requestedService;
  const matchingWorkers = filterWorkers(availableWorkers, category, requestedLocation);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/workers")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Unable to load workers");
        }

        return response.json() as Promise<WorkersResponse>;
      })
      .then((data) => {
        if (isMounted) {
          setAvailableWorkers(data.workers);
        }
      })
      .catch(() => {
        if (isMounted) {
          setAvailableWorkers(staticWorkers);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);
  const heading = category
    ? category === "Other"
      ? "Other workers near you"
      : `${category}s near you`
    : requestedLocation
      ? `Workers near ${requestedLocation}`
      : "Workers near you";
  const serviceLabel = requestedService || "Any service";
  const locationLabel = requestedLocation || "Near you";

  return (
    <PageShell>
      <section className="rounded-[16px] border border-[#dcece7] bg-[#edf7f3] px-5 py-6 sm:px-8 sm:py-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal">Search results</p>
        <h1 className="mt-2 text-[30px] font-extrabold leading-tight tracking-[-0.045em] text-navy sm:text-4xl">
          {heading}
        </h1>
        <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]">
          <div className="flex h-11 items-center gap-3 rounded-[10px] border border-line bg-white px-3.5 text-sm text-navy">
            <SearchIcon size={17} className="text-teal" />
            {serviceLabel}
          </div>
          <div className="flex h-11 items-center gap-2 rounded-[10px] border border-line bg-white px-3.5 text-sm text-slate">
            <MapPin size={17} className="text-teal" />
            {locationLabel}
          </div>
        </div>
      </section>

      <section className="pt-8">
        <h2 className="mb-4 text-[18px] font-extrabold tracking-[-0.025em] text-navy">
          {matchingWorkers.length} {matchingWorkers.length === 1 ? "worker" : "workers"} found
        </h2>
        {matchingWorkers.length > 0 ? (
          <div className="space-y-3">
            {matchingWorkers.map((worker) => (
              <article key={worker.id} className="rounded-[13px] border border-line bg-white p-4 shadow-[0_5px_18px_rgba(24,55,62,0.04)]">
                <div className="flex items-start gap-3.5">
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-navy ${worker.tone}`}>
                    {worker.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-extrabold text-navy">{worker.name}</h3>
                    <p className="mt-0.5 text-[13px] font-semibold text-teal">{worker.category}</p>
                    <p className="mt-2 text-[13px] text-slate">{worker.locality} · {worker.experience} experience</p>
                  </div>
                  <Link
                    to={`/worker?worker=${encodeURIComponent(worker.id)}`}
                    className="shrink-0 rounded-[9px] border border-[#b9ddd4] px-3 py-2 text-[12px] font-bold text-teal transition-colors hover:bg-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
                  >
                    View Profile
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-[13px] border border-line bg-white px-4 py-6 text-center text-sm text-slate">
            No workers found for this search.
          </p>
        )}
      </section>
    </PageShell>
  );
}
