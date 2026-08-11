import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Worker } from "../../shared/workers.js";
import { supabase } from "./supabase.js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const publicSupabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

const persistedWorkerSchema = z.object({ id: z.string().trim().min(1), name: z.string().trim().min(1), category: z.string().trim().min(1), locality: z.string().trim().min(1), experience: z.string().trim().min(1), initials: z.string().trim().min(1), tone: z.string().trim().min(1), about: z.string().trim().min(1), services: z.array(z.string().trim().min(1)).min(1), phone: z.string().trim().regex(/^\d{10}$/), created_at: z.string().optional() });
const persistedWorkersSchema = z.array(persistedWorkerSchema);
const toWorker = (row: unknown): Worker => persistedWorkerSchema.parse(row) as Worker;

export const readRegisteredWorkers = async (): Promise<Worker[]> => {
  const { data, error } = await supabase.from("workers").select("id,name,phone,category,locality,experience,initials,tone,about,services,created_at").order("created_at", { ascending: false });
  if (error) throw new Error(`Unable to load workers from Supabase: ${error.message}`);
  return persistedWorkersSchema.parse(data ?? []).map(toWorker);
};

const workerRow = (worker: Worker) => ({ id: worker.id, name: worker.name, phone: worker.phone, category: worker.category, locality: worker.locality, experience: worker.experience, initials: worker.initials, tone: worker.tone, about: worker.about, services: worker.services });
const selectFields = "id,name,phone,category,locality,experience,initials,tone,about,services,created_at";

export const saveRegisteredWorker = async (worker: Worker) => {
  const row = workerRow(worker);
  const first = await supabase.from("workers").insert(row).select(selectFields).single();
  if (!first.error) return toWorker(first.data);

  // If Vercel has an incorrect/expired service key, use the public client.
  // The database already has a narrowly validated public INSERT policy for registration.
  if (publicSupabase && /row-level security policy/i.test(first.error.message)) {
    const fallback = await publicSupabase.from("workers").insert(row).select(selectFields).single();
    if (!fallback.error) return toWorker(fallback.data);
    throw new Error(`Unable to save worker to Supabase: ${fallback.error.message}`);
  }

  throw new Error(`Unable to save worker to Supabase: ${first.error.message}`);
};
