import { useState } from "react";
import { Download, Share, X } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

interface PWAInstallButtonProps {
  variant?: "menu-item" | "pill";
  onAction?: () => void;
}

export function PWAInstallButton({
  variant = "pill",
  onAction,
}: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    await install();
    onAction?.();
  };

  if (isInstallable) {
    if (variant === "menu-item") {
      return (
        <button
          type="button"
          onClick={() => void handleInstallClick()}
          className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-[#F4512C] transition hover:bg-[#FCEAE4]/60 dark:hover:bg-[#3A2018]/60 cursor-pointer text-left"
        >
          <Download size={14} className="shrink-0" />
          <span>Install Offline App</span>
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={() => void handleInstallClick()}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#F4512C]/35 bg-[#FCEAE4] dark:bg-[#3A2018] px-3.5 text-xs font-semibold text-[#F4512C] transition hover:bg-[#F4512C] hover:text-white cursor-pointer"
      >
        <Download size={13} />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        {variant === "menu-item" ? (
          <button
            type="button"
            onClick={() => setShowIOSGuide(true)}
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-[#F4512C] transition hover:bg-[#FCEAE4]/60 dark:hover:bg-[#3A2018]/60 cursor-pointer text-left"
          >
            <Share size={14} className="shrink-0" />
            <span>Add to Home Screen</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowIOSGuide(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] px-3.5 text-xs font-semibold text-[#141210] dark:text-[#FAFAFA] transition hover:border-[#F4512C]/50 cursor-pointer"
          >
            <Share size={13} className="text-[#F4512C]" />
            <span>Install on iOS</span>
          </button>
        )}

        {showIOSGuide && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
            onClick={() => setShowIOSGuide(false)}
          >
            <div
              className="w-full max-w-sm rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-6 shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#F4512C]">
                    Offline Ready
                  </p>
                  <h3
                    id="ios-install-title"
                    className="mt-1 text-lg font-extrabold text-[#141210] dark:text-[#FAFAFA]"
                  >
                    Install Builderco on iOS
                  </h3>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setShowIOSGuide(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[#EAE2DC] dark:border-white/10 text-[#6B645F] dark:text-[#9E958F] hover:text-[#141210] dark:hover:text-white cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>
              <ol className="space-y-2 text-xs sm:text-sm text-[#6B645F] dark:text-[#9E958F] list-decimal list-inside">
                <li>
                  Tap the <strong className="text-[#141210] dark:text-[#FAFAFA]">Share</strong> icon in Safari&apos;s toolbar.
                </li>
                <li>
                  Scroll down and tap{" "}
                  <strong className="text-[#141210] dark:text-[#FAFAFA]">Add to Home Screen</strong>.
                </li>
                <li>
                  Open Builderco anytime — your dashboard and saved contacts work even on weak signal.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => {
                  setShowIOSGuide(false);
                  onAction?.();
                }}
                className="w-full rounded-full bg-[#F4512C] hover:bg-[#E04320] py-2.5 text-xs font-bold text-white transition cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
