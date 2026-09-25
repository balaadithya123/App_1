import {
  useState,
  useRef,
  useEffect,
  type FormEvent,
  type ReactNode,
} from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Building2,
  HardHat,
  Loader2,
  Users,
  Mic,
  Square,
  CheckCircle2,
  AlertCircle,
  Navigation,
} from "lucide-react";
import PageShell from "@/components/PageShell";
import GoogleLocationInput from "@/components/GoogleLocationInput";
import { supabase } from "@/lib/supabase";
import { setStandardLocation, detectGpsLocation } from "@/lib/location";

type Role = "worker" | "employer";
const categories = [
  "Electrician",
  "Plumber",
  "Carpenter",
  "Painter",
  "Cleaner",
  "Other",
];
const experienceBands = ["<1", "1–3", "3–5", "5+"];
const inputClass =
  "h-11 w-full rounded-[12px] border border-[#E4E4E7] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#09090B] px-3.5 text-sm text-[#09090B] dark:text-[#FAFAFA] focus:border-neutral-400 dark:focus:border-neutral-500 focus:outline-none transition placeholder:text-[#A1A1AA] dark:placeholder:text-[#71717A]";
const normalizePhone = (value: string) => value.replace(/\D/g, "").slice(0, 10);

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refCode = (searchParams.get("ref") || searchParams.get("code") || "")
    .trim()
    .toUpperCase();

  const [role, setRole] = useState<Role | null>(refCode ? "worker" : null);
  const [otpSent, setOtpSent] = useState(false);
  const [affiliation, setAffiliation] = useState(
    refCode ? "agency" : "independent",
  );
  const [enteredAgencyCode, setEnteredAgencyCode] = useState(refCode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (refCode) {
      setRole("worker");
      setAffiliation("agency");
      setEnteredAgencyCode(refCode);
    }
  }, [refCode]);

  // Worker Form Controlled Fields
  const [workerFullName, setWorkerFullName] = useState("");
  const [workerCategory, setWorkerCategory] = useState("");
  const [workerLocation, setWorkerLocation] = useState("");
  const [workerExperience, setWorkerExperience] = useState("");
  const [employerLocation, setEmployerLocation] = useState("");

  // Voice Fill State
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [isVoiceProcessing, setIsVoiceProcessing] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [voiceSuccess, setVoiceSuccess] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startVoiceFill = async () => {
    setVoiceError("");
    setVoiceSuccess("");
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        await processVoiceAudio(audioBlob);
      };

      recorder.start(250);
      setIsVoiceRecording(true);
    } catch (err: any) {
      console.error("Microphone error:", err);
      setVoiceError(
        "Could not access microphone. Please check browser permissions.",
      );
      setIsVoiceRecording(false);
    }
  };

  const stopVoiceFill = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    setIsVoiceRecording(false);
  };

  const processVoiceAudio = async (blob: Blob) => {
    setIsVoiceProcessing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(",")[1];
        try {
          const res = await fetch("/api/voice-onboarding", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              audioBase64: base64Data,
              mimeType: blob.type,
            }),
          });
          const data = await res.json();
          if (!res.ok)
            throw new Error(data.error || "Could not extract voice details.");

          const p = data.profile;
          if (p) {
            if (p.full_name) setWorkerFullName(p.full_name);
            if (p.service_area) setWorkerLocation(p.service_area);

            // Match service category
            if (
              Array.isArray(p.service_categories) &&
              p.service_categories.length > 0
            ) {
              const matched = categories.find((c) =>
                p.service_categories.some((sc: string) =>
                  sc.toLowerCase().includes(c.toLowerCase()),
                ),
              );
              if (matched) {
                setWorkerCategory(matched);
              } else {
                setWorkerCategory("Other");
              }
            }

            // Match experience band
            if (typeof p.years_experience === "number") {
              const yrs = p.years_experience;
              if (yrs < 1) setWorkerExperience("<1");
              else if (yrs <= 3) setWorkerExperience("1–3");
              else if (yrs <= 5) setWorkerExperience("3–5");
              else setWorkerExperience("5+");
            }

            setVoiceSuccess(
              "Details filled from your voice recording. You can adjust any field before submitting.",
            );
          }
        } catch (err: any) {
          setVoiceError(err.message || "Failed to process audio.");
        } finally {
          setIsVoiceProcessing(false);
        }
      };
      reader.readAsDataURL(blob);
    } catch (err: any) {
      setVoiceError("Audio reading failed.");
      setIsVoiceProcessing(false);
    }
  };

  const reset = () => {
    setError("");
    setSuccess("");
  };

  const beginPhoneVerification = async (phone: string) => {
    if (!supabase) throw new Error("Registration is not configured yet.");
    const { error: e } = await supabase.auth.updateUser({
      phone: `+91${phone}`,
    });
    if (e) throw e;
    setOtpSent(true);
    setSuccess(
      "Your email account is ready. We sent a separate phone OTP for contact verification.",
    );
  };

  const finishPhoneVerification = async (phone: string, otp: string) => {
    if (!supabase) throw new Error("Registration is not configured yet.");
    if (!otp) throw new Error("Enter the OTP sent to your phone.");
    const { error: e } = await supabase.auth.verifyOtp({
      phone: `+91${phone}`,
      token: otp,
      type: "phone_change",
    });
    if (e) throw e;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session)
      throw new Error(
        "Phone verified, but the email session could not be restored.",
      );
    const response = await fetch("/api/phone-verification/complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
    });
    const data = await response.json().catch(() => null);
    if (!response.ok)
      throw new Error(data?.message || "Unable to save phone verification.");
    return session.access_token;
  };

  const handleWorker = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    reset();
    const form = new FormData(event.currentTarget);
    const phone = normalizePhone(String(form.get("phone") || ""));
    const otp = String(form.get("otp") || "").trim();
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    const fullName = String(
      form.get("fullName") || workerFullName || "",
    ).trim();
    const category = String(form.get("category") || workerCategory || "");
    const location = String(
      form.get("location") || workerLocation || "",
    ).trim();
    const experience = String(form.get("experience") || workerExperience || "");
    const agencyCode = String(form.get("agencyCode") || "")
      .trim()
      .toUpperCase();

    if (!/^\d{10}$/.test(phone)) {
      setError("Phone number must be exactly 10 digits.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (!fullName || !category || !location || !experience) {
      setError("Please complete the required registration fields.");
      return;
    }
    if (affiliation === "agency" && !/^AGN-[A-Z0-9]{4,6}$/.test(agencyCode)) {
      setError("Enter a valid agency code such as AGN-7K2P.");
      return;
    }
    setStandardLocation(location, true);
    setBusy(true);
    try {
      if (!otpSent) {
        const { data, error: e } = await supabase!.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: "worker",
              name: fullName,
              phone,
              category,
              location,
              experience,
            },
          },
        });
        if (e) throw e;
        if (!data.session) {
          setSuccess(
            "Account created. Confirm your email, then sign in to verify your phone.",
          );
          return;
        }
        await beginPhoneVerification(phone);
        return;
      }
      const token = await finishPhoneVerification(phone, otp);
      const response = await fetch("/api/workers/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName,
          phone,
          category,
          location,
          experience,
          services: "Not added yet",
          about: "Not added yet",
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(data?.message || "Worker registration failed.");
      if (affiliation === "agency") {
        const join = await fetch("/api/agencies/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workerId: data.worker.id, agencyCode }),
        });
        const joinData = await join.json().catch(() => null);
        if (!join.ok)
          throw new Error(
            joinData?.message ||
              "Worker was created but could not be linked to that agency.",
          );
      }
      navigate("/worker-dashboard", { replace: true });
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

  const handleEmployer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    reset();
    const form = new FormData(event.currentTarget);
    const phone = normalizePhone(String(form.get("phone") || ""));
    const otp = String(form.get("otp") || "").trim();
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    const name = String(form.get("name") || "").trim();
    const location = String(
      form.get("location") || employerLocation || "",
    ).trim();

    if (!/^\d{10}$/.test(phone)) {
      setError("Phone number must be exactly 10 digits.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (!name) {
      setError("Name is required.");
      return;
    }
    if (location) {
      setStandardLocation(location, true);
    }
    setBusy(true);
    try {
      if (!otpSent) {
        const { data, error: e } = await supabase!.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: "employer",
              name,
              phone,
              location,
            },
          },
        });
        if (e) throw e;
        if (!data.session) {
          setSuccess(
            "Account created. Confirm your email, then sign in to verify your phone.",
          );
          return;
        }
        await beginPhoneVerification(phone);
        return;
      }
      await finishPhoneVerification(phone, otp);
      navigate("/home", { replace: true });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Registration failed. Please try again",
      );
    } finally {
      setBusy(false);
    }
  };

  if (!role) {
    return (
      <PageShell backTo="/" backLabel="Back">
        <section className="rounded-[16px] border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] px-5 py-8 text-center shadow-sm sm:px-8 sm:py-10">
          <h1 className="text-3xl font-bold text-[#09090B] dark:text-[#FAFAFA] sm:text-4xl">
            Register
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-[#71717A] dark:text-[#A1A1AA]">
            Choose how you want to use Local Worker Discovery.
          </p>
          <div className="mx-auto mt-8 grid max-w-5xl gap-5 sm:grid-cols-3">
            <Card
              icon={<HardHat size={36} className="text-[#09090B] dark:text-[#FAFAFA]" />}
              title="Register as Worker"
              text="Create a profile so nearby people can find your skills and services."
              actionLabel="Continue →"
              onClick={() => {
                setRole("worker");
                setOtpSent(false);
                setAffiliation("independent");
              }}
            />
            <Card
              icon={<Building2 size={36} className="text-[#09090B] dark:text-[#FAFAFA]" />}
              title="Register as Employer"
              text="Create a lightweight client account to track requests later."
              onClick={() => {
                setRole("employer");
                setOtpSent(false);
              }}
            />
            <Card
              icon={<Users size={36} className="text-[#09090B] dark:text-[#FAFAFA]" />}
              title="Register as Agency"
              text="Create an agency profile and manage a team of local workers."
              onClick={() => navigate("/register-agency")}
            />
          </div>
          <p className="mt-8 text-sm text-[#71717A] dark:text-[#A1A1AA]">
            Already have an account?{" "}
            <Link
              to="/login"
              state={{ from: "main" }}
              className="font-bold text-[#09090B] dark:text-[#FAFAFA] hover:underline"
            >
              Login
            </Link>
          </p>
        </section>
      </PageShell>
    );
  }

  if (role === "worker") {
    return (
      <PageShell
        backTo="/register"
        backLabel="Back"
        onBack={() => {
          if (refCode && window.history.state?.idx > 0) {
            navigate(-1);
          } else {
            setRole(null);
          }
        }}
      >
        <Header
          title="Register as a Worker"
          text="Email is your login. Phone verification is separate and powers your contact verification badge."
        />

        {/* Voice Auto-fill Bar directly inside form */}
        <div className="mt-6 rounded-[16px] border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] p-5 shadow-sm transition-colors">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-[#09090B] dark:text-[#FAFAFA]">
                <Mic
                  size={16}
                  className={
                    isVoiceRecording
                      ? "animate-pulse text-rose-500"
                      : "text-current"
                  }
                />
                <span>Quick voice fill</span>
              </div>
              <p className="mt-0.5 text-xs text-[#71717A] dark:text-[#A1A1AA]">
                Speak your name, trade, location, and years of experience to
                automatically fill the fields below.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isVoiceRecording ? (
                <button
                  type="button"
                  onClick={stopVoiceFill}
                  className="inline-flex h-9 items-center gap-2 rounded-full bg-rose-600 px-4 text-xs font-bold text-white transition hover:bg-rose-700 shadow-sm cursor-pointer"
                >
                  <Square size={13} className="fill-white" />
                  <span>Stop & Fill</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startVoiceFill}
                  disabled={isVoiceProcessing}
                  className="inline-flex h-9 items-center gap-2 rounded-full border border-[#E4E4E7] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#09090B] px-4 text-xs font-bold text-[#09090B] dark:text-[#FAFAFA] transition hover:border-neutral-400 dark:hover:border-neutral-500 disabled:opacity-50 shadow-sm cursor-pointer"
                >
                  {isVoiceProcessing ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Extracting details...</span>
                    </>
                  ) : (
                    <>
                      <Mic size={14} />
                      <span>Speak to fill</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {isVoiceRecording && (
            <div className="mt-3 flex items-center gap-2 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 px-3.5 py-1.5 text-xs font-medium text-rose-700 dark:text-rose-400">
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
              <span>
                Listening... Speak naturally in English, Tamil, or Hindi.
              </span>
            </div>
          )}

          {voiceSuccess && (
            <div className="mt-3 flex items-center gap-2 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 px-3.5 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 size={15} className="shrink-0" />
              <span>{voiceSuccess}</span>
            </div>
          )}

          {voiceError && (
            <div className="mt-3 flex items-center gap-2 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 px-3.5 py-1.5 text-xs font-medium text-rose-700 dark:text-rose-400">
              <AlertCircle size={15} className="shrink-0" />
              <span>{voiceError}</span>
            </div>
          )}
        </div>

        <form
          onSubmit={handleWorker}
          className="mt-6 space-y-4 rounded-[16px] border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] p-6 shadow-sm sm:p-8"
        >
          <Field
            name="email"
            label="Email Address"
            required
            placeholder="you@example.com"
            type="email"
          />
          <Field
            name="password"
            label="Password"
            required
            placeholder="At least 6 characters"
            type="password"
          />
          <Field
            name="phone"
            label="Phone Number"
            required
            placeholder="10-digit mobile number"
            numeric
          />

          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#09090B] dark:text-[#FAFAFA]">
              Name
            </label>
            <input
              name="fullName"
              required
              value={workerFullName}
              onChange={(e) => setWorkerFullName(e.target.value)}
              placeholder="Your name"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#09090B] dark:text-[#FAFAFA]">
              Primary Service Category
            </label>
            <select
              name="category"
              required
              value={workerCategory}
              onChange={(e) => setWorkerCategory(e.target.value)}
              className={inputClass}
            >
              <option value="">Select one</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <GoogleLocationInput
            name="location"
            label="Service Area / Location Covered"
            required
            autoDetectGPSOnMount={true}
            setAsStandardOnSelect={true}
            value={workerLocation}
            onChange={(loc) => setWorkerLocation(loc)}
            placeholder="Auto-detecting via GPS or search..."
            helperText="Auto-detected via GPS. Tap to change or search address."
          />

          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#09090B] dark:text-[#FAFAFA]">
              Years of Experience
            </label>
            <select
              name="experience"
              required
              value={workerExperience}
              onChange={(e) => setWorkerExperience(e.target.value)}
              className={inputClass}
            >
              <option value="">Select a band</option>
              {experienceBands.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#09090B] dark:text-[#FAFAFA]">
              Agency Affiliation
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex items-center gap-2 rounded-[12px] border border-[#E4E4E7] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#09090B] px-4 py-3 text-sm font-semibold text-[#09090B] dark:text-[#FAFAFA] cursor-pointer">
                <input
                  type="radio"
                  name="affiliation"
                  value="independent"
                  checked={affiliation === "independent"}
                  onChange={() => setAffiliation("independent")}
                  className="accent-black dark:accent-white"
                />{" "}
                Join as independent
              </label>
              <label className="flex items-center gap-2 rounded-[12px] border border-[#E4E4E7] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#09090B] px-4 py-3 text-sm font-semibold text-[#09090B] dark:text-[#FAFAFA] cursor-pointer">
                <input
                  type="radio"
                  name="affiliation"
                  value="agency"
                  checked={affiliation === "agency"}
                  onChange={() => setAffiliation("agency")}
                  className="accent-black dark:accent-white"
                />{" "}
                Enter agency code
              </label>
            </div>
            {affiliation === "agency" && (
              <input
                name="agencyCode"
                required
                value={enteredAgencyCode}
                onChange={(e) =>
                  setEnteredAgencyCode(e.target.value.toUpperCase())
                }
                placeholder="AGN-7K2P"
                className={`${inputClass} mt-2 font-mono tracking-wider`}
              />
            )}
          </div>

          {otpSent && (
            <Field
              name="otp"
              label="Phone OTP"
              required
              placeholder="Enter 6-digit OTP"
              numeric
            />
          )}

          {error && (
            <p
              role="alert"
              className="text-center text-xs font-semibold text-rose-600 dark:text-rose-400"
            >
              {error}
            </p>
          )}

          {success && (
            <p
              role="status"
              className="rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 px-4 py-2 text-center text-xs font-semibold text-emerald-700 dark:text-emerald-300"
            >
              {success}
            </p>
          )}

          <button
            disabled={busy}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-black text-white dark:bg-white dark:text-black text-sm font-bold shadow-sm hover:bg-neutral-800 dark:hover:bg-neutral-200 transition disabled:opacity-70 cursor-pointer"
          >
            {busy ? (
              <>
                <Loader2 size={17} className="animate-spin text-current" /> Processing...
              </>
            ) : otpSent ? (
              "Verify Phone & Register"
            ) : (
              "Create Account & Verify Phone"
            )}
          </button>
        </form>
      </PageShell>
    );
  }

  return (
    <PageShell backTo="/register" backLabel="Back" onBack={() => setRole(null)}>
      <Header
        title="Register as a Client"
        text="Email is your login. Phone verification is separate and required for contact purposes."
      />
      <form
        onSubmit={handleEmployer}
        className="mt-6 space-y-4 rounded-[16px] border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] p-6 shadow-sm sm:p-8"
      >
        <Field
          name="email"
          label="Email Address"
          required
          placeholder="you@example.com"
          type="email"
        />
        <Field
          name="password"
          label="Password"
          required
          placeholder="At least 6 characters"
          type="password"
        />
        <Field
          name="phone"
          label="Phone Number"
          required
          placeholder="10-digit mobile number"
          numeric
        />
        <Field name="name" label="Name" required placeholder="Your name" />
        <GoogleLocationInput
          name="location"
          label="Default Location"
          autoDetectGPSOnMount={true}
          setAsStandardOnSelect={true}
          value={employerLocation}
          onChange={(loc) => setEmployerLocation(loc)}
          placeholder="Auto-detecting via GPS or search..."
          helperText="Auto-detected via GPS. Used as your standard search location."
        />
        {otpSent && (
          <Field
            name="otp"
            label="Phone OTP"
            required
            placeholder="Enter 6-digit OTP"
            numeric
          />
        )}
        {error && (
          <p
            role="alert"
            className="text-center text-xs font-semibold text-rose-600 dark:text-rose-400"
          >
            {error}
          </p>
        )}
        {success && (
          <p
            role="status"
            className="rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 px-4 py-2 text-center text-xs font-semibold text-emerald-700 dark:text-emerald-300"
          >
            {success}
          </p>
        )}
        <button
          disabled={busy}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-black text-white dark:bg-white dark:text-black text-sm font-bold shadow-sm hover:bg-neutral-800 dark:hover:bg-neutral-200 transition disabled:opacity-70 cursor-pointer"
        >
          {busy ? (
            <>
              <Loader2 size={17} className="animate-spin text-current" /> Processing...
            </>
          ) : otpSent ? (
            "Verify Phone & Register"
          ) : (
            "Create Account & Verify Phone"
          )}
        </button>
      </form>
    </PageShell>
  );
}

function Card({
  icon,
  title,
  text,
  onClick,
  actionLabel = "Continue →",
  children,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  onClick: () => void;
  actionLabel?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between rounded-[16px] border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] p-6 text-left shadow-sm hover:border-neutral-400 dark:hover:border-neutral-600 transition">
      <div>
        <div className="mb-4 inline-flex">{icon}</div>
        <h2 className="text-lg font-bold text-[#09090B] dark:text-[#FAFAFA]">{title}</h2>
        <p className="mt-1.5 text-xs text-[#71717A] dark:text-[#A1A1AA] leading-relaxed">{text}</p>
      </div>
      <div className="mt-5 space-y-3">
        {children}
        <button
          type="button"
          onClick={onClick}
          className="inline-flex items-center gap-1 text-xs font-bold text-[#09090B] dark:text-[#FAFAFA] hover:underline transition cursor-pointer"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

function Header({ title, text }: { title: string; text: string }) {
  return (
    <section className="rounded-[16px] border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] px-6 py-6 shadow-sm sm:px-8 sm:py-8">
      <h1 className="text-2xl font-bold text-[#09090B] dark:text-[#FAFAFA] sm:text-3xl">{title}</h1>
      <p className="mt-1 text-xs text-[#71717A] dark:text-[#A1A1AA]">{text}</p>
    </section>
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
      <label className="mb-1.5 block text-xs font-bold text-[#09090B] dark:text-[#FAFAFA]">
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
