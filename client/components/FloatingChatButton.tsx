import { useLocation } from "react-router-dom";
import { PhoneCall } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useVoiceAssistant } from "@/lib/voice-assistant-context";

export default function FloatingChatButton() {
  const location = useLocation();
  const { t } = useLanguage();
  const { openCall, isOpen } = useVoiceAssistant();

  const hideOn = [
    "/login",
    "/join",
    "/register",
    "/register-agency",
    "/voice",
    "/voice-onboarding",
  ];
  if (
    isOpen ||
    hideOn.includes(location.pathname) ||
    location.pathname.startsWith("/register") ||
    location.pathname.startsWith("/join")
  ) {
    return null;
  }

  return (
    <aside
      aria-label={t("nav.voiceHelp")}
      className="fixed bottom-20 right-4 z-40 md:bottom-6 md:right-6"
    >
      <button
        type="button"
        onClick={() => openCall(true)}
        className="group flex h-11 items-center gap-2 rounded-full border border-[#EAE2DC] dark:border-white/15 bg-[#141210] dark:bg-white text-white dark:text-[#11100F] px-4 shadow-lg transition-all duration-200 hover:scale-[1.03] active:scale-95 cursor-pointer"
        aria-label={t("nav.voiceHelp")}
        title={t("nav.voiceHelp")}
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F4512C] text-white shrink-0">
          <PhoneCall size={13} />
        </span>
        <span className="text-xs font-bold tracking-tight">
          {t("nav.voiceHelp")}
        </span>
      </button>
    </aside>
  );
}
