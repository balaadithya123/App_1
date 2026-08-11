import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Report, ReportRequest } from "../../shared/api";

const dataDirectory = path.join(process.cwd(), "data");
const reportsFile = path.join(dataDirectory, "reports.json");

export const readReports = async (): Promise<Report[]> => {
  try {
    const contents = await readFile(reportsFile, "utf8");
    return JSON.parse(contents) as Report[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
};

export const saveReport = async (reportRequest: ReportRequest) => {
  const reports = await readReports();
  const report: Report = {
    id: `report-${Date.now().toString(36)}`,
    reason: reportRequest.reason,
    feedback: reportRequest.feedback,
    createdAt: new Date().toISOString(),
  };
  const nextReports = [...reports, report];

  await mkdir(dataDirectory, { recursive: true });
  await writeFile(reportsFile, JSON.stringify(nextReports, null, 2));

  return report;
};
