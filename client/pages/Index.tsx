import { useState, type FormEvent } from "react";
import {
  Brush,
  ChevronRight,
  Hammer,
  Menu,
  Paintbrush,
  Search,
  Sparkles,
  Wrench,
} from "lucide-react";

const services = [
  { name: "Electrician", icon: Sparkles },
  { name: "Plumber", icon: Wrench },
  { name: "Carpenter", icon: Hammer },
  { name: "Painter", icon: Paintbrush },
  { name: "Cleaner", icon: Brush },
  { name: "Other", icon: ChevronRight },
];

export default function Index() {
  const [selectedService, setSelectedService] = useState("");
  const [work, setWork] = useState("");
  const [location, setLocation] = useState("");

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
          <button
            type="button"
            aria-label="Open menu"
            className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-line bg-white text-navy transition-colors hover:bg-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
          >
            <Menu size={21} strokeWidth={2.2} />
          </button>
        </header>

        <section className="pb-10 pt-10 sm:pb-14 sm:pt-20">
          <div className="max-w-[650px]">
            <h1 className="max-w-[620px] text-[42px] font-extrabold leading-[1.04] tracking-[-0.055em] text-navy sm:text-6xl">
              Find local workers near you
            </h1>
            <p className="mt-5 max-w-[390px] text-[16px] leading-7 text-slate">
              Find the right person for the work you need.
            </p>
          </div>
        </section>

        <form
          onSubmit={handleSearch}
          className="rounded-[14px] border border-line bg-white p-3 shadow-[0_12px_35px_rgba(24,55,62,0.06)] sm:flex sm:items-end sm:gap-3 sm:p-4"
        >
          <div className="flex-1">
            <label htmlFor="work" className="sr-only">
              What work do you need?
            </label>
            <div className="relative">
              <Search
                aria-hidden="true"
                size={18}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate"
              />
              <input
                id="work"
                type="text"
                value={work}
                onChange={(event) => setWork(event.target.value)}
                placeholder="What work do you need?"
                className="h-12 w-full rounded-[10px] border border-line bg-[#fbfcfc] pl-11 pr-3 text-sm text-navy outline-none placeholder:text-slate/80 focus:border-teal focus:ring-2 focus:ring-teal/15"
              />
            </div>
          </div>
          <div className="mt-3 flex-1 sm:mt-0">
            <label htmlFor="location" className="sr-only">
              Your location
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Your location"
              className="h-12 w-full rounded-[10px] border border-line bg-[#fbfcfc] px-3 text-sm text-navy outline-none placeholder:text-slate/80 focus:border-teal focus:ring-2 focus:ring-teal/15"
            />
          </div>
          <button
            type="submit"
            className="mt-3 flex h-12 w-full items-center justify-center rounded-[10px] bg-navy px-7 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#234b59] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 sm:mt-0 sm:w-auto"
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
            {services.map(({ name, icon: Icon }) => {
              const isSelected = selectedService === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setSelectedService(isSelected ? "" : name)}
                  aria-pressed={isSelected}
                  className={`flex min-h-[74px] items-center justify-between rounded-[12px] border px-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 ${
                    isSelected
                      ? "border-teal bg-mint text-navy shadow-sm"
                      : "border-line bg-white text-navy hover:border-teal/50 hover:bg-mint/50"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-[9px] ${isSelected ? "bg-white text-teal" : "bg-mint text-teal"}`}>
                      <Icon size={18} strokeWidth={2} />
                    </span>
                    <span className="text-[13px] font-bold">{name}</span>
                  </span>
                  <ChevronRight size={16} className="text-slate/60" />
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
