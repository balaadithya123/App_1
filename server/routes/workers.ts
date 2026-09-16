import type { RequestHandler } from "express";
import { z } from "zod";
import type { ApiErrorResponse, WorkerRegistrationSuccessResponse, WorkersResponse } from "../../shared/api";
import { staticWorkers, type Worker } from "../../shared/workers";
import { readRegisteredWorkers, saveRegisteredWorker, updateWorkerPhotoByPhone, updateWorkerProfileByPhone } from "../lib/registered-workers";
import { supabase } from "../lib/supabase";
import { addTrustFlag } from "./portfolio";
import { screenImageSilently } from "./portfolio-screen";

export const workerRegistrationSchema = z.object({ id: z.string().trim().optional(), fullName: z.string().trim().min(1, "Full name is required"), phone: z.string().trim().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"), category: z.string().trim().min(1, "Work category is required"), location: z.string().trim().min(1, "Location is required"), experience: z.string().trim().min(1, "Years of experience is required"), services: z.string().trim().min(1, "Services offered is required"), about: z.string().trim().min(1, "About you is required") });
type WorkerRegistration = z.infer<typeof workerRegistrationSchema>;
const createUrlSafeSlug=(v:string)=>v.trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
export const createWorkerId=(name:string,existing:Worker[],requested?:string)=>{const base=createUrlSafeSlug(requested||name)||"worker";const ids=new Set(existing.map(w=>w.id));if(!ids.has(base))return base;let n=2,c=`${base}-${n}`;while(ids.has(c)){n++;c=`${base}-${n}`}return c;};
const createInitials=(name:string)=>name.trim().split(/\s+/).slice(0,2).map(p=>p[0]?.toUpperCase()).join("")||"W";
export const createWorker=(r:WorkerRegistration,existing:Worker[]):Worker=>({id:createWorkerId(r.phone,existing,r.id),name:r.fullName,phone:r.phone,category:r.category,locality:r.location,experience:r.experience,initials:createInitials(r.fullName),tone:"bg-[#f5f6f4]",about:r.about,services:r.services.split(",").map(s=>s.trim()).filter(Boolean),available_today:false,urgent_today:false});
export const getAllWorkers=async()=>[...staticWorkers,...(await readRegisteredWorkers())];
export const handleGetWorkers:RequestHandler=async(_req,res)=>{try{res.setHeader("Cache-Control","no-store, max-age=0");const workers=await getAllWorkers();const ids=workers.map(w=>w.id);const {data:verificationRows}=ids.length?await supabase.from("workers").select("id,phone_verified").in("id",ids):{data:[]};const verification=new Map((verificationRows??[]).map(row=>[row.id,Boolean(row.phone_verified)]));res.json({workers:workers.map(worker=>({...worker,phone_verified:verification.get(worker.id)??worker.phone_verified??false}))} satisfies WorkersResponse)}catch(error){console.error("[workers] load failed:",error);res.status(500).json({message:error instanceof Error?error.message:"Unable to load workers right now."} satisfies ApiErrorResponse)}};
export const handleRegisterWorker:RequestHandler=async(req,res)=>{
  const result=workerRegistrationSchema.safeParse(req.body);
  if(!result.success)return res.status(400).json({message:"Please check the registration details and try again.",errors:z.flattenError(result.error).fieldErrors} satisfies ApiErrorResponse);
  try{
    const existingWorkers = await getAllWorkers();
    const worker=createWorker(result.data, existingWorkers);
    await saveRegisteredWorker(worker);

    // Silent background duplicate and fake checks
    try {
      const normPhone = result.data.phone.replace(/\D/g, "").slice(-10);
      const duplicatePhone = existingWorkers.filter(w => w.phone.replace(/\D/g, "").slice(-10) === normPhone);
      if (duplicatePhone.length > 0) {
        await addTrustFlag({
          worker_id: worker.id,
          flag_type: "duplicate_phone_detected",
          reason: `Phone number is shared with ${duplicatePhone.length} other registered profile(s)`,
        });
      }

      const normName = result.data.fullName.trim().toLowerCase();
      const normLoc = result.data.location.trim().toLowerCase();
      const normCat = result.data.category.trim().toLowerCase();
      const similarProfile = existingWorkers.find(
        w => w.name.trim().toLowerCase() === normName &&
             w.category.trim().toLowerCase() === normCat &&
             w.locality.trim().toLowerCase() === normLoc
      );
      if (similarProfile) {
        await addTrustFlag({
          worker_id: worker.id,
          flag_type: "duplicate_profile_suspected",
          reason: `Duplicate profile suspected: "${similarProfile.name}" already listed in ${similarProfile.locality} (${similarProfile.category})`,
        });
      }
    } catch (checkErr) {
      console.warn("[workers] background duplicate check note:", checkErr);
    }

    return res.status(201).json({message:"Worker registration saved successfully.",worker} satisfies WorkerRegistrationSuccessResponse)
  }catch(error){
    console.error("[workers] registration save failed:",error);
    return res.status(500).json({message:error instanceof Error?error.message:"Unable to save registration right now."} satisfies ApiErrorResponse)
  }
};

const getAuthenticatedWorker = async (req: Parameters<RequestHandler>[0]) => { const authorization=req.headers.authorization; if(!authorization?.startsWith("Bearer ")) throw new Error("UNAUTHORIZED"); const token=authorization.slice("Bearer ".length); const {data,error}=await supabase.auth.getUser(token); if(error||!data.user) throw new Error("UNAUTHORIZED"); if(data.user.user_metadata?.role!=="worker") throw new Error("FORBIDDEN"); return { token, user: data.user }; };

const sendAvailabilityNotifications = async (workerId:string, workerName:string) => {
  const { data: watchers, error } = await supabase.from("availability_watchers").select("id,requester_id,requester_email").eq("worker_id", workerId).is("notified_at", null);
  if (error) throw new Error(`Unable to load availability watchers: ${error.message}`);
  if (!watchers?.length) return 0;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is missing in Vercel environment variables.");
  const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  let sent = 0;
  for (const watcher of watchers) {
    const message = `${workerName} is available again. You can now contact the worker from App_1.`;
    const { error: notificationError } = await supabase.from("notifications").insert({ recipient_id: watcher.requester_id, type: "worker_available", title: "Worker is available again", message, worker_id: workerId });
    if (notificationError) throw new Error(`Unable to create inbox notification: ${notificationError.message}`);
    const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: [watcher.requester_email], subject: `${workerName} is available again`, text: message }) });
    if (!response.ok) { const body = await response.text(); throw new Error(`Resend failed: ${body}`); }
    const { error: markError } = await supabase.from("availability_watchers").update({ notified_at: new Date().toISOString() }).eq("id", watcher.id);
    if (markError) throw new Error(`Unable to mark watcher notified: ${markError.message}`);
    sent++;
  }
  return sent;
};

