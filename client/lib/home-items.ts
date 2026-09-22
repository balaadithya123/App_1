import { supabase } from "@/lib/supabase";
import type {
  HomeItem,
  MaintenanceCatalogItem,
  ReminderStatus,
  HomeItemWithStatus,
} from "@shared/home-reminders";

export type {
  HomeItem,
  MaintenanceCatalogItem,
  ReminderStatus,
  HomeItemWithStatus,
};

export const DEFAULT_MAINTENANCE_CATALOG: MaintenanceCatalogItem[] = [
  {
    item_type: "ac_servicing",
    default_label: "AC servicing",
    default_interval_months: 4,
    category_slug: "ac-servicing",
    icon_name: "Wind",
  },
  {
    item_type: "geyser_service",
    default_label: "Geyser/water heater service",
    default_interval_months: 12,
    category_slug: "geyser-service",
    icon_name: "Flame",
  },
  {
    item_type: "ro_filter",
    default_label: "RO/water purifier filter",
    default_interval_months: 6,
    category_slug: "ro-water-purifier",
    icon_name: "Droplets",
  },
  {
    item_type: "water_pump_service",
    default_label: "Water pump/motor service",
    default_interval_months: 12,
    category_slug: "water-pump-motor",
    icon_name: "Gauge",
  },
  {
    item_type: "inverter_battery_check",
    default_label: "Inverter battery check",
    default_interval_months: 3,
    category_slug: "inverter-battery",
    icon_name: "BatteryCharging",
  },
  {
    item_type: "pest_control",
    default_label: "Pest control",
    default_interval_months: 4,
    category_slug: "pest-control",
    icon_name: "Bug",
  },
  {
    item_type: "chimney_exhaust_clean",
    default_label: "Chimney/exhaust deep clean",
    default_interval_months: 6,
    category_slug: "chimney-exhaust",
    icon_name: "Sparkles",
  },
  {
    item_type: "washing_machine_service",
    default_label: "Washing machine service",
    default_interval_months: 12,
    category_slug: "washing-machine",
    icon_name: "RotateCw",
  },
  {
    item_type: "overhead_tank_clean",
    default_label: "Overhead tank/sump cleaning",
    default_interval_months: 6,
    category_slug: "overhead-tank-sump",
    icon_name: "Waves",
  },
];

const LOCAL_STORAGE_KEY = "app1:customer-home-items";

export function formatDateIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Plain date arithmetic: computes exact due date from last_serviced_date + interval_months.
 * Handles month lengths & leap years by clamping day to target month's maximum days.
 */
export function computeDueDate(lastServicedDateStr: string, intervalMonths: number): Date {
  const cleanStr = (lastServicedDateStr || "").trim();
  const [yearStr, monthStr, dayStr] = cleanStr.split("-");
  const parsedYear = Number(yearStr);
  const parsedMonth = Number(monthStr);
  const parsedDay = Number(dayStr);

  const baseYear = Number.isFinite(parsedYear) ? parsedYear : new Date().getFullYear();
  const baseMonth = Number.isFinite(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12 ? parsedMonth - 1 : 0;
  const baseDay = Number.isFinite(parsedDay) && parsedDay >= 1 && parsedDay <= 31 ? parsedDay : 1;

  const totalMonths = baseMonth + Math.max(1, Math.round(intervalMonths));
  const targetYear = baseYear + Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12;

  // Last day of target month (day 0 of month+1 gives last day of month)
  const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const targetDay = Math.min(baseDay, daysInTargetMonth);

  return new Date(targetYear, targetMonth, targetDay, 0, 0, 0, 0);
}

/**
 * Generates status details for a home maintenance item.
 * today >= dueDate means due or overdue.
 */
export function getReminderStatus(
  item: Pick<HomeItem, "last_serviced_date" | "interval_months">,
  referenceDate?: Date
): ReminderStatus {
  const ref = referenceDate ? new Date(referenceDate) : new Date();
  const today = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 0, 0, 0, 0);
  const dueDate = computeDueDate(item.last_serviced_date, item.interval_months);
  const dueDateStr = formatDateIso(dueDate);

  const msPerDay = 1000 * 60 * 60 * 24;
  const diffDays = Math.round((today.getTime() - dueDate.getTime()) / msPerDay);
  const isDue = diffDays >= 0;
  const isOverdue = diffDays > 0;

  let statusText = "";
  if (diffDays > 0) {
    if (diffDays === 1) {
      statusText = "Overdue by 1 day";
    } else if (diffDays < 30) {
      statusText = `Overdue by ${diffDays} days`;
    } else {
      const months = Math.floor(diffDays / 30);
      const remainingDays = diffDays % 30;
      if (months === 1) {
        statusText = remainingDays > 3 ? `Overdue by ~1 mo (${diffDays}d)` : "Overdue by 1 month";
      } else {
        statusText = `Overdue by ${months} months (${diffDays}d)`;
      }
    }
  } else if (diffDays === 0) {
    statusText = "Due today";
  } else {
    const absDays = Math.abs(diffDays);
    if (absDays === 1) {
      statusText = "Due tomorrow";
    } else if (absDays < 30) {
      statusText = `Due in ${absDays} days`;
    } else {
      const months = Math.round(absDays / 30);
      statusText = months <= 1 ? "Due in ~1 month" : `Due in ${months} months`;
    }
  }

  return {
    dueDate,
    dueDateStr,
    diffDays,
    isDue,
    isOverdue,
    statusText,
  };
}

