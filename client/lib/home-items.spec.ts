import { describe, it, expect } from "vitest";
import {
  computeDueDate,
  getReminderStatus,
  getDueAndUpcomingHomeItems,
  getPresetLastServicedDate,
  formatDateIso,
  DEFAULT_MAINTENANCE_CATALOG,
  type HomeItem,
} from "./home-items";

describe("home-items plain date arithmetic & reminder logic", () => {
  it("computes exact due date by adding interval_months", () => {
    // 4 months after 2026-01-15 -> 2026-05-15
    const due1 = computeDueDate("2026-01-15", 4);
    expect(formatDateIso(due1)).toBe("2026-05-15");

    // 12 months after 2025-09-20 -> 2026-09-20
    const due2 = computeDueDate("2025-09-20", 12);
    expect(formatDateIso(due2)).toBe("2026-09-20");

    // Clamps day when target month has fewer days (e.g. May 31 + 1 month -> June 30)
    const due3 = computeDueDate("2026-05-31", 1);
    expect(formatDateIso(due3)).toBe("2026-06-30");

    // Jan 31 + 1 month in non-leap year -> Feb 28
    const due4 = computeDueDate("2026-01-31", 1);
    expect(formatDateIso(due4)).toBe("2026-02-28");
  });

  it("identifies items due today", () => {
    const today = new Date(2026, 8, 21); // 2026-09-21
    const status = getReminderStatus(
      { last_serviced_date: "2026-05-21", interval_months: 4 },
      today
    );
    expect(status.isDue).toBe(true);
    expect(status.isOverdue).toBe(false);
    expect(status.diffDays).toBe(0);
    expect(status.statusText).toBe("Due today");
  });

  it("identifies overdue items and calculates overdue days correctly", () => {
    const today = new Date(2026, 8, 21); // 2026-09-21
    // Serviced 2026-01-21 with 6 month interval -> due 2026-07-21 (2 months overdue)
    const status = getReminderStatus(
      { last_serviced_date: "2026-01-21", interval_months: 6 },
      today
    );
    expect(status.isDue).toBe(true);
    expect(status.isOverdue).toBe(true);
    expect(status.diffDays).toBeGreaterThan(50);
    expect(status.statusText).toContain("Overdue");
  });

  it("identifies upcoming items that are not yet due", () => {
    const today = new Date(2026, 8, 21); // 2026-09-21
    // Serviced today with 4 month interval -> due 2027-01-21
    const status = getReminderStatus(
      { last_serviced_date: "2026-09-21", interval_months: 4 },
      today
    );
    expect(status.isDue).toBe(false);
    expect(status.isOverdue).toBe(false);
    expect(status.diffDays).toBeLessThan(0);
    expect(status.statusText).toContain("Due in");
  });

  it("correctly separates and sorts due/overdue (overdue first) and upcoming (soonest first)", () => {
    const today = new Date(2026, 8, 21); // 2026-09-21

    const items: HomeItem[] = [
      {
        id: "1",
        user_id: "user-1",
        item_type: "ac_servicing",
        label: "Living Room AC",
        last_serviced_date: "2026-05-21", // due today (4 mo -> 2026-09-21)
        interval_months: 4,
        category_slug: "ac-servicing",
      },
      {
        id: "2",
        user_id: "user-1",
        item_type: "ro_filter",
        label: "Kitchen RO Filter",
        last_serviced_date: "2026-01-01", // due 2026-07-01 (~82 days overdue)
        interval_months: 6,
        category_slug: "ro-water-purifier",
      },
      {
        id: "3",
        user_id: "user-1",
        item_type: "geyser_service",
        label: "Bathroom Geyser",
        last_serviced_date: "2026-08-01", // due 2027-08-01 (due in ~11 months)
        interval_months: 12,
        category_slug: "geyser-service",
      },
      {
        id: "4",
        user_id: "user-1",
        item_type: "inverter_battery_check",
        label: "Home Inverter Battery",
        last_serviced_date: "2026-07-21", // due 2026-10-21 (due in 1 month)
        interval_months: 3,
        category_slug: "inverter-battery",
      },
    ];

    const result = getDueAndUpcomingHomeItems(items, today);

    expect(result.dueOrOverdueCount).toBe(2);
    expect(result.dueOrOverdue).toHaveLength(2);
    // Overdue first: RO filter (diffDays ~82) must come BEFORE AC (diffDays = 0)
    expect(result.dueOrOverdue[0].id).toBe("2");
    expect(result.dueOrOverdue[1].id).toBe("1");

    // Upcoming: Inverter battery (due 2026-10-21) must come BEFORE Geyser (due 2027-08-01)
    expect(result.upcoming).toHaveLength(2);
    expect(result.upcoming[0].id).toBe("4");
    expect(result.upcoming[1].id).toBe("3");
  });

  it("provides quick preset date strings for onboarding", () => {
    const today = new Date(2026, 8, 21);
    expect(getPresetLastServicedDate("today", today)).toBe("2026-09-21");
    expect(getPresetLastServicedDate("1_3_months_ago", today)).toBe("2026-07-21");
    expect(getPresetLastServicedDate("6_plus_months_ago", today)).toBe("2026-03-21");
  });

  it("contains all 9 required recurring maintenance catalog items", () => {
    expect(DEFAULT_MAINTENANCE_CATALOG).toHaveLength(9);
    const itemTypes = DEFAULT_MAINTENANCE_CATALOG.map((i) => i.item_type);
    expect(itemTypes).toContain("ac_servicing");
    expect(itemTypes).toContain("geyser_service");
    expect(itemTypes).toContain("ro_filter");
    expect(itemTypes).toContain("water_pump_service");
    expect(itemTypes).toContain("inverter_battery_check");
    expect(itemTypes).toContain("pest_control");
    expect(itemTypes).toContain("chimney_exhaust_clean");
    expect(itemTypes).toContain("washing_machine_service");
    expect(itemTypes).toContain("overhead_tank_clean");
  });
});
