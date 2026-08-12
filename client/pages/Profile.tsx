import { useEffect, useState } from "react";
import { LogOut, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { supabase } from "@/lib/supabase";

export default function Profile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getUser().then(({ data }) => { setUser(data.user ?? null); setLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) navigate("/", { replace: true });
    });
    return () => listener.subscription.unsubscribe();
  }, [navigate]);

  const logout = async () => { await supabase?.auth.signOut(); navigate("/", { replace: true }); };
  if (loading) return <PageShell backTo="/" backLabel="Home"><section className="rounded-[16px] border border-line bg-white p-8 text-center dark:border-white/10 dark:bg-black"><p className="text-sm text-slate dark:text-slate-300">Loading profile...</p></section></PageShell>;
  if (!user) return null;

  const metadata = user.user_metadata ?? {};
  const name = metadata.name || "LocalWorker user";
  const role = metadata.role === "worker" ? "Worker" : metadata.role === "employer" ? "Employer" : "Member";

  return <PageShell backTo="/" backLabel="Home"><section className="rounded-[16px] border border-line bg-white p-6 shadow-sm dark:border-white/10 dark:bg-black sm:p-8"><div className="flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal text-white"><UserRound size={26}/></div><div><h1 className="text-2xl font-extrabold text-navy dark:text-white">My Profile</h1><p className="mt-1 text-sm text-slate dark:text-slate-300">{role}</p></div></div><div className="mt-7 space-y-3"><div className="rounded-[11px] border border-line bg-[#fbfcfc] px-4 py-3 dark:border-white/10 dark:bg-[#050505]"><p className="text-[11px] font-bold uppercase tracking-wide text-slate dark:text-slate-400">Name</p><p className="mt-1 text-sm font-semibold text-navy dark:text-white">{name}</p></div><div className="rounded-[11px] border border-line bg-[#fbfcfc] px-4 py-3 dark:border-white/10 dark:bg-[#050505]"><p className="text-[11px] font-bold uppercase tracking-wide text-slate dark:text-slate-400">Email</p><p className="mt-1 text-sm font-semibold text-navy dark:text-white">{user.email}</p></div>{metadata.phone && <div className="rounded-[11px] border border-line bg-[#fbfcfc] px-4 py-3 dark:border-white/10 dark:bg-[#050505]"><p className="text-[11px] font-bold uppercase tracking-wide text-slate dark:text-slate-400">Phone</p><p className="mt-1 text-sm font-semibold text-navy dark:text-white">{metadata.phone}</p></div>}</div><button type="button" onClick={logout} className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-[10px] border border-red-200 bg-red-50 text-sm font-bold text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300"><LogOut size={17}/>Logout</button></section></PageShell>;
}
