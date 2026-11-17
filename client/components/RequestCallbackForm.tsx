import { useState, useEffect, type FormEvent } from "react";
import {
  X,
  UserCheck,
  ShieldAlert,
  PhoneCall,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { logAnalyticsEvent } from "@/lib/analytics";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  workerId?: string;
  agencyId?: string;
  workerName?: string;
  agencyName?: string;
  service: string;
  onClose: () => void;
};

export default function RequestCallbackForm({
  workerId,
  agencyId,
  workerName,
  agencyName,
  service,
  onClose,
}: Props) {
  const [accountName, setAccountName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [serviceNeeded, setServiceNeeded] = useState(service);
  const [preferredTime, setPreferredTime] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loadingUser, setLoadingUser] = useState(true);

  const targetName = agencyName || workerName || "the provider";

  useEffect(() => {
    if (!supabase) {
      setLoadingUser(false);
      return;
    }
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (u) {
        const meta = u.user_metadata || {};
        const resolvedName =
          meta.name ||
          meta.full_name ||
          meta.fullName ||
          meta.contact_person_name ||
          (u.email ? u.email.split("@")[0] : "") ||
          "Account User";
        setAccountName(resolvedName);
        const rawPhone = meta.phone || u.phone || "";
        const normalized = String(rawPhone)
          .replace(/^\+91/, "")
          .replace(/\D/g, "")
          .slice(-10);
        if (normalized && normalized.length === 10) {
          setPhone(normalized);
        }
      } else {
        setAccountName("Registered User");
      }
      setLoadingUser(false);
    });
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!supabase) {
      setError("Callback requests are temporarily unavailable.");
      return;
    }

    const normalizedPhone = phone.replace(/\D/g, "").slice(-10);
    if (!/^\d{10}$/.test(normalizedPhone)) {
      setError("Enter a valid 10-digit phone number.");
      return;
    }

    if (!workerId && !agencyId) {
      setError("No callback target was selected.");
      return;
    }

    const finalClientName = (accountName || "Account User").trim();

    setSaving(true);
    try {
      const { error: insertError } = await supabase
        .from("callback_requests")
        .insert({
          worker_id: workerId || null,
          agency_id: agencyId || null,
          client_name: finalClientName,
          client_phone: normalizedPhone,
          service_needed: serviceNeeded.trim(),
          preferred_time: preferredTime.trim(),
          notes: notes.trim() || null,
        });

      if (insertError) throw insertError;

      void logAnalyticsEvent(
        "callback_submitted",
        workerId || agencyId || null,
        {
          service: serviceNeeded.trim(),
          target_type: agencyId ? "agency" : "worker",
        },
      );

      setMessage(`Callback requested successfully for ${targetName}!`);
      setPreferredTime("");
      setNotes("");
    } catch {
      setError(
        "Unable to send the callback request right now. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-xs sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <section className="w-full max-w-md rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C]">
                <PhoneCall size={15} />
              </span>
              <h2 className="text-lg font-extrabold text-[#141210] dark:text-[#FAFAFA]">
                Request a Callback
              </h2>
            </div>
            <p className="mt-1 text-xs text-[#6B645F] dark:text-[#9E958F]">
              Ask{" "}
              <span className="font-semibold text-[#141210] dark:text-[#FAFAFA]">{targetName}</span>{" "}
              to contact you directly.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-[#8C847E] dark:text-[#766F6A] transition hover:bg-[#FAF8F5] dark:hover:bg-[#242220] hover:text-[#141210] dark:hover:text-white cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {message ? (
          <div className="mt-5 space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0F8A73]/10 text-[#0F8A73] dark:text-[#3DD1B3]">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#141210] dark:text-[#FAFAFA]">Request Sent</h3>
              <p className="mt-1 text-xs text-[#6B645F] dark:text-[#9E958F]">{message}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-full items-center justify-center rounded-full bg-[#F4512C] hover:bg-[#E04320] text-xs font-bold text-white transition cursor-pointer active:scale-95"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-3.5">
            {/* Account Holder Verified Identification (No manual name input) */}
            <div className="flex items-center gap-2.5 rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] text-[#F4512C]">
                <UserCheck size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6B645F] dark:text-[#9E958F]">
                  Account Holder
                </span>
                {loadingUser ? (
                  <Skeleton className="mt-1 h-4 w-36 rounded-md" />
                ) : (
                  <p className="truncate text-xs font-bold text-[#141210] dark:text-[#FAFAFA]">
                    {accountName || "Verified Account Holder"}
                  </p>
                )}
              </div>
              <span className="rounded-full border border-[#0F8A73]/30 bg-[#0F8A73]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#0F8A73] dark:text-[#3DD1B3]">
                Verified
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B645F] dark:text-[#9E958F]">
                Contact Phone
              </label>
              <div className="mt-1 flex h-10 overflow-hidden rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] focus-within:border-[#F4512C] focus-within:ring-2 focus-within:ring-[#F4512C]/15">
                <span className="flex items-center border-r border-[#EAE2DC] dark:border-white/10 bg-[#F5EFEA] dark:bg-[#242220] px-3 text-xs font-bold text-[#6B645F] dark:text-[#9E958F]">
                  +91
                </span>
                <input
                  required
                  inputMode="numeric"
                  maxLength={10}
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  placeholder="10-digit mobile number"
                  className="min-w-0 flex-1 bg-transparent px-3 text-xs font-medium text-[#141210] dark:text-[#FAFAFA] placeholder:text-[#8C847E] dark:placeholder:text-[#766F6A] outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B645F] dark:text-[#9E958F]">
                Service Needed
              </label>
              <input
                required
                value={serviceNeeded}
                onChange={(e) => setServiceNeeded(e.target.value)}
                placeholder="e.g. Electrical wiring repair, Fan installation"
                className="mt-1 h-10 w-full rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-3 text-xs font-medium text-[#141210] dark:text-[#FAFAFA] placeholder:text-[#8C847E] dark:placeholder:text-[#766F6A] outline-hidden focus:border-[#F4512C] focus:ring-2 focus:ring-[#F4512C]/15"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B645F] dark:text-[#9E958F]">
                Preferred Time
              </label>
              <div className="mt-1 flex items-center rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-3 focus-within:border-[#F4512C] focus-within:ring-2 focus-within:ring-[#F4512C]/15">
                <Clock size={13} className="text-[#8C847E] dark:text-[#766F6A] shrink-0 mr-2" />
                <input
                  required
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  placeholder="e.g. Today 4:00 PM, Tomorrow Morning"
                  className="h-10 w-full bg-transparent text-xs font-medium text-[#141210] dark:text-[#FAFAFA] placeholder:text-[#8C847E] dark:placeholder:text-[#766F6A] outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B645F] dark:text-[#9E958F]">
                Notes / Address Details (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Brief description or locality details..."
                className="mt-1 w-full resize-none rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] p-2.5 text-xs font-medium text-[#141210] dark:text-[#FAFAFA] placeholder:text-[#8C847E] dark:placeholder:text-[#766F6A] outline-hidden focus:border-[#F4512C] focus:ring-2 focus:ring-[#F4512C]/15"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400"
              >
                <ShieldAlert size={14} className="shrink-0" />
                <span>{error}</span>
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="flex h-10 w-full items-center justify-center rounded-full bg-[#F4512C] hover:bg-[#E04320] text-xs font-bold text-white transition disabled:opacity-60 cursor-pointer active:scale-95"
            >
              {saving ? "Sending Request..." : "Submit Callback Request"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
