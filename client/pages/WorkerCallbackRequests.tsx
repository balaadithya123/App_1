import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  ClipboardList,
  Phone,
  RefreshCw,
  UserRound,
  Trash2,
  Bookmark,
  BookmarkCheck,
  Download,
  Copy,
  Check,
  MessageSquare,
  Search,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { supabase } from "@/lib/supabase";

type CallbackRequest = {
  id: number | string;
  client_name: string;
  client_phone: string;
  service_needed: string;
  preferred_time: string;
  notes: string | null;
  created_at: string;
  status: "new" | "contacted" | "closed" | string;
};

type SavedContact = {
  phone: string;
  name: string;
  service: string;
  savedAt: string;
};

const SAVED_CONTACTS_KEY = "local_worker_saved_client_contacts";

export default function WorkerCallbackRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<CallbackRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "new" | "contacted" | "saved">(
    "all",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [savedContacts, setSavedContacts] = useState<
    Record<string, SavedContact>
  >({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<
    string | number | null
  >(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SAVED_CONTACTS_KEY);
      if (stored) {
        setSavedContacts(JSON.parse(stored));
      }
    } catch {
      // Ignore
    }
  }, []);

  const showToast = (msg: string) => {
    setActionMessage(msg);
    window.setTimeout(() => setActionMessage(null), 3000);
  };

  const loadRequests = useCallback(
    async (showLoader = false) => {
      if (!supabase) {
        setError("Callback requests are temporarily unavailable.");
        setLoading(false);
        return;
      }

      if (showLoader) setRefreshing(true);
      setError("");

      try {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();
        if (sessionError || !sessionData.session) {
          navigate("/login", { replace: true });
          return;
        }

        if (sessionData.session.user.user_metadata?.role !== "worker") {
          navigate("/", { replace: true });
          return;
        }

        const res = await fetch("/api/callback-requests", {
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        });

        if (!res.ok) {
          throw new Error("Failed to fetch callback requests");
        }

        const data = await res.json();
        setRequests(Array.isArray(data.requests) ? data.requests : []);
      } catch (err) {
        console.warn("API fallback to supabase table query", err);
        const { data: workerUser } = await supabase.auth.getUser();
        if (workerUser.user) {
          const { data, error } = await supabase
            .from("callback_requests")
            .select("*")
            .order("created_at", { ascending: false });

          if (!error && Array.isArray(data)) {
            setRequests(data as CallbackRequest[]);
          } else {
            setError("Could not load your callback requests.");
          }
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [navigate],
  );

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const toggleSavePerson = (request: CallbackRequest) => {
    const phoneKey = request.client_phone.replace(/\D/g, "");
    if (!phoneKey) return;

    setSavedContacts((prev) => {
      const updated = { ...prev };
      if (updated[phoneKey]) {
        delete updated[phoneKey];
        showToast(`Removed ${request.client_name} from saved.`);
      } else {
        updated[phoneKey] = {
          phone: request.client_phone,
          name: request.client_name,
          service: request.service_needed,
          savedAt: new Date().toISOString(),
        };
        showToast(`Saved ${request.client_name} to contacts.`);
      }
      try {
        localStorage.setItem(SAVED_CONTACTS_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const downloadVCard = (request: CallbackRequest) => {
    const vcard = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${request.client_name} (Client - ${request.service_needed})`,
      `TEL;TYPE=CELL:${request.client_phone}`,
      `NOTE:LocalWorker Lead for ${request.service_needed}. Time: ${request.preferred_time}. Notes: ${request.notes || "None"}`,
      "END:VCARD",
    ].join("\n");

    const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${request.client_name.replace(/\s+/g, "_")}_client.vcf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Contact card downloaded.");
  };

  const copyPhone = (phone: string, id: string | number) => {
    void navigator.clipboard?.writeText(phone);
    setCopiedId(String(id));
    window.setTimeout(() => setCopiedId(null), 1800);
    showToast("Phone number copied to clipboard.");
  };

  const updateStatus = async (id: string | number, nextStatus: string) => {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        await fetch(`/api/callback-requests/${id}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: nextStatus }),
        });
      }
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: nextStatus } : r)),
      );
      showToast(`Marked request as ${nextStatus}.`);
    } catch {
      showToast("Could not update status.");
    }
  };

  const deleteCallback = async (id: string | number) => {
    setDeletingId(id);
    setConfirmDeleteId(null);
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        await fetch(`/api/callback-requests/${id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
          },
        });
      }
      await supabase.from("callback_requests").delete().eq("id", id);
      setRequests((prev) => prev.filter((r) => r.id !== id));
      showToast("Callback request deleted.");
    } catch {
      showToast("Failed to delete callback request.");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredRequests = requests.filter((r) => {
    const phoneKey = r.client_phone.replace(/\D/g, "");
    const matchesFilter =
      filter === "all"
        ? true
        : filter === "saved"
          ? Boolean(savedContacts[phoneKey])
          : r.status === filter;

    const matchesSearch =
      !searchQuery.trim() ||
      r.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.client_phone.includes(searchQuery) ||
      r.service_needed.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <PageShell hideBack hideHome>
      <div className="mx-auto max-w-3xl space-y-4">
        {/* Header card */}
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <button
                type="button"
                onClick={() =>
                  window.history.state &&
                  typeof window.history.state.idx === "number" &&
                  window.history.state.idx > 0
                    ? navigate(-1)
                    : navigate("/worker-dashboard")
                }
                className="mb-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-300 transition hover:text-zinc-950 dark:hover:text-white cursor-pointer"
              >
                <ArrowLeft size={14} /> Back
              </button>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 border border-zinc-200 dark:border-zinc-700">
                  <ClipboardList size={20} />
                </span>
                <div>
                  <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
                    Callback Requests
                  </h1>
                  <p className="text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-300">
                    Direct inquiries from verified customers.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void loadRequests(true)}
              disabled={refreshing}
              aria-label="Refresh callbacks"
              className="inline-flex h-9 items-center gap-2 rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 text-xs font-bold text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <RefreshCw
                size={13}
                className={refreshing ? "animate-spin" : ""}
              />
              <span>Refresh</span>
            </button>
          </div>

          {/* Action toast message */}
          {actionMessage && (
            <div className="mt-3.5 flex items-center gap-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-3.5 py-2 text-xs font-bold text-emerald-900 dark:text-emerald-100">
              <Check size={14} />
              <span>{actionMessage}</span>
            </div>
          )}

          {/* Filter Tabs and Search */}
          <div className="mt-4 flex flex-col gap-3 border-t border-zinc-200 dark:border-zinc-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                  filter === "all"
                    ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                    : "border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white"
                }`}
              >
                All ({requests.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter("new")}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                  filter === "new"
                    ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                    : "border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white"
                }`}
              >
                New ({requests.filter((r) => r.status === "new").length})
              </button>
              <button
                type="button"
                onClick={() => setFilter("contacted")}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                  filter === "contacted"
                    ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                    : "border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white"
                }`}
              >
                Contacted ({requests.filter((r) => r.status === "contacted").length})
              </button>
              <button
                type="button"
                onClick={() => setFilter("saved")}
                className={`inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                  filter === "saved"
                    ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                    : "border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white"
                }`}
              >
                <Bookmark size={12} />
                <span>Saved ({Object.keys(savedContacts).length})</span>
              </button>
            </div>

            <div className="relative flex-1 sm:max-w-[220px]">
              <Search
                size={14}
                className="absolute left-3 top-2.5 text-zinc-500"
              />
              <input
                type="text"
                placeholder="Search name, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 pl-9 pr-3 text-xs font-semibold text-zinc-950 dark:text-zinc-50 outline-none"
              />
            </div>
          </div>
        </section>

        {loading && (
          <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center text-sm font-semibold text-zinc-600 dark:text-zinc-300 shadow-xs">
            Loading callback requests...
          </section>
        )}

        {!loading && error && (
          <section
            role="alert"
            className="rounded-2xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-4 text-xs font-bold text-rose-800 dark:text-rose-200"
          >
            {error}
          </section>
        )}

        {!loading && !error && filteredRequests.length === 0 && (
          <section className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-8 text-center shadow-xs">
            <ClipboardList
              className="mx-auto text-zinc-400"
              size={28}
            />
            <h2 className="mt-2 text-base font-bold text-zinc-950 dark:text-zinc-50">
              No callback requests found
            </h2>
            <p className="mt-1 text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-300">
              {filter === "saved"
                ? "You haven't saved any clients yet. Click 'Save' on any callback card."
                : "Customer callback inquiries will appear here."}
            </p>
          </section>
        )}

        {/* Callbacks List */}
        {!loading &&
          !error &&
          filteredRequests.map((request) => {
            const phoneKey = request.client_phone.replace(/\D/g, "");
            const isSaved = Boolean(savedContacts[phoneKey]);
            const isDeleting = deletingId === request.id;
            const isConfirming = confirmDeleteId === request.id;

            return (
              <article
                key={request.id}
                className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 transition-all shadow-xs"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 border border-zinc-200 dark:border-zinc-700">
                      <UserRound size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate text-base font-extrabold text-zinc-950 dark:text-zinc-50">
                          {request.client_name}
                        </h2>
                        {isSaved && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                            <BookmarkCheck size={12} /> Saved
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                        Lead requested {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                        request.status === "new"
                          ? "border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300"
                          : request.status === "contacted"
                            ? "border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300"
                            : "border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      {request.status}
                    </span>

                    {/* Save Person Button */}
                    <button
                      type="button"
                      title={
                        isSaved
                          ? "Saved to Contacts"
                          : "Save contact"
                      }
                      onClick={() => toggleSavePerson(request)}
                      className={`inline-flex h-8 items-center gap-1 rounded-full border px-3 text-xs font-bold transition cursor-pointer ${
                        isSaved
                          ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300"
                          : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                      }`}
                    >
                      {isSaved ? (
                        <BookmarkCheck size={13} />
                      ) : (
                        <Bookmark size={13} />
                      )}
                      <span>{isSaved ? "Saved" : "Save"}</span>
                    </button>

                    {/* Download vCard Button */}
                    <button
                      type="button"
                      title="Save contact (.vcf)"
                      onClick={() => downloadVCard(request)}
                      className="inline-flex h-8 items-center justify-center rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-xs font-bold text-zinc-950 dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition cursor-pointer"
                    >
                      <Download size={13} className="mr-1" />
                      <span>Contact</span>
                    </button>

                    {/* Delete Callback Button */}
                    {isConfirming ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => deleteCallback(request.id)}
                          disabled={isDeleting}
                          className="inline-flex h-8 items-center rounded-full bg-rose-600 px-3 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="inline-flex h-8 items-center rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-xs font-bold text-zinc-950 dark:text-zinc-50 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        title="Delete request"
                        onClick={() => setConfirmDeleteId(request.id)}
                        disabled={isDeleting}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-500 hover:border-rose-400 hover:text-rose-600 cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/90 dark:bg-zinc-800/60 p-3">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Service Needed
                    </span>
                    <p className="mt-1 text-sm sm:text-base font-bold text-zinc-950 dark:text-zinc-50">
                      {request.service_needed}
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/90 dark:bg-zinc-800/60 p-3">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Preferred Callback Time
                    </span>
                    <p className="mt-1 flex items-center gap-1.5 text-sm sm:text-base font-bold text-zinc-950 dark:text-zinc-50">
                      <CalendarClock
                        size={15}
                        className="text-zinc-600 dark:text-zinc-300"
                      />
                      {request.preferred_time}
                    </p>
                  </div>
                </div>

                {request.notes && (
                  <div className="mt-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/90 dark:bg-zinc-800/60 p-3">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Notes & Location
                    </span>
                    <p className="mt-1 whitespace-pre-wrap text-xs sm:text-sm font-medium text-zinc-950 dark:text-zinc-50">
                      {request.notes}
                    </p>
                  </div>
                )}

                {/* Bottom Action Bar */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 border-t border-zinc-200 dark:border-zinc-800 pt-3.5">
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:+91${request.client_phone.replace(/\D/g, "")}`}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 px-4 text-xs font-bold shadow-xs transition hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer"
                    >
                      <Phone size={14} />
                      <span>Call +91 {request.client_phone}</span>
                    </a>

                    <a
                      href={`https://wa.me/91${request.client_phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                        `Hello ${request.client_name}, I received your callback request for ${request.service_needed} on LocalWorker.`,
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#128C7E] hover:bg-[#075E54] text-white px-4 text-xs font-bold shadow-xs transition cursor-pointer"
                    >
                      <MessageSquare size={14} />
                      <span>WhatsApp</span>
                    </a>

                    <button
                      type="button"
                      title="Copy phone"
                      onClick={() =>
                        copyPhone(request.client_phone, request.id)
                      }
                      className="inline-flex h-9 items-center gap-1 rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-xs font-bold text-zinc-950 dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition cursor-pointer"
                    >
                      {copiedId === String(request.id) ? (
                        <Check size={14} className="text-emerald-500" />
                      ) : (
                        <Copy size={14} />
                      )}
                      <span>
                        {copiedId === String(request.id) ? "Copied" : "Copy"}
                      </span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {request.status !== "contacted" && (
                      <button
                        type="button"
                        onClick={() => updateStatus(request.id, "contacted")}
                        className="rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3.5 py-1.5 text-xs font-bold text-zinc-950 dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition cursor-pointer"
                      >
                        Mark Contacted
                      </button>
                    )}
                    {request.status !== "closed" && (
                      <button
                        type="button"
                        onClick={() => updateStatus(request.id, "closed")}
                        className="rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3.5 py-1.5 text-xs font-bold text-zinc-950 dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition cursor-pointer"
                      >
                        Mark Closed
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
      </div>
    </PageShell>
  );
}
