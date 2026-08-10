import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Worker } from "../../shared/workers";

const dataDirectory = path.join(process.cwd(), "data");
const registeredWorkersFile = path.join(dataDirectory, "registered-workers.json");

export const readRegisteredWorkers = async (): Promise<Worker[]> => {
  try {
    const contents = await readFile(registeredWorkersFile, "utf8");
    return JSON.parse(contents) as Worker[];
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
