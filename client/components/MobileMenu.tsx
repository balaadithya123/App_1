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
  Sparkles,
  ChevronRight,
  Bookmark,
  Compass,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getSavedWorkerIds } from "@/lib/favorites";
import { getRecentlyViewedWorkerIds } from "@/lib/recently-viewed";

export default function MobileMenu() {
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [unread, setUnread] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [recentCount, setRecentCount] = useState(0);

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
    };
    refresh();
    window.addEventListener("saved-workers-changed", refresh);
    window.addEventListener("recently-viewed-changed", refresh);
    return () => {
      window.removeEventListener("saved-workers-changed", refresh);
      window.removeEventListener("recently-viewed-changed", refresh);
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
      .then(async (r) => (r.ok ? r.json() : null))
      .then((result) => {
        if (active && result) {
          setUnread((result.notifications || []).filter((n: any) => !n.read_at).length);
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

  return (
    <div ref={menuRef} className="relative z-50 flex items-center">
      {/* 3-Bars Toggle Button */}
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="group relative flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-foreground transition hover:border-foreground/40 hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
      >
        {open ? (
          <X size={16} className="text-foreground transition-transform duration-200 group-hover:scale-110" />
        ) : (
          <div className="flex flex-col items-center justify-center gap-1">
            <span className="h-0.5 w-4 rounded-full bg-foreground transition-all" />
            <span className="h-0.5 w-3 self-start rounded-full bg-foreground transition-all group-hover:w-4" />
            <span className="h-0.5 w-4 rounded-full bg-foreground transition-all" />
          </div>
        )}
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Modern Segmented Dropdown Panel */}
      {open && (
        <nav
          aria-label="Main navigation"
          className="absolute right-0 top-11 z-[100] w-72 origin-top-right rounded-xl border border-border bg-popover p-3 shadow-2xl transition animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Top User Status Header */}
          {loggedIn ? (
            <div className="mb-3 flex items-center justify-between rounded-lg border border-border bg-secondary/50 p-2.5">
              <div className="min-w-0 flex-1 pr-2">
                <div className="truncate text-xs font-bold text-foreground">
                  {session?.user?.user_metadata?.name || session?.user?.email}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span className="capitalize">{isWorker ? "Worker" : isAgency ? "Agency" : "Member"}</span>
                </div>
              </div>
              <Link
                to={isWorker ? "/worker-dashboard" : isAgency ? "/agency/dashboard" : "/profile"}
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition hover:text-foreground"
                aria-label={isWorker ? "Worker Dashboard" : isAgency ? "Agency Dashboard" : "Account Settings"}
                title={isWorker ? "Worker Dashboard" : isAgency ? "Agency Dashboard" : "Profile Settings"}
              >
                <UserRound size={14} />
              </Link>
            </div>
          ) : (
            <div className="mb-3 flex items-center justify-between rounded-lg border border-border bg-secondary/40 p-2.5">
              <div>
                <div className="text-xs font-bold text-foreground">LocalWorker</div>
                <div className="text-[10px] text-muted-foreground">Directory & Services</div>
              </div>
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="rounded-md bg-foreground px-2.5 py-1 text-[11px] font-semibold text-background transition hover:opacity-90"
              >
                Sign In
              </Link>
            </div>
          )}

          {/* Section 1: Explore & Discovery (Grid Tile Layout) */}
          <div className="mb-3">
            <div className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Explore Services
            </div>
            <Link
              to="/assistant"
              onClick={() => setOpen(false)}
              className="mb-1.5 flex items-center justify-between rounded-lg border border-primary/30 bg-primary/10 p-2.5 transition hover:bg-primary/20"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-foreground text-background">
                  <Sparkles size={13} />
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground">AI Assistant</div>
                  <div className="text-[10px] text-muted-foreground">Find matching specialists by requirement</div>
                </div>
              </div>
              <ChevronRight size={13} className="text-primary" />
            </Link>
            <div className="grid grid-cols-2 gap-1.5">
              <Link
                to="/search?type=workers"
                onClick={() => setOpen(false)}
                className="flex flex-col items-start gap-1.5 rounded-lg border border-border bg-card p-2.5 transition hover:border-foreground/30 hover:bg-secondary/60"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-secondary text-foreground">
                  <Search size={13} />
                </div>
                <span className="text-xs font-semibold text-foreground">Find Workers</span>
              </Link>

              <Link
                to="/search?type=agencies"
                onClick={() => setOpen(false)}
                className="flex flex-col items-start gap-1.5 rounded-lg border border-border bg-card p-2.5 transition hover:border-foreground/30 hover:bg-secondary/60"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-secondary text-foreground">
                  <Building2 size={13} />
                </div>
                <span className="text-xs font-semibold text-foreground">
                  Agencies & Teams
                </span>
              </Link>
            </div>

            {/* Quick Access Badges (Saved & Recent) */}
            <div className="mt-1.5 space-y-1">
              <Link
                to="/saved"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium text-foreground transition hover:bg-secondary"
              >
                <span className="flex items-center gap-2">
                  <Heart size={14} className="text-primary" />
                  <span>Saved Workers</span>
                </span>
                <span className="rounded-md border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-foreground">
                  {savedCount}
                </span>
              </Link>

              <Link
                to="/recently-viewed"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium text-foreground transition hover:bg-secondary"
              >
                <span className="flex items-center gap-2">
                  <Clock3 size={14} className="text-muted-foreground" />
                  <span>Recently Viewed</span>
                </span>
                <span className="rounded-md border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                  {recentCount}
                </span>
              </Link>
            </div>
          </div>

          {/* Section 2: Portals & Work Tools (Card Banner Layout) */}
          {(isWorker || isAgency || showInbox) && (
            <div className="mb-3 border-t border-border pt-2.5">
              <div className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Management
              </div>
              <div className="space-y-1.5">
                {isWorker && (
                  <>
                    <Link
                      to="/worker-dashboard"
                      onClick={() => setOpen(false)}
                      className="group flex items-center justify-between rounded-lg border border-border bg-card p-2 text-xs font-medium text-foreground transition hover:border-foreground/30 hover:bg-secondary/60"
                    >
                      <span className="flex items-center gap-2">
                        <BriefcaseBusiness size={14} className="text-primary" />
                        <span>Worker Portal</span>
                      </span>
                      <ChevronRight size={13} className="text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
                    </Link>
                    <Link
                      to="/profile-completeness"
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground transition hover:bg-secondary hover:text-foreground"
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
                    className="group flex items-center justify-between rounded-lg border border-border bg-card p-2 text-xs font-medium text-foreground transition hover:border-foreground/30 hover:bg-secondary/60"
                  >
                    <span className="flex items-center gap-2">
                      <Building2 size={14} className="text-primary" />
                      <span>Agency Dashboard</span>
                    </span>
                    <ChevronRight size={13} className="text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </Link>
                )}

                {showInbox && (
                  <Link
                    to="/inbox"
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium text-foreground transition hover:bg-secondary"
                  >
                    <span className="flex items-center gap-2">
                      <Bell size={14} className="text-muted-foreground" />
                      <span>Inbox Messages</span>
                    </span>
                    {unread > 0 && (
                      <span className="rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                        {unread}
                      </span>
                    )}
                  </Link>
                )}
              </div>
            </div>
          )}



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

