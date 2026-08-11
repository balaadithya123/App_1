import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { Worker } from "../../shared/workers";

const dataDirectory = path.join(process.cwd(), "data");
const registeredWorkersFile = path.join(dataDirectory, "registered-workers.json");

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
});

const persistedWorkersSchema = z.array(persistedWorkerSchema);

export const readRegisteredWorkers = async (): Promise<Worker[]> => {
  try {
    const contents = await readFile(registeredWorkersFile, "utf8");
    return persistedWorkersSchema.parse(JSON.parse(contents)) as Worker[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
};

export const saveRegisteredWorker = async (worker: Worker) => {
  const workers = await readRegisteredWorkers();
  const nextWorkers = [...workers, worker];

  await mkdir(dataDirectory, { recursive: true });
  await writeFile(registeredWorkersFile, JSON.stringify(nextWorkers, null, 2));

  return worker;
};
