import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Building2,
  MapPin,
  Phone,
  Users,
  ShieldCheck,
  MessageCircle,
  Wrench,
  ExternalLink,
  ChevronRight,
  Briefcase,
  Search,
} from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import PageShell from "@/components/PageShell";
import RequestCallbackForm from "@/components/RequestCallbackForm";
import { supabase } from "@/lib/supabase";

type Worker = {
  id: string;
  name: string;
  category: string;
  locality: string;
  initials: string;
  photo_url?: string | null;
  phone_verified?: boolean;
  phone?: string;
  services?: string[] | string;
  experience?: string | number;
  available_today?: boolean;
};

type Agency = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  location?: string;
  categories: string[];
  service_locations: string[];
  team_size_band: string;
  logo_url?: string | null;
  description: string;
  verified: boolean;
  agency_code?: string;
};

export default function AgencyProfile() {
  const routeParams = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const id = routeParams.id || searchParams.get("agency") || searchParams.get("id") || "";

  const [agency, setAgency] = useState<Agency | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [callbackOpen, setCallbackOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!id) {
      // If no ID provided, try loading the current logged-in agency
      void (async () => {
        const session = (await supabase?.auth.getSession())?.data.session;
        if (session) {
          try {
            const res = await fetch("/api/agencies/me", {
              headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (res.ok) {
              const d = await res.json();
              if (mounted && d.agency) {
                setAgency({
                  ...d.agency,
                  categories: Array.isArray(d.agency.categories) ? d.agency.categories : [d.agency.categories].filter(Boolean),
                  service_locations: Array.isArray(d.agency.service_locations) ? d.agency.service_locations : [d.agency.service_locations || d.agency.location].filter(Boolean),
                });
                setLoading(false);
                return;
              }
            }
          } catch {}
        }
        if (mounted) {
          setError("No agency specified.");
          setLoading(false);
        }
      })();
      return;
    }

    setLoading(true);
    setError("");

    fetch(`/api/agencies/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json().catch(() => null);
        if (!r.ok || !d?.agency) throw new Error(d?.message || "Agency profile not found.");
        if (mounted) {
          setAgency({
            ...d.agency,
            categories: Array.isArray(d.agency.categories) ? d.agency.categories : [d.agency.categories].filter(Boolean),
            service_locations: Array.isArray(d.agency.service_locations) ? d.agency.service_locations : [d.agency.service_locations || d.agency.location].filter(Boolean),
          });
          if (Array.isArray(d.workers)) {
            setWorkers(d.workers);
          }
          setLoading(false);
        }
      })
      .catch((e) => {
        if (mounted) {
          setError(e instanceof Error ? e.message : "Unable to load agency profile.");
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  const phone = agency?.phone ? String(agency.phone).replace(/\D/g, "").slice(-10) : "";
  const whatsappUrl = phone ? `https://wa.me/91${phone}?text=${encodeURIComponent(`Hello ${agency?.name}, I found your agency on LocalWorker.`)}` : "";

  return (
    <PageShell backTo="/search?type=agencies" backLabel="Search" containerWidth="md">
      <div className="space-y-5">
        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
              <span>Loading agency profile...</span>
            </div>
          </div>
        ) : error || !agency ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <Building2 size={36} className="mx-auto text-muted-foreground" />
            <h1 className="mt-3 text-lg font-bold text-foreground">Agency Not Found</h1>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {error || "We could not find the requested agency profile."}
            </p>
            <Link
              to="/search?type=agencies"
              className="mt-4 inline-flex h-9 items-center justify-center rounded-lg bg-foreground px-4 text-xs font-semibold text-background hover:opacity-90 transition"
            >
              Browse All Agencies
            </Link>
          </div>
        ) : (
          <>
            {/* Main Agency Header */}
            <section className="rounded-2xl border border-border bg-card p-6 sm:p-7">
              <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-secondary font-bold text-foreground text-xl">
                  {agency.logo_url ? (
                    <img src={agency.logo_url} alt={agency.name} className="h-full w-full object-cover" />
                  ) : (
                    <Building2 size={30} className="text-primary" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{agency.name}</h1>
                    {agency.verified && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <BadgeCheck size={13} /> Verified Agency
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {agency.service_locations.length > 0 && (
                      <span className="flex items-center gap-1">
                        <MapPin size={13} className="shrink-0" />
                        <span>Coverage: {agency.service_locations.join(", ")}</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users size={13} className="shrink-0" />
                      <span>{agency.team_size_band || "5-10"} Team Capacity</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {phone && (
                  <a
                    href={`tel:+91${phone}`}
                    className="flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-foreground text-xs font-semibold text-background transition hover:opacity-90"
                  >
                    <Phone size={14} />
                    <span>Call (+91 {phone})</span>
                  </a>
                )}

                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 text-xs font-semibold text-white transition hover:bg-emerald-700"
                  >
                    <MessageCircle size={14} />
                    <span>WhatsApp Agency</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => setCallbackOpen(true)}
                  className="flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-secondary text-xs font-semibold text-foreground transition hover:bg-card cursor-pointer"
                >
                  <span>Request Callback</span>
                </button>
              </div>
            </section>

            {/* About Agency */}
            {agency.description && (
              <section className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">About Agency</h2>
                <p className="mt-2 text-xs leading-relaxed text-foreground">{agency.description}</p>
              </section>
            )}

            {/* Specializations & Services */}
            {agency.categories.length > 0 && (
              <section className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Specializations</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {agency.categories.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/40 px-3 py-1.5 text-xs font-medium text-foreground"
                    >
                      <Wrench size={13} className="text-primary" />
                      <span>{c}</span>
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Team Members List */}
            {workers.length > 0 && (
              <section className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center justify-between border-b border-border/80 pb-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Affiliated Specialists ({workers.length})
                  </h2>
                  <span className="text-[11px] text-muted-foreground">Verified Crew</span>
                </div>

                <div className="mt-3 divide-y divide-border/60">
                  {workers.map((w) => (
                    <Link
                      key={w.id}
                      to={`/worker?worker=${w.id}`}
                      className="group flex items-center justify-between py-3 transition hover:bg-secondary/30 rounded-lg px-2"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary font-bold text-foreground text-xs">
                          {w.photo_url ? (
                            <img src={w.photo_url} alt={w.name} className="h-full w-full object-cover" />
                          ) : (
                            w.initials || w.name?.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-xs font-bold text-foreground group-hover:text-primary">{w.name}</h3>
                            {w.phone_verified && (
                              <BadgeCheck size={12} className="text-emerald-500" />
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {w.category} · {w.locality}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {w.available_today && (
                          <span className="hidden sm:inline-block rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            Available
                          </span>
                        )}
                        <ChevronRight size={14} className="text-muted-foreground group-hover:text-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Quality Guarantee Notice */}
            <section className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <ShieldCheck size={15} className="text-primary" />
                <span>Agency Certified Service</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Work performed by this agency and its linked specialists is backed by verified management supervision and direct support.
              </p>
            </section>

            {callbackOpen && (
              <RequestCallbackForm
                agencyId={agency.id}
                agencyName={agency.name}
                service={agency.categories[0] || "General Service"}
                onClose={() => setCallbackOpen(false)}
              />
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}
