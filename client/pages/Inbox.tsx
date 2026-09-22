import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  Gauge,
  Mail,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  Wrench,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { supabase } from "@/lib/supabase";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  worker_id: string | null;
  read_at: string | null;
  created_at: string;
};

type MaintenanceItemType = "ac_servicing" | "geyser" | "water_pump" | "ro_purifier";

type MaintenanceReminder = {
  id: string;
  item_type: MaintenanceItemType;
  title: string;
  category_search_term: string;
  last_serviced_at: string | null;
  due_date: string;
  reminder_interval_months: number;
  notes: string | null;
  updated_at: string;
};

const DEFAULT_RECURRING_ITEMS: Array<{
  item_type: MaintenanceItemType;
  title: string;
  category_search_term: string;
  defaultIntervalMonths: number;
  icon: typeof Wrench;
}> = [
  {
    item_type: "ac_servicing",
    title: "AC Servicing",
    category_search_term: "AC Repair",
    defaultIntervalMonths: 6,
    icon: Gauge,
  },
  {
    item_type: "geyser",
    title: "Geyser Maintenance",
    category_search_term: "Plumber",
    defaultIntervalMonths: 12,
    icon: Flame,
  },
  {
    item_type: "water_pump",
    title: "Water Pump Inspection",
    category_search_term: "Plumber",
    defaultIntervalMonths: 6,
    icon: Wrench,
  },
  {
    item_type: "ro_purifier",
    title: "RO Purifier Filter Change",
    category_search_term: "Appliance Repair",
    defaultIntervalMonths: 6,
    icon: RefreshCw,
  },
];

