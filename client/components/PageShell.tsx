import { ArrowLeft, Search, Heart, Building2, Sparkles, UserRound } from "lucide-react";
import MobileMenu from "@/components/MobileMenu";
import ThemeToggle from "@/components/ThemeToggle";
import { type ReactNode, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

interface PageShellProps {
  children: ReactNode;
  backTo?: string;
  backLabel?: string;
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
  backTo = "/",
  backLabel = "Home",
  hideBack = false,
  hideHome = false,
  disableBrandNavigation = false,
  containerWidth = "md",
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
      ? "/agency/dashboard"
      : "/profile";
  const portalLabel = isWorker
    ? "Worker Dashboard"
    : isAgency
      ? "Agency Dashboard"
      : "Profile Settings";

  const brand = (
    <div className="flex items-center gap-2.5 group">
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background font-bold text-sm">
        L
      </span>
      <span className="text-base font-bold tracking-tight text-foreground">
        Local<span className="text-primary">Worker</span>
      </span>
    </div>
  );

  const noHome = hideHome || disableBrandNavigation;
  const maxWidthClass = maxWidthMap[containerWidth] || maxWidthMap.md;
  const paddingClass = contentPadding !== undefined ? contentPadding : "px-4 py-6 sm:px-6 sm:py-8 lg:px-8";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur-xs">
        <div className={`mx-auto flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8 ${maxWidthClass}`}>
          {/* Brand Logo */}
          <div className="flex items-center gap-6">
            {noHome ? (
              <div aria-label="LocalWorker">{brand}</div>
            ) : (
              <button
                type="button"
                onClick={() => navigate(backTo)}
                aria-label={backLabel}
                className="text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
              >
                {brand}
              </button>
            )}

            {/* Desktop Quick Nav Links */}
            <nav className="hidden md:flex items-center gap-1 text-xs font-semibold text-muted-foreground">
              <Link
                to="/assistant"
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-foreground bg-primary/10 transition hover:bg-primary/20 hover:text-primary"
              >
                <Sparkles size={14} className="text-primary" />
                <span>AI Assistant</span>
              </Link>
              <Link
                to="/search?type=workers"
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 transition hover:bg-secondary hover:text-foreground"
              >
                <Search size={14} />
                <span>Workers</span>
              </Link>
              <Link
                to="/search?type=agencies"
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 transition hover:bg-secondary hover:text-foreground"
              >
                <Building2 size={14} />
                <span>Agencies</span>
              </Link>
              <Link
                to="/saved"
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 transition hover:bg-secondary hover:text-foreground"
              >
                <Heart size={14} />
                <span>Saved</span>
              </Link>
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
                className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-foreground transition hover:bg-secondary"
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
            <div className="mb-5">
              <button
                type="button"
                onClick={() => navigate(backTo)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-secondary hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ArrowLeft size={14} />
                <span>{backLabel}</span>
              </button>
            </div>
          )}

          {children}
        </div>
      </main>
    </div>
  );
}

