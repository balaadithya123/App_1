import { useEffect, useMemo, useRef, useState } from "react";
import {
  BriefcaseBusiness,
  CalendarDays,
  Check,
  Edit3,
  LogOut,
  UserRound,
  X,
  ClipboardList,
  Flame,
  Plane,
  BadgeCheck,
  MapPin,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { supabase } from "@/lib/supabase";
import WorkerGrowthCard from "@/components/WorkerGrowthCard";
import WorkerPortfolioManager from "@/components/WorkerPortfolioManager";
import WorkerAgencyAffiliation from "@/components/WorkerAgencyAffiliation";
import WorkerAssignedProjects from "@/components/WorkerAssignedProjects";
import WorkerTrackRecordSection from "@/components/WorkerTrackRecordSection";
import { DashboardSkeleton } from "@/components/PageSkeletons";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import {
  formatCacheAge,
  loadCachedWorkerDashboard,
  saveCachedWorkerDashboard,
} from "@/lib/offline-cache";
import { useLanguage } from "@/lib/i18n";

const isoToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const addDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};
const formatDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export default function WorkerDashboard() {
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const { t, translateCategory } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [availableToday, setAvailableToday] = useState(false);
  const [awayFrom, setAwayFrom] = useState("");
  const [awayUntil, setAwayUntil] = useState("");
  const [saving, setSaving] = useState(false);
  const [urgent, setUrgent] = useState(false);
  const [error, setError] = useState("");
  const [callbackCount, setCallbackCount] = useState(0);
  const [cachedAt, setCachedAt] = useState<number | undefined>(undefined);

  useEffect(() => {
    let active = true;

    const applyWorkerState = (current: any, fallbackCallbacks = 0) => {
      const meta = current?.user_metadata ?? {};
      const today = isoToday();
      const storedFrom = meta.away_from || "";
      const storedUntil = meta.away_until || "";
      const validAwayRange = Boolean(
        storedFrom &&
          storedUntil &&
          storedUntil >= today &&
          storedUntil >= storedFrom,
      );
      const activeAway =
        validAwayRange && storedFrom <= today && storedUntil >= today;
      setUser(current);
      setAwayFrom(validAwayRange ? storedFrom : "");
      setAwayUntil(validAwayRange ? storedUntil : "");
      setAvailableToday(Boolean(meta.available_today) && !activeAway);
      setUrgent(Boolean(meta.urgent_today) && !activeAway);
      setCallbackCount(fallbackCallbacks);
      setLoading(false);
    };

    const hydrate = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }

      // 1. Read local session immediately so unstable/offline connections open instantly
      const { data: sessionData } = await supabase.auth.getSession();
      const localSession = sessionData?.session;
      const localUser = localSession?.user;

      if (localUser) {
        if (localUser.user_metadata?.role !== "worker") {
          navigate("/", { replace: true });
          return;
        }
        const cached = loadCachedWorkerDashboard(localUser.id);
        if (cached?.updatedAt) setCachedAt(cached.updatedAt);
        applyWorkerState(localUser, cached?.callbackCount ?? 0);
      } else if (typeof navigator !== "undefined" && !navigator.onLine) {
        const offlineFallback = loadCachedWorkerDashboard();
        if (offlineFallback) {
          setCachedAt(offlineFallback.updatedAt);
          applyWorkerState(
            {
              id: offlineFallback.userId,
              user_metadata: offlineFallback.userMetadata,
            },
            offlineFallback.callbackCount,
          );
          return;
        }
      }

      // 2. Refresh live user metadata and callback count when reachable
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        if (!localUser) navigate("/login", { replace: true });
        return;
      }

      let current = localUser ?? null;
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user) current = data.user;
      } catch {
        // Keep localSession user if network drops mid-request
      }

      if (!active) return;
      if (!current) {
        navigate("/login", { replace: true });
        return;
      }
      if (current.user_metadata?.role !== "worker") {
        navigate("/", { replace: true });
        return;
      }

      const cached = loadCachedWorkerDashboard(current.id);
      let nextCount = cached?.callbackCount ?? 0;

      if (localSession) {
        try {
          const response = await fetch("/api/callback-requests", {
            headers: {
              Authorization: `Bearer ${localSession.access_token}`,
            },
          });
          if (response.ok) {
            const callbackData = await response.json();
            nextCount = Array.isArray(callbackData?.requests)
              ? callbackData.requests.length
              : 0;
          }
        } catch {
          // Retain cached count when unstable
        }
      }

      if (!active) return;
      const now = Date.now();
      setCachedAt(now);
      applyWorkerState(current, nextCount);
      saveCachedWorkerDashboard({
        userId: current.id,
        role: current.user_metadata?.role || "worker",
        userMetadata: current.user_metadata ?? {},
        callbackCount: nextCount,
        updatedAt: now,
      });
    };

    void hydrate();
    return () => {
      active = false;
    };
  }, [navigate]);

  const saveAvailability = async (changes: {
    available_today: boolean;
    away_from?: string | null;
    away_until?: string | null;
    urgent_today: boolean;
  }) => {
    if (!supabase || !user || saving) return false;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setError("You're offline. Reconnect to sync your live availability.");
      return false;
    }
    setError("");
    setSaving(true);
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        "worker-availability-notify",
        {
          body: changes,
        },
      );
      if (fnError)
        throw new Error(fnError.message || "Could not save availability.");
      if (fnData?.message && !fnData.worker) throw new Error(fnData.message);
      setUser((current: any) => {
        if (!current) return current;
        const nextMeta = {
          ...(current.user_metadata ?? {}),
          ...changes,
          available: changes.available_today,
        };
        saveCachedWorkerDashboard({
          userId: current.id,
          role: nextMeta.role || "worker",
          userMetadata: nextMeta,
          callbackCount,
          updatedAt: Date.now(),
        });
        return {
          ...current,
          user_metadata: nextMeta,
        };
      });
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save availability.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveAvailabilityRef = useRef(saveAvailability);
  saveAvailabilityRef.current = saveAvailability;

  useEffect(() => {
    const handleVoiceAvailability = (event: Event) => {
      const detail = (
        event as CustomEvent<{ availableToday?: boolean; urgentToday?: boolean }>
      ).detail;
      if (!detail || typeof detail.availableToday !== "boolean") return;
      const nextAvailable = detail.availableToday;
      const nextUrgent = Boolean(detail.urgentToday) && nextAvailable;
      setAvailableToday(nextAvailable);
      setUrgent(nextUrgent);
      void saveAvailabilityRef.current({
        available_today: nextAvailable,
        away_from: nextAvailable ? null : awayFrom || null,
        away_until: nextAvailable ? null : awayUntil || null,
        urgent_today: nextUrgent,
      });
    };
    window.addEventListener(
      "builderco-voice-availability",
      handleVoiceAvailability,
    );
    return () => {
      window.removeEventListener(
        "builderco-voice-availability",
        handleVoiceAvailability,
      );
    };
  }, [awayFrom, awayUntil]);

  const isAway = Boolean(
    awayFrom && awayUntil && awayFrom <= isoToday() && awayUntil >= isoToday(),
  );
  const todayIsUnavailable = isAway || !availableToday;

  const toggleToday = async () => {
    if (isAway || saving) return;
    const next = !availableToday;
    const previousUrgent = urgent;
    setAvailableToday(next);
    if (!next) setUrgent(false);
    const ok = await saveAvailability({
      available_today: next,
      away_from: awayFrom || null,
      away_until: awayUntil || null,
      urgent_today: next ? urgent : false,
    });
    if (!ok) {
      setAvailableToday(!next);
      setUrgent(previousUrgent);
    }
  };

  const toggleUrgent = async () => {
    if (todayIsUnavailable || saving) return;
    const next = !urgent;
    setUrgent(next);
    if (
      !(await saveAvailability({
        available_today: true,
        away_from: awayFrom || null,
        away_until: awayUntil || null,
        urgent_today: next,
      }))
    )
      setUrgent(!next);
  };

  const saveAway = async () => {
    if (!awayFrom || !awayUntil || awayUntil < awayFrom || saving) return;
    if (
      await saveAvailability({
        available_today: false,
        away_from: awayFrom,
        away_until: awayUntil,
        urgent_today: false,
      })
    ) {
      setAvailableToday(false);
      setUrgent(false);
    }
  };

  const clearAway = async () => {
    if (
      await saveAvailability({
        available_today: false,
        away_from: null,
        away_until: null,
        urgent_today: false,
      })
    ) {
      setAwayFrom("");
      setAwayUntil("");
      setAvailableToday(false);
      setUrgent(false);
    }
  };

  const logout = async () => {
    await supabase?.auth.signOut();
    navigate("/", { replace: true });
  };

  const nextAvailable = useMemo(
    () =>
      isAway
        ? addDays(new Date(`${awayUntil}T00:00:00`), 1)
            .toISOString()
            .slice(0, 10)
        : availableToday
          ? isoToday()
          : addDays(new Date(), 1).toISOString().slice(0, 10),
    [availableToday, awayUntil, isAway],
  );

  if (loading) {
    return (
      <PageShell hideBack hideHome>
        <DashboardSkeleton statCount={3} cardCount={2} />
      </PageShell>
    );
  }

  if (!user) return null;
  const meta = user.user_metadata ?? {};
  const name = meta.name || "Worker";
  const category = meta.category || "General Services";
  const location = meta.location || "Location not set";
  const avatar = meta.avatar_url || "";
  const tomorrow = addDays(new Date(), 1).toISOString().slice(0, 10);

  return (
    <PageShell hideBack hideHome>
      <div className="mx-auto max-w-4xl space-y-5">
        {/* Worker Profile Hero Banner */}
        <section className="relative overflow-hidden rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-gradient-to-br from-[#FFF4EF] via-[#FAF8F5] to-[#F5EAE2] dark:from-[#261B16] dark:via-[#1C1512] dark:to-[#15110F] p-6 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] text-[#141210] dark:text-[#FAFAFA]">
                {avatar ? (
                  <img
                    src={avatar}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserRound size={26} className="text-[#F4512C]" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#F4512C]">
                    {t("worker.portal")}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#EAE2DC] dark:border-white/10 bg-white/80 dark:bg-[#161514]/80 px-2.5 py-0.5 text-[10px] font-semibold text-[#141210] dark:text-[#FAFAFA]">
                    <BadgeCheck size={12} className="text-[#0F8A73]" />
                    {t("worker.verifiedPro")}
                  </span>
                  {!isOnline && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                      {t("offline.snapshot")}{cachedAt ? ` · ${formatCacheAge(cachedAt)}` : ""}
                    </span>
                  )}
                </div>
                <h1 className="mt-1 truncate text-2xl font-extrabold tracking-tight text-[#141210] dark:text-[#FAFAFA] sm:text-3xl">
                  {name}
                </h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-[#6B645F] dark:text-[#9E958F]">
                  <span className="flex items-center gap-1 font-semibold text-[#141210] dark:text-[#FAFAFA]">
                    <BriefcaseBusiness size={13} className="text-[#F4512C]" />
                    {translateCategory(category)}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <MapPin size={13} />
                    {location}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <PWAInstallButton variant="pill" />
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#141210] text-white dark:bg-white dark:text-[#11100F] px-5 text-xs font-bold transition hover:opacity-90 cursor-pointer active:scale-95"
              >
                <Edit3 size={13} />
                <span>{t("worker.editProfile")}</span>
              </button>
            </div>
          </div>
        </section>

        {/* Work Passbook: customer-confirmed job history */}
        <button
          type="button"
          onClick={() => navigate("/worker-passbook")}
          className="group flex w-full items-center gap-4 rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 text-left transition hover:border-[#F4512C]/50 cursor-pointer"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C]">
            <BadgeCheck size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-[#F4512C]">
              {t("worker.passbookEyebrow")}
            </span>
            <span className="mt-0.5 block text-sm sm:text-base font-bold text-[#141210] dark:text-[#FAFAFA]">
              {t("worker.passbookTitle")}
            </span>
            <span className="block text-xs text-[#6B645F] dark:text-[#9E958F]">
              {t("worker.passbookSub")}
            </span>
          </span>
          <ChevronRight
            size={18}
            className="shrink-0 text-[#6B645F] dark:text-[#9E958F] transition group-hover:translate-x-0.5 group-hover:text-[#F4512C]"
          />
        </button>

        {/* Growth & Metric Summaries */}
        <WorkerGrowthCard />

        {/* Public Track Record Timeline */}
        <WorkerTrackRecordSection
          workerId={user?.id || "1"}
          workerName={name}
        />

        {/* Work Portfolio Upload & Management */}
        <WorkerPortfolioManager />

        {/* Agency Affiliation & Team Joining */}
        <WorkerAgencyAffiliation
          userId={user?.id}
          userPhone={user?.user_metadata?.phone || user?.phone}
        />

        {/* Agency Assigned Projects */}
        <WorkerAssignedProjects
          workerId={user?.id}
          workerPhone={user?.user_metadata?.phone || user?.phone}
          workerName={name}
        />

        {/* Availability Management Panel */}
        <section className="rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C]">
              <CalendarDays size={18} />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#F4512C]">
                {t("worker.scheduleEyebrow")}
              </p>
              <h2 className="text-base font-bold text-[#141210] dark:text-[#FAFAFA]">
                {t("worker.availabilityHeading")}
              </h2>
              <p className="text-xs text-[#6B645F] dark:text-[#9E958F]">
                {t("worker.availabilitySub")}
              </p>
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="mt-3 rounded-xl border border-rose-500/20 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400"
            >
              {error}
            </p>
          )}

          {/* Today's Availability Switch */}
          <div className="mt-4 rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <span
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                    availableToday && !isAway
                      ? "border-[#0F8A73]/40 bg-[#0F8A73]/10 text-[#0F8A73]"
                      : "border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] text-[#6B645F] dark:text-[#9E958F]"
                  }`}
                >
                  {availableToday && !isAway ? (
                    <Check size={14} />
                  ) : (
                    <X size={14} />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-[#141210] dark:text-[#FAFAFA] sm:text-sm">
                    {isAway
                      ? t("worker.awayUntil", { date: formatDate(awayUntil) })
                      : availableToday
                        ? t("worker.availableToday")
                        : t("worker.busyToday")}
                  </p>
                  <p className="mt-0.5 text-xs text-[#6B645F] dark:text-[#9E958F]">
                    {isAway
                      ? t("worker.awayDesc")
                      : availableToday
                        ? t("worker.availableDesc")
                        : t("worker.nextAvailable", {
                            date: formatDate(nextAvailable),
                          })}
                  </p>
                </div>
              </div>

              {!isAway && (
                <button
                  type="button"
                  role="switch"
                  aria-checked={availableToday}
                  aria-label="Toggle today's availability"
                  onClick={toggleToday}
                  disabled={saving}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer disabled:opacity-50 ${
                    availableToday
                      ? "bg-[#F4512C]"
                      : "bg-[#EAE2DC] dark:bg-[#242220]"
                  }`}
                >
                  <span
                    className={`block h-5 w-5 rounded-full bg-white shadow-xs transition-transform ${
                      availableToday ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              )}
            </div>
          </div>

          {/* Urgent / Same-Day Work Option */}
          <div className="mt-3 flex items-center justify-between rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] p-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <Flame
                size={16}
                className={
                  urgent && !todayIsUnavailable
                    ? "text-[#F4512C]"
                    : "text-[#6B645F] dark:text-[#9E958F]"
                }
              />
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#141210] dark:text-[#FAFAFA]">
                  {t("worker.urgentJobs")}
                </p>
                <p className="text-[11px] text-[#6B645F] dark:text-[#9E958F]">
                  {todayIsUnavailable
                    ? t("worker.urgentDisabled")
                    : t("worker.urgentEnabled")}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleUrgent}
              disabled={saving || todayIsUnavailable}
              aria-label="Toggle urgent work status"
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
                urgent && !todayIsUnavailable
                  ? "bg-[#F4512C]"
                  : "bg-[#EAE2DC] dark:bg-[#242220]"
              }`}
            >
              <span
                className={`block h-5 w-5 rounded-full bg-white shadow-xs transition-transform ${
                  urgent && !todayIsUnavailable ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {/* Away Mode Range Box */}
          <div className="mt-3 rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] p-4">
            <div className="flex items-center gap-2">
              <Plane size={14} className="text-[#F4512C]" />
              <p className="text-xs font-bold text-[#141210] dark:text-[#FAFAFA]">
                {t("worker.awayWindow")}
              </p>
            </div>
            <p className="mt-0.5 text-[11px] text-[#6B645F] dark:text-[#9E958F]">
              {t("worker.awayWindowSub")}
            </p>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <label className="text-[11px] font-semibold text-[#6B645F] dark:text-[#9E958F]">
                {t("worker.from")}
                <input
                  type="date"
                  min={tomorrow}
                  value={awayFrom}
                  onChange={(e) => setAwayFrom(e.target.value)}
                  className="mt-1 h-9 w-full rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] px-2.5 text-xs text-[#141210] dark:text-[#FAFAFA] outline-none focus:border-[#F4512C]"
                />
              </label>
              <label className="text-[11px] font-semibold text-[#6B645F] dark:text-[#9E958F]">
                {t("worker.until")}
                <input
                  type="date"
                  min={awayFrom || tomorrow}
                  value={awayUntil}
                  onChange={(e) => setAwayUntil(e.target.value)}
                  className="mt-1 h-9 w-full rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] px-2.5 text-xs text-[#141210] dark:text-[#FAFAFA] outline-none focus:border-[#F4512C]"
                />
              </label>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={saveAway}
                disabled={
                  !awayFrom || !awayUntil || awayUntil < awayFrom || saving
                }
                className="inline-flex h-8 items-center rounded-full bg-[#F4512C] hover:bg-[#E04320] text-white px-4 text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
              >
                {t("worker.setAway")}
              </button>
              {awayFrom && awayUntil && (
                <button
                  type="button"
                  onClick={clearAway}
                  disabled={saving}
                  className="inline-flex h-8 items-center rounded-full border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] px-4 text-xs font-semibold text-[#141210] dark:text-[#FAFAFA] transition hover:border-[#F4512C]/50 cursor-pointer"
                >
                  {t("worker.clear")}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Quick Action Navigation Grid */}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => navigate("/worker-commitments")}
            className="group flex items-center justify-between rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-4 text-left transition hover:border-[#F4512C]/50 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C]">
                <ClipboardList size={16} />
              </span>
              <div>
                <strong className="block text-xs font-bold text-[#141210] dark:text-[#FAFAFA]">
                  {t("nav.commitments")}
                </strong>
                <span className="text-[11px] text-[#6B645F] dark:text-[#9E958F]">
                  {t("worker.jobSchedule")}
                </span>
              </div>
            </div>
            <ChevronRight
              size={14}
              className="text-[#6B645F] dark:text-[#9E958F] transition group-hover:translate-x-0.5 group-hover:text-[#F4512C]"
            />
          </button>

          <button
            type="button"
            onClick={() => navigate("/callback-requests")}
            className="group flex items-center justify-between rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-4 text-left transition hover:border-[#F4512C]/50 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C]">
                <ClipboardList size={16} />
              </span>
              <div>
                <strong className="block text-xs font-bold text-[#141210] dark:text-[#FAFAFA]">
                  {t("nav.callbacks")} {callbackCount > 0 && `(${callbackCount})`}
                </strong>
                <span className="text-[11px] text-[#6B645F] dark:text-[#9E958F]">
                  {t("worker.directLeads")}
                </span>
              </div>
            </div>
            <ChevronRight
              size={14}
              className="text-[#6B645F] dark:text-[#9E958F] transition group-hover:translate-x-0.5 group-hover:text-[#F4512C]"
            />
          </button>

          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="group flex items-center justify-between rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-4 text-left transition hover:border-[#F4512C]/50 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C]">
                <Edit3 size={16} />
              </span>
              <div>
                <strong className="block text-xs font-bold text-[#141210] dark:text-[#FAFAFA]">
                  {t("worker.profileDetails")}
                </strong>
                <span className="text-[11px] text-[#6B645F] dark:text-[#9E958F]">
                  {t("worker.skillsRates")}
                </span>
              </div>
            </div>
            <ChevronRight
              size={14}
              className="text-[#6B645F] dark:text-[#9E958F] transition group-hover:translate-x-0.5 group-hover:text-[#F4512C]"
            />
          </button>

          <button
            type="button"
            onClick={logout}
            className="group flex items-center justify-between rounded-2xl border border-rose-500/20 bg-rose-50/50 dark:bg-rose-950/20 p-4 text-left transition hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-500/30 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-rose-500/20 bg-rose-100/50 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400">
                <LogOut size={16} />
              </span>
              <div>
                <strong className="block text-xs font-bold text-rose-700 dark:text-rose-300">
                  {t("worker.signOut")}
                </strong>
                <span className="text-[11px] text-rose-600/80 dark:text-rose-400/80">
                  {t("worker.endSession")}
                </span>
              </div>
            </div>
            <ChevronRight
              size={14}
              className="text-rose-400 transition group-hover:translate-x-0.5 group-hover:text-rose-600 dark:group-hover:text-rose-300"
            />
          </button>
        </section>
      </div>
    </PageShell>
  );
}
