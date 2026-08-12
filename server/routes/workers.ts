import type { RequestHandler } from "express";
import { z } from "zod";
import type { ApiErrorResponse, WorkerRegistrationSuccessResponse, WorkersResponse } from "../../shared/api.js";
import { staticWorkers, type Worker } from "../../shared/workers.js";
import { readRegisteredWorkers, saveRegisteredWorker, updateWorkerPhotoByPhone } from "../lib/registered-workers.js";
import { supabase } from "../lib/supabase.js";

export const workerRegistrationSchema = z.object({ id: z.string().trim().optional(), fullName: z.string().trim().min(1, "Full name is required"), phone: z.string().trim().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"), category: z.string().trim().min(1, "Work category is required"), location: z.string().trim().min(1, "Location is required"), experience: z.string().trim().min(1, "Years of experience is required"), services: z.string().trim().min(1, "Services offered is required"), about: z.string().trim().min(1, "About you is required") });
type WorkerRegistration = z.infer<typeof workerRegistrationSchema>;
const createUrlSafeSlug=(v:string)=>v.trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
export const createWorkerId=(name:string,existing:Worker[],requested?:string)=>{const base=createUrlSafeSlug(requested||name)||"worker";const ids=new Set(existing.map(w=>w.id));if(!ids.has(base))return base;let n=2,c=`${base}-${n}`;while(ids.has(c)){n++;c=`${base}-${n}`}return c};
const createInitials=(name:string)=>name.trim().split(/\s+/).slice(0,2).map(p=>p[0]?.toUpperCase()).join("")||"W";
export const createWorker=(r:WorkerRegistration,existing:Worker[]):Worker=>({id:createWorkerId(r.phone,existing,r.id),name:r.fullName,phone:r.phone,category:r.category,locality:r.location,experience:r.experience,initials:createInitials(r.fullName),tone:"bg-[#f5f6f4]",about:r.about,services:r.services.split(",").map(s=>s.trim()).filter(Boolean)});
export const getAllWorkers=async()=>[...staticWorkers,...(await readRegisteredWorkers())];
export const handleGetWorkers:RequestHandler=async(_req,res)=>{try{res.setHeader("Cache-Control","no-store, max-age=0");res.json({workers:await getAllWorkers()} satisfies WorkersResponse)}catch(error){console.error("[workers] load failed:",error);res.status(500).json({message:error instanceof Error?error.message:"Unable to load workers right now."} satisfies ApiErrorResponse)}};
export const handleRegisterWorker:RequestHandler=async(req,res)=>{const result=workerRegistrationSchema.safeParse(req.body);if(!result.success)return res.status(400).json({message:"Please check the registration details and try again.",errors:z.flattenError(result.error).fieldErrors} satisfies ApiErrorResponse);try{const worker=createWorker(result.data,await getAllWorkers());await saveRegisteredWorker(worker);return res.status(201).json({message:"Worker registration saved successfully.",worker} satisfies WorkerRegistrationSuccessResponse)}catch(error){console.error("[workers] registration save failed:",error);return res.status(500).json({message:error instanceof Error?error.message:"Unable to save registration right now."} satisfies ApiErrorResponse)}};

export const handleUpdateWorkerPhoto: RequestHandler = async (req, res) => {
  try {
    const authorization = req.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) return res.status(401).json({ message: "You must be logged in to update your worker profile." } satisfies ApiErrorResponse);
    const token = authorization.slice("Bearer ".length);
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) return res.status(401).json({ message: "Your login session has expired. Please log in again." } satisfies ApiErrorResponse);
    if (authData.user.user_metadata?.role !== "worker") return res.status(403).json({ message: "Only worker accounts can update a public worker photo." } satisfies ApiErrorResponse);
    const photoUrl = z.string().url().safeParse(req.body?.photoUrl);
    if (!photoUrl.success) return res.status(400).json({ message: "A valid profile photo URL is required." } satisfies ApiErrorResponse);
    const phone = String(authData.user.user_metadata?.phone || authData.user.phone || "").replace(/^\+91/, "").replace(/\D/g, "").slice(-10);
    if (!/^\d{10}$/.test(phone)) return res.status(400).json({ message: "Your worker phone number is missing or invalid." } satisfies ApiErrorResponse);
    const worker = await updateWorkerPhotoByPhone(phone, photoUrl.data);
    return res.json({ worker });
  } catch (error) {
    console.error("[workers] photo update failed:", error);
    return res.status(500).json({ message: error instanceof Error ? error.message : "Unable to update worker photo." } satisfies ApiErrorResponse);
  }
};
