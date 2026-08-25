import { useEffect, useState } from "react";
import { BadgeCheck, Building2, MapPin, Phone, Users, ShieldCheck } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import PageShell from "@/components/PageShell";
import RequestCallbackForm from "@/components/RequestCallbackForm";

type Agency = {
  id: string;
  name: string;
  phone: string;
  categories: string[];
  service_locations: string[];
  team_size_band: string;
  logo_url?: string | null;
  description: string;
  verified: boolean;
};

export default function AgencyProfile() {
  const [params] = useSearchParams();
  const id = params.get("agency") || "";
  const [agency, setAgency] = useState<Agency | null>(null);
  const [error, setError] = useState("");
  const [callbackOpen, setCallbackOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/agencies/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.message || "Unable to load agency");
        setAgency(d.agency);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Unable to load agency."));
  }, [id]);

  const phone = agency?.phone ? String(agency.phone).replace(/\D/g, "") : "";
  const whatsappUrl = phone ? `https://wa.me/${phone.length === 10 ? `91${phone}` : phone}` : "";

  return (
    <PageShell backLabel="Search results">
      <div className="mx-auto max-w-[820px] space-y-5">
        {error ? (
          <section className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
            {error}
          </section>
        ) : agency ? (
          <>
            <section className="rounded-xl border border-border bg-card p-6 text-card-foreground">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary text-foreground">
                  {agency.logo_url ? (
                    <img src={agency.logo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Building2 size={30} className="text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">{agency.name}</h1>
                    {agency.verified && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary px-2 py-0.5 text-xs font-semibold text-foreground">
                        <BadgeCheck size={14} className="text-primary" />
                        Verified Agency
                      </span>
                    )}
                    <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                      Service Agency
                    </span>
                  </div>

                  <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin size={14} className="shrink-0" />
                    <span>Coverage: {agency.service_locations.join(", ")}</span>
                  </p>
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                    <Users size={14} className="text-muted-foreground" />
                    <span>{agency.team_size_band} Team Capacity</span>
                  </p>
                </div>
              </div>

              {agency.description && (
                <div className="mt-5 rounded-lg border border-border bg-secondary/30 p-4">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">About Agency</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground">{agency.description}</p>
                </div>
              )}

              <div className="mt-5">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Offered Services</h3>
                <div className="flex flex-wrap gap-1.5">
                  {agency.categories.map((c) => (
                    <span key={c} className="rounded-md border border-border bg-secondary px-2.5 py-1 text-xs font-semibold text-foreground">
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-10 items-center justify-center gap-2 rounded-lg bg-primary text-xs font-semibold text-primary-foreground transition hover:opacity-90 cursor-pointer"
                  >
                    <span>WhatsApp Agency</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setCallbackOpen(true)}
                  className="flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-secondary text-xs font-semibold text-foreground transition hover:bg-foreground hover:text-background cursor-pointer"
                >
                  <Phone size={14} />
                  <span>Request Callback</span>
                </button>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-5 text-card-foreground">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <ShieldCheck size={16} className="text-primary" />
                <span>Verified Agency Direct Booking</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                All requests submitted to this agency are handled directly by their management team for prompt scheduling and certified quality guarantee.
              </p>
            </section>

            {callbackOpen && (
              <RequestCallbackForm
                agencyId={agency.id}
                agencyName={agency.name}
                service={agency.categories[0] || "Service"}
                onClose={() => setCallbackOpen(false)}
              />
            )}
          </>
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading agency...</p>
        )}
      </div>
    </PageShell>
  );
}

