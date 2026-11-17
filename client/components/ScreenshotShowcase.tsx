import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Monitor,
  Smartphone,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { Link } from "react-router-dom";

interface ScreenshotSlot {
  id: string;
  title: string;
  device: "desktop" | "mobile";
  dimension: string;
  description: string;
  features: string[];
}

const slots: ScreenshotSlot[] = [
  {
    id: "marketplace-desktop",
    title: "Marketplace Desktop View",
    device: "desktop",
    dimension: "1920 × 1080 (16:9)",
    description:
      "Wide desktop directory showcasing verified trade categories, live pro cards, and instant filter controls.",
    features: [
      "Instant trade category quick-filters",
      "Live verified pro cards with review badges",
      "Direct WhatsApp and telephone action triggers",
    ],
  },
  {
    id: "mobile-connect",
    title: "Mobile Direct Connect",
    device: "mobile",
    dimension: "1170 × 2532 (iPhone/Android)",
    description:
      "Streamlined on-the-go mobile interface optimized for tap-to-call, rapid WhatsApp chat, and urgent repair dispatches.",
    features: [
      "One-tap direct dial and WhatsApp messaging",
      "Proximity distance badge & ETA indicators",
      "Emergency callback request triggers",
    ],
  },
  {
    id: "worker-portfolio",
    title: "Verified Pro Portfolio & Credentials",
    device: "desktop",
    dimension: "1920 × 1080 (16:9)",
    description:
      "Detailed transparency profile with government ID verification seals, completed job photos, and customer feedback.",
    features: [
      "Government Aadhaar verification status",
      "Past work portfolio photo gallery",
      "Direct homeowner feedback & verified ratings",
    ],
  },
];

