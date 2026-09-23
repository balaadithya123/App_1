import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import AddReminderSheet, {
  getCatalogIcon,
} from "@/components/AddReminderSheet";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Search,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Trash2,
  Edit3,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Check,
  X,
  ExternalLink,
} from "lucide-react";
import {
  type HomeItem,
  type HomeItemWithStatus,
  type MaintenanceCatalogItem,
  fetchUserHomeItems,
  fetchMaintenanceCatalog,
  createBatchUserHomeItems,
  updateUserHomeItem,
  deleteUserHomeItem,
  markHomeItemDoneToday,
  getDueAndUpcomingHomeItems,
  getPresetLastServicedDate,
  formatDateIso,
  DEFAULT_MAINTENANCE_CATALOG,
} from "@/lib/home-items";
import { supabase } from "@/lib/supabase";

export default function InboxPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<HomeItem[]>([]);
  const [catalog, setCatalog] = useState<MaintenanceCatalogItem[]>(
    DEFAULT_MAINTENANCE_CATALOG,
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"catalog" | "custom">("catalog");
  const [upcomingExpanded, setUpcomingExpanded] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Edit item state
  const [editingItem, setEditingItem] = useState<HomeItem | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editInterval, setEditInterval] = useState(6);
  const [editLastServiced, setEditLastServiced] = useState("");

  // Empty state in-page catalog selections
  const [emptySelected, setEmptySelected] = useState<Record<string, boolean>>({
    ac_servicing: true,
    ro_filter: true,
  });
  const [emptyDates, setEmptyDates] = useState<
    Record<string, { choice: string; customDate: string }>
  >({});
  const [savingEmptyCatalog, setSavingEmptyCatalog] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [userItems, catalogItems] = await Promise.all([
        fetchUserHomeItems(session?.user?.id),
        fetchMaintenanceCatalog(),
      ]);
      setItems(userItems);
      setCatalog(catalogItems);
    } catch (err) {
      console.error("Error loading home reminders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();

    const handleDataChanged = () => {
      void loadData();
    };

    window.addEventListener("home-items-changed", handleDataChanged);
    return () =>
      window.removeEventListener("home-items-changed", handleDataChanged);
  }, [session?.user?.id]);

  const showToast = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 3000);
  };

  // Plain date arithmetic separation & sorting:
  // dueOrOverdue: overdue-first (highest diffDays) then soonest-due
  // upcoming: soonest-due first
  const { dueOrOverdue, upcoming, dueOrOverdueCount } =
    getDueAndUpcomingHomeItems(items);

  const handleMarkDone = async (item: HomeItem) => {
    try {
      await markHomeItemDoneToday(item.id);
      showToast(`Marked "${item.label}" as done today! Next cycle scheduled.`);
      void loadData();
    } catch (err) {
      console.error("Failed to mark done:", err);
    }
  };

  const handleDelete = async (id: string, label: string) => {
    if (!window.confirm(`Delete reminder for "${label}"?`)) return;
    try {
      await deleteUserHomeItem(id);
      showToast(`Deleted reminder for "${label}".`);
      void loadData();
    } catch (err) {
      console.error("Failed to delete reminder:", err);
    }
  };

  const startEditing = (item: HomeItem) => {
    setEditingItem(item);
    setEditLabel(item.label);
    setEditInterval(item.interval_months);
    setEditLastServiced(item.last_serviced_date);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      await updateUserHomeItem(editingItem.id, {
        label: editLabel.trim() || editingItem.label,
        interval_months: Math.max(1, Number(editInterval) || 1),
        last_serviced_date: editLastServiced || editingItem.last_serviced_date,
      });
      showToast(`Updated "${editingItem.label}".`);
      setEditingItem(null);
      void loadData();
    } catch (err) {
      console.error("Failed to update reminder:", err);
    }
  };

  // Handle first-run onboarding save from in-page catalog
  const handleSaveFirstRunCatalog = async () => {
    const selectedKeys = Object.keys(emptySelected).filter(
      (k) => emptySelected[k],
    );
    if (selectedKeys.length === 0) return;

    setSavingEmptyCatalog(true);
    try {
      const todayStr = formatDateIso(new Date());
      const batch = selectedKeys.map((itemType) => {
        const catItem =
          catalog.find((c) => c.item_type === itemType) ||
          DEFAULT_MAINTENANCE_CATALOG.find((c) => c.item_type === itemType)!;
        const dateConfig = emptyDates[itemType] || {
          choice: "today",
          customDate: todayStr,
        };
        let lastServiced = todayStr;
        if (dateConfig.choice === "custom") {
          lastServiced = dateConfig.customDate || todayStr;
        } else if (
          dateConfig.choice === "1_3_months_ago" ||
          dateConfig.choice === "6_plus_months_ago"
        ) {
          lastServiced = getPresetLastServicedDate(dateConfig.choice as any);
        }

        return {
          user_id: session?.user?.id || "guest-user",
          item_type: catItem.item_type,
          label: catItem.default_label,
          last_serviced_date: lastServiced,
          interval_months: catItem.default_interval_months,
          category_slug: catItem.category_slug,
        };
      });

      await createBatchUserHomeItems(batch);
      showToast(`Added ${batch.length} home maintenance reminders!`);
      void loadData();
    } catch (err) {
      console.error("Failed to save first-run catalog:", err);
    } finally {
      setSavingEmptyCatalog(false);
    }
  };

  return (
    <PageShell
      headerTitle="Inbox"
      backTo="/"
      backLabel="Home"
      containerWidth="md"
      className="pb-28"
    >
      {/* Toast Alert */}
      {actionMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full border border-emerald-200 dark:border-emerald-800 bg-white/95 dark:bg-[#121212]/95 px-4 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-200 shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-300">
          <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Main Header Card */}
      <section className="rounded-[20px] border border-[#E7ECF1] dark:border-[#222] bg-white dark:bg-[#0A0A0A] p-5 sm:p-7 shadow-soft mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-100/20 text-primary">
              <Clock size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                  Home Maintenance
                </span>
                {dueOrOverdueCount > 0 ? (
                  <span className="rounded-full bg-rose-500 text-white px-2 py-0.5 text-[10px] font-extrabold shadow-xs">
                    {dueOrOverdueCount} Due Now
                  </span>
                ) : items.length > 0 ? (
                  <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-bold border border-emerald-500/20">
                    All Up to Date
                  </span>
                ) : null}
              </div>
              <h1 className="mt-0.5 text-xl sm:text-2xl font-bold tracking-tight text-[#2C2C2C] dark:text-[#F4F4F5]">
                Inbox & Reminders
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-[#67696D] dark:text-[#A1A1AA]">
                Track periodic servicing cycles. Find verified local specialists
                when due.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:self-center">
            <button
              type="button"
              onClick={() => {
                setSheetMode("catalog");
                setSheetOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-white shadow-subtle hover:bg-[#157ad4] active:scale-95 transition cursor-pointer"
            >
              <Plus size={14} />
              <span>Add Reminder</span>
            </button>
          </div>
        </div>
      </section>

      {/* Content Area */}
      {loading ? (
        <div className="rounded-2xl border border-[#E7ECF1] dark:border-[#222] bg-white dark:bg-[#0A0A0A] p-10 text-center text-xs text-[#67696D] dark:text-[#989EA7] shadow-soft">
          <Clock
            className="mx-auto mb-2 text-[#989EA7] animate-spin"
            size={24}
          />
          Loading your maintenance schedule...
        </div>
      ) : items.length === 0 ? (
        /* Empty / First-run state: Catalog Picker */
        <section className="rounded-2xl border border-[#E7ECF1] dark:border-[#222] bg-white dark:bg-[#0A0A0A] p-5 sm:p-7 shadow-soft space-y-6 animate-in fade-in">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-100/20 text-primary px-3 py-1 text-[11px] font-bold mb-2">
              <Sparkles size={13} />
              <span>Quick Onboarding</span>
            </span>
            <h2 className="text-lg font-bold text-[#2C2C2C] dark:text-[#F4F4F5]">
              Set up your home recurring maintenance
            </h2>
            <p className="text-xs sm:text-sm text-[#67696D] dark:text-[#A1A1AA] mt-1">
              Select what appliances & fittings you have. We'll remind you when
              servicing is due and connect you with matching local specialists.
            </p>
          </div>

          {/* Catalog Checkbox Grid */}
          <div className="space-y-3">
            {catalog.map((catItem) => {
              const isSelected = !!emptySelected[catItem.item_type];
              const dateConfig = emptyDates[catItem.item_type] || {
                choice: "today",
                customDate: formatDateIso(new Date()),
              };

              return (
                <div
                  key={catItem.item_type}
                  className={`rounded-xl border transition-all p-3.5 ${
                    isSelected
                      ? "border-primary/50 bg-primary-100/10 dark:bg-primary-950/20 shadow-subtle"
                      : "border-[#E7ECF1] dark:border-[#262626] bg-[#FDFDFE] dark:bg-[#121212]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={`empty-${catItem.item_type}`}
                      checked={isSelected}
                      onCheckedChange={(c) =>
                        setEmptySelected((prev) => ({
                          ...prev,
                          [catItem.item_type]: !!c,
                        }))
                      }
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <label
                        htmlFor={`empty-${catItem.item_type}`}
                        className="flex flex-wrap items-center justify-between gap-2 font-semibold text-sm cursor-pointer select-none"
                      >
                        <span className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#F0F4F8] dark:bg-[#1C1C1C] text-[#67696D] dark:text-[#A1A1AA]">
                            {getCatalogIcon(catItem.icon_name, "h-3.5 w-3.5")}
                          </span>
                          <span className="text-[#2C2C2C] dark:text-[#F4F4F5]">
                            {catItem.default_label}
                          </span>
                        </span>
                        <span className="text-[11px] font-medium text-[#67696D] dark:text-[#989EA7] bg-[#F6F9FC] dark:bg-[#1A1A1A] border border-[#E7ECF1] dark:border-[#262626] px-2 py-0.5 rounded-full">
                          Every {catItem.default_interval_months} mo
                        </span>
                      </label>

                      {isSelected && (
                        <div className="mt-2.5 pt-2.5 border-t border-[#E7ECF1]/60 dark:border-[#262626] space-y-2 animate-in fade-in duration-150">
                          <div className="text-[11px] font-medium text-[#67696D] dark:text-[#A1A1AA]">
                            When was it last serviced?
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
                                onClick={() =>
                                  setEmptyDates((prev) => ({
                                    ...prev,
                                    [catItem.item_type]: {
                                      ...dateConfig,
                                      choice: choice.id,
                                    },
                                  }))
                                }
                                className={`rounded-lg px-2 py-1 text-[11px] font-medium transition cursor-pointer text-center ${
                                  dateConfig.choice === choice.id
                                    ? "bg-primary text-white font-semibold shadow-xs"
                                    : "border border-[#E7ECF1] dark:border-[#2C2C2C] bg-white dark:bg-[#181818] text-[#2C2C2C] dark:text-[#DDD] hover:bg-[#F6F9FC]"
                                }`}
                              >
                                {choice.label}
                              </button>
                            ))}
                          </div>

                          {dateConfig.choice === "custom" && (
                            <div className="flex items-center gap-2 pt-1">
                              <Calendar size={13} className="text-[#67696D]" />
                              <input
                                type="date"
                                value={dateConfig.customDate}
                                onChange={(e) =>
                                  setEmptyDates((prev) => ({
                                    ...prev,
                                    [catItem.item_type]: {
                                      ...dateConfig,
                                      customDate: e.target.value,
                                    },
                                  }))
                                }
                                max={formatDateIso(new Date())}
                                className="rounded-lg border border-[#E7ECF1] dark:border-[#2C2C2C] bg-white dark:bg-[#181818] px-2 py-1 text-xs text-[#2C2C2C] dark:text-[#F4F4F5]"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* First Run Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#E7ECF1] dark:border-[#262626]">
            <button
              type="button"
              onClick={() => {
                setSheetMode("custom");
                setSheetOpen(true);
              }}
              className="text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              + Add a custom reminder instead
            </button>

            <button
              type="button"
              onClick={handleSaveFirstRunCatalog}
              disabled={
                savingEmptyCatalog ||
                Object.values(emptySelected).filter(Boolean).length === 0
              }
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-white shadow-subtle hover:bg-[#157ad4] transition disabled:opacity-50 cursor-pointer"
            >
              <Check size={14} />
              <span>
                {savingEmptyCatalog
                  ? "Saving Reminders..."
                  : `Save Home Reminders (${Object.values(emptySelected).filter(Boolean).length})`}
              </span>
            </button>
          </div>
        </section>
      ) : (
        /* Main Inbox List View */
        <div className="space-y-6">
          {/* 1. Due / Overdue Items (Primary Section) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#67696D] dark:text-[#989EA7] flex items-center gap-2">
                <span>Maintenance Due Now</span>
                <span className="rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2 py-0.5 text-[11px] font-bold">
                  {dueOrOverdue.length}
                </span>
              </h2>
            </div>

            {dueOrOverdue.length === 0 ? (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/10 p-6 text-center shadow-subtle">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 mx-auto mb-2.5">
                  <CheckCircle2 size={20} />
                </div>
                <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                  All caught up!
                </h3>
                <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-1 max-w-sm mx-auto">
                  None of your registered home items are due for maintenance
                  right now. Check below for upcoming dates.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {dueOrOverdue.map((item) => {
                  const browseHref = `/search?category=${encodeURIComponent(item.category_slug)}`;
                  const isOverdue = item.status.isOverdue;

                  return (
                    <article
                      key={item.id}
                      className="rounded-2xl border border-rose-500/30 bg-white dark:bg-[#111111] p-4 sm:p-5 shadow-soft hover:border-rose-500/50 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100/50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
                            <AlertTriangle size={18} />
                          </span>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-bold text-[#2C2C2C] dark:text-[#F4F4F5] truncate">
                                {item.label}
                              </h3>
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold shadow-xs ${
                                  isOverdue
                                    ? "bg-rose-500 text-white"
                                    : "bg-amber-500 text-white"
                                }`}
                              >
                                {item.status.statusText}
                              </span>
                            </div>

                            <p className="mt-1 text-xs text-[#67696D] dark:text-[#989EA7]">
                              Last serviced:{" "}
                              <span className="font-semibold">
                                {item.last_serviced_date}
                              </span>{" "}
                              • Cycle: Every{" "}
                              <span className="font-semibold">
                                {item.interval_months} months
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Card Options */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEditing(item)}
                            title="Edit reminder"
                            aria-label="Edit reminder"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#989EA7] hover:text-[#2C2C2C] dark:hover:text-[#F4F4F5] hover:bg-[#F6F9FC] dark:hover:bg-[#1C1C1C] transition cursor-pointer"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id, item.label)}
                            title="Delete reminder"
                            aria-label="Delete reminder"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#989EA7] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="mt-4 pt-3 border-t border-[#E7ECF1] dark:border-[#222] flex flex-wrap items-center justify-between gap-2.5">
                        <Link
                          to={browseHref}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-white shadow-subtle hover:bg-[#157ad4] active:scale-95 transition cursor-pointer"
                        >
                          <Search size={13} />
                          <span>
                            Find {item.category_slug.replace(/-/g, " ")} near
                            you
                          </span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => void handleMarkDone(item)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 px-3.5 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/60 transition active:scale-95 cursor-pointer"
                        >
                          <CheckCircle2 size={14} />
                          <span>Mark as done today</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* 2. Collapsed "Upcoming" Section */}
          <section className="rounded-2xl border border-[#E7ECF1] dark:border-[#222] bg-white dark:bg-[#0A0A0A] shadow-soft overflow-hidden">
            <button
              type="button"
              onClick={() => setUpcomingExpanded((v) => !v)}
              className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-[#F6F9FC] dark:hover:bg-[#121212] transition cursor-pointer select-none"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F0F4F8] dark:bg-[#1A1A1A] text-[#67696D] dark:text-[#A1A1AA]">
                  <Calendar size={15} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#2C2C2C] dark:text-[#F4F4F5]">
                    Upcoming Reminders ({upcoming.length})
                  </h3>
                  <p className="text-[11px] text-[#67696D] dark:text-[#989EA7]">
                    Items on track, sorted soonest due
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-[#67696D] dark:text-[#989EA7]">
                <span>{upcomingExpanded ? "Hide" : "Show"}</span>
                {upcomingExpanded ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
              </div>
            </button>

            {upcomingExpanded && (
              <div className="p-4 sm:p-5 pt-0 space-y-2.5 border-t border-[#E7ECF1] dark:border-[#222] animate-in fade-in duration-200">
                {upcoming.length === 0 ? (
                  <p className="py-4 text-center text-xs text-[#67696D] dark:text-[#989EA7]">
                    No upcoming reminders scheduled.
                  </p>
                ) : (
                  upcoming.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-[#E7ECF1] dark:border-[#222] bg-[#FDFDFE] dark:bg-[#121212] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-[#2C2C2C] dark:text-[#F4F4F5] truncate">
                            {item.label}
                          </h4>
                          <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold">
                            {item.status.statusText} ({item.status.dueDateStr})
                          </span>
                        </div>
                        <p className="text-[11px] text-[#67696D] dark:text-[#989EA7] mt-0.5">
                          Last serviced: {item.last_serviced_date} • Cycle:
                          Every {item.interval_months} mo
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <Link
                          to={`/search?category=${encodeURIComponent(item.category_slug)}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#E7ECF1] dark:border-[#2C2C2C] bg-white dark:bg-[#1A1A1A] px-2.5 py-1 text-[11px] font-semibold text-[#2C2C2C] dark:text-[#F4F4F5] hover:bg-[#F6F9FC] transition shadow-xs"
                        >
                          <Search size={11} />
                          <span>Find specialists</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => void handleMarkDone(item)}
                          title="Mark serviced today early"
                          className="inline-flex items-center gap-1 rounded-lg border border-[#E7ECF1] dark:border-[#2C2C2C] bg-white dark:bg-[#1A1A1A] px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition cursor-pointer shadow-xs"
                        >
                          <CheckCircle2 size={11} />
                          <span>Done today</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => startEditing(item)}
                          title="Edit"
                          aria-label="Edit"
                          className="p-1 text-[#989EA7] hover:text-[#2C2C2C] dark:hover:text-[#F4F4F5] cursor-pointer"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id, item.label)}
                          title="Delete"
                          aria-label="Delete"
                          className="p-1 text-[#989EA7] hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Add Reminder Sheet (Radix Sheet/Dialog) */}
      <AddReminderSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        userId={session?.user?.id}
        initialMode={sheetMode}
        onItemsAdded={() => void loadData()}
      />

      {/* Edit Reminder Dialog */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-[#E7ECF1] dark:border-[#262626] bg-white dark:bg-[#121212] p-5 sm:p-6 shadow-xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7ECF1] dark:border-[#262626]">
              <h3 className="font-bold text-base text-[#2C2C2C] dark:text-[#F4F4F5]">
                Edit Reminder
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-[#989EA7] hover:text-[#2C2C2C] dark:hover:text-[#F4F4F5] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={saveEdit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#2C2C2C] dark:text-[#F4F4F5] mb-1">
                  Label
                </label>
                <input
                  type="text"
                  required
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="w-full rounded-xl border border-[#E7ECF1] dark:border-[#262626] bg-white dark:bg-[#181818] px-3 py-2 text-sm text-[#2C2C2C] dark:text-[#F4F4F5] focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C2C2C] dark:text-[#F4F4F5] mb-1">
                  Service Cycle Interval (Months)
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  required
                  value={editInterval}
                  onChange={(e) =>
                    setEditInterval(Math.max(1, Number(e.target.value) || 1))
                  }
                  className="w-full rounded-xl border border-[#E7ECF1] dark:border-[#262626] bg-white dark:bg-[#181818] px-3 py-2 text-sm text-[#2C2C2C] dark:text-[#F4F4F5] focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C2C2C] dark:text-[#F4F4F5] mb-1">
                  Last Serviced Date
                </label>
                <input
                  type="date"
                  required
                  max={formatDateIso(new Date())}
                  value={editLastServiced}
                  onChange={(e) => setEditLastServiced(e.target.value)}
                  className="w-full rounded-xl border border-[#E7ECF1] dark:border-[#262626] bg-white dark:bg-[#181818] px-3 py-2 text-sm text-[#2C2C2C] dark:text-[#F4F4F5] focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="rounded-xl border border-[#E7ECF1] dark:border-[#262626] px-4 py-2 text-xs font-semibold text-[#67696D] dark:text-[#A1A1AA] hover:bg-[#F6F9FC] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white shadow-subtle hover:bg-[#157ad4] cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}
