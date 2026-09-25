import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  motion,
  AnimatePresence,
} from "framer-motion";
import {
  Check,
  Zap,
  ArrowRight,
  ShieldCheck,
  PhoneCall,
  Clock,
  Star,
  BadgeCheck,
  MessageCircle,
  ChevronRight,
  Search,
  CheckCircle2,
  ChevronDown,
  MapPin,
  Sparkles,
} from "lucide-react";
import ScreenshotShowcase from "@/components/ScreenshotShowcase";

export default function LandingPage() {
  // Isolate light theme for LandingPage so dark-theme bleed never makes texts invisible
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    if (hadDark) {
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
    }

    return () => {
      const savedTheme = localStorage.getItem("localworker_theme");
      if (savedTheme === "dark") {
        root.classList.add("dark");
        root.setAttribute("data-theme", "dark");
      }
    };
  }, []);

  // Pricing Cycle Toggle
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  // Dynamic Selected Plan (Elevated on Click)
  const [selectedPlan, setSelectedPlan] = useState<"homeowner" | "pro" | "agency">("pro");

  // Active How-It-Works Step
  const [activeStep, setActiveStep] = useState<number>(1);

  // Active FAQ Item
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const popularTrades = [
    { name: "Electrician", query: "electrician" },
    { name: "Plumber", query: "plumber" },
    { name: "Carpenter", query: "carpenter" },
    { name: "AC Repair", query: "ac" },
    { name: "Painter", query: "painter" },
    { name: "Cleaning", query: "cleaner" },
  ];

  const howItWorksSteps = [
    {
      step: 1,
      title: "1. Search Nearby Pros",
      subtitle: "Enter your neighborhood locality or service trade",
      description:
        "Select Electrician, Plumber, Carpenter, or Technician. Instant proximity matching highlights verified pros operating right in your immediate neighborhood.",
      icon: Search,
      highlight: "Proximity-First Ranking",
    },
    {
      step: 2,
      title: "2. Check Verified Profiles",
      subtitle: "Inspect Aadhaar Govt ID badges & past work photo portfolios",
      description:
        "Every pro's background verification status, homeowner ratings, completed job track record, and verified skill badges are open and transparent.",
      icon: BadgeCheck,
      highlight: "100% ID Verified",
    },
    {
      step: 3,
      title: "3. Direct WhatsApp / Call",
      subtitle: "Instant click-to-chat with zero intermediary wait time",
      description:
        "Talk directly to the professional on WhatsApp or call them instantly on their phone. No platform agents, no queue delay, no middleman booking markup.",
      icon: MessageCircle,
      highlight: "Zero Commission Cut",
    },
    {
      step: 4,
      title: "4. Direct Payment & Satisfaction",
      subtitle: "Pay the worker directly upon job completion",
      description:
        "The worker retains 100% of their hard-earned wage. Build your personal circle of trusted neighborhood specialists for seamless future repairs.",
      icon: CheckCircle2,
      highlight: "100% Fair Pay to Pros",
    },
  ];

  const faqs = [
    {
      q: "Is LocalWorker free to use for homeowners?",
      a: "Yes! Searching for local pros, viewing verified credentials, inspecting work photo portfolios, and connecting via direct call or WhatsApp is 100% free with zero platform surcharges.",
    },
    {
      q: "How are workers and service contractors verified?",
      a: "Every professional undergoes telephone screening, Aadhaar/Government ID verification, and portfolio work screening before appearing with the verified pro seal in neighborhood search results.",
    },
    {
      q: "Does LocalWorker take a commission cut from workers?",
      a: "No! Unlike traditional platforms that extract 20–30% from a worker's hard-earned income, LocalWorker operates on an open direct-connection model. Pros keep 100% of their agreed rate.",
    },
    {
      q: "Can trade contractors or agencies register multi-worker teams?",
      a: "Yes! Service agencies and trade contracting firms can register under the Agency Hub to manage technician rosters and receive direct neighborhood lead callbacks.",
    },
    {
      q: "How do I request an immediate callback if a worker is busy?",
      a: "Each worker profile features a direct 'Request Callback' feature. Homeowners can submit their phone number and task description for a prompt callback as soon as the pro is available.",
    },
  ];

  const plans = [
    {
      id: "homeowner" as const,
      category: "Homeowners",
      title: "Community Free",
      description: "For households finding reliable neighborhood pros.",
      price: "$0",
      period: "forever",
      cta: "Browse Marketplace",
      href: "/home",
      badge: "Free Forever",
      features: [
        "Unlimited nearby pro searches",
        "Direct WhatsApp and phone dial",
        "Inspect ID check verification badges",
        "0% hidden booking surcharges",
        "Save favorite pros & view history",
      ],
    },
    {
      id: "pro" as const,
      category: "Service Professionals",
      title: "Verified Pro Plan",
      description: "For independent electricians, plumbers & technicians.",
      price: billingCycle === "annual" ? "$4" : "$5",
      period: "/month",
      cta: "Join as Pro",
      href: "/join",
      badge: "Most Popular",
      features: [
        "Direct phone & WhatsApp listing",
        "Official Aadhaar ID Verified Badge",
        "High-resolution work portfolio gallery",
        "Priority neighborhood proximity rank",
        "0% commission on your earnings",
      ],
    },
    {
      id: "agency" as const,
      category: "Contractors & Teams",
      title: "Agency Hub",
      description: "For trade contractors and multi-worker firms.",
      price: billingCycle === "annual" ? "$12" : "$15",
      period: "/month",
      cta: "Register Agency",
      href: "/register-agency",
      badge: "For Teams",
      features: [
        "Multi-technician roster management",
        "Central agency profile & credentials",
        "Shared dispatch and lead queue",
        "Team job performance analytics",
        "Priority agency partner placement",
      ],
    },
  ];

  return (
    <div
      className="min-h-screen bg-[#FAFAFA] text-[#09090B] font-sans selection:bg-neutral-200 relative overflow-x-hidden"
      style={
        {
          colorScheme: "light",
          backgroundColor: "#FAFAFA",
          color: "#09090B",
          "--color-neutral-900": "#09090B",
          "--color-neutral-500": "#52525B",
          "--color-neutral-300": "#A1A1AA",
          "--color-background": "#FAFAFA",
          "--color-surface": "#FFFFFF",
          "--color-border": "#E4E4E7",
          "--border": "240 6% 90%",
          "--foreground": "240 10% 4%",
          "--card": "0 0% 100%",
          "--card-foreground": "240 10% 4%",
        } as React.CSSProperties
      }
    >
      {/* TOP HEADER / NAVBAR */}
      <header className="sticky top-0 z-40 w-full border-b border-[#E4E4E7] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 sm:h-20 max-w-6xl items-center justify-between px-4 sm:px-6">
          {/* Brand Logo Matching Main Site */}
          <Link to="/" className="flex items-center gap-2.5 group cursor-pointer">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-black text-white font-extrabold text-sm shadow-sm transition-transform group-hover:scale-105">
              L
            </span>
            <span className="text-base sm:text-lg font-bold tracking-tight text-[#09090B]">
              LocalWorker
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-[#52525B]">
            <a href="#features" className="hover:text-[#09090B] transition">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-[#09090B] transition">
              How It Works
            </a>
            <a href="#screenshots" className="hover:text-[#09090B] transition">
              Screenshots
            </a>
            <a href="#pricing" className="hover:text-[#09090B] transition">
              Pricing
            </a>
            <a href="#faq" className="hover:text-[#09090B] transition">
              FAQ
            </a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              state={{ from: "landing" }}
              className="text-xs sm:text-sm font-semibold text-[#52525B] hover:text-[#09090B] transition px-3 py-1.5"
            >
              Sign in
            </Link>
            <Link
              to="/home"
              className="inline-flex items-center justify-center rounded-full bg-[#09090B] hover:bg-neutral-800 text-white px-4 sm:px-5 py-2 text-xs sm:text-sm font-bold shadow-sm transition active:scale-95 cursor-pointer"
            >
              <span>Explore Marketplace</span>
              <ChevronRight size={14} className="ml-1" />
            </Link>
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 1. HERO SECTION                                                */}
      {/* ============================================================== */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 max-w-6xl mx-auto px-4 sm:px-6">
        {/* Editorial Pill Kicker */}
        <div className="flex justify-center mb-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E4E4E7] bg-white px-4 py-1.5 text-xs font-bold text-[#09090B] shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Direct Local Marketplace</span>
            <span className="text-zinc-300">·</span>
            <span className="text-[#52525B]">0% Middleman Fees</span>
          </div>
        </div>

        {/* Hero Title & Subtitle */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-[#09090B] leading-[1.08]">
            Find, connect, and hire <br />
            <span className="text-[#71717A] font-bold">verified local pros.</span>
          </h1>

          <p className="text-base sm:text-lg text-[#52525B] max-w-2xl mx-auto font-normal pt-2 leading-relaxed">
            The community directory connecting homeowners directly with verified electricians, plumbers, carpenters, and technicians. Connect on WhatsApp or direct phone call. Zero commission markup.
          </p>

          {/* Action CTAs */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-3.5">
            <Link
              to="/home"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#09090B] hover:bg-neutral-800 text-white font-bold px-7 py-3.5 text-sm sm:text-base shadow-sm transition cursor-pointer active:scale-95"
            >
              <span>Explore Marketplace</span>
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/join"
              className="inline-flex items-center gap-2 rounded-2xl border border-[#E4E4E7] bg-white hover:bg-zinc-100 text-[#09090B] font-bold px-6 py-3.5 text-sm sm:text-base shadow-xs transition cursor-pointer active:scale-95"
            >
              <span>Join as a Worker</span>
            </Link>
          </div>

          {/* Popular Trade Quick-Links */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-[#52525B]">
            <span className="text-[#71717A]">Popular trades:</span>
            {popularTrades.map((t) => (
              <Link
                key={t.query}
                to={`/home?q=${t.query}`}
                className="px-3.5 py-1.5 rounded-full border border-[#E4E4E7] bg-white text-[#09090B] hover:border-zinc-400 hover:text-black transition shadow-2xs font-semibold"
              >
                {t.name}
              </Link>
            ))}
          </div>
        </div>

        {/* HERO SHOWCASE: Realistic Verified Pro Showcase Card */}
        <div className="mt-12 max-w-2xl mx-auto">
          <div className="rounded-[28px] border border-[#E4E4E7] bg-white p-6 sm:p-8 shadow-lg relative">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-zinc-100">
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <div className="h-14 w-14 rounded-2xl bg-[#09090B] text-white flex items-center justify-center font-bold text-xl shadow-xs">
                    RS
                  </div>
                  <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 border-2 border-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-[#09090B]">Ramesh Sharma</h3>
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                      <ShieldCheck size={12} />
                      <span>Govt ID Verified</span>
                    </span>
                  </div>
                  <p className="text-xs text-[#52525B] font-medium mt-0.5">
                    Licensed Master Electrician · 8 Years Experience
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-bold text-[#09090B] bg-zinc-50 px-3.5 py-1.5 rounded-full border border-[#E4E4E7]">
                <Star size={13} className="text-amber-500 fill-amber-500" />
                <span>4.9</span>
                <span className="text-[#71717A] font-normal">(142 reviews)</span>
              </div>
            </div>

            {/* Pro Details Grid */}
            <div className="py-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="flex items-center gap-2 text-[#52525B] font-medium">
                <MapPin size={15} className="text-[#71717A] shrink-0" />
                <span>Indiranagar · 1.4 km</span>
              </div>
              <div className="flex items-center gap-2 text-[#52525B] font-medium">
                <Clock size={15} className="text-[#71717A] shrink-0" />
                <span>Arrives in ~20 mins</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-700 font-bold">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <span>Available Today</span>
              </div>
            </div>

            {/* Pro Action Buttons */}
            <div className="pt-4 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Link
                  to="/home"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#09090B] hover:bg-neutral-800 text-white px-4 py-2 text-xs font-bold transition shadow-xs"
                >
                  <PhoneCall size={13} />
                  <span>Direct Call</span>
                </Link>
                <Link
                  to="/home"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#128C7E] hover:bg-[#075E54] text-white px-4 py-2 text-xs font-bold transition shadow-xs"
                >
                  <MessageCircle size={13} />
                  <span>WhatsApp</span>
                </Link>
              </div>

              <span className="text-[11px] font-semibold text-[#52525B]">
                0% Middleman cut · Direct Fair Pay
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 2. LIVE METRICS & IMPACT COUNTERS                              */}
      {/* ============================================================== */}
      <section className="py-10 bg-white border-y border-[#E4E4E7]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-4 rounded-2xl bg-zinc-50/70 border border-[#E4E4E7]">
              <p className="text-3xl sm:text-4xl font-extrabold text-[#09090B] tracking-tight">
                5,000+
              </p>
              <p className="text-xs font-bold text-[#52525B] mt-1.5">
                Verified Local Pros
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-50/70 border border-[#E4E4E7]">
              <p className="text-3xl sm:text-4xl font-extrabold text-emerald-700 tracking-tight">
                0%
              </p>
              <p className="text-xs font-bold text-[#52525B] mt-1.5">
                Middleman Fees
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-50/70 border border-[#E4E4E7]">
              <p className="text-3xl sm:text-4xl font-extrabold text-[#09090B] tracking-tight">
                &lt; 15 Mins
              </p>
              <p className="text-xs font-bold text-[#52525B] mt-1.5">
                Avg Dispatch Time
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-50/70 border border-[#E4E4E7]">
              <p className="text-3xl sm:text-4xl font-extrabold text-amber-600 tracking-tight">
                4.9 ★
              </p>
              <p className="text-xs font-bold text-[#52525B] mt-1.5">
                Homeowner Rating
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 3. CORE FEATURES SECTION                                       */}
      {/* ============================================================== */}
      <section id="features" className="py-16 md:py-24 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto space-y-2 mb-14">
          <span className="text-xs font-bold uppercase tracking-wider text-[#71717A]">
            Why LocalWorker
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#09090B]">
            Built for trust and transparency
          </h2>
          <p className="text-sm sm:text-base text-[#52525B] font-medium">
            Engineered to make home repairs stress-free, fast, and 100% direct.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="rounded-[28px] bg-white border border-[#E4E4E7] p-7 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-100 mb-5">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-lg font-extrabold text-[#09090B]">100% Verified Identity</h3>
              <p className="mt-2 text-xs sm:text-sm text-[#52525B] leading-relaxed font-medium">
                Every service professional is telephone screened and Aadhaar / Government ID verified before receiving the verified pro badge.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center gap-1.5 text-xs font-bold text-emerald-800">
              <Check size={14} />
              <span>Government ID Checked</span>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="rounded-[28px] bg-white border border-[#E4E4E7] p-7 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-[#09090B] border border-zinc-200 mb-5">
                <PhoneCall size={24} />
              </div>
              <h3 className="text-lg font-extrabold text-[#09090B]">Zero Broker Commissions</h3>
              <p className="mt-2 text-xs sm:text-sm text-[#52525B] leading-relaxed font-medium">
                Talk directly to the tradesperson and pay them directly upon job completion. No platform markups, booking surcharges, or hidden deductions.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center gap-1.5 text-xs font-bold text-[#09090B]">
              <Check size={14} />
              <span>Direct Phone & WhatsApp</span>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="rounded-[28px] bg-white border border-[#E4E4E7] p-7 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-800 border border-amber-100 mb-5">
                <Zap size={24} />
              </div>
              <h3 className="text-lg font-extrabold text-[#09090B]">Hyperlocal Proximity Matching</h3>
              <p className="mt-2 text-xs sm:text-sm text-[#52525B] leading-relaxed font-medium">
                Connect with technicians operating right in your sector or locality for ultra-fast arrival times and dependable doorstep service.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center gap-1.5 text-xs font-bold text-amber-800">
              <Check size={14} />
              <span>Real-Time Distance Match</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 4. INTERACTIVE HOW IT WORKS STEPPER                            */}
      {/* ============================================================== */}
      <section id="how-it-works" className="py-16 md:py-24 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto space-y-2 mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-[#71717A]">
            Simple Process
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#09090B]">
            How LocalWorker works
          </h2>
          <p className="text-sm sm:text-base text-[#52525B] font-medium">
            Four simple steps from finding a problem to getting it resolved.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Step Selector Buttons */}
          <div className="lg:col-span-5 space-y-3">
            {howItWorksSteps.map((step) => {
              const isActive = activeStep === step.step;
              const StepIcon = step.icon;

              return (
                <button
                  key={step.step}
                  type="button"
                  onClick={() => setActiveStep(step.step)}
                  className={`w-full text-left p-4 sm:p-5 rounded-2xl border transition-all duration-150 cursor-pointer flex items-start gap-4 ${
                    isActive
                      ? "bg-white border-2 border-[#09090B] shadow-md ring-1 ring-[#09090B]"
                      : "bg-white border-[#E4E4E7] hover:border-zinc-400"
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 font-bold text-sm ${
                      isActive
                        ? "bg-[#09090B] text-white shadow-xs"
                        : "bg-zinc-100 text-[#52525B]"
                    }`}
                  >
                    <StepIcon size={18} />
                  </div>
                  <div>
                    <h3 className={`text-sm sm:text-base font-extrabold ${isActive ? "text-[#09090B]" : "text-[#52525B]"}`}>
                      {step.title}
                    </h3>
                    <p className="text-xs text-[#52525B] mt-0.5 line-clamp-1 font-medium">
                      {step.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Step Active Display Visual */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {howItWorksSteps
                .filter((s) => s.step === activeStep)
                .map((step) => (
                  <motion.div
                    key={step.step}
                    initial={{ opacity: 0, scale: 0.98, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="rounded-[28px] bg-white p-7 sm:p-10 border border-[#E4E4E7] shadow-sm relative"
                  >
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-[#09090B] text-xs font-bold mb-4">
                      <CheckCircle2 size={13} className="text-emerald-600" />
                      <span>{step.highlight}</span>
                    </div>

                    <h3 className="text-2xl sm:text-3xl font-extrabold text-[#09090B]">
                      {step.title}
                    </h3>

                    <p className="text-sm text-[#52525B] mt-3 leading-relaxed font-medium">
                      {step.description}
                    </p>

                    <div className="mt-8 pt-6 border-t border-zinc-100 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                        <CheckCircle2 size={16} />
                        <span>Direct Community Driven</span>
                      </div>

                      <Link
                        to="/home"
                        className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#09090B] hover:underline"
                      >
                        <span>Try Marketplace Now</span>
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </motion.div>
                ))}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 5. APP SCREENSHOTS SHOWCASE (Clean Device Mockup Viewports)    */}
      {/* ============================================================== */}
      <section id="screenshots" className="py-16 md:py-24 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto space-y-2 mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-[#71717A]">
            App Experience
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#09090B]">
            Interactive app screenshots
          </h2>
          <p className="text-sm sm:text-base text-[#52525B] font-medium">
            A preview of the LocalWorker interface across desktop and mobile devices.
          </p>
        </div>

        {/* Clean, dedicated Screenshot Showcase component */}
        <ScreenshotShowcase />
      </section>

      {/* ============================================================== */}
      {/* 6. TRANSPARENT PRICING PLANS (Interactive Plan Elevation)     */}
      {/* ============================================================== */}
      <section id="pricing" className="py-16 md:py-24 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto space-y-2 mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-[#71717A]">
            Pricing
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#09090B]">
            Simple, honest pricing
          </h2>
          <p className="text-sm text-[#52525B] font-medium">
            Click on any plan to select and explore details. 0% commission cuts.
          </p>

          {/* Monthly / Annual Toggle */}
          <div className="pt-3 flex items-center justify-center gap-3">
            <span
              className={`text-xs font-bold ${
                billingCycle === "monthly" ? "text-[#09090B]" : "text-[#71717A]"
              }`}
            >
              Monthly
            </span>
            <button
              type="button"
              onClick={() =>
                setBillingCycle((prev) => (prev === "monthly" ? "annual" : "monthly"))
              }
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-zinc-200 transition cursor-pointer"
              aria-label="Toggle annual billing"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-[#09090B] transition ${
                  billingCycle === "annual" ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span
              className={`text-xs font-bold ${
                billingCycle === "annual" ? "text-[#09090B]" : "text-[#71717A]"
              }`}
            >
              Annual <span className="text-[11px] text-emerald-800 font-extrabold">(Save 20%)</span>
            </span>
          </div>
        </div>

        {/* 3 Interactive Plan Cards with Smooth Elevation Switch */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch pt-4">
          {plans.map((plan) => {
            const isSelected = selectedPlan === plan.id;

            return (
              <motion.div
                key={plan.id}
                layout
                onClick={() => setSelectedPlan(plan.id)}
                whileHover={{ y: isSelected ? -6 : -3 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className={`relative rounded-[28px] p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 cursor-pointer ${
                  isSelected
                    ? "bg-[#09090B] text-white shadow-2xl ring-2 ring-[#09090B] z-10 lg:-translate-y-2"
                    : "bg-white text-[#09090B] border border-[#E4E4E7] shadow-xs hover:border-zinc-400 hover:shadow-md z-0 opacity-95"
                }`}
              >
                {/* Elevation Badge on Selected Card */}
                {isSelected && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[11px] font-extrabold px-3.5 py-1 rounded-full shadow-md uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap">
                    <Sparkles size={12} />
                    <span>{plan.badge} · Selected</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider ${
                        isSelected ? "text-zinc-400" : "text-[#71717A]"
                      }`}
                    >
                      {plan.category}
                    </span>
                    {!isSelected && (
                      <span className="text-[10px] font-bold text-zinc-400 border border-zinc-200 rounded-full px-2 py-0.5">
                        Click to select
                      </span>
                    )}
                  </div>

                  <h3
                    className={`text-xl font-extrabold mt-1.5 ${
                      isSelected ? "text-white" : "text-[#09090B]"
                    }`}
                  >
                    {plan.title}
                  </h3>
                  <p
                    className={`text-xs mt-1 font-medium ${
                      isSelected ? "text-zinc-300" : "text-[#52525B]"
                    }`}
                  >
                    {plan.description}
                  </p>

                  <div className="my-6">
                    <span
                      className={`text-4xl sm:text-5xl font-extrabold tracking-tight ${
                        isSelected ? "text-white" : "text-[#09090B]"
                      }`}
                    >
                      {plan.price}
                    </span>
                    <span
                      className={`text-sm font-semibold ${
                        isSelected ? "text-zinc-400" : "text-[#71717A]"
                      }`}
                    >
                      {" "}
                      {plan.period}
                    </span>
                  </div>

                  <Link
                    to={plan.href}
                    onClick={(e) => {
                      if (!isSelected) {
                        e.preventDefault();
                        setSelectedPlan(plan.id);
                      }
                    }}
                    className={`w-full inline-flex items-center justify-center rounded-xl py-3 text-sm font-extrabold transition shadow-sm cursor-pointer ${
                      isSelected
                        ? "bg-white hover:bg-neutral-100 text-[#09090B] shadow-md"
                        : "bg-zinc-100 hover:bg-zinc-200 text-[#09090B]"
                    }`}
                  >
                    {plan.cta}
                  </Link>

                  <ul className="mt-8 space-y-3 text-xs font-semibold">
                    {plan.features.map((feat, fIdx) => (
                      <li
                        key={fIdx}
                        className={`flex items-center gap-2.5 ${
                          isSelected ? "text-zinc-200" : "text-[#52525B]"
                        }`}
                      >
                        <Check
                          size={15}
                          className={`shrink-0 ${
                            isSelected ? "text-emerald-400" : "text-emerald-700"
                          }`}
                        />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ============================================================== */}
      {/* 7. FREQUENTLY ASKED QUESTIONS                                 */}
      {/* ============================================================== */}
      <section id="faq" className="py-16 md:py-24 max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center space-y-2 mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-[#71717A]">
            FAQ
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#09090B]">
            Frequently asked questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-[#E4E4E7] bg-white overflow-hidden transition-all shadow-2xs"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between p-5 text-left text-sm sm:text-base font-extrabold text-[#09090B] hover:bg-zinc-50 transition cursor-pointer"
                >
                  <span className="pr-4">{faq.q}</span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-[#71717A] transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-[#09090B]" : ""
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="px-5 pb-5 text-xs sm:text-sm text-[#52525B] leading-relaxed border-t border-zinc-100 pt-3 font-medium">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============================================================== */}
      {/* 8. CALL TO ACTION BANNER                                       */}
      {/* ============================================================== */}
      <section className="py-16 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="rounded-[32px] bg-[#09090B] p-8 sm:p-14 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-bold text-zinc-300">
              <CheckCircle2 size={13} className="text-emerald-400" />
              <span>Direct Neighborhood Network</span>
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Ready to find trusted local pros in your neighborhood?
            </h2>
            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed pt-1 font-medium">
              Connect with verified electricians, plumbers, carpenters, and technicians near you with zero broker fees.
            </p>

            <div className="pt-4 flex flex-wrap items-center gap-4">
              <Link
                to="/home"
                className="inline-flex items-center gap-2 rounded-2xl bg-white hover:bg-neutral-100 text-[#09090B] font-bold px-7 py-3.5 text-sm shadow-md transition cursor-pointer active:scale-95"
              >
                <span>Explore Marketplace</span>
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/join"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 hover:bg-white/10 text-white font-bold px-6 py-3.5 text-sm transition cursor-pointer active:scale-95"
              >
                <span>Join as Service Pro</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 9. FOOTER                                                      */}
      {/* ============================================================== */}
      <footer className="border-t border-[#E4E4E7] bg-white py-12 text-[#52525B]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 group cursor-pointer">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-black text-white font-extrabold text-xs shadow-sm transition-transform group-hover:scale-105">
              L
            </span>
            <span className="text-sm font-bold tracking-tight text-[#09090B]">
              LocalWorker
            </span>
          </Link>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-bold text-[#52525B]">
            <Link to="/home" className="hover:text-black transition">
              Marketplace
            </Link>
            <Link to="/search" className="hover:text-black transition">
              Find Pros
            </Link>
            <Link to="/join" className="hover:text-black transition">
              Join as Pro
            </Link>
            <Link to="/register-agency" className="hover:text-black transition">
              Agency Hub
            </Link>
            <Link to="/login" state={{ from: "landing" }} className="hover:text-black transition">
              Sign In
            </Link>
          </div>

          <p className="text-xs text-[#71717A] font-medium">
            © {new Date().getFullYear()} LocalWorker. Zero middleman fees.
          </p>
        </div>
      </footer>
    </div>
  );
}
