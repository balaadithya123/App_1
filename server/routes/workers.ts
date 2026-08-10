import type { RequestHandler } from "express";
import { z } from "zod";
import type {
  ApiErrorResponse,
  WorkerRegistrationSuccessResponse,
  WorkersResponse,
} from "../../shared/api";
import { staticWorkers, type Worker } from "../../shared/workers";
import { readRegisteredWorkers, saveRegisteredWorker } from "../lib/registered-workers";

const workerRegistrationSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required"),
  phone: z.string().trim().min(1, "Phone number is required"),
  category: z.string().trim().min(1, "Work category is required"),
  location: z.string().trim().min(1, "Location is required"),
  experience: z.string().trim().min(1, "Years of experience is required"),
  services: z.string().trim().min(1, "Services offered is required"),
  about: z.string().trim().min(1, "About you is required"),
});

const createWorkerId = (fullName: string) => {
  const slug = fullName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return `${slug || "worker"}-${Date.now().toString(36)}`;
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

const createWorker = (registration: z.infer<typeof workerRegistrationSchema>): Worker => ({
  id: createWorkerId(registration.fullName),
  name: registration.fullName,
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

export const handleGetWorkers: RequestHandler = async (_req, res) => {
  try {
    const registeredWorkers = await readRegisteredWorkers();
    const response: WorkersResponse = {
      workers: [...staticWorkers, ...registeredWorkers],
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
    const worker = createWorker(result.data);
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
