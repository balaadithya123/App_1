import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Monitor,
  Smartphone,
  Search,
  UserCheck,
  Building2,
  Maximize2,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Zap,
  PhoneCall,
  X,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

export interface ScreenshotItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  imageSrc: string;
  deviceType: "desktop" | "mobile";
  badgeText: string;
  highlights: string[];
  hotspots?: Array<{
    x: number; // percentage from left
    y: number; // percentage from top
    label: string;
    description: string;
  }>;
}

const screenshotsData: ScreenshotItem[] = [
  {
    id: "platform",
    title: "Direct Marketplace Platform",
    subtitle: "Explore nearby verified local workers with zero commission markup",
    description:
      "Homeowners can browse local electricians, plumbers, carpenters, and technicians with transparent skill badges and live availability.",
    category: "Marketplace",
    imageSrc: "/screenshots/localworker_platform_mockup.jpg",
    deviceType: "desktop",
    badgeText: "Core Marketplace",
    highlights: [
      "100% Direct WhatsApp & Call Connect",
      "Government ID & Aadhaar Verified Badges",
      "Filter by Sector, Locality & Customer Ratings",
      "0% Middleman Commissions & Instant Access",
    ],
    hotspots: [
      {
        x: 18,
        y: 28,
        label: "Verified Badge",
        description: "Official Govt ID & Phone Verified status badge.",
      },
      {
        x: 65,
        y: 42,
        label: "Direct Connect",
        description: "One-click direct WhatsApp chat without payment walls.",
      },
      {
        x: 82,
        y: 18,
        label: "GPS Locality Match",
        description: "Real-time proximity matching to find pros within 2km.",
      },
    ],
  },
  {
    id: "mobile",
    title: "Mobile Direct Connect",
    subtitle: "Fast, tap-to-call mobile experience engineered for speed",
    description:
      "Clean mobile experience allowing homeowners to call or message local pros instantly right from their smartphones.",
    category: "Mobile App",
    imageSrc: "/screenshots/localworker_mobile_preview.jpg",
    deviceType: "mobile",
    badgeText: "Mobile Optimized",
    highlights: [
      "Tap-to-Call & WhatsApp Direct Dispatch",
      "Instant Callback Requests for Urgent Repairs",
      "Saved Pros & Circle for Quick Re-hiring",
      "Lightweight PWA with Offline Support",
    ],
    hotspots: [
      {
        x: 50,
        y: 35,
        label: "Direct Call Button",
        description: "Dial directly to the worker's personal phone number.",
      },
      {
        x: 50,
        y: 65,
        label: "Quick Callback Request",
        description: "Request an immediate callback if pro is currently on a job.",
      },
    ],
  },
  {
    id: "search",
    title: "Neighborhood Search Engine",
    subtitle: "Ranked search powered by distance, reviews, and verified skills",
    description:
      "Smart search interface with instant filter tags, distance sorting, and skill category chips designed for immediate problem solving.",
    category: "Search & Discovery",
    imageSrc: "/assets/images/resend_landing_mockup_search_1790167585835.jpg",
    deviceType: "desktop",
    badgeText: "Proximity Ranking",
    highlights: [
      "Filter by Specific Problem (Wiring, Leakage, Locks)",
      "Instant Availability Filter ('Available Today')",
      "Rating & Track Record Breakdown",
      "Multi-Locality Coverage Across Cities",
    ],
    hotspots: [
      {
        x: 25,
        y: 20,
        label: "Skill Category Chips",
        description: "Click to filter Electricians, Plumbers, Carpenters, Painters.",
      },
      {
        x: 75,
        y: 30,
        label: "Availability Tag",
        description: "Highlighted green badge for workers available within 30 minutes.",
      },
    ],
  },
  {
    id: "worker",
    title: "Verified Pro Profile & Portfolio",
    subtitle: "Comprehensive worker profile with photo gallery & track record",
    description:
      "Worker profile page showing past work photo portfolios, customer reviews, verified credentials, and completed job history.",
    category: "Worker Profile",
    imageSrc: "/assets/images/resend_landing_mockup_worker_1790167600025.jpg",
    deviceType: "desktop",
    badgeText: "Trust & Verification",
    highlights: [
      "Work Portfolio Photo Screening",
      "Authentic Customer Star Ratings & Reviews",
      "Agency Affiliation Badges (if applicable)",
      "Transparent Pricing & Skill Breakdown",
    ],
    hotspots: [
      {
        x: 30,
        y: 40,
        label: "Work Portfolio",
        description: "Real photos of past repair and installation work.",
      },
      {
        x: 80,
        y: 25,
        label: "Trust Score",
        description: "Aggregated rating calculated from verified client feedback.",
      },
    ],
  },
  {
    id: "agency",
    title: "Contractor & Agency Hub",
    subtitle: "Roster management for trade contractors and local agencies",
    description:
      "Agency portal allowing local repair companies to manage teams of technicians, handle incoming client callbacks, and maintain verified business profiles.",
    category: "Agency Portal",
    imageSrc: "/assets/images/resend_landing_mockup_agency_1790167614015.jpg",
    deviceType: "desktop",
    badgeText: "Agency Hub",
    highlights: [
      "Team Roster & Technician Management",
      "Verified Business Registration Certificate",
      "Direct Callback Queue & Service Dispatch",
      "Performance Analytics & Review Tracking",
    ],
    hotspots: [
      {
        x: 35,
        y: 30,
        label: "Technician Roster",
        description: "List of affiliated technicians managed under the agency.",
      },
      {
        x: 70,
        y: 20,
        label: "Agency Verification",
        description: "Special blue agency seal for registered contractor teams.",
      },
    ],
  },
];

