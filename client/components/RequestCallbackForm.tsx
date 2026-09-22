import { useState, useEffect, type FormEvent } from "react";
import { X, UserCheck, ShieldAlert, PhoneCall, Clock, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { logAnalyticsEvent } from "@/lib/analytics";

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
      const { error: insertError } = await supabase.from("callback_requests").insert({
        worker_id: workerId || null,
        agency_id: agencyId || null,
        client_name: finalClientName,
        client_phone: normalizedPhone,
        service_needed: serviceNeeded.trim(),
        preferred_time: preferredTime.trim(),
        notes: notes.trim() || null,
      });

      if (insertError) throw insertError;

      void logAnalyticsEvent("callback_submitted", workerId || agencyId || null, {
        service: serviceNeeded.trim(),
        target_type: agencyId ? "agency" : "worker",
      });

      setMessage(`Callback requested successfully for ${targetName}!`);
      setPreferredTime("");
      setNotes("");
    } catch {
      setError("Unable to send the callback request right now. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-xs sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <section className="w-full max-w-md rounded-[20px] border border-[#E7ECF1] bg-white p-5 shadow-xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100/20 text-primary">
                <PhoneCall size={15} />
              </span>
              <h2 className="text-lg font-bold text-[#2C2C2C]">Request a Callback</h2>
            </div>
            <p className="mt-1 text-xs text-[#67696D]">
              Ask <span className="font-semibold text-[#2C2C2C]">{targetName}</span> to contact you directly.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-[#989EA7] transition hover:bg-[#F6F9FC] hover:text-[#2C2C2C] cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {message ? (
          <div className="mt-5 space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#2C2C2C]">Request Sent</h3>
              <p className="mt-1 text-xs text-[#67696D]">{message}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-full items-center justify-center rounded-full bg-primary text-xs font-bold text-white transition hover:bg-[#157ad4] shadow-subtle cursor-pointer active:scale-95"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-3.5">
            {/* Account Holder Verified Identification (No manual name input) */}
            <div className="flex items-center gap-2.5 rounded-[12px] border border-[#E7ECF1] bg-[#F6F9FC] p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#E7ECF1] bg-white text-primary shadow-subtle">
                <UserCheck size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#67696D]">
                  Account Holder
                </span>
                <p className="truncate text-xs font-bold text-[#2C2C2C]">
                  {loadingUser ? "Loading account..." : accountName || "Verified Account Holder"}
                </p>
              </div>
              <span className="rounded-full border border-primary-100/40 bg-primary-100/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                Verified
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#67696D]">
                Contact Phone
              </label>
              <div className="mt-1 flex h-10 overflow-hidden rounded-[12px] border border-[#E7ECF1] bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                <span className="flex items-center border-r border-[#E7ECF1] bg-[#F6F9FC] px-3 text-xs font-bold text-[#67696D]">
                  +91
                </span>
                <input
                  required
                  inputMode="numeric"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10-digit mobile number"
                  className="min-w-0 flex-1 bg-transparent px-3 text-xs font-medium text-[#2C2C2C] placeholder:text-[#989EA7] outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#67696D]">
                Service Needed
              </label>
              <input
                required
                value={serviceNeeded}
                onChange={(e) => setServiceNeeded(e.target.value)}
                placeholder="e.g. Electrical wiring repair, Fan installation"
                className="mt-1 h-10 w-full rounded-[12px] border border-[#E7ECF1] bg-white px-3 text-xs font-medium text-[#2C2C2C] placeholder:text-[#989EA7] outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#67696D]">
                Preferred Time
              </label>
              <div className="mt-1 flex items-center rounded-[12px] border border-[#E7ECF1] bg-white px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                <Clock size={13} className="text-[#989EA7] shrink-0 mr-2" />
                <input
                  required
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  placeholder="e.g. Today 4:00 PM, Tomorrow Morning"
                  className="h-10 w-full bg-transparent text-xs font-medium text-[#2C2C2C] placeholder:text-[#989EA7] outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#67696D]">
                Notes / Address Details (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Brief description or locality details..."
                className="mt-1 w-full resize-none rounded-[12px] border border-[#E7ECF1] bg-white p-2.5 text-xs font-medium text-[#2C2C2C] placeholder:text-[#989EA7] outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="flex items-center gap-1.5 rounded-[12px] border border-destructive/30 bg-destructive/10 p-2.5 text-xs font-semibold text-destructive"
              >
                <ShieldAlert size={14} className="shrink-0" />
                <span>{error}</span>
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="flex h-10 w-full items-center justify-center rounded-full bg-primary text-xs font-bold text-white shadow-subtle transition hover:bg-[#157ad4] disabled:opacity-60 cursor-pointer active:scale-95"
            >
              {saving ? "Sending Request..." : "Submit Callback Request"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
