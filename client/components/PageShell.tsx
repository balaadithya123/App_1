import { ArrowLeft, Search, Heart, Building2, Sparkles, UserRound, Briefcase, Bell, LayoutDashboard, MessageSquare, Clock } from "lucide-react";
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
  sm: "max-w-xl", // ~576px
  md: "max-w-3xl", // ~768px (default)
  lg: "max-w-5xl", // ~1024px
  xl: "max-w-7xl", // ~1280px
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
    if (window.history.state && typeof window.history.state.idx === "number" && window.history.state.idx > 0) {
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
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, s) => setSession(s)
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
  const homePath = isWorker
    ? "/worker-dashboard"
    : isAgency
      ? "/agency"
      : "/";

  const brand = (
    <div className="flex items-center gap-2 group">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white font-bold text-sm shadow-subtle">
        L
      </span>
      <span className="text-base font-bold tracking-tight text-[#2C2C2C] dark:text-[#F4F4F5]">
        Local<span className="text-primary">Worker</span>
      </span>
    </div>
  );

  const noHome = hideHome || disableBrandNavigation;
  const maxWidthClass = maxWidthMap[containerWidth] || maxWidthMap.md;
  const paddingClass = contentPadding !== undefined ? contentPadding : "px-4 py-6 sm:px-6 sm:py-8 lg:px-8";

  return (
    <div className="min-h-screen bg-[#F6F9FC] dark:bg-black text-[#2C2C2C] dark:text-[#F4F4F5] flex flex-col selection:bg-primary-100/25 selection:text-primary">
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-[#E7ECF1] dark:border-[#1F1F1F] bg-white/95 dark:bg-black/95 backdrop-blur-md">
        <div className={`mx-auto flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8 ${maxWidthClass}`}>
          {/* Brand Logo */}
          <div className="flex items-center gap-6">
            {noHome ? (
              <div aria-label="LocalWorker">{brand}</div>
            ) : (
              <button
                type="button"
                onClick={() => navigate(homePath)}
                aria-label="Go to homepage"
                className="text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
              >
                {brand}
              </button>
            )}

            {/* Desktop Quick Nav Links */}
            <nav className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-[#67696D] dark:text-[#A1A1AA]">
              {isWorker ? (
                <>
                  <Link
                    to="/worker-dashboard"
                    className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition hover:bg-primary-100/15 hover:text-primary dark:hover:bg-white/10 dark:hover:text-[#F4F4F5]"
                  >
                    <LayoutDashboard size={14} />
                    <span>Dashboard</span>
                  </Link>
                  <Link
                    to="/worker-commitments"
                    className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition hover:bg-primary-100/15 hover:text-primary dark:hover:bg-white/10 dark:hover:text-[#F4F4F5]"
                  >
                    <Briefcase size={14} />
                    <span>Commitments</span>
                  </Link>
                  <Link
                    to="/callback-requests"
                    className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition hover:bg-primary-100/15 hover:text-primary dark:hover:bg-white/10 dark:hover:text-[#F4F4F5]"
                  >
                    <Bell size={14} />
                    <span>Callbacks</span>
                  </Link>
                </>
              ) : isAgency ? (
                <>
                  <Link
                    to="/agency"
                    className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition hover:bg-primary-100/15 hover:text-primary dark:hover:bg-white/10 dark:hover:text-[#F4F4F5]"
                  >
                    <Building2 size={14} />
                    <span>Dashboard</span>
                  </Link>
                  <Link
                    to="/inbox"
                    className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition hover:bg-primary-100/15 hover:text-primary dark:hover:bg-white/10 dark:hover:text-[#F4F4F5]"
                  >
                    <MessageSquare size={14} />
                    <span>Inbox</span>
                  </Link>
                  <Link
                    to="/agency/profile/edit"
                    className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition hover:bg-primary-100/15 hover:text-primary dark:hover:bg-white/10 dark:hover:text-[#F4F4F5]"
                  >
                    <UserRound size={14} />
                    <span>Agency Profile</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/search?type=workers"
                    className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition hover:bg-primary-100/15 hover:text-primary dark:hover:bg-white/10 dark:hover:text-[#F4F4F5]"
                  >
                    <Search size={14} />
                    <span>Workers</span>
                  </Link>
                  <Link
                    to="/search?type=agencies"
                    className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition hover:bg-primary-100/15 hover:text-primary dark:hover:bg-white/10 dark:hover:text-[#F4F4F5]"
                  >
                    <Building2 size={14} />
                    <span>Agencies</span>
                  </Link>
                  <Link
                    to="/saved"
                    className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition hover:bg-primary-100/15 hover:text-primary dark:hover:bg-white/10 dark:hover:text-[#F4F4F5]"
                  >
                    <Heart size={14} />
                    <span>Saved</span>
                  </Link>
                  <Link
                    to="/inbox"
                    className="relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition hover:bg-primary-100/15 hover:text-primary dark:hover:bg-white/10 dark:hover:text-[#F4F4F5]"
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
            {loggedIn && (
              <Link
                to={portalPath}
                aria-label={portalLabel}
                title={portalLabel}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E7ECF1] dark:border-[#1F1F1F] bg-white dark:bg-[#0A0A0A] text-[#2C2C2C] dark:text-[#F4F4F5] transition hover:border-primary hover:text-primary shadow-subtle"
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
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#E7ECF1] dark:border-[#1F1F1F] bg-white dark:bg-[#0A0A0A] px-3.5 py-1.5 text-xs font-semibold text-[#2C2C2C] dark:text-[#F4F4F5] shadow-subtle transition-all hover:border-primary hover:text-primary hover:bg-primary-100/10 focus-visible:ring-2 focus-visible:ring-primary cursor-pointer active:scale-95"
                >
                  <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
                  <span>{backLabel}</span>
                </button>
                {headerTitle && (
                  <h1 className="text-base sm:text-lg font-bold text-[#2C2C2C] dark:text-[#F4F4F5] tracking-tight truncate">
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

