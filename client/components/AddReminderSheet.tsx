import React, { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Wind,
  Flame,
  Droplets,
  Gauge,
  BatteryCharging,
  Bug,
  Sparkles,
  RotateCw,
  Waves,
  Wrench,
  Calendar,
  Plus,
  Check,
  CheckCircle2,
  Clock,
  Sparkle,
} from "lucide-react";
import {
  type MaintenanceCatalogItem,
  DEFAULT_MAINTENANCE_CATALOG,
  fetchMaintenanceCatalog,
  createBatchUserHomeItems,
  createUserHomeItem,
  getPresetLastServicedDate,
  formatDateIso,
} from "@/lib/home-items";

interface AddReminderSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
  onItemsAdded: () => void;
  initialMode?: "catalog" | "custom";
}

export const getCatalogIcon = (iconName: string, className = "h-4 w-4") => {
  switch (iconName) {
    case "Wind":
      return <Wind className={className} />;
    case "Flame":
      return <Flame className={className} />;
    case "Droplets":
      return <Droplets className={className} />;
    case "Gauge":
      return <Gauge className={className} />;
    case "BatteryCharging":
      return <BatteryCharging className={className} />;
    case "Bug":
      return <Bug className={className} />;
    case "Sparkles":
      return <Sparkles className={className} />;
    case "RotateCw":
      return <RotateCw className={className} />;
    case "Waves":
      return <Waves className={className} />;
    default:
      return <Wrench className={className} />;
  }
};

type QuickDateChoice =
  "today" | "1_3_months_ago" | "6_plus_months_ago" | "custom";

interface CatalogItemFormState {
  selected: boolean;
  label: string;
  intervalMonths: number;
  dateChoice: QuickDateChoice;
  customDate: string;
}

