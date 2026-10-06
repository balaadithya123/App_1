import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  motion,
  AnimatePresence,
  Variants,
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
  Phone,
  Wrench,
  Hammer,
  Paintbrush,
  Wind,
  Layers,
  XCircle,
  Users,
  Building2,
  Flame,
  CheckCircle,
} from "lucide-react";
import ScreenshotShowcase from "@/components/ScreenshotShowcase";
import Hero3DCanvas from "@/components/Hero3DCanvas";

// Smooth viewport animation variant inspired by Apple product pages
const fadeInUpVariant: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: (custom = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      delay: custom * 0.1,
    },
  }),
};

// Sample Pros for Interactive Hero Pro Card Switcher
const samplePros = [
  {
    id: "electrician",
    name: "Ramesh Sharma",
    avatar: "RS",
    role: "Licensed Master Electrician",
    experience: "8 Years Exp",
    locality: "Indiranagar",
    distance: "1.2 km away",
    eta: "~15 mins",
    rating: 4.9,
    reviewsCount: 142,
    badge: "Govt Aadhaar Verified",
    recentJob: "Power Panel & Wiring Overhaul",
  },
  {
    id: "plumber",
    name: "Suresh Kumar",
    avatar: "SK",
    role: "Expert Plumbing Contractor",
    experience: "10 Years Exp",
    locality: "Koramangala",
    distance: "0.8 km away",
    eta: "~10 mins",
    rating: 4.95,
    reviewsCount: 189,
    badge: "Govt Aadhaar Verified",
    recentJob: "Emergency Pipe Leak Repair",
  },
  {
    id: "carpenter",
    name: "Fatima Bano",
    avatar: "FB",
    role: "Master Woodwork & Furniture Pro",
    experience: "6 Years Exp",
    locality: "HSR Layout",
    distance: "1.5 km away",
    eta: "~20 mins",
    rating: 4.88,
    reviewsCount: 96,
    badge: "Govt Aadhaar Verified",
    recentJob: "Modular Kitchen Cabinet Installation",
  },
];

