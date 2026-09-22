import { describe, expect, it } from "vitest";
import {
  ALLOWED_RECURRING_MAINTENANCE_ITEMS,
  MAINTENANCE_ITEM_DETAILS,
  maintenanceReminderSchema,
} from "./maintenance";

describe("maintenance reminders schema & validation", () => {
  it("allows valid recurring maintenance items", () => {
    for (const itemType of ALLOWED_RECURRING_MAINTENANCE_ITEMS) {
      const result = maintenanceReminderSchema.safeParse({
        item_type: itemType,
        due_date: "2026-10-15",
        last_serviced_at: "2026-04-15",
        reminder_interval_months: 6,
        notes: "Check filter condition",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.item_type).toBe(itemType);
        expect(MAINTENANCE_ITEM_DETAILS[itemType]).toBeDefined();
      }
    }
  });

  it("explicitly rejects one-time services like painting", () => {
    const result = maintenanceReminderSchema.safeParse({
      item_type: "painting",
      due_date: "2026-10-15",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain(
        "Only recurring maintenance items (AC servicing, geyser, water pump, RO purifier) are supported"
      );
    }
  });

  it("rejects invalid date format", () => {
    const result = maintenanceReminderSchema.safeParse({
      item_type: "ac_servicing",
      due_date: "not-a-date",
    });

    expect(result.success).toBe(false);
  });
});