export default function Inbox() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [reminders, setReminders] = useState<MaintenanceReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingReminder, setSavingReminder] = useState(false);

  // Modal / Form state for adding or editing a recurring maintenance item
  const [editingItemType, setEditingItemType] = useState<MaintenanceItemType | null>(null);
  const [dueDateInput, setDueDateInput] = useState("");
  const [lastServicedInput, setLastServicedInput] = useState("");

  const load = async () => {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      navigate("/", { replace: true });
      return;
    }
    const token = data.session.access_token;
    try {
      setLoading(true);
      const [notifRes, remRes] = await Promise.all([
        fetch("/api/notifications", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
        fetch("/api/maintenance-reminders", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
      ]);

      const notifData = await notifRes.json().catch(() => ({}));
      const remData = await remRes.json().catch(() => ({}));

      if (notifRes.ok) {
        setNotifications(notifData.notifications || []);
      }
      if (remRes.ok) {
        setReminders(remData.reminders || []);
      }
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load inbox.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const listener = supabase?.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        navigate("/", { replace: true });
      }
    });
    return () => listener?.data.subscription.unsubscribe();
  }, [navigate]);

  const markRead = async (id: string) => {
    const { data } = await supabase!.auth.getSession();
    if (!data.session) return;
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data.session.access_token}`,
      },
      body: JSON.stringify({ id }),
    });
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, read_at: new Date().toISOString() } : item))
    );
  };

  const handleSaveReminder = async () => {
    if (!editingItemType || !dueDateInput) return;
    const { data } = await supabase!.auth.getSession();
    if (!data.session) return;

    try {
      setSavingReminder(true);
      const response = await fetch("/api/maintenance-reminders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({
          item_type: editingItemType,
          due_date: dueDateInput,
          last_serviced_at: lastServicedInput || null,
        }),
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.message || "Failed to save reminder.");

      setEditingItemType(null);
      setDueDateInput("");
      setLastServicedInput("");
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save reminder.");
    } finally {
      setSavingReminder(false);
    }
  };

  const handleDeleteReminder = async (id: string) => {
    const { data } = await supabase!.auth.getSession();
    if (!data.session) return;

    try {
      const response = await fetch(`/api/maintenance-reminders/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
        },
      });
      if (response.ok) {
        setReminders((curr) => curr.filter((r) => r.id !== id));
      }
    } catch (err) {
      console.warn("Failed to delete reminder", err);
    }
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const fourteenDaysStr = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const getStatusBadge = (dueDate: string) => {
    if (dueDate < todayStr) {
      return {
        label: "Overdue",
        style: "bg-red-500/10 text-red-600 border-red-200 dark:border-red-900/40 dark:text-red-400",
        icon: ShieldAlert,
      };
    }
    if (dueDate <= fourteenDaysStr) {
      return {
        label: "Due Soon",
        style: "bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-900/40 dark:text-amber-400",
        icon: Clock,
      };
    }
    return {
      label: "Upcoming",
      style: "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-900/40 dark:text-emerald-400",
      icon: CheckCircle2,
    };
  };

  return (
    <PageShell backLabel="Back">
      <section className="rounded-[18px] border border-line bg-white p-5 dark:border-white/10 dark:bg-[#111] sm:p-7">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy text-white">
            <Bell size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-teal">
              Employer Inbox
            </p>
            <h1 className="mt-1 text-3xl font-extrabold text-navy dark:text-white">
              Inbox & Reminders
            </h1>
            <p className="mt-1 text-sm text-slate dark:text-slate-300">
              Worker availability alerts and recurring home maintenance reminders.
            </p>
          </div>
          <button
            onClick={() => void load()}
            className="rounded-[9px] border border-line p-2.5 text-slate dark:border-white/10 dark:text-slate-300"
            aria-label="Refresh inbox"
          >
            <RefreshCw size={17} />
          </button>
        </div>
      </section>

      {/* Home Maintenance Reminders Section */}
      <section className="mt-6 rounded-[18px] border border-line bg-white p-5 dark:border-white/10 dark:bg-[#111] sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4 dark:border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <Wrench size={18} className="text-teal" />
              <h2 className="text-xl font-extrabold text-navy dark:text-white">
                Home Maintenance Reminders
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate dark:text-slate-400">
              Track recurring maintenance items (AC, Geyser, Water Pump, RO Purifier). One-time
              services like painting are excluded.
            </p>
          </div>
        </div>

        {/* Modal / Form Inline to Add / Edit Maintenance Item */}
        {editingItemType && (
          <div className="mt-4 rounded-[14px] border border-teal/40 bg-teal/5 p-4 dark:border-teal/30 dark:bg-teal/10">
            <h3 className="text-sm font-bold text-navy dark:text-white">
              Set Reminder for{" "}
              {DEFAULT_RECURRING_ITEMS.find((i) => i.item_type === editingItemType)?.title}
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-navy dark:text-white mb-1">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={dueDateInput}
                  onChange={(e) => setDueDateInput(e.target.value)}
                  className="h-10 w-full rounded-[8px] border border-line bg-white px-3 text-xs text-navy dark:border-white/10 dark:bg-[#050505] dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-navy dark:text-white mb-1">
                  Last Serviced Date (Optional)
                </label>
                <input
                  type="date"
                  value={lastServicedInput}
                  onChange={(e) => setLastServicedInput(e.target.value)}
                  className="h-10 w-full rounded-[8px] border border-line bg-white px-3 text-xs text-navy dark:border-white/10 dark:bg-[#050505] dark:text-white"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => void handleSaveReminder()}
                disabled={savingReminder || !dueDateInput}
                className="flex h-9 items-center justify-center rounded-[8px] bg-navy px-4 text-xs font-bold text-white disabled:opacity-50"
              >
                {savingReminder ? "Saving..." : "Save Reminder"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingItemType(null);
                  setDueDateInput("");
                  setLastServicedInput("");
                }}
                className="flex h-9 items-center justify-center rounded-[8px] border border-line px-3 text-xs font-bold text-slate dark:border-white/10 dark:text-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Reminders List / Default Item Slots */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {DEFAULT_RECURRING_ITEMS.map((itemDef) => {
            const existing = reminders.find((r) => r.item_type === itemDef.item_type);
            const Icon = itemDef.icon;

            if (existing) {
              const status = getStatusBadge(existing.due_date);
              const StatusIcon = status.icon;

              return (
                <article
                  key={existing.id}
                  className="flex flex-col justify-between rounded-[14px] border border-line bg-[#fcfdfe] p-4 dark:border-white/10 dark:bg-[#161616]"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal/10 text-teal dark:bg-teal/20">
                          <Icon size={16} />
                        </span>
                        <div>
                          <h3 className="text-sm font-extrabold text-navy dark:text-white">
                            {existing.title}
                          </h3>
                          <p className="text-[11px] text-slate dark:text-slate-400">
                            Category: {existing.category_search_term}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${status.style}`}
                      >
                        <StatusIcon size={12} />
                        {status.label}
                      </span>
                    </div>

                    <div className="mt-3 space-y-1 text-xs text-slate dark:text-slate-300">
                      <p className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-teal" />
                        Due Date: <span className="font-bold text-navy dark:text-white">{existing.due_date}</span>
                      </p>
                      {existing.last_serviced_at && (
                        <p className="text-[11px] text-slate dark:text-slate-400">
                          Last Serviced: {existing.last_serviced_at}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-3 dark:border-white/10">
                    <Link
                      to={`/search?service=${encodeURIComponent(existing.category_search_term)}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-teal hover:underline"
                    >
                      <Search size={14} />
                      Browse Workers
                      <ExternalLink size={12} />
                    </Link>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItemType(existing.item_type);
                          setDueDateInput(existing.due_date);
                          setLastServicedInput(existing.last_serviced_at || "");
                        }}
                        className="text-[11px] font-bold text-slate hover:text-navy dark:text-slate-400 dark:hover:text-white"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteReminder(existing.id)}
                        className="text-slate/60 hover:text-red-600 dark:text-slate-500"
                        title="Remove tracking"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            }

            // Untracked default slot
            return (
              <article
                key={itemDef.item_type}
                className="flex items-center justify-between rounded-[14px] border border-dashed border-line bg-slate-50/50 p-4 dark:border-white/10 dark:bg-white/[0.02]"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200/60 text-slate-600 dark:bg-white/10 dark:text-slate-300">
                    <Icon size={16} />
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-navy dark:text-white">{itemDef.title}</h3>
                    <p className="text-[11px] text-slate dark:text-slate-400">
                      {itemDef.category_search_term}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingItemType(itemDef.item_type);
                    setDueDateInput(
                      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
                    );
                    setLastServicedInput("");
                  }}
                  className="inline-flex h-8 items-center gap-1 rounded-[8px] border border-teal/40 bg-white px-2.5 text-xs font-bold text-teal hover:bg-teal/5 dark:bg-black/30"
                >
                  <Plus size={13} />
                  Track
                </button>
              </article>
            );
          })}
        </div>
      </section>

      {/* Availability Notifications Section */}
      <section className="mt-6 space-y-3">
        <h2 className="text-lg font-extrabold text-navy dark:text-white px-1">
          Worker Availability Notifications
        </h2>
        {loading ? (
          <p className="rounded-[14px] border border-line bg-white p-7 text-center text-sm text-slate dark:border-white/10 dark:bg-[#111] dark:text-slate-300">
            Loading inbox...
          </p>
        ) : error ? (
          <p className="rounded-[14px] border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
            {error}
          </p>
        ) : notifications.length === 0 ? (
          <div className="rounded-[14px] border border-line bg-white p-8 text-center dark:border-white/10 dark:bg-[#111]">
            <Mail className="mx-auto text-slate" size={27} />
            <p className="mt-3 font-bold text-navy dark:text-white">No availability alerts yet</p>
            <p className="mt-1 text-sm text-slate dark:text-slate-400">
              Tap “Notify me when available” on an unavailable worker to receive an update here.
            </p>
          </div>
        ) : (
          notifications.map((item) => (
            <article
              key={item.id}
              className={`rounded-[14px] border p-4 ${
                item.read_at
                  ? "border-line bg-white dark:border-white/10 dark:bg-[#111]"
                  : "border-teal/30 bg-teal/5 dark:border-teal/30 dark:bg-teal/10"
              }`}
            >
              <div className="flex gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-teal shadow-sm dark:bg-black/30">
                  <Bell size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-extrabold text-navy dark:text-white">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-sm text-slate dark:text-slate-300">{item.message}</p>
                    </div>
                    {!item.read_at && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-teal" />}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="text-[11px] text-slate dark:text-slate-500">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                    {!item.read_at && (
                      <button
                        onClick={() => void markRead(item.id)}
                        className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-teal"
                      >
                        <CheckCircle2 size={14} />
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </PageShell>
  );
}