export default function ScreenshotShowcase() {
  const [activeTab, setActiveTab] = useState<string>("marketplace-desktop");
  const [uploadedImages, setUploadedImages] = useState<Record<string, string>>({});

  const activeSlot = slots.find((s) => s.id === activeTab) || slots[0];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, slotId: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setUploadedImages((prev) => ({ ...prev, [slotId]: objectUrl }));
    }
  };

  return (
    <div className="w-full text-[#141210] dark:text-[#FAFAFA]">
      {/* Device & View Selector Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
        {slots.map((slot) => {
          const isActive = activeTab === slot.id;
          const Icon = slot.device === "desktop" ? Monitor : Smartphone;

          return (
            <button
              key={slot.id}
              type="button"
              onClick={() => setActiveTab(slot.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                isActive
                  ? "bg-[#F4512C] text-white shadow-sm"
                  : "bg-white dark:bg-[#161514] text-[#6B645F] dark:text-[#9E958F] hover:text-[#141210] dark:hover:text-white border border-[#EAE2DC] dark:border-white/10 hover:border-[#F4512C]/40"
              }`}
            >
              <Icon size={16} />
              <span>{slot.title}</span>
            </button>
          );
        })}
      </div>

      {/* Main Display Frame Container */}
      <div className="max-w-5xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSlot.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 sm:p-8 shadow-sm"
          >
            {/* Mockup Header Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-[#EAE2DC] dark:border-white/10 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#F4512C]">
                    {activeSlot.device === "desktop" ? "Desktop Browser" : "Mobile Screen"}
                  </span>
                  <span className="text-[#8C847E] dark:text-[#766F6A]">·</span>
                  <span className="text-xs font-semibold text-[#6B645F] dark:text-[#9E958F]">
                    {activeSlot.dimension}
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-[#141210] dark:text-[#FAFAFA] mt-0.5">
                  {activeSlot.title}
                </h3>
              </div>

              {/* Upload Action Trigger */}
              <div className="flex items-center gap-2.5">
                <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#242220] hover:border-[#F4512C]/40 text-xs font-bold text-[#141210] dark:text-[#FAFAFA] transition cursor-pointer">
                  <Upload size={14} className="text-[#F4512C]" />
                  <span>{uploadedImages[activeSlot.id] ? "Change Screenshot" : "Upload Screenshot"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, activeSlot.id)}
                  />
                </label>
                <Link
                  to="/home"
                  className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-[#6B645F] dark:text-[#9E958F] hover:text-[#F4512C] transition"
                >
                  <span>View Live App</span>
                  <ExternalLink size={13} />
                </Link>
              </div>
            </div>

            {/* Mockup Frame Area */}
            <div className="mt-6">
              {activeSlot.device === "desktop" ? (
                /* Desktop Browser Frame */
                <div className="rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] overflow-hidden">
                  {/* Browser Bar */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-[#F5EFEA] dark:bg-[#1E1C1A] border-b border-[#EAE2DC] dark:border-white/10">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                      <span className="h-2.5 w-2.5 rounded-full bg-[#0F8A73]" />
                    </div>
                    <div className="px-4 py-1 rounded-full bg-white dark:bg-[#161514] border border-[#EAE2DC] dark:border-white/10 text-[11px] font-mono font-medium text-[#6B645F] dark:text-[#9E958F] w-64 text-center truncate">
                      https://builderco.vercel.app/home
                    </div>
                    <div className="w-10" />
                  </div>

                  {/* Screenshot Viewport / Placeholder */}
                  <div className="relative min-h-[380px] sm:min-h-[460px] flex items-center justify-center p-6 bg-white dark:bg-[#161514]">
                    {uploadedImages[activeSlot.id] ? (
                      <img
                        src={uploadedImages[activeSlot.id]}
                        alt={activeSlot.title}
                        className="w-full h-auto max-h-[520px] object-contain rounded-xl border border-[#EAE2DC] dark:border-white/10 shadow-sm"
                      />
                    ) : (
                      /* Clean, appealing placeholder frame */
                      <div className="w-full max-w-xl text-center border-2 border-dashed border-[#EAE2DC] dark:border-white/15 rounded-2xl p-10 sm:p-14 bg-[#FAF8F5] dark:bg-[#0B0A09] transition flex flex-col items-center justify-center">
                        <div className="h-14 w-14 rounded-2xl bg-[#FCEAE4] dark:bg-[#3A2018] flex items-center justify-center text-[#F4512C] mb-4">
                          <ImageIcon size={28} strokeWidth={1.5} />
                        </div>
                        <h4 className="text-base font-bold text-[#141210] dark:text-[#FAFAFA]">
                          Screenshot Placeholder
                        </h4>
                        <p className="text-xs font-medium text-[#6B645F] dark:text-[#9E958F] max-w-sm mt-1.5 leading-relaxed">
                          Space reserved for your real platform interface screenshot. Upload anytime using the button above.
                        </p>
                        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                          <span className="text-[11px] font-semibold text-[#6B645F] dark:text-[#9E958F] bg-white dark:bg-[#161514] px-3 py-1 rounded-full border border-[#EAE2DC] dark:border-white/10">
                            Recommended: 1920 × 1080 (JPG or PNG)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Mobile Phone Bezel Frame */
                <div className="flex justify-center py-4">
                  <div className="w-[300px] sm:w-[320px] rounded-[42px] border-[7px] border-[#141210] dark:border-[#2A2724] bg-[#141210] p-2.5 shadow-2xl">
                    <div className="rounded-[32px] overflow-hidden bg-white dark:bg-[#161514] min-h-[500px] flex flex-col">
                      {/* Notch / Dynamic Island */}
                      <div className="h-6 bg-white dark:bg-[#161514] flex items-center justify-center pt-2">
                        <div className="h-3.5 w-20 rounded-full bg-[#141210] dark:bg-[#0B0A09]" />
                      </div>

                      {/* Screen Content / Placeholder */}
                      <div className="flex-1 p-4 flex items-center justify-center bg-[#FAF8F5] dark:bg-[#0B0A09]">
                        {uploadedImages[activeSlot.id] ? (
                          <img
                            src={uploadedImages[activeSlot.id]}
                            alt={activeSlot.title}
                            className="w-full h-auto max-h-[460px] object-contain rounded-xl"
                          />
                        ) : (
                          <div className="w-full text-center border-2 border-dashed border-[#EAE2DC] dark:border-white/15 rounded-xl p-6 bg-white dark:bg-[#161514] flex flex-col items-center justify-center">
                            <div className="h-12 w-12 rounded-xl bg-[#FCEAE4] dark:bg-[#3A2018] flex items-center justify-center text-[#F4512C] mb-3">
                              <Smartphone size={22} strokeWidth={1.5} />
                            </div>
                            <h4 className="text-xs font-bold text-[#141210] dark:text-[#FAFAFA]">
                              Mobile Screenshot Slot
                            </h4>
                            <p className="text-[11px] font-medium text-[#6B645F] dark:text-[#9E958F] mt-1">
                              Tap "Upload Screenshot" to display mobile interface
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Feature Highlights Grid */}
            <div className="mt-6 pt-5 border-t border-[#EAE2DC] dark:border-white/10">
              <p className="text-[11px] font-bold text-[#F4512C] uppercase tracking-[0.12em] mb-3">
                Key Interface Highlights
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {activeSlot.features.map((feat, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 text-xs font-semibold text-[#141210] dark:text-[#FAFAFA] bg-[#FAF8F5] dark:bg-[#0B0A09] p-3 rounded-xl border border-[#EAE2DC] dark:border-white/10"
                  >
                    <CheckCircle2 size={15} className="text-[#0F8A73] dark:text-[#3DD1B3] shrink-0 mt-0.5" />
                    <span className="leading-snug">{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
