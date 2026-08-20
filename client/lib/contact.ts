import type { Worker } from "@/data/workers";

export const getWorkerContactHref = (worker: Pick<Worker, "phone">) => {
  const phone = worker.phone.trim();
  const dialablePhone = phone.replace(/[^+\d]/g, "");
  return `tel:${dialablePhone}`;
};

export const getWorkerWhatsAppHref = (worker: Pick<Worker, "phone" | "name" | "category">) => {
  const digits = worker.phone.replace(/\D/g, "");
  const message = encodeURIComponent(`Hi ${worker.name}, I found you on App_1 and need help with ${worker.category}.`);
  return `https://wa.me/${digits}?text=${message}`;
};
