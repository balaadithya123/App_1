import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import MobileMenu from "@/components/MobileMenu";
import {
  Brush,
  ChevronRight,
  Hammer,
  MapPin,
  Paintbrush,
  Search,
  ShieldCheck,
  Zap,
  Wrench,
} from "lucide-react";

const services = [
  { name: "Electrician", icon: Zap, tone: "bg-[#eef8f5]" },
  { name: "Plumber", icon: Wrench, tone: "bg-[#f0f6fa]" },
  { name: "Carpenter", icon: Hammer, tone: "bg-[#f8f5ed]" },
  { name: "Painter", icon: Paintbrush, tone: "bg-[#f5f1f8]" },
  { name: "Cleaner", icon: Brush, tone: "bg-[#eef6f7]" },
  { name: "Other", icon: ChevronRight, tone: "bg-[#f5f6f4]" },
];

export default function Index() {
  const navigate = useNavigate();
  const [work, setWork] = useState("");
  const [location, setLocation] = useState("");

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams({
      service: work.trim(),
      location: location.trim(),
    });

    navigate(`/search?${params.toString()}`);
  };

  return (
    <main className="min-h-screen bg-[#f8faf9] px-5 pb-10 text-ink sm:px-8">
      <div className="mx-auto max-w-[1060px]">
        <header className="flex items-center justify-between py-5 sm:py-7">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-teal text-sm font-extrabold text-white shadow-sm">
              L
            </span>
            <span className="text-[17px] font-extrabold tracking-[-0.03em] text-navy">
              LocalWorker
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/register"
              className="hidden rounded-[9px] px-2 py-2 text-[12px] font-bold text-teal transition-colors hover:bg-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 min-[360px]:block"
            >
              Register as a Worker
            </Link>
            <MobileMenu />
          </div>
        </header>

        <section className="relative overflow-hidden rounded-[18px] border border-[#dcece7] bg-[#edf7f3] px-5 pb-8 pt-8 sm:px-10 sm:pb-12 sm:pt-12">
          <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full border-[18px] border-white/60" />
          <div className="pointer-events-none absolute right-10 top-7 h-2 w-2 rounded-full bg-teal/30" />
          <div className="relative max-w-[650px]">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-teal">
              Your neighborhood, connected
            </p>
            <h1 className="max-w-[620px] text-[40px] font-extrabold leading-[1.04] tracking-[-0.055em] text-navy sm:text-6xl">
              Find local workers near you
            </h1>
            <p className="mt-4 max-w-[390px] text-[16px] leading-7 text-slate">
              Find the right person for the work you need.
            </p>
          </div>
        </section>

        <form
          onSubmit={handleSearch}
          className="relative z-10 -mt-4 rounded-[15px] border border-line bg-white p-2.5 shadow-[0_14px_38px_rgba(24,55,62,0.1)] sm:-mt-5 sm:flex sm:items-center sm:gap-2 sm:p-3"
        >
          <div className="flex min-w-0 flex-1 items-center rounded-[10px] bg-[#fbfcfc] px-3.5 focus-within:bg-mint/40">
            <Search aria-hidden="true" size={18} className="mr-3 shrink-0 text-teal" />
            <label htmlFor="work" className="sr-only">What work do you need?</label>
            <input
              id="work"
              type="text"
              value={work}
              onChange={(event) => setWork(event.target.value)}
              placeholder="What work do you need?"
              className="h-12 min-w-0 w-full bg-transparent text-sm text-navy outline-none placeholder:text-slate/80"
            />
          </div>
          <div className="my-1 ml-12 h-px bg-line sm:my-0 sm:ml-0 sm:h-8 sm:w-px" />
          <div className="flex min-w-0 flex-1 items-center rounded-[10px] bg-[#fbfcfc] px-3.5 focus-within:bg-mint/40">
            <MapPin aria-hidden="true" size={18} className="mr-3 shrink-0 text-teal" />
            <label htmlFor="location" className="sr-only">Your location</label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Your location"
              className="h-12 min-w-0 w-full bg-transparent text-sm text-navy outline-none placeholder:text-slate/80"
            />
          </div>
          <button
            type="submit"
            className="mt-2 flex h-12 w-full items-center justify-center rounded-[10px] bg-navy px-7 text-sm font-bold text-white shadow-[0_5px_12px_rgba(18,63,75,0.18)] transition-colors hover:bg-[#234b59] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 sm:mt-0 sm:w-auto"
          >
            Search
          </button>
        </form>

        <section className="pt-10 sm:pt-14">
          <div className="mb-4">
            <h2 className="text-[19px] font-extrabold tracking-[-0.025em] text-navy">
              Popular services
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {services.map(({ name, icon: Icon, tone }, index) => (
              <Link
                key={name}
                to={`/search?service=${encodeURIComponent(name)}`}
                className={`flex min-h-[74px] items-center justify-between rounded-[12px] border px-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 ${index % 2 === 0 ? "border-[#dcece7]" : "border-line"} bg-white text-navy hover:border-teal/50 hover:bg-mint/50`}
              >
                <span className="flex items-center gap-3">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-[9px] ${tone} text-teal`}>
                    <Icon size={18} strokeWidth={1.8} />
                  </span>
                  <span className="text-[13px] font-bold">{name}</span>
                </span>
                <ChevronRight size={16} className="text-slate/60" />
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-10 flex items-center gap-3 rounded-[13px] border border-[#dcece7] bg-[#edf7f3]/70 px-4 py-4 sm:mt-14 sm:px-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-teal shadow-sm">
            <ShieldCheck size={19} strokeWidth={1.8} />
          </span>
          <p className="text-[13px] font-semibold leading-5 text-navy">
            Find local workers in your area.
          </p>
        </section>
      </div>
    </main>
  );
}
