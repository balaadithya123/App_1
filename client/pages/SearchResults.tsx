import { MapPin, Search as SearchIcon } from "lucide-react";
import { Link } from "react-router-dom";
import PageShell from "@/components/PageShell";

const workers = [
  { name: "Ravi Kumar", category: "Electrician", locality: "Chidambaram", experience: "8 years", initials: "RK", tone: "bg-[#dcefe9]" },
  { name: "Kumar", category: "Electrician", locality: "Nearby", experience: "5 years", initials: "K", tone: "bg-[#e5edf4]" },
  { name: "Suresh", category: "Electrician", locality: "Cuddalore", experience: "6 years", initials: "S", tone: "bg-[#f1e9d9]" },
];

export default function SearchResults() {
  return (
    <PageShell>
      <section className="rounded-[16px] border border-[#dcece7] bg-[#edf7f3] px-5 py-6 sm:px-8 sm:py-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal">Search results</p>
        <h1 className="mt-2 text-[30px] font-extrabold leading-tight tracking-[-0.045em] text-navy sm:text-4xl">
          Electricians near you
        </h1>
        <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]">
          <div className="flex h-11 items-center gap-3 rounded-[10px] border border-line bg-white px-3.5 text-sm text-navy">
            <SearchIcon size={17} className="text-teal" />
            Electrician
          </div>
          <div className="flex h-11 items-center gap-2 rounded-[10px] border border-line bg-white px-3.5 text-sm text-slate">
            <MapPin size={17} className="text-teal" />
            Near you
          </div>
        </div>
      </section>

      <section className="pt-8">
        <h2 className="mb-4 text-[18px] font-extrabold tracking-[-0.025em] text-navy">
          3 workers found
        </h2>
        <div className="space-y-3">
          {workers.map((worker) => (
            <article key={worker.name} className="rounded-[13px] border border-line bg-white p-4 shadow-[0_5px_18px_rgba(24,55,62,0.04)]">
              <div className="flex items-start gap-3.5">
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-navy ${worker.tone}`}>
                  {worker.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-extrabold text-navy">{worker.name}</h3>
                  <p className="mt-0.5 text-[13px] font-semibold text-teal">{worker.category}</p>
                  <p className="mt-2 text-[13px] text-slate">{worker.locality} · {worker.experience} experience</p>
                </div>
                <Link
                  to="/worker"
                  className="shrink-0 rounded-[9px] border border-[#b9ddd4] px-3 py-2 text-[12px] font-bold text-teal transition-colors hover:bg-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
                >
                  View Profile
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
