import type { Worker } from "@/data/workers";

export const findWorkerById = (workers: Worker[], workerId: string | null) =>
  workers.find((worker) => worker.id === workerId);
