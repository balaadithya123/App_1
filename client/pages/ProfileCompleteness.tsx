import { useEffect, useState, useRef } from "react";
import {
  CheckCircle2,
  Circle,
  ShieldCheck,
  UserRound,
  ArrowLeft,
  Camera,
  ArrowRight,
  Sparkles,
  Check,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { ScoreCardSkeleton } from "@/components/PageSkeletons";
import { supabase } from "@/lib/supabase";

type CheckItem = {
  id: string;
  label: string;
  description: string;
  done: boolean;
  actionText: string;
  fieldKey: string;
};

export default function ProfileCompleteness() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadUser = () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        navigate("/login", { replace: true });
        return;
      }
      if (data.user.user_metadata?.role !== "worker") {
        navigate("/", { replace: true });
        return;
      }
      setUser(data.user);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadUser();
  }, [navigate]);

  const handlePhotoUpload = async (file: File) => {
    if (!supabase || !user) return;
    if (!file.type.startsWith("image/")) {
      setActionNotice("Please select a valid image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setActionNotice("Photo must be 5 MB or smaller.");
      return;
    }

    setUploadingPhoto(true);
    setActionNotice(null);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/profile.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: "3600",
        });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const avatarUrl = `${data.publicUrl}?v=${Date.now()}`;

      const { error: updateError } = await supabase.auth.updateUser({
        data: { ...user.user_metadata, avatar_url: avatarUrl },
      });
      if (updateError) throw updateError;

      setUser((prev: any) => ({
        ...prev,
        user_metadata: {
          ...(prev?.user_metadata || {}),
          avatar_url: avatarUrl,
        },
      }));
      setActionNotice("Profile photo uploaded successfully!");
      setTimeout(() => setActionNotice(null), 3000);
    } catch (err: any) {
      setActionNotice(err?.message || "Failed to upload photo.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleAction = (item: CheckItem) => {
    if (item.id === "photo") {
      fileInputRef.current?.click();
      return;
    }
    // Navigate to profile page for field editing
    navigate("/profile", { state: { edit: true, focusField: item.fieldKey } });
  };

  if (loading) {
    return (
      <PageShell hideBack hideHome>
        <ScoreCardSkeleton />
      </PageShell>
    );
  }

  if (!user) return null;

  const m = user.user_metadata || {};
  const isFilled = (value: unknown) =>
    Boolean(
      String(value ?? "").trim() && String(value).trim() !== "Not added yet",
    );

  const checks: CheckItem[] = [
    {
      id: "photo",
      label: "Profile Photo",
      description:
        "Clients are 4x more likely to contact profiles with a clear picture.",
      done: Boolean(m.avatar_url),
      actionText: "Upload Photo",
      fieldKey: "avatar_url",
    },
    {
      id: "name",
      label: "Full Name",
      description: "Your official name shown to clients and employers.",
      done: isFilled(m.name),
      actionText: "Add Name",
      fieldKey: "name",
    },
    {
      id: "category",
      label: "Primary Trade / Category",
      description: "e.g. Electrician, Plumber, AC Repair, Carpenter.",
      done: isFilled(m.category),
      actionText: "Set Category",
      fieldKey: "category",
    },
    {
      id: "location",
      label: "Location & Service Area",
      description: "Neighborhoods and city areas you are willing to travel to.",
      done: isFilled(m.location),
      actionText: "Add Area",
      fieldKey: "location",
    },
    {
      id: "services",
      label: "Specific Services Offered",
      description:
        "List specific jobs you do (e.g. Inverter Wiring, Fan Installation).",
      done: Array.isArray(m.services)
        ? m.services.some((s: any) => isFilled(s))
        : isFilled(m.services),
      actionText: "Add Services",
      fieldKey: "services",
    },
    {
      id: "experience",
      label: "Years of Experience",
      description: "Your professional background and trade expertise.",
      done: isFilled(m.experience),
      actionText: "Add Experience",
      fieldKey: "experience",
    },
    {
      id: "about",
      label: "About You / Bio",
      description: "Introduce your working style, guarantee, or tools.",
      done: isFilled(m.about),
      actionText: "Add Bio",
      fieldKey: "about",
    },
    {
      id: "phone",
      label: "Phone Number",
      description: "The direct 10-digit number clients will use to reach you.",
      done: Boolean(user.phone || m.phone),
      actionText: "Add Phone",
      fieldKey: "phone",
    },
  ];

  const completedCount = checks.filter((c) => c.done).length;
  const percent = Math.round((completedCount / checks.length) * 100);
  const phoneVerified = Boolean(user.phone && user.phone_confirmed_at);

  return (
    <PageShell hideBack hideHome>
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handlePhotoUpload(file);
          e.currentTarget.value = "";
        }}
      />

      <div className="mx-auto max-w-3xl space-y-5">
        {/* Header Card */}
        <section className="rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-gradient-to-br from-[#FFF4EF] via-[#FAF8F5] to-[#F5EAE2] dark:from-[#261B16] dark:via-[#1C1512] dark:to-[#15110F] p-5 sm:p-6">
          <button
            type="button"
            onClick={() =>
              window.history.state &&
              typeof window.history.state.idx === "number" &&
              window.history.state.idx > 0
                ? navigate(-1)
                : navigate("/worker-dashboard")
            }
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B645F] dark:text-[#9E958F] transition hover:text-[#141210] dark:hover:text-[#FAFAFA] cursor-pointer"
          >
            <ArrowLeft size={14} /> Back
          </button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C]">
                <UserRound size={22} />
              </span>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#F4512C]">
                  Profile Optimization
                </span>
                <h1 className="mt-0.5 text-xl font-extrabold tracking-tight text-[#141210] dark:text-[#FAFAFA] sm:text-2xl">
                  Profile Completeness
                </h1>
                <p className="mt-1 text-xs text-[#6B645F] dark:text-[#9E958F]">
                  Complete all sections to maximize your search ranking and
                  client callbacks.
                </p>
              </div>
            </div>

            <div className="flex items-baseline gap-1.5 self-start rounded-full border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] px-4 py-2 sm:self-auto">
              <span className="text-2xl font-extrabold text-[#F4512C]">
                {percent}%
              </span>
              <span className="text-xs text-[#6B645F] dark:text-[#9E958F]">Score</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-[#EAE2DC] dark:bg-[#242220]">
            <div
              className="h-full rounded-full bg-[#0F8A73] transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>

          {actionNotice && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#0F8A73]/30 bg-[#0F8A73]/10 p-2.5 text-xs font-semibold text-[#0F8A73]">
              <Check size={14} />
              <span>{actionNotice}</span>
            </div>
          )}
        </section>

        {/* Completeness Checklist with Interactive Working Buttons */}
        <section className="rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 sm:p-6">
          <div className="flex items-center justify-between border-b border-[#EAE2DC] dark:border-white/10 pb-3">
            <div>
              <h2 className="text-base font-bold text-[#141210] dark:text-[#FAFAFA]">
                Completeness Checklist
              </h2>
              <p className="text-xs text-[#6B645F] dark:text-[#9E958F]">
                {completedCount} of {checks.length} items complete
              </p>
            </div>
            {percent === 100 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#0F8A73]/10 border border-[#0F8A73]/30 px-3 py-1 text-xs font-bold text-[#0F8A73]">
                <Sparkles size={12} /> All Items Completed!
              </span>
            ) : (
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#F4512C] transition hover:underline cursor-pointer"
              >
                <span>Edit All Details</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>

          <div className="mt-4 space-y-2.5">
            {checks.map((item) => (
              <div
                key={item.id}
                className={`flex flex-col gap-3 rounded-xl border p-3.5 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                  item.done
                    ? "border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09]"
                    : "border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] hover:border-[#F4512C]/50"
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span className="mt-0.5 shrink-0">
                    {item.done ? (
                      <CheckCircle2 size={18} className="text-[#0F8A73]" />
                    ) : (
                      <Circle size={18} className="text-[#6B645F] dark:text-[#9E958F]" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-[#141210] dark:text-[#FAFAFA] sm:text-sm">
                      {item.label}
                    </p>
                    <p className="text-[11px] text-[#6B645F] dark:text-[#9E958F]">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {item.done ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#0F8A73]/30 bg-[#0F8A73]/10 px-3 py-1 text-[11px] font-bold text-[#0F8A73]">
                      <Check size={12} /> Complete
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAction(item)}
                      disabled={uploadingPhoto && item.id === "photo"}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#F4512C] hover:bg-[#E04320] text-white px-4 text-xs font-bold transition disabled:opacity-50 cursor-pointer active:scale-95"
                    >
                      {item.id === "photo" && <Camera size={12} />}
                      <span>
                        {uploadingPhoto && item.id === "photo"
                          ? "Uploading..."
                          : item.actionText}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Phone Security Notice */}
          <div className="mt-5 flex items-center gap-3 rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] p-4">
            <ShieldCheck
              size={20}
              className={phoneVerified ? "text-[#0F8A73]" : "text-[#6B645F] dark:text-[#9E958F]"}
            />
            <div>
              <p className="text-xs font-bold text-[#141210] dark:text-[#FAFAFA]">
                {phoneVerified
                  ? "Phone Verified Account"
                  : "Phone Verification"}
              </p>
              <p className="text-[11px] text-[#6B645F] dark:text-[#9E958F]">
                {phoneVerified
                  ? "Your phone number is officially verified, unlocking worker invites and direct leads."
                  : "Verify your phone number in Profile to display the verified badge."}
              </p>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
