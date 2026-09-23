import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, UserPlus, ArrowUpRight, Check, Copy } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function WorkerGrowthCard() {
  const [viewsTotal, setViewsTotal] = useState(0);
  const [viewsThisWeek, setViewsThisWeek] = useState(0);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      const response = await fetch(`/api/worker-stats?t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result?.message || "Unable to load reach");
      setViewsTotal(Number(result.profileViewsTotal) || 0);
      setViewsThisWeek(Number(result.profileViewsThisWeek) || 0);
      setReferralCode(result.referralCode || null);
      setVerified(Boolean(result.phoneVerified));
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    void load();
    const onFocus = () => {
      void load();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  const inviteLink = referralCode
    ? `${window.location.origin}/join?ref=${encodeURIComponent(referralCode)}`
    : "";

  const handleCopy = () => {
    if (!inviteLink) return;
    void navigator.clipboard?.writeText(inviteLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`grid gap-3 ${verified && referralCode ? "sm:grid-cols-2" : "grid-cols-1"}`}
    >
      {/* Metric 1: Profile Reach */}
      <section className="rounded-[16px] border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA]">
            Profile Reach
          </span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#E4E4E7] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#09090B] text-[#71717A] dark:text-[#A1A1AA]">
            <Eye size={14} />
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <div>
            <span className="text-2xl font-bold tracking-tight text-[#09090B] dark:text-[#FAFAFA]">
              {viewsThisWeek}
            </span>
            <span className="text-[10px] text-[#71717A] dark:text-[#A1A1AA] block">
              This week
            </span>
          </div>
          <div>
            <span className="text-2xl font-bold tracking-tight text-[#09090B] dark:text-[#FAFAFA]">
              {viewsTotal}
            </span>
            <span className="text-[10px] text-[#71717A] dark:text-[#A1A1AA] block">
              Total
            </span>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-[#E4E4E7] dark:border-[#27272A] pt-3">
          {error ? (
            <button
              type="button"
              onClick={() => void load()}
              className="text-xs font-semibold text-rose-600 dark:text-rose-400 transition hover:underline cursor-pointer"
            >
              Retry loading reach
            </button>
          ) : (
            <Link
              to="/profile-completeness"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#09090B] dark:text-[#FAFAFA] transition hover:text-neutral-600 dark:hover:text-neutral-300"
            >
              <span>Improve completeness</span>
              <ArrowUpRight size={13} />
            </Link>
          )}
          <span className="text-[11px] text-[#71717A] dark:text-[#A1A1AA]">Active</span>
        </div>
      </section>

      {/* Metric 2: Invite Network Referral */}
      {verified && referralCode && (
        <section className="rounded-[16px] border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA]">
              Worker Referral
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#E4E4E7] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#09090B] text-[#71717A] dark:text-[#A1A1AA]">
              <UserPlus size={14} />
            </span>
          </div>
          <p className="mt-1 text-xs text-[#71717A] dark:text-[#A1A1AA]">
            Invite workers to join with your referral code
          </p>
          <div className="mt-3 flex items-center gap-2">
            <input
              readOnly
              value={inviteLink}
              className="h-8 min-w-0 flex-1 rounded-full border border-[#E4E4E7] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#09090B] px-3 text-xs text-[#09090B] dark:text-[#FAFAFA] outline-none select-all"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] px-3.5 text-xs font-semibold text-[#09090B] dark:text-[#FAFAFA] transition hover:bg-[#FAFAFA] dark:hover:bg-[#27272A] hover:border-neutral-400 dark:hover:border-neutral-500 shadow-sm cursor-pointer"
            >
              {copied ? (
                <Check size={13} className="text-emerald-500" />
              ) : (
                <Copy size={13} />
              )}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
