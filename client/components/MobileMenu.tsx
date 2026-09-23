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
        className="group relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-ring cursor-pointer shadow-subtle"
      >
        {open ? (
          <X
            size={16}
            className="text-foreground transition-transform duration-200 group-hover:scale-110"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-1">
            <span className="h-0.5 w-4 rounded-full bg-foreground transition-all" />
            <span className="h-0.5 w-3 self-start rounded-full bg-foreground transition-all group-hover:w-4" />
            <span className="h-0.5 w-4 rounded-full bg-foreground transition-all" />
          </div>
        )}
        {totalBadge > 0 && (
          <span
            className={`absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold shadow-xs ${
              dueRemindersCount > 0
                ? "bg-rose-500 text-white"
                : "bg-primary text-primary-foreground"
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
          className="absolute right-0 top-11 z-[100] w-72 origin-top-right rounded-[20px] border border-border bg-card p-3.5 shadow-xl transition animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Top User Status Header */}
          {loggedIn ? (
            <div className="mb-3 flex items-center justify-between rounded-[14px] border border-[#E7ECF1] bg-[#F6F9FC] p-3">
              <div className="min-w-0 flex-1 pr-2">
                <div className="truncate text-xs font-bold text-[#2C2C2C]">
                  {session?.user?.user_metadata?.name || session?.user?.email}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-[#67696D] mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
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
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#E7ECF1] bg-white text-[#67696D] transition hover:text-primary hover:border-primary shadow-subtle"
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
            <div className="mb-3 flex items-center justify-between rounded-[14px] border border-[#E7ECF1] bg-[#F6F9FC] p-3">
              <div>
                <div className="text-xs font-bold text-[#2C2C2C]">
                  LocalWorker
                </div>
                <div className="text-[10px] text-[#67696D]">
                  Directory & Services
                </div>
              </div>
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-[#157ad4] shadow-subtle"
              >
                Sign In
              </Link>
            </div>
          )}

          {/* Section 1: Explore & Discovery (Grid Tile Layout) */}
          <div className="mb-3">
            <div className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-[#67696D]">
              Explore Services
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <Link
                to="/search?type=workers"
                onClick={() => setOpen(false)}
                className="flex flex-col items-start gap-1.5 rounded-[12px] border border-[#E7ECF1] bg-white p-2.5 transition hover:border-primary/40 hover:bg-primary-100/10"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary-100/20 text-primary">
                  <Search size={13} />
                </div>
                <span className="text-xs font-semibold text-[#2C2C2C]">
                  Find Workers
                </span>
              </Link>

              <Link
                to="/search?type=agencies"
                onClick={() => setOpen(false)}
                className="flex flex-col items-start gap-1.5 rounded-[12px] border border-[#E7ECF1] bg-white p-2.5 transition hover:border-primary/40 hover:bg-primary-100/10"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary-100/20 text-primary">
                  <Building2 size={13} />
                </div>
                <span className="text-xs font-semibold text-[#2C2C2C]">
                  Agencies & Teams
                </span>
              </Link>
            </div>

            {/* Quick Access Badges (Saved & Recent) */}
            <div className="mt-1.5 space-y-1">
              <Link
                to="/saved"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-full px-3 py-1.5 text-xs font-medium text-[#2C2C2C] transition hover:bg-primary-100/10 hover:text-primary"
              >
                <span className="flex items-center gap-2">
                  <Heart size={14} className="text-primary" />
                  <span>Saved Workers</span>
                </span>
                <span className="rounded-full border border-[#E7ECF1] bg-[#F6F9FC] px-2 py-0.5 text-[10px] font-bold text-[#67696D]">
                  {savedCount}
                </span>
              </Link>

              <Link
                to="/recently-viewed"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-full px-3 py-1.5 text-xs font-medium text-[#2C2C2C] transition hover:bg-primary-100/10 hover:text-primary"
              >
                <span className="flex items-center gap-2">
                  <Clock3 size={14} className="text-[#67696D]" />
                  <span>Recently Viewed</span>
                </span>
                <span className="rounded-full border border-[#E7ECF1] bg-[#F6F9FC] px-2 py-0.5 text-[10px] font-bold text-[#67696D]">
                  {recentCount}
                </span>
              </Link>

              <Link
                to="/inbox"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-full px-3 py-1.5 text-xs font-medium text-[#2C2C2C] transition hover:bg-primary-100/10 hover:text-primary"
              >
                <span className="flex items-center gap-2">
                  <Bell size={14} className="text-primary" />
                  <span>Inbox & Reminders</span>
                </span>
                {dueRemindersCount > 0 ? (
                  <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                    {dueRemindersCount} due
                  </span>
                ) : (
                  <span className="rounded-full border border-[#E7ECF1] bg-[#F6F9FC] px-2 py-0.5 text-[10px] font-medium text-[#67696D]">
                    0 due
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Section 2: Portals & Work Tools (Card Banner Layout) */}
          {(isWorker || isAgency || showInbox) && (
            <div className="mb-3 border-t border-border pt-2.5">
              <div className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-[#67696D]">
                Management
              </div>
              <div className="space-y-1.5">
                {isWorker && (
                  <>
                    <Link
                      to="/worker-dashboard"
                      onClick={() => setOpen(false)}
                      className="group flex items-center justify-between rounded-[12px] border border-border bg-card p-2 text-xs font-medium text-foreground transition hover:border-primary/40 hover:bg-primary-100/10"
                    >
                      <span className="flex items-center gap-2">
                        <BriefcaseBusiness size={14} className="text-primary" />
                        <span>Worker Portal</span>
                      </span>
                      <ChevronRight
                        size={13}
                        className="text-[#67696D] transition group-hover:translate-x-0.5 group-hover:text-primary"
                      />
                    </Link>
                    <Link
                      to="/profile-completeness"
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between rounded-full px-3 py-1.5 text-xs text-[#67696D] transition hover:bg-primary-100/10 hover:text-primary"
                    >
                      <span className="flex items-center gap-2">
                        <ShieldCheck size={14} className="text-primary" />
                        <span>Completeness</span>
                      </span>
                    </Link>
                  </>
                )}

                {isAgency && (
                  <Link
                    to="/agency/dashboard"
                    onClick={() => setOpen(false)}
                    className="group flex items-center justify-between rounded-[12px] border border-border bg-card p-2 text-xs font-medium text-foreground transition hover:border-primary/40 hover:bg-primary-100/10"
                  >
                    <span className="flex items-center gap-2">
                      <Building2 size={14} className="text-primary" />
                      <span>Agency Dashboard</span>
                    </span>
                    <ChevronRight
                      size={13}
                      className="text-[#67696D] transition group-hover:translate-x-0.5 group-hover:text-primary"
                    />
                  </Link>
                )}

                {showInbox && (
                  <Link
                    to="/inbox"
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between rounded-full px-3 py-2 text-xs font-medium text-foreground transition hover:bg-primary-100/10 hover:text-primary"
                  >
                    <span className="flex items-center gap-2">
                      <Bell size={14} className="text-[#67696D]" />
                      <span>Inbox Messages</span>
                    </span>
                    {unread > 0 && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                        {unread}
                      </span>
                    )}
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Section 3: Appearance Theme Toggle */}
          <div className="mb-2 border-t border-border pt-2">
            <ThemeToggle variant="dropdown-item" />
          </div>

          {/* Section 4: Account & Log Out */}
          {loggedIn && (
            <div className="border-t border-border pt-2 flex items-center justify-between px-1">
              <Link
                to="/profile"
                onClick={() => setOpen(false)}
                className="text-xs font-medium text-muted-foreground transition hover:text-foreground"
              >
                Settings
              </Link>
              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-1.5 text-xs font-medium text-destructive transition hover:opacity-80 cursor-pointer"
              >
                <LogOut size={13} />
                <span>Log out</span>
              </button>
            </div>
          )}
        </nav>
      )}
    </div>
  );
}
