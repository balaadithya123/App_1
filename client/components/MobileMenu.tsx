import {
  Menu,
  X,
  UserRound,
  LogOut,
  BriefcaseBusiness,
  Search,
  Bell,
  Heart,
  Clock3,
  ShieldCheck,
  Building2,
  ChevronRight,
  Bookmark,
  Compass,
  BrainCircuit,
  Sparkles,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getSavedWorkerIds } from "@/lib/favorites";
import { getRecentlyViewedWorkerIds } from "@/lib/recently-viewed";
import { getStoredDueBadgeCount, getLiveDueBadgeCount } from "@/lib/home-items";
import ThemeToggle from "@/components/ThemeToggle";

export default function MobileMenu() {
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [unread, setUnread] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [recentCount, setRecentCount] = useState(0);
  const [dueRemindersCount, setDueRemindersCount] = useState(0);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session);
    });
    const { data: l } = supabase.auth.onAuthStateChange((_e, next) => {
      if (active) setSession(next);
    });
    return () => {
      active = false;
      l.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const refresh = () => {
      setSavedCount(getSavedWorkerIds().length);
      setRecentCount(getRecentlyViewedWorkerIds().length);
      setDueRemindersCount(getStoredDueBadgeCount(session?.user?.id));
      void getLiveDueBadgeCount(session?.user?.id).then((cnt) => {
        setDueRemindersCount(cnt);
      });
    };
    refresh();
    window.addEventListener("saved-workers-changed", refresh);
    window.addEventListener("recently-viewed-changed", refresh);
    window.addEventListener("home-items-changed", refresh);
    return () => {
      window.removeEventListener("saved-workers-changed", refresh);
      window.removeEventListener("recently-viewed-changed", refresh);
      window.removeEventListener("home-items-changed", refresh);
    };
  }, [session?.user?.id]);

  useEffect(() => {
    let active = true;
    setUnread(0);
    if (!session || session.user?.user_metadata?.role === "worker") return;
    void fetch("/api/notifications", {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
    })
      .then(async (r) => (r.ok ? r.json() : null))
      .then((result) => {
        if (active && result) {
          setUnread(
            (result.notifications || []).filter((n: any) => !n.read_at).length,
          );
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [session]);

  // Handle outside click & escape key
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const logout = async () => {
    await supabase?.auth.signOut();
    setOpen(false);
    navigate("/", { replace: true });
  };

  const loggedIn = !!session;
  const userRole = session?.user?.user_metadata?.role;
  const isWorker = userRole === "worker";
  const isAgency = userRole === "agency";
  const showInbox = loggedIn && !isWorker;
  const totalBadge = unread + dueRemindersCount;

  return (
    <div ref={menuRef} className="relative z-50 flex items-center">
      {/* 3-Bars Toggle Button */}
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="group relative flex h-9 w-9 items-center justify-center rounded-full border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] text-[#09090B] dark:text-[#FAFAFA] transition hover:border-neutral-400 dark:hover:border-neutral-500 cursor-pointer shadow-sm"
      >
        {open ? (
          <X
            size={16}
            className="text-[#09090B] dark:text-[#FAFAFA] transition-transform duration-200 group-hover:scale-110"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-1">
            <span className="h-0.5 w-4 rounded-full bg-current transition-all" />
            <span className="h-0.5 w-3 self-start rounded-full bg-current transition-all group-hover:w-4" />
            <span className="h-0.5 w-4 rounded-full bg-current transition-all" />
          </div>
        )}
        {totalBadge > 0 && (
          <span
            className={`absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold shadow-xs ${
              dueRemindersCount > 0
                ? "bg-rose-500 text-white"
                : "bg-black text-white dark:bg-white dark:text-black"
            }`}
          >
            {totalBadge > 9 ? "9+" : totalBadge}
          </span>
        )}
      </button>

      {/* Modern Segmented Dropdown Panel */}
      {open && (
        <nav
          aria-label="Main navigation"
          className="absolute right-0 top-11 z-[100] w-72 origin-top-right rounded-[20px] border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] p-3.5 shadow-xl transition animate-in fade-in zoom-in-95 duration-150 text-[#09090B] dark:text-[#FAFAFA]"
        >
          {/* Top User Status Header */}
          {loggedIn ? (
            <div className="mb-3 flex items-center justify-between rounded-[14px] border border-[#E4E4E7] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#09090B] p-3">
              <div className="min-w-0 flex-1 pr-2">
                <div className="truncate text-xs font-bold text-[#09090B] dark:text-[#FAFAFA]">
                  {session?.user?.user_metadata?.name || session?.user?.email}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-[#71717A] dark:text-[#A1A1AA] mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="capitalize">
                    {isWorker ? "Worker" : isAgency ? "Agency" : "Member"}
                  </span>
                </div>
              </div>
              <Link
                to={
                  isWorker
                    ? "/worker-dashboard"
                    : isAgency
                      ? "/agency/dashboard"
                      : "/profile"
                }
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] text-[#71717A] dark:text-[#A1A1AA] transition hover:text-[#09090B] dark:hover:text-white hover:border-neutral-400 shadow-sm"
                aria-label={
                  isWorker
                    ? "Worker Dashboard"
                    : isAgency
                      ? "Agency Dashboard"
                      : "Account Settings"
                }
                title={
                  isWorker
                    ? "Worker Dashboard"
                    : isAgency
                      ? "Agency Dashboard"
                      : "Profile Settings"
                }
              >
                <UserRound size={14} />
              </Link>
            </div>
          ) : (
            <div className="mb-3 flex items-center justify-between rounded-[14px] border border-[#E4E4E7] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#09090B] p-3">
              <div>
                <div className="text-xs font-bold text-[#09090B] dark:text-[#FAFAFA]">
                  LocalWorker
                </div>
                <div className="text-[10px] text-[#71717A] dark:text-[#A1A1AA]">
                  Directory & Services
                </div>
              </div>
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="rounded-full bg-black text-white dark:bg-white dark:text-black px-3.5 py-1 text-[11px] font-bold transition hover:bg-neutral-800 dark:hover:bg-neutral-200 shadow-sm"
              >
                Sign In
              </Link>
            </div>
          )}

          {/* Section 1: Explore & Discovery (Grid Tile Layout) */}
          <div className="mb-3">
            <div className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA]">
              Explore Services
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <Link
                to="/search?type=workers"
                onClick={() => setOpen(false)}
                className="flex flex-col items-start gap-1.5 rounded-[12px] border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#09090B] p-2.5 transition hover:border-neutral-400 dark:hover:border-neutral-600"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#F4F4F5] dark:bg-[#27272A] text-[#09090B] dark:text-[#FAFAFA]">
                  <Search size={13} />
                </div>
                <span className="text-xs font-semibold text-[#09090B] dark:text-[#FAFAFA]">
                  Find Workers
                </span>
              </Link>

              <Link
                to="/search?type=agencies"
                onClick={() => setOpen(false)}
                className="flex flex-col items-start gap-1.5 rounded-[12px] border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#09090B] p-2.5 transition hover:border-neutral-400 dark:hover:border-neutral-600"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#F4F4F5] dark:bg-[#27272A] text-[#09090B] dark:text-[#FAFAFA]">
                  <Building2 size={13} />
                </div>
                <span className="text-xs font-semibold text-[#09090B] dark:text-[#FAFAFA]">
                  Agencies & Teams
                </span>
              </Link>
            </div>

            {/* Quick Access Badges (Saved & Recent) */}
            <div className="mt-1.5 space-y-1">
              <Link
                to="/saved"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-full px-3 py-1.5 text-xs font-medium text-[#09090B] dark:text-[#FAFAFA] transition hover:bg-[#F4F4F5] dark:hover:bg-[#27272A]"
              >
                <span className="flex items-center gap-2">
                  <Heart size={14} className="text-[#71717A] dark:text-[#A1A1AA]" />
                  <span>Saved Workers</span>
                </span>
                <span className="rounded-full border border-[#E4E4E7] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#09090B] px-2 py-0.5 text-[10px] font-bold text-[#71717A] dark:text-[#A1A1AA]">
                  {savedCount}
                </span>
              </Link>

              <Link
                to="/recently-viewed"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-full px-3 py-1.5 text-xs font-medium text-[#09090B] dark:text-[#FAFAFA] transition hover:bg-[#F4F4F5] dark:hover:bg-[#27272A]"
              >
                <span className="flex items-center gap-2">
                  <Clock3 size={14} className="text-[#71717A] dark:text-[#A1A1AA]" />
                  <span>Recently Viewed</span>
                </span>
                <span className="rounded-full border border-[#E4E4E7] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#09090B] px-2 py-0.5 text-[10px] font-bold text-[#71717A] dark:text-[#A1A1AA]">
                  {recentCount}
                </span>
              </Link>

              <Link
                to="/inbox"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-full px-3 py-1.5 text-xs font-medium text-[#09090B] dark:text-[#FAFAFA] transition hover:bg-[#F4F4F5] dark:hover:bg-[#27272A]"
              >
                <span className="flex items-center gap-2">
                  <Bell size={14} className="text-[#71717A] dark:text-[#A1A1AA]" />
                  <span>Inbox & Reminders</span>
                </span>
                {dueRemindersCount > 0 ? (
                  <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                    {dueRemindersCount} due
                  </span>
                ) : (
                  <span className="rounded-full border border-[#E4E4E7] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#09090B] px-2 py-0.5 text-[10px] font-medium text-[#71717A] dark:text-[#A1A1AA]">
                    0 due
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Section 2: Portals & Work Tools */}
          {(isWorker || isAgency || showInbox) && (
            <div className="mb-3 border-t border-[#E4E4E7] dark:border-[#27272A] pt-2.5">
              <div className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA]">
                Management
              </div>
              <div className="space-y-1.5">
                {isWorker && (
                  <>
                    <Link
                      to="/worker-dashboard"
                      onClick={() => setOpen(false)}
                      className="group flex items-center justify-between rounded-[12px] border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#09090B] p-2 text-xs font-medium text-[#09090B] dark:text-[#FAFAFA] transition hover:border-neutral-400 dark:hover:border-neutral-600"
                    >
                      <span className="flex items-center gap-2">
                        <BriefcaseBusiness size={14} className="text-[#71717A] dark:text-[#A1A1AA]" />
                        <span>Worker Portal</span>
                      </span>
                      <ChevronRight
                        size={13}
                        className="text-[#71717A] transition group-hover:translate-x-0.5 group-hover:text-[#09090B] dark:group-hover:text-white"
                      />
                    </Link>
                    <Link
                      to="/profile-completeness"
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between rounded-full px-3 py-1.5 text-xs text-[#71717A] dark:text-[#A1A1AA] transition hover:bg-[#F4F4F5] dark:hover:bg-[#27272A] hover:text-[#09090B] dark:hover:text-white"
                    >
                      <span className="flex items-center gap-2">
                        <ShieldCheck size={14} className="text-current" />
                        <span>Completeness</span>
                      </span>
                    </Link>
                  </>
                )}

                {isAgency && (
                  <Link
                    to="/agency/dashboard"
                    onClick={() => setOpen(false)}
                    className="group flex items-center justify-between rounded-[12px] border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#09090B] p-2 text-xs font-medium text-[#09090B] dark:text-[#FAFAFA] transition hover:border-neutral-400 dark:hover:border-neutral-600"
                  >
                    <span className="flex items-center gap-2">
                      <Building2 size={14} className="text-[#71717A] dark:text-[#A1A1AA]" />
                      <span>Agency Dashboard</span>
                    </span>
                    <ChevronRight
                      size={13}
                      className="text-[#71717A] transition group-hover:translate-x-0.5 group-hover:text-[#09090B] dark:group-hover:text-white"
                    />
                  </Link>
                )}

                {showInbox && (
                  <Link
                    to="/inbox"
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between rounded-full px-3 py-2 text-xs font-medium text-[#09090B] dark:text-[#FAFAFA] transition hover:bg-[#F4F4F5] dark:hover:bg-[#27272A]"
                  >
                    <span className="flex items-center gap-2">
                      <Bell size={14} className="text-[#71717A] dark:text-[#A1A1AA]" />
                      <span>Inbox Messages</span>
                    </span>
                    {unread > 0 && (
                      <span className="rounded-full bg-black text-white dark:bg-white dark:text-black px-2 py-0.5 text-[10px] font-bold">
                        {unread}
                      </span>
                    )}
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Section 3: Appearance Theme Toggle */}
          <div className="mb-2 border-t border-[#E4E4E7] dark:border-[#27272A] pt-2">
            <ThemeToggle variant="dropdown-item" />
          </div>

          {/* Section 4: Account & Log Out / Sign In */}
          {loggedIn ? (
            <div className="border-t border-[#E4E4E7] dark:border-[#27272A] pt-2 flex items-center justify-between px-1">
              <Link
                to="/profile"
                onClick={() => setOpen(false)}
                className="text-xs font-medium text-[#71717A] dark:text-[#A1A1AA] transition hover:text-[#09090B] dark:hover:text-white"
              >
                Settings
              </Link>
              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 transition hover:opacity-80 cursor-pointer"
              >
                <LogOut size={13} />
                <span>Log out</span>
              </button>
            </div>
          ) : (
            <div className="border-t border-[#E4E4E7] dark:border-[#27272A] pt-2.5 space-y-2">
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-2 w-full rounded-full bg-black text-white dark:bg-white dark:text-black py-2 text-xs font-bold transition hover:opacity-90 shadow-xs"
              >
                <UserRound size={13} />
                <span>Sign In</span>
              </Link>
              <div className="flex items-center gap-2">
                <Link
                  to="/join"
                  onClick={() => setOpen(false)}
                  className="flex-1 text-center rounded-full border border-[#E4E4E7] dark:border-[#27272A] py-1.5 text-[11px] font-semibold text-[#09090B] dark:text-[#FAFAFA] hover:bg-[#F4F4F5] dark:hover:bg-[#27272A] transition"
                >
                  Join as Worker
                </Link>
                <Link
                  to="/register-agency"
                  onClick={() => setOpen(false)}
                  className="flex-1 text-center rounded-full border border-[#E4E4E7] dark:border-[#27272A] py-1.5 text-[11px] font-semibold text-[#09090B] dark:text-[#FAFAFA] hover:bg-[#F4F4F5] dark:hover:bg-[#27272A] transition"
                >
                  Join as Agency
                </Link>
              </div>
            </div>
          )}
        </nav>
      )}
    </div>
  );
}
