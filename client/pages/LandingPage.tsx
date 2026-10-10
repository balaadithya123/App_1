import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import BrandLogo, { ensureBrandFonts } from "@/components/BrandLogo";
import {
  Zap,
  Droplets,
  Hammer,
  Paintbrush,
  Snowflake,
  Wrench,
  ShieldCheck,
  MessageCircle,
  ArrowRight,
  RefreshCw,
  ChevronDown,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  BadgeCheck,
} from "lucide-react";

interface SampleTrade {
  key: string;
  initials: string;
  name: string;
  title: string;
  distance: string;
  rating: string;
  jobs: string[];
  wa: string;
  quote: string;
  author: string;
}

const sampleTrades: SampleTrade[] = [
  {
    key: "electrician",
    initials: "KA",
    name: "K. Arumugam",
    title: "Electrician · 8 yrs exp",
    distance: "Nearby",
    rating: "4.9 ★",
    jobs: [
      "Distribution board & MCB repair",
      "Inverter & wiring troubleshooting",
      "Switchboard & ceiling fan installation",
    ],
    wa: "Hello, I found your profile on Builderco. Are you available for electrical work?",
    quote: "Prompt service, diagnosed the faulty MCB quickly and replaced it at fair rates.",
    author: "Sample homeowner review",
  },
  {
    key: "plumber",
    initials: "MS",
    name: "M. Selvam",
    title: "Plumber · 6 yrs exp",
    distance: "Nearby",
    rating: "4.8 ★",
    jobs: [
      "Overhead tank & pressure pump setup",
      "Bathroom fixture & pipe leak fix",
      "Drain unclogging & trap replacement",
    ],
    wa: "Hello, I found your profile on Builderco. Are you available for plumbing work?",
    quote: "Arrived on time and resolved our bathroom pipe leak cleanly.",
    author: "Sample homeowner review",
  },
  {
    key: "carpenter",
    initials: "PR",
    name: "P. Ramakrishnan",
    title: "Carpenter · 10 yrs exp",
    distance: "Nearby",
    rating: "4.9 ★",
    jobs: [
      "Modular cabinet & hinge repairs",
      "Door lock & frame alignment",
      "Custom wardrobe & shelf assembly",
    ],
    wa: "Hello, I found your profile on Builderco. Are you available for carpentry work?",
    quote: "Great craftsmanship on cabinet repair, straightforward pricing.",
    author: "Sample homeowner review",
  },
];

const categoryList = [
  {
    service: "Electrician",
    subTamil: "மின் பணியாளர்",
    desc: "Short circuits, DB boxes, fan & inverter wiring",
    icon: Zap,
  },
  {
    service: "Plumber",
    subTamil: "குழாய் பணியாளர்",
    desc: "Pipe leaks, tank cleaning, taps & drainage",
    icon: Droplets,
  },
  {
    service: "Carpenter",
    subTamil: "தச்சர்",
    desc: "Furniture assembly, door locks & cabinetry",
    icon: Hammer,
  },
  {
    service: "Painter",
    subTamil: "வர்ணம் பூசுபவர்",
    desc: "Wall repaint, damp proofing & exterior coating",
    icon: Paintbrush,
  },
  {
    service: "AC",
    subTamil: "ஏசி மெக்கானிக்",
    desc: "Jet servicing, gas refill & PCB repairs",
    icon: Snowflake,
  },
  {
    service: "Appliance",
    subTamil: "சாதனங்கள்",
    desc: "Washing machine, chimney & filter fixes",
    icon: Wrench,
  },
];

const howItWorksSteps = [
  {
    number: "01",
    title: "Search nearby tradespeople",
    description: "Browse verified local electricians, plumbers, and technicians operating directly in your area.",
  },
  {
    number: "02",
    title: "Review verified credentials",
    description: "Inspect government ID badges, phone screening status, and authentic portfolio project photos.",
  },
  {
    number: "03",
    title: "Connect directly via WhatsApp",
    description: "Tap to chat or call instantly. Zero middleman fees, zero call center delays, and pay the worker directly.",
  },
];

