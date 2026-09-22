import type { RequestHandler } from "express";
import { z } from "zod";
import { supabase } from "../lib/supabase";
import type { ApiErrorResponse } from "../../shared/api";

export const ALLOWED_RECURRING_MAINTENANCE_ITEMS = [
  "ac_servicing",
  "geyser",
  "water_pump",
  "ro_purifier",
] as const;

export type RecurringMaintenanceItem = (typeof ALLOWED_RECURRING_MAINTENANCE_ITEMS)[number];

export const MAINTENANCE_ITEM_DETAILS: Record<
  RecurringMaintenanceItem,
  { title: string; categorySearchTerm: string; defaultIntervalMonths: number }
> = {
  ac_servicing: {
    title: "AC Servicing",
    categorySearchTerm: "AC Repair",
    defaultIntervalMonths: 6,
  },
  geyser: {
    title: "Geyser Maintenance",
    categorySearchTerm: "Plumber",
    defaultIntervalMonths: 12,
  },
  water_pump: {
    title: "Water Pump Inspection",
    categorySearchTerm: "Plumber",
    defaultIntervalMonths: 6,
  },
  ro_purifier: {
    title: "RO Purifier Filter Change",
    categorySearchTerm: "Appliance Repair",
    defaultIntervalMonths: 6,
  },
};

export const maintenanceReminderSchema = z.object({
  item_type: z.enum(ALLOWED_RECURRING_MAINTENANCE_ITEMS, {
    message:
      "Only recurring maintenance items (AC servicing, geyser, water pump, RO purifier) are supported. One-time services like painting are excluded.",
  }),
  last_serviced_at: z.string().date().nullable().optional(),
  due_date: z.string().date(),
  reminder_interval_months: z.number().int().min(1).max(36).optional().default(6),
  notes: z.string().max(500).optional().nullable(),
});

const getAuthenticatedUser = async (req: Parameters<RequestHandler>[0]) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) throw new Error("UNAUTHORIZED");
  const token = authorization.slice("Bearer ".length);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Error("UNAUTHORIZED");
  return data.user;
};

export const handleGetMaintenanceReminders: RequestHandler = async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    const { data, error } = await supabase
      .from("maintenance_reminders")
      .select("*")
      .eq("user_id", user.id)
      .order("due_date", { ascending: true });

    if (error) {
      console.warn("[maintenance] DB fetch warning:", error.message);
      return res.json({ reminders: [] });
    }

    return res.json({ reminders: data ?? [] });
  } catch (error) {
    const code = error instanceof Error ? error.message : "Unable to load maintenance reminders.";
    const status = code === "UNAUTHORIZED" ? 401 : 500;
    return res.status(status).json({
      message: status === 401 ? "Please log in to manage maintenance reminders." : code,
    } satisfies ApiErrorResponse);
  }
};

export const handleSaveMaintenanceReminder: RequestHandler = async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    const parseResult = maintenanceReminderSchema.safeParse(req.body);

    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return res.status(400).json({
        message: issue?.message || "Invalid maintenance reminder payload.",
      } satisfies ApiErrorResponse);
    }

    const { item_type, last_serviced_at, due_date, reminder_interval_months, notes } =
      parseResult.data;

    const details = MAINTENANCE_ITEM_DETAILS[item_type];

    const payload = {
      user_id: user.id,
      item_type,
      title: details.title,
      category_search_term: details.categorySearchTerm,
      last_serviced_at: last_serviced_at || null,
      due_date,
      reminder_interval_months: reminder_interval_months || details.defaultIntervalMonths,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    };

    // Upsert reminder based on user_id and item_type
    const { data, error } = await supabase
      .from("maintenance_reminders")
      .upsert(payload, { onConflict: "user_id,item_type" })
      .select()
      .single();

    if (error) {
      const { data: insertedData, error: insertError } = await supabase
        .from("maintenance_reminders")
        .insert([payload])
        .select()
        .single();

      if (insertError) throw new Error(insertError.message);
      return res.json({ reminder: insertedData });
    }

    return res.json({ reminder: data });
  } catch (error) {
    const code = error instanceof Error ? error.message : "Unable to save maintenance reminder.";
    const status = code === "UNAUTHORIZED" ? 401 : 500;
    return res.status(status).json({
      message: status === 401 ? "Please log in to save maintenance reminders." : code,
    } satisfies ApiErrorResponse);
  }
};

export const handleDeleteMaintenanceReminder: RequestHandler = async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Reminder ID is required." } satisfies ApiErrorResponse);
    }

    const { error } = await supabase
      .from("maintenance_reminders")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw new Error(error.message);

    return res.json({ ok: true });
  } catch (error) {
    const code = error instanceof Error ? error.message : "Unable to delete maintenance reminder.";
    const status = code === "UNAUTHORIZED" ? 401 : 500;
    return res.status(status).json({
      message: status === 401 ? "Please log in to manage maintenance reminders." : code,
    } satisfies ApiErrorResponse);
  }
};