/**
 * Returns date presets for quick first-run inputs
 */
export function getPresetLastServicedDate(
  preset: "today" | "1_3_months_ago" | "6_plus_months_ago",
  referenceDate?: Date
): string {
  const ref = referenceDate ? new Date(referenceDate) : new Date();
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const d = ref.getDate();

  switch (preset) {
    case "today":
      return formatDateIso(new Date(y, m, d));
    case "1_3_months_ago":
      // ~2 months ago
      return formatDateIso(new Date(y, m - 2, d));
    case "6_plus_months_ago":
      // ~6 months ago
      return formatDateIso(new Date(y, m - 6, d));
  }
}

/**
 * Separates items into due/overdue vs upcoming and sorts them.
 * Due/Overdue: sorted overdue-first (most days overdue at top), then soonest-due.
 * Upcoming: sorted soonest-due first (least days remaining at top).
 */
export function getDueAndUpcomingHomeItems(
  items: HomeItem[],
  referenceDate?: Date
): {
  dueOrOverdue: HomeItemWithStatus[];
  upcoming: HomeItemWithStatus[];
  dueOrOverdueCount: number;
} {
  const decorated: HomeItemWithStatus[] = items.map((item) => ({
    ...item,
    status: getReminderStatus(item, referenceDate),
  }));

  const dueOrOverdue = decorated
    .filter((item) => item.status.isDue)
    .sort((a, b) => {
      // Overdue-first: largest diffDays first (most overdue)
      if (b.status.diffDays !== a.status.diffDays) {
        return b.status.diffDays - a.status.diffDays;
      }
      return a.label.localeCompare(b.label);
    });

  const upcoming = decorated
    .filter((item) => !item.status.isDue)
    .sort((a, b) => {
      // Soonest-due first: earliest due date (closest to today, least negative diffDays)
      return a.status.dueDate.getTime() - b.status.dueDate.getTime();
    });

  return {
    dueOrOverdue,
    upcoming,
    dueOrOverdueCount: dueOrOverdue.length,
  };
}

/* =========================================================================
   Storage & Supabase Service Layer
   ========================================================================= */

function readLocalStorage(userId?: string): HomeItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const list: HomeItem[] = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    if (userId) {
      return list.filter((i) => i.user_id === userId || !i.user_id);
    }
    return list;
  } catch {
    return [];
  }
}

function writeLocalStorage(items: HomeItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("home-items-changed"));
  } catch (err) {
    console.warn("Could not write home items to localStorage:", err);
  }
}

/**
 * Fetches the maintenance catalog, falling back to DEFAULT_MAINTENANCE_CATALOG
 */
export async function fetchMaintenanceCatalog(): Promise<MaintenanceCatalogItem[]> {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from("maintenance_catalog")
        .select("*")
        .order("created_at", { ascending: true });

      if (!error && data && data.length > 0) {
        return data as MaintenanceCatalogItem[];
      }
    }
  } catch (err) {
    console.warn("fetchMaintenanceCatalog error, using fallback:", err);
  }
  return DEFAULT_MAINTENANCE_CATALOG;
}

/**
 * Fetches the customer's private home items
 */
export async function fetchUserHomeItems(userId?: string): Promise<HomeItem[]> {
  let effectiveUserId = userId;
  if (!effectiveUserId && supabase) {
    const { data } = await supabase.auth.getSession();
    effectiveUserId = data.session?.user?.id;
  }

  if (supabase && effectiveUserId) {
    try {
      const { data, error } = await supabase
        .from("home_items")
        .select("*")
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        // Sync to local storage as warm cache
        writeLocalStorage(data as HomeItem[]);
        return data as HomeItem[];
      }
    } catch (err) {
      console.warn("fetchUserHomeItems Supabase query failed:", err);
    }
  }

  // Fallback to local storage
  return readLocalStorage(effectiveUserId);
}

/**
 * Creates a single home item
 */
