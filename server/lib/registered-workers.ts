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

  // Registration is deliberately performed through the public client. The database
  // has a dedicated INSERT policy that validates every registration field, including
  // an exactly 10-digit phone number. This avoids depending on a Vercel secret being
  // interpreted as the service_role JWT and accidentally being subject to RLS.
  if (!publicSupabase) throw new Error("Supabase public registration client is not configured.");
  const result = await publicSupabase.from("workers").insert(row).select(selectFields).single();
  if (!result.error) return toWorker(result.data);

  // Keep the server client as a secondary path for environments where the public
  // registration variables are unavailable, while never masking the real error.
  const serverResult = await supabase.from("workers").insert(row).select(selectFields).single();
  if (!serverResult.error) return toWorker(serverResult.data);

  throw new Error(`Unable to save worker to Supabase: ${result.error.message}`);
};
