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
  AlertTriangle,
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
  const [filter, setFilter] = useState<"all" | "new" | "contacted" | "saved">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [savedContacts, setSavedContacts] = useState<Record<string, SavedContact>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | number | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Load saved contacts from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SAVED_CONTACTS_KEY);
      if (stored) {
        setSavedContacts(JSON.parse(stored));
      }
    } catch {
      // Ignore storage read error
    }
  }, []);

  const showToast = (msg: string) => {
    setActionMessage(msg);
    window.setTimeout(() => setActionMessage(null), 3000);
  };

  const loadRequests = useCallback(async (showLoader = false) => {
    if (!supabase) {
      setError("Callback requests are temporarily unavailable.");
      setLoading(false);
      return;
    }

    if (showLoader) setRefreshing(true);
    setError("");

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        navigate("/login", { replace: true });
        return;
      }

      if (sessionData.session.user.user_metadata?.role !== "worker") {
        navigate("/", { replace: true });
        return;
      }

      const response = await fetch(`/api/callback-requests?_=${Date.now()}`, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
      });
      const data = (await response.json().catch(() => null)) as {
        requests?: CallbackRequest[];
        message?: string;
      } | null;

      if (!response.ok) throw new Error(data?.message || "Unable to load callback requests.");
      setRequests(data?.requests ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load callback requests.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigate]);

  useEffect(() => {
    void loadRequests();
    const interval = window.setInterval(() => void loadRequests(), 15000);
    const onFocus = () => void loadRequests();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [loadRequests]);

  // Toggle Save Person in Worker's saved address book
  const toggleSavePerson = (request: CallbackRequest) => {
    const phoneKey = request.client_phone.replace(/\D/g, "");
    setSavedContacts((prev) => {
      const next = { ...prev };
      if (next[phoneKey]) {
        delete next[phoneKey];
        showToast(`Removed ${request.client_name} from saved contacts.`);
      } else {
        next[phoneKey] = {
          phone: request.client_phone,
          name: request.client_name,
          service: request.service_needed,
          savedAt: new Date().toISOString(),
        };
        showToast(`Saved ${request.client_name} to your client book.`);
      }
      try {
        localStorage.setItem(SAVED_CONTACTS_KEY, JSON.stringify(next));
      } catch {
        // storage save
      }
      return next;
    });
  };

  // Download vCard for phone contact book
  const downloadVCard = (request: CallbackRequest) => {
    const cleanPhone = request.client_phone.replace(/\D/g, "");
    const vCardContent = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${request.client_name} (Client)`,
      `TEL;TYPE=CELL:+91${cleanPhone}`,
      `NOTE:LocalWorker Lead - Service: ${request.service_needed}. Time: ${request.preferred_time}. Notes: ${request.notes || "None"}`,
      "END:VCARD",
    ].join("\r\n");

    const blob = new Blob([vCardContent], { type: "text/vcard;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${request.client_name.replace(/\s+/g, "_")}_contact.vcf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Downloaded contact file (.vcf) for ${request.client_name}`);
  };

  // Copy phone number
  const copyPhone = (phone: string, id: string | number) => {
    void navigator.clipboard?.writeText(phone);
    setCopiedId(String(id));
    window.setTimeout(() => setCopiedId(null), 1800);
    showToast("Phone number copied to clipboard.");
  };

  // Update Status
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
        prev.map((r) => (r.id === id ? { ...r, status: nextStatus } : r))
      );
      showToast(`Marked request as ${nextStatus}.`);
    } catch {
      showToast("Could not update status.");
    }
  };

  // Delete Callback Request
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
      // Also invoke direct supabase delete as backup
      await supabase.from("callback_requests").delete().eq("id", id);
      setRequests((prev) => prev.filter((r) => r.id !== id));
      showToast("Callback request deleted.");
    } catch (e) {
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
        <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <button
                type="button"
                onClick={() => navigate("/worker-dashboard")}
                className="mb-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground cursor-pointer"
              >
                <ArrowLeft size={14} /> Back to Worker Dashboard
              </button>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-primary">
                  <ClipboardList size={18} />
                </span>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    Callback Requests
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Direct inquiries from verified account holders requesting your service.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void loadRequests(true)}
              disabled={refreshing}
              aria-label="Refresh callbacks"
              className="inline-flex h-8 items-center gap-1.5 self-start rounded-md border border-border bg-secondary px-3 text-xs font-semibold text-foreground transition hover:bg-foreground hover:text-background disabled:opacity-50 cursor-pointer sm:self-auto"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Action toast message */}
          {actionMessage && (
            <div className="mt-3.5 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
              <Check size={14} />
              <span>{actionMessage}</span>
            </div>
          )}

          {/* Filter Tabs and Search */}
          <div className="mt-4 flex flex-col gap-2.5 border-t border-border/80 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                  filter === "all"
                    ? "bg-foreground text-background"
                    : "border border-border bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                All ({requests.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter("new")}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                  filter === "new"
                    ? "bg-foreground text-background"
                    : "border border-border bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                New ({requests.filter((r) => r.status === "new").length})
              </button>
              <button
                type="button"
                onClick={() => setFilter("contacted")}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                  filter === "contacted"
                    ? "bg-foreground text-background"
                    : "border border-border bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                Contacted ({requests.filter((r) => r.status === "contacted").length})
              </button>
              <button
                type="button"
                onClick={() => setFilter("saved")}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                  filter === "saved"
                    ? "bg-foreground text-background"
                    : "border border-border bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                <Bookmark size={12} />
                <span>Saved ({Object.keys(savedContacts).length})</span>
              </button>
            </div>

            <div className="relative flex-1 sm:max-w-[220px]">
              <Search size={13} className="absolute left-2.5 top-2.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search name, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-2.5 text-xs text-foreground outline-hidden focus:border-foreground/40"
              />
            </div>
          </div>
        </section>

        {loading && (
          <section className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-xs text-muted-foreground">Loading callback requests...</p>
          </section>
        )}

        {!loading && error && (
          <section
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs font-semibold text-destructive"
          >
            {error}
          </section>
        )}

        {!loading && !error && filteredRequests.length === 0 && (
          <section className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
            <ClipboardList className="mx-auto text-muted-foreground" size={28} />
            <h2 className="mt-2 text-sm font-bold text-foreground">No callback requests found</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {filter === "saved"
                ? "You haven't saved any clients yet. Click 'Save Person' on any callback card."
                : "Direct client callback inquiries will show up here."}
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
                className="rounded-xl border border-border bg-card p-4 transition-all sm:p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-foreground">
                      <UserRound size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate text-sm font-bold text-foreground sm:text-base">
                          {request.client_name}
                        </h2>
                        {isSaved && (
                          <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                            <BookmarkCheck size={11} /> Saved
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Account Holder Lead · Requested {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-start sm:self-auto">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        request.status === "new"
                          ? "border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : request.status === "contacted"
                            ? "border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            : "border border-border bg-secondary text-muted-foreground"
                      }`}
                    >
                      {request.status}
                    </span>

                    {/* Save Person Button */}
                    <button
                      type="button"
                      title={isSaved ? "Saved to Client Book" : "Save this person's contact"}
                      onClick={() => toggleSavePerson(request)}
                      className={`inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] font-semibold transition cursor-pointer ${
                        isSaved
                          ? "border-primary bg-primary/10 text-primary hover:bg-primary/20"
                          : "border-border bg-secondary text-foreground hover:bg-foreground hover:text-background"
                      }`}
                    >
                      {isSaved ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}
                      <span>{isSaved ? "Saved" : "Save Person"}</span>
                    </button>

                    {/* Download vCard Button */}
                    <button
                      type="button"
                      title="Save directly to phone contacts (.vcf)"
                      onClick={() => downloadVCard(request)}
                      className="inline-flex h-7 items-center justify-center rounded-md border border-border bg-secondary px-2 text-[11px] font-semibold text-foreground transition hover:bg-foreground hover:text-background cursor-pointer"
                    >
                      <Download size={12} className="mr-1" />
                      <span>Contact</span>
                    </button>

                    {/* Delete Callback Button */}
                    {isConfirming ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => deleteCallback(request.id)}
                          disabled={isDeleting}
                          className="inline-flex h-7 items-center rounded-md bg-destructive px-2 text-[11px] font-bold text-destructive-foreground transition hover:opacity-90 disabled:opacity-50 cursor-pointer"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="inline-flex h-7 items-center rounded-md border border-border bg-secondary px-2 text-[11px] font-semibold text-foreground cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        title="Delete callback request"
                        onClick={() => setConfirmDeleteId(request.id)}
                        disabled={isDeleting}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-secondary text-muted-foreground transition hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="mt-3.5 grid gap-2.5 sm:grid-cols-2">
                  <div className="rounded-lg border border-border bg-secondary/30 p-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Service Needed
                    </span>
                    <p className="mt-0.5 text-xs font-bold text-foreground">
                      {request.service_needed}
                    </p>
                  </div>

                  <div className="rounded-lg border border-border bg-secondary/30 p-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Preferred Callback Time
                    </span>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs font-bold text-foreground">
                      <CalendarClock size={13} className="text-muted-foreground" />
                      {request.preferred_time}
                    </p>
                  </div>
                </div>

                {request.notes && (
                  <div className="mt-2.5 rounded-lg border border-border bg-secondary/20 p-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Client Notes & Location Details
                    </span>
                    <p className="mt-0.5 whitespace-pre-wrap text-xs text-foreground">
                      {request.notes}
                    </p>
                  </div>
                )}

                {/* Bottom Action Bar */}
                <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:+91${request.client_phone.replace(/\D/g, "")}`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-md bg-foreground px-3 text-xs font-semibold text-background transition hover:opacity-90 cursor-pointer"
                    >
                      <Phone size={13} />
                      <span>Call +91 {request.client_phone}</span>
                    </a>

                    <a
                      href={`https://wa.me/91${request.client_phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                        `Hello ${request.client_name}, I received your callback request for ${request.service_needed} on LocalWorker.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 transition hover:bg-emerald-500/20 cursor-pointer"
                    >
                      <MessageSquare size={13} />
                      <span>WhatsApp</span>
                    </a>

                    <button
                      type="button"
                      title="Copy phone"
                      onClick={() => copyPhone(request.client_phone, request.id)}
                      className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-secondary px-2 text-xs font-semibold text-foreground transition hover:bg-foreground hover:text-background cursor-pointer"
                    >
                      {copiedId === String(request.id) ? (
                        <Check size={13} className="text-primary" />
                      ) : (
                        <Copy size={13} />
                      )}
                      <span>{copiedId === String(request.id) ? "Copied" : "Copy"}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {request.status !== "contacted" && (
                      <button
                        type="button"
                        onClick={() => updateStatus(request.id, "contacted")}
                        className="rounded-md border border-border bg-secondary px-2.5 py-1 text-xs font-semibold text-foreground transition hover:bg-foreground hover:text-background cursor-pointer"
                      >
                        Mark Contacted
                      </button>
                    )}
                    {request.status !== "closed" && (
                      <button
                        type="button"
                        onClick={() => updateStatus(request.id, "closed")}
                        className="rounded-md border border-border bg-secondary px-2.5 py-1 text-xs font-semibold text-foreground transition hover:bg-foreground hover:text-background cursor-pointer"
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
