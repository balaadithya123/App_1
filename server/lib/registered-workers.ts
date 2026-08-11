import { z } from "zod";
import type { Worker } from "../../shared/workers";
import { supabase } from "./supabase";

const persistedWorkerSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  category: z.string().trim().min(1),
  locality: z.string().trim().min(1),
  experience: z.string().trim().min(1),
  initials: z.string().trim().min(1),
  tone: z.string().trim().min(1),
  about: z.string().trim().min(1),
  services: z.array(z.string().trim().min(1)).min(1),
  phone: z.string().trim().min(1),
  created_at: z.string().optional(),
});

const persistedWorkersSchema = z.array(persistedWorkerSchema);

const toWorker = (row: unknown): Worker => {
  return persistedWorkerSchema.parse(row) as Worker;
};

export const readRegisteredWorkers = async (): Promise<Worker[]> => {
  const { data, error } = await supabase
    .from("workers")
    .select("id,name,phone,category,locality,experience,initials,tone,about,services,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Unable to load workers from Supabase: ${error.message}`);
  }

  return persistedWorkersSchema.parse(data ?? []).map(toWorker);
};

export const saveRegisteredWorker = async (worker: Worker) => {
  const { data, error } = await supabase
    .from("workers")
    .insert({
      id: worker.id,
      name: worker.name,
      phone: worker.phone,
      category: worker.category,
      locality: worker.locality,
      experience: worker.experience,
      initials: worker.initials,
      tone: worker.tone,
      about: worker.about,
      services: worker.services,
    })
    .select("id,name,phone,category,locality,experience,initials,tone,about,services,created_at")
    .single();

  if (error) {
    throw new Error(`Unable to save worker to Supabase: ${error.message}`);
  }

  return toWorker(data);
};
