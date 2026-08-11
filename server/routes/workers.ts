import type { RequestHandler } from "express";
import { z } from "zod";
import type { ApiErrorResponse, WorkerRegistrationSuccessResponse, WorkersResponse } from "../../shared/api";
import { staticWorkers, type Worker } from "../../shared/workers";
import { readRegisteredWorkers, saveRegisteredWorker } from "../lib/registered-workers";

export const workerRegistrationSchema = z.object({
  id: z.string().trim().optional(),
  fullName: z.string().trim().min(1, "Full name is required"),
  phone: z.string().trim().min(1, "Phone number is required"),
  category: z.string().trim().min(1, "Work category is required"),
  location: z.string().trim().min(1, "Location is required"),
  experience: z.string().trim().min(1, "Years of experience is required"),
  services: z.string().trim().min(1, "Services offered is required"),
  about: z.string().trim().min(1, "About you is required"),
});

type WorkerRegistration = z.infer<typeof workerRegistrationSchema>;
const createUrlSafeSlug = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
export const createWorkerId = (fullName: string, existingWorkers: Worker[], requestedId?: string) => {
  const baseId = createUrlSafeSlug(requestedId || fullName) || "worker";
  const existingIds = new Set(existingWorkers.map((worker) => worker.id));
  if (!existingIds.has(baseId)) return baseId;
  let suffix = 2;
  let candidate = `${baseId}-${suffix}`;
  while (existingIds.has(candidate)) { suffix += 1; candidate = `${baseId}-${suffix}`; }
  return candidate;
};
const createInitials = (fullName: string) => fullName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "W";
export const createWorker = (registration: WorkerRegistration, existingWorkers: Worker[]): Worker => ({
  id: createWorkerId(registration.fullName, existingWorkers, registration.id), name: registration.fullName, phone: registration.phone,
  category: registration.category, locality: registration.location, experience: registration.experience, initials: createInitials(registration.fullName),
  tone: "bg-[#f5f6f4]", about: registration.about, services: registration.services.split(",").map((service) => service.trim()).filter(Boolean),
});
export const getAllWorkers = async () => [...staticWorkers, ...(await readRegisteredWorkers())];
export const handleGetWorkers: RequestHandler = async (_req, res) => {
  try { res.json({ workers: await getAllWorkers() } satisfies WorkersResponse); }
  catch (error) { console.error("[workers] load failed:", error); res.status(500).json({ message: error instanceof Error ? error.message : "Unable to load workers right now." } satisfies ApiErrorResponse); }
};
export const handleRegisterWorker: RequestHandler = async (req, res) => {
  const result = workerRegistrationSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ message: "Please check the registration details and try again.", errors: z.flattenError(result.error).fieldErrors } satisfies ApiErrorResponse);
  try {
    const existingWorkers = await getAllWorkers();
    const worker = createWorker(result.data, existingWorkers);
    await saveRegisteredWorker(worker);
    return res.status(201).json({ message: "Worker registration saved successfully.", worker } satisfies WorkerRegistrationSuccessResponse);
  } catch (error) {
    console.error("[workers] registration save failed:", error);
    return res.status(500).json({ message: error instanceof Error ? error.message : "Unable to save registration right now." } satisfies ApiErrorResponse);
  }
};
