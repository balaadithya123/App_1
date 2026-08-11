import { z } from "zod";
import type { Report, ReportRequest } from "../../shared/api";
import { supabase } from "./supabase";

const persistedReportSchema = z.object({
  id: z.string().trim().min(1),
  reason: z.string().trim().min(1),
  feedback: z.string().trim().min(1),
  created_at: z.string().optional(),
});

export const readReports = async (): Promise<Report[]> => {
  const { data, error } = await supabase
    .from("reports")
    .select("id,reason,feedback,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Unable to load reports from Supabase: ${error.message}`);
  }

  return z.array(persistedReportSchema).parse(data ?? []).map((report) => ({
    id: report.id,
    reason: report.reason,
    feedback: report.feedback,
    createdAt: report.created_at ?? new Date().toISOString(),
  }));
};

export const saveReport = async (reportRequest: ReportRequest) => {
  const reportId = `report-${Date.now().toString(36)}`;

  const { data, error } = await supabase
    .from("reports")
    .insert({
      id: reportId,
      reason: reportRequest.reason,
      feedback: reportRequest.feedback,
    })
    .select("id,reason,feedback,created_at")
    .single();

  if (error) {
    throw new Error(`Unable to save report to Supabase: ${error.message}`);
  }

  const report = persistedReportSchema.parse(data);

  return {
    id: report.id,
    reason: report.reason,
    feedback: report.feedback,
    createdAt: report.created_at ?? new Date().toISOString(),
  } satisfies Report;
};
