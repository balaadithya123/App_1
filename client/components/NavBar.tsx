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
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function NavBar() {
  const location = useLocation();
  const [session, setSession] = useState<any>(null);

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

  const loggedIn = !!session;
  const userRole = session?.user?.user_metadata?.role;
  const isWorker = userRole === "worker";
  const isAgency = userRole === "agency";

  let tabs: Array<{
    name: string;
    path: string;
    icon: LucideIcon;
    isActive: boolean;
  }> = [];

  if (isWorker) {
    // For workers, their home is always their dashboard; search workers is not a main take
    tabs = [
      {
        name: "Dashboard",
        path: "/worker-dashboard",
        icon: LayoutDashboard,
        isActive:
          location.pathname === "/worker-dashboard" ||
          location.pathname === "/",
      },
      {
        name: "Commitments",
        path: "/worker-commitments",
        icon: Briefcase,
        isActive: location.pathname === "/worker-commitments",
      },
      {
        name: "Callbacks",
        path: "/callback-requests",
        icon: Bell,
        isActive: location.pathname === "/callback-requests",
      },
      {
        name: "Profile",
        path: "/profile",
        icon: UserRound,
        isActive: location.pathname === "/profile",
      },
    ];
  } else if (isAgency) {
    // For agencies, their home is always their dashboard; search workers is not a main take
    tabs = [
      {
        name: "Agency Dashboard",
        path: "/agency",
        icon: Building2,
        isActive:
          location.pathname === "/agency" ||
          location.pathname === "/agency/dashboard" ||
          location.pathname === "/",
      },
      {
        name: "Inbox",
        path: "/inbox",
        icon: MessageSquare,
        isActive: location.pathname === "/inbox",
      },
      {
        name: "Agency Profile",
        path: "/agency/profile/edit",
        icon: UserRound,
        isActive:
          location.pathname === "/agency/profile/edit" ||
          location.pathname === "/profile",
      },
    ];
  } else {
    // For public visitors / customers
    tabs = [
      {
        name: "Home",
        path: "/",
        icon: Home,
        isActive: location.pathname === "/",
      },
      {
        name: "Search Workers",
        path: "/search",
        icon: Search,
        isActive: location.pathname.startsWith("/search"),
      },
      {
        name: "My Circle",
        path: "/saved",
        icon: Heart,
        isActive:
          location.pathname === "/saved" || location.pathname === "/my-circle",
      },
      {
        name: "Profile",
        path: loggedIn ? "/profile" : "/login",
        icon: UserRound,
        isActive:
          location.pathname === "/profile" || location.pathname === "/login",
      },
    ];
  }

  return (
    <nav
      aria-label="Bottom Navigation"
      className="fixed bottom-4 inset-x-0 mx-auto w-fit z-40 rounded-full border border-[#E7ECF1] dark:border-[#222222] bg-white/95 dark:bg-black/90 backdrop-blur-md px-3 py-1.5 shadow-soft flex items-center gap-2 sm:gap-3"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <Link
            key={tab.name}
            to={tab.path}
            aria-label={tab.name}
            title={tab.name}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-all cursor-pointer ${
              tab.isActive
                ? "bg-primary text-white shadow-subtle"
                : "text-[#989EA7] hover:text-[#2C2C2C] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10"
            }`}
          >
            <Icon size={18} strokeWidth={tab.isActive ? 2.2 : 2} />
          </Link>
        );
      })}
    </nav>
  );
}
