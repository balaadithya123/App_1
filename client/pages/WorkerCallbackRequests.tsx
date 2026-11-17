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
import { ListRowsSkeleton } from "@/components/PageSkeletons";
import { supabase } from "@/lib/supabase";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import {
  formatCacheAge,
  loadCachedCallbackRequests,
  saveCachedCallbackRequests,
} from "@/lib/offline-cache";
import { useLanguage } from "@/lib/i18n";

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
  const isOnline = useOnlineStatus();
  const { t, translateCategory } = useLanguage();
  const [requests, setRequests] = useState<CallbackRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [usingCachedData, setUsingCachedData] = useState(false);
  const [cachedAt, setCachedAt] = useState<number | undefined>(undefined);
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
        const cached = loadCachedCallbackRequests<CallbackRequest>();
        if (cached) {
          setRequests(cached.requests);
          setCachedAt(cached.updatedAt);
          setUsingCachedData(true);
        } else {
          setError("Callback requests are temporarily unavailable.");
        }
        setLoading(false);
        return;
      }

      if (showLoader) setRefreshing(true);
      setError("");

      // Pre-hydrate immediately from local cache for instant rendering on slow networks
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      const session = sessionData?.session;

      if (!session) {
        const offlineCached = loadCachedCallbackRequests<CallbackRequest>();
        if (!navigator.onLine && offlineCached) {
          setRequests(offlineCached.requests);
          setCachedAt(offlineCached.updatedAt);
          setUsingCachedData(true);
          setLoading(false);
          setRefreshing(false);
          return;
        }
        if (sessionError || !session) {
          navigate("/login", { replace: true });
          return;
        }
      }

      if (session.user.user_metadata?.role !== "worker") {
        navigate("/", { replace: true });
        return;
      }

      const cached = loadCachedCallbackRequests<CallbackRequest>(session.user.id);
      if (cached) {
        setRequests(cached.requests);
        setCachedAt(cached.updatedAt);
        setLoading(false);
      }

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setUsingCachedData(true);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        const res = await fetch("/api/callback-requests", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!res.ok) {
          throw new Error("Failed to fetch callback requests");
        }

        const data = await res.json();
        const nextList = Array.isArray(data.requests) ? data.requests : [];
        setRequests(nextList);
        saveCachedCallbackRequests(session.user.id, nextList);
        setCachedAt(Date.now());
        setUsingCachedData(false);
      } catch (err) {
        console.warn("API fallback to supabase table query", err);
        try {
          const { data: workerUser } = await supabase.auth.getUser();
          if (workerUser.user) {
            const { data, error: dbErr } = await supabase
              .from("callback_requests")
              .select("*")
              .order("created_at", { ascending: false });

            if (!dbErr && Array.isArray(data)) {
              const nextList = data as CallbackRequest[];
              setRequests(nextList);
              saveCachedCallbackRequests(session.user.id, nextList);
              setCachedAt(Date.now());
              setUsingCachedData(false);
              return;
            }
          }
        } catch {
          // Ignore network fallback failure
        }

        if (cached) {
          setUsingCachedData(true);
        } else if (Object.keys(savedContacts).length === 0) {
          setError("Could not load your callback requests.");
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
      `NOTE:Builderco Lead for ${request.service_needed}. Time: ${request.preferred_time}. Notes: ${request.notes || "None"}`,
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
    if (String(id).startsWith("saved-")) return;
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
    if (String(id).startsWith("saved-")) return;
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

  // Merge saved client contacts so saved contacts are always accessible offline even if live leads didn't load
  const mergedRequests: CallbackRequest[] = (() => {
    const existingPhones = new Set(
      requests.map((r) => r.client_phone.replace(/\D/g, "")),
    );
    const savedOnly: CallbackRequest[] = Object.entries(savedContacts)
      .filter(([phoneKey]) => !existingPhones.has(phoneKey))
      .map(([phoneKey, c]) => ({
        id: `saved-${phoneKey}`,
        client_name: c.name,
        client_phone: c.phone,
        service_needed: c.service || "Saved Client",
        preferred_time: "Saved contact",
        notes: null,
        created_at: c.savedAt || new Date().toISOString(),
        status: "contacted",
      }));
    return [...requests, ...savedOnly];
  })();

  const filteredRequests = mergedRequests.filter((r) => {
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
        <section className="rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-gradient-to-br from-[#FFF4EF] via-[#FAF8F5] to-[#F5EAE2] dark:from-[#261B16] dark:via-[#1C1512] dark:to-[#15110F] p-5 sm:p-6">
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
                className="mb-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-[#6B645F] dark:text-[#9E958F] transition hover:text-[#141210] dark:hover:text-white cursor-pointer"
              >
                <ArrowLeft size={14} /> {t("callbacks.back")}
              </button>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C]">
                  <ClipboardList size={20} />
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#F4512C]">
                    {t("callbacks.eyebrow")}
                  </p>
                  <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#141210] dark:text-[#FAFAFA]">
                    {t("callbacks.title")}
                  </h1>
                  <p className="text-xs sm:text-sm text-[#6B645F] dark:text-[#9E958F]">
                    {t("callbacks.sub")}
                    {(!isOnline || usingCachedData) && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                        {t("offline.snapshot")}{cachedAt ? ` · ${formatCacheAge(cachedAt)}` : ""}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void loadRequests(true)}
              disabled={refreshing}
              aria-label="Refresh callbacks"
              className="inline-flex h-9 items-center gap-2 rounded-full border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] px-4 text-xs font-bold text-[#141210] dark:text-[#FAFAFA] hover:border-[#F4512C]/50 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw
                size={13}
                className={refreshing ? "animate-spin" : ""}
              />
              <span>{t("callbacks.refresh")}</span>
            </button>
          </div>

          {/* Action toast message */}
          {actionMessage && (
            <div className="mt-3.5 flex items-center gap-2 rounded-xl border border-[#0F8A73]/30 bg-[#0F8A73]/10 px-3.5 py-2 text-xs font-bold text-[#0F8A73]">
              <Check size={14} />
              <span>{actionMessage}</span>
            </div>
          )}

          {/* Filter Tabs and Search */}
          <div className="mt-4 flex flex-col gap-3 border-t border-[#EAE2DC] dark:border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                  filter === "all"
                    ? "bg-[#F4512C] text-white"
                    : "border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] text-[#6B645F] dark:text-[#9E958F] hover:text-[#141210] dark:hover:text-white"
                }`}
              >
                {t("callbacks.all")} ({mergedRequests.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter("new")}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                  filter === "new"
                    ? "bg-[#F4512C] text-white"
                    : "border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] text-[#6B645F] dark:text-[#9E958F] hover:text-[#141210] dark:hover:text-white"
                }`}
              >
                {t("callbacks.new")} ({requests.filter((r) => r.status === "new").length})
              </button>
              <button
                type="button"
                onClick={() => setFilter("contacted")}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                  filter === "contacted"
                    ? "bg-[#F4512C] text-white"
                    : "border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] text-[#6B645F] dark:text-[#9E958F] hover:text-[#141210] dark:hover:text-white"
                }`}
              >
                {t("callbacks.contacted")} ({requests.filter((r) => r.status === "contacted").length})
              </button>
              <button
                type="button"
                onClick={() => setFilter("saved")}
                className={`inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                  filter === "saved"
                    ? "bg-[#F4512C] text-white"
                    : "border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] text-[#6B645F] dark:text-[#9E958F] hover:text-[#141210] dark:hover:text-white"
                }`}
              >
                <Bookmark size={12} />
                <span>{t("callbacks.saved")} ({Object.keys(savedContacts).length})</span>
              </button>
            </div>

            <div className="relative flex-1 sm:max-w-[220px]">
              <Search
                size={14}
                className="absolute left-3 top-2.5 text-[#6B645F] dark:text-[#9E958F]"
              />
              <input
                type="text"
                placeholder={t("callbacks.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-full border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] pl-9 pr-3 text-xs font-semibold text-[#141210] dark:text-[#FAFAFA] placeholder:text-[#6B645F] dark:placeholder:text-[#9E958F] outline-none focus:border-[#F4512C]"
              />
            </div>
          </div>
        </section>

        {loading && <ListRowsSkeleton count={3} columns={1} />}

        {!loading && error && (
          <section
            role="alert"
            className="rounded-2xl border border-rose-500/30 bg-rose-50 dark:bg-rose-950/40 p-4 text-xs font-bold text-rose-800 dark:text-rose-200"
          >
            {error}
          </section>
        )}

        {!loading && !error && filteredRequests.length === 0 && (
          <section className="rounded-2xl border border-dashed border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-8 text-center">
            <ClipboardList
              className="mx-auto text-[#6B645F] dark:text-[#9E958F]"
              size={28}
            />
            <h2 className="mt-2 text-base font-bold text-[#141210] dark:text-[#FAFAFA]">
              {t("callbacks.emptyTitle")}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-[#6B645F] dark:text-[#9E958F]">
              {filter === "saved"
                ? t("callbacks.emptySaved")
                : t("callbacks.emptyAll")}
            </p>
          </section>
        )}

        {/* Callbacks List */}
        {!loading &&
          !error &&
          filteredRequests.map((request) => {
            const phoneKey = request.client_phone.replace(/\D/g, "");
            const isSaved = Boolean(savedContacts[phoneKey]);
            const isSyntheticSaved = String(request.id).startsWith("saved-");
            const isDeleting = deletingId === request.id;
            const isConfirming = confirmDeleteId === request.id;

            return (
              <article
                key={request.id}
                className="rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 transition-all hover:border-[#F4512C]/40"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C]">
                      <UserRound size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate text-base font-extrabold text-[#141210] dark:text-[#FAFAFA]">
                          {request.client_name}
                        </h2>
                        {isSaved && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#0F8A73]/10 px-2.5 py-0.5 text-xs font-bold text-[#0F8A73]">
                            <BookmarkCheck size={12} /> Saved
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs font-medium text-[#6B645F] dark:text-[#9E958F]">
                        Lead requested {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                        request.status === "new"
                          ? "bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C]"
                          : request.status === "contacted"
                            ? "bg-[#0F8A73]/10 text-[#0F8A73]"
                            : "bg-[#F5EFEA] dark:bg-[#242220] text-[#6B645F] dark:text-[#9E958F]"
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
                          ? "border-[#0F8A73]/30 bg-[#0F8A73]/10 text-[#0F8A73]"
                          : "border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] text-[#141210] dark:text-[#FAFAFA] hover:border-[#F4512C]/50"
                      }`}
                    >
                      {isSaved ? (
                        <BookmarkCheck size={13} />
                      ) : (
                        <Bookmark size={13} />
                      )}
                      <span>{isSaved ? t("callbacks.saved") : t("callbacks.save")}</span>
                    </button>

                    {/* Download vCard Button */}
                    <button
                      type="button"
                      title="Save contact (.vcf)"
                      onClick={() => downloadVCard(request)}
                      className="inline-flex h-8 items-center justify-center rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-3 text-xs font-bold text-[#141210] dark:text-[#FAFAFA] hover:border-[#F4512C]/50 transition cursor-pointer"
                    >
                      <Download size={13} className="mr-1" />
                      <span>{t("callbacks.contactCard")}</span>
                    </button>

                    {/* Delete Callback Button */}
                    {!isSyntheticSaved &&
                      (isConfirming ? (
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
                            className="inline-flex h-8 items-center rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-3 text-xs font-bold text-[#141210] dark:text-[#FAFAFA] cursor-pointer"
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
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] text-[#6B645F] dark:text-[#9E958F] hover:border-rose-400 hover:text-rose-600 cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      ))}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] p-3">
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6B645F] dark:text-[#9E958F]">
                      {t("callbacks.serviceNeeded")}
                    </span>
                    <p className="mt-1 text-sm sm:text-base font-bold text-[#141210] dark:text-[#FAFAFA]">
                      {translateCategory(request.service_needed)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] p-3">
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6B645F] dark:text-[#9E958F]">
                      {t("callbacks.preferredTime")}
                    </span>
                    <p className="mt-1 flex items-center gap-1.5 text-sm sm:text-base font-bold text-[#141210] dark:text-[#FAFAFA]">
                      <CalendarClock
                        size={15}
                        className="text-[#F4512C]"
                      />
                      {request.preferred_time}
                    </p>
                  </div>
                </div>

                {request.notes && (
                  <div className="mt-3 rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] p-3">
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6B645F] dark:text-[#9E958F]">
                      {t("callbacks.notesLocation")}
                    </span>
                    <p className="mt-1 whitespace-pre-wrap text-xs sm:text-sm text-[#141210] dark:text-[#FAFAFA]">
                      {request.notes}
                    </p>
                  </div>
                )}

                {/* Bottom Action Bar */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 border-t border-[#EAE2DC] dark:border-white/10 pt-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={`tel:+91${request.client_phone.replace(/\D/g, "")}`}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#141210] text-white dark:bg-white dark:text-[#11100F] px-4 text-xs font-bold transition hover:opacity-90 cursor-pointer"
                    >
                      <Phone size={14} />
                      <span>{t("card.call")} +91 {request.client_phone}</span>
                    </a>

                    <a
                      href={`https://wa.me/91${request.client_phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                        `Hello ${request.client_name}, I received your callback request for ${request.service_needed} on Builderco.`,
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#0F8A73] hover:bg-[#0B6E5B] text-white px-4 text-xs font-bold transition cursor-pointer"
                    >
                      <MessageSquare size={14} />
                      <span>{t("card.whatsapp")}</span>
                    </a>

                    <button
                      type="button"
                      title="Copy phone"
                      onClick={() =>
                        copyPhone(request.client_phone, request.id)
                      }
                      className="inline-flex h-9 items-center gap-1 rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-3 text-xs font-bold text-[#141210] dark:text-[#FAFAFA] hover:border-[#F4512C]/50 transition cursor-pointer"
                    >
                      {copiedId === String(request.id) ? (
                        <Check size={14} className="text-[#0F8A73]" />
                      ) : (
                        <Copy size={14} />
                      )}
                      <span>
                        {copiedId === String(request.id)
                          ? t("callbacks.copied")
                          : t("callbacks.copy")}
                      </span>
                    </button>
                  </div>

                  {!isSyntheticSaved && (
                    <div className="flex items-center gap-2">
                      {request.status !== "contacted" && (
                        <button
                          type="button"
                          onClick={() => updateStatus(request.id, "contacted")}
                          className="rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-3.5 py-1.5 text-xs font-bold text-[#141210] dark:text-[#FAFAFA] hover:border-[#F4512C]/50 transition cursor-pointer"
                        >
                          {t("callbacks.markContacted")}
                        </button>
                      )}
                      {request.status !== "closed" && (
                        <button
                          type="button"
                          onClick={() => updateStatus(request.id, "closed")}
                          className="rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-3.5 py-1.5 text-xs font-bold text-[#141210] dark:text-[#FAFAFA] hover:border-[#F4512C]/50 transition cursor-pointer"
                        >
                          {t("callbacks.markClosed")}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
      </div>
    </PageShell>
  );
}
