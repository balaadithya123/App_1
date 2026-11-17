import { useEffect, useRef, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useLanguage } from "@/lib/i18n";

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const { t } = useLanguage();
  const wasOffline = useRef(false);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true;
      setJustReconnected(false);
      return;
    }

    if (wasOffline.current) {
      wasOffline.current = false;
      setJustReconnected(true);
      const timer = window.setTimeout(() => setJustReconnected(false), 3200);
      return () => window.clearTimeout(timer);
    }
  }, [isOnline]);

  if (isOnline && !justReconnected) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-20 md:bottom-5 left-4 z-50 flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold shadow-lg backdrop-blur-md transition-all ${
        !isOnline
          ? "border-amber-500/35 bg-[#141210]/95 text-[#FAFAFA] dark:bg-[#24201C]/95"
          : "border-[#0F8A73]/35 bg-[#0F8A73] text-white"
      }`}
    >
      {!isOnline ? (
        <>
          <WifiOff size={13} className="text-amber-400 shrink-0" />
          <span>{t("offline.banner")}</span>
        </>
      ) : (
        <>
          <Wifi size={13} className="shrink-0" />
          <span>{t("offline.restored")}</span>
        </>
      )}
    </div>
  );
}
