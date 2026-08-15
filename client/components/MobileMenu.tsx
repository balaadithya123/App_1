import { Menu, X, UserRound, LogOut, BriefcaseBusiness, Search, Bell } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function MobileMenu() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      // Keep this callback synchronous. Do not call getSession, fetch, or other
      // async Supabase work from inside onAuthStateChange: Supabase's auth lock
      // can otherwise stall and make every button on the page appear frozen.
      if (active) setSession(nextSession);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    setUnread(0);

    if (!session || session.user?.user_metadata?.role === "worker") return;

    void fetch("/api/notifications", {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
    })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((result) => {
        if (active && result) {
          setUnread((result.notifications || []).filter((n: any) => !n.read_at).length);
        }
      })
      .catch(() => {
        if (active) setUnread(0);
      });

    return () => {
      active = false;
    };
  }, [session]);

  const logout = async () => {
    await supabase?.auth.signOut();
    setOpen(false);
    navigate("/", { replace: true });
  };

  const loggedIn = !!session;
  const isWorker = session?.user?.user_metadata?.role === "worker";
  const showInbox = loggedIn && !isWorker;

  return (
    <div className="relative z-50 flex items-center">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-slate-300 bg-white text-slate-900 shadow-sm dark:border-slate-800 dark:bg-[#050505] dark:text-white"
      >
        {open ? <X size={20} strokeWidth={2.2} /> : <Menu size={21} strokeWidth={2.2} />}
      </button>
      {open && (
        <nav className="absolute right-0 top-12 z-[100] w-56 rounded-[12px] border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-800 dark:bg-[#080808]">
          <Link to="/" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-[9px] px-3 py-3 text-sm font-bold text-navy hover:bg-slate-100 dark:text-white dark:hover:bg-slate-900"><Search size={16} />Find Workers</Link>
          {isWorker && <Link to="/worker-dashboard" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-[9px] px-3 py-3 text-sm font-bold text-navy hover:bg-slate-100 dark:text-white dark:hover:bg-slate-900"><BriefcaseBusiness size={16} />Worker Portal</Link>}
          {showInbox && <Link to="/inbox" onClick={() => setOpen(false)} className="flex items-center justify-between rounded-[9px] px-3 py-3 text-sm font-bold text-navy hover:bg-slate-100 dark:text-white dark:hover:bg-slate-900"><span className="flex items-center gap-2"><Bell size={16} />Inbox</span>{unread > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-teal px-1.5 text-[10px] font-extrabold text-white">{unread > 9 ? "9+" : unread}</span>}</Link>}
          {loggedIn && <>
            <Link to="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-[9px] px-3 py-3 text-sm font-bold text-navy hover:bg-slate-100 dark:text-white dark:hover:bg-slate-900"><UserRound size={16} />Profile</Link>
            <button type="button" onClick={logout} className="flex w-full items-center gap-2 rounded-[9px] px-3 py-3 text-left text-sm font-bold text-navy hover:bg-slate-100 dark:text-white dark:hover:bg-slate-900"><LogOut size={16} />Logout</button>
          </>}
          {!loggedIn && <Link to="/login" onClick={() => setOpen(false)} className="block rounded-[9px] px-3 py-3 text-sm font-bold text-navy hover:bg-slate-100 dark:text-white dark:hover:bg-slate-900">Login</Link>}
        </nav>
      )}
    </div>
  );
}
