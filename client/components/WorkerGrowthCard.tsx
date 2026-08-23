import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function WorkerGrowthCard() {
  const [views, setViews] = useState(0);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      const response = await fetch(`/api/worker-stats?t=${Date.now()}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
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
    const onFocus = () => { void load(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  const inviteLink = referralCode ? `${window.location.origin}/join?ref=${encodeURIComponent(referralCode)}` : "";

  return <div className={`grid gap-4 ${verified && referralCode ? "sm:grid-cols-2" : "grid-cols-1"}`}>
    <section className="rounded-[16px] border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.055]">
      <p className="text-xs font-bold uppercase tracking-wide text-slate dark:text-slate-400">Your profile reach</p>
      <p className="mt-1 text-2xl font-extrabold text-navy dark:text-white">{views}</p>
      <p className="text-sm text-slate dark:text-slate-300">people viewed your profile this week</p>
      {error && <button type="button" onClick={() => void load()} className="mt-2 text-xs font-bold text-red-600 dark:text-red-300">Couldn’t load reach — retry</button>}
      {!error && <Link to="/profile-completeness" className="mt-3 inline-block text-xs font-bold text-teal">Improve profile →</Link>}
    </section>
    {verified && referralCode && <section className="rounded-[16px] border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.055]">
      <p className="text-xs font-bold uppercase tracking-wide text-slate dark:text-slate-400">Invite a worker</p>
      <p className="mt-1 text-sm font-extrabold text-navy dark:text-white">Know another local worker?</p>
      <div className="mt-3 flex gap-2"><input readOnly value={inviteLink} className="min-w-0 flex-1 rounded-lg border border-line bg-transparent px-2 py-2 text-xs dark:border-white/10"/><button type="button" onClick={() => navigator.clipboard?.writeText(inviteLink)} className="rounded-lg bg-navy px-3 py-2 text-xs font-bold text-white">Copy</button></div>
    </section>}
  </div>;
}
