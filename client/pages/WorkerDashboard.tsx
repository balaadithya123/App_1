import { useEffect, useState } from "react";
import { BriefcaseBusiness, CalendarCheck, Edit3, LogOut, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { supabase } from "@/lib/supabase";

export default function WorkerDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getUser().then(({ data }) => {
      const current = data.user;
      if (!current) { navigate("/login", { replace: true }); return; }
      if (current.user_metadata?.role !== "worker") { navigate("/", { replace: true }); return; }
      setUser(current);
      setAvailable(Boolean(current.user_metadata?.available));
      setLoading(false);
    });
  }, [navigate]);

  const toggleAvailability = async () => {
    if (!supabase || !user || savingAvailability) return;
    setSavingAvailability(true);
    const next = !available;
    const { error } = await supabase.auth.updateUser({
      data: { ...user.user_metadata, available: next, availability_updated_at: new Date().toISOString() },
    });
    if (!error) {
      setAvailable(next);
      setUser((current: any) => current ? { ...current, user_metadata: { ...current.user_metadata, available: next } } : current);
    }
    setSavingAvailability(false);
  };

  const logout = async () => { await supabase?.auth.signOut(); navigate("/", { replace: true }); };

  if (loading) return <PageShell hideBack hideHome><section className="rounded-[18px] border border-line bg-white p-8 text-center dark:border-white/10 dark:bg-black"><p className="text-sm text-slate dark:text-slate-300">Loading your dashboard...</p></section></PageShell>;
  if (!user) return null;

  const meta = user.user_metadata ?? {};
  const name = meta.name || "Worker";
  const category = meta.category || "Your work category";
  const location = meta.location || "Location not set";
  const avatar = meta.avatar_url || "";

  return <PageShell hideBack hideHome>
    <div className="mx-auto max-w-[760px] space-y-5">
      <section className="overflow-hidden rounded-[20px] border border-black/10 bg-white/70 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.055] dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)] sm:p-7">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-black/10 bg-[#f2f4f3] dark:border-white/15 dark:bg-white/10">
            {avatar ? <img src={avatar} alt="Profile" className="h-full w-full object-cover" /> : <UserRound size={29} className="text-navy dark:text-white" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate dark:text-slate-400">Worker dashboard</p>
            <h1 className="mt-1 truncate text-[27px] font-extrabold tracking-tight text-navy dark:text-white">Hi, {name}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate dark:text-slate-300"><BriefcaseBusiness size={15} />{category} · {location}</p>
          </div>
        </div>
      </section>

      <section className="rounded-[20px] border border-black/10 bg-white/70 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.055] dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)] sm:p-7">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy text-white"><CalendarCheck size={20} /></div>
          <div><h2 className="font-extrabold text-navy dark:text-white">Your availability</h2><p className="text-xs text-slate dark:text-slate-400">Let people know when you can take work.</p></div>
        </div>
        <button type="button" onClick={toggleAvailability} disabled={savingAvailability} className="mt-5 flex w-full items-center justify-between rounded-[14px] border border-black/10 bg-white/65 px-4 py-4 text-left dark:border-white/10 dark:bg-black/30">
          <div><p className="text-sm font-extrabold text-navy dark:text-white">{available ? "Available for work" : "Currently unavailable"}</p><p className="mt-1 text-xs text-slate dark:text-slate-400">{available ? "People can see that you're available." : "Turn this on when you're ready for work."}</p></div>
          <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${available ? "bg-teal" : "bg-slate-300 dark:bg-white/20"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${available ? "left-6" : "left-1"}`} /></span>
        </button>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => navigate("/profile")} className="flex items-center gap-3 rounded-[16px] border border-black/10 bg-white/70 p-4 text-left backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.055]"><Edit3 size={19} className="text-navy dark:text-white" /><span><strong className="block text-sm text-navy dark:text-white">Edit my profile</strong><span className="text-xs text-slate dark:text-slate-400">Update your details and photo</span></span></button>
        <button type="button" onClick={logout} className="flex items-center gap-3 rounded-[16px] border border-red-200 bg-red-50/70 p-4 text-left dark:border-red-900/50 dark:bg-red-950/20"><LogOut size={19} className="text-red-600 dark:text-red-300" /><span><strong className="block text-sm text-red-700 dark:text-red-300">Log out</strong><span className="text-xs text-red-600/80 dark:text-red-300/70">Leave your worker account</span></span></button>
      </section>
    </div>
  </PageShell>;
}