export async function createUserHomeItem(
  item: Omit<HomeItem, "id" | "created_at" | "updated_at">
): Promise<HomeItem> {
  const newItem: HomeItem = {
    ...item,
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (supabase && item.user_id) {
    try {
      const { data, error } = await supabase
        .from("home_items")
        .insert({
          user_id: item.user_id,
          item_type: item.item_type,
          label: item.label,
          last_serviced_date: item.last_serviced_date,
          interval_months: item.interval_months,
          category_slug: item.category_slug,
        })
        .select()
        .single();

      if (!error && data) {
        const local = readLocalStorage(item.user_id).filter((i) => i.id !== (data as HomeItem).id);
        writeLocalStorage([data as HomeItem, ...local]);
        return data as HomeItem;
      }
    } catch (err) {
      console.warn("createUserHomeItem Supabase insert failed:", err);
    }
  }

  const local = readLocalStorage(item.user_id);
  writeLocalStorage([newItem, ...local]);
  return newItem;
}

/**
 * Batch-creates home items (e.g. from first-run catalog onboarding)
 */
export async function createBatchUserHomeItems(
  items: Array<Omit<HomeItem, "id" | "created_at" | "updated_at">>
): Promise<HomeItem[]> {
  if (items.length === 0) return [];
  const userId = items[0]?.user_id;

  if (supabase && userId) {
    try {
      const payload = items.map((i) => ({
        user_id: i.user_id,
        item_type: i.item_type,
        label: i.label,
        last_serviced_date: i.last_serviced_date,
        interval_months: i.interval_months,
        category_slug: i.category_slug,
      }));

      const { data, error } = await supabase
        .from("home_items")
        .insert(payload)
        .select();

      if (!error && data) {
        const created = data as HomeItem[];
        const local = readLocalStorage(userId).filter(
          (old) => !created.some((c) => c.id === old.id)
        );
        writeLocalStorage([...created, ...local]);
        return created;
      }
    } catch (err) {
      console.warn("createBatchUserHomeItems Supabase insert failed:", err);
    }
  }

  const newItems: HomeItem[] = items.map((item) => ({
    ...item,
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const local = readLocalStorage(userId);
  writeLocalStorage([...newItems, ...local]);
  return newItems;
}

/**
 * Updates an existing home item
 */
export async function updateUserHomeItem(
  id: string,
  updates: Partial<Pick<HomeItem, "label" | "last_serviced_date" | "interval_months" | "category_slug">>
): Promise<HomeItem | null> {
  const payload = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("home_items")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

      if (!error && data) {
        const current = readLocalStorage();
        const updated = current.map((i) => (i.id === id ? (data as HomeItem) : i));
        writeLocalStorage(updated);
        return data as HomeItem;
      }
    } catch (err) {
      console.warn("updateUserHomeItem Supabase update failed:", err);
    }
  }

  const current = readLocalStorage();
  let result: HomeItem | null = null;
  const updated = current.map((i) => {
    if (i.id === id) {
      result = { ...i, ...payload };
      return result;
    }
    return i;
  });
  writeLocalStorage(updated);
  return result;
}

/**
 * Resets last_serviced_date to today for an item ("Mark as done today")
 */
export async function markHomeItemDoneToday(id: string): Promise<HomeItem | null> {
  const todayIso = formatDateIso(new Date());
  return updateUserHomeItem(id, {
    last_serviced_date: todayIso,
  });
}

/**
 * Deletes a home item
 */
export async function deleteUserHomeItem(id: string): Promise<boolean> {
  if (supabase) {
    try {
      const { error } = await supabase.from("home_items").delete().eq("id", id);
      if (!error) {
        const current = readLocalStorage();
        writeLocalStorage(current.filter((i) => i.id !== id));
        return true;
      }
    } catch (err) {
      console.warn("deleteUserHomeItem Supabase delete failed:", err);
    }
  }

  const current = readLocalStorage();
  writeLocalStorage(current.filter((i) => i.id !== id));
  return true;
}

/**
 * Synchronous badge calculation from locally stored/cached items
 */
export function getStoredDueBadgeCount(userId?: string, referenceDate?: Date): number {
  const items = readLocalStorage(userId);
  const { dueOrOverdueCount } = getDueAndUpcomingHomeItems(items, referenceDate);
  return dueOrOverdueCount;
}

/**
 * Asynchronous badge calculation from live items
 */
export async function getLiveDueBadgeCount(userId?: string, referenceDate?: Date): Promise<number> {
  const items = await fetchUserHomeItems(userId);
  const { dueOrOverdueCount } = getDueAndUpcomingHomeItems(items, referenceDate);
  return dueOrOverdueCount;
}
