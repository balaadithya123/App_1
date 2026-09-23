import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Circle,
  ShieldCheck,
  Building2,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Check,
  BadgeCheck,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { supabase } from "@/lib/supabase";

type AgencyCheck = {
  id: string;
  label: string;
  description: string;
  done: boolean;
  actionText: string;
};

export default function AgencyProfileCompleteness() {
  const navigate = useNavigate();
  const [agency, setAgency] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          navigate("/login", { replace: true });
          return;
        }
        if (data.session.user.user_metadata?.role !== "agency") {
          navigate("/", { replace: true });
          return;
        }
        const { data: a, error: e } = await supabase
          .from("agencies")
          .select(
            "id,name,contact_person_name,phone,email,categories,service_locations,team_size_band,business_registration_number,logo_url,description,location,verified",
          )
          .eq("user_id", data.session.user.id)
          .maybeSingle();
        if (e) throw e;
        setAgency(a);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load agency profile",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  if (loading) {
    return (
      <PageShell hideBack hideHome>
        <section className="rounded-[16px] border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] p-8 text-center shadow-sm">
          <p className="text-xs text-[#71717A] dark:text-[#A1A1AA]">Loading agency score...</p>
        </section>
      </PageShell>
    );
  }

  if (!agency) {
    return (
      <PageShell hideBack hideHome>
        <section className="rounded-[16px] border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] p-8 text-center shadow-sm">
          <p className="text-sm font-bold text-[#09090B] dark:text-[#FAFAFA]">
            Agency profile not found
          </p>
          <button
            type="button"
            onClick={() => navigate("/register-agency")}
            className="mt-3 rounded-full bg-black text-white dark:bg-white dark:text-black px-5 py-2 text-xs font-bold hover:bg-neutral-800 dark:hover:bg-neutral-200 shadow-sm cursor-pointer transition"
          >
            Register Agency
          </button>
        </section>
      </PageShell>
    );
  }

  const isSet = (v: unknown) =>
    Boolean(String(v ?? "").trim() && String(v).trim() !== "Not added yet");
  const hasArray = (arr: unknown) =>
    Array.isArray(arr) && arr.filter(Boolean).length > 0;

  const checks: AgencyCheck[] = [
    {
      id: "name",
      label: "Agency / Business Name",
      description:
        "Official trading or brand name displayed across the directory.",
      done: isSet(agency.name),
      actionText: "Add Name",
    },
    {
      id: "contact_person",
      label: "Lead Contact Person",
      description: "Primary administrator or manager handling incoming work.",
      done: isSet(agency.contact_person_name),
      actionText: "Add Contact",
    },
    {
      id: "phone",
      label: "Official Phone Number",
      description:
        "Direct contact line for receiving direct employer and client calls.",
      done: isSet(agency.phone),
      actionText: "Add Phone",
    },
    {
      id: "email",
      label: "Business Email",
      description:
        "Official email address for communication and dispatch notifications.",
      done: isSet(agency.email),
      actionText: "Add Email",
    },
    {
      id: "service_locations",
      label: "Service Coverage Areas",
      description: "Localities and zones where your workers are dispatched.",
      done: hasArray(agency.service_locations) || isSet(agency.location),
      actionText: "Add Areas",
    },
    {
      id: "categories",
      label: "Trade Specializations",
      description: "The primary skill categories your agency roster handles.",
      done: hasArray(agency.categories),
      actionText: "Select Trades",
    },
    {
      id: "logo",
      label: "Agency Logo / Branding",
      description: "Build trust with a recognizable brand emblem.",
      done: isSet(agency.logo_url),
      actionText: "Add Logo",
    },
    {
      id: "description",
      label: "Business Description & Overview",
      description:
        "Describe your agency's experience, coverage, and quality standards.",
      done: isSet(agency.description),
      actionText: "Add Description",
    },
    {
      id: "team_size",
      label: "Team Size Band",
      description: "Capacity information (e.g. 2-5, 6-15, 15+ workers).",
      done: isSet(agency.team_size_band),
      actionText: "Set Team Size",
    },
    {
      id: "reg_number",
      label: "Business Registration / GST",
      description:
        "Optional verification credential to boost enterprise trust.",
      done: isSet(agency.business_registration_number),
      actionText: "Add Reg No",
    },
  ];

  const completedCount = checks.filter((c) => c.done).length;
  const percent = Math.round((completedCount / checks.length) * 100);

  return (
    <PageShell hideBack hideHome>
      <div className="mx-auto max-w-3xl space-y-4">
        {error && (
          <div className="rounded-[16px] border border-rose-500/20 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs font-semibold text-rose-600 dark:text-rose-400 shadow-sm">
            {error}
          </div>
        )}

        {/* Header */}
        <section className="rounded-[16px] border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] p-5 sm:p-6 shadow-sm">
          <button
            type="button"
            onClick={() =>
              window.history.state &&
              typeof window.history.state.idx === "number" &&
              window.history.state.idx > 0
                ? navigate(-1)
                : navigate("/agency/dashboard")
            }
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#71717A] dark:text-[#A1A1AA] transition hover:text-[#09090B] dark:hover:text-[#FAFAFA] cursor-pointer"
          >
            <ArrowLeft size={14} /> Back
          </button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] border border-[#E4E4E7] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#09090B] text-[#09090B] dark:text-[#FAFAFA]">
                <Building2 size={22} />
              </span>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA]">
                  Agency Quality Score
                </span>
                <h1 className="mt-0.5 text-xl font-bold tracking-tight text-[#09090B] dark:text-[#FAFAFA] sm:text-2xl">
                  Agency Profile Completeness
                </h1>
                <p className="mt-1 text-xs text-[#71717A] dark:text-[#A1A1AA]">
                  Complete all business details to rank higher in searches and
                  receive more client callbacks.
                </p>
              </div>
            </div>

            <div className="flex items-baseline gap-1.5 self-start rounded-full border border-[#E4E4E7] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#09090B] px-4 py-2 sm:self-auto shadow-sm">
              <span className="text-2xl font-bold text-[#09090B] dark:text-[#FAFAFA]">
                {percent}%
              </span>
              <span className="text-xs text-[#71717A] dark:text-[#A1A1AA]">Complete</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-5 h-2.5 w-full overflow-hidden rounded-full bg-[#FAFAFA] dark:bg-[#09090B] border border-[#E4E4E7] dark:border-[#27272A]">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        </section>

        {/* Checklist */}
        <section className="rounded-[16px] border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#E4E4E7] dark:border-[#27272A] pb-3">
            <div>
              <h2 className="text-sm font-bold text-[#09090B] dark:text-[#FAFAFA]">
                Agency Checklist
              </h2>
              <p className="text-xs text-[#71717A] dark:text-[#A1A1AA]">
                {completedCount} of {checks.length} items complete
              </p>
            </div>
            {percent === 100 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                <Sparkles size={12} /> Full Completeness Achieved!
              </span>
            ) : (
              <Link
                to="/agency/profile/edit"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#09090B] dark:text-[#FAFAFA] transition hover:underline"
              >
                <span>Edit All Details</span>
                <ArrowRight size={13} />
              </Link>
            )}
          </div>

          <div className="mt-4 space-y-2.5">
            {checks.map((item) => (
              <div
                key={item.id}
                className={`flex flex-col gap-3 rounded-[12px] border p-3.5 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                  item.done
                    ? "border-[#E4E4E7] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#09090B]"
                    : "border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] hover:border-neutral-400 dark:hover:border-neutral-500 shadow-sm"
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span className="mt-0.5 shrink-0">
                    {item.done ? (
                      <CheckCircle2 size={18} className="text-emerald-500" />
                    ) : (
                      <Circle size={18} className="text-[#71717A] dark:text-[#A1A1AA]" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-[#09090B] dark:text-[#FAFAFA] sm:text-sm">
                      {item.label}
                    </p>
                    <p className="text-[11px] text-[#71717A] dark:text-[#A1A1AA]">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {item.done ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                      <Check size={12} /> Complete
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate("/agency/profile/edit")}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full bg-black text-white dark:bg-white dark:text-black px-3.5 text-xs font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-200 shadow-sm transition cursor-pointer"
                    >
                      <span>{item.actionText}</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Verification Badge info */}
          <div className="mt-5 flex items-center gap-3 rounded-[12px] border border-[#E4E4E7] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#09090B] p-4">
            <BadgeCheck
              size={20}
              className={agency.verified ? "text-emerald-500" : "text-[#71717A] dark:text-[#A1A1AA]"}
            />
            <div>
              <p className="text-xs font-bold text-[#09090B] dark:text-[#FAFAFA]">
                {agency.verified
                  ? "Verified Business Agency"
                  : "Business Verification"}
              </p>
              <p className="text-[11px] text-[#71717A] dark:text-[#A1A1AA]">
                {agency.verified
                  ? "Your agency holds a verified pro badge on directory searches."
                  : "Complete your business profile with registration info to request badge verification."}
              </p>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
