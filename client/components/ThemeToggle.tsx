import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import {
  applyTheme,
  getInitialTheme,
  toggleTheme,
  type Theme,
} from "@/lib/theme";

interface ThemeToggleProps {
  variant?: "icon" | "pill" | "dropdown-item";
  className?: string;
}

export default function ThemeToggle({
  variant = "icon",
  className = "",
}: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const initial = getInitialTheme();
    setTheme(initial);

    const onThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<Theme>;
      if (customEvent.detail) {
        setTheme(customEvent.detail);
      } else {
        setTheme(
          document.documentElement.classList.contains("dark")
            ? "dark"
            : "light",
        );
      }
    };

    window.addEventListener("theme-change", onThemeChange);
    return () => window.removeEventListener("theme-change", onThemeChange);
  }, []);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = toggleTheme();
    setTheme(next);
  };

  const handleSelect = (e: React.MouseEvent, next: Theme) => {
    e.stopPropagation();
    applyTheme(next);
    setTheme(next);
  };

  if (!mounted) {
    return (
      <div
        className={`h-9 w-9 rounded-full border border-border bg-card ${className}`}
        aria-hidden="true"
      />
    );
  }

  const isDark = theme === "dark";

  if (variant === "dropdown-item") {
    return (
      <div
        className={`flex items-center justify-between gap-3 px-2.5 py-1.5 ${className}`}
      >
        <span className="text-xs font-medium text-[#6B645F] dark:text-[#9E958F]">
          Appearance
        </span>
        <div
          role="group"
          aria-label="Theme appearance"
          className="inline-flex items-center rounded-lg border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] p-0.5"
        >
          <button
            type="button"
            onClick={(e) => handleSelect(e, "light")}
            aria-pressed={!isDark}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition cursor-pointer ${
              !isDark
                ? "bg-white text-[#141210] shadow-xs"
                : "text-[#6B645F] dark:text-[#9E958F] hover:text-[#141210] dark:hover:text-white"
            }`}
          >
            <Sun size={11} />
            <span>Light</span>
          </button>
          <button
            type="button"
            onClick={(e) => handleSelect(e, "dark")}
            aria-pressed={isDark}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition cursor-pointer ${
              isDark
                ? "bg-[#242220] text-[#FAFAFA] shadow-xs"
                : "text-[#6B645F] dark:text-[#9E958F] hover:text-[#141210] dark:hover:text-white"
            }`}
          >
            <Moon size={11} />
            <span>Dark</span>
          </button>
        </div>
      </div>
    );
  }

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={handleToggle}
        aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-primary/50 hover:text-primary shadow-subtle cursor-pointer ${className}`}
      >
        {isDark ? (
          <>
            <Moon size={13} className="text-primary" />
            <span>Dark</span>
          </>
        ) : (
          <>
            <Sun size={13} className="text-amber-500" />
            <span>Light</span>
          </>
        )}
      </button>
    );
  }

  // Default "icon" button
  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      className={`flex h-9 w-9 items-center justify-center rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#161514] text-[#141210] dark:text-[#FAFAFA] transition hover:border-[#F4512C]/50 focus-visible:ring-2 focus-visible:ring-[#F4512C] cursor-pointer active:scale-95 ${className}`}
    >
      {isDark ? (
        <Sun
          size={15}
          className="text-amber-400 hover:rotate-45 transition-transform duration-300"
        />
      ) : (
        <Moon
          size={15}
          className="text-[#6B645F] hover:-rotate-12 transition-transform duration-300"
        />
      )}
    </button>
  );
}
