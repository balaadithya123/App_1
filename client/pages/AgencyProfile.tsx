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
import { AgencyProfileSkeleton } from "@/components/PageSkeletons";
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
  const id =
    routeParams.id ||
    searchParams.get("agency") ||
    searchParams.get("id") ||
    "";

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
                  categories: Array.isArray(d.agency.categories)
                    ? d.agency.categories
                    : [d.agency.categories].filter(Boolean),
                  service_locations: Array.isArray(d.agency.service_locations)
                    ? d.agency.service_locations
                    : [d.agency.service_locations || d.agency.location].filter(
                        Boolean,
                      ),
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
        if (!r.ok || !d?.agency)
          throw new Error(d?.message || "Agency profile not found.");
        if (mounted) {
          setAgency({
            ...d.agency,
            categories: Array.isArray(d.agency.categories)
              ? d.agency.categories
              : [d.agency.categories].filter(Boolean),
            service_locations: Array.isArray(d.agency.service_locations)
              ? d.agency.service_locations
              : [d.agency.service_locations || d.agency.location].filter(
                  Boolean,
                ),
          });
          if (Array.isArray(d.workers)) {
            setWorkers(d.workers);
          }
          setLoading(false);
        }
      })
      .catch((e) => {
        if (mounted) {
          setError(
            e instanceof Error ? e.message : "Unable to load agency profile.",
          );
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  const phone = agency?.phone
    ? String(agency.phone).replace(/\D/g, "").slice(-10)
    : "";
  const whatsappUrl = phone
    ? `https://wa.me/91${phone}?text=${encodeURIComponent(`Hello ${agency?.name}, I found your agency on Builderco.`)}`
    : "";

  return (
    <PageShell
      backTo="/search?type=agencies"
      backLabel="Back"
      containerWidth="md"
    >
      <div className="space-y-5">
        {loading ? (
          <AgencyProfileSkeleton />
        ) : error || !agency ? (
          <div className="rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C]">
              <Building2 size={24} />
            </div>
            <h1 className="mt-4 text-lg font-extrabold text-[#141210] dark:text-[#FAFAFA]">
              Agency Not Found
            </h1>
            <p className="mt-1.5 text-xs text-[#6B645F] dark:text-[#9E958F]">
              {error || "We could not find the requested agency profile."}
            </p>
            <Link
              to="/search?type=agencies"
              className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-[#F4512C] hover:bg-[#E04320] px-5 text-xs font-semibold text-white transition"
            >
              Browse All Agencies
            </Link>
          </div>
        ) : (
          <>
            {/* Main Agency Header */}
            <section className="rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-gradient-to-br from-[#FFF4EF] via-[#FAF8F5] to-[#F5EAE2] dark:from-[#261B16] dark:via-[#1C1512] dark:to-[#15110F] p-6 sm:p-7">
              <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#F4512C] font-bold text-white text-xl shadow-sm">
                  {agency.logo_url ? (
                    <img
                      src={agency.logo_url}
                      alt={agency.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Building2 size={28} className="text-white" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#F4512C]">
                      Verified Service Agency
                    </span>
                    {agency.verified && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#0F8A73]/10 border border-[#0F8A73]/30 px-2.5 py-0.5 text-[11px] font-semibold text-[#0F8A73]">
                        <BadgeCheck size={13} /> Verified Agency
                      </span>
                    )}
                  </div>
                  <h1 className="mt-1 text-xl font-extrabold tracking-tight text-[#141210] dark:text-[#FAFAFA] sm:text-2xl">
                    {agency.name}
                  </h1>

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#6B645F] dark:text-[#9E958F]">
                    {agency.service_locations.length > 0 && (
                      <span className="flex items-center gap-1">
                        <MapPin size={13} className="shrink-0 text-[#F4512C]" />
                        <span>
                          Coverage: {agency.service_locations.join(", ")}
                        </span>
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users size={13} className="shrink-0 text-[#F4512C]" />
                      <span>
                        {agency.team_size_band || "5-10"} Team Capacity
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {phone && (
                  <a
                    href={`tel:+91${phone}`}
                    className="flex h-10 items-center justify-center gap-2 rounded-full bg-[#141210] text-white dark:bg-white dark:text-[#11100F] text-xs font-semibold transition hover:opacity-90"
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
                    className="flex h-10 items-center justify-center gap-2 rounded-full bg-[#0F8A73] hover:bg-[#0B6E5B] text-xs font-semibold text-white transition"
                  >
                    <MessageCircle size={14} />
                    <span>WhatsApp Agency</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => setCallbackOpen(true)}
                  className="flex h-10 items-center justify-center gap-2 rounded-full border border-[#EAE2DC] dark:border-white/10 bg-white/80 dark:bg-[#161514]/80 text-xs font-semibold text-[#141210] dark:text-[#FAFAFA] transition hover:border-[#F4512C]/50 cursor-pointer"
                >
                  <span>Request Callback</span>
                </button>
              </div>
            </section>

            {/* About Agency */}
            {agency.description && (
              <section className="rounded-[20px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 sm:p-6">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#F4512C]">
                  About Agency
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-[#141210] dark:text-[#FAFAFA]">
                  {agency.description}
                </p>
              </section>
            )}

            {/* Specializations & Services */}
            {agency.categories.length > 0 && (
              <section className="rounded-[20px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 sm:p-6">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#F4512C]">
                  Specializations
                </h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {agency.categories.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-3.5 py-1.5 text-xs font-semibold text-[#141210] dark:text-[#FAFAFA]"
                    >
                      <Wrench size={13} className="text-[#F4512C]" />
                      <span>{c}</span>
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Team Members List */}
            {workers.length > 0 && (
              <section className="rounded-[20px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 sm:p-6">
                <div className="flex items-center justify-between border-b border-[#EAE2DC] dark:border-white/10 pb-3">
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#F4512C]">
                    Affiliated Specialists ({workers.length})
                  </h2>
                  <span className="text-[11px] text-[#6B645F] dark:text-[#9E958F]">
                    Verified Crew
                  </span>
                </div>

                <div className="mt-3 divide-y divide-[#EAE2DC] dark:divide-white/10">
                  {workers.map((w) => (
                    <Link
                      key={w.id}
                      to={`/worker?worker=${w.id}`}
                      className="group flex items-center justify-between py-3 transition hover:bg-[#FAF8F5] dark:hover:bg-[#0B0A09] rounded-xl px-2.5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FCEAE4] dark:bg-[#3A2018] font-bold text-[#F4512C] text-xs">
                          {w.photo_url ? (
                            <img
                              src={w.photo_url}
                              alt={w.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            w.initials || w.name?.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-xs font-bold text-[#141210] dark:text-[#FAFAFA] group-hover:text-[#F4512C]">
                              {w.name}
                            </h3>
                            {w.phone_verified && (
                              <BadgeCheck
                                size={12}
                                className="text-[#0F8A73]"
                              />
                            )}
                          </div>
                          <p className="text-[11px] text-[#6B645F] dark:text-[#9E958F]">
                            {w.category} · {w.locality}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {w.available_today && (
                          <span className="hidden sm:inline-block rounded-full bg-[#0F8A73]/10 border border-[#0F8A73]/30 px-2.5 py-0.5 text-[10px] font-bold text-[#0F8A73]">
                            Available
                          </span>
                        )}
                        <ChevronRight
                          size={14}
                          className="text-[#6B645F] dark:text-[#9E958F] group-hover:text-[#F4512C]"
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Quality Guarantee Notice */}
            <section className="rounded-[20px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5">
              <div className="flex items-center gap-2 text-xs font-bold text-[#141210] dark:text-[#FAFAFA]">
                <ShieldCheck size={16} className="text-[#F4512C]" />
                <span>Agency Certified Service</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-[#6B645F] dark:text-[#9E958F]">
                Work performed by this agency and its linked specialists is
                backed by verified management supervision and direct support.
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
