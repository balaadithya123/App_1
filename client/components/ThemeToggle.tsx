import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "app_1_theme";
type Theme = "light" | "dark";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() =>
    typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "dark"
      ? "dark"
      : "light",
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  return (
    <button
      type="button"
      onClick={() => setTheme((value) => (value === "dark" ? "light" : "dark"))}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-foreground transition hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
    >
      {theme === "dark" ? <Sun size={16} className="text-foreground" /> : <Moon size={16} className="text-foreground" />}
    </button>
  );
}

