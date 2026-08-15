import { useEffect, useState } from "react";
import { Heart, MapPin, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { workers as staticWorkers, type Worker } from "@/data/workers";
import type { WorkersResponse } from "@shared/api";
import { getSavedWorkerIds, toggleSavedWorker } from "@/lib/favorites";

export default function SavedWorkers() {
  const [workers, setWorkers] = useState<Worker[]>(staticWorkers);
  const [savedIds, setSavedIds] = useState<string[]>(getSavedWorkerIds);

  const refreshSaved = () => setSavedIds(getSavedWorkerIds());
  useEffect(() => {
    fetch("/api/workers", { cache: "no-store" })
      .then(async (response) => response.ok ? (await response.json() as WorkersResponse).workers : staticWorkers)
      .then(setWorkers)
      .catch(() => setWorkers(staticWorkers));
    window.addEventListener("saved-workers-changed", refreshSaved);
    return () => window.removeEventListener("saved-workers-changed", refreshSaved);
  }, []);

  const savedWorkers = workers.filter((worker) => savedIds.includes(worker.id));
  const remove = (id: string) => { toggleSavedWorker(id); refreshSaved(); };

  return <PageShell backTo="/search" backLabel="Find Workers">
    <section className="rounded-[16px] border border-[#dcece7] bg-[#edf7f3] px-5 py-6 dark:border-white/10 dark:bg-[#151515] sm:px-8 sm:py-8">
      <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-teal dark:bg-[#222] dark:text-white"><Heart size={19} fill="currentColor" /></span><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal dark:text-[#bdbdbd]">Saved workers</p><h1 className="mt-1 text-[30px] font-extrabold leading-tight tracking-[-0.045em] text-navy dark:text-white">Your saved workers</h1></div></div>
      <p className="mt-3 text-sm text-slate dark:text-[#bdbdbd]">Keep useful local workers here for quick access later.</p>
    </section>
    <section className="pt-8">
      {savedWorkers.length ? <div className="space-y-3">{savedWorkers.map((worker) => <article key={worker.id} className="rounded-[13px] border border-line bg-white p-4 dark:border-white/10 dark:bg-[#151515]"><div className="flex items-start gap-3.5"><span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#f5f6f4] text-sm font-extrabold text-navy dark:bg-[#222] dark:text-white">{worker.photo_url ? <img src={worker.photo_url} alt={worker.name} className="h-full w-full object-cover" /> : worker.initials}</span><div className="min-w-0 flex-1"><h2 className="font-extrabold text-navy dark:text-white">{worker.name}</h2><p className="mt-0.5 text-[13px] font-semibold text-teal dark:text-[#bdbdbd]">{worker.category}</p><p className="mt-2 flex items-center gap-1 text-[13px] text-slate dark:text-[#bdbdbd]"><MapPin size={14} />{worker.locality}</p></div><button type="button" onClick={() => remove(worker.id)} aria-label={`Remove ${worker.name} from saved workers`} className="rounded-full p-2 text-slate transition hover:bg-slate-100 hover:text-red-600 dark:text-[#bdbdbd] dark:hover:bg-white/10"><Trash2 size={17} /></button></div><Link to={`/worker?worker=${encodeURIComponent(worker.id)}`} className="mt-4 flex h-10 items-center justify-center rounded-[9px] border border-[#b9ddd4] bg-white text-[12px] font-bold text-teal dark:border-[#555] dark:bg-[#222] dark:text-white">View Profile</Link></article>)}</div> : <div className="rounded-[13px] border border-line bg-white px-5 py-10 text-center dark:border-white/10 dark:bg-[#151515]"><Heart className="mx-auto text-slate dark:text-[#bdbdbd]" size={28} /><h2 className="mt-3 font-extrabold text-navy dark:text-white">Nothing saved yet</h2><p className="mt-1 text-sm text-slate dark:text-[#bdbdbd]">Tap the heart on any worker profile or search result to save them.</p><Link to="/search" className="mt-5 inline-flex rounded-[9px] bg-teal px-4 py-2.5 text-sm font-bold text-white">Find Workers</Link></div>}
    </section>
  </PageShell>;
}
