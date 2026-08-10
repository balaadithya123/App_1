import { ArrowRight, Check, MapPin, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import PageShell from "@/components/PageShell";

export default function WorkerProfile() {
  return (
    <PageShell backTo="/search" backLabel="Search results">
      <section className="rounded-[16px] border border-[#dcece7] bg-[#edf7f3] px-5 py-7 sm:px-8 sm:py-9">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#dcefe9] text-lg font-extrabold text-navy">RK</span>
          <div>
            <h1 className="text-[27px] font-extrabold tracking-[-0.04em] text-navy">Ravi Kumar</h1>
            <p className="mt-1 text-sm font-bold text-teal">Electrician</p>
            <p className="mt-1 flex items-center gap-1.5 text-[13px] text-slate"><MapPin size={14} /> Chidambaram</p>
          </div>
        </div>
        <button type="button" className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-navy text-sm font-bold text-white shadow-[0_5px_12px_rgba(18,63,75,0.18)] transition-colors hover:bg-[#234b59] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2">
          Contact <ArrowRight size={16} />
        </button>
      </section>

      <div className="space-y-3 pt-7">
        <section className="rounded-[13px] border border-line bg-white p-5">
          <h2 className="font-extrabold text-navy">About</h2>
          <p className="mt-2 text-[14px] leading-6 text-slate">Reliable local electrician helping homes and small businesses with everyday electrical work.</p>
        </section>
        <section className="rounded-[13px] border border-line bg-white p-5">
          <h2 className="font-extrabold text-navy">Experience</h2>
          <p className="mt-2 text-[14px] text-slate">8 years of experience</p>
        </section>
        <section className="rounded-[13px] border border-line bg-white p-5">
          <h2 className="font-extrabold text-navy">Services</h2>
          <ul className="mt-3 space-y-2 text-[14px] text-slate">
            {["Wiring and rewiring", "Fan and light installation", "Electrical repairs"].map((service) => (
              <li key={service} className="flex items-center gap-2"><Check size={16} className="text-teal" />{service}</li>
            ))}
          </ul>
        </section>
      </div>

      <Link to="/report" className="mt-7 flex items-center justify-center gap-2 text-[13px] font-bold text-teal transition-colors hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2">
        <ShieldCheck size={16} /> Report / Give Feedback
      </Link>
    </PageShell>
  );
}
