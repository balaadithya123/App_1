import type { Worker } from "./workers";

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

export type WorkerRegistrationRequest = {
  id?: string;
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

export type ReportRequest = {
  reason: string;
  feedback: string;
};

export type Report = ReportRequest & {
  id: string;
  createdAt: string;
};

export type ReportSuccessResponse = {
  message: string;
  report: Report;
};
