import { ArrowLeft } from "lucide-react";
import MobileMenu from "@/components/MobileMenu";
import ThemeToggle from "@/components/ThemeToggle";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
export default function PageShell({ children, backTo = "/", backLabel = "Home" }: { children: ReactNode; backTo?: string; backLabel?: string }) {
 return <main className="min-h-screen bg-[#f8faf9] px-5 pb-10 text-ink dark:bg-[#050608] dark:bg-[radial-gradient(circle_at_20%_10%,rgba(37,99,235,0.12),transparent_28%),radial-gradient(circle_at_80%_35%,rgba(30,64,175,0.08),transparent_30%),#050608] dark:text-slate-100 sm:px-8"><div className="mx-auto max-w-[720px]"><header className="flex items-center justify-between py-5 sm:py-7"><Link to="/" className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-teal text-sm font-extrabold text-white shadow-sm">L</span><span className="text-[17px] font-extrabold tracking-[-0.03em] text-navy dark:text-white">LocalWorker</span></Link><div className="flex items-center gap-2"><ThemeToggle /><MobileMenu /></div></header><Link to={backTo} className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-bold text-teal dark:text-blue-400"><ArrowLeft size={16} />{backLabel}</Link>{children}</div></main>;
}
