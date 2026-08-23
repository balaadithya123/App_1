import { useEffect, useState } from "react";
import { ArrowRight, BadgeCheck, Check, MapPin, ShieldCheck, X, Heart, MessageCircle } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { workers as staticWorkers, type Worker } from "@/data/workers";
import type { WorkersResponse } from "@shared/api";
import { getWorkerContactHref, getWorkerWhatsAppHref } from "@/lib/contact";
import { findWorkerById } from "@/lib/workers";
import { getSavedWorkerIds, toggleSavedWorker } from "@/lib/favorites";
import { addRecentlyViewedWorker } from "@/lib/recently-viewed";
import { logAnalyticsEvent, logContactEvent } from "@/lib/analytics";
import RequestCallbackForm from "@/components/RequestCallbackForm";

const softWhiteButton = "border border-[#e3e5e4] bg-[#f4f5f4] text-[#111111] shadow-sm hover:bg-[#eef0ef] dark:border-[#d8dada] dark:bg-[#f0f1f0] dark:text-[#111111] dark:hover:bg-[#e7e9e8]";

export default function WorkerProfile() {
  const [searchParams] = useSearchParams();
  const [availableWorkers,setAvailableWorkers]=useState<Worker[]>(staticWorkers);
  const [showContact,setShowContact]=useState(false);
  const [showCallback,setShowCallback]=useState(false);
  const [saved,setSaved]=useState(false);
  const requestedWorkerId=searchParams.get("worker");
  const worker=findWorkerById(availableWorkers,requestedWorkerId);

  useEffect(()=>{setSaved(requestedWorkerId?getSavedWorkerIds().includes(requestedWorkerId):false)},[requestedWorkerId]);
  useEffect(()=>{let mounted=true;fetch("/api/workers",{cache:"no-store"}).then(async r=>{if(!r.ok)throw new Error();return r.json() as Promise<WorkersResponse>}).then(data=>{if(mounted)setAvailableWorkers(data.workers)}).catch(()=>{});return()=>{mounted=false}},[]);
  useEffect(()=>{if(worker?.id){addRecentlyViewedWorker(worker.id);void logAnalyticsEvent("profile_view",worker.id);void fetch("/api/profile-view",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({workerId:worker.id})}).catch(()=>{})}},[worker?.id]);

  if(!worker)return <PageShell backTo="/search" backLabel="Search results"><section className="rounded-[16px] border border-[#dcece7] bg-[#edf7f3] px-5 py-7 dark:border-white/10 dark:bg-[#151515] sm:px-8 sm:py-9"><h1 className="text-[27px] font-extrabold tracking-[-0.04em] text-navy dark:text-white">Worker profile unavailable</h1><p className="mt-2 text-[14px] leading-6 text-slate dark:text-slate-300">We could not find that worker profile.</p></section></PageShell>;

  const contactHref=getWorkerContactHref(worker);
  const whatsappHref=getWorkerWhatsAppHref(worker);
  const save=()=>{toggleSavedWorker(worker.id);setSaved(getSavedWorkerIds().includes(worker.id))};

  return <PageShell backTo="/search" backLabel="Search results">
    <section className="rounded-[16px] border border-[#dcece7] bg-[#edf7f3] px-5 py-7 dark:border-white/10 dark:bg-[#151515] sm:px-8 sm:py-9">
      <div className="flex items-center gap-4">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full text-lg font-extrabold text-navy bg-[#f5f6f4]">{worker.photo_url?<img src={worker.photo_url} alt={worker.name} className="h-full w-full object-cover"/>:worker.initials}</span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[27px] font-extrabold tracking-[-0.04em] text-navy dark:text-white">{worker.name}</h1>
            {worker.phone_verified && <span className="inline-flex items-center gap-1 rounded-full border border-teal/20 bg-teal/10 px-2 py-1 text-[10px] font-extrabold text-teal" title="Phone verified"><BadgeCheck size={13}/>Verified</span>}
          </div>
          <p className="mt-1 text-sm font-bold text-teal">{worker.category}</p>
          <p className="mt-1 flex items-center gap-1.5 text-[13px] text-slate dark:text-slate-300"><MapPin size={14}/> {worker.locality}</p>
        </div>
      </div>
      <div className="mt-6 grid gap-2 sm:grid-cols-4">
        <button type="button" onClick={save} className="flex h-11 items-center justify-center gap-2 rounded-[10px] border border-[#b9ddd4] bg-white text-sm font-bold text-teal dark:border-[#555] dark:bg-[#222] dark:text-white"><Heart size={17} fill={saved?"currentColor":"none"}/>{saved?"Saved":"Save worker"}</button>
        <button type="button" onClick={()=>setShowContact(true)} className={`${softWhiteButton} flex h-11 items-center justify-center gap-2 rounded-[10px] text-sm font-bold`}><ArrowRight size={16}/>Call</button>
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" onClick={()=>{void logContactEvent(worker.id,"whatsapp");void logAnalyticsEvent("whatsapp_click",worker.id,{source:"whatsapp"})}} className="flex h-11 items-center justify-center gap-2 rounded-[10px] bg-[#25D366] px-4 text-sm font-extrabold text-white"><MessageCircle size={17}/>WhatsApp</a>
        <button type="button" onClick={()=>setShowCallback(true)} className={`${softWhiteButton} flex h-11 items-center justify-center rounded-[10px] text-sm font-bold`}>Request Callback</button>
      </div>
    </section>
    {showContact&&<div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true"><section className="w-full max-w-md rounded-[16px] border border-line bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#151515]"><div className="flex items-center justify-between"><div><h2 className="text-lg font-extrabold text-navy dark:text-white">Call {worker.name}</h2><p className="mt-1 text-sm text-slate dark:text-slate-300">{worker.phone}</p></div><button type="button" onClick={()=>setShowContact(false)} aria-label="Close" className="rounded-full p-2"><X size={18}/></button></div><a href={contactHref} onClick={()=>setShowContact(false)} className={`${softWhiteButton} mt-5 flex h-11 w-full items-center justify-center rounded-[10px] text-sm font-bold`}>Call now</a></section></div>}
    {showCallback&&<RequestCallbackForm workerId={worker.id} workerName={worker.name} service={worker.category} onClose={()=>setShowCallback(false)}/>} 
    <div className="space-y-3 pt-7"><section className="rounded-[13px] border border-line bg-white p-5 dark:border-white/10 dark:bg-[#151515]"><h2 className="font-extrabold text-navy dark:text-white">About</h2><p className="mt-2 text-[14px] leading-6 text-slate dark:text-slate-300">{worker.about}</p></section><section className="rounded-[13px] border border-line bg-white p-5 dark:border-white/10 dark:bg-[#151515]"><h2 className="font-extrabold text-navy dark:text-white">Experience</h2><p className="mt-2 text-[14px] text-slate dark:text-slate-300">{worker.experience} of experience</p></section><section className="rounded-[13px] border border-line bg-white p-5 dark:border-white dark:bg-[#151515]"><h2 className="font-extrabold text-navy dark:text-white">Services</h2><ul className="mt-3 space-y-2 text-[14px] text-slate dark:text-slate-300">{worker.services.map(service=><li key={service} className="flex items-center gap-2"><Check size={16} className="text-teal"/>{service}</li>)}</ul></section></div><Link to="/report" className="mt-7 flex items-center justify-center gap-2 text-[13px] font-bold text-teal"><ShieldCheck size={16}/> Report / Give Feedback</Link>
  </PageShell>;
}
