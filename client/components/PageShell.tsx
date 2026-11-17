import { ArrowLeft } from "lucide-react";
import TopBar from "@/components/TopBar";
import TrackRecordFollowUpBanner from "@/components/TrackRecordFollowUpBanner";
import { type ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

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
  lg: "max-w-6xl",
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
  containerWidth = "lg",
  contentPadding,
  className = "",
}: PageShellProps) {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);

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
      if (backTo === "/" && loggedIn) {
        navigate(
          isWorker ? "/worker-dashboard" : isAgency ? "/agency" : "/home",
        );
      } else {
        navigate(backTo);
      }
    } else {
      navigate(-1);
    }
  };

  const noHome = hideHome || disableBrandNavigation;
  const maxWidthClass = maxWidthMap[containerWidth] || maxWidthMap.lg;
  const paddingClass =
    contentPadding !== undefined
      ? contentPadding
      : "px-4 py-6 sm:px-6 sm:py-8 lg:px-8";

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#0B0A09] text-[#141210] dark:text-[#FAFAFA] flex flex-col selection:bg-[#F4512C]/20">
      <TopBar disableBrandNavigation={noHome} />

      {/* Main Content Area */}
      <main className={`flex-1 ${paddingClass}`}>
        <div className={`mx-auto ${maxWidthClass} ${className}`}>
          {!hideBack && (
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] px-3.5 py-1.5 text-xs font-semibold text-[#141210] dark:text-[#FAFAFA] transition-all hover:border-[#F4512C]/50 cursor-pointer active:scale-95"
                >
                  <ArrowLeft size={14} />
                  <span>{backLabel}</span>
                </button>
                {headerTitle && (
                  <h1 className="text-base sm:text-lg font-bold text-[#141210] dark:text-[#FAFAFA] tracking-tight truncate">
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
