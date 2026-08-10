import type { Worker } from "./workers";

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

export type WorkerRegistrationRequest = {
  fullName: string;
  phone: string;
  category: string;
  location: string;
  experience: string;
  services: string;
  about: string;
};

export type WorkersResponse = {
  workers: Worker[];
};

export type WorkerRegistrationSuccessResponse = {
  message: string;
  worker: Worker;
};

export type ApiErrorResponse = {
  message: string;
  errors?: Record<string, string[]>;
};