export default function ScreenshotShowcase() {
  const [activeTab, setActiveTab] = useState<string>("platform");
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [fullscreenImage, setFullscreenImage] = useState<ScreenshotItem | null>(null);
  const [activeHotspot, setActiveHotspot] = useState<number | null>(null);

  const currentIndex = screenshotsData.findIndex((item) => item.id === activeTab);
  const activeItem = screenshotsData[currentIndex] || screenshotsData[0];

  // Auto-rotate tabs if playing
  useEffect(() => {
    if (!isPlaying || fullscreenImage) return;
    const interval = setInterval(() => {
      setActiveTab((prev) => {
        const idx = screenshotsData.findIndex((item) => item.id === prev);
        const nextIdx = (idx + 1) % screenshotsData.length;
        return screenshotsData[nextIdx].id;
      });
      setActiveHotspot(null);
    }, 6000);

    return () => clearInterval(interval);
  }, [isPlaying, fullscreenImage]);

  const handleNext = () => {
    const nextIdx = (currentIndex + 1) % screenshotsData.length;
    setActiveTab(screenshotsData[nextIdx].id);
    setActiveHotspot(null);
  };

  const handlePrev = () => {
    const prevIdx = (currentIndex - 1 + screenshotsData.length) % screenshotsData.length;
    setActiveTab(screenshotsData[prevIdx].id);
    setActiveHotspot(null);
  };

  return (
    <div className="w-full relative">
      {/* Tab Navigation Controls */}
      <div className="flex items-center justify-center mb-8">
        <div className="inline-flex items-center gap-1.5 p-1.5 rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-white/90 dark:bg-[#0D0D10]/90 backdrop-blur-md shadow-md overflow-x-auto max-w-full scrollbar-none">
          {screenshotsData.map((item) => {
            const isActive = item.id === activeTab;
            const Icon =
              item.id === "platform"
                ? Monitor
                : item.id === "mobile"
                ? Smartphone
                : item.id === "search"
                ? Search
                : item.id === "worker"
                ? UserCheck
                : Building2;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setActiveHotspot(null);
                }}
                className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? "text-white dark:text-black shadow-sm"
                    : "text-[#71717A] dark:text-[#A1A1AA] hover:text-[#09090B] dark:hover:text-white"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeScreenshotTab"
                    className="absolute inset-0 bg-[#09090B] dark:bg-white rounded-xl -z-10"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon size={15} />
                <span>{item.category}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Display Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Side: Screenshot View with Device Mockup */}
        <div className="lg:col-span-7 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeItem.id}
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -12 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="relative group"
            >
              {/* Outer Decorative Glow */}
              <div className="absolute -inset-2 bg-gradient-to-r from-blue-600/20 via-indigo-500/20 to-sky-400/20 rounded-[36px] blur-xl opacity-60 group-hover:opacity-90 transition duration-500 pointer-events-none" />

              {/* Desktop vs Mobile Device Wrapper */}
              {activeItem.deviceType === "mobile" ? (
                /* Smartphone Mockup Frame */
                <div className="mx-auto max-w-[300px] sm:max-w-[320px] rounded-[42px] border-[10px] border-[#09090B] dark:border-[#27272A] bg-[#09090B] shadow-2xl overflow-hidden relative">
                  {/* Speaker Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 h-5 w-28 bg-[#09090B] dark:bg-[#27272A] rounded-b-xl z-20 flex items-center justify-center">
                    <div className="h-1.5 w-12 bg-neutral-700 rounded-full" />
                  </div>

                  <div className="relative pt-6 aspect-[9/18] bg-slate-900 overflow-hidden">
                    <img
                      src={activeItem.imageSrc}
                      alt={activeItem.title}
                      className="w-full h-full object-cover object-top cursor-pointer transition-transform duration-500 group-hover:scale-105"
                      onClick={() => setFullscreenImage(activeItem)}
                    />

                    {/* Interactive Hotspots */}
                    {activeItem.hotspots?.map((hs, idx) => (
                      <div
                        key={idx}
                        style={{ left: `${hs.x}%`, top: `${hs.y}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 z-30"
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveHotspot(activeHotspot === idx ? null : idx);
                          }}
                          className="relative flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg animate-pulse hover:scale-125 transition-transform cursor-pointer"
                        >
                          <Sparkles size={12} />
                          <span className="absolute -inset-1 rounded-full bg-blue-400 opacity-75 animate-ping pointer-events-none" />
                        </button>

                        {/* Hotspot Popover Tooltip */}
                        {activeHotspot === idx && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.85, y: 5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="absolute bottom-8 left-1/2 -translate-x-1/2 w-48 rounded-xl bg-black/90 backdrop-blur-md p-3 text-white shadow-2xl border border-white/20 z-40 text-left"
                          >
                            <p className="text-xs font-bold text-blue-400">{hs.label}</p>
                            <p className="text-[10px] text-slate-300 mt-1 leading-snug">
                              {hs.description}
                            </p>
                          </motion.div>
                        )}
                      </div>
                    ))}

                    {/* Overlay Action Bar */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between p-2 rounded-xl bg-black/75 backdrop-blur-md text-white text-[11px] border border-white/10">
                      <span className="font-medium truncate">{activeItem.title}</span>
                      <button
                        type="button"
                        onClick={() => setFullscreenImage(activeItem)}
                        className="p-1 rounded-lg hover:bg-white/20 transition cursor-pointer"
                        title="View Fullscreen"
                      >
                        <Maximize2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Laptop / Desktop Frame */
                <div className="rounded-[28px] border border-black/[0.1] dark:border-white/[0.1] bg-white dark:bg-[#0D0D10] shadow-2xl overflow-hidden relative clay-card">
                  {/* Browser Header Bar */}
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-100 dark:bg-[#141416] border-b border-black/[0.06] dark:border-white/[0.08]">
                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-full bg-rose-500/80 inline-block" />
                      <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block" />
                      <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block" />
                    </div>

                    <div className="flex items-center gap-2 bg-white dark:bg-[#09090B] px-3 py-1 rounded-md text-[11px] font-mono text-slate-500 dark:text-slate-400 border border-black/[0.06] dark:border-white/[0.08] max-w-[220px] sm:max-w-xs truncate shadow-xs">
                      <ShieldCheck size={12} className="text-emerald-500 shrink-0" />
                      <span className="truncate">https://localworker.in/{activeItem.id}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setFullscreenImage(activeItem)}
                      className="text-slate-500 hover:text-black dark:hover:text-white transition cursor-pointer p-1"
                      title="Inspect Screenshot"
                    >
                      <Maximize2 size={14} />
                    </button>
                  </div>

                  {/* Screenshot Image View */}
                  <div className="relative aspect-[16/10] bg-slate-900 overflow-hidden group">
                    <img
                      src={activeItem.imageSrc}
                      alt={activeItem.title}
                      className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-102 cursor-pointer"
                      onClick={() => setFullscreenImage(activeItem)}
                    />

                    {/* Hotspots */}
                    {activeItem.hotspots?.map((hs, idx) => (
                      <div
                        key={idx}
                        style={{ left: `${hs.x}%`, top: `${hs.y}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 z-30"
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveHotspot(activeHotspot === idx ? null : idx);
                          }}
                          className="relative flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl hover:scale-125 transition-transform cursor-pointer"
                        >
                          <Sparkles size={14} />
                          <span className="absolute -inset-1 rounded-full bg-blue-400 opacity-75 animate-ping pointer-events-none" />
                        </button>

                        {/* Popover */}
                        {activeHotspot === idx && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.85, y: 5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="absolute bottom-9 left-1/2 -translate-x-1/2 w-52 rounded-xl bg-black/90 backdrop-blur-md p-3.5 text-white shadow-2xl border border-white/20 z-40 text-left"
                          >
                            <p className="text-xs font-bold text-blue-400">{hs.label}</p>
                            <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                              {hs.description}
                            </p>
                          </motion.div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Screenshot Navigation Floating Controls */}
          <div className="flex items-center justify-between mt-4 px-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrev}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#0D0D10] text-[#09090B] dark:text-white shadow-xs hover:bg-slate-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                aria-label="Previous screenshot"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#0D0D10] text-[#09090B] dark:text-white shadow-xs hover:bg-slate-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                aria-label="Next screenshot"
              >
                <ChevronRight size={16} />
              </button>
              <span className="text-xs font-semibold text-[#71717A] dark:text-[#A1A1AA] ml-1 font-mono">
                {currentIndex + 1} / {screenshotsData.length}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsPlaying((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#0D0D10] text-xs font-semibold text-[#71717A] dark:text-[#A1A1AA] hover:text-[#09090B] dark:hover:text-white transition cursor-pointer shadow-xs"
            >
              {isPlaying ? <Pause size={13} /> : <Play size={13} />}
              <span>{isPlaying ? "Auto Play On" : "Auto Play Paused"}</span>
            </button>
          </div>
        </div>

        {/* Right Side: Feature Details & Highlights */}
        <div className="lg:col-span-5 space-y-6">
          <motion.div
            key={activeItem.id + "-details"}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-4"
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40 text-xs font-bold">
              <Zap size={13} />
              <span>{activeItem.badgeText}</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#09090B] dark:text-[#FAFAFA]">
              {activeItem.title}
            </h3>

            <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
              {activeItem.subtitle}
            </p>

            <p className="text-xs text-[#71717A] dark:text-[#A1A1AA] leading-relaxed">
              {activeItem.description}
            </p>

            {/* Key Feature Checklist */}
            <div className="pt-2 space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Key Platform Capabilities
              </span>
              <div className="space-y-2">
                {activeItem.highlights.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.08 }}
                    className="flex items-center gap-2.5 text-xs font-semibold text-[#09090B] dark:text-white"
                  >
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <CheckCircle2 size={14} />
                    </div>
                    <span>{item}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Action Callout */}
            <div className="pt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setFullscreenImage(activeItem)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#09090B] hover:bg-neutral-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-black font-bold px-5 py-2.5 text-xs shadow-md transition cursor-pointer"
              >
                <Maximize2 size={14} />
                <span>Inspect Full Resolution</span>
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Fullscreen Lightbox Modal */}
      <AnimatePresence>
        {fullscreenImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4 sm:p-8"
            onClick={() => setFullscreenImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-5xl w-full max-h-[90vh] bg-[#09090B] rounded-3xl overflow-hidden border border-white/20 shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/50">
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {fullscreenImage.title}
                  </h4>
                  <p className="text-xs text-slate-400">{fullscreenImage.subtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFullscreenImage(null)}
                  className="p-2 rounded-full hover:bg-white/10 text-white transition cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Image View */}
              <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/80">
                <img
                  src={fullscreenImage.imageSrc}
                  alt={fullscreenImage.title}
                  className="max-h-[75vh] w-auto object-contain rounded-xl shadow-2xl border border-white/10"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
