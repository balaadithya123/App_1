import { useState, type FormEvent } from "react";
import { Building2, Loader2, CheckCircle2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import GoogleLocationInput from "@/components/GoogleLocationInput";
import { supabase } from "@/lib/supabase";
import { setStandardLocation } from "@/lib/location";

const categoryOptions = [
  "Electrician",
  "Plumber",
  "Carpenter",
  "Painter",
  "Cleaner",
  "Other",
];
const inputClass =
  "h-11 w-full rounded-[12px] border border-[#E4E4E7] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#09090B] px-3 text-sm text-[#09090B] dark:text-[#FAFAFA] placeholder:text-[#A1A1AA] dark:placeholder:text-[#71717A] outline-none focus:border-neutral-400 dark:focus:border-neutral-500 transition";
const normalizePhone = (value: string) => value.replace(/\D/g, "").slice(0, 10);

export default function AgencyRegister() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [serviceAreaInput, setServiceAreaInput] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!supabase) {
      setError("Registration is not configured yet.");
      return;
    }

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const contactPersonName = String(
      form.get("contactPersonName") || "",
    ).trim();
    const phone = normalizePhone(String(form.get("phone") || ""));
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    const rawLocations = String(
      form.get("serviceLocations") || serviceAreaInput || "",
    ).trim();
    const serviceLocations = rawLocations
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    const teamSizeBand = String(form.get("teamSizeBand") || "2-5");
    const businessRegistrationNumber = String(
      form.get("businessRegistrationNumber") || "",
    ).trim();
    const logoUrl = String(form.get("logoUrl") || "").trim();
    const description = String(form.get("description") || "").trim();

    if (!/^\d{10}$/.test(phone)) {
      setError("Phone number must be exactly 10 digits.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (!contactPersonName || !name) {
      setError("Agency name and contact person are required.");
      return;
    }
    if (!categories.length) {
      setError("Select at least one service category.");
      return;
    }
    if (!serviceLocations.length) {
      setError("Add at least one service area.");
      return;
    }

    if (serviceLocations[0]) {
      setStandardLocation(serviceLocations[0], true);
    }

    setBusy(true);
    try {
      // 1. Sign up user
      let token = "";
      const { data: signUpData, error: authError } = await supabase.auth.signUp(
        {
          email,
          password,
          options: {
            data: {
              role: "agency",
              name,
              phone,
              location: serviceLocations[0],
            },
          },
        },
      );

      if (authError) {
        // If user already exists, try signing in
        if (authError.message.toLowerCase().includes("already registered")) {
          const { data: signInData, error: signInError } =
            await supabase.auth.signInWithPassword({
              email,
              password,
            });
          if (signInError)
            throw new Error(
              "An account with this email already exists. Please sign in or use a different email.",
            );
          token = signInData.session?.access_token || "";
        } else {
          throw authError;
        }
      } else {
        token = signUpData.session?.access_token || "";
      }

      if (!token) {
        // In case email verification is strictly required by Supabase project
        setSuccess(
          "Agency account created. If email verification is enabled, please confirm your email, then sign in.",
        );
        setBusy(false);
        return;
      }

      // 2. Persist agency profile immediately
      const response = await fetch("/api/agencies/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          contactPersonName,
          phone,
          email,
          categories,
          serviceLocations,
          teamSizeBand,
          businessRegistrationNumber,
          logoUrl,
          description,
        }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(result?.message || "Unable to save agency profile.");

      setSuccess("Agency profile registered successfully!");
      setTimeout(() => {
        navigate("/agency/dashboard", { replace: true });
      }, 1000);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Registration failed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell backTo="/register" backLabel="Back">
      <section className="rounded-[16px] border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] px-5 py-7 sm:px-8 sm:py-8 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-black text-white dark:bg-white dark:text-black shadow-sm">
            <Building2 size={24} />
          </div>
          <div>
            <h1 className="text-[26px] sm:text-[30px] font-bold leading-tight tracking-tight text-[#09090B] dark:text-[#FAFAFA]">
              Register as an Agency
            </h1>
            <p className="mt-2 text-sm text-[#71717A] dark:text-[#A1A1AA]">
              Create an agency profile to get listed in the directory and manage
              local service bookings.
            </p>
          </div>
        </div>
      </section>

      <form
        onSubmit={submit}
        className="mt-6 space-y-5 rounded-[16px] border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] p-5 shadow-sm sm:p-7"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            name="name"
            label="Agency Name"
            required
            placeholder="Your agency name"
          />
          <Field
            name="contactPersonName"
            label="Contact Person Name"
            required
            placeholder="Person responsible for the agency"
          />
          <Field
            name="email"
            label="Email Address"
            required
            type="email"
            placeholder="agency@example.com"
          />
          <Field
            name="password"
            label="Password"
            required
            type="password"
            placeholder="At least 6 characters"
          />
          <Field
            name="phone"
            label="Phone Number"
            required
            placeholder="10-digit mobile number"
            numeric
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold text-[#09090B] dark:text-[#FAFAFA]">
            Service Categories
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {categoryOptions.map((c) => (
              <label
                key={c}
                className="flex cursor-pointer items-center gap-2 rounded-[12px] border border-[#E4E4E7] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#09090B] px-3 py-2.5 text-sm text-[#09090B] dark:text-[#FAFAFA] hover:border-neutral-400 dark:hover:border-neutral-500 transition"
              >
                <input
                  type="checkbox"
                  checked={categories.includes(c)}
                  onChange={() =>
                    setCategories((v) =>
                      v.includes(c) ? v.filter((x) => x !== c) : [...v, c],
                    )
                  }
                  className="rounded accent-black dark:accent-white"
                />
                <span>{c}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <GoogleLocationInput
            name="serviceLocations"
            label="Primary Service Area / Coverage Hub"
            required
            autoDetectGPSOnMount={true}
            setAsStandardOnSelect={true}
            value={serviceAreaInput}
            onChange={(loc) => setServiceAreaInput(loc)}
            placeholder="Auto-detecting via GPS or search..."
            helperText="Auto-detected via GPS. Multiple service coverage areas can be comma separated."
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold text-[#09090B] dark:text-[#FAFAFA]">
            Team Size
          </label>
          <select name="teamSizeBand" defaultValue="2-5" className={inputClass}>
            <option value="2-5">2–5 workers</option>
            <option value="6-15">6–15 workers</option>
            <option value="15+">15+ workers</option>
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            name="businessRegistrationNumber"
            label="Business Registration / GST (optional)"
            placeholder="Optional"
          />
          <Field
            name="logoUrl"
            label="Logo URL (optional)"
            placeholder="Optional image URL"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold text-[#09090B] dark:text-[#FAFAFA]">
            About the Agency
          </label>
          <textarea
            name="description"
            rows={4}
            placeholder="Tell people what your agency does"
            className="w-full resize-none rounded-[12px] border border-[#E4E4E7] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#09090B] px-3 py-3 text-sm text-[#09090B] dark:text-[#FAFAFA] placeholder:text-[#A1A1AA] dark:placeholder:text-[#71717A] outline-none focus:border-neutral-400 dark:focus:border-neutral-500 transition"
          />
        </div>

        {error && (
          <p
            role="alert"
            className="text-center text-xs font-semibold text-rose-600 dark:text-rose-400"
          >
            {error}
          </p>
        )}
        {success && (
          <div
            role="status"
            className="flex items-center justify-center gap-2 rounded-[12px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 dark:border-emerald-800/40 px-3 py-2.5 text-center text-xs font-semibold text-emerald-700 dark:text-emerald-300"
          >
            <CheckCircle2 size={16} />
            <span>{success}</span>
          </div>
        )}

        <button
          disabled={busy}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-black text-white dark:bg-white dark:text-black text-sm font-semibold shadow-sm hover:bg-neutral-800 dark:hover:bg-neutral-200 transition disabled:opacity-60 cursor-pointer active:scale-[0.99]"
        >
          {busy ? (
            <>
              <Loader2 size={17} className="animate-spin text-current" /> Registering
              Agency...
            </>
          ) : (
            "Create Agency Profile"
          )}
        </button>

        <p className="text-center text-sm text-[#71717A] dark:text-[#A1A1AA]">
          Already registered?{" "}
          <Link
            to="/login"
            state={{ from: "main" }}
            className="font-semibold text-[#09090B] dark:text-[#FAFAFA] hover:underline"
          >
            Sign in
          </Link>
        </p>
      </form>
    </PageShell>
  );
}

function Field({
  name,
  label,
  required,
  placeholder,
  type = "text",
  numeric = false,
}: {
  name: string;
  label: string;
  required?: boolean;
  placeholder: string;
  type?: string;
  numeric?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold text-[#09090B] dark:text-[#FAFAFA]">
        {label}
        {!required && (
          <span className="ml-1 font-normal text-[#71717A] dark:text-[#A1A1AA]">(optional)</span>
        )}
      </label>
      <input
        name={name}
        required={required}
        type={type}
        minLength={type === "password" ? 6 : undefined}
        inputMode={numeric ? "numeric" : undefined}
        maxLength={numeric ? 10 : undefined}
        onInput={
          numeric
            ? (e) => {
                e.currentTarget.value = e.currentTarget.value
                  .replace(/\D/g, "")
                  .slice(0, 10);
              }
            : undefined
        }
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  );
}
