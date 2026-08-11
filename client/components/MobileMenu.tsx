import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

export default function MobileMenu() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex items-center">
      <button type="button" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((current) => !current)} className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-slate-300 bg-white text-slate-900 shadow-sm dark:border-slate-800 dark:bg-[#050505] dark:text-white">
        {open ? <X size={20} strokeWidth={2.2} /> : <Menu size={21} strokeWidth={2.2} />}
      </button>
      {open && <nav className="absolute right-0 top-12 z-30 w-52 rounded-[12px] border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-800 dark:bg-[#080808]"><Link to="/" onClick={() => setOpen(false)} className="block rounded-[9px] px-3 py-3 text-sm font-bold text-navy hover:bg-slate-100 dark:text-white dark:hover:bg-slate-900">Home</Link><Link to="/register" onClick={() => setOpen(false)} className="block rounded-[9px] px-3 py-3 text-sm font-bold text-navy hover:bg-slate-100 dark:text-white dark:hover:bg-slate-900">Register as a Worker</Link></nav>}
    </div>
  );
}
