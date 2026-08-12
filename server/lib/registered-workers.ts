import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Worker } from "../../shared/workers.js";
import { supabase } from "./supabase.js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const publicSupabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

const persistedWorkerSchema = z.object({ id: z.string().trim().min(1), name: z.string().trim().min(1), category: z.string().trim().min(1), locality: z.string().trim().min(1), experience: z.string().trim().min(1), initials: z.string().trim().min(1), tone: z.string().trim().min(1), about: z.string().trim().min(1), services: z.array(z.string().trim().min(1)).min(1), phone: z.string().trim().regex(/^\d{10}$/), photo_url: z.string().url().optional().nullable(), created_at: z.string().optional() });
const persistedWorkersSchema = z.array(persistedWorkerSchema);
const toWorker = (row: unknown): Worker => persistedWorkerSchema.parse(row) as Worker;

export const readRegisteredWorkers = async (): Promise<Worker[]> => {
  const { data, error } = await supabase.from("workers").select("id,name,phone,category,locality,experience,initials,tone,about,services,photo_url,created_at").order("created_at", { ascending: false });
  if (error) throw new Error(`Unable to load workers from Supabase: ${error.message}`);
  return persistedWorkersSchema.parse(data ?? []).map(toWorker);
};

const workerRow = (worker: Worker) => ({ id: worker.id, name: worker.name, phone: worker.phone, category: worker.category, locality: worker.locality, experience: worker.experience, initials: worker.initials, tone: worker.tone, about: worker.about, services: worker.services, photo_url: worker.photo_url || null });

export const saveRegisteredWorker = async (worker: Worker) => {
  const row = workerRow(worker);
  if (publicSupabase) {
    const result = await publicSupabase.from("workers").insert(row);
    if (!result.error) return toWorker({ ...row, created_at: new Date().toISOString() });
  }
  const serverResult = await supabase.from("workers").insert(row);
  if (!serverResult.error) return toWorker({ ...row, created_at: new Date().toISOString() });
  const message = publicSupabase ? "Worker registration was rejected by the database policy." : serverResult.error.message;
  throw new Error(`Unable to save worker to Supabase: ${message}`);
};

export const updateWorkerPhotoByPhone = async (phone: string, photoUrl: string) => {
  const { data, error } = await supabase.from("workers").update({ photo_url: photoUrl }).eq("phone", phone).select("id,name,phone,category,locality,experience,initials,tone,about,services,photo_url,created_at").maybeSingle();
  if (error) throw new Error(`Unable to save worker photo: ${error.message}`);
  if (!data) throw new Error("Worker profile was not found for this account.");
  return toWorker(data);
};

export const updateWorkerProfileByPhone = async (phone: string, profile: { name: string; category: string; locality: string; experience: string; services: string[]; about: string; photo_url?: string | null }) => {
  const initials = profile.name.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase()).join("") || "W";
  const { data, error } = await supabase.from("workers").update({ name: profile.name.trim(), category: profile.category.trim(), locality: profile.locality.trim(), experience: profile.experience.trim(), services: profile.services.map(s => s.trim()).filter(Boolean), about: profile.about.trim(), initials, ...(profile.photo_url !== undefined ? { photo_url: profile.photo_url } : {}) }).eq("phone", phone).select("id,name,phone,category,locality,experience,initials,tone,about,services,photo_url,created_at").maybeSingle();
  if (error) throw new Error(`Unable to save worker profile: ${error.message}`);
  if (!data) throw new Error("Worker profile was not found for this account.");
  return toWorker(data);
};
