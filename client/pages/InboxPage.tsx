import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { ListRowsSkeleton } from "@/components/PageSkeletons";
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
  Trash2,
  Edit3,
  Sparkles,
  Check,
  X,
  Briefcase,
  Bell,
  Building2,
  UserRound,
  ArrowRight,
  LogIn,
  UserPlus,
  History,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import {
  type HomeItem,
  type MaintenanceCatalogItem,
  type ServiceHistoryEntry,
  fetchUserHomeItems,
  fetchMaintenanceCatalog,
  createBatchUserHomeItems,
  updateUserHomeItem,
  deleteUserHomeItem,
  markHomeItemDoneToday,
  getDueAndUpcomingHomeItems,
  getPresetLastServicedDate,
  readServiceHistory,
  deleteServiceHistoryEntry,
  formatDateIso,
  DEFAULT_MAINTENANCE_CATALOG,
} from "@/lib/home-items";
import { supabase } from "@/lib/supabase";

export default function InboxPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<HomeItem[]>([]);
  const [history, setHistory] = useState<ServiceHistoryEntry[]>([]);
  const [catalog, setCatalog] = useState<MaintenanceCatalogItem[]>(
    DEFAULT_MAINTENANCE_CATALOG,
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"catalog" | "custom">("catalog");
  const [upcomingExpanded, setUpcomingExpanded] = useState(true);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Edit item state
  const [editingItem, setEditingItem] = useState<HomeItem | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editInterval, setEditInterval] = useState(6);
  const [editLastServiced, setEditLastServiced] = useState("");

  // In-app Delete Confirmation State
  const [deletingItem, setDeletingItem] = useState<{ id: string; label: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
    if (!supabase) {
      setAuthLoaded(true);
      return;
    }
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoaded(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setAuthLoaded(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const userRole = session?.user?.user_metadata?.role;
  const isWorker = userRole === "worker";
  const isAgency = userRole === "agency";
  const isEmployer =
    userRole === "employer" || (!isWorker && !isAgency && !!session?.user);

  const loadData = async () => {
    if (!session?.user?.id || !isEmployer) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [userItems, catalogItems] = await Promise.all([
        fetchUserHomeItems(session.user.id),
        fetchMaintenanceCatalog(),
      ]);
      setItems(userItems);
      setCatalog(catalogItems);
      setHistory(readServiceHistory(session.user.id));
    } catch (err) {
      console.error("Error loading home reminders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoaded) return;
    if (isEmployer && session?.user?.id) {
      void loadData();
    } else {
      setLoading(false);
    }

    const handleDataChanged = () => {
      if (isEmployer && session?.user?.id) {
        void loadData();
      }
    };

    const handleHistoryChanged = () => {
      setHistory(readServiceHistory(session?.user?.id));
    };

    window.addEventListener("home-items-changed", handleDataChanged);
    window.addEventListener("service-history-changed", handleHistoryChanged);
    return () => {
      window.removeEventListener("home-items-changed", handleDataChanged);
      window.removeEventListener("service-history-changed", handleHistoryChanged);
    };
  }, [authLoaded, session?.user?.id, isEmployer]);

  const showToast = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 3500);
  };

  const { dueOrOverdue, upcoming, dueOrOverdueCount, strictlyDueCount, reminderWindowCount } =
    getDueAndUpcomingHomeItems(items);

  const handleMarkDone = async (item: HomeItem) => {
    const todayIso = formatDateIso(new Date());
    
    // 1. Instant optimistic update: push last_serviced_date to today so it moves to app memory immediately
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? { ...i, last_serviced_date: todayIso, updated_at: new Date().toISOString() }
          : i,
      ),
    );

    try {
      await markHomeItemDoneToday(item.id);
      setHistory(readServiceHistory(session?.user?.id));
      showToast(`✓ "${item.label}" marked done today.`);
    } catch (err) {
      console.error("Failed to mark done:", err);
      showToast(`Marked "${item.label}" as done.`);
    }
  };

  const handleDelete = (id: string, label: string) => {
    setDeletingItem({ id, label });
  };

  const confirmDelete = async () => {
    if (!deletingItem) return;
    const { id, label } = deletingItem;
    setIsDeleting(true);
    try {
      // Optimistic update
      setItems((prev) => prev.filter((it) => it.id !== id));
      await deleteUserHomeItem(id);
      showToast(`Deleted reminder for "${label}".`);
      setDeletingItem(null);
      if (editingItem?.id === id) {
        setEditingItem(null);
      }
    } catch (err) {
      console.error("Failed to delete reminder:", err);
      showToast("Could not delete reminder. Please try again.");
    } finally {
      setIsDeleting(false);
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

    const updatedPayload = {
      label: editLabel.trim() || editingItem.label,
      interval_months: Math.max(1, Number(editInterval) || 1),
      last_serviced_date: editLastServiced || editingItem.last_serviced_date,
    };

    // Optimistic update
    setItems((prev) =>
      prev.map((i) => (i.id === editingItem.id ? { ...i, ...updatedPayload } : i)),
    );

    try {
      await updateUserHomeItem(editingItem.id, updatedPayload);
      showToast(`Updated "${updatedPayload.label}".`);
      setEditingItem(null);
    } catch (err) {
      console.error("Failed to update reminder:", err);
    }
  };

  const handleDeleteHistory = (entry: ServiceHistoryEntry) => {
    deleteServiceHistoryEntry(entry.id);
    setHistory((prev) => prev.filter((h) => h.id !== entry.id));
    showToast(`Removed history log for "${entry.item_label}".`);
  };

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
      showToast(`Saved ${batch.length} home maintenance schedules.`);
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
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full border border-[#0F8A73]/30 bg-white dark:bg-[#161514] px-5 py-2.5 text-xs font-bold text-[#0F8A73] dark:text-[#3DD1B3] shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-200 max-w-sm text-center">
          <span className="flex h-2 w-2 shrink-0 rounded-full bg-[#0F8A73] animate-pulse" />
          <span className="truncate">{actionMessage}</span>
        </div>
      )}

      {!authLoaded ? (
        <ListRowsSkeleton count={3} columns={1} />
      ) : !session?.user ? (
        /* GUEST / NOT SIGNED IN STATE */
        <section className="rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-gradient-to-br from-[#FFF4EF] via-[#FAF8F5] to-[#F5EAE2] dark:from-[#261B16] dark:via-[#1C1512] dark:to-[#15110F] p-7 sm:p-9 shadow-sm text-center space-y-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C]">
            <Clock size={28} />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#F4512C]">
              Home Maintenance
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#141210] dark:text-[#FAFAFA]">
              Sign in to access your inbox
            </h2>
            <p className="text-sm font-medium text-[#6B645F] dark:text-[#9E958F] leading-relaxed">
              Track periodic home maintenance schedules and connect directly with verified local pros.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-xs mx-auto">
            <Link
              to="/login"
              state={{ from: "main" }}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#F4512C] text-white hover:bg-[#E04320] py-3 px-6 text-sm font-bold shadow-sm transition cursor-pointer active:scale-95"
            >
              <LogIn size={15} />
              <span>Sign In</span>
            </Link>
            <Link
              to="/join"
              className="flex w-full items-center justify-center gap-2 rounded-full border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] py-3 px-6 text-sm font-bold text-[#141210] dark:text-[#FAFAFA] hover:bg-[#FAF8F5] dark:hover:bg-[#242220] transition shadow-sm cursor-pointer active:scale-95"
            >
              <UserPlus size={15} />
              <span>Register</span>
            </Link>
          </div>
        </section>
      ) : isWorker ? (
        /* WORKER INBOX */
        <div className="space-y-5">
          <section className="rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-gradient-to-br from-[#FFF4EF] via-[#FAF8F5] to-[#F5EAE2] dark:from-[#261B16] dark:via-[#1C1512] dark:to-[#15110F] p-6 sm:p-7 shadow-sm">
            <div className="flex items-center gap-3.5 mb-2">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C]">
                <Briefcase size={22} />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#F4512C]">
                  Worker Portal
                </span>
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#141210] dark:text-[#FAFAFA]">
                  Worker Inbox & Requests
                </h1>
              </div>
            </div>
            <p className="text-sm font-medium text-[#6B645F] dark:text-[#9E958F]">
              Manage client callback requests and check your upcoming job commitments.
            </p>
          </section>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              to="/callback-requests"
              className="group flex flex-col justify-between rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 shadow-sm hover:border-[#F4512C]/40 transition"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C]">
                    <Bell size={18} />
                  </div>
                  <span className="text-xs font-bold text-[#0F8A73] dark:text-[#3DD1B3] inline-flex items-center gap-1">
                    Direct leads <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#141210] dark:text-[#FAFAFA]">
                  Customer Callback Requests
                </h3>
                <p className="text-xs font-medium text-[#6B645F] dark:text-[#9E958F] mt-1">
                  Respond to homeowners requesting direct calls or quotes.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#EAE2DC] dark:border-white/10 text-xs font-bold text-[#F4512C]">
                View Requests &rarr;
              </div>
            </Link>

            <Link
              to="/worker-commitments"
              className="group flex flex-col justify-between rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 shadow-sm hover:border-[#F4512C]/40 transition"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FAF8F5] dark:bg-[#242220] text-[#141210] dark:text-[#FAFAFA]">
                    <CheckCircle2 size={18} />
                  </div>
                  <span className="text-xs font-bold text-[#6B645F] dark:text-[#9E958F] inline-flex items-center gap-1">
                    Schedule <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#141210] dark:text-[#FAFAFA]">
                  Active Job Commitments
                </h3>
                <p className="text-xs font-medium text-[#6B645F] dark:text-[#9E958F] mt-1">
                  Review scheduled service dates and active job addresses.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#EAE2DC] dark:border-white/10 text-xs font-bold text-[#141210] dark:text-[#FAFAFA]">
                View Commitments &rarr;
              </div>
            </Link>
          </div>
        </div>
      ) : isAgency ? (
        /* AGENCY INBOX */
        <div className="space-y-5">
          <section className="rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-gradient-to-br from-[#FFF4EF] via-[#FAF8F5] to-[#F5EAE2] dark:from-[#261B16] dark:via-[#1C1512] dark:to-[#15110F] p-6 sm:p-7 shadow-sm">
            <div className="flex items-center gap-3.5 mb-2">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C]">
                <Building2 size={22} />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#F4512C]">
                  Agency Hub
                </span>
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#141210] dark:text-[#FAFAFA]">
                  Agency Communications Hub
                </h1>
              </div>
            </div>
            <p className="text-sm font-medium text-[#6B645F] dark:text-[#9E958F]">
              Manage client inquiries and technician assignments for your agency roster.
            </p>
          </section>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              to="/agency"
              className="group flex flex-col justify-between rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 shadow-sm hover:border-[#F4512C]/40 transition"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C]">
                    <Building2 size={18} />
                  </div>
                  <span className="text-xs font-bold text-[#0F8A73] dark:text-[#3DD1B3] inline-flex items-center gap-1">
                    Dashboard <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#141210] dark:text-[#FAFAFA]">
                  Agency Dashboard
                </h3>
                <p className="text-xs font-medium text-[#6B645F] dark:text-[#9E958F] mt-1">
                  Manage worker profiles, assign tasks, and monitor jobs.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#EAE2DC] dark:border-white/10 text-xs font-bold text-[#F4512C]">
                Open Dashboard &rarr;
              </div>
            </Link>

            <Link
              to="/agency/profile/edit"
              className="group flex flex-col justify-between rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 shadow-sm hover:border-[#F4512C]/40 transition"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FAF8F5] dark:bg-[#242220] text-[#141210] dark:text-[#FAFAFA]">
                    <UserRound size={18} />
                  </div>
                  <span className="text-xs font-bold text-[#6B645F] dark:text-[#9E958F] inline-flex items-center gap-1">
                    Profile <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#141210] dark:text-[#FAFAFA]">
                  Agency Profile & Roster
                </h3>
                <p className="text-xs font-medium text-[#6B645F] dark:text-[#9E958F] mt-1">
                  Update agency details, trade specialties, and contact info.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#EAE2DC] dark:border-white/10 text-xs font-bold text-[#141210] dark:text-[#FAFAFA]">
                Manage Profile &rarr;
              </div>
            </Link>
          </div>
        </div>
      ) : (
        /* EMPLOYER / HOMEOWNER SIGNED-IN INBOX */
        <>
          {/* Main Header Card */}
          <section className="rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-gradient-to-br from-[#FFF4EF] via-[#FAF8F5] to-[#F5EAE2] dark:from-[#261B16] dark:via-[#1C1512] dark:to-[#15110F] p-5 sm:p-7 shadow-sm mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C]">
                  <Clock size={24} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#F4512C]">
                      Home Maintenance
                    </span>
                    {dueOrOverdueCount > 0 ? (
                      <span className="rounded-full bg-[#F4512C] text-white px-2.5 py-0.5 text-xs font-extrabold shadow-xs">
                        {dueOrOverdueCount} Reminders Active
                      </span>
                    ) : items.length > 0 ? (
                      <span className="rounded-full bg-[#0F8A73]/10 text-[#0F8A73] dark:text-[#3DD1B3] px-2.5 py-0.5 text-xs font-bold border border-[#0F8A73]/25">
                        All Up to Date
                      </span>
                    ) : null}
                  </div>
                  <h1 className="mt-1 text-xl sm:text-2xl font-extrabold tracking-tight text-[#141210] dark:text-[#FAFAFA]">
                    Inbox & Reminders
                  </h1>
                  <p className="mt-1 text-sm font-medium text-[#6B645F] dark:text-[#9E958F]">
                    Track servicing cycles and hire verified pros when maintenance is due.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:self-center shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setSheetMode("catalog");
                    setSheetOpen(true);
                  }}
                  className="flex items-center gap-2 rounded-full bg-[#F4512C] text-white hover:bg-[#E04320] px-4.5 py-2.5 text-xs sm:text-sm font-bold shadow-sm active:scale-95 transition cursor-pointer"
                >
                  <Plus size={15} />
                  <span>Add Reminder</span>
                </button>
              </div>
            </div>
          </section>

          {/* Content Area */}
          {loading ? (
            <ListRowsSkeleton count={3} columns={1} />
          ) : items.length === 0 ? (
            /* Empty / First-run state: Catalog Picker */
            <section className="rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 sm:p-7 shadow-sm space-y-6">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C] px-3 py-1 text-xs font-bold mb-2">
                  <Sparkles size={13} />
                  <span>Quick Setup</span>
                </span>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#141210] dark:text-[#FAFAFA]">
                  Set up your home recurring maintenance
                </h2>
                <p className="text-sm font-medium text-[#6B645F] dark:text-[#9E958F] mt-1">
                  Select household fittings to track servicing cycles. Daily reminders will start 7 days prior to each due date.
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
                      className={`rounded-2xl border transition-all p-4 ${
                        isSelected
                          ? "border-[#F4512C] bg-[#FFF4EF]/60 dark:bg-[#261B16]/60 shadow-xs"
                          : "border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] hover:border-[#F4512C]/40"
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
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
                            className="flex flex-wrap items-center justify-between gap-2 font-bold text-sm sm:text-base cursor-pointer select-none"
                          >
                            <span className="flex items-center gap-2.5">
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C]">
                                {getCatalogIcon(catItem.icon_name, "h-4 w-4")}
                              </span>
                              <span className="text-[#141210] dark:text-[#FAFAFA] font-bold">
                                {catItem.default_label}
                              </span>
                            </span>
                            <span className="text-xs font-bold text-[#6B645F] dark:text-[#9E958F] bg-white dark:bg-[#161514] border border-[#EAE2DC] dark:border-white/10 px-2.5 py-1 rounded-full">
                              Every {catItem.default_interval_months} mo
                            </span>
                          </label>

                          {isSelected && (
                            <div className="mt-3 pt-3 border-t border-[#EAE2DC] dark:border-white/10 space-y-2.5 animate-in fade-in duration-150">
                              <div className="text-xs font-bold text-[#6B645F] dark:text-[#9E958F]">
                                When was it last serviced?
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                                    className={`rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer text-center ${
                                      dateConfig.choice === choice.id
                                        ? "bg-[#141210] text-white dark:bg-white dark:text-[#11100F] shadow-xs"
                                        : "border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] text-[#141210] dark:text-[#FAFAFA] hover:bg-[#F5EFEA] dark:hover:bg-[#242220]"
                                    }`}
                                  >
                                    {choice.label}
                                  </button>
                                ))}
                              </div>

                              {dateConfig.choice === "custom" && (
                                <div className="flex items-center gap-2 pt-1.5">
                                  <Calendar size={14} className="text-[#6B645F] dark:text-[#9E958F]" />
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
                                    className="rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] px-3 py-1.5 text-xs font-semibold text-[#141210] dark:text-[#FAFAFA]"
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
              <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#EAE2DC] dark:border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setSheetMode("custom");
                    setSheetOpen(true);
                  }}
                  className="text-xs sm:text-sm font-bold text-[#F4512C] hover:underline cursor-pointer"
                >
                  + Add custom reminder
                </button>

                <button
                  type="button"
                  onClick={handleSaveFirstRunCatalog}
                  disabled={
                    savingEmptyCatalog ||
                    Object.values(emptySelected).filter(Boolean).length === 0
                  }
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-full bg-[#F4512C] text-white hover:bg-[#E04320] px-6 py-2.5 text-xs sm:text-sm font-bold shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  <Check size={15} />
                  <span>
                    {savingEmptyCatalog
                      ? "Saving..."
                      : `Save Reminders (${Object.values(emptySelected).filter(Boolean).length})`}
                  </span>
                </button>
              </div>
            </section>
          ) : (
            /* Main Inbox List View */
            <div className="space-y-6">
              {/* 1. Due / Overdue & 7-Day Daily Reminder Window */}
              <section className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div>
                    <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#F4512C] flex items-center gap-2">
                      <span>Active Reminders</span>
                      <span className="rounded-full bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C] border border-[#F4512C]/25 px-2.5 py-0.5 text-xs font-extrabold">
                        {dueOrOverdue.length}
                      </span>
                    </h2>
                    <p className="text-xs text-[#6B645F] dark:text-[#9E958F] mt-0.5">
                      Appliances due now or entering the 1-week daily reminder window.
                    </p>
                  </div>
                </div>

                {dueOrOverdue.length === 0 ? (
                  <div className="rounded-2xl border border-[#0F8A73]/30 bg-[#0F8A73]/5 dark:bg-[#0F8A73]/10 p-6 text-center shadow-sm">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0F8A73]/15 text-[#0F8A73] dark:text-[#3DD1B3] mx-auto mb-2.5">
                      <CheckCircle2 size={20} />
                    </div>
                    <h3 className="text-base font-bold text-[#141210] dark:text-[#FAFAFA]">
                      All caught up!
                    </h3>
                    <p className="text-xs sm:text-sm font-medium text-[#6B645F] dark:text-[#9E958F] mt-1 max-w-sm mx-auto">
                      No home appliances are due for servicing right now.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dueOrOverdue.map((item) => {
                      const browseHref = `/search?category=${encodeURIComponent(item.category_slug)}`;
                      const isOverdue = item.status.isOverdue;
                      const isDueToday = item.status.diffDays === 0;

                      return (
                        <article
                          key={item.id}
                          className="rounded-2xl border border-[#F4512C]/40 bg-white dark:bg-[#161514] p-5 sm:p-6 shadow-sm hover:border-[#F4512C] transition"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3.5 min-w-0">
                              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C]">
                                <AlertTriangle size={20} />
                              </span>

                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-base sm:text-lg font-extrabold text-[#141210] dark:text-[#FAFAFA] truncate">
                                    {item.label}
                                  </h3>
                                  <span
                                    className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold shadow-xs ${
                                      isOverdue
                                        ? "bg-[#F4512C] text-white"
                                        : isDueToday
                                        ? "bg-[#141210] text-white dark:bg-white dark:text-[#11100F]"
                                        : "bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C]"
                                    }`}
                                  >
                                    {item.status.statusText}
                                  </span>
                                </div>

                                <p className="mt-1 text-xs sm:text-sm font-semibold text-[#6B645F] dark:text-[#9E958F]">
                                  Last serviced:{" "}
                                  <span className="text-[#141210] dark:text-[#FAFAFA] font-bold">
                                    {item.last_serviced_date}
                                  </span>{" "}
                                  • Every {item.interval_months} mo • Due{" "}
                                  <span className="text-[#141210] dark:text-[#FAFAFA] font-bold">
                                    {item.status.dueDateStr}
                                  </span>
                                </p>
                              </div>
                            </div>

                            {/* Card Options */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => startEditing(item)}
                                title="Edit reminder"
                                aria-label="Edit reminder"
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6B645F] dark:text-[#9E958F] hover:text-[#141210] dark:hover:text-white hover:bg-[#FAF8F5] dark:hover:bg-[#242220] transition cursor-pointer"
                              >
                                <Edit3 size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(item.id, item.label)}
                                title="Delete reminder"
                                aria-label="Delete reminder"
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6B645F] dark:text-[#9E958F] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>

                          {/* Card Action Buttons */}
                          <div className="mt-4 pt-3 border-t border-[#EAE2DC] dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
                            <Link
                              to={browseHref}
                              className="inline-flex items-center gap-2 rounded-full bg-[#141210] text-white hover:bg-neutral-800 dark:bg-white dark:text-[#11100F] dark:hover:bg-neutral-200 px-4 py-2 text-xs sm:text-sm font-bold shadow-xs active:scale-95 transition cursor-pointer"
                            >
                              <Search size={14} />
                              <span>Find pros nearby</span>
                            </Link>

                            <button
                              type="button"
                              onClick={() => void handleMarkDone(item)}
                              className="inline-flex items-center gap-2 rounded-full bg-[#0F8A73] hover:bg-[#0B6E5B] text-white px-4 py-2 text-xs sm:text-sm font-bold transition active:scale-95 cursor-pointer shadow-xs"
                            >
                              <CheckCircle2 size={15} />
                              <span>Mark as done today</span>
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* 2. In App Memory / Scheduled Maintenance */}
              <section className="rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setUpcomingExpanded((v) => !v)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-[#FAF8F5] dark:hover:bg-[#242220]/60 transition cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C]">
                      <Calendar size={16} />
                    </span>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-[#141210] dark:text-[#FAFAFA]">
                        Upcoming Reminders ({upcoming.length})
                      </h3>
                      <p className="text-xs font-medium text-[#6B645F] dark:text-[#9E958F]">
                        Scheduled servicing dates
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-bold text-[#6B645F] dark:text-[#9E958F]">
                    <span>{upcomingExpanded ? "Hide" : "Show"}</span>
                    {upcomingExpanded ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </div>
                </button>

                {upcomingExpanded && (
                  <div className="p-4 sm:p-5 pt-0 space-y-3 border-t border-[#EAE2DC] dark:border-white/10 animate-in fade-in duration-150">
                    {upcoming.length === 0 ? (
                      <p className="py-4 text-center text-xs font-medium text-[#6B645F] dark:text-[#9E958F]">
                        All items are currently due or in the reminder window.
                      </p>
                    ) : (
                      upcoming.map((item) => (
                        <div
                          key={item.id}
                          className="mt-3 rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-bold text-sm sm:text-base text-[#141210] dark:text-[#FAFAFA] truncate">
                                {item.label}
                              </h4>
                              <span className="rounded-full bg-[#0F8A73]/10 text-[#0F8A73] dark:text-[#3DD1B3] border border-[#0F8A73]/25 px-2.5 py-0.5 text-xs font-bold">
                                Due: {item.status.dueDateStr}
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm font-semibold text-[#6B645F] dark:text-[#9E958F] mt-1">
                              Last serviced: <span className="text-[#141210] dark:text-[#FAFAFA] font-bold">{item.last_serviced_date}</span> • Every {item.interval_months} mo
                            </p>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            <Link
                              to={`/search?category=${encodeURIComponent(item.category_slug)}`}
                              className="inline-flex items-center gap-1.5 rounded-full border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] px-3 py-1.5 text-xs font-bold text-[#141210] dark:text-[#FAFAFA] hover:border-[#F4512C]/50 transition shadow-2xs"
                            >
                              <Search size={12} />
                              <span>Find pros</span>
                            </Link>

                            <button
                              type="button"
                              onClick={() => void handleMarkDone(item)}
                              title="Mark serviced today"
                              className="inline-flex items-center gap-1.5 rounded-full border border-[#0F8A73]/30 bg-white dark:bg-[#161514] px-3 py-1.5 text-xs font-bold text-[#0F8A73] dark:text-[#3DD1B3] hover:bg-[#0F8A73]/10 transition cursor-pointer shadow-2xs"
                            >
                              <CheckCircle2 size={12} />
                              <span>Done today</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => startEditing(item)}
                              title="Edit"
                              aria-label="Edit"
                              className="p-1.5 text-[#6B645F] dark:text-[#9E958F] hover:text-[#141210] dark:hover:text-white cursor-pointer"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id, item.label)}
                              title="Delete"
                              aria-label="Delete"
                              className="p-1.5 text-[#6B645F] dark:text-[#9E958F] hover:text-rose-600 cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </section>

              {/* 3. Servicing History Log (App Memory) */}
              <section className="rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setHistoryExpanded((v) => !v)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-[#FAF8F5] dark:hover:bg-[#242220]/60 transition cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FAF8F5] dark:bg-[#242220] text-[#141210] dark:text-[#FAFAFA]">
                      <History size={16} />
                    </span>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-[#141210] dark:text-[#FAFAFA]">
                        Servicing History & Logs ({history.length})
                      </h3>
                      <p className="text-xs font-medium text-[#6B645F] dark:text-[#9E958F]">
                        Memory log of recorded maintenance completions
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-bold text-[#6B645F] dark:text-[#9E958F]">
                    <span>{historyExpanded ? "Hide" : "Show"}</span>
                    {historyExpanded ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </div>
                </button>

                {historyExpanded && (
                  <div className="p-4 sm:p-5 pt-0 space-y-3 border-t border-[#EAE2DC] dark:border-white/10 animate-in fade-in duration-150">
                    {history.length === 0 ? (
                      <div className="py-6 text-center">
                        <History className="mx-auto mb-2 text-[#6B645F] dark:text-[#9E958F]" size={20} />
                        <p className="text-xs font-semibold text-[#6B645F] dark:text-[#9E958F]">
                          No past servicing history yet.
                        </p>
                        <p className="text-2xs text-[#6B645F] dark:text-[#9E958F] mt-1">
                          When you click "Mark as done today", a completion record is saved here automatically.
                        </p>
                      </div>
                    ) : (
                      history.map((entry) => (
                        <div
                          key={entry.id}
                          className="mt-3 rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] p-3.5 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0F8A73]/10 text-[#0F8A73] dark:text-[#3DD1B3]">
                              <Check size={16} />
                            </span>
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-[#141210] dark:text-[#FAFAFA] truncate">
                                {entry.item_label}
                              </h4>
                              <p className="text-xs text-[#6B645F] dark:text-[#9E958F]">
                                Serviced on <span className="font-bold text-[#141210] dark:text-[#FAFAFA]">{entry.completed_date}</span> {entry.note ? `• ${entry.note}` : ""}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteHistory(entry)}
                            title="Remove log entry"
                            aria-label="Remove log entry"
                            className="p-1.5 text-[#6B645F] dark:text-[#9E958F] hover:text-rose-600 transition cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* Add Reminder Sheet (Radix Sheet) */}
          <AddReminderSheet
            open={sheetOpen}
            onOpenChange={setSheetOpen}
            userId={session?.user?.id}
            initialMode={sheetMode}
            onItemsAdded={() => void loadData()}
          />

          {/* Edit Reminder Modal */}
          {editingItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
              <div className="w-full max-w-md rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-6 shadow-2xl animate-in zoom-in-95">
                <div className="flex items-center justify-between pb-3.5 border-b border-[#EAE2DC] dark:border-white/10">
                  <h3 className="font-extrabold text-base sm:text-lg text-[#141210] dark:text-[#FAFAFA]">
                    Edit Reminder
                  </h3>
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="text-[#6B645F] dark:text-[#9E958F] hover:text-[#141210] dark:hover:text-white cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={saveEdit} className="mt-4 space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#6B645F] dark:text-[#9E958F] mb-1.5">
                      Label
                    </label>
                    <input
                      type="text"
                      required
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      className="w-full rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-3.5 py-2.5 text-sm font-semibold text-[#141210] dark:text-[#FAFAFA] focus:outline-none focus:border-[#F4512C]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#6B645F] dark:text-[#9E958F] mb-1.5">
                      Service Cycle (Months)
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
                      className="w-full rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-3.5 py-2.5 text-sm font-semibold text-[#141210] dark:text-[#FAFAFA] focus:outline-none focus:border-[#F4512C]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#6B645F] dark:text-[#9E958F] mb-1.5">
                      Last Serviced Date
                    </label>
                    <input
                      type="date"
                      required
                      max={formatDateIso(new Date())}
                      value={editLastServiced}
                      onChange={(e) => setEditLastServiced(e.target.value)}
                      className="w-full rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-3.5 py-2.5 text-sm font-semibold text-[#141210] dark:text-[#FAFAFA] focus:outline-none focus:border-[#F4512C]"
                    />
                  </div>

                  <div className="pt-3 flex items-center justify-between gap-3 border-t border-[#EAE2DC] dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        const item = editingItem;
                        setEditingItem(null);
                        handleDelete(item.id, item.label);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                    >
                      <Trash2 size={14} />
                      <span>Delete</span>
                    </button>

                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setEditingItem(null)}
                        className="rounded-full border border-[#EAE2DC] dark:border-white/10 px-4.5 py-2 text-xs font-bold text-[#6B645F] dark:text-[#9E958F] hover:bg-[#FAF8F5] dark:hover:bg-[#242220] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="rounded-full bg-[#F4512C] text-white hover:bg-[#E04320] px-5 py-2 text-xs font-bold shadow-xs cursor-pointer"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete Reminder Confirmation Modal */}
          {deletingItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
              <div className="w-full max-w-sm rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-6 shadow-2xl animate-in zoom-in-95">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 mb-4">
                  <Trash2 size={22} />
                </div>
                <h3 className="font-extrabold text-lg text-[#141210] dark:text-[#FAFAFA]">
                  Delete Reminder?
                </h3>
                <p className="mt-2 text-sm text-[#6B645F] dark:text-[#9E958F]">
                  Are you sure you want to remove the reminder for{" "}
                  <span className="font-bold text-[#141210] dark:text-[#FAFAFA]">
                    "{deletingItem.label}"
                  </span>
                  ?
                </p>
                <div className="mt-6 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => setDeletingItem(null)}
                    className="rounded-full border border-[#EAE2DC] dark:border-white/10 px-4 py-2 text-xs font-bold text-[#6B645F] dark:text-[#9E958F] hover:bg-[#FAF8F5] dark:hover:bg-[#242220] transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => void confirmDelete()}
                    className="inline-flex items-center gap-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {isDeleting ? "Deleting..." : "Delete Reminder"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}
