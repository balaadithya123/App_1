import {
  X,
  UserRound,
  LogOut,
  BriefcaseBusiness,
  Search,
  Bell,
  Heart,
  Clock3,
  ShieldCheck,
  Building2,
  Package,
  IndianRupee,
  MoreHorizontal,
  Plus,
  PhoneCall,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getSavedWorkerIds } from "@/lib/favorites";
import { getRecentlyViewedWorkerIds } from "@/lib/recently-viewed";
import { getStoredDueBadgeCount, getLiveDueBadgeCount } from "@/lib/home-items";
import ThemeToggle from "@/components/ThemeToggle";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLanguage } from "@/lib/i18n";
import { useVoiceAssistant } from "@/lib/voice-assistant-context";

interface MobileMenuProps {
  onPostNeed?: () => void;
}

export default function MobileMenu({ onPostNeed }: MobileMenuProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { openCall } = useVoiceAssistant();
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [unread, setUnread] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [recentCount, setRecentCount] = useState(0);
  const [dueRemindersCount, setDueRemindersCount] = useState(0);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session);
    });
    const { data: l } = supabase.auth.onAuthStateChange((_e, next) => {
      if (active) setSession(next);
    });
    return () => {
      active = false;
      l.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const refresh = () => {
      setSavedCount(getSavedWorkerIds().length);
      setRecentCount(getRecentlyViewedWorkerIds().length);
      setDueRemindersCount(getStoredDueBadgeCount(session?.user?.id));
      void getLiveDueBadgeCount(session?.user?.id).then((cnt) => {
        setDueRemindersCount(cnt);
      });
    };
    refresh();
    window.addEventListener("saved-workers-changed", refresh);
    window.addEventListener("recently-viewed-changed", refresh);
    window.addEventListener("home-items-changed", refresh);
    return () => {
      window.removeEventListener("saved-workers-changed", refresh);
      window.removeEventListener("recently-viewed-changed", refresh);
      window.removeEventListener("home-items-changed", refresh);
    };
  }, [session?.user?.id]);

  useEffect(() => {
    let active = true;
    setUnread(0);
    if (!session || session.user?.user_metadata?.role === "worker") return;
    void fetch("/api/notifications", {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
    })
      .then(async (r) => (r.ok ? r.json() : null))
      .then((result) => {
        if (active && result) {
          setUnread(
            (result.notifications || []).filter((n: any) => !n.read_at).length,
          );
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [session]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const logout = async () => {
    await supabase?.auth.signOut();
    setOpen(false);
    navigate("/", { replace: true });
  };

  const loggedIn = !!session;
  const userRole = session?.user?.user_metadata?.role;
  const isWorker = userRole === "worker";
  const isAgency = userRole === "agency";
  const showInbox = loggedIn && !isWorker;
  const totalBadge = unread + dueRemindersCount;

  const displayName =
    session?.user?.user_metadata?.name || session?.user?.email || "";
  const initialLetter = displayName.trim().charAt(0).toUpperCase();

  const handlePostNeedClick = () => {
    setOpen(false);
    if (onPostNeed) {
      onPostNeed();
    } else {
      navigate("/home", { state: { openPostNeed: true } });
    }
  };

  return (
    <div ref={menuRef} className="relative z-50 flex items-center">
      {/* Unified Minimal Trigger: Avatar Initial (logged in) or Quiet Menu Button (logged out) */}
      <button
        type="button"
        aria-label={open ? "Close menu" : loggedIn ? "Account menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`relative flex h-9 w-9 items-center justify-center rounded-full border transition cursor-pointer active:scale-95 ${
          loggedIn
            ? "border-[#F4512C]/30 bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C] hover:border-[#F4512C]"
            : "border-[#EAE2DC] dark:border-white/10 bg-transparent text-[#6B645F] dark:text-[#9E958F] hover:text-[#141210] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
        }`}
      >
        {open ? (
          <X size={15} />
        ) : loggedIn ? (
          initialLetter ? (
            <span className="text-xs font-bold leading-none">{initialLetter}</span>
          ) : (
            <UserRound size={15} />
          )
        ) : (
          <MoreHorizontal size={16} />
        )}

        {totalBadge > 0 && !open && (
          <span
            aria-hidden="true"
            className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-[#F4512C] ring-2 ring-[#FAF8F5] dark:ring-[#0B0A09]"
          />
        )}
      </button>

      {/* Clean Editorial Dropdown Panel */}
      {open && (
        <nav
          aria-label="Account and navigation menu"
          className="absolute right-0 top-11 z-[100] w-72 origin-top-right rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-2 shadow-2xl transition animate-in fade-in zoom-in-95 duration-150 text-[#141210] dark:text-[#FAFAFA]"
        >
          {/* User / Account Header */}
          {loggedIn ? (
            <Link
              to={
                isWorker
                  ? "/worker-dashboard"
                  : isAgency
                    ? "/agency/dashboard"
                    : "/profile"
              }
              onClick={() => setOpen(false)}
              className="flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 transition hover:bg-[#FAF8F5] dark:hover:bg-[#242220]"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-[#141210] dark:text-[#FAFAFA]">
                  {displayName}
                </p>
                <p className="text-[11px] text-[#6B645F] dark:text-[#9E958F]">
                  {isWorker
                    ? t("menu.workerAccount")
                    : isAgency
                      ? t("menu.agencyAccount")
                      : t("menu.memberAccount")}
                </p>
              </div>
              <UserRound size={14} className="shrink-0 text-[#8C847E] dark:text-[#766F6A]" />
            </Link>
          ) : (
            <div className="px-2.5 py-2">
              <p className="text-xs font-semibold text-[#141210] dark:text-[#FAFAFA]">
                Builderco
              </p>
              <p className="text-[11px] text-[#6B645F] dark:text-[#9E958F]">
                {t("menu.subtitle")}
              </p>
            </div>
          )}

          {/* Voice Call Quick Launch */}
          <div className="mt-1 px-1 space-y-1.5">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                openCall(true);
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-full border border-[#F4512C]/30 bg-[#FCEAE4] dark:bg-[#3A2018] py-2 text-xs font-bold text-[#F4512C] transition hover:bg-[#F4512C] hover:text-white cursor-pointer"
            >
              <PhoneCall size={13} />
              <span>{t("hero.voiceCta")}</span>
            </button>

            {!isWorker && !isAgency && (
              <button
                type="button"
                onClick={handlePostNeedClick}
                className="flex sm:hidden w-full items-center justify-center gap-1.5 rounded-full bg-[#F4512C] hover:bg-[#E04320] py-2 text-xs font-semibold text-white transition cursor-pointer"
              >
                <Plus size={14} />
                <span>{t("nav.postNeed")}</span>
              </button>
            )}
          </div>

          {/* Role Management Shortcuts */}
          {(isWorker || isAgency || showInbox) && (
            <div className="mt-1.5 border-t border-[#EAE2DC]/70 dark:border-white/10 pt-1.5 space-y-0.5">
              {isWorker && (
                <>
                  <Link
                    to="/worker-dashboard"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-[#141210] dark:text-[#FAFAFA] transition hover:bg-[#FAF8F5] dark:hover:bg-[#242220]"
                  >
                    <BriefcaseBusiness size={14} className="text-[#F4512C]" />
                    <span>{t("menu.workerPortal")}</span>
                  </Link>
                  <Link
                    to="/profile-completeness"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-[#6B645F] dark:text-[#9E958F] transition hover:bg-[#FAF8F5] dark:hover:bg-[#242220] hover:text-[#141210] dark:hover:text-white"
                  >
                    <ShieldCheck size={14} />
                    <span>{t("menu.profileCompleteness")}</span>
                  </Link>
                </>
              )}

              {isAgency && (
                <Link
                  to="/agency/dashboard"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-[#141210] dark:text-[#FAFAFA] transition hover:bg-[#FAF8F5] dark:hover:bg-[#242220]"
                >
                  <Building2 size={14} className="text-[#F4512C]" />
                  <span>{t("menu.agencyPortal")}</span>
                </Link>
              )}

              {showInbox && (
                <Link
                  to="/inbox"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium text-[#141210] dark:text-[#FAFAFA] transition hover:bg-[#FAF8F5] dark:hover:bg-[#242220]"
                >
                  <span className="flex items-center gap-2.5">
                    <Bell size={14} className="text-[#6B645F] dark:text-[#9E958F]" />
                    <span>{t("menu.inboxReminders")}</span>
                  </span>
                  {totalBadge > 0 && (
                    <span className="text-[11px] font-bold text-[#F4512C] tabular-nums">
                      {totalBadge}
                    </span>
                  )}
                </Link>
              )}
            </div>
          )}

          {/* Directory & Utility Links */}
          <div className="mt-1.5 border-t border-[#EAE2DC]/70 dark:border-white/10 pt-1.5 space-y-0.5">
            <Link
              to="/search?type=workers"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-[#6B645F] dark:text-[#9E958F] transition hover:bg-[#FAF8F5] dark:hover:bg-[#242220] hover:text-[#141210] dark:hover:text-white md:hidden"
            >
              <Search size={14} />
              <span>{t("menu.searchPros")}</span>
            </Link>

            <Link
              to="/materials"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-[#6B645F] dark:text-[#9E958F] transition hover:bg-[#FAF8F5] dark:hover:bg-[#242220] hover:text-[#141210] dark:hover:text-white"
            >
              <Package size={14} />
              <span>{t("menu.materials")}</span>
            </Link>

            <Link
              to="/rate-guide"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-[#6B645F] dark:text-[#9E958F] transition hover:bg-[#FAF8F5] dark:hover:bg-[#242220] hover:text-[#141210] dark:hover:text-white"
            >
              <IndianRupee size={14} />
              <span>{t("menu.rateGuide")}</span>
            </Link>

            <Link
              to="/saved"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium text-[#6B645F] dark:text-[#9E958F] transition hover:bg-[#FAF8F5] dark:hover:bg-[#242220] hover:text-[#141210] dark:hover:text-white"
            >
              <span className="flex items-center gap-2.5">
                <Heart size={14} />
                <span>{t("menu.savedWorkers")}</span>
              </span>
              {savedCount > 0 && (
                <span className="text-[11px] font-semibold text-[#8C847E] dark:text-[#766F6A] tabular-nums">
                  {savedCount}
                </span>
              )}
            </Link>

            <Link
              to="/recently-viewed"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium text-[#6B645F] dark:text-[#9E958F] transition hover:bg-[#FAF8F5] dark:hover:bg-[#242220] hover:text-[#141210] dark:hover:text-white"
            >
              <span className="flex items-center gap-2.5">
                <Clock3 size={14} />
                <span>{t("menu.recentlyViewed")}</span>
              </span>
              {recentCount > 0 && (
                <span className="text-[11px] font-semibold text-[#8C847E] dark:text-[#766F6A] tabular-nums">
                  {recentCount}
                </span>
              )}
            </Link>
          </div>

          {/* 6-Language Switcher */}
          <div className="mt-1.5 border-t border-[#EAE2DC]/70 dark:border-white/10 pt-1">
            <LanguageSelector variant="menu" />
          </div>

          {/* Install & Appearance */}
          <div className="mt-1 border-t border-[#EAE2DC]/70 dark:border-white/10 pt-1.5 space-y-1">
            <PWAInstallButton variant="menu-item" onAction={() => setOpen(false)} />
            <ThemeToggle variant="dropdown-item" />
          </div>

          {/* Auth Footer */}
          {loggedIn ? (
            <div className="mt-1.5 border-t border-[#EAE2DC]/70 dark:border-white/10 pt-1.5 flex items-center justify-between px-2.5 py-1.5">
              <Link
                to="/profile"
                onClick={() => setOpen(false)}
                className="text-xs font-medium text-[#6B645F] dark:text-[#9E958F] transition hover:text-[#141210] dark:hover:text-white"
              >
                {t("menu.accountSettings")}
              </Link>
              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 transition hover:opacity-80 cursor-pointer"
              >
                <LogOut size={13} />
                <span>{t("menu.logout")}</span>
              </button>
            </div>
          ) : (
            <div className="mt-1.5 border-t border-[#EAE2DC]/70 dark:border-white/10 pt-2 px-1 pb-1 space-y-2">
              <Link
                to="/login"
                state={{ from: "main" }}
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-2 w-full rounded-full bg-[#141210] text-white dark:bg-white dark:text-[#11100F] py-2 text-xs font-semibold transition hover:opacity-90"
              >
                <span>{t("nav.signIn")}</span>
              </Link>
              <div className="flex items-center justify-center gap-3 text-[11px] font-medium text-[#6B645F] dark:text-[#9E958F]">
                <Link
                  to="/join"
                  onClick={() => setOpen(false)}
                  className="hover:text-[#F4512C] transition"
                >
                  {t("menu.joinWorker")}
                </Link>
                <span aria-hidden="true">·</span>
                <Link
                  to="/register-agency"
                  onClick={() => setOpen(false)}
                  className="hover:text-[#F4512C] transition"
                >
                  {t("menu.joinAgency")}
                </Link>
              </div>
            </div>
          )}
        </nav>
      )}
    </div>
  );
}
