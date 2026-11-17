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
      className={`grid gap-4 ${verified && referralCode ? "sm:grid-cols-2" : "grid-cols-1"}`}
    >
      {/* Metric 1: Profile Reach */}
      <section className="rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#F4512C]">
            Profile Reach
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C]">
            <Eye size={15} />
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <div>
            <span className="text-2xl font-extrabold tracking-tight text-[#141210] dark:text-[#FAFAFA]">
              {viewsThisWeek}
            </span>
            <span className="text-[11px] text-[#6B645F] dark:text-[#9E958F] block">
              This week
            </span>
          </div>
          <div>
            <span className="text-2xl font-extrabold tracking-tight text-[#141210] dark:text-[#FAFAFA]">
              {viewsTotal}
            </span>
            <span className="text-[11px] text-[#6B645F] dark:text-[#9E958F] block">
              Total views
            </span>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-[#EAE2DC] dark:border-white/10 pt-3">
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
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#141210] dark:text-[#FAFAFA] transition hover:text-[#F4512C]"
            >
              <span>Improve completeness</span>
              <ArrowUpRight size={13} />
            </Link>
          )}
          <span className="text-[11px] font-medium text-[#0F8A73]">Active</span>
        </div>
      </section>

      {/* Metric 2: Invite Network Referral */}
      {verified && referralCode && (
        <section className="rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#F4512C]">
              Worker Referral
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C]">
              <UserPlus size={15} />
            </span>
          </div>
          <p className="mt-1.5 text-xs text-[#6B645F] dark:text-[#9E958F]">
            Invite workers to join with your referral code
          </p>
          <div className="mt-3 flex items-center gap-2">
            <input
              readOnly
              value={inviteLink}
              className="h-9 min-w-0 flex-1 rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-3.5 text-xs text-[#141210] dark:text-[#FAFAFA] outline-none select-all"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-[#141210] text-white dark:bg-white dark:text-[#11100F] px-4 text-xs font-bold transition hover:opacity-90 cursor-pointer"
            >
              {copied ? (
                <Check size={13} className="text-[#0F8A73]" />
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
