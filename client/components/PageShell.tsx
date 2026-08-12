import { ArrowLeft } from "lucide-react";
import MobileMenu from "@/components/MobileMenu";
import ThemeToggle from "@/components/ThemeToggle";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export default function PageShell({ children, backTo = "/", backLabel = "Home" }: { children: ReactNode; backTo?: string; backLabel?: string }) {
  return <main className="min-h-screen bg-[#f8faf9] px-5 pb-10 text-ink dark:bg-black dark:text-[#ececec] sm:px-8"><div className="mx-auto max-w-[720px]"><header className="flex items-center justify-between py-5 sm:py-7"><Link to="/" className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-teal text-sm font-extrabold text-white shadow-sm">L</span><span className="text-[17px] font-extrabold tracking-[-0.03em] text-navy dark:text-white">LocalWorker</span></Link><div className="flex items-center gap-2"><ThemeToggle/><MobileMenu/></div></header><Link to={backTo} className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-teal/30 bg-teal/10 px-3.5 py-2 text-[13px] font-bold text-teal backdrop-blur-md transition hover:bg-teal/15 dark:border-white/15 dark:bg-white/10 dark:text-white dark:backdrop-blur-xl"> <ArrowLeft size={16}/>{backLabel}</Link>{children}</div></main>;
}
