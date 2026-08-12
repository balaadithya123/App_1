import { ArrowLeft } from "lucide-react";
import MobileMenu from "@/components/MobileMenu";
import ThemeToggle from "@/components/ThemeToggle";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

export default function PageShell({ children, backTo = "/", backLabel = "Home", hideBack = false, hideHome = false }: { children: ReactNode; backTo?: string; backLabel?: string; hideBack?: boolean; hideHome?: boolean }) {
  const navigate = useNavigate();
  return <main className="min-h-screen bg-[#f8faf9] px-5 pb-10 text-ink dark:bg-[#212121] dark:text-[#ececec] sm:px-8"><div className="mx-auto max-w-[720px]"><header className="flex items-center justify-between py-5 sm:py-7">{hideHome ? <div className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-black/10 bg-transparent text-sm font-extrabold text-navy dark:border-white/20 dark:text-white">L</span><span className="text-[17px] font-extrabold tracking-[-0.03em] text-navy dark:text-white">LocalWorker</span></div> : <button type="button" onClick={() => navigate(backTo)} aria-label={backLabel} className="flex items-center gap-2.5 text-left"><span className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-black/10 bg-transparent text-sm font-extrabold text-navy dark:border-white/20 dark:text-white">L</span><span className="text-[17px] font-extrabold tracking-[-0.03em] text-navy dark:text-white">LocalWorker</span></button>}<div className="flex items-center gap-2"><ThemeToggle/><MobileMenu/></div></header>{!hideBack&&<button type="button" onClick={() => navigate(backTo)} className="mb-6 inline-flex items-center gap-1.5 rounded-[8px] border border-black/10 bg-transparent px-3.5 py-2 text-[13px] font-bold text-teal transition dark:border-white/10 dark:text-white"><ArrowLeft size={16}/>{backLabel}</button>}{children}</div></main>;
}
