import type { RequestHandler } from "express";
import { z } from "zod";
import type {
  ApiErrorResponse,
  WorkerRegistrationSuccessResponse,
  WorkersResponse,
} from "../../shared/api";
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

const createUrlSafeSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const createWorkerId = (fullName: string, existingWorkers: Worker[], requestedId?: string) => {
  const baseId = createUrlSafeSlug(requestedId || fullName) || "worker";
  const existingIds = new Set(existingWorkers.map((worker) => worker.id));

  if (!existingIds.has(baseId)) {
    return baseId;
  }

  let suffix = 2;
  let candidate = `${baseId}-${suffix}`;

  while (existingIds.has(candidate)) {
    suffix += 1;
    candidate = `${baseId}-${suffix}`;
  }

  return candidate;
};

const createInitials = (fullName: string) => {
  const initials = fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "W";
};

export const createWorker = (registration: WorkerRegistration, existingWorkers: Worker[]): Worker => ({
  id: createWorkerId(registration.fullName, existingWorkers, registration.id),
  name: registration.fullName,
  phone: registration.phone,
  category: registration.category,
  locality: registration.location,
  experience: registration.experience,
  initials: createInitials(registration.fullName),
  tone: "bg-[#f5f6f4]",
  about: registration.about,
  services: registration.services
    .split(",")
    .map((service) => service.trim())
    .filter(Boolean),
});

export const getAllWorkers = async () => {
  const registeredWorkers = await readRegisteredWorkers();

  return [...staticWorkers, ...registeredWorkers];
};

export const handleGetWorkers: RequestHandler = async (_req, res) => {
  try {
    const response: WorkersResponse = {
      workers: await getAllWorkers(),
    };

    res.json(response);
  } catch {
    const response: ApiErrorResponse = {
      message: "Unable to load workers right now.",
    };

    res.status(500).json(response);
  }
};

export const handleRegisterWorker: RequestHandler = async (req, res) => {
  const result = workerRegistrationSchema.safeParse(req.body);

  if (!result.success) {
    const response: ApiErrorResponse = {
      message: "Please check the registration details and try again.",
      errors: z.flattenError(result.error).fieldErrors,
    };

    return res.status(400).json(response);
  }

  try {
    const existingWorkers = await getAllWorkers();
    const worker = createWorker(result.data, existingWorkers);
    await saveRegisteredWorker(worker);

    const response: WorkerRegistrationSuccessResponse = {
      message: "Worker registration saved successfully.",
      worker,
    };

    return res.status(201).json(response);
  } catch {
    const response: ApiErrorResponse = {
      message: "Unable to save registration right now.",
    };

    return res.status(500).json(response);
  }
};
