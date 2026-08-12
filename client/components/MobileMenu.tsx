import { Menu, X, UserRound, LogOut, BriefcaseBusiness, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function MobileMenu() {
  const [open, setOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      setLoggedIn(!!data.session);
      setRole(data.session?.user?.user_metadata?.role ?? null);
    };
    load();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
      setRole(session?.user?.user_metadata?.role ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const logout = async () => { await supabase?.auth.signOut(); setOpen(false); };
  const isWorker = role === "worker";

  return (
    <div className="relative flex items-center">
      <button type="button" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((current) => !current)} className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-slate-300 bg-white text-slate-900 shadow-sm dark:border-slate-800 dark:bg-[#050505] dark:text-white">
        {open ? <X size={20} strokeWidth={2.2} /> : <Menu size={21} strokeWidth={2.2} />}
      </button>
      {open && <nav className="absolute right-0 top-12 z-30 w-56 rounded-[12px] border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-800 dark:bg-[#080808]">
        <Link to="/" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-[9px] px-3 py-3 text-sm font-bold text-navy hover:bg-slate-100 dark:text-white dark:hover:bg-slate-900"><Search size={16}/>Find Workers</Link>
        {isWorker && <Link to="/worker-dashboard" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-[9px] px-3 py-3 text-sm font-bold text-navy hover:bg-slate-100 dark:text-white dark:hover:bg-slate-900"><BriefcaseBusiness size={16}/>Worker Portal</Link>}
        {loggedIn ? <>
          <Link to="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-[9px] px-3 py-3 text-sm font-bold text-navy hover:bg-slate-100 dark:text-white dark:hover:bg-slate-900"><UserRound size={16}/>Profile</Link>
          <button type="button" onClick={logout} className="flex w-full items-center gap-2 rounded-[9px] px-3 py-3 text-left text-sm font-bold text-navy hover:bg-slate-100 dark:text-white dark:hover:bg-slate-900"><LogOut size={16}/>Logout</button>
        </> : <Link to="/login" onClick={() => setOpen(false)} className="block rounded-[9px] px-3 py-3 text-sm font-bold text-navy hover:bg-slate-100 dark:text-white dark:hover:bg-slate-900">Login</Link>}
      </nav>}
    </div>
  );
}