// Trade Specialties for Interactive Bento Grid
const tradeSpecialties = [
  {
    id: "electrical",
    title: "Electrical & Power",
    count: "1,240+ Pros Nearby",
    eta: "15 min dispatch",
    icon: Zap,
    color: "bg-amber-500",
    gradient: "from-amber-500/10 via-amber-500/5 to-transparent",
    description: "Short circuits, DB box upgrades, inverter setups, and heavy fixture wiring.",
    popularSkills: ["Short Circuit Repair", "MCB Box Replacement", "3-Phase Wiring"],
  },
  {
    id: "plumbing",
    title: "Plumbing & Drainage",
    count: "980+ Pros Nearby",
    eta: "12 min dispatch",
    icon: Wrench,
    color: "bg-blue-500",
    gradient: "from-blue-500/10 via-blue-500/5 to-transparent",
    description: "Pipe leak emergencies, pressure pumps, bathroom fittings, and drain clearing.",
    popularSkills: ["Pipe Leak Fitting", "Water Heater Installation", "Drainage Unclogging"],
  },
  {
    id: "woodwork",
    title: "Carpentry & Furniture",
    count: "750+ Pros Nearby",
    eta: "25 min dispatch",
    icon: Hammer,
    color: "bg-orange-500",
    gradient: "from-orange-500/10 via-orange-500/5 to-transparent",
    description: "Modular kitchen assembly, door lock fitting, wardrobe repairs, and custom furniture.",
    popularSkills: ["Modular Cabinets", "Door Lock & Hinges", "Custom Woodwork"],
  },
  {
    id: "ac-repair",
    title: "AC & Refrigeration",
    count: "610+ Pros Nearby",
    eta: "20 min dispatch",
    icon: Wind,
    color: "bg-cyan-500",
    gradient: "from-cyan-500/10 via-cyan-500/5 to-transparent",
    description: "Jet pressure servicing, gas leak top-ups, inverter AC PCB repair, and cooling fixes.",
    popularSkills: ["AC Deep Cleaning", "Freon Gas Refill", "Compressor Servicing"],
  },
  {
    id: "painting",
    title: "Painting & Waterproofing",
    count: "520+ Pros Nearby",
    eta: "Same-Day Survey",
    icon: Paintbrush,
    color: "bg-purple-500",
    gradient: "from-purple-500/10 via-purple-500/5 to-transparent",
    description: "Interior wall repainting, dampness waterproofing treatment, and texture coats.",
    popularSkills: ["Interior Repaint", "Wall Damp Proofing", "Texture Wall Art"],
  },
  {
    id: "appliances",
    title: "Home Appliances",
    count: "430+ Pros Nearby",
    eta: "30 min dispatch",
    icon: Sparkles,
    color: "bg-emerald-500",
    gradient: "from-emerald-500/10 via-emerald-500/5 to-transparent",
    description: "Washing machine motor repair, microwave troubleshooting, and chimney cleaning.",
    popularSkills: ["Washing Machine Motor", "Kitchen Chimney Servicing", "RO Water Filter"],
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  // Enforce light background theme specifically for Landing Page
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

  const [activeHeroPro, setActiveHeroPro] = useState<string>("electrician");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [selectedPlan, setSelectedPlan] = useState<"homeowner" | "pro" | "agency">("pro");
  const [activeStep, setActiveStep] = useState<number>(1);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [hoveredTrade, setHoveredTrade] = useState<string | null>(null);

  const selectedHeroPro = samplePros.find((p) => p.id === activeHeroPro) || samplePros[0];

  const howItWorksSteps = [
    {
      step: 1,
      title: "1. Search Neighborhood Pros",
      subtitle: "Enter locality or select trade category",
      description:
        "Instant proximity matching surfaces Aadhaar background-checked pros operating directly in your local pincode.",
      icon: Search,
      highlight: "Proximity Matching",
    },
    {
      step: 2,
      title: "2. Inspect Verified Credentials",
      subtitle: "Check Govt Aadhaar ID badges & portfolio gallery",
      description:
        "Every pro's official ID screening status, homeowner review ratings, completed job history, and verified skill badges are 100% transparent.",
      icon: BadgeCheck,
      highlight: "100% Aadhaar Verified",
    },
    {
      step: 3,
      title: "3. Direct WhatsApp or Call",
      subtitle: "Instant 1-tap connection with zero middleman delay",
      description:
        "Message directly on WhatsApp or call immediately on their direct line. No call centers, no queue wait times, and zero booking markups.",
      icon: MessageCircle,
      highlight: "Direct Connection",
    },
    {
      step: 4,
      title: "4. Pay Directly Upon Job Completion",
      subtitle: "Direct fair wage with 100% satisfaction",
      description:
        "Pay the technician directly after inspecting the finished work. Workers keep 100% of their earnings with zero platform deductions.",
      icon: CheckCircle2,
      highlight: "0% Commission Deductions",
    },
  ];

  const comparisonPoints = [
    {
      feature: "Platform Middleman Cut",
      traditional: "20% – 30% extracted from worker wage",
      localworker: "0% Commission · Pros keep 100%",
    },
    {
      feature: "Customer Connection",
      traditional: "Hidden phone numbers & automated chatbots",
      localworker: "Direct WhatsApp & Instant Phone Call",
    },
    {
      feature: "Arrival & Dispatch Speed",
      traditional: "2 – 4 hour rigid slot windows",
      localworker: "~15 Mins direct neighborhood dispatch",
    },
    {
      feature: "Identity & Background Check",
      traditional: "Third-party outsourced screening",
      localworker: "Direct Govt Aadhaar & Phone verified",
    },
    {
      feature: "Pricing Transparency",
      traditional: "Surprise booking platform surcharges",
      localworker: "Upfront agreed rates directly with worker",
    },
  ];

  const testimonials = [
    {
      quote:
        "Called Ramesh for an emergency water pipe leak in Indiranagar. He arrived in 15 minutes, fixed the issue cleanly, and charged the standard fair rate directly.",
      author: "Priya Sundaram",
      role: "Homeowner in Indiranagar",
      rating: 5,
    },
    {
      quote:
        "As an electrician, other apps took 25% of my daily wage. On LocalWorker, clients call me directly on WhatsApp and I keep every rupee I earn.",
      author: "Murugan K.",
      role: "Master Electrician (8 Yrs Exp)",
      rating: 5,
    },
    {
      quote:
        "Finding reliable carpenters used to take days of asking neighbors. Here I inspected portfolio photos and verified ID in seconds. Super simple.",
      author: "Anand Ranganathan",
      role: "Homeowner in HSR Layout",
      rating: 5,
    },
  ];

  const faqs = [
    {
      q: "Is LocalWorker free to use for households?",
      a: "Yes! Searching for local professionals, inspecting verified credentials, viewing portfolio project photos, and connecting via WhatsApp or direct phone is 100% free with zero platform surcharges.",
    },
    {
      q: "How are workers and service contractors verified?",
      a: "Every professional undergoes telephone screening, government Aadhaar ID verification, and portfolio work screening before earning the verified pro badge in search results.",
    },
    {
      q: "Does LocalWorker take a commission cut from workers?",
      a: "No! Unlike legacy platforms that extract 20–30% of a worker's hard-earned income, LocalWorker operates on an open direct-connection model. Pros keep 100% of their earnings.",
    },
    {
      q: "Can service agencies register multi-technician teams?",
      a: "Yes! Service agencies and trade contracting firms can register under the Agency Hub to manage technician rosters and receive direct neighborhood lead callbacks.",
    },
    {
      q: "How do I request a callback if a worker is currently busy?",
      a: "Each worker profile features a direct 'Request Callback' button. Homeowners can submit their phone number and task description for a prompt callback as soon as the pro is available.",
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
      className="min-h-screen bg-[#FAFAFA] text-[#09090B] font-sans selection:bg-emerald-100 selection:text-emerald-900 relative overflow-x-hidden"
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
        } as React.CSSProperties
      }
    >
      {/* Dynamic Background Ambient Light Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 opacity-40">
        <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-radial from-emerald-300/30 via-emerald-100/10 to-transparent blur-3xl animate-pulse" />
        <div className="absolute top-[40%] right-[-10%] w-[600px] h-[600px] rounded-full bg-radial from-blue-300/20 via-cyan-100/10 to-transparent blur-3xl" />
      </div>

      {/* TOP HEADER / NAVBAR */}
      <header className="sticky top-0 z-50 w-full border-b border-[#E4E4E7]/80 bg-white/85 backdrop-blur-xl transition-all duration-300">
        <div className="mx-auto flex h-16 sm:h-20 max-w-6xl items-center justify-between px-4 sm:px-6">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group cursor-pointer">
            <motion.span
              whileHover={{ rotate: 8, scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-black text-white font-extrabold text-sm shadow-sm"
            >
              L
            </motion.span>
            <span className="text-base sm:text-lg font-bold tracking-tight text-[#09090B]">
              LocalWorker
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-[#52525B]">
            <a href="#trades" className="hover:text-[#09090B] transition-colors">
              Specialties
            </a>
            <a href="#how-it-works" className="hover:text-[#09090B] transition-colors">
              How It Works
            </a>
            <a href="#why-choose" className="hover:text-[#09090B] transition-colors">
              Why Direct
            </a>
            <a href="#screenshots" className="hover:text-[#09090B] transition-colors">
              App Preview
            </a>
            <a href="#pricing" className="hover:text-[#09090B] transition-colors">
              Pricing
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
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}>
              <Link
                to="/home"
                className="inline-flex items-center justify-center rounded-full bg-[#09090B] hover:bg-neutral-800 text-white px-4 sm:px-5 py-2 text-xs sm:text-sm font-bold shadow-sm transition cursor-pointer"
              >
                <span>Explore Marketplace</span>
                <ChevronRight size={14} className="ml-1" />
              </Link>
            </motion.div>
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 1. HERO SECTION WITH 3D CANVAS & INTERACTIVE SWITCHER           */}
      {/* ============================================================== */}
      <section className="relative pt-10 pb-16 md:pt-20 md:pb-28 max-w-6xl mx-auto px-4 sm:px-6 z-10">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUpVariant}
          custom={0}
          className="text-center max-w-3xl mx-auto space-y-4"
        >
          {/* Editorial Kicker Badge */}
          <div className="flex justify-center mb-3">
            <motion.div
              whileHover={{ scale: 1.03 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/90 text-xs font-bold text-emerald-900 shadow-2xs backdrop-blur-md cursor-default"
            >
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="font-extrabold text-[#09090B]">Direct Neighborhood Network</span>
              <span aria-hidden="true" className="text-emerald-300">·</span>
              <span>0% Broker Fees</span>
              <span aria-hidden="true" className="text-emerald-300">·</span>
              <span>100% Aadhaar Verified</span>
            </motion.div>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-[#09090B] leading-[1.08]">
            Find and hire <br />
            <span className="bg-gradient-to-r from-zinc-900 via-zinc-700 to-emerald-800 bg-clip-text text-transparent font-extrabold">
              verified local pros.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-[#52525B] max-w-2xl mx-auto font-normal pt-2 leading-relaxed">
            The direct community marketplace connecting homeowners with verified electricians, plumbers, carpenters, and technicians. One-tap WhatsApp chat and phone calling with zero middleman markup.
          </p>

          {/* Action CTAs */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-3.5">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                to="/home"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#09090B] hover:bg-neutral-800 text-white font-bold px-7 py-3.5 text-sm sm:text-base shadow-md transition cursor-pointer"
              >
                <span>Explore Marketplace</span>
                <ArrowRight size={16} />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                to="/join"
                className="inline-flex items-center gap-2 rounded-2xl border border-[#E4E4E7] bg-white hover:bg-zinc-100 text-[#09090B] font-bold px-6 py-3.5 text-sm sm:text-base shadow-2xs transition cursor-pointer"
              >
                <span>Join as a Worker</span>
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {/* 3D INTERACTIVE HERO CANVAS */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUpVariant}
          custom={2}
          className="mt-10 max-w-3xl mx-auto"
        >
          <Hero3DCanvas />
        </motion.div>

        {/* HERO INTERACTIVE SHOWCASE CARD: Switch sample pros live */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUpVariant}
          custom={3}
          className="mt-8 max-w-2xl mx-auto"
        >
          <div className="rounded-[28px] border border-[#E4E4E7] bg-white/95 p-6 sm:p-8 shadow-xl backdrop-blur-md relative overflow-hidden">
            {/* Live Sample Pro Switcher Tabs */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 gap-2 overflow-x-auto">
              <span className="text-xs font-bold text-[#71717A] uppercase tracking-wider shrink-0">
                Live Pro Preview:
              </span>
              <div className="flex items-center gap-1.5">
                {samplePros.map((pro) => {
                  const isActive = activeHeroPro === pro.id;
                  return (
                    <button
                      key={pro.id}
                      type="button"
                      onClick={() => setActiveHeroPro(pro.id)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? "bg-[#09090B] text-white shadow-xs"
                          : "bg-zinc-100 text-[#52525B] hover:text-[#09090B]"
                      }`}
                    >
                      {pro.name.split(" ")[0]} ({pro.id})
                    </button>
                  );
                })}
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={selectedHeroPro.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="pt-4"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
                  <div className="flex items-center gap-3.5">
                    <div className="relative">
                      <div className="h-14 w-14 rounded-2xl bg-[#09090B] text-white flex items-center justify-center font-extrabold text-lg shadow-sm">
                        {selectedHeroPro.avatar}
                      </div>
                      <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-extrabold text-[#09090B]">
                          {selectedHeroPro.name}
                        </h3>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <ShieldCheck size={13} className="text-emerald-600" />
                          <span>{selectedHeroPro.badge}</span>
                        </span>
                      </div>
                      <p className="text-xs text-[#52525B] font-medium mt-0.5">
                        {selectedHeroPro.role} · {selectedHeroPro.experience}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#09090B] bg-zinc-50 px-3.5 py-1.5 rounded-full border border-[#E4E4E7]">
                    <Star size={13} className="text-amber-500 fill-amber-500" />
                    <span>{selectedHeroPro.rating}</span>
                    <span className="text-[#71717A] font-normal">
                      ({selectedHeroPro.reviewsCount} reviews)
                    </span>
                  </div>
                </div>

                {/* Pro Details Grid */}
                <div className="py-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-zinc-50/80 p-3.5 rounded-2xl border border-zinc-100">
                  <div className="flex items-center gap-2 text-[#52525B] font-medium">
                    <MapPin size={15} className="text-[#71717A] shrink-0" />
                    <span>{selectedHeroPro.locality} · {selectedHeroPro.distance}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#52525B] font-medium">
                    <Clock size={15} className="text-[#71717A] shrink-0" />
                    <span>Dispatch {selectedHeroPro.eta}</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-800 font-bold">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span>Recent: {selectedHeroPro.recentJob}</span>
                  </div>
                </div>

                {/* Pro Action Buttons */}
                <div className="pt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Link
                      to="/home"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#09090B] hover:bg-neutral-800 text-white px-4 py-2 text-xs font-bold transition shadow-2xs active:scale-95"
                    >
                      <PhoneCall size={13} />
                      <span>Direct Call</span>
                    </Link>
                    <Link
                      to="/home"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#128C7E] hover:bg-[#075E54] text-white px-4 py-2 text-xs font-bold transition shadow-2xs active:scale-95"
                    >
                      <MessageCircle size={13} />
                      <span>WhatsApp Chat</span>
                    </Link>
                  </div>

                  <span className="text-[11px] font-semibold text-[#52525B]">
                    0% Middleman cut · Direct Fair Wage
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </section>

      {/* ============================================================== */}
      {/* 2. APPLE-INSPIRED BENTO GRID TRADE SPECIALTIES SHOWCASE        */}
      {/* ============================================================== */}
      <section id="trades" className="py-16 md:py-24 max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUpVariant}
          className="text-center max-w-2xl mx-auto space-y-2 mb-14"
        >
          <span className="text-xs font-bold uppercase tracking-widest text-[#71717A]">
            Neighborhood Specialties
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#09090B]">
            Whatever you need fixed. <br />
            <span className="text-[#71717A]">Right in your locality.</span>
          </h2>
          <p className="text-sm sm:text-base text-[#52525B] font-medium">
            Explore verified trade pros ready for direct 1-tap dispatch in your sector.
          </p>
        </motion.div>

        {/* Interactive Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tradeSpecialties.map((trade, idx) => {
            const Icon = trade.icon;
            const isHovered = hoveredTrade === trade.id;

            return (
              <motion.div
                key={trade.id}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeInUpVariant}
                custom={idx}
                onMouseEnter={() => setHoveredTrade(trade.id)}
                onMouseLeave={() => setHoveredTrade(null)}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className={`rounded-[28px] border border-[#E4E4E7] bg-white p-6 sm:p-7 shadow-xs hover:shadow-xl transition-all duration-300 relative overflow-hidden flex flex-col justify-between group cursor-pointer`}
                onClick={() => navigate(`/home?category=${trade.id}`)}
              >
                {/* Subtle Hover Gradient Glow */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${trade.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}
                />

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`h-12 w-12 rounded-2xl ${trade.color} text-white flex items-center justify-center shadow-md transition-transform duration-300 group-hover:scale-110`}
                    >
                      <Icon size={22} />
                    </div>
                    <span className="text-[11px] font-extrabold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                      {trade.eta}
                    </span>
                  </div>

                  <h3 className="text-xl font-extrabold text-[#09090B] tracking-tight group-hover:text-black">
                    {trade.title}
                  </h3>
                  <p className="text-xs text-[#52525B] font-medium mt-1.5 leading-relaxed">
                    {trade.description}
                  </p>

                  {/* Skill Badges */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {trade.popularSkills.map((skill, sIdx) => (
                      <span
                        key={sIdx}
                        className="text-[10px] font-bold text-zinc-600 bg-zinc-100 px-2.5 py-1 rounded-lg border border-zinc-200/80"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between text-xs">
                  <span className="font-extrabold text-[#09090B]">{trade.count}</span>
                  <span className="font-bold text-emerald-700 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>Find Pros</span>
                    <ChevronRight size={14} />
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ============================================================== */}
      {/* 3. LIVE METRICS & IMPACT COUNTERS                              */}
      {/* ============================================================== */}
      <section className="py-12 bg-white border-y border-[#E4E4E7] relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: "5,000+", label: "Verified Local Pros", color: "text-[#09090B]" },
              { value: "0%", label: "Middleman Fees", color: "text-emerald-800" },
              { value: "< 15 Mins", label: "Avg Dispatch Time", color: "text-[#09090B]" },
              { value: "4.9 ★", label: "Homeowner Rating", color: "text-amber-600" },
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeInUpVariant}
                custom={idx}
                className="p-5 rounded-2xl bg-zinc-50/70 border border-[#E4E4E7] shadow-2xs hover:shadow-xs transition-all"
              >
                <p className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${stat.color}`}>
                  {stat.value}
                </p>
                <p className="text-xs font-bold text-[#52525B] mt-1.5">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 4. WHY DIRECT: COMPARISON MATRIX                              */}
      {/* ============================================================== */}
      <section id="why-choose" className="py-16 md:py-24 max-w-5xl mx-auto px-4 sm:px-6 z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUpVariant}
          className="text-center max-w-2xl mx-auto space-y-2 mb-12"
        >
          <span className="text-xs font-bold uppercase tracking-wider text-[#71717A]">
            Direct Model vs Traditional Apps
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#09090B]">
            Why homeowners & pros switch
          </h2>
          <p className="text-sm sm:text-base text-[#52525B] font-medium">
            We removed the broker middleman so you get faster service and workers earn 100% of their wages.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUpVariant}
          className="rounded-3xl border border-[#E4E4E7] bg-white overflow-hidden shadow-sm"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 bg-zinc-50 border-b border-[#E4E4E7] p-4 text-xs font-bold text-[#52525B]">
            <div className="hidden md:block">Key Comparison</div>
            <div className="hidden md:block text-zinc-500">Traditional Middleman Platforms</div>
            <div className="hidden md:block text-[#09090B] font-extrabold">LocalWorker Direct Network</div>
          </div>

          <div className="divide-y divide-[#E4E4E7]">
            {comparisonPoints.map((point, idx) => (
              <motion.div
                key={idx}
                whileHover={{ backgroundColor: "rgba(244, 244, 245, 0.6)" }}
                className="grid grid-cols-1 md:grid-cols-3 p-4 sm:p-5 gap-3 items-center transition-colors"
              >
                <div className="font-bold text-xs sm:text-sm text-[#09090B]">
                  {point.feature}
                </div>
                <div className="flex items-center gap-2 text-xs text-[#71717A]">
                  <XCircle size={15} className="text-rose-500 shrink-0" />
                  <span>{point.traditional}</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-900 bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>{point.localworker}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ============================================================== */}
      {/* 5. INTERACTIVE HOW IT WORKS STEPPER                            */}
      {/* ============================================================== */}
      <section id="how-it-works" className="py-16 md:py-24 max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUpVariant}
          className="text-center max-w-2xl mx-auto space-y-2 mb-12"
        >
          <span className="text-xs font-bold uppercase tracking-wider text-[#71717A]">
            Simple Process
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#09090B]">
            How LocalWorker works
          </h2>
          <p className="text-sm sm:text-base text-[#52525B] font-medium">
            Four simple steps from finding a problem to getting it resolved.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Step Selector Buttons with Active Connector Indicator */}
          <div className="lg:col-span-5 space-y-3 relative">
            {howItWorksSteps.map((step) => {
              const isActive = activeStep === step.step;
              const StepIcon = step.icon;

              return (
                <button
                  key={step.step}
                  type="button"
                  onClick={() => setActiveStep(step.step)}
                  className={`w-full text-left p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-start gap-4 relative overflow-hidden ${
                    isActive
                      ? "bg-white border-2 border-[#09090B] shadow-md"
                      : "bg-white border-[#E4E4E7] hover:border-zinc-400"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-step-bar"
                      className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#09090B]"
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    />
                  )}
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 font-bold text-sm transition-colors ${
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
                    initial={{ opacity: 0, scale: 0.98, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: -15 }}
                    transition={{ duration: 0.3 }}
                    className="rounded-[28px] bg-white p-7 sm:p-10 border border-[#E4E4E7] shadow-md relative overflow-hidden"
                  >
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 mb-4">
                      <CheckCircle2 size={14} className="text-emerald-600" />
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
      {/* 6. APP SCREENSHOTS SHOWCASE                                   */}
      {/* ============================================================== */}
      <section id="screenshots" className="py-16 md:py-24 max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUpVariant}
          className="text-center max-w-2xl mx-auto space-y-2 mb-12"
        >
          <span className="text-xs font-bold uppercase tracking-wider text-[#71717A]">
            App Experience
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#09090B]">
            Interactive app screenshots
          </h2>
          <p className="text-sm sm:text-base text-[#52525B] font-medium">
            A preview of the LocalWorker interface across desktop and mobile devices.
          </p>
        </motion.div>

        <ScreenshotShowcase />
      </section>

      {/* ============================================================== */}
      {/* 7. SOCIAL PROOF & TESTIMONIALS                                 */}
      {/* ============================================================== */}
      <section className="py-16 md:py-24 bg-white border-y border-[#E4E4E7]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUpVariant}
            className="text-center max-w-2xl mx-auto space-y-2 mb-12"
          >
            <span className="text-xs font-bold uppercase tracking-wider text-[#71717A]">
              Community Stories
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#09090B]">
              Trusted by 12,000+ households
            </h2>
            <p className="text-sm sm:text-base text-[#52525B] font-medium">
              Real feedback from local residents and verified trade professionals.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, idx) => (
              <motion.div
                key={idx}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeInUpVariant}
                custom={idx}
                whileHover={{ y: -5 }}
                className="rounded-2xl border border-[#E4E4E7] bg-zinc-50/60 p-6 flex flex-col justify-between shadow-2xs hover:shadow-md transition-all duration-200"
              >
                <div>
                  <div className="flex items-center gap-1 mb-3">
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} size={14} className="text-amber-500 fill-amber-500" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-[#09090B] leading-relaxed font-medium">
                    "{t.quote}"
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-200">
                  <p className="text-xs font-bold text-[#09090B]">{t.author}</p>
                  <p className="text-[11px] text-[#71717A] font-medium">{t.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 8. TRANSPARENT PRICING PLANS WITH SPRING SWITCHER               */}
      {/* ============================================================== */}
      <section id="pricing" className="py-16 md:py-24 max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUpVariant}
          className="text-center max-w-2xl mx-auto space-y-2 mb-12"
        >
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
              className={`text-xs font-bold transition-colors ${
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
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-zinc-200 transition-colors cursor-pointer"
              aria-label="Toggle annual billing"
            >
              <motion.span
                layout
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className={`inline-block h-4 w-4 rounded-full bg-[#09090B] ${
                  billingCycle === "annual" ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span
              className={`text-xs font-bold transition-colors ${
                billingCycle === "annual" ? "text-[#09090B]" : "text-[#71717A]"
              }`}
            >
              Annual <span className="text-[11px] text-emerald-800 font-extrabold">(Save 20%)</span>
            </span>
          </div>
        </motion.div>

        {/* 3 Interactive Plan Cards */}
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
                {/* Selected Badge */}
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[11px] font-extrabold px-3.5 py-1 rounded-full shadow-md uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Sparkles size={12} />
                    <span>{plan.badge} · Selected</span>
                  </motion.div>
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
                    className={`w-full inline-flex items-center justify-center rounded-xl py-3 text-sm font-extrabold transition shadow-sm cursor-pointer active:scale-95 ${
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
      {/* 9. FREQUENTLY ASKED QUESTIONS                                 */}
      {/* ============================================================== */}
      <section id="faq" className="py-16 md:py-24 max-w-4xl mx-auto px-4 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUpVariant}
          className="text-center space-y-2 mb-12"
        >
          <span className="text-xs font-bold uppercase tracking-wider text-[#71717A]">
            FAQ
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#09090B]">
            Frequently asked questions
          </h2>
        </motion.div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <motion.div
                key={idx}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeInUpVariant}
                custom={idx}
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
                      transition={{ duration: 0.25 }}
                    >
                      <div className="px-5 pb-5 text-xs sm:text-sm text-[#52525B] leading-relaxed border-t border-zinc-100 pt-3 font-medium">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ============================================================== */}
      {/* 10. CALL TO ACTION BANNER                                      */}
      {/* ============================================================== */}
      <section className="py-16 max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUpVariant}
          className="rounded-[32px] bg-[#09090B] p-8 sm:p-14 text-white shadow-2xl relative overflow-hidden"
        >
          <div className="relative z-10 max-w-2xl space-y-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-300 bg-white/10 px-3 py-1 rounded-full border border-white/15">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span>Direct Neighborhood Network</span>
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Ready to find trusted local pros in your neighborhood?
            </h2>
            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed pt-1 font-medium">
              Connect with verified electricians, plumbers, carpenters, and technicians near you with zero broker fees.
            </p>

            <div className="pt-4 flex flex-wrap items-center gap-4">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  to="/home"
                  className="inline-flex items-center gap-2 rounded-2xl bg-white hover:bg-neutral-100 text-[#09090B] font-bold px-7 py-3.5 text-sm shadow-md transition cursor-pointer"
                >
                  <span>Explore Marketplace</span>
                  <ArrowRight size={16} />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  to="/join"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/20 hover:bg-white/10 text-white font-bold px-6 py-3.5 text-sm transition cursor-pointer"
                >
                  <span>Join as Service Pro</span>
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ============================================================== */}
      {/* 11. FOOTER                                                     */}
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
