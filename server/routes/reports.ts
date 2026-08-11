import type { RequestHandler } from "express";
import { z } from "zod";
import type { ApiErrorResponse, ReportSuccessResponse } from "../../shared/api";
import { saveReport } from "../lib/reports";

export const reportSchema = z.object({
  reason: z.enum([
    "Incorrect information",
    "Worker no longer available",
    "Inappropriate information",
    "Other",
  ]),
  feedback: z.string().trim().min(1, "Additional details are required"),
});

export const handleCreateReport: RequestHandler = async (req, res) => {
  const result = reportSchema.safeParse(req.body);

  if (!result.success) {
    const response: ApiErrorResponse = {
      message: "Please check the report details and try again.",
      errors: z.flattenError(result.error).fieldErrors,
    };

    return res.status(400).json(response);
  }

  try {
    const report = await saveReport(result.data);
    const response: ReportSuccessResponse = {
      message: "Report submitted successfully.",
      report,
    };

    return res.status(201).json(response);
  } catch {
    const response: ApiErrorResponse = {
      message: "Unable to save report right now.",
    };

    return res.status(500).json(response);
  }
};