export default function AddReminderSheet({
  open,
  onOpenChange,
  userId,
  onItemsAdded,
  initialMode = "catalog",
}: AddReminderSheetProps) {
  const [activeTab, setActiveTab] = useState<"catalog" | "custom">(initialMode);
  const [catalog, setCatalog] = useState<MaintenanceCatalogItem[]>(
    DEFAULT_MAINTENANCE_CATALOG,
  );
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Catalog item choices state
  const [catalogState, setCatalogState] = useState<
    Record<string, CatalogItemFormState>
  >({});

  // Custom reminder state
  const [customLabel, setCustomLabel] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [customInterval, setCustomInterval] = useState<number>(6);
  const [customDateChoice, setCustomDateChoice] =
    useState<QuickDateChoice>("today");
  const [customExactDate, setCustomExactDate] = useState<string>(() =>
    formatDateIso(new Date()),
  );

  useEffect(() => {
    if (open) {
      setActiveTab(initialMode);
      setSuccessMessage("");
      void loadCatalog();
    }
  }, [open, initialMode]);

  const loadCatalog = async () => {
    setLoadingCatalog(true);
    try {
      const items = await fetchMaintenanceCatalog();
      setCatalog(items);

      const initial: Record<string, CatalogItemFormState> = {};
      const todayStr = formatDateIso(new Date());
      for (const item of items) {
        initial[item.item_type] = {
          selected: false,
          label: item.default_label,
          intervalMonths: item.default_interval_months,
          dateChoice: "today",
          customDate: todayStr,
        };
      }
      setCatalogState(initial);
    } finally {
      setLoadingCatalog(false);
    }
  };

  const toggleCatalogItemSelected = (itemType: string, checked: boolean) => {
    setCatalogState((prev) => ({
      ...prev,
      [itemType]: {
        ...prev[itemType],
        selected: checked,
      },
    }));
  };

  const setDateChoiceForItem = (
    itemType: string,
    choice: QuickDateChoice,
  ) => {
    setCatalogState((prev) => ({
      ...prev,
      [itemType]: {
        ...prev[itemType],
        dateChoice: choice,
      },
    }));
  };

  const setCustomDateForItem = (itemType: string, date: string) => {
    setCatalogState((prev) => ({
      ...prev,
      [itemType]: {
        ...prev[itemType],
        customDate: date,
      },
    }));
  };

  const setIntervalForItem = (itemType: string, interval: number) => {
    setCatalogState((prev) => ({
      ...prev,
      [itemType]: {
        ...prev[itemType],
        intervalMonths: Math.max(1, interval),
      },
    }));
  };

  const selectedCatalogCount = Object.values(catalogState).filter(
    (s) => s.selected,
  ).length;

  const handleSaveCatalogItems = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedTypes = Object.keys(catalogState).filter(
      (type) => catalogState[type]?.selected,
    );
    if (selectedTypes.length === 0) return;

    setSubmitting(true);
    try {
      const todayStr = formatDateIso(new Date());
      const batch = selectedTypes.map((itemType) => {
        const itemState = catalogState[itemType];
        const catItem =
          catalog.find((c) => c.item_type === itemType) ||
          DEFAULT_MAINTENANCE_CATALOG.find((c) => c.item_type === itemType)!;

        let lastServiced = todayStr;
        if (itemState.dateChoice === "custom") {
          lastServiced = itemState.customDate || todayStr;
        } else {
          lastServiced = getPresetLastServicedDate(itemState.dateChoice);
        }

        return {
          user_id: userId || "guest-user",
          item_type: catItem.item_type,
          label: itemState.label || catItem.default_label,
          last_serviced_date: lastServiced,
          interval_months: itemState.intervalMonths || catItem.default_interval_months,
          category_slug: catItem.category_slug,
        };
      });

      await createBatchUserHomeItems(batch);
      setSuccessMessage(`Added ${batch.length} reminders!`);
      onItemsAdded();
      setTimeout(() => {
        onOpenChange(false);
      }, 600);
    } catch (err) {
      console.error("Failed to save catalog reminders:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveCustomReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customLabel.trim()) return;

    setSubmitting(true);
    try {
      let lastServiced = formatDateIso(new Date());
      if (customDateChoice === "custom") {
        lastServiced = customExactDate || lastServiced;
      } else {
        lastServiced = getPresetLastServicedDate(customDateChoice);
      }

      const slug = (customCategory.trim() || customLabel.trim())
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      await createUserHomeItem({
        user_id: userId || "guest-user",
        item_type: "custom",
        label: customLabel.trim(),
        last_serviced_date: lastServiced,
        interval_months: Math.max(1, Number(customInterval) || 6),
        category_slug: slug || "general-maintenance",
      });

      setSuccessMessage("Custom reminder added!");
      onItemsAdded();
      setTimeout(() => {
        onOpenChange(false);
      }, 600);
    } catch (err) {
      console.error("Failed to add custom reminder:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl p-0 flex flex-col h-full bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-50 border-l border-zinc-200 dark:border-zinc-800"
      >
        <SheetHeader className="p-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/90">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 border border-zinc-200 dark:border-zinc-700">
              <Clock size={18} />
            </span>
            <div>
              <SheetTitle className="text-xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
                Add Home Reminder
              </SheetTitle>
              <SheetDescription className="text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-300">
                Track periodic maintenance cycles for your home.
              </SheetDescription>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="mt-4 flex rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1 border border-zinc-200 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => setActiveTab("catalog")}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === "catalog"
                  ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                  : "text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white"
              }`}
            >
              <Sparkle size={14} />
              <span>Popular Items</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("custom")}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === "custom"
                  ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                  : "text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white"
              }`}
            >
              <Plus size={14} />
              <span>Custom Reminder</span>
            </button>
          </div>
        </SheetHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {successMessage ? (
            <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in zoom-in-95">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 mb-3 border border-emerald-300 dark:border-emerald-800">
                <CheckCircle2 size={24} />
              </span>
              <h3 className="text-base sm:text-lg font-bold text-zinc-950 dark:text-zinc-50">
                {successMessage}
              </h3>
              <p className="text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-300 mt-1">
                Updating your Inbox schedule...
              </p>
            </div>
          ) : activeTab === "catalog" ? (
            <form
              id="catalog-form"
              onSubmit={handleSaveCatalogItems}
              className="space-y-4"
            >
              <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-zinc-700 dark:text-zinc-300 px-1">
                <span>Select appliances & fittings:</span>
                <span className="font-extrabold text-zinc-950 dark:text-zinc-50">
                  {selectedCatalogCount} selected
                </span>
              </div>

              {loadingCatalog ? (
                <div className="py-8 text-center text-xs font-semibold text-zinc-500">
                  Loading catalog...
                </div>
              ) : (
                catalog.map((item) => {
                  const state = catalogState[item.item_type] || {
                    selected: false,
                    label: item.default_label,
                    intervalMonths: item.default_interval_months,
                    dateChoice: "today",
                    customDate: formatDateIso(new Date()),
                  };

                  return (
                    <div
                      key={item.item_type}
                      className={`rounded-2xl border transition-all p-4 ${
                        state.selected
                          ? "border-zinc-950 dark:border-zinc-200 bg-zinc-50 dark:bg-zinc-800/80 shadow-xs"
                          : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <Checkbox
                          id={`cb-${item.item_type}`}
                          checked={state.selected}
                          onCheckedChange={(c) =>
                            toggleCatalogItemSelected(item.item_type, !!c)
                          }
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <label
                            htmlFor={`cb-${item.item_type}`}
                            className="flex items-center gap-2 font-bold text-sm sm:text-base cursor-pointer select-none"
                          >
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                              {getCatalogIcon(item.icon_name, "h-4 w-4")}
                            </span>
                            <span className="truncate text-zinc-950 dark:text-zinc-50">
                              {item.default_label}
                            </span>
                            <span className="ml-auto shrink-0 text-xs font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2.5 py-0.5 rounded-full">
                              Every {item.default_interval_months} mo
                            </span>
                          </label>

                          {/* Expanded Configuration when selected */}
                          {state.selected && (
                            <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700 space-y-3 animate-in fade-in duration-150">
                              <div>
                                <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                                  Last serviced date:
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                                  {(
                                    [
                                      { id: "today", label: "Today" },
                                      {
                                        id: "1_3_months_ago",
                                        label: "1–3 mo ago",
                                      },
                                      {
                                        id: "6_plus_months_ago",
                                        label: "6+ mo ago",
                                      },
                                      { id: "custom", label: "Custom date" },
                                    ] as const
                                  ).map((choice) => (
                                    <button
                                      type="button"
                                      key={choice.id}
                                      onClick={() =>
                                        setDateChoiceForItem(
                                          item.item_type,
                                          choice.id,
                                        )
                                      }
                                      className={`rounded-xl px-2.5 py-2 text-xs font-bold transition cursor-pointer text-center ${
                                        state.dateChoice === choice.id
                                          ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                                          : "border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                      }`}
                                    >
                                      {choice.label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {state.dateChoice === "custom" && (
                                <div className="flex items-center gap-2 pt-1">
                                  <Calendar
                                    size={14}
                                    className="text-zinc-600 dark:text-zinc-300"
                                  />
                                  <input
                                    type="date"
                                    value={state.customDate}
                                    onChange={(e) =>
                                      setCustomDateForItem(
                                        item.item_type,
                                        e.target.value,
                                      )
                                    }
                                    max={formatDateIso(new Date())}
                                    className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-950 dark:text-zinc-50"
                                  />
                                </div>
                              )}

                              <div className="flex items-center gap-2 pt-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                <span>Cycle: Every</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={60}
                                  value={state.intervalMonths}
                                  onChange={(e) =>
                                    setIntervalForItem(
                                      item.item_type,
                                      Number(e.target.value) || 1,
                                    )
                                  }
                                  className="w-16 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-center text-xs font-bold text-zinc-950 dark:text-zinc-50"
                                />
                                <span>months</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </form>
          ) : (
            <form
              id="custom-form"
              onSubmit={handleSaveCustomReminder}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Reminder Label <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Water Filter UV Lamp, Solar Inverter"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3.5 py-2.5 text-sm font-semibold text-zinc-950 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Trade Category
                </label>
                <input
                  type="text"
                  placeholder="e.g. Plumber, Electrician, Technician"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3.5 py-2.5 text-sm font-semibold text-zinc-950 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Service Cycle (Months) <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={60}
                    required
                    value={customInterval}
                    onChange={(e) =>
                      setCustomInterval(
                        Math.max(1, Number(e.target.value) || 1),
                      )
                    }
                    className="w-24 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-bold text-zinc-950 dark:text-zinc-50"
                  />
                  <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                    months between servicing
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Last Serviced
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                  {(
                    [
                      { id: "today", label: "Today" },
                      { id: "1_3_months_ago", label: "1–3 mo ago" },
                      { id: "6_plus_months_ago", label: "6+ mo ago" },
                      { id: "custom", label: "Custom date" },
                    ] as const
                  ).map((choice) => (
                    <button
                      type="button"
                      key={choice.id}
                      onClick={() => setCustomDateChoice(choice.id)}
                      className={`rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer text-center ${
                        customDateChoice === choice.id
                          ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                          : "border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                      }`}
                    >
                      {choice.label}
                    </button>
                  ))}
                </div>

                {customDateChoice === "custom" && (
                  <div className="flex items-center gap-2 pt-1.5">
                    <Calendar size={14} className="text-zinc-600 dark:text-zinc-300" />
                    <input
                      type="date"
                      value={customExactDate}
                      onChange={(e) => setCustomExactDate(e.target.value)}
                      max={formatDateIso(new Date())}
                      className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-950 dark:text-zinc-50"
                    />
                  </div>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Footer Actions */}
        {!successMessage && (
          <div className="p-4 sm:p-5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-5 py-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition cursor-pointer"
            >
              Cancel
            </button>

            {activeTab === "catalog" ? (
              <button
                type="submit"
                form="catalog-form"
                disabled={submitting || selectedCatalogCount === 0}
                className="flex items-center gap-2 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 px-6 py-2.5 text-xs sm:text-sm font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                <Check size={15} />
                <span>
                  {submitting
                    ? "Adding..."
                    : selectedCatalogCount === 0
                      ? "Select items to add"
                      : `Add ${selectedCatalogCount} Reminder${selectedCatalogCount > 1 ? "s" : ""}`}
                </span>
              </button>
            ) : (
              <button
                type="submit"
                form="custom-form"
                disabled={submitting || !customLabel.trim()}
                className="flex items-center gap-2 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 px-6 py-2.5 text-xs sm:text-sm font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                <Check size={15} />
                <span>{submitting ? "Saving..." : "Save Custom Reminder"}</span>
              </button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
