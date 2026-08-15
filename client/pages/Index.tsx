import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import MobileMenu from "@/components/MobileMenu";
import ThemeToggle from "@/components/ThemeToggle";
import { Brush, ChevronRight, Hammer, MapPin, Paintbrush, Search, UserRound, Zap, Wrench } from "lucide-react";
import { supabase } from "@/lib/supabase";

const services = [
  { name: "Electrician", icon: Zap, tone: "bg-primary/10" },
  { name: "Plumber", icon: Wrench, tone: "bg-primary/10" },
  { name: "Carpenter", icon: Hammer, tone: "bg-primary/10" },
  { name: "Painter", icon: Paintbrush, tone: "bg-primary/10" },
  { name: "Cleaner", icon: Brush, tone: "bg-primary/10" },
  { name: "Other", icon: ChevronRight, tone: "bg-primary/10" },
];

export default function Index() {
  const navigate = useNavigate();
  const [work, setWork] = useState("");
  const [location, setLocation] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setLoggedIn(!!session));
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    navigate(`/search?${new URLSearchParams({ service: work.trim(), location: location.trim() }).toString()}`);
  };

  return (
    <main className="min-h-screen bg-background px-5 pb-10 text-foreground sm:px-8">
      <div className="mx-auto max-w-[1060px]">
        <header className="flex items-center justify-between py-5 sm:py-7">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary text-sm font-extrabold text-primary-foreground">L</span>
            <span className="text-[17px] font-extrabold tracking-[-0.03em] text-primary">LocalWorker</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {loggedIn && <Link to="/profile" aria-label="Profile" className="hidden h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition-colors min-[360px]:flex"><UserRound size={19} /></Link>}
            {!loggedIn && <Link to="/register" className="hidden rounded-full border border-border bg-card px-5 py-2 text-[12px] font-bold text-foreground shadow-sm min-[360px]:block">Register</Link>}
            <MobileMenu />
          </div>
        </header>

        <div className="relative overflow-visible rounded-[24px] border-[2px] border-primary pb-3">
          <section className="relative overflow-hidden rounded-[21px] bg-card px-5 pb-20 pt-7 shadow-[0_18px_55px_rgba(24,55,62,0.10)] sm:px-10 sm:pb-24 sm:pt-10">
            <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full border-[16px] border-primary/20" />
            <div className="pointer-events-none absolute right-10 top-7 h-2 w-2 rounded-full bg-primary/30" />
            <div className="relative max-w-[650px]">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Your neighborhood, connected</p>
              <h1 className="max-w-[620px] text-[36px] font-extrabold leading-[1.04] tracking-[-0.055em] text-foreground sm:text-5xl">Find local workers near you</h1>
              <p className="mt-3 max-w-[390px] text-[15px] leading-6 text-muted-foreground">Find the right person for the work you need.</p>
            </div>
          </section>

          <form onSubmit={handleSearch} className="relative z-10 mt-3 rounded-[18px] bg-card p-2 shadow-[0_14px_45px_rgba(24,55,62,0.16)] sm:flex sm:items-center sm:gap-2 sm:p-2.5">
            <div className="flex min-w-0 flex-1 items-center rounded-[12px] border border-border bg-background px-3.5">
              <Search size={18} className="mr-3 shrink-0 text-primary" />
              <input id="work" value={work} onChange={e => setWork(e.target.value)} placeholder="What work do you need?" className="h-11 min-w-0 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" />
            </div>
            <div className="my-1 ml-12 h-px bg-border sm:my-0 sm:ml-0 sm:h-7 sm:w-px" />
            <div className="flex min-w-0 flex-1 items-center rounded-[12px] border border-border bg-background px-3.5">
              <MapPin size={18} className="mr-3 shrink-0 text-primary" />
              <input id="location" value={location} onChange={e => setLocation(e.target.value)} placeholder="Your location" className="h-11 min-w-0 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" />
            </div>
            <button type="submit" className="mt-2 flex h-11 w-full items-center justify-center rounded-[12px] bg-primary px-7 text-sm font-bold text-primary-foreground sm:mt-0 sm:w-auto">Search</button>
          </form>
        </div>

        <section className="pt-10 sm:pt-14">
          <h2 className="mb-4 text-[19px] font-extrabold text-foreground">Popular services</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {services.map(({ name, icon: Icon, tone }) => (
              <Link key={name} to={`/search?service=${encodeURIComponent(name)}`} className="flex min-h-[74px] items-center justify-between rounded-[12px] border border-border bg-card px-4 text-foreground">
                <span className="flex items-center gap-3"><span className={`flex h-9 w-9 items-center justify-center rounded-[9px] ${tone} text-primary`}><Icon size={18} /></span><span className="text-[13px] font-bold">{name}</span></span>
                <ChevronRight size={16} />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
