import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Search,
  Heart,
  UserRound,
  Briefcase,
  Bell,
  Building2,
  LayoutDashboard,
  MessageSquare,
  Clock,
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getStoredDueBadgeCount, getLiveDueBadgeCount } from "@/lib/home-items";
import { useLanguage } from "@/lib/i18n";

export default function NavBar() {
  const location = useLocation();
  const { t } = useLanguage();
  const [session, setSession] = useState<any>(null);
  const [dueCount, setDueCount] = useState(0);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) =>
      setSession(s),
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const updateDue = () => {
      setDueCount(getStoredDueBadgeCount(session?.user?.id));
      void getLiveDueBadgeCount(session?.user?.id).then((c) => setDueCount(c));
    };
    updateDue();
    window.addEventListener("home-items-changed", updateDue);
    return () => window.removeEventListener("home-items-changed", updateDue);
  }, [session?.user?.id]);

  // Suppress bottom navigation island on auth and onboarding pages
  const hiddenPaths = [
    "/login",
    "/join",
    "/register",
    "/register-agency",
    "/voice",
    "/voice-onboarding",
  ];
  if (
    hiddenPaths.includes(location.pathname) ||
    location.pathname.startsWith("/register") ||
    location.pathname.startsWith("/join")
  ) {
    return null;
  }

  const loggedIn = !!session;
  const userRole = session?.user?.user_metadata?.role;
  const isWorker = userRole === "worker";
  const isAgency = userRole === "agency";

  if (isWorker) {
    const workerTabs = [
      {
        name: t("nav.dashboard"),
        path: "/worker-dashboard",
        icon: LayoutDashboard,
        isActive:
          location.pathname === "/worker-dashboard" ||
          location.pathname === "/",
      },
      {
        name: t("nav.commitments"),
        path: "/worker-commitments",
        icon: Briefcase,
        isActive: location.pathname === "/worker-commitments",
      },
      {
        name: t("nav.callbacks"),
        path: "/callback-requests",
        icon: Bell,
        isActive: location.pathname === "/callback-requests",
      },
      {
        name: t("nav.profile"),
        path: "/profile",
        icon: UserRound,
        isActive: location.pathname === "/profile",
      },
    ];

    return (
      <nav
        aria-label="Worker Bottom Navigation"
        className="md:hidden fixed bottom-3 left-3 right-3 z-40 mx-auto flex max-w-lg items-center justify-around rounded-[26px] border border-[#EAE2DC] dark:border-white/10 bg-white/95 dark:bg-[#161514]/95 px-2 py-2 shadow-xl backdrop-blur-xl"
      >
        {workerTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.name}
              to={tab.path}
              aria-label={tab.name}
              className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-1.5 text-[10px] font-semibold transition ${
                tab.isActive
                  ? "text-[#F4512C]"
                  : "text-[#6B645F] dark:text-[#9E958F]"
              }`}
            >
              <span
                className={`relative flex h-7 w-9 items-center justify-center rounded-full ${
                  tab.isActive ? "bg-[#FCEAE4] dark:bg-[#3A2018]" : ""
                }`}
              >
                <Icon size={18} strokeWidth={tab.isActive ? 2.4 : 2} />
              </span>
              <span>{tab.name}</span>
              {tab.isActive && (
                <span className="absolute bottom-0 h-0.5 w-5 rounded-full bg-[#F4512C]" />
              )}
            </Link>
          );
        })}
      </nav>
    );
  }

  if (isAgency) {
    const agencyTabs = [
      {
        name: t("nav.dashboard"),
        path: "/agency",
        icon: Building2,
        isActive:
          location.pathname === "/agency" ||
          location.pathname === "/agency/dashboard" ||
          location.pathname === "/",
      },
      {
        name: t("nav.inbox"),
        path: "/inbox",
        icon: MessageSquare,
        isActive: location.pathname === "/inbox",
      },
      {
        name: t("nav.profile"),
        path: "/agency/profile/edit",
        icon: UserRound,
        isActive:
          location.pathname === "/agency/profile/edit" ||
          location.pathname === "/profile",
      },
    ];

    return (
      <nav
        aria-label="Agency Bottom Navigation"
        className="md:hidden fixed bottom-3 left-3 right-3 z-40 mx-auto flex max-w-lg items-center justify-around rounded-[26px] border border-[#EAE2DC] dark:border-white/10 bg-white/95 dark:bg-[#161514]/95 px-2 py-2 shadow-xl backdrop-blur-xl"
      >
        {agencyTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.name}
              to={tab.path}
              aria-label={tab.name}
              className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-1.5 text-[10px] font-semibold transition ${
                tab.isActive
                  ? "text-[#F4512C]"
                  : "text-[#6B645F] dark:text-[#9E958F]"
              }`}
            >
              <span
                className={`relative flex h-7 w-9 items-center justify-center rounded-full ${
                  tab.isActive ? "bg-[#FCEAE4] dark:bg-[#3A2018]" : ""
                }`}
              >
                <Icon size={18} strokeWidth={tab.isActive ? 2.4 : 2} />
              </span>
              <span>{tab.name}</span>
              {tab.isActive && (
                <span className="absolute bottom-0 h-0.5 w-5 rounded-full bg-[#F4512C]" />
              )}
            </Link>
          );
        })}
      </nav>
    );
  }

  // Customer mobile navigation — four clear destinations.
  const customerTabs = [
    {
      name: t("nav.home"),
      path: "/home",
      icon: Home,
      isActive:
        location.pathname === "/home" ||
        location.pathname === "/app" ||
        location.pathname === "/",
    },
    {
      name: t("nav.search"),
      path: "/search",
      icon: Search,
      isActive: location.pathname === "/search",
    },
    {
      name: t("nav.saved"),
      path: "/saved",
      icon: Heart,
      isActive:
        location.pathname === "/saved" || location.pathname === "/my-circle",
    },
    {
      name: t("nav.inbox"),
      path: "/inbox",
      icon: Clock,
      isActive: location.pathname === "/inbox",
      badge: dueCount,
    },
  ];
  return (
    <nav
      aria-label="Customer bottom navigation"
      className="md:hidden fixed bottom-3 left-3 right-3 z-40 mx-auto flex max-w-lg items-center justify-around rounded-[26px] border border-[#EAE2DC] dark:border-white/10 bg-white/95 dark:bg-[#161514]/95 px-2 py-2 shadow-[0_12px_35px_rgba(0,0,0,0.22)] backdrop-blur-xl"
    >
      {customerTabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <Link
            key={tab.name}
            to={tab.path}
            aria-label={tab.name}
            className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-1.5 text-[10px] font-semibold transition ${
              tab.isActive
                ? "text-[#F4512C]"
                : "text-[#6B645F] dark:text-[#9E958F]"
            }`}
          >
            <span
              className={`relative flex h-7 w-9 items-center justify-center rounded-full ${
                tab.isActive ? "bg-[#FCEAE4] dark:bg-[#3A2018]" : ""
              }`}
            >
              <Icon size={19} strokeWidth={tab.isActive ? 2.4 : 2} />
              {tab.badge && tab.badge > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#F4512C] px-1 text-[9px] font-bold text-white">
                  {tab.badge > 9 ? "9+" : tab.badge}
                </span>
              ) : null}
            </span>
            <span>{tab.name}</span>
            {tab.isActive && (
              <span className="absolute bottom-0 h-0.5 w-5 rounded-full bg-[#F4512C]" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
