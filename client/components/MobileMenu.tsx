import { Menu, X, Sun, Moon } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

export default function MobileMenu() {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem("app_1_theme") === "dark");
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); localStorage.setItem("app_1_theme", dark ? "dark" : "light"); }, [dark]);
  return (
    <div className="relative flex items-center gap-2">
      <button type="button" aria-label={dark ? "Switch to light theme" : "Switch to dark theme"} onClick={() => setDark((value) => !value)} className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-navy shadow-sm hover:bg-mint dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700">
        {dark ? <Sun size={19} /> : <Moon size={19} />}
      </button>
      <button type="button" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((current) => !current)} className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-line bg-white text-navy shadow-sm dark:bg-slate-800 dark:text-white">
        {open ? <X size={20} strokeWidth={2.2} /> : <Menu size={21} strokeWidth={2.2} />}
      </button>
      {open && <nav className="absolute right-0 top-12 z-30 w-52 rounded-[12px] border border-line bg-white p-2 shadow-lg dark:bg-slate-900"><Link to="/" onClick={() => setOpen(false)} className="block rounded-[9px] px-3 py-3 text-sm font-bold text-navy hover:bg-mint dark:text-white dark:hover:bg-slate-800">Home</Link><Link to="/register" onClick={() => setOpen(false)} className="block rounded-[9px] px-3 py-3 text-sm font-bold text-navy hover:bg-mint dark:text-white dark:hover:bg-slate-800">Register as a Worker</Link></nav>}
    </div>
  );
}
