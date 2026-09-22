import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { getInitialTheme, toggleTheme, type Theme } from "@/lib/theme";

interface ThemeToggleProps {
  variant?: "icon" | "pill" | "dropdown-item";
  className?: string;
}

export default function ThemeToggle({ variant = "icon", className = "" }: ThemeToggleProps) {
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
        setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
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
      <button
        type="button"
        onClick={handleToggle}
        className={`flex w-full items-center justify-between rounded-full px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-primary-100/10 hover:text-primary cursor-pointer ${className}`}
      >
        <span className="flex items-center gap-2">
          {isDark ? <Moon size={14} className="text-primary" /> : <Sun size={14} className="text-amber-500" />}
          <span>{isDark ? "Dark Mode (Black)" : "Light Mode"}</span>
        </span>
        <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
          {isDark ? "Black" : "Light"}
        </span>
      </button>
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
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode (Pitch Black)"}
      className={`flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-primary shadow-subtle cursor-pointer active:scale-95 ${className}`}
    >
      {isDark ? (
        <Sun size={15} className="text-amber-400 hover:rotate-45 transition-transform duration-300" />
      ) : (
        <Moon size={15} className="text-[#67696D] hover:-rotate-12 transition-transform duration-300" />
      )}
    </button>
  );
}
