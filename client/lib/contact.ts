import type { Worker } from "@/data/workers";

export const getWorkerContactHref = (worker: Pick<Worker, "phone">) => {
  const phone = worker.phone.trim();
  const dialablePhone = phone.replace(/[^+\d]/g, "");

  return `tel:${dialablePhone}`;
};
