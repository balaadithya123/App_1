import type { Worker } from "@/data/workers";

export const findWorkerById = (workers: Worker[], workerId: string | null) => {
  const normalizedWorkerId = workerId?.trim();

  if (!normalizedWorkerId) {
    return undefined;
  }

  return workers.find((worker) => worker.id === normalizedWorkerId);
};
