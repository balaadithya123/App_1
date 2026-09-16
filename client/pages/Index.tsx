import { Link, useNavigate } from "react-router-dom";
import MobileMenu from "@/components/MobileMenu";
import ThemeToggle from "@/components/ThemeToggle";
import {
  Brush,
  ChevronRight,
  Hammer,
  MapPin,
  Paintbrush,
  Search,
  UserRound,
  Zap,
  Wrench,
  Building2,
  Navigation,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { logAnalyticsEvent } from "@/lib/analytics";

const categories = [
  { name: "Electrician", icon: Zap },
  { name: "Plumber", icon: Wrench },
  { name: "Carpenter", icon: Hammer },
  { name: "Painter", icon: Paintbrush },
  { name: "Cleaner", icon: Brush },
  { name: "All Services", icon: ChevronRight },
];

export default function Index() {
  const navigate = useNavigate();
  const [service, setService] = useState("");
  const [location, setLocation] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "workers" | "agencies">("all");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    if (!supabase) return;

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  const loggedIn = !!session;
  const userRole = session?.user?.user_metadata?.role;
  const isWorker = userRole === "worker";
  const isAgency = userRole === "agency";
  const portalPath = isWorker ? "/worker-dashboard" : isAgency ? "/agency/dashboard" : "/profile";
  const portalLabel = isWorker ? "Worker Dashboard" : isAgency ? "Agency Dashboard" : "Profile Settings";

  const handleGps = () => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`/api/maps/reverse-geocode?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`);
          if (res.ok) {
            const data = await res.json();
            if (data.formatted_address) {
              setLocation(data.formatted_address);
            }
          }
        } catch {
          // ignore fallback
        } finally {
          setGpsLoading(false);
        }
      },
      () => setGpsLoading(false),
      { timeout: 8000, enableHighAccuracy: true },
    );
  };

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const s = service.trim();
    const loc = location.trim();

    void logAnalyticsEvent("search_performed", null, {
      search_term: s,
      location: loc,
      type: activeTab,
    });

    const params = new URLSearchParams();
    if (s) params.set("service", s);
    if (loc) params.set("location", loc);
    if (activeTab !== "all") params.set("type", activeTab);

    navigate(`/search?${params.toString()}`);
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur-xs">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background font-bold text-sm">
              L
            </span>
            <span className="text-base font-bold tracking-tight text-foreground">
              Local<span className="text-primary">Worker</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {loggedIn ? (
              <Link
                to={portalPath}
                aria-label={portalLabel}
                title={portalLabel}
                className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-foreground transition hover:bg-secondary"
              >
                <UserRound size={16} />
              </Link>
            ) : (
              <Link
                to="/register"
                className="hidden rounded-md border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground transition hover:bg-secondary sm:inline-block"
              >
                Register
              </Link>
            )}
            <MobileMenu />
          </div>
        </div>
      </header>

      {/* Main Hero & Search Area */}
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-12">
        {/* Simple, Clean Headline */}
        <div className="mb-6 text-center sm:text-left">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Find Local Workers & Agencies
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Search trusted professionals in your area for home repairs, maintenance, and services.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="mb-3 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
              activeTab === "all"
                ? "bg-foreground text-background"
                : "border border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("workers")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
              activeTab === "workers"
                ? "bg-foreground text-background"
                : "border border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            <UserRound size={13} />
            <span>Workers</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("agencies")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
              activeTab === "agencies"
                ? "bg-foreground text-background"
                : "border border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            <Building2 size={13} />
            <span>Agencies</span>
          </button>
        </div>

        {/* Search Bar */}
        <form
          onSubmit={handleSearch}
          className="rounded-xl border border-border bg-card p-2.5 shadow-2xs transition focus-within:border-foreground/30 sm:p-3"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {/* Service Input */}
            <div className="flex min-w-0 flex-1 items-center rounded-lg bg-secondary/50 px-3 py-1 focus-within:bg-secondary min-h-[44px]">
              <Search size={16} className="mr-2.5 shrink-0 text-muted-foreground" />
              <input
                id="service-input"
                value={service}
                onChange={(e) => setService(e.target.value)}
                placeholder="What service do you need? (e.g. Electrician, Plumber)"
                className="h-10 w-full min-w-0 bg-transparent text-xs sm:text-sm text-foreground outline-hidden placeholder:text-muted-foreground"
              />
            </div>

            {/* Location Input */}
            <div className="flex min-w-0 flex-1 items-center rounded-lg bg-secondary/50 px-3 py-1 focus-within:bg-secondary min-h-[44px]">
              <MapPin size={16} className="mr-2.5 shrink-0 text-muted-foreground" />
              <input
                id="location-input"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Location (e.g. Area, City, Pincode)"
                className="h-10 w-full min-w-0 bg-transparent text-xs sm:text-sm text-foreground outline-hidden placeholder:text-muted-foreground"
              />
              <button
                type="button"
                onClick={handleGps}
                disabled={gpsLoading}
                title="Use Current Location"
                aria-label="Use Current Location"
                className="ml-1 flex h-7 items-center gap-1 rounded-md px-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
              >
                <Navigation size={12} className={gpsLoading ? "animate-spin text-primary" : "text-primary"} />
                <span className="hidden sm:inline">GPS</span>
              </button>
            </div>

            {/* Search Button */}
            <button
              type="submit"
              className="flex h-11 w-full shrink-0 cursor-pointer items-center justify-center rounded-lg bg-foreground px-6 text-xs sm:text-sm font-semibold text-background transition hover:opacity-90 sm:w-auto"
            >
              Search
            </button>
          </div>
        </form>

        {/* Categories Grid */}
        <section className="mt-8">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Popular Categories
          </h2>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {categories.map(({ name, icon: Icon }) => (
              <Link
                key={name}
                to={name === "All Services" ? "/search" : `/search?service=${encodeURIComponent(name)}`}
                className="group flex items-center justify-between rounded-lg border border-border bg-card p-3 text-foreground transition hover:border-foreground/30 hover:bg-secondary/40 min-h-[48px]"
              >
                <span className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-secondary text-foreground">
                    <Icon size={14} />
                  </span>
                  <span className="text-xs font-semibold sm:text-sm">{name}</span>
                </span>
                <ChevronRight
                  size={14}
                  className="text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground"
                />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
