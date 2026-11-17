import { useEffect, useRef, useState } from "react";
import { Check, Globe, ChevronDown } from "lucide-react";
import { SUPPORTED_LANGUAGES, useLanguage } from "@/lib/i18n";

interface LanguageSelectorProps {
  variant?: "topbar" | "menu";
  onSelect?: () => void;
}

export function LanguageSelector({
  variant = "topbar",
  onSelect,
}: LanguageSelectorProps) {
  const { language, setLanguage, languageMeta, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  if (variant === "menu") {
    return (
      <div className="px-2.5 py-2">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#6B645F] dark:text-[#9E958F]">
          <Globe size={12} className="text-[#F4512C]" />
          <span>{t("menu.language")}</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const active = language === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => {
                  setLanguage(lang.code);
                  onSelect?.();
                }}
                className={`rounded-xl border px-2 py-1.5 text-[11px] font-bold transition cursor-pointer truncate ${
                  active
                    ? "border-[#F4512C] bg-[#F4512C] text-white"
                    : "border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] text-[#141210] dark:text-[#FAFAFA] hover:border-[#F4512C]/50"
                }`}
              >
                {lang.nativeName}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("menu.language")}
        aria-expanded={open}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#EAE2DC] dark:border-white/10 bg-white/80 dark:bg-[#161514]/80 px-2.5 sm:px-3 text-xs font-semibold text-[#141210] dark:text-[#FAFAFA] hover:border-[#F4512C]/50 transition cursor-pointer"
      >
        <Globe size={13} className="text-[#F4512C] shrink-0" />
        <span className="max-w-[68px] truncate">{languageMeta.shortLabel}</span>
        <ChevronDown
          size={12}
          className={`text-[#6B645F] dark:text-[#9E958F] transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Choose app language"
          className="absolute right-0 top-11 z-[100] w-48 rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        >
          {SUPPORTED_LANGUAGES.map((lang) => {
            const active = language === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  setLanguage(lang.code);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold transition cursor-pointer ${
                  active
                    ? "bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C]"
                    : "text-[#141210] dark:text-[#FAFAFA] hover:bg-[#FAF8F5] dark:hover:bg-[#242220]"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>{lang.nativeName}</span>
                  {lang.code !== "en" && (
                    <span className="text-[10px] font-medium text-[#6B645F] dark:text-[#9E958F]">
                      {lang.englishName}
                    </span>
                  )}
                </span>
                {active && <Check size={13} className="shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
