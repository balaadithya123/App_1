import { useEffect, useMemo, useState } from "react";
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
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [availableToday, setAvailableToday] = useState(false);
  const [awayFrom, setAwayFrom] = useState("");
  const [awayUntil, setAwayUntil] = useState("");
  const [saving, setSaving] = useState(false);
  const [urgent, setUrgent] = useState(false);
  const [error, setError] = useState("");
  const [callbackCount, setCallbackCount] = useState(0);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getUser().then(async ({ data }) => {
      const current = data.user;
      if (!current) {
        navigate("/login", { replace: true });
        return;
      }
      if (current.user_metadata?.role !== "worker") {
        navigate("/", { replace: true });
        return;
      }
      const meta = current.user_metadata ?? {};
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
      setLoading(false);
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        try {
          const response = await fetch(
            `/api/callback-requests?_=${Date.now()}`,
            {
              cache: "no-store",
              headers: {
                Authorization: `Bearer ${sessionData.session.access_token}`,
              },
            },
          );
          if (response.ok) {
            const callbackData = await response.json();
            setCallbackCount(
              Array.isArray(callbackData?.requests)
                ? callbackData.requests.length
                : 0,
            );
          }
        } catch {
          setCallbackCount(0);
        }
      }
    });
  }, [navigate]);

  const saveAvailability = async (changes: {
    available_today: boolean;
    away_from?: string | null;
    away_until?: string | null;
    urgent_today: boolean;
  }) => {
    if (!supabase || !user || saving) return false;
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
      setUser((current: any) =>
        current
          ? {
              ...current,
              user_metadata: {
                ...(current.user_metadata ?? {}),
                ...changes,
                available: changes.available_today,
              },
            }
          : current,
      );
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save availability.");
      return false;
    } finally {
      setSaving(false);
    }
  };

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
        <section className="rounded-[16px] border border-[#E7ECF1] bg-white p-8 text-center shadow-soft">
          <p className="text-sm font-medium text-[#67696D]">
            Loading your worker portal...
          </p>
        </section>
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
      <div className="mx-auto max-w-4xl space-y-4">
        {/* Worker Profile Header Card */}
        <section className="rounded-[16px] border border-[#E7ECF1] bg-white p-5 sm:p-6 shadow-soft">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#E7ECF1] bg-[#F6F9FC] text-[#2C2C2C] shadow-subtle">
                {avatar ? (
                  <img
                    src={avatar}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserRound size={24} className="text-primary" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#67696D]">
                    Worker Dashboard
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-primary-100/50 bg-primary-100/15 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                    <BadgeCheck size={12} className="text-primary" />
                    Verified Pro
                  </span>
                </div>
                <h1 className="mt-0.5 truncate text-xl font-bold tracking-tight text-[#2C2C2C] sm:text-2xl">
                  {name}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#67696D]">
                  <span className="flex items-center gap-1 text-primary font-semibold">
                    <BriefcaseBusiness size={13} />
                    {category}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <MapPin size={13} className="text-[#989EA7]" />
                    {location}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#E7ECF1] bg-white px-4 text-xs font-semibold text-primary transition hover:bg-[#F6F9FC] hover:border-primary/50 shadow-subtle cursor-pointer active:scale-95"
              >
                <Edit3 size={13} />
                <span>Edit Profile</span>
              </button>
            </div>
          </div>
        </section>

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
        <section className="rounded-[16px] border border-[#E7ECF1] bg-white p-5 sm:p-6 shadow-soft">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100/20 text-primary">
              <CalendarDays size={16} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-[#2C2C2C]">
                Availability & Scheduling
              </h2>
              <p className="text-xs text-[#67696D]">
                Control when clients see you as available.
              </p>
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="mt-3 rounded-[12px] border border-rose-500/20 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600"
            >
              {error}
            </p>
          )}

          {/* Today's Availability Switch */}
          <div className="mt-4 rounded-[12px] border border-[#E7ECF1] bg-[#F6F9FC] p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <span
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                    availableToday && !isAway
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                      : "border-[#E7ECF1] bg-white text-[#989EA7]"
                  }`}
                >
                  {availableToday && !isAway ? (
                    <Check size={14} />
                  ) : (
                    <X size={14} />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-[#2C2C2C] sm:text-sm">
                    {isAway
                      ? `Away until ${formatDate(awayUntil)}`
                      : availableToday
                        ? "Available for work today"
                        : "Currently busy today"}
                  </p>
                  <p className="mt-0.5 text-xs text-[#67696D]">
                    {isAway
                      ? "Your availability automatically resumes after this away window."
                      : availableToday
                        ? "Employers can call and send callback requests directly."
                        : `Next estimated availability: ${formatDate(nextAvailable)}`}
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
                      ? "bg-primary"
                      : "bg-[#E7ECF1] border border-[#E7ECF1]"
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
          <div className="mt-3 flex items-center justify-between rounded-[12px] border border-[#E7ECF1] bg-white p-3.5 shadow-subtle">
            <div className="flex items-center gap-2.5 min-w-0">
              <Flame
                size={15}
                className={
                  urgent && !todayIsUnavailable
                    ? "text-primary"
                    : "text-[#989EA7]"
                }
              />
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#2C2C2C]">
                  Urgent / same-day jobs
                </p>
                <p className="text-[11px] text-[#67696D]">
                  {todayIsUnavailable
                    ? "Enable 'Available today' first to accept emergency jobs."
                    : "Show an urgent badge to employers needing immediate assistance."}
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
                  ? "bg-primary"
                  : "bg-[#E7ECF1] border border-[#E7ECF1]"
              }`}
            >
              <span
                className={`block h-5 w-5 rounded-full bg-white shadow-xs transition-transform ${
                  urgent && !todayIsUnavailable
                    ? "translate-x-5"
                    : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {/* Away Mode Range Box */}
          <div className="mt-3 rounded-[12px] border border-[#E7ECF1] bg-[#F6F9FC] p-3.5">
            <div className="flex items-center gap-2">
              <Plane size={14} className="text-[#67696D]" />
              <p className="text-xs font-bold text-[#2C2C2C]">
                Away Window / Vacation
              </p>
            </div>
            <p className="mt-0.5 text-[11px] text-[#67696D]">
              Select date ranges when you will be out of town or taking leave.
            </p>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <label className="text-[11px] font-semibold text-[#67696D]">
                From
                <input
                  type="date"
                  min={tomorrow}
                  value={awayFrom}
                  onChange={(e) => setAwayFrom(e.target.value)}
                  className="mt-1 h-9 w-full rounded-[12px] border border-[#E7ECF1] bg-white px-2.5 text-xs text-[#2C2C2C] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="text-[11px] font-semibold text-[#67696D]">
                Until
                <input
                  type="date"
                  min={awayFrom || tomorrow}
                  value={awayUntil}
                  onChange={(e) => setAwayUntil(e.target.value)}
                  className="mt-1 h-9 w-full rounded-[12px] border border-[#E7ECF1] bg-white px-2.5 text-xs text-[#2C2C2C] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
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
                className="inline-flex h-8 items-center rounded-full bg-primary px-4 text-xs font-semibold text-white shadow-subtle hover:bg-[#157ad4] transition disabled:opacity-50 cursor-pointer"
              >
                Set away window
              </button>
              {awayFrom && awayUntil && (
                <button
                  type="button"
                  onClick={clearAway}
                  disabled={saving}
                  className="inline-flex h-8 items-center rounded-full border border-[#E7ECF1] bg-white px-4 text-xs font-semibold text-[#2C2C2C] transition hover:bg-[#F6F9FC] cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Quick Action Navigation Grid */}
        <section className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => navigate("/worker-commitments")}
            className="group flex items-center justify-between rounded-[16px] border border-[#E7ECF1] bg-white p-3.5 text-left transition hover:border-primary/40 hover:shadow-soft cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E7ECF1] bg-[#F6F9FC] text-primary">
                <ClipboardList size={15} />
              </span>
              <div>
                <strong className="block text-xs font-bold text-[#2C2C2C]">
                  Commitments
                </strong>
                <span className="text-[11px] text-[#67696D]">Job schedule</span>
              </div>
            </div>
            <ChevronRight
              size={13}
              className="text-[#989EA7] transition group-hover:translate-x-0.5 group-hover:text-[#2C2C2C]"
            />
          </button>

          <button
            type="button"
            onClick={() => navigate("/callback-requests")}
            className="group flex items-center justify-between rounded-[16px] border border-[#E7ECF1] bg-white p-3.5 text-left transition hover:border-primary/40 hover:shadow-soft cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E7ECF1] bg-[#F6F9FC] text-primary">
                <ClipboardList size={15} />
              </span>
              <div>
                <strong className="block text-xs font-bold text-[#2C2C2C]">
                  Callbacks {callbackCount > 0 && `(${callbackCount})`}
                </strong>
                <span className="text-[11px] text-[#67696D]">Direct leads</span>
              </div>
            </div>
            <ChevronRight
              size={13}
              className="text-[#989EA7] transition group-hover:translate-x-0.5 group-hover:text-[#2C2C2C]"
            />
          </button>

          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="group flex items-center justify-between rounded-[16px] border border-[#E7ECF1] bg-white p-3.5 text-left transition hover:border-primary/40 hover:shadow-soft cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E7ECF1] bg-[#F6F9FC] text-primary">
                <Edit3 size={15} />
              </span>
              <div>
                <strong className="block text-xs font-bold text-[#2C2C2C]">
                  Profile Details
                </strong>
                <span className="text-[11px] text-[#67696D]">
                  Skills & rates
                </span>
              </div>
            </div>
            <ChevronRight
              size={13}
              className="text-[#989EA7] transition group-hover:translate-x-0.5 group-hover:text-[#2C2C2C]"
            />
          </button>

          <button
            type="button"
            onClick={logout}
            className="group flex items-center justify-between rounded-[16px] border border-rose-500/20 bg-rose-50/50 p-3.5 text-left transition hover:bg-rose-50 hover:border-rose-500/30 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-rose-500/20 bg-rose-100/50 text-rose-600">
                <LogOut size={15} />
              </span>
              <div>
                <strong className="block text-xs font-bold text-rose-700">
                  Sign Out
                </strong>
                <span className="text-[11px] text-rose-600/80">
                  End session
                </span>
              </div>
            </div>
            <ChevronRight
              size={13}
              className="text-rose-400 transition group-hover:translate-x-0.5 group-hover:text-rose-600"
            />
          </button>
        </section>
      </div>
    </PageShell>
  );
}
