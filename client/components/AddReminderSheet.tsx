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
  type HomeItem,
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

type QuickDateChoice = "today" | "1_3_months_ago" | "6_plus_months_ago" | "custom";

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
  const [catalog, setCatalog] = useState<MaintenanceCatalogItem[]>(DEFAULT_MAINTENANCE_CATALOG);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Catalog item choices state
  const [catalogState, setCatalogState] = useState<Record<string, CatalogItemFormState>>({});

  // Custom reminder state
  const [customLabel, setCustomLabel] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [customInterval, setCustomInterval] = useState<number>(6);
  const [customDateChoice, setCustomDateChoice] = useState<QuickDateChoice>("today");
  const [customExactDate, setCustomExactDate] = useState<string>(() => formatDateIso(new Date()));

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

      // Initialize state for each catalog item
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

  const setDateChoiceForItem = (itemType: string, choice: QuickDateChoice) => {
    setCatalogState((prev) => ({
      ...prev,
      [itemType]: {
        ...prev[itemType],
        dateChoice: choice,
      },
    }));
  };

  const setCustomDateForItem = (itemType: string, dateStr: string) => {
    setCatalogState((prev) => ({
      ...prev,
      [itemType]: {
        ...prev[itemType],
        customDate: dateStr,
      },
    }));
  };

  const setCustomLabelForItem = (itemType: string, label: string) => {
    setCatalogState((prev) => ({
      ...prev,
      [itemType]: {
        ...prev[itemType],
        label,
      },
    }));
  };

  const setIntervalForItem = (itemType: string, intervalMonths: number) => {
    setCatalogState((prev) => ({
      ...prev,
      [itemType]: {
        ...prev[itemType],
        intervalMonths: Math.max(1, intervalMonths),
      },
    }));
  };

  const selectedCatalogCount = Object.values(catalogState).filter((s) => s.selected).length;

  const handleSaveCatalogItems = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCatalogCount === 0) return;

    setSubmitting(true);
    try {
      const itemsToCreate: Array<Omit<HomeItem, "id" | "created_at" | "updated_at">> = [];

      for (const catItem of catalog) {
        const state = catalogState[catItem.item_type];
        if (!state || !state.selected) continue;

        let lastServiced = formatDateIso(new Date());
        if (state.dateChoice === "custom") {
          lastServiced = state.customDate || lastServiced;
        } else {
          lastServiced = getPresetLastServicedDate(state.dateChoice);
        }

        itemsToCreate.push({
          user_id: userId || "guest-user",
          item_type: catItem.item_type,
          label: state.label.trim() || catItem.default_label,
          last_serviced_date: lastServiced,
          interval_months: state.intervalMonths || catItem.default_interval_months,
          category_slug: catItem.category_slug,
        });
      }

      await createBatchUserHomeItems(itemsToCreate);
      setSuccessMessage(`Added ${itemsToCreate.length} home reminder${itemsToCreate.length > 1 ? "s" : ""}!`);
      onItemsAdded();
      setTimeout(() => {
        onOpenChange(false);
      }, 700);
    } catch (err) {
      console.error("Failed to add catalog reminders:", err);
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
      }, 700);
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
        className="w-full sm:max-w-xl p-0 flex flex-col h-full bg-white dark:bg-[#0E0E0E] text-[#2C2C2C] dark:text-[#F4F4F5] border-l border-[#E7ECF1] dark:border-[#222]"
      >
        <SheetHeader className="p-6 border-b border-[#E7ECF1] dark:border-[#222] bg-[#F6F9FC] dark:bg-[#141414]">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Clock size={16} />
            </span>
            <div>
              <SheetTitle className="text-lg font-bold tracking-tight">Add Home Reminder</SheetTitle>
              <SheetDescription className="text-xs text-[#67696D] dark:text-[#989EA7]">
                Track periodic maintenance cycles for your home appliances & fittings.
              </SheetDescription>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="mt-4 flex rounded-xl bg-white dark:bg-[#0A0A0A] p-1 border border-[#E7ECF1] dark:border-[#262626]">
            <button
              type="button"
              onClick={() => setActiveTab("catalog")}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "catalog"
                  ? "bg-primary text-white shadow-sm"
                  : "text-[#67696D] dark:text-[#989EA7] hover:text-[#2C2C2C] dark:hover:text-[#F4F4F5]"
              }`}
            >
              <Sparkle size={13} />
              <span>Popular Items</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("custom")}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "custom"
                  ? "bg-primary text-white shadow-sm"
                  : "text-[#67696D] dark:text-[#989EA7] hover:text-[#2C2C2C] dark:hover:text-[#F4F4F5]"
              }`}
            >
              <Plus size={13} />
              <span>Custom Reminder</span>
            </button>
          </div>
        </SheetHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {successMessage ? (
            <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in zoom-in-95">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mb-3">
                <CheckCircle2 size={24} />
              </span>
              <h3 className="text-base font-bold">{successMessage}</h3>
              <p className="text-xs text-[#67696D] dark:text-[#989EA7] mt-1">
                Updating your Inbox schedule...
              </p>
            </div>
          ) : activeTab === "catalog" ? (
            <form id="catalog-form" onSubmit={handleSaveCatalogItems} className="space-y-4">
              <div className="flex items-center justify-between text-xs text-[#67696D] dark:text-[#989EA7] px-1">
                <span>Select items you have at home:</span>
                <span className="font-semibold text-primary">
                  {selectedCatalogCount} selected
                </span>
              </div>

              {loadingCatalog ? (
                <div className="py-8 text-center text-xs text-[#67696D]">Loading catalog items...</div>
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
                      className={`rounded-2xl border transition-all p-3.5 ${
                        state.selected
                          ? "border-primary/50 bg-primary-100/10 dark:bg-primary-950/20 shadow-subtle"
                          : "border-[#E7ECF1] dark:border-[#222] bg-white dark:bg-[#121212] hover:border-[#D0D7DE]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={`cb-${item.item_type}`}
                          checked={state.selected}
                          onCheckedChange={(c) => toggleCatalogItemSelected(item.item_type, !!c)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <label
                            htmlFor={`cb-${item.item_type}`}
                            className="flex items-center gap-2 font-semibold text-sm cursor-pointer select-none"
                          >
                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#F6F9FC] dark:bg-[#1C1C1C] text-[#67696D] dark:text-[#A1A1AA]">
                              {getCatalogIcon(item.icon_name, "h-3.5 w-3.5")}
                            </span>
                            <span className="truncate">{item.default_label}</span>
                            <span className="ml-auto shrink-0 text-[11px] font-normal text-[#67696D] dark:text-[#989EA7] bg-[#F0F4F8] dark:bg-[#1C1C1C] px-2 py-0.5 rounded-full">
                              Every {item.default_interval_months} mo
                            </span>
                          </label>

                          {/* Expanded Configuration when selected */}
                          {state.selected && (
                            <div className="mt-3 pt-3 border-t border-[#E7ECF1]/80 dark:border-[#262626] space-y-2.5 animate-in fade-in duration-200">
                              <div>
                                <div className="flex items-center justify-between text-[11px] font-medium text-[#67696D] dark:text-[#A1A1AA] mb-1.5">
                                  <span>Last serviced date:</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
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
                                      onClick={() => setDateChoiceForItem(item.item_type, choice.id)}
                                      className={`rounded-lg px-2 py-1.5 text-[11px] font-medium transition cursor-pointer text-center ${
                                        state.dateChoice === choice.id
                                          ? "bg-primary text-white font-semibold shadow-xs"
                                          : "border border-[#E7ECF1] dark:border-[#2C2C2C] bg-white dark:bg-[#181818] text-[#2C2C2C] dark:text-[#DDD] hover:bg-[#F6F9FC]"
                                      }`}
                                    >
                                      {choice.label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {state.dateChoice === "custom" && (
                                <div className="flex items-center gap-2 pt-1">
                                  <Calendar size={13} className="text-[#67696D]" />
                                  <input
                                    type="date"
                                    value={state.customDate}
                                    onChange={(e) => setCustomDateForItem(item.item_type, e.target.value)}
                                    max={formatDateIso(new Date())}
                                    className="rounded-lg border border-[#E7ECF1] dark:border-[#2C2C2C] bg-white dark:bg-[#181818] px-2.5 py-1 text-xs text-[#2C2C2C] dark:text-[#F4F4F5] focus:outline-none focus:ring-1 focus:ring-primary"
                                  />
                                </div>
                              )}

                              <div className="flex items-center gap-3 pt-1 text-[11px] text-[#67696D] dark:text-[#989EA7]">
                                <div className="flex items-center gap-1.5">
                                  <span>Cycle:</span>
                                  <input
                                    type="number"
                                    min={1}
                                    max={60}
                                    value={state.intervalMonths}
                                    onChange={(e) =>
                                      setIntervalForItem(item.item_type, Number(e.target.value) || 1)
                                    }
                                    className="w-14 rounded-md border border-[#E7ECF1] dark:border-[#2C2C2C] bg-white dark:bg-[#181818] px-2 py-0.5 text-center text-xs text-[#2C2C2C] dark:text-[#F4F4F5]"
                                  />
                                  <span>months</span>
                                </div>
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
            <form id="custom-form" onSubmit={handleSaveCustomReminder} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#2C2C2C] dark:text-[#F4F4F5] mb-1.5">
                  Reminder Label <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Water Filter UV Lamp, Solar Inverter, Fire Extinguisher"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  className="w-full rounded-xl border border-[#E7ECF1] dark:border-[#262626] bg-white dark:bg-[#141414] px-3.5 py-2.5 text-sm text-[#2C2C2C] dark:text-[#F4F4F5] placeholder:text-[#989EA7] focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C2C2C] dark:text-[#F4F4F5] mb-1.5">
                  Worker Category / Service Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Plumber, Electrician, Technician"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="w-full rounded-xl border border-[#E7ECF1] dark:border-[#262626] bg-white dark:bg-[#141414] px-3.5 py-2.5 text-sm text-[#2C2C2C] dark:text-[#F4F4F5] placeholder:text-[#989EA7] focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
                />
                <p className="mt-1 text-[11px] text-[#67696D] dark:text-[#989EA7]">
                  Used for finding matching nearby specialists when this reminder is due.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C2C2C] dark:text-[#F4F4F5] mb-1.5">
                  Service Cycle Interval <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={60}
                    required
                    value={customInterval}
                    onChange={(e) => setCustomInterval(Math.max(1, Number(e.target.value) || 1))}
                    className="w-24 rounded-xl border border-[#E7ECF1] dark:border-[#262626] bg-white dark:bg-[#141414] px-3 py-2 text-sm text-[#2C2C2C] dark:text-[#F4F4F5] focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-xs text-[#67696D] dark:text-[#989EA7]">months between services</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C2C2C] dark:text-[#F4F4F5] mb-1.5">
                  Last Serviced
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-2">
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
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition cursor-pointer text-center ${
                        customDateChoice === choice.id
                          ? "bg-primary text-white font-semibold shadow-xs"
                          : "border border-[#E7ECF1] dark:border-[#2C2C2C] bg-white dark:bg-[#181818] text-[#2C2C2C] dark:text-[#DDD] hover:bg-[#F6F9FC]"
                      }`}
                    >
                      {choice.label}
                    </button>
                  ))}
                </div>

                {customDateChoice === "custom" && (
                  <div className="flex items-center gap-2 pt-1">
                    <Calendar size={14} className="text-[#67696D]" />
                    <input
                      type="date"
                      value={customExactDate}
                      onChange={(e) => setCustomExactDate(e.target.value)}
                      max={formatDateIso(new Date())}
                      className="rounded-lg border border-[#E7ECF1] dark:border-[#2C2C2C] bg-white dark:bg-[#181818] px-3 py-1.5 text-xs text-[#2C2C2C] dark:text-[#F4F4F5] focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Footer Actions */}
        {!successMessage && (
          <div className="p-4 border-t border-[#E7ECF1] dark:border-[#222] bg-[#F6F9FC] dark:bg-[#141414] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-xl border border-[#E7ECF1] dark:border-[#262626] bg-white dark:bg-[#1C1C1C] px-4 py-2 text-xs font-semibold text-[#67696D] dark:text-[#A1A1AA] hover:bg-[#F6F9FC] transition cursor-pointer"
            >
              Cancel
            </button>

            {activeTab === "catalog" ? (
              <button
                type="submit"
                form="catalog-form"
                disabled={submitting || selectedCatalogCount === 0}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-subtle hover:bg-[#157ad4] transition disabled:opacity-50 cursor-pointer"
              >
                <Check size={14} />
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
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-subtle hover:bg-[#157ad4] transition disabled:opacity-50 cursor-pointer"
              >
                <Check size={14} />
                <span>{submitting ? "Saving..." : "Save Custom Reminder"}</span>
              </button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
