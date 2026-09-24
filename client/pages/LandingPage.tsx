import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  motion,
  useScroll,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import {
  Check,
  Zap,
  ArrowRight,
  ShieldCheck,
  PhoneCall,
  Flame,
  Clock,
  Star,
  BadgeCheck,
  MessageCircle,
  Timer,
  ChevronRight,
  Sparkles,
  Users,
  Search,
  CheckCircle2,
  ChevronDown,
  HelpCircle,
  Layers,
  ArrowUpRight,
  Building2,
  Wrench,
  Sparkle,
} from "lucide-react";
import ScreenshotShowcase from "@/components/ScreenshotShowcase";

export default function LandingPage() {
  // Framer Motion Scroll Progress Hooks for Live Scroll Animations
  const { scrollYProgress } = useScroll();

  // Parallax floating transformations linked to scroll progress
  const yParallax1 = useTransform(scrollYProgress, [0, 0.35], [0, 90]);
  const yParallax2 = useTransform(scrollYProgress, [0, 0.35], [0, -60]);
  const yParallax3 = useTransform(scrollYProgress, [0, 0.45], [0, 100]);
  const yParallax4 = useTransform(scrollYProgress, [0, 0.45], [0, -50]);
  const rotateParallax1 = useTransform(scrollYProgress, [0, 0.35], [-6, 3]);
  const rotateParallax2 = useTransform(scrollYProgress, [0, 0.35], [4, -3]);

  // Pricing Cycle Toggle
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  // Active How-It-Works Step
  const [activeStep, setActiveStep] = useState<number>(1);

  // Active FAQ Item
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const howItWorksSteps = [
    {
      step: 1,
      title: "1. Search Nearby Pros",
      subtitle: "Enter your neighborhood locality or service trade",
      description:
        "Select Electrician, Plumber, Carpenter, or Painter. Instant GPS location matching highlights available technicians within 2 kilometers.",
      icon: Search,
      highlight: "Real-time Proximity Ranking",
    },
    {
      step: 2,
      title: "2. Check Verified Profiles",
      subtitle: "Inspect Aadhaar Govt ID badges & past work photo portfolios",
      description:
        "Every pro's background check status, customer review score, track record, and verified skill certificates are fully visible.",
      icon: BadgeCheck,
      highlight: "100% ID Verified",
    },
    {
      step: 3,
      title: "3. Direct WhatsApp / Call",
      subtitle: "Instant click-to-chat with zero intermediary wait time",
      description:
        "Talk directly to the professional on WhatsApp or call them instantly. No platform agent, no delay, no hidden booking fees.",
      icon: MessageCircle,
      highlight: "Zero Commission Cut",
    },
    {
      step: 4,
      title: "4. Direct Payment & Satisfaction",
      subtitle: "Pay the worker directly upon job completion",
      description:
        "The worker retains 100% of their hard-earned rate. Build your personal circle of trusted neighborhood specialists for future needs.",
      icon: CheckCircle2,
      highlight: "100% Fair Pay to Pros",
    },
  ];

  const faqs = [
    {
      q: "Is LocalWorker free to use for homeowners?",
      a: "Yes! Searching for local pros, viewing verified profiles, inspecting work photo portfolios, and connecting via direct call or WhatsApp is 100% free with zero hidden platform charges.",
    },
    {
      q: "How are workers and service contractors verified?",
      a: "Every professional undergoes phone verification, Aadhaar/Government ID check, and portfolio work screening before appearing in neighborhood search results.",
    },
    {
      q: "Does LocalWorker take a commission cut from workers?",
      a: "No! Unlike traditional platforms that extract 20–30% from a worker's wages, LocalWorker operates on a direct connection model. Workers keep 100% of their agreed rate.",
    },
    {
      q: "Can trade contractors or agencies register multi-worker teams?",
      a: "Yes! Service agencies and electrical/plumbing contractors can register under the Agency Hub to manage technician rosters and receive direct neighborhood lead callbacks.",
    },
    {
      q: "How do I request an immediate callback if a worker is busy?",
      a: "Each worker profile features a 'Request Callback' feature. You can submit your phone number and problem description for an immediate call back when the pro is free.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#09090B] text-[#09090B] dark:text-[#FAFAFA] font-sans selection:bg-slate-200 dark:selection:bg-slate-800 relative overflow-x-hidden">
      {/* Top Framer Motion Scroll Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400 z-50 origin-left"
        style={{ scaleX: scrollYProgress }}
      />

      {/* TOP HEADER / NAVBAR (Matching Main Site Logo) */}
      <header className="sticky top-0 z-40 w-full border-b border-black/[0.06] dark:border-white/[0.08] bg-[#F8F9FA]/85 dark:bg-[#09090B]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 sm:h-20 max-w-6xl items-center justify-between px-4 sm:px-6">
          {/* Brand Logo Matching Main Site */}
          <Link to="/" className="flex items-center gap-2.5 group cursor-pointer">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-black text-white dark:bg-white dark:text-black font-extrabold text-sm shadow-sm transition-transform group-hover:scale-105 border border-white/10 dark:border-black/10">
              L
            </span>
            <span className="text-base sm:text-lg font-bold tracking-tight text-[#09090B] dark:text-[#FAFAFA]">
              LocalWorker
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#71717A] dark:text-[#A1A1AA]">
            <a href="#features" className="hover:text-[#09090B] dark:hover:text-white transition">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-[#09090B] dark:hover:text-white transition">
              How It Works
            </a>
            <a href="#screenshots" className="hover:text-[#09090B] dark:hover:text-white transition">
              Screenshots
            </a>
            <a href="#pricing" className="hover:text-[#09090B] dark:hover:text-white transition">
              Pricing
            </a>
            <a href="#faq" className="hover:text-[#09090B] dark:hover:text-white transition">
              FAQ
            </a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-xs sm:text-sm font-semibold text-[#71717A] dark:text-[#A1A1AA] hover:text-[#09090B] dark:hover:text-white transition px-2.5 py-1.5"
            >
              Sign in
            </Link>
            <Link
              to="/home"
              className="inline-flex items-center justify-center rounded-full bg-[#09090B] hover:bg-neutral-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-black px-4 sm:px-5 py-2 text-xs sm:text-sm font-bold shadow-xs transition active:scale-95 cursor-pointer"
            >
              <span>Explore Marketplace</span>
              <ChevronRight size={14} className="ml-1" />
            </Link>
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 1. HERO SECTION WITH SCROLL-TRIGGERED PARALLAX ANIMATIONS      */}
      {/* ============================================================== */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 max-w-6xl mx-auto px-4 sm:px-6">
        {/* Soft Background Radial Light */}
        <div className="absolute inset-0 -z-10 flex items-center justify-center opacity-60 pointer-events-none">
          <div className="h-[520px] w-[520px] rounded-full bg-blue-100/60 dark:bg-blue-950/30 blur-3xl" />
        </div>

        {/* Center 3D Clay Icon */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white dark:bg-[#141416] clay-tile shadow-lg cursor-pointer border border-black/[0.08] dark:border-white/[0.1]"
          whileHover={{ scale: 1.08, rotate: 5 }}
        >
          <div className="grid grid-cols-2 gap-2 w-8 h-8">
            <span className="rounded-full bg-blue-600 shadow-sm animate-pulse" />
            <span className="rounded-full bg-[#09090B] dark:bg-white" />
            <span className="rounded-full bg-[#09090B] dark:bg-white" />
            <span className="rounded-full bg-[#09090B] dark:bg-white" />
          </div>
        </motion.div>

        {/* Hero Title & Subtitle with Staggered Entrance */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center max-w-3xl mx-auto space-y-4"
        >
          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-[#09090B] dark:text-[#FAFAFA] leading-[1.1]"
          >
            Find, connect, and hire <br />
            <span className="text-[#A1A1AA] dark:text-[#71717A] font-bold">all in one place</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25, ease: "easeOut" }}
            className="text-base sm:text-lg text-[#71717A] dark:text-[#A1A1AA] max-w-xl mx-auto font-normal pt-2 leading-relaxed"
          >
            The direct community marketplace connecting homeowners with verified local electricians, plumbers, carpenters, and technicians. Zero commissions. 100% direct contact.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            className="pt-4 flex flex-wrap items-center justify-center gap-3.5"
          >
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                to="/home"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#09090B] hover:bg-neutral-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-black font-bold px-7 py-3.5 text-sm sm:text-base shadow-lg shadow-black/10 transition cursor-pointer"
              >
                <span>Find Nearby Pros</span>
                <ArrowRight size={16} />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <a
                href="#screenshots"
                className="inline-flex items-center gap-2 rounded-2xl border border-black/[0.1] dark:border-white/[0.1] bg-white dark:bg-[#141416] hover:bg-slate-50 dark:hover:bg-[#18181B] text-[#09090B] dark:text-white font-bold px-6 py-3.5 text-sm sm:text-base shadow-xs transition cursor-pointer"
              >
                <span>Inspect App Previews</span>
              </a>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Floating 3D Cards around Hero (Framer Motion Parallax & Live Scroll) */}
        {/* 1. Yellow Pinned Note */}
        <motion.div
          style={{ y: yParallax1, rotate: rotateParallax1 }}
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, delay: 0.3 }}
          className="hidden lg:block absolute left-2 xl:left-6 top-16 w-64 rounded-2xl bg-[#FEF08A] p-4 shadow-xl text-slate-800 border border-yellow-300"
        >
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 h-6 w-6 rounded-full bg-rose-500 shadow-md border-2 border-white flex items-center justify-center">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-200" />
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-800 pt-2 mb-1">
            <Flame size={12} />
            <span>Emergency Repair Needed</span>
          </div>
          <p className="font-medium text-xs leading-relaxed text-[#713F12]">
            Kitchen main switchboard sparking. Verified electrician arriving in 25 mins.
          </p>
          <div className="absolute -bottom-6 -left-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white dark:bg-[#141416] clay-tile shadow-lg rotate-12 border border-slate-200">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
              <Check size={16} strokeWidth={3} />
            </div>
          </div>
        </motion.div>

        {/* 2. Reminders & Dispatch Card */}
        <motion.div
          style={{ y: yParallax2, rotate: rotateParallax2 }}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, delay: 0.3 }}
          className="hidden lg:block absolute right-2 xl:right-6 top-16 w-68 rounded-2xl bg-white dark:bg-[#141416] clay-card p-4 shadow-xl"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/10">
            <span className="text-xs font-bold text-[#09090B] dark:text-white">Active Dispatch</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
              On the way
            </span>
          </div>
          <div className="mt-2.5 space-y-1">
            <p className="text-xs font-semibold text-[#09090B] dark:text-white">Karthik S. (Plumber)</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Bathroom drain leakage repair</p>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
              <Clock size={10} />
              <span>ETA: 18 mins (1.8 km)</span>
            </div>
          </div>
          <div className="absolute -top-5 -left-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white dark:bg-[#18181B] clay-tile shadow-md">
            <Timer size={20} className="text-slate-800 dark:text-white" />
          </div>
        </motion.div>

        {/* 3. Verified Pro Rating Card */}
        <motion.div
          style={{ y: yParallax3 }}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.5 }}
          className="hidden lg:block absolute left-6 xl:left-10 -bottom-16 w-72 rounded-2xl bg-white dark:bg-[#141416] clay-card p-4 shadow-xl z-10"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#09090B] dark:text-white">Verified Local Pro</span>
            <span className="inline-flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
              <BadgeCheck size={12} /> ID Verified
            </span>
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-[10px]">
                  R
                </span>
                <span className="font-semibold text-[#09090B] dark:text-white">Ramesh Sharma</span>
              </div>
              <div className="flex items-center gap-1 text-amber-500 font-bold text-[11px]">
                <Star size={11} className="fill-amber-400" />
                <span>4.9</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
              <span>Electrician · 142 Jobs</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Available Today</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-blue-600 w-[94%]" />
            </div>
          </div>
        </motion.div>

        {/* 4. Direct Connect Badge */}
        <motion.div
          style={{ y: yParallax4 }}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.5 }}
          className="hidden lg:block absolute right-6 xl:right-10 -bottom-16 w-64 rounded-2xl bg-white dark:bg-[#141416] clay-card p-4 shadow-xl z-10"
        >
          <span className="text-xs font-bold text-[#09090B] dark:text-white">Direct Connect</span>
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white dark:bg-[#18181B] clay-tile shadow-xs text-blue-600 dark:text-blue-400">
              <PhoneCall size={18} />
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white dark:bg-[#18181B] clay-tile shadow-xs text-emerald-600 dark:text-emerald-400">
              <MessageCircle size={18} />
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white dark:bg-[#18181B] clay-tile shadow-xs text-amber-500">
              <ShieldCheck size={18} />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
            0% commission cut from the worker's hard-earned income.
          </p>
        </motion.div>
      </section>

      {/* ============================================================== */}
      {/* 2. LIVE METRICS & IMPACT COUNTERS                              */}
      {/* ============================================================== */}
      <section className="py-8 bg-slate-100/60 dark:bg-[#121316] border-y border-black/[0.06] dark:border-white/[0.08]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#18191D] border border-black/[0.06] dark:border-white/[0.08] shadow-xs">
              <p className="text-2xl sm:text-3xl font-extrabold text-[#09090B] dark:text-white tracking-tight">
                5,000+
              </p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                Verified Local Pros
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-[#18191D] border border-black/[0.06] dark:border-white/[0.08] shadow-xs">
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
                0%
              </p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                Middleman Fees
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-[#18191D] border border-black/[0.06] dark:border-white/[0.08] shadow-xs">
              <p className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400 tracking-tight">
                15 Mins
              </p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                Avg Dispatch Time
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-[#18191D] border border-black/[0.06] dark:border-white/[0.08] shadow-xs">
              <p className="text-2xl sm:text-3xl font-extrabold text-amber-500 tracking-tight">
                98.4%
              </p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                Client Satisfaction
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 3. CORE FEATURES SECTION (Clean 3D Clay Aesthetic)             */}
      {/* ============================================================== */}
      <motion.section
        id="features"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.7 }}
        className="py-16 md:py-24 max-w-6xl mx-auto px-4 sm:px-6"
      >
        <div className="text-center max-w-2xl mx-auto space-y-2.5 mb-14">
          <span className="inline-flex items-center rounded-full border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#141416] px-3.5 py-1 text-xs font-semibold text-[#09090B] dark:text-white shadow-xs">
            Why LocalWorker
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#09090B] dark:text-[#FAFAFA]">
            Built for trust and transparency
          </h2>
          <p className="text-sm sm:text-base text-[#71717A] dark:text-[#A1A1AA]">
            Everything designed to make home repairs stress-free, fast, and 100% direct.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            whileHover={{ y: -6 }}
            className="rounded-[28px] bg-white dark:bg-[#141416] clay-card p-6 sm:p-8 flex flex-col justify-between"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 mb-5">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-lg font-bold text-[#09090B] dark:text-white">100% Verified Identity</h3>
              <p className="mt-2 text-xs sm:text-sm text-[#71717A] dark:text-[#A1A1AA] leading-relaxed">
                Every service professional is government ID-checked and background-verified before appearing in the directory.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/10 flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
              <Check size={14} />
              <span>Government ID Checked</span>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -6 }}
            className="rounded-[28px] bg-white dark:bg-[#141416] clay-card p-6 sm:p-8 flex flex-col justify-between"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mb-5">
                <PhoneCall size={24} />
              </div>
              <h3 className="text-lg font-bold text-[#09090B] dark:text-white">Zero Broker Commissions</h3>
              <p className="mt-2 text-xs sm:text-sm text-[#71717A] dark:text-[#A1A1AA] leading-relaxed">
                You talk directly to the tradesperson and pay them directly. No middleman markups, hidden fees, or inflated rates.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/10 flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <Check size={14} />
              <span>Direct Phone & WhatsApp</span>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -6 }}
            className="rounded-[28px] bg-white dark:bg-[#141416] clay-card p-6 sm:p-8 flex flex-col justify-between"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 mb-5">
                <Sparkles size={24} />
              </div>
              <h3 className="text-lg font-bold text-[#09090B] dark:text-white">Instant Neighborhood Routing</h3>
              <p className="mt-2 text-xs sm:text-sm text-[#71717A] dark:text-[#A1A1AA] leading-relaxed">
                Connect with specialists right in your sector or locality for ultra-fast arrival times and reliable doorstep visits.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/10 flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
              <Check size={14} />
              <span>Hyperlocal Distance Match</span>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* ============================================================== */}
      {/* 4. INTERACTIVE HOW IT WORKS STEPPER                            */}
      {/* ============================================================== */}
      <motion.section
        id="how-it-works"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.8 }}
        className="py-16 md:py-24 max-w-6xl mx-auto px-4 sm:px-6"
      >
        <div className="text-center max-w-2xl mx-auto space-y-2.5 mb-12">
          <span className="inline-flex items-center rounded-full border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#141416] px-3.5 py-1 text-xs font-semibold text-[#09090B] dark:text-white shadow-xs">
            Simple Process
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#09090B] dark:text-[#FAFAFA]">
            How LocalWorker works
          </h2>
          <p className="text-sm sm:text-base text-[#71717A] dark:text-[#A1A1AA]">
            Four simple steps from finding a problem to getting it fixed.
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
                  className={`w-full text-left p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-start gap-4 ${
                    isActive
                      ? "bg-white dark:bg-[#141416] border-blue-600 dark:border-blue-500 shadow-md scale-[1.02]"
                      : "bg-slate-50 dark:bg-[#0D0D10] border-black/[0.06] dark:border-white/[0.08] hover:bg-white dark:hover:bg-[#141416]"
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 font-bold text-sm ${
                      isActive
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-200 dark:bg-neutral-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    <StepIcon size={18} />
                  </div>
                  <div>
                    <h3
                      className={`text-sm sm:text-base font-bold ${
                        isActive
                          ? "text-[#09090B] dark:text-white"
                          : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {step.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
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
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.35 }}
                    className="rounded-[32px] bg-white dark:bg-[#141416] clay-card p-6 sm:p-10 border border-black/[0.08] dark:border-white/[0.1] shadow-xl relative overflow-hidden"
                  >
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 text-xs font-bold mb-4">
                      <Sparkles size={13} />
                      <span>{step.highlight}</span>
                    </div>

                    <h3 className="text-2xl sm:text-3xl font-extrabold text-[#09090B] dark:text-white">
                      {step.title}
                    </h3>

                    <p className="text-sm text-[#71717A] dark:text-[#A1A1AA] mt-3 leading-relaxed">
                      {step.description}
                    </p>

                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 size={16} />
                        <span>Direct Community Driven</span>
                      </div>

                      <Link
                        to="/home"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
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
      </motion.section>

      {/* ============================================================== */}
      {/* 5. APP SCREENSHOTS SHOWCASE (Interactive Device Tour)          */}
      {/* ============================================================== */}
      <motion.section
        id="screenshots"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.8 }}
        className="py-16 md:py-24 max-w-6xl mx-auto px-4 sm:px-6"
      >
        <div className="text-center max-w-2xl mx-auto space-y-2.5 mb-12">
          <span className="inline-flex items-center rounded-full border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#141416] px-3.5 py-1 text-xs font-semibold text-[#09090B] dark:text-white shadow-xs">
            App Experience
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#09090B] dark:text-[#FAFAFA]">
            Interactive app screenshots
          </h2>
          <p className="text-sm sm:text-base text-[#71717A] dark:text-[#A1A1AA]">
            Explore real interfaces for marketplace discovery, direct mobile connect, search filters, and agency rosters.
          </p>
        </div>

        {/* Live Interactive Screenshot Showcase Component */}
        <ScreenshotShowcase />
      </motion.section>

      {/* ============================================================== */}
      {/* 6. PRICING PLANS SECTION                                       */}
      {/* ============================================================== */}
      <motion.section
        id="pricing"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.8 }}
        className="py-20 md:py-28 max-w-6xl mx-auto px-4 sm:px-6 relative"
      >
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
          <div className="inline-flex items-center rounded-full border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#141416] px-3.5 py-1 text-xs font-semibold text-[#09090B] dark:text-white shadow-xs">
            Pricing
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#09090B] dark:text-[#FAFAFA]">
            Simple pricing plans
          </h2>

          {/* Monthly / Annual Toggle */}
          <div className="pt-2 flex items-center justify-center gap-3">
            <span
              className={`text-xs font-semibold transition ${
                billingCycle === "monthly" ? "text-blue-600 dark:text-blue-400 font-bold" : "text-slate-400"
              }`}
            >
              Monthly
            </span>
            <button
              type="button"
              onClick={() =>
                setBillingCycle((prev) => (prev === "monthly" ? "annual" : "monthly"))
              }
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-200 dark:bg-neutral-800 transition cursor-pointer"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-blue-600 transition ${
                  billingCycle === "annual" ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span
              className={`text-xs font-semibold transition ${
                billingCycle === "annual" ? "text-blue-600 dark:text-blue-400 font-bold" : "text-slate-400"
              }`}
            >
              Annual <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">(Save 20%)</span>
            </span>
          </div>
        </div>

        {/* 3 Pricing Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-center">
          {/* Card 1: Basic Plan ($5/mo) */}
          <motion.div
            whileHover={{ y: -6 }}
            transition={{ duration: 0.2 }}
            className="rounded-[32px] bg-white dark:bg-[#141416] clay-card p-6 sm:p-8 flex flex-col justify-between"
          >
            <div>
              <h3 className="text-xl font-bold text-[#09090B] dark:text-white">
                Basic plan
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Perfect for individual pros.</p>

              <div className="my-6">
                <span className="text-4xl sm:text-5xl font-extrabold text-[#09090B] dark:text-white">
                  ${billingCycle === "annual" ? "4" : "5"}
                </span>
                <span className="text-sm font-medium text-slate-400">/mo</span>
              </div>

              <Link
                to="/register"
                className="w-full inline-flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 text-sm shadow-md shadow-blue-500/20 transition cursor-pointer"
              >
                Get started
              </Link>

              {/* Checklist */}
              <ul className="mt-8 space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
                <li className="flex items-center gap-2.5">
                  <Check size={14} className="text-blue-600 shrink-0" />
                  <span>Direct WhatsApp & Phone Listing</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={14} className="text-blue-600 shrink-0" />
                  <span>Verified Identity Badge</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={14} className="text-blue-600 shrink-0" />
                  <span>Work Portfolio Gallery</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={14} className="text-blue-600 shrink-0" />
                  <span>Instant Neighborhood Dispatch</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={14} className="text-blue-600 shrink-0" />
                  <span>0% Commission Deduction</span>
                </li>
              </ul>
            </div>

            <div className="pt-6">
              <a href="#features" className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white underline">
                Learn more
              </a>
            </div>
          </motion.div>

          {/* Card 2: Pro Plan ($9/mo) */}
          <motion.div
            whileHover={{ y: -8 }}
            transition={{ duration: 0.2 }}
            className="relative rounded-[32px] clay-blue p-6 sm:p-8 flex flex-col justify-between text-white md:-translate-y-4 shadow-2xl"
          >
            <div className="absolute -top-5 right-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white clay-tile shadow-lg rotate-12">
              <Zap size={22} className="text-amber-400 fill-amber-400" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">
                Pro plan
              </h3>
              <p className="text-xs text-blue-100 mt-1">Ideal for high-demand specialists.</p>

              <div className="my-6">
                <span className="text-4xl sm:text-5xl font-extrabold text-white">
                  ${billingCycle === "annual" ? "7" : "9"}
                </span>
                <span className="text-sm font-medium text-blue-200">/mo</span>
                <span className="block text-[11px] font-semibold text-blue-200 mt-1">
                  Most Popular
                </span>
              </div>

              <Link
                to="/register"
                className="w-full inline-flex items-center justify-center rounded-xl bg-white hover:bg-slate-100 text-blue-700 font-bold py-3 text-sm shadow-md transition cursor-pointer"
              >
                Get started
              </Link>

              {/* Checklist */}
              <ul className="mt-8 space-y-3.5 text-xs text-white">
                <li className="flex items-center gap-2.5">
                  <Check size={14} className="text-white shrink-0" strokeWidth={2.5} />
                  <span>Priority Neighborhood Ranking</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={14} className="text-white shrink-0" strokeWidth={2.5} />
                  <span>Featured Pro Spotlight Seal</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={14} className="text-white shrink-0" strokeWidth={2.5} />
                  <span>Unlimited Direct Callbacks</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={14} className="text-white shrink-0" strokeWidth={2.5} />
                  <span>Expanded Portfolio Storage</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={14} className="text-white shrink-0" strokeWidth={2.5} />
                  <span>0% Commission Deduction</span>
                </li>
              </ul>
            </div>

            <div className="pt-6">
              <a href="#features" className="text-xs font-semibold text-white/80 hover:text-white underline">
                Learn more
              </a>
            </div>
          </motion.div>

          {/* Card 3: Advanced Plan ($15/mo) */}
          <motion.div
            whileHover={{ y: -6 }}
            transition={{ duration: 0.2 }}
            className="rounded-[32px] bg-white dark:bg-[#141416] clay-card p-6 sm:p-8 flex flex-col justify-between"
          >
            <div>
              <h3 className="text-xl font-bold text-[#09090B] dark:text-white">
                Agency Hub
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">For trade contractors & firms.</p>

              <div className="my-6">
                <span className="text-4xl sm:text-5xl font-extrabold text-[#09090B] dark:text-white">
                  ${billingCycle === "annual" ? "12" : "15"}
                </span>
                <span className="text-sm font-medium text-slate-400">/mo</span>
              </div>

              <Link
                to="/register-agency"
                className="w-full inline-flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 text-sm shadow-md shadow-blue-500/20 transition cursor-pointer"
              >
                Register Agency
              </Link>

              {/* Checklist */}
              <ul className="mt-8 space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
                <li className="flex items-center gap-2.5">
                  <Check size={14} className="text-blue-600 shrink-0" />
                  <span>Multi-Technician Roster</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={14} className="text-blue-600 shrink-0" />
                  <span>Verified Agency Seal</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={14} className="text-blue-600 shrink-0" />
                  <span>Lead Queue Management</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={14} className="text-blue-600 shrink-0" />
                  <span>Team Performance Dashboard</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={14} className="text-blue-600 shrink-0" />
                  <span>0% Commission Deduction</span>
                </li>
              </ul>
            </div>

            <div className="pt-6">
              <a href="#features" className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white underline">
                Learn more
              </a>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* ============================================================== */}
      {/* 7. INTERACTIVE FAQ ACCORDION                                   */}
      {/* ============================================================== */}
      <motion.section
        id="faq"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.8 }}
        className="py-16 md:py-24 max-w-4xl mx-auto px-4 sm:px-6"
      >
        <div className="text-center space-y-2.5 mb-12">
          <span className="inline-flex items-center rounded-full border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#141416] px-3.5 py-1 text-xs font-semibold text-[#09090B] dark:text-white shadow-xs">
            Frequently Asked Questions
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#09090B] dark:text-[#FAFAFA]">
            Got questions? We've got answers.
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#141416] overflow-hidden transition-all shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between p-5 text-left text-sm sm:text-base font-bold text-[#09090B] dark:text-white hover:bg-slate-50 dark:hover:bg-[#18181B] transition cursor-pointer"
                >
                  <span className="pr-4">{faq.q}</span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-slate-400 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-blue-600" : ""
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="px-5 pb-5 text-xs sm:text-sm text-[#71717A] dark:text-[#A1A1AA] leading-relaxed border-t border-slate-100 dark:border-white/10 pt-3">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </motion.section>

      {/* ============================================================== */}
      {/* 8. CALL TO ACTION BANNER                                       */}
      {/* ============================================================== */}
      <section className="py-16 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="rounded-[36px] bg-gradient-to-br from-[#09090B] via-neutral-900 to-slate-900 dark:from-[#141416] dark:to-[#0D0D10] p-8 sm:p-14 text-white shadow-2xl relative overflow-hidden border border-white/10">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-bold text-blue-300 backdrop-blur-md">
              <Sparkles size={13} />
              <span>Direct Neighborhood Network</span>
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Ready to find trusted local pros in your sector?
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed pt-1">
              Connect with verified electricians, plumbers, carpenters, and technicians near you with zero broker fees.
            </p>

            <div className="pt-4 flex flex-wrap items-center gap-4">
              <Link
                to="/home"
                className="inline-flex items-center gap-2 rounded-2xl bg-white hover:bg-slate-100 text-[#09090B] font-bold px-7 py-3.5 text-sm shadow-lg transition cursor-pointer"
              >
                <span>Explore Marketplace</span>
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 hover:bg-white/10 text-white font-bold px-6 py-3.5 text-sm transition cursor-pointer"
              >
                <span>Join as Service Pro</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 9. FLOATING 3D CLAY ICONS MOSAIC                               */}
      {/* ============================================================== */}
      <section className="py-12 overflow-hidden relative border-t border-black/[0.06] dark:border-white/[0.08] bg-slate-50/50 dark:bg-[#09090B]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-slate-400 mb-8">
            Community Powered Local Marketplace
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white dark:bg-[#141416] clay-tile shadow-md -rotate-6 cursor-pointer border border-black/[0.06] dark:border-white/[0.08]"
            >
              <span className="text-xl font-black text-[#09090B] dark:text-white">20</span>
            </motion.div>

            <motion.div
              animate={{ y: [0, 7, 0] }}
              transition={{ repeat: Infinity, duration: 4.2, ease: "easeInOut" }}
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white dark:bg-[#141416] clay-tile shadow-md rotate-8 cursor-pointer border border-black/[0.06] dark:border-white/[0.08]"
            >
              <MessageCircle size={20} className="text-sky-500" />
            </motion.div>

            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 3.8, ease: "easeInOut" }}
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white dark:bg-[#141416] clay-tile shadow-md -rotate-4 cursor-pointer border border-black/[0.06] dark:border-white/[0.08]"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
                <Check size={16} strokeWidth={3} />
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }}
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white dark:bg-[#141416] clay-tile shadow-md rotate-12 cursor-pointer border border-black/[0.06] dark:border-white/[0.08]"
            >
              <ShieldCheck size={20} className="text-blue-500" />
            </motion.div>

            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 4.0, ease: "easeInOut" }}
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white dark:bg-[#141416] clay-tile shadow-md -rotate-8 cursor-pointer border border-black/[0.06] dark:border-white/[0.08]"
            >
              <Timer size={22} className="text-amber-500" />
            </motion.div>

            <motion.div
              animate={{ y: [0, 7, 0] }}
              transition={{ repeat: Infinity, duration: 3.6, ease: "easeInOut" }}
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white dark:bg-[#141416] clay-tile shadow-md rotate-6 cursor-pointer border border-black/[0.06] dark:border-white/[0.08]"
            >
              <Zap size={20} className="text-amber-400 fill-amber-400" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 10. FOOTER                                                     */}
      {/* ============================================================== */}
      <footer className="border-t border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#0D0D10] py-12 text-slate-500 dark:text-slate-400">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 group cursor-pointer">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-black text-white dark:bg-white dark:text-black font-extrabold text-xs shadow-sm transition-transform group-hover:scale-105 border border-white/10 dark:border-black/10">
              L
            </span>
            <span className="text-sm font-bold tracking-tight text-[#09090B] dark:text-[#FAFAFA]">
              LocalWorker
            </span>
          </Link>

          <div className="flex items-center gap-6 text-xs font-medium text-slate-600 dark:text-slate-400">
            <Link to="/home" className="hover:text-black dark:hover:text-white transition">
              Marketplace
            </Link>
            <Link to="/search" className="hover:text-black dark:hover:text-white transition">
              Find Pros
            </Link>
            <Link to="/register" className="hover:text-black dark:hover:text-white transition">
              Join as Pro
            </Link>
            <Link to="/register-agency" className="hover:text-black dark:hover:text-white transition">
              Agency Hub
            </Link>
            <Link to="/voice-onboarding" className="hover:text-black dark:hover:text-white transition">
              Voice Assistant
            </Link>
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500">
            © {new Date().getFullYear()} LocalWorker. Zero middleman fees.
          </p>
        </div>
      </footer>
    </div>
  );
}