export const handleUpdateWorkerAvailability:RequestHandler=async(req,res)=>{try{const {token,user}=await getAuthenticatedWorker(req);const body=z.object({available_today:z.boolean(),away_from:z.string().date().nullable().optional(),away_until:z.string().date().nullable().optional(),urgent_today:z.boolean()}).parse(req.body);const functionUrl=`${process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL}/functions/v1/worker-availability-notify`;const response=await fetch(functionUrl,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify(body)});const result=await response.json().catch(()=>({message:"Unable to update availability."}));if(!response.ok)return res.status(response.status).json(result);
    if (body.available_today) {
      const phone=String(user.phone||user.user_metadata?.phone||"").replace(/^\+91/,"").replace(/\D/g,"").slice(-10);
      const { data: worker } = await supabase.from("workers").select("id,name").eq("phone", phone).maybeSingle();
      if (worker) await sendAvailabilityNotifications(worker.id, worker.name);
    }
    return res.json(result);
  }catch(error){const code=error instanceof Error?error.message:"";const status=code==="UNAUTHORIZED"?401:code==="FORBIDDEN"?403:500;return res.status(status).json({message:status===500?(error instanceof Error?error.message:"Unable to update availability."):"Your login session is invalid or expired."} satisfies ApiErrorResponse);}};
export const handleUpdateWorkerProfile:RequestHandler=async(req,res)=>{try{const {token}=await getAuthenticatedWorker(req);const {data:user,error}=await supabase.auth.getUser(token);if(error||!user.user)return res.status(401).json({message:"Your login session is invalid or expired."} satisfies ApiErrorResponse);const body=z.object({name:z.string().trim().min(1),category:z.string().trim().min(1),location:z.string().trim().min(1),experience:z.string().trim().min(1),services:z.array(z.string().trim()).default([]),about:z.string().trim().min(1),photo_url:z.string().url().nullable().optional()}).parse(req.body);const phone=String(user.user.phone||user.user.user_metadata?.phone||"").replace(/^\+91/,"").replace(/\D/g,"").slice(-10);const worker=await updateWorkerProfileByPhone(phone,body);return res.json({worker});}catch(error){return res.status(500).json({message:error instanceof Error?error.message:"Unable to update worker profile."} satisfies ApiErrorResponse);}};
export const handleUpdateWorkerPhoto:RequestHandler=async(req,res)=>{
  try{
    const {token}=await getAuthenticatedWorker(req);
    const {data:user,error}=await supabase.auth.getUser(token);
    if(error||!user.user)return res.status(500).json({message:error instanceof Error?error.message:"Unable to update worker photo."} satisfies ApiErrorResponse);
    const phone=String(user.user.phone||user.user.user_metadata?.phone||"");
    const photoUrl=z.string().url().safeParse(req.body?.photoUrl);
    if(!photoUrl.success)return res.status(400).json({message:"A valid profile photo URL is required."} satisfies ApiErrorResponse);
    const worker=await updateWorkerPhotoByPhone(phone.replace(/^\+91/,"").replace(/\D/g,"").slice(-10),photoUrl.data);

    // Silent background screening for profile photo
    try {
      const screening = await screenImageSilently({
        id: `profile-photo-${Date.now()}`,
        name: "profile_photo.jpg",
        mimeType: "image/jpeg",
        data: photoUrl.data,
      });
      if (screening.checks.is_stock_photo) {
        await addTrustFlag({
          worker_id: worker.id,
          flag_type: "stock_photo_detected",
          reason: "Profile photo detected as commercial stock photo or catalog picture",
        });
      } else if (!screening.checks.shows_actual_work && screening.checks.is_duplicate_style) {
        await addTrustFlag({
          worker_id: worker.id,
          flag_type: "unverified_photo",
          reason: "Profile photo appears to be a screenshot, meme, or non-work graphic",
        });
      }
    } catch (photoCheckErr) {
      console.warn("[workers] background photo check note:", photoCheckErr);
    }

    return res.json({worker});
  }catch(error){
    return res.status(500).json({message:error instanceof Error?error.message:"Unable to update worker photo."} satisfies ApiErrorResponse);
  }
};