const trustPillars = [
  {
    title: "ID & Phone Screening",
    description: "Tradespeople undergo government ID screening and telephone verification before receiving verified badges.",
    icon: ShieldCheck,
  },
  {
    title: "Zero Commission Model",
    description: "Workers keep 100% of their earnings. You pay the tradesperson directly with no hidden booking surcharges.",
    icon: BadgeCheck,
  },
  {
    title: "Direct Communication",
    description: "Instant 1-tap WhatsApp chat and phone calling. No middleman dispatch queue or automated chatbots.",
    icon: MessageCircle,
  },
];

const faqItems = [
  {
    q: "Is Builderco free for homeowners?",
    a: "Yes. Searching for local tradespeople, inspecting verified badges, and contacting workers directly via WhatsApp or call is 100% free with zero platform fees.",
  },
  {
    q: "How are trade professionals verified?",
    a: "Technicians undergo telephone number verification, government ID screening, and review of recent work photos before receiving verified badges.",
  },
  {
    q: "Does Builderco process payments or charge commissions?",
    a: "No. Builderco is a directory-only platform. Homeowners pay the worker directly for agreed tasks, and workers keep 100% of their earnings with zero commission.",
  },
  {
    q: "How can tradespeople or agencies list their services?",
    a: "Tradespeople can join independently via the registration portal, while contracting firms can register their team under the Agency Hub.",
  },
];

