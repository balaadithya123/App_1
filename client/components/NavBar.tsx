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

type NavigationTab = {
  name: string;
  path: string;
  icon: typeof Home;
  isActive: boolean;
  badge?: number;
};

export default function NavBar() {
  const location = useLocation();
  const [session, setSession] = useState<any>(null);
  const [dueCount, setDueCount] = useState(0);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const updateDue = () => {
      setDueCount(getStoredDueBadgeCount(session?.user?.id));
      void getLiveDueBadgeCount(session?.user?.id).then((count) => setDueCount(count));
    };
    updateDue();
    window.addEventListener("home-items-changed", updateDue);
    return () => window.removeEventListener("home-items-changed", updateDue);
  }, [session?.user?.id]);

  const hiddenPaths = ["/login", "/join", "/register", "/register-agency", "/voice", "/voice-onboarding"];
  if (hiddenPaths.includes(location.pathname) || location.pathname.startsWith("/register") || location.pathname.startsWith("/join")) {
    return null;
  }

  const role = session?.user?.user_metadata?.role;
  const isWorker = role === "worker";
  const isAgency = role === "agency";

  const workerTabs: NavigationTab[] = [
    { name: "Dashboard", path: "/worker-dashboard", icon: LayoutDashboard, isActive: location.pathname === "/worker-dashboard" || location.pathname === "/" },
    { name: "Jobs", path: "/worker-commitments", icon: Briefcase, isActive: location.pathname === "/worker-commitments" },
    { name: "Callbacks", path: "/callback-requests", icon: Bell, isActive: location.pathname === "/callback-requests" },
    { name: "Profile", path: "/profile", icon: UserRound, isActive: location.pathname === "/profile" },
  ];
  const agencyTabs: NavigationTab[] = [
    { name: "Dashboard", path: "/agency", icon: Building2, isActive: location.pathname === "/agency" || location.pathname === "/agency/dashboard" || location.pathname === "/" },
    { name: "Inbox", path: "/inbox", icon: MessageSquare, isActive: location.pathname === "/inbox", badge: dueCount },
    { name: "Profile", path: "/agency/profile/edit", icon: UserRound, isActive: location.pathname === "/agency/profile/edit" || location.pathname === "/profile" },
  ];
  const customerTabs: NavigationTab[] = [
    { name: "Home", path: "/home", icon: Home, isActive: location.pathname === "/home" || location.pathname === "/app" || location.pathname === "/" },
    { name: "Search", path: "/search", icon: Search, isActive: location.pathname === "/search" },
    { name: "Saved", path: "/saved", icon: Heart, isActive: location.pathname === "/saved" || location.pathname === "/my-circle" },
    { name: "Inbox", path: "/inbox", icon: Clock, isActive: location.pathname === "/inbox", badge: dueCount },
  ];

  const tabs = isWorker ? workerTabs : isAgency ? agencyTabs : customerTabs;

  return (
    <nav aria-label="Mobile navigation" className="lg:hidden fixed bottom-3 inset-x-3 z-50 mx-auto flex max-w-[520px] items-stretch justify-around rounded-[24px] border border-[#EADCD2] bg-[#FFFCF9]/95 px-2 py-2 shadow-[0_12px_34px_rgba(63,43,31,0.16)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#171719]/95 dark:shadow-[0_14px_34px_rgba(0,0,0,0.55)]">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <Link
            key={tab.name}
            to={tab.path}
            aria-label={tab.name}
            aria-current={tab.isActive ? "page" : undefined}
            className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5 text-[10px] font-semibold transition-colors ${tab.isActive ? "text-[#D94B28] dark:text-[#FF9A79]" : "text-[#81766F] hover:text-[#17191D] dark:text-[#A1A1AA] dark:hover:text-white"}`}
          >
            <span className={`relative flex h-7 w-10 items-center justify-center rounded-full transition-colors ${tab.isActive ? "bg-[#FCE4D8] dark:bg-[#42251D]" : ""}`}>
              <Icon size={19} strokeWidth={tab.isActive ? 2.4 : 1.9} />
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#DE542C] px-1 text-[9px] font-bold text-white">
                  {tab.badge > 9 ? "9+" : tab.badge}
                </span>
              )}
            </span>
            <span>{tab.name}</span>
            {tab.isActive && <span className="absolute bottom-0 h-0.5 w-5 rounded-full bg-[#DE542C]" />}
          </Link>
        );
      })}
    </nav>
  );
}
