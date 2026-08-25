import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, UserPlus, ArrowUpRight, Check, Copy } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function WorkerGrowthCard() {
  const [views, setViews] = useState(0);
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
      if (!response.ok) throw new Error(result?.message || "Unable to load reach");
      setViews(Number(result.profileViewsThisWeek) || 0);
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

  const inviteLink = referralCode ? `${window.location.origin}/join?ref=${encodeURIComponent(referralCode)}` : "";

  const handleCopy = () => {
    if (!inviteLink) return;
    void navigator.clipboard?.writeText(inviteLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`grid gap-3 ${verified && referralCode ? "sm:grid-cols-2" : "grid-cols-1"}`}>
      {/* Metric 1: Weekly Profile Reach */}
      <section className="rounded-xl border border-border bg-card p-4 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Profile Reach
          </span>
          <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-secondary text-muted-foreground">
            <Eye size={14} />
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight text-foreground">{views}</span>
          <span className="text-xs text-muted-foreground">views this week</span>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-border/80 pt-3">
          {error ? (
            <button
              type="button"
              onClick={() => void load()}
              className="text-xs font-semibold text-destructive transition hover:underline"
            >
              Retry loading reach
            </button>
          ) : (
            <Link
              to="/profile-completeness"
              className="inline-flex items-center gap-1 text-xs font-semibold text-foreground transition hover:text-primary"
            >
              <span>Improve completeness</span>
              <ArrowUpRight size={13} />
            </Link>
          )}
          <span className="text-[11px] text-muted-foreground">7d active</span>
        </div>
      </section>

      {/* Metric 2: Invite Network Referral */}
      {verified && referralCode && (
        <section className="rounded-xl border border-border bg-card p-4 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Worker Referral
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-secondary text-muted-foreground">
              <UserPlus size={14} />
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Invite workers to join with your referral code
          </p>
          <div className="mt-3 flex items-center gap-2">
            <input
              readOnly
              value={inviteLink}
              className="h-8 min-w-0 flex-1 rounded-md border border-border bg-background px-2.5 text-xs text-foreground outline-hidden select-all"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border bg-secondary px-3 text-xs font-semibold text-foreground transition hover:bg-foreground hover:text-background cursor-pointer"
            >
              {copied ? <Check size={13} className="text-primary" /> : <Copy size={13} />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

