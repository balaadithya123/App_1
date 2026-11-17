import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { FormCardSkeleton } from "@/components/PageSkeletons";
import { supabase } from "@/lib/supabase";
const SERVICES = [
  "Electrician",
  "Plumber",
  "Carpenter",
  "Painter",
  "AC Technician",
  "Appliance Repair",
  "Mason",
  "Welder",
  "Driver",
  "Cleaner",
  "Other",
];
const empty = {
  name: "",
  contactPersonName: "",
  phone: "",
  email: "",
  categories: [] as string[],
  serviceLocations: "",
  teamSizeBand: "2-5",
  businessRegistrationNumber: "",
  logoUrl: "",
  description: "",
};
export default function AgencyProfileEdit() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<any>(empty);
  const [agencyCode, setAgencyCode] = useState("");
  useEffect(() => {
    (async () => {
      try {
        if (!supabase) return;
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          navigate("/login", { replace: true });
          return;
        }
        const { data: a, error: e } = await supabase
          .from("agencies")
          .select(
            "id,name,contact_person_name,phone,email,categories,service_locations,team_size_band,business_registration_number,logo_url,description,location,agency_code",
          )
          .eq("user_id", data.session.user.id)
          .maybeSingle();
        if (e) throw e;
        if (!a) throw new Error("Your agency profile was not found.");
        setAgencyCode(a.agency_code || "");
        setForm({
          name: a.name || "",
          contactPersonName: a.contact_person_name || "",
          phone: a.phone || "",
          email: a.email || data.session.user.email || "",
          categories: Array.isArray(a.categories) ? a.categories : [],
          serviceLocations: (Array.isArray(a.service_locations) &&
          a.service_locations.length
            ? a.service_locations
            : [a.location].filter(Boolean)
          ).join(", "),
          teamSizeBand: a.team_size_band || "2-5",
          businessRegistrationNumber: a.business_registration_number || "",
          logoUrl: a.logo_url || "",
          description: a.description || "",
        });
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Unable to load your existing agency profile.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);
  const toggle = (s: string) =>
    setForm((f: any) => ({
      ...f,
      categories: f.categories.includes(s)
        ? f.categories.filter((x: string) => x !== s)
        : [...f.categories, s],
    }));
  const save = async (e: any) => {
    e.preventDefault();
    if (!supabase) return;
    setSaving(true);
    setError("");
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session)
        throw new Error("Your session has expired. Please log in again.");
      const locations = form.serviceLocations
        .split(",")
        .map((x: string) => x.trim())
        .filter(Boolean);
      const { error: e } = await supabase
        .from("agencies")
        .update({
          name: form.name.trim(),
          contact_person_name: form.contactPersonName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          categories: form.categories,
          service_locations: locations,
          location: locations.join(", "),
          services: form.categories.join(", "),
          team_size_band: form.teamSizeBand,
          business_registration_number:
            form.businessRegistrationNumber.trim() || null,
          logo_url: form.logoUrl.trim() || null,
          description: form.description.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", data.session.user.id);
      if (e) throw e;
      navigate("/agency/dashboard", { replace: true });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to save agency profile.",
      );
    } finally {
      setSaving(false);
    }
  };
  if (loading)
    return (
      <PageShell hideBack hideHome>
        <FormCardSkeleton />
      </PageShell>
    );
  return (
    <PageShell hideBack hideHome>
      <form onSubmit={save} className="mx-auto max-w-3xl space-y-5 py-4">
        <button
          type="button"
          onClick={() =>
            window.history.state &&
            typeof window.history.state.idx === "number" &&
            window.history.state.idx > 0
              ? navigate(-1)
              : navigate("/agency/dashboard")
          }
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#6B645F] dark:text-[#9E958F] hover:text-[#141210] dark:hover:text-[#FAFAFA] transition cursor-pointer"
        >
          <ArrowLeft size={15} />
          Back to Dashboard
        </button>

        <div className="rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-gradient-to-br from-[#FFF4EF] via-[#FAF8F5] to-[#F5EAE2] dark:from-[#261B16] dark:via-[#1C1512] dark:to-[#15110F] p-6 sm:p-7">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#F4512C]">
            Agency Profile Settings
          </span>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#141210] dark:text-[#FAFAFA]">
            Edit agency profile
          </h1>
          <p className="mt-1 text-xs text-[#6B645F] dark:text-[#9E958F]">
            Your existing information is loaded below. Your agency code is
            generated automatically.
          </p>
          {agencyCode && (
            <p className="mt-3 text-xs font-bold text-[#141210] dark:text-[#FAFAFA]">
              Agency code:{" "}
              <span className="ml-1 rounded-md bg-[#FCEAE4] dark:bg-[#3A2018] px-2 py-0.5 font-mono tracking-wider text-[#F4512C]">
                {agencyCode}
              </span>
            </p>
          )}
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-semibold text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}

        <section className="rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-6 space-y-4">
          <label className="block text-xs font-bold text-[#141210] dark:text-[#FAFAFA]">
            Agency name
            <input
              required
              className="mt-1.5 w-full rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-3.5 py-2.5 text-sm text-[#141210] dark:text-[#FAFAFA] outline-none focus:border-[#F4512C]"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label className="block text-xs font-bold text-[#141210] dark:text-[#FAFAFA]">
            Contact person
            <input
              required
              className="mt-1.5 w-full rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-3.5 py-2.5 text-sm text-[#141210] dark:text-[#FAFAFA] outline-none focus:border-[#F4512C]"
              value={form.contactPersonName}
              onChange={(e) =>
                setForm({ ...form, contactPersonName: e.target.value })
              }
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-bold text-[#141210] dark:text-[#FAFAFA]">
              Phone
              <input
                required
                pattern="[0-9]{10}"
                className="mt-1.5 w-full rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-3.5 py-2.5 text-sm text-[#141210] dark:text-[#FAFAFA] outline-none focus:border-[#F4512C]"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </label>
            <label className="block text-xs font-bold text-[#141210] dark:text-[#FAFAFA]">
              Email
              <input
                required
                type="email"
                className="mt-1.5 w-full rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-3.5 py-2.5 text-sm text-[#141210] dark:text-[#FAFAFA] outline-none focus:border-[#F4512C]"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
          </div>
          <label className="block text-xs font-bold text-[#141210] dark:text-[#FAFAFA]">
            Service areas
            <p className="mt-0.5 text-[11px] font-normal text-[#6B645F] dark:text-[#9E958F]">
              Separate areas with commas
            </p>
            <input
              className="mt-1.5 w-full rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-3.5 py-2.5 text-sm text-[#141210] dark:text-[#FAFAFA] outline-none focus:border-[#F4512C]"
              value={form.serviceLocations}
              onChange={(e) =>
                setForm({ ...form, serviceLocations: e.target.value })
              }
            />
          </label>
          <div>
            <p className="text-xs font-bold text-[#141210] dark:text-[#FAFAFA]">
              Service categories
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SERVICES.map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => toggle(s)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                    form.categories.includes(s)
                      ? "border-[#F4512C] bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C]"
                      : "border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] text-[#6B645F] dark:text-[#9E958F] hover:text-[#141210] dark:hover:text-[#FAFAFA]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <label className="block text-xs font-bold text-[#141210] dark:text-[#FAFAFA]">
            Team size
            <select
              className="mt-1.5 w-full rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-3.5 py-2.5 text-sm text-[#141210] dark:text-[#FAFAFA] outline-none focus:border-[#F4512C]"
              value={form.teamSizeBand}
              onChange={(e) =>
                setForm({ ...form, teamSizeBand: e.target.value })
              }
            >
              <option>2-5</option>
              <option>6-15</option>
              <option>15+</option>
            </select>
          </label>
          <label className="block text-xs font-bold text-[#141210] dark:text-[#FAFAFA]">
            Logo URL
            <input
              className="mt-1.5 w-full rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-3.5 py-2.5 text-sm text-[#141210] dark:text-[#FAFAFA] outline-none focus:border-[#F4512C]"
              value={form.logoUrl}
              onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
            />
          </label>
          <label className="block text-xs font-bold text-[#141210] dark:text-[#FAFAFA]">
            Description
            <textarea
              className="mt-1.5 min-h-28 w-full rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-3.5 py-2.5 text-sm text-[#141210] dark:text-[#FAFAFA] outline-none focus:border-[#F4512C]"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </label>
          <button
            disabled={saving}
            className="w-full h-11 rounded-full bg-[#F4512C] hover:bg-[#E04320] text-sm font-semibold text-white transition disabled:opacity-50 cursor-pointer"
          >
            {saving ? "Saving..." : "Save agency profile"}
          </button>
        </section>
      </form>
    </PageShell>
  );
}
