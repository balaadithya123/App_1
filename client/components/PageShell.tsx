import {
  ArrowLeft,
  Search,
  Heart,
  Building2,
  Sparkles,
  UserRound,
  Briefcase,
  Bell,
  LayoutDashboard,
  MessageSquare,
  Clock,
} from "lucide-react";
import MobileMenu from "@/components/MobileMenu";
import ThemeToggle from "@/components/ThemeToggle";
import TrackRecordFollowUpBanner from "@/components/TrackRecordFollowUpBanner";
import { type ReactNode, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { getStoredDueBadgeCount, getLiveDueBadgeCount } from "@/lib/home-items";

interface PageShellProps {
  children: ReactNode;
  backTo?: string;
  backLabel?: string;
  headerTitle?: ReactNode;
  headerRight?: ReactNode;
  onBack?: () => void;
  hideBack?: boolean;
  hideHome?: boolean;
  disableBrandNavigation?: boolean;
  containerWidth?: "sm" | "md" | "lg" | "xl" | "full";
  contentPadding?: string;
  className?: string;
}

const maxWidthMap = {
  sm: "max-w-xl",
  md: "max-w-3xl",
  lg: "max-w-5xl",
  xl: "max-w-7xl",
  full: "max-w-full",
};

export default function PageShell({
  children,
  backTo,
  backLabel = "Back",
  headerTitle,
  headerRight,
  onBack,
  hideBack = false,
  hideHome = false,
  disableBrandNavigation = false,
  containerWidth = "md",
  contentPadding,
  className = "",
}: PageShellProps) {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [dueCount, setDueCount] = useState<number>(0);

  useEffect(() => {
    const updateDue = () => {
      setDueCount(getStoredDueBadgeCount(session?.user?.id));
      void getLiveDueBadgeCount(session?.user?.id).then((c) => setDueCount(c));
    };
    updateDue();
    window.addEventListener("home-items-changed", updateDue);
    return () => window.removeEventListener("home-items-changed", updateDue);
  }, [session?.user?.id]);

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (
      window.history.state &&
      typeof window.history.state.idx === "number" &&
      window.history.state.idx > 0
    ) {
      navigate(-1);
    } else if (backTo) {
      navigate(backTo);
    } else {
      navigate(-1);
    }
  };

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) =>
      setSession(s),
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  const loggedIn = !!session;
  const userRole = session?.user?.user_metadata?.role;
  const isWorker = userRole === "worker";
  const isAgency = userRole === "agency";
  const portalPath = isWorker
    ? "/worker-dashboard"
    : isAgency
      ? "/agency"
      : "/profile";
  const portalLabel = isWorker
    ? "Worker Dashboard"
    : isAgency
      ? "Agency Dashboard"
      : "Profile Settings";
  const homePath = isWorker ? "/worker-dashboard" : isAgency ? "/agency" : "/";

  const brand = (
    <div className="flex items-center gap-2 group">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-black text-white dark:bg-white dark:text-black font-extrabold text-sm shadow-sm transition-transform group-hover:scale-105">
        L
      </span>
      <span className="text-base font-bold tracking-tight text-[#09090B] dark:text-[#FAFAFA]">
        LocalWorker
      </span>
    </div>
  );

  const noHome = hideHome || disableBrandNavigation;
  const maxWidthClass = maxWidthMap[containerWidth] || maxWidthMap.md;
  const paddingClass =
    contentPadding !== undefined
      ? contentPadding
      : "px-4 py-6 sm:px-6 sm:py-8 lg:px-8";

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#09090B] text-[#09090B] dark:text-[#FAFAFA] flex flex-col selection:bg-neutral-200 dark:selection:bg-neutral-800">
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-[#E4E4E7] dark:border-[#27272A] bg-[#FAFAFA]/80 dark:bg-[#09090B]/80 backdrop-blur-xl">
        <div
          className={`mx-auto flex h-14 sm:h-16 items-center justify-between px-4 sm:px-6 lg:px-8 ${maxWidthClass}`}
        >
          {/* Brand Logo */}
          <div className="flex items-center gap-6">
            {noHome ? (
              <div aria-label="LocalWorker">{brand}</div>
            ) : (
              <button
                type="button"
                onClick={() => navigate(homePath)}
                aria-label="Go to homepage"
                className="text-left cursor-pointer focus-visible:outline-none rounded-xl"
              >
                {brand}
              </button>
            )}

            {/* Desktop Quick Nav Links */}
            <nav className="hidden md:flex items-center gap-1 text-xs font-semibold text-[#71717A] dark:text-[#A1A1AA]">
              {isWorker ? (
                <>
                  <Link
                    to="/worker-dashboard"
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 transition hover:bg-[#F4F4F5] dark:hover:bg-[#27272A] hover:text-[#09090B] dark:hover:text-white"
                  >
                    <LayoutDashboard size={14} />
                    <span>Dashboard</span>
                  </Link>
                  <Link
                    to="/worker-commitments"
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 transition hover:bg-[#F4F4F5] dark:hover:bg-[#27272A] hover:text-[#09090B] dark:hover:text-white"
                  >
                    <Briefcase size={14} />
                    <span>Commitments</span>
                  </Link>
                  <Link
                    to="/callback-requests"
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 transition hover:bg-[#F4F4F5] dark:hover:bg-[#27272A] hover:text-[#09090B] dark:hover:text-white"
                  >
                    <Bell size={14} />
                    <span>Callbacks</span>
                  </Link>
                </>
              ) : isAgency ? (
                <>
                  <Link
                    to="/agency"
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 transition hover:bg-[#F4F4F5] dark:hover:bg-[#27272A] hover:text-[#09090B] dark:hover:text-white"
                  >
                    <Building2 size={14} />
                    <span>Dashboard</span>
                  </Link>
                  <Link
                    to="/inbox"
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 transition hover:bg-[#F4F4F5] dark:hover:bg-[#27272A] hover:text-[#09090B] dark:hover:text-white"
                  >
                    <MessageSquare size={14} />
                    <span>Inbox</span>
                  </Link>
                  <Link
                    to="/agency/profile/edit"
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 transition hover:bg-[#F4F4F5] dark:hover:bg-[#27272A] hover:text-[#09090B] dark:hover:text-white"
                  >
                    <UserRound size={14} />
                    <span>Agency Profile</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/search?type=workers"
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 transition hover:bg-[#F4F4F5] dark:hover:bg-[#27272A] hover:text-[#09090B] dark:hover:text-white"
                  >
                    <Search size={14} />
                    <span>Workers</span>
                  </Link>
                  <Link
                    to="/search?type=agencies"
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 transition hover:bg-[#F4F4F5] dark:hover:bg-[#27272A] hover:text-[#09090B] dark:hover:text-white"
                  >
                    <Building2 size={14} />
                    <span>Agencies</span>
                  </Link>
                  <Link
                    to="/saved"
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 transition hover:bg-[#F4F4F5] dark:hover:bg-[#27272A] hover:text-[#09090B] dark:hover:text-white"
                  >
                    <Heart size={14} />
                    <span>Saved</span>
                  </Link>
                  <Link
                    to="/inbox"
                    className="relative flex items-center gap-1.5 rounded-full px-3 py-1.5 transition hover:bg-[#F4F4F5] dark:hover:bg-[#27272A] hover:text-[#09090B] dark:hover:text-white"
                  >
                    <Clock size={14} />
                    <span>Inbox</span>
                    {dueCount > 0 && (
                      <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-extrabold text-white shadow-xs">
                        {dueCount > 9 ? "9+" : dueCount}
                      </span>
                    )}
                  </Link>
                </>
              )}
            </nav>
          </div>

          {/* Actions & Menu */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {!loggedIn && (
              <Link
                to="/login"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-black/10 dark:border-white/15 bg-black text-white dark:bg-white dark:text-black px-3.5 py-1.5 text-xs font-bold transition hover:opacity-90 shadow-xs"
              >
                Sign In
              </Link>
            )}
            {loggedIn && (
              <Link
                to={portalPath}
                aria-label={portalLabel}
                title={portalLabel}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] text-[#09090B] dark:text-[#FAFAFA] transition hover:border-neutral-400 dark:hover:border-neutral-500 shadow-sm"
              >
                <UserRound size={16} />
              </Link>
            )}
            <MobileMenu />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className={`flex-1 ${paddingClass}`}>
        <div className={`mx-auto ${maxWidthClass} ${className}`}>
          {!hideBack && (
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] px-3.5 py-1.5 text-xs font-semibold text-[#09090B] dark:text-[#FAFAFA] shadow-sm transition-all hover:border-neutral-400 dark:hover:border-neutral-500 cursor-pointer active:scale-95"
                >
                  <ArrowLeft
                    size={14}
                    className="transition-transform group-hover:-translate-x-0.5"
                  />
                  <span>{backLabel}</span>
                </button>
                {headerTitle && (
                  <h1 className="text-base sm:text-lg font-bold text-[#09090B] dark:text-[#FAFAFA] tracking-tight truncate">
                    {headerTitle}
                  </h1>
                )}
              </div>
              {headerRight && <div className="shrink-0">{headerRight}</div>}
            </div>
          )}

          {children}
        </div>
      </main>

      {/* Global In-App Track Record Follow-Up Banner */}
      <TrackRecordFollowUpBanner />
    </div>
  );
}
