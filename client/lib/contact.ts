import type { Worker } from "@/data/workers";

export const getWorkerContactHref = (worker: Pick<Worker, "phone">) => {
  const phone = worker.phone.trim();
  const dialablePhone = phone.replace(/[^+\d]/g, "");
  return `tel:${dialablePhone}`;
};

export const getWorkerWhatsAppHref = (worker: Pick<Worker, "phone" | "name">) => {
  const digits = worker.phone.replace(/\D/g, "");
  const message = encodeURIComponent(`Hi ${worker.name}, I found your profile on LocalWorker and would like to ask about your services.`);
  return `https://wa.me/${digits}?text=${message}`;
};
