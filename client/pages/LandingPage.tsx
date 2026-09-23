import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  motion,
  useScroll,
  useTransform,
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
  ImageIcon,
  UploadCloud,
  ChevronRight,
  Sparkles,
} from "lucide-react";

export default function LandingPage() {
  // Framer Motion Scroll Progress Hooks for Live Scroll Animations
  const { scrollYProgress } = useScroll();

  // Parallax floating transformations linked to scroll progress
  const yParallax1 = useTransform(scrollYProgress, [0, 0.35], [0, 100]);
  const yParallax2 = useTransform(scrollYProgress, [0, 0.35], [0, -70]);
  const yParallax3 = useTransform(scrollYProgress, [0, 0.45], [0, 110]);
  const yParallax4 = useTransform(scrollYProgress, [0, 0.45], [0, -60]);
  const rotateParallax1 = useTransform(scrollYProgress, [0, 0.35], [-6, 3]);
  const rotateParallax2 = useTransform(scrollYProgress, [0, 0.35], [4, -3]);

  // Pricing Cycle Toggle
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#09090B] font-sans selection:bg-slate-200 relative overflow-x-hidden">
      {/* Top Framer Motion Scroll Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400 z-50 origin-left"
        style={{ scaleX: scrollYProgress }}
      />

      {/* TOP HEADER / NAVBAR (Light Theme Only, Matching Main Site Logo) */}
      <header className="sticky top-0 z-40 w-full border-b border-black/[0.06] bg-[#F8F9FA]/85 backdrop-blur-xl">
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
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#71717A]">
            <a href="#features" className="hover:text-[#09090B] transition">
              Features
            </a>
            <a href="#screenshots" className="hover:text-[#09090B] transition">
              Screenshots
            </a>
            <a href="#pricing" className="hover:text-[#09090B] transition">
              Pricing
            </a>
            <a href="#guarantee" className="hover:text-[#09090B] transition">
              Guarantee
            </a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-xs sm:text-sm font-semibold text-[#71717A] hover:text-[#09090B] transition px-2.5 py-1.5"
            >
              Sign in
            </Link>
            <Link
              to="/home"
              className="inline-flex items-center justify-center rounded-full bg-[#09090B] hover:bg-neutral-800 text-white px-4 sm:px-5 py-2 text-xs sm:text-sm font-bold shadow-xs transition active:scale-95 cursor-pointer"
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
      <section className="relative pt-14 pb-20 md:pt-24 md:pb-36 max-w-6xl mx-auto px-4 sm:px-6">
        {/* Soft Background Radial Light */}
        <div className="absolute inset-0 -z-10 flex items-center justify-center opacity-60 pointer-events-none">
          <div className="h-[520px] w-[520px] rounded-full bg-blue-100/60 blur-3xl" />
        </div>

        {/* Center 3D Clay Icon */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white clay-tile shadow-lg cursor-pointer"
          whileHover={{ scale: 1.08, rotate: 5 }}
        >
          <div className="grid grid-cols-2 gap-2 w-8 h-8">
            <span className="rounded-full bg-blue-600 shadow-sm animate-pulse" />
            <span className="rounded-full bg-[#09090B]" />
            <span className="rounded-full bg-[#09090B]" />
            <span className="rounded-full bg-[#09090B]" />
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
            className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-[#09090B] leading-[1.1]"
          >
            Find, connect, and hire <br />
            <span className="text-[#A1A1AA] font-bold">all in one place</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25, ease: "easeOut" }}
            className="text-base sm:text-lg text-[#71717A] max-w-xl mx-auto font-normal pt-2 leading-relaxed"
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
                className="inline-flex items-center gap-2 rounded-2xl bg-[#09090B] hover:bg-neutral-800 text-white font-bold px-7 py-3.5 text-sm sm:text-base shadow-lg shadow-black/10 transition cursor-pointer"
              >
                <span>Find Nearby Pros</span>
                <ArrowRight size={16} />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <a
                href="#pricing"
                className="inline-flex items-center gap-2 rounded-2xl border border-black/[0.1] bg-white hover:bg-slate-50 text-[#09090B] font-bold px-6 py-3.5 text-sm sm:text-base shadow-xs transition cursor-pointer"
              >
                <span>View Pricing Plans</span>
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
          className="hidden lg:block absolute left-2 xl:left-6 top-16 w-64 rounded-2xl bg-[#FEF08A] p-4 shadow-xl text-slate-800"
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
          <div className="absolute -bottom-6 -left-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white clay-tile shadow-lg rotate-12">
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
          className="hidden lg:block absolute right-2 xl:right-6 top-16 w-68 rounded-2xl bg-white clay-card p-4 shadow-xl"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-[#09090B]">Active Dispatch</span>
            <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
              On the way
            </span>
          </div>
          <div className="mt-2.5 space-y-1">
            <p className="text-xs font-semibold text-[#09090B]">Karthik S. (Plumber)</p>
            <p className="text-[11px] text-slate-500">Bathroom drain leakage repair</p>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
              <Clock size={10} />
              <span>ETA: 18 mins (1.8 km)</span>
            </div>
          </div>
          <div className="absolute -top-5 -left-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white clay-tile shadow-md">
            <Timer size={20} className="text-slate-800" />
          </div>
        </motion.div>

        {/* 3. Verified Pro Rating Card */}
        <motion.div
          style={{ y: yParallax3 }}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.5 }}
          className="hidden lg:block absolute left-6 xl:left-10 -bottom-16 w-72 rounded-2xl bg-white clay-card p-4 shadow-xl z-10"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#09090B]">Verified Local Pro</span>
            <span className="inline-flex items-center gap-1 text-[10px] text-blue-600 font-semibold">
              <BadgeCheck size={12} /> ID Verified
            </span>
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-[10px]">
                  R
                </span>
                <span className="font-semibold text-[#09090B]">Ramesh Sharma</span>
              </div>
              <div className="flex items-center gap-1 text-amber-500 font-bold text-[11px]">
                <Star size={11} className="fill-amber-400" />
                <span>4.9</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span>Electrician · 142 Jobs</span>
              <span className="font-semibold text-emerald-600">Available Today</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
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
          className="hidden lg:block absolute right-6 xl:right-10 -bottom-16 w-64 rounded-2xl bg-white clay-card p-4 shadow-xl z-10"
        >
          <span className="text-xs font-bold text-[#09090B]">Direct Connect</span>
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white clay-tile shadow-xs text-blue-600">
              <PhoneCall size={18} />
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white clay-tile shadow-xs text-emerald-600">
              <MessageCircle size={18} />
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white clay-tile shadow-xs text-amber-500">
              <ShieldCheck size={18} />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-2 font-medium">
            0% commission cut from the worker's hard-earned income.
          </p>
        </motion.div>
      </section>

      {/* ============================================================== */}
      {/* 2. CORE FEATURES SECTION (Clean 3D Clay Aesthetic)             */}
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
          <span className="inline-flex items-center rounded-full border border-black/[0.08] bg-white px-3.5 py-1 text-xs font-semibold text-[#09090B] shadow-xs">
            Why LocalWorker
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#09090B]">
            Built for trust and transparency
          </h2>
          <p className="text-sm sm:text-base text-[#71717A]">
            Everything designed to make home repairs stress-free, fast, and 100% direct.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            whileHover={{ y: -6 }}
            className="rounded-[28px] bg-white clay-card p-6 sm:p-8 flex flex-col justify-between"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-5">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-lg font-bold text-[#09090B]">100% Verified Identity</h3>
              <p className="mt-2 text-xs sm:text-sm text-[#71717A] leading-relaxed">
                Every service professional is government ID-checked and background-verified before appearing in the directory.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-1.5 text-xs font-bold text-blue-600">
              <Check size={14} />
              <span>Government ID Checked</span>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -6 }}
            className="rounded-[28px] bg-white clay-card p-6 sm:p-8 flex flex-col justify-between"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-5">
                <PhoneCall size={24} />
              </div>
              <h3 className="text-lg font-bold text-[#09090B]">Zero Broker Commissions</h3>
              <p className="mt-2 text-xs sm:text-sm text-[#71717A] leading-relaxed">
                You talk directly to the tradesperson and pay them directly. No middleman markups, hidden fees, or inflated rates.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-1.5 text-xs font-bold text-emerald-600">
              <Check size={14} />
              <span>Direct Phone & WhatsApp</span>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -6 }}
            className="rounded-[28px] bg-white clay-card p-6 sm:p-8 flex flex-col justify-between"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-5">
                <Sparkles size={24} />
              </div>
              <h3 className="text-lg font-bold text-[#09090B]">Instant Neighborhood Routing</h3>
              <p className="mt-2 text-xs sm:text-sm text-[#71717A] leading-relaxed">
                Connect with specialists right in your sector or locality for ultra-fast arrival times and reliable doorstep visits.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-1.5 text-xs font-bold text-amber-600">
              <Check size={14} />
              <span>Hyperlocal Distance Match</span>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* ============================================================== */}
      {/* 3. SCREENSHOTS PLACEHOLDER SECTION (Clean Space for Uploads)   */}
      {/* ============================================================== */}
      <motion.section
        id="screenshots"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.8 }}
        className="py-16 md:py-24 max-w-6xl mx-auto px-4 sm:px-6"
      >
        <div className="text-center max-w-2xl mx-auto space-y-2.5 mb-10">
          <span className="inline-flex items-center rounded-full border border-black/[0.08] bg-white px-3.5 py-1 text-xs font-semibold text-[#09090B] shadow-xs">
            App Previews
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#09090B]">
            Screenshots
          </h2>
          <p className="text-sm sm:text-base text-[#71717A]">
            Clean, intuitive interface designed for homeowners and verified contractors.
          </p>
        </div>

        {/* Elegant Placeholder Frame with Reserved Space for User's Screenshots */}
        <div className="rounded-[32px] border-2 border-dashed border-slate-300 bg-white/70 p-8 sm:p-16 flex flex-col items-center justify-center text-center shadow-sm min-h-[380px] sm:min-h-[460px] relative overflow-hidden">
          <div className="h-16 w-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
            <ImageIcon size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Screenshots Space</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mt-1.5 leading-relaxed">
            Reserved area for your platform and mobile screenshots. Ready to display your uploaded application visuals.
          </p>

          <div className="mt-6 flex items-center gap-2 text-xs font-medium text-slate-400 bg-slate-100 border border-slate-200 px-3.5 py-1.5 rounded-full">
            <UploadCloud size={14} />
            <span>Upload screenshots to /screenshots folder</span>
          </div>
        </div>
      </motion.section>

      {/* ============================================================== */}
      {/* 4. PRICING PLANS (Strictly Image 1 Design & Layout)            */}
      {/* ============================================================== */}
      <motion.section
        id="pricing"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.8 }}
        className="py-20 md:py-32 max-w-6xl mx-auto px-4 sm:px-6 relative"
      >
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
          <div className="inline-flex items-center rounded-full border border-black/[0.08] bg-white px-3.5 py-1 text-xs font-semibold text-[#09090B] shadow-xs">
            Pricing
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#09090B]">
            Simple pricing plans
          </h2>

          {/* Monthly / Annual Toggle */}
          <div className="pt-2 flex items-center justify-center gap-3">
            <span
              className={`text-xs font-semibold transition ${
                billingCycle === "monthly" ? "text-blue-600 font-bold" : "text-slate-400"
              }`}
            >
              Monthly
            </span>
            <button
              type="button"
              onClick={() =>
                setBillingCycle((prev) => (prev === "monthly" ? "annual" : "monthly"))
              }
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-200 transition cursor-pointer"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-blue-600 transition ${
                  billingCycle === "annual" ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span
              className={`text-xs font-semibold transition ${
                billingCycle === "annual" ? "text-blue-600 font-bold" : "text-slate-400"
              }`}
            >
              Annual <span className="text-[10px] text-emerald-600 font-bold">(Save 20%)</span>
            </span>
          </div>
        </div>

        {/* 3 Pricing Cards Row matching Reference Image 1 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-center">
          {/* Card 1: Basic Plan ($5/mo) */}
          <motion.div
            whileHover={{ y: -6 }}
            transition={{ duration: 0.2 }}
            className="rounded-[32px] bg-white clay-card p-6 sm:p-8 flex flex-col justify-between"
          >
            <div>
              <h3 className="text-xl font-bold text-[#09090B]">
                Basic plan
              </h3>
              <p className="text-xs text-slate-500 mt-1">Perfect for individuals.</p>

              <div className="my-6">
                <span className="text-4xl sm:text-5xl font-extrabold text-[#09090B]">
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
              <ul className="mt-8 space-y-3.5 text-xs text-slate-700">
                <li className="flex items-center gap-2.5">
                  <Check size={14} className="text-blue-600 shrink-0" />
                  <span>All product features</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={14} className="text-blue-600 shrink-0" />
                  <span>Unlimited lists & tasks</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={14} className="text-blue-600 shrink-0" />
                  <span>Priority support</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={14} className="text-blue-600 shrink-0" />
                  <span>Unlimited tasks</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={14} className="text-blue-600 shrink-0" />
                  <span>Unlimited file storage</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={14} className="text-blue-600 shrink-0" />
                  <span>Unlimited projects</span>
                </li>
              </ul>
            </div>

            <div className="pt-6">
              <a href="#features" className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline">
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
              <p className="text-xs text-blue-100 mt-1">Ideal for small teams.</p>

              <div className="my-6">
                <span className="text-4xl sm:text-5xl font-extrabold text-white">
                  ${billingCycle === "annual" ? "7" : "9"}
                </span>
                <span className="text-sm font-medium text-blue-200">/mo</span>
                <span className="block text-[11px] font-semibold text-blue-200 mt-1">
                  Best choice
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
                  <span>All product features</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={14} className="text-white shrink-0" strokeWidth={2.5} />
                  <span>Unlimited lists & tasks</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={14} className="text-white shrink-0" strokeWidth={2.5} />
                  <span>Priority support</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={14} className="text-white shrink-0" strokeWidth={2.5} />
                  <span>Unlimited tasks</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={14} className="text-white shrink-0" strokeWidth={2.5} />
                  <span>Unlimited file storage</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={14} className="text-white shrink-0" strokeWidth={2.5} />
                  <span>Unlimited projects</span>
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
            className="rounded-[32px] bg-white clay-card p-6 sm:p-8 flex flex-col justify-between"
          >
            <div>
              <h3 className="text-xl font-bold text-[#09090B]">
                Advanced plan
              </h3>
              <p className="text-xs text-slate-500 mt-1">For contractor agencies.</p>

              <div className="my-6">
                <span className="text-4xl sm:text-5xl font-extrabold text-[#09090B]">
                  ${billingCycle === "annual" ? "12" : "15"}
                </span>
                <span className="text-sm font-medium text-slate-400">/mo</span>
              </div>

              <Link
                to="/register-agency"
                className="w-full inline-flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 text-sm shadow-md shadow-blue-500/20 transition cursor-pointer"
              >
                Get started
              </Link>

              {/* Checklist */}
              <ul className="mt-8 space-y-3.5 text-xs text-slate-700">
                <li className="flex items-center gap-2.5">
                  <Check size={14} className="text-blue-600 shrink-0" />
                  <span>All product features</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={14} className="text-blue-600 shrink-0" />
                  <span>Unlimited lists & tasks</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={14} className="text-blue-600 shrink-0" />
                  <span>Priority support</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={14} className="text-blue-600 shrink-0" />
                  <span>Unlimited tasks</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={14} className="text-blue-600 shrink-0" />
                  <span>Unlimited file storage</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={14} className="text-blue-600 shrink-0" />
                  <span>Unlimited projects</span>
                </li>
              </ul>
            </div>

            <div className="pt-6">
              <a href="#features" className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline">
                Learn more
              </a>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* ============================================================== */}
      {/* 5. FLOATING 3D CLAY ICONS MOSAIC                               */}
      {/* ============================================================== */}
      <section id="guarantee" className="py-16 overflow-hidden relative border-t border-black/[0.06] bg-slate-50/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-slate-400 mb-8">
            Community Powered Local Marketplace
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white clay-tile shadow-md -rotate-6 cursor-pointer"
            >
              <span className="text-xl font-black text-[#09090B]">20</span>
            </motion.div>

            <motion.div
              animate={{ y: [0, 7, 0] }}
              transition={{ repeat: Infinity, duration: 4.2, ease: "easeInOut" }}
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white clay-tile shadow-md rotate-8 cursor-pointer"
            >
              <MessageCircle size={20} className="text-sky-500" />
            </motion.div>

            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 3.8, ease: "easeInOut" }}
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white clay-tile shadow-md -rotate-4 cursor-pointer"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
                <Check size={16} strokeWidth={3} />
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }}
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white clay-tile shadow-md rotate-12 cursor-pointer"
            >
              <ShieldCheck size={20} className="text-blue-500" />
            </motion.div>

            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 4.0, ease: "easeInOut" }}
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white clay-tile shadow-md -rotate-8 cursor-pointer"
            >
              <Timer size={22} className="text-amber-500" />
            </motion.div>

            <motion.div
              animate={{ y: [0, 7, 0] }}
              transition={{ repeat: Infinity, duration: 3.6, ease: "easeInOut" }}
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white clay-tile shadow-md rotate-6 cursor-pointer"
            >
              <Zap size={20} className="text-amber-400 fill-amber-400" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 6. FOOTER (Matching Main Site Logo, Light Theme Only)          */}
      {/* ============================================================== */}
      <footer className="border-t border-black/[0.06] bg-white py-12 text-slate-500">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 group cursor-pointer">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-black text-white font-extrabold text-xs shadow-sm transition-transform group-hover:scale-105">
              L
            </span>
            <span className="text-sm font-bold tracking-tight text-[#09090B]">
              LocalWorker
            </span>
          </Link>

          <div className="flex items-center gap-6 text-xs font-medium text-slate-600">
            <Link to="/home" className="hover:text-black transition">
              Marketplace
            </Link>
            <Link to="/search" className="hover:text-black transition">
              Find Pros
            </Link>
            <Link to="/register" className="hover:text-black transition">
              Join as Pro
            </Link>
            <Link to="/register-agency" className="hover:text-black transition">
              Agency Hub
            </Link>
            <Link to="/voice-onboarding" className="hover:text-black transition">
              Voice Assistant
            </Link>
          </div>

          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} LocalWorker. Zero middleman fees.
          </p>
        </div>
      </footer>
    </div>
  );
}
