import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

export default function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-line bg-white text-navy shadow-[0_2px_8px_rgba(24,55,62,0.04)] transition-colors hover:bg-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
      >
        {open ? <X size={20} strokeWidth={2.2} /> : <Menu size={21} strokeWidth={2.2} />}
      </button>
      {open && (
        <nav className="absolute right-0 top-12 z-30 w-52 rounded-[12px] border border-line bg-white p-2 shadow-[0_12px_28px_rgba(24,55,62,0.12)]">
          <Link to="/" onClick={() => setOpen(false)} className="block rounded-[9px] px-3 py-3 text-sm font-bold text-navy hover:bg-mint">Home</Link>
          <Link to="/register" onClick={() => setOpen(false)} className="block rounded-[9px] px-3 py-3 text-sm font-bold text-navy hover:bg-mint">Register as a Worker</Link>
        </nav>
      )}
    </div>
  );
}
