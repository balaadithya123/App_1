import { Link, useLocation, useNavigate } from "react-router-dom";
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
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getStandardLocation } from "@/lib/location";

export default function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [islandSearchQuery, setIslandSearchQuery] = useState("");

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

  // Sync search query if user is on /search
  useEffect(() => {
    if (location.pathname === "/search") {
      const params = new URLSearchParams(location.search);
      const q = params.get("q") || params.get("service") || "";
      setIslandSearchQuery(q);
    }
  }, [location.pathname, location.search]);

  const loggedIn = !!session;
  const userRole = session?.user?.user_metadata?.role;
  const isWorker = userRole === "worker";
  const isAgency = userRole === "agency";

  const handleIslandSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const currentLoc = getStandardLocation();
    const params = new URLSearchParams();
    if (islandSearchQuery.trim()) {
      params.set("q", islandSearchQuery.trim());
      params.set("service", islandSearchQuery.trim());
    }
    if (currentLoc && currentLoc !== "Local Area") {
      params.set("location", currentLoc);
    }
    navigate(`/search${params.toString() ? `?${params.toString()}` : ""}`);
  };

  if (isWorker) {
    const workerTabs = [
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

    return (
      <nav
        aria-label="Worker Bottom Navigation"
        className="md:hidden fixed bottom-4 inset-x-0 mx-auto w-fit z-40 rounded-full border border-[#E4E4E7] dark:border-[#27272A] bg-white/90 dark:bg-[#141416]/90 backdrop-blur-xl px-3 py-1.5 shadow-xl flex items-center gap-2"
      >
        {workerTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.name}
              to={tab.path}
              aria-label={tab.name}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition-all cursor-pointer ${
                tab.isActive
                  ? "bg-black text-white dark:bg-white dark:text-black shadow-sm"
                  : "text-[#71717A] hover:text-[#09090B] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10"
              }`}
            >
              <Icon size={18} strokeWidth={tab.isActive ? 2.2 : 2} />
            </Link>
          );
        })}
      </nav>
    );
  }

  if (isAgency) {
    const agencyTabs = [
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

    return (
      <nav
        aria-label="Agency Bottom Navigation"
        className="md:hidden fixed bottom-4 inset-x-0 mx-auto w-fit z-40 rounded-full border border-[#E4E4E7] dark:border-[#27272A] bg-white/90 dark:bg-[#141416]/90 backdrop-blur-xl px-3 py-1.5 shadow-xl flex items-center gap-2"
      >
        {agencyTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.name}
              to={tab.path}
              aria-label={tab.name}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition-all cursor-pointer ${
                tab.isActive
                  ? "bg-black text-white dark:bg-white dark:text-black shadow-sm"
                  : "text-[#71717A] hover:text-[#09090B] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10"
              }`}
            >
              <Icon size={18} strokeWidth={tab.isActive ? 2.2 : 2} />
            </Link>
          );
        })}
      </nav>
    );
  }

  // Customer / Visitor Bottom Island with Integrated Search Box
  return (
    <nav
      aria-label="Customer Bottom Navigation"
      className="md:hidden fixed bottom-4 inset-x-0 mx-auto w-[94%] max-w-[380px] z-40 rounded-full border border-[#E4E4E7] dark:border-[#27272A] bg-white/90 dark:bg-[#141416]/90 backdrop-blur-xl px-2 py-1.5 shadow-xl flex items-center justify-between gap-1.5"
    >
      {/* 1. Home Button */}
      <Link
        to="/home"
        aria-label="Home"
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all cursor-pointer ${
          location.pathname === "/home" || location.pathname === "/app"
            ? "bg-black text-white dark:bg-white dark:text-black shadow-sm"
            : "text-[#71717A] hover:text-[#09090B] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10"
        }`}
      >
        <Home size={17} strokeWidth={location.pathname === "/home" || location.pathname === "/app" ? 2.2 : 2} />
      </Link>

      {/* 2. Integrated Search Box in the Island */}
      <form onSubmit={handleIslandSearch} className="flex-1 min-w-0">
        <div className="relative flex items-center w-full">
          <Search
            size={13}
            className="absolute left-2.5 text-[#71717A] dark:text-[#A1A1AA] shrink-0 pointer-events-none"
          />
          <input
            type="text"
            value={islandSearchQuery}
            onChange={(e) => setIslandSearchQuery(e.target.value)}
            placeholder="Search pros & services..."
            className="h-8.5 w-full rounded-full border border-[#E4E4E7] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#09090B] pl-7.5 pr-7 text-xs text-[#09090B] dark:text-[#FAFAFA] placeholder:text-[#A1A1AA] dark:placeholder:text-[#71717A] outline-none focus:border-neutral-400 dark:focus:border-neutral-500 transition-all"
          />
          {islandSearchQuery ? (
            <button
              type="button"
              onClick={() => setIslandSearchQuery("")}
              className="absolute right-2 text-[#71717A] hover:text-[#09090B] dark:hover:text-white cursor-pointer"
            >
              <X size={12} />
            </button>
          ) : (
            <button
              type="submit"
              aria-label="Search"
              className="absolute right-1 flex h-6.5 w-6.5 items-center justify-center rounded-full bg-[#F4F4F5] dark:bg-[#27272A] text-[#09090B] dark:text-[#FAFAFA] hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all cursor-pointer"
            >
              <Search size={11} />
            </button>
          )}
        </div>
      </form>

      {/* 3. My Circle Button */}
      <Link
        to="/saved"
        aria-label="My Circle"
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all cursor-pointer ${
          location.pathname === "/saved" || location.pathname === "/my-circle"
            ? "bg-black text-white dark:bg-white dark:text-black shadow-sm"
            : "text-[#71717A] hover:text-[#09090B] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10"
        }`}
      >
        <Heart
          size={17}
          strokeWidth={
            location.pathname === "/saved" ||
            location.pathname === "/my-circle"
              ? 2.2
              : 2
          }
        />
      </Link>

      {/* 4. Profile Button */}
      <Link
        to={loggedIn ? "/profile" : "/login"}
        aria-label="Profile"
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all cursor-pointer ${
          location.pathname === "/profile" || location.pathname === "/login"
            ? "bg-black text-white dark:bg-white dark:text-black shadow-sm"
            : "text-[#71717A] hover:text-[#09090B] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10"
        }`}
      >
        <UserRound
          size={17}
          strokeWidth={
            location.pathname === "/profile" ||
            location.pathname === "/login"
              ? 2.2
              : 2
          }
        />
      </Link>
    </nav>
  );
}