export default function LandingPage() {
  // Light-only theme locking
  useEffect(() => {
    ensureBrandFonts();
    const root = document.documentElement;
    if (root.classList.contains("dark")) {
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
    }
    const prev = root.style.scrollBehavior;
    root.style.scrollBehavior = "smooth";
    return () => {
      root.style.scrollBehavior = prev;
      if (localStorage.getItem("localworker_theme") === "dark") {
        root.classList.add("dark");
        root.setAttribute("data-theme", "dark");
      }
    };
  }, []);

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const trade = sampleTrades[index];

  const go = (n: number) => {
    setFlipped(false);
    setIndex((n + sampleTrades.length) % sampleTrades.length);
  };

  return (
    <div
      className="bc-root min-h-screen bg-[#FAF8F5] text-[#141518] relative overflow-x-hidden"
      style={{ colorScheme: "light" }}
    >
      <style>{`
        .bc-root { font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; -webkit-font-smoothing: antialiased; }
        .bc-display { font-family: 'Space Grotesk', 'Plus Jakarta Sans', system-ui, sans-serif; }
        @keyframes bc-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .bc-marquee { animation: bc-marquee 28s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .bc-marquee { animation: none; } .bc-flip { transition-duration: .01ms !important; } }
      `}</style>

      {/* 1. FIXED FLOATING NAV PILL */}
      <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4 pointer-events-none">
        <nav className="pointer-events-auto flex items-center justify-between gap-4 sm:gap-6 rounded-full border border-[#E8E2D9] bg-[#FAF8F5]/80 backdrop-blur-xl px-4 sm:px-6 py-2.5 shadow-lg max-w-4xl w-full">
          <Link to="/" aria-label="Builderco Home">
            <BrandLogo className="h-7 w-auto" />
          </Link>

          <div className="hidden md:flex items-center gap-6 text-xs font-semibold text-[#5A5D64]">
            <a href="#how-it-works" className="hover:text-[#141518] transition">
              How It Works
            </a>
            <a href="#categories" className="hover:text-[#141518] transition">
              Categories
            </a>
            <a href="#civic-trust" className="hover:text-[#141518] transition">
              Trust
            </a>
            <a href="#for-workers" className="hover:text-[#141518] transition">
              For Tradespeople
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              state={{ from: "landing" }}
              className="hidden sm:inline-block text-xs font-semibold text-[#5A5D64] hover:text-[#141518] transition px-2 py-1"
            >
              Sign in
            </Link>
            <Link
              to="/home"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#141518] text-white px-4 py-1.5 text-xs font-bold hover:bg-[#2A2B30] transition shadow-xs"
            >
              <span>Open App</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </nav>
      </div>

      {/* 2. HERO SECTION */}
      <section className="pt-28 pb-16 md:pt-36 md:pb-24 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          {/* Hero Left Column */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F4EFEA] border border-[#E8E2D9] text-xs font-bold text-[#141518]">
              <span className="h-2 w-2 rounded-full bg-[#DE542C] animate-pulse" />
              <span>Direct Local Directory · Zero Commission</span>
            </div>

            <h1 className="bc-display text-4xl sm:text-6xl font-bold tracking-tight text-[#141518] leading-[1.08]">
              Reliable hands. <br />
              <span className="italic text-[#DE542C]">Direct</span> connection.
            </h1>

            <p className="text-base sm:text-lg text-[#5A5D64] font-normal leading-relaxed max-w-xl">
              Find verified electricians, plumbers, carpenters, and local specialists near you.
              Connect directly on WhatsApp with zero middleman markups and pay the worker directly.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3.5">
              <Link
                to="/home"
                className="bc-display inline-flex items-center gap-2 rounded-2xl bg-[#141518] hover:bg-[#2A2B30] text-white font-bold px-7 py-3.5 text-sm sm:text-base shadow-md transition cursor-pointer"
              >
                <span>Launch Directory</span>
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/join"
                className="bc-display inline-flex items-center gap-2 rounded-2xl border border-[#E8E2D9] bg-white hover:bg-[#F4EFEA] text-[#141518] font-bold px-6 py-3.5 text-sm sm:text-base shadow-2xs transition cursor-pointer"
              >
                <span>Join as a Tradesperson</span>
              </Link>
            </div>

            <div className="pt-4 flex flex-wrap items-center gap-6 text-xs font-bold text-[#5A5D64] border-t border-[#E8E2D9]/80">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-[#DE542C]" />
                <span>ID Verified</span>
              </span>
              <span className="flex items-center gap-1.5">
                <BadgeCheck size={16} className="text-[#DE542C]" />
                <span>Zero Commission</span>
              </span>
              <span className="flex items-center gap-1.5">
                <MessageCircle size={16} className="text-[#128C7E]" />
                <span>Direct WhatsApp</span>
              </span>
            </div>
          </div>

          {/* Hero Right Column: Flip Card Stack */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md">
              {/* Decorative Background Cards Stack */}
              <div
                aria-hidden="true"
                className="absolute inset-0 rounded-[28px] border border-[#E8E2D9] bg-[#F4EFEA] -rotate-2 scale-[0.97] pointer-events-none -z-10"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 rounded-[28px] border border-[#E8E2D9] bg-[#E8E2D9]/60 rotate-1 scale-[0.98] pointer-events-none -z-20"
              />

              {/* Interactive 3D Flip Card */}
              <div
                style={{ perspective: 1200 }}
                onTouchStart={(e) => {
                  touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                }}
                onTouchEnd={(e) => {
                  const s = touch.current;
                  touch.current = null;
                  if (!s) return;
                  const dx = e.changedTouches[0].clientX - s.x;
                  const dy = e.changedTouches[0].clientY - s.y;
                  if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) {
                    go(dx < 0 ? index + 1 : index - 1);
                  }
                }}
              >
                <div
                  className="bc-flip relative w-full rounded-[28px] border border-[#E8E2D9] bg-white p-6 shadow-xl"
                  style={{
                    transformStyle: "preserve-3d",
                    transition: "transform 0.65s cubic-bezier(0.34,1.56,0.64,1)",
                    transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
                    minHeight: "360px",
                  }}
                >
                  {/* FRONT FACE */}
                  <div
                    style={{
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                    }}
                    aria-hidden={flipped}
                    className="flex flex-col justify-between h-full space-y-5"
                  >
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D9]">
                        <span className="text-[11px] font-bold text-[#5A5D64] uppercase tracking-wider bg-[#F4EFEA] px-2.5 py-0.5 rounded-full">
                          Sample profile · illustrative
                        </span>
                        <span className="text-xs font-bold text-[#DE542C] bg-[#DE542C]/10 px-2 py-0.5 rounded-full">
                          {trade.distance}
                        </span>
                      </div>

                      <div className="mt-4 flex items-center gap-3.5">
                        <div className="h-12 w-12 rounded-full bg-[#141518] text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                          {trade.initials}
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-base font-bold text-[#141518] truncate">
                            {trade.name}
                          </h2>
                          <p className="text-xs text-[#5A5D64] font-medium mt-0.5">
                            {trade.title}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-semibold text-[#141518]">Specialties & Recent Work:</p>
                        <ul className="space-y-1.5 text-xs text-[#5A5D64]">
                          {trade.jobs.map((j, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <CheckCircle2 size={14} className="text-[#DE542C] shrink-0" />
                              <span className="truncate">{j}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#E8E2D9] flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setFlipped(true)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#141518] hover:text-[#DE542C] transition cursor-pointer"
                      >
                        <RefreshCw size={13} />
                        <span>View verification</span>
                      </button>

                      <a
                        target="_blank"
                        rel="noopener noreferrer"
                        href={`https://wa.me/?text=${encodeURIComponent(trade.wa)}`}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#128C7E] hover:bg-[#075E54] text-white px-4 py-2 text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        <MessageCircle size={14} />
                        <span>Direct WhatsApp</span>
                      </a>
                    </div>
                  </div>

                  {/* BACK FACE */}
                  <div
                    className="absolute inset-0 p-6 flex flex-col justify-between"
                    style={{
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                    }}
                    aria-hidden={!flipped}
                  >
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D9]">
                        <span className="text-[11px] font-bold text-[#141518] uppercase tracking-wider">
                          Verification & Reviews
                        </span>
                        <span className="text-xs font-bold text-[#141518]">
                          {trade.rating}
                        </span>
                      </div>

                      <div className="mt-4 space-y-2.5">
                        <div className="p-3 rounded-xl bg-[#F4EFEA] border border-[#E8E2D9] space-y-1.5 text-xs">
                          <p className="font-bold text-[#141518] flex items-center gap-1.5">
                            <ShieldCheck size={14} className="text-[#DE542C]" />
                            <span>Verification Status:</span>
                          </p>
                          <ul className="space-y-1 text-[#5A5D64] font-medium pl-5 list-disc">
                            <li>Government ID checked</li>
                            <li>Phone number verified</li>
                            <li>Work photos screened</li>
                          </ul>
                        </div>

                        <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E8E2D9] text-xs space-y-1">
                          <p className="italic text-[#141518]">"{trade.quote}"</p>
                          <p className="text-[11px] font-bold text-[#5A5D64] text-right">
                            — {trade.author}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#E8E2D9] flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setFlipped(false)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#141518] hover:text-[#DE542C] transition cursor-pointer"
                      >
                        <RefreshCw size={13} />
                        <span>View summary</span>
                      </button>

                      <a
                        target="_blank"
                        rel="noopener noreferrer"
                        href={`https://wa.me/?text=${encodeURIComponent(trade.wa)}`}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#128C7E] hover:bg-[#075E54] text-white px-4 py-2 text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        <MessageCircle size={14} />
                        <span>Direct WhatsApp</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls below card */}
              <div className="mt-4 flex flex-col items-center gap-3">
                <div className="flex items-center justify-between w-full text-xs font-bold text-[#5A5D64] px-1">
                  <span className="bg-[#F4EFEA] px-3 py-1 rounded-full border border-[#E8E2D9]">
                    {index + 1} of {sampleTrades.length}: {sampleTrades[index].key.toUpperCase()}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFlipped((f) => !f)}
                      aria-label="Flip card"
                      className="p-2 rounded-full border border-[#E8E2D9] bg-white hover:bg-[#F4EFEA] text-[#141518] transition cursor-pointer"
                    >
                      <RefreshCw size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => go(index - 1)}
                      aria-label="Previous profile"
                      className="p-2 rounded-full border border-[#E8E2D9] bg-white hover:bg-[#F4EFEA] text-[#141518] transition cursor-pointer"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => go(index + 1)}
                      aria-label="Next profile"
                      className="p-2 rounded-full border border-[#E8E2D9] bg-white hover:bg-[#F4EFEA] text-[#141518] transition cursor-pointer"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {sampleTrades.map((st, i) => (
                    <button
                      key={st.key}
                      type="button"
                      onClick={() => go(i)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer capitalize ${
                        i === index
                          ? "bg-[#141518] text-white"
                          : "bg-[#F4EFEA] text-[#5A5D64] hover:text-[#141518] border border-[#E8E2D9]"
                      }`}
                    >
                      {st.key}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. MARQUEE TICKER STRIP */}
      <section className="bg-[#141518] text-white py-4 overflow-hidden" aria-hidden="true">
        <div className="flex w-max bc-marquee whitespace-nowrap text-xs font-bold uppercase tracking-wider text-[#E8E2D9]">
          <div className="flex items-center gap-8 px-4">
            <span>Electrician</span> · <span>Plumber</span> · <span>Carpenter</span> · <span>Painter</span> · <span>AC Service</span> · <span>Appliance Repair</span> · <span className="text-[#DE542C]">0% Broker Commission</span> · <span>Direct WhatsApp Contact</span> · <span>Government ID Verified Trades</span> · <span>Direct Local Connection</span> ·
          </div>
          <div className="flex items-center gap-8 px-4">
            <span>Electrician</span> · <span>Plumber</span> · <span>Carpenter</span> · <span>Painter</span> · <span>AC Service</span> · <span>Appliance Repair</span> · <span className="text-[#DE542C]">0% Broker Commission</span> · <span>Direct WhatsApp Contact</span> · <span>Government ID Verified Trades</span> · <span>Direct Local Connection</span> ·
          </div>
        </div>
      </section>

      {/* 4. CATEGORIES BENTO GRID */}
      <section id="categories" className="py-20 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-[#DE542C] bg-[#DE542C]/10 px-3 py-1 rounded-full">
            Specialized Trades
          </span>
          <h2 className="bc-display text-3xl sm:text-4xl font-bold text-[#141518]">
            Browse by trade category
          </h2>
          <p className="text-sm text-[#5A5D64] font-medium">
            Find experienced, local technicians for every job with direct WhatsApp contact.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {categoryList.map((cat) => {
            const Icon = cat.icon;
            const searchUrl = `/search?service=${encodeURIComponent(cat.service)}&q=${encodeURIComponent(cat.service)}`;

            return (
              <Link
                key={cat.service}
                to={searchUrl}
                className="group bg-white hover:bg-[#F4EFEA]/80 border border-[#E8E2D9] rounded-2xl p-6 transition-all shadow-2xs hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-11 w-11 rounded-xl bg-[#F4EFEA] text-[#141518] flex items-center justify-center group-hover:bg-[#141518] group-hover:text-white transition-colors">
                      <Icon size={20} />
                    </div>
                    <ArrowRight size={16} className="text-[#5A5D64] group-hover:text-[#DE542C] group-hover:translate-x-1 transition-all" />
                  </div>

                  <h3 className="bc-display text-lg font-bold text-[#141518] group-hover:text-[#DE542C] transition-colors">
                    {cat.service}
                  </h3>
                  <p className="text-xs font-semibold text-[#5A5D64] mt-0.5">
                    {cat.subTamil}
                  </p>
                  <p className="text-xs text-[#5A5D64] font-normal mt-2 leading-relaxed">
                    {cat.desc}
                  </p>
                </div>

                <div className="mt-6 pt-3 border-t border-[#E8E2D9] text-[11px] font-bold text-[#141518] flex items-center justify-between">
                  <span>Explore nearby pros</span>
                  <span className="text-[#DE542C]">Direct contact →</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 5. HOW IT WORKS */}
      <section id="how-it-works" className="py-20 bg-[#F4EFEA] border-y border-[#E8E2D9]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-[#141518] bg-white px-3 py-1 rounded-full border border-[#E8E2D9]">
              Simple Process
            </span>
            <h2 className="bc-display text-3xl sm:text-4xl font-bold text-[#141518]">
              How Builderco works
            </h2>
            <p className="text-sm text-[#5A5D64] font-medium">
              A transparent local directory designed for direct worker-to-client connection.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {howItWorksSteps.map((step) => (
              <div
                key={step.number}
                className="bg-white rounded-2xl p-7 border border-[#E8E2D9] shadow-2xs space-y-4 flex flex-col justify-between"
              >
                <div>
                  <span className="bc-display text-3xl font-extrabold text-[#DE542C]">
                    {step.number}
                  </span>
                  <h3 className="bc-display text-lg font-bold text-[#141518] mt-2">
                    {step.title}
                  </h3>
                  <p className="text-xs text-[#5A5D64] font-normal leading-relaxed mt-2">
                    {step.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#E8E2D9] flex items-center gap-1.5 text-xs font-bold text-[#141518]">
                  <CheckCircle2 size={14} className="text-[#DE542C]" />
                  <span>Direct & transparent</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. TRUST PILLARS */}
      <section id="civic-trust" className="py-20 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-[#DE542C] bg-[#DE542C]/10 px-3 py-1 rounded-full">
            Verification
          </span>
          <h2 className="bc-display text-3xl sm:text-4xl font-bold text-[#141518]">
            Built on direct trust
          </h2>
          <p className="text-sm text-[#5A5D64] font-medium">
            Ensuring reliable credentials and 100% direct wage transparency for tradespeople.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {trustPillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.title}
                className="bg-white rounded-2xl p-7 border border-[#E8E2D9] shadow-2xs space-y-3"
              >
                <div className="h-10 w-10 rounded-xl bg-[#F4EFEA] text-[#DE542C] flex items-center justify-center">
                  <Icon size={22} />
                </div>
                <h3 className="bc-display text-base font-bold text-[#141518]">
                  {pillar.title}
                </h3>
                <p className="text-xs text-[#5A5D64] leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. FOR TRADESPEOPLE */}
      <section id="for-workers" className="py-12 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="rounded-3xl bg-[#141518] text-white p-8 sm:p-12 shadow-xl flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl text-center lg:text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-[#DE542C] bg-[#DE542C]/20 px-3 py-1 rounded-full">
              For Tradespeople & Contractors
            </span>
            <h2 className="bc-display text-2xl sm:text-4xl font-bold">
              Are you an electrician, plumber, or contractor?
            </h2>
            <p className="text-xs sm:text-sm text-[#E8E2D9] leading-relaxed font-normal">
              List your services on Builderco to get direct WhatsApp callbacks from homeowners in your area.
              Keep 100% of what you charge with zero commission cuts.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0">
            <Link
              to="/join"
              className="bc-display inline-flex items-center gap-2 rounded-2xl bg-[#DE542C] hover:bg-[#c44520] text-white font-bold px-6 py-3.5 text-sm shadow-md transition cursor-pointer"
            >
              <span>Join as Tradesperson</span>
              <ArrowRight size={16} />
            </Link>

            <Link
              to="/register-agency"
              className="text-xs font-bold text-[#E8E2D9] hover:text-white underline py-2 transition"
            >
              Register Service Agency →
            </Link>
          </div>
        </div>
      </section>

      {/* 8. FAQ ACCORDION */}
      <section id="faq" className="py-20 max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-xl mx-auto space-y-3 mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-[#5A5D64] bg-[#F4EFEA] px-3 py-1 rounded-full border border-[#E8E2D9]">
            Questions & Answers
          </span>
          <h2 className="bc-display text-3xl font-bold text-[#141518]">
            Frequently asked questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqItems.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-[#E8E2D9] bg-white overflow-hidden transition-all shadow-2xs"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between p-5 text-left text-sm font-bold text-[#141518] hover:bg-[#FAF8F5] transition cursor-pointer"
                >
                  <span className="pr-4">{item.q}</span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-[#5A5D64] transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-[#141518]" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 text-xs text-[#5A5D64] leading-relaxed border-t border-[#E8E2D9] pt-3 font-normal">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 9. FOOTER */}
      <footer className="border-t border-[#E8E2D9] bg-white py-12 text-[#5A5D64]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <Link to="/" aria-label="Builderco Home">
              <BrandLogo className="h-6 w-auto mx-auto sm:mx-0" />
            </Link>
            <p className="text-xs text-[#5A5D64]">
              Direct local trades directory. Zero commission.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-bold text-[#5A5D64]">
            <Link to="/home" className="hover:text-[#141518] transition">
              Directory
            </Link>
            <Link to="/search" className="hover:text-[#141518] transition">
              Search Trades
            </Link>
            <Link to="/join" className="hover:text-[#141518] transition">
              Join as Tradesperson
            </Link>
            <Link to="/register-agency" className="hover:text-[#141518] transition">
              Agency Hub
            </Link>
            <Link to="/login" state={{ from: "landing" }} className="hover:text-[#141518] transition">
              Sign In
            </Link>
          </div>

          <p className="text-xs text-[#5A5D64] font-medium text-center sm:text-right">
            © {new Date().getFullYear()} Builderco. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
