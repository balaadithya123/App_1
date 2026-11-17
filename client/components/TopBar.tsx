import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Mic } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import MobileMenu from "@/components/MobileMenu";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLanguage } from "@/lib/i18n";
import { useVoiceAssistant } from "@/lib/voice-assistant-context";
import { supabase } from "@/lib/supabase";
import { getStoredDueBadgeCount, getLiveDueBadgeCount } from "@/lib/home-items";

interface TopBarProps {
  disableBrandNavigation?: boolean;
  onPostNeed?: () => void;
}

export default function TopBar({
  disableBrandNavigation = false,
  onPostNeed,
}: TopBarProps) {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const { t } = useLanguage();
  const { openCall } = useVoiceAssistant();
  const [session, setSession] = useState<any>(null);
  const [dueCount, setDueCount] = useState<number>(0);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) =>
      setSession(s),
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const updateDue = () => {
      setDueCount(getStoredDueBadgeCount(session?.user?.id));
      void getLiveDueBadgeCount(session?.user?.id).then((c) => setDueCount(c));
    };
    updateDue();
    window.addEventListener("home-items-changed", updateDue);
    return () => window.removeEventListener("home-items-changed", updateDue);
  }, [session?.user?.id]);

  const loggedIn = !!session;
  const userRole = session?.user?.user_metadata?.role;
  const isWorker = userRole === "worker";
  const isAgency = userRole === "agency";

  const homePath = isWorker
    ? "/worker-dashboard"
    : isAgency
      ? "/agency"
      : "/home";

  const isNavActive = (path: string) => {
    if (path === "/home") {
      return (
        routerLocation.pathname === "/" ||
        routerLocation.pathname === "/home" ||
        routerLocation.pathname === "/app"
      );
    }
    return routerLocation.pathname.startsWith(path);
  };

  const navLinkClass = (active: boolean) =>
    `relative inline-flex h-full items-center text-[13px] whitespace-nowrap shrink-0 transition-colors ${
      active
        ? "text-[#141210] dark:text-[#FAFAFA] font-semibold after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:rounded-full after:bg-[#F4512C]"
        : "text-[#6B645F] dark:text-[#9E958F] font-medium hover:text-[#141210] dark:hover:text-[#FAFAFA]"
    }`;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#EAE2DC]/80 dark:border-white/[0.07] bg-[#FAF8F5]/85 dark:bg-[#0B0A09]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 sm:gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Pure Brand Lockup */}
        <div className="shrink-0">
          {disableBrandNavigation ? (
            <div aria-label="Builderco">
              <BrandLogo className="h-7 w-auto" />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => navigate(homePath)}
              aria-label="Builderco Home"
              className="group flex items-center text-left cursor-pointer focus-visible:outline-none rounded-lg"
            >
              <BrandLogo className="h-7 w-auto transition-transform group-hover:scale-[1.03]" />
            </button>
          )}
        </div>

        {/* Zone 2: Clean Typographic Navigation */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex h-full items-center gap-7"
        >
          {isWorker ? (
            <>
              <Link
                to="/worker-dashboard"
                className={navLinkClass(isNavActive("/worker-dashboard"))}
              >
                {t("nav.dashboard")}
              </Link>
              <Link
                to="/worker-passbook"
                className={navLinkClass(isNavActive("/worker-passbook"))}
              >
                {t("nav.passbook")}
              </Link>
              <Link
                to="/worker-commitments"
                className={navLinkClass(isNavActive("/worker-commitments"))}
              >
                {t("nav.commitments")}
              </Link>
              <Link
                to="/callback-requests"
                className={navLinkClass(isNavActive("/callback-requests"))}
              >
                {t("nav.callbacks")}
              </Link>
            </>
          ) : isAgency ? (
            <>
              <Link
                to="/agency"
                className={navLinkClass(
                  routerLocation.pathname === "/agency" ||
                    routerLocation.pathname === "/agency/dashboard",
                )}
              >
                {t("nav.dashboard")}
              </Link>
              <Link
                to="/inbox"
                className={navLinkClass(isNavActive("/inbox"))}
              >
                {t("nav.inbox")}
              </Link>
              <Link
                to="/agency/profile/edit"
                className={navLinkClass(isNavActive("/agency/profile/edit"))}
              >
                {t("nav.profile")}
              </Link>
            </>
          ) : (
            <>
              <Link to="/home" className={navLinkClass(isNavActive("/home"))}>
                {t("nav.home")}
              </Link>
              <Link
                to="/search"
                className={navLinkClass(isNavActive("/search"))}
              >
                {t("nav.search")}
              </Link>
              <Link to="/saved" className={navLinkClass(isNavActive("/saved"))}>
                {t("nav.saved")}
              </Link>
              <Link
                to="/inbox"
                className={`${navLinkClass(isNavActive("/inbox"))} inline-flex items-center gap-1`}
              >
                <span>{t("nav.inbox")}</span>
                {dueCount > 0 && (
                  <span className="text-[11px] font-bold text-[#F4512C] tabular-nums">
                    ({dueCount > 9 ? "9+" : dueCount})
                  </span>
                )}
              </Link>
            </>
          )}
        </nav>

        {/* Zone 3: Language, Voice Assistant, Primary Action & Account Trigger */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <LanguageSelector variant="topbar" />

          <button
            type="button"
            onClick={() => openCall(true)}
            aria-label={t("nav.voiceHelp")}
            title={t("nav.voiceHelp")}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#F4512C]/30 bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C] hover:bg-[#F4512C] hover:text-white transition active:scale-95 cursor-pointer shrink-0"
          >
            <Mic size={15} />
          </button>

          {!loggedIn && (
            <Link
              to="/login"
              state={{ from: "main" }}
              className="hidden sm:inline-block text-[13px] font-medium text-[#6B645F] dark:text-[#9E958F] hover:text-[#141210] dark:hover:text-[#FAFAFA] transition whitespace-nowrap shrink-0 px-1"
            >
              {t("nav.signIn")}
            </Link>
          )}

          {!isWorker && !isAgency && (
            onPostNeed ? (
              <button
                type="button"
                onClick={onPostNeed}
                className="hidden sm:inline-flex h-9 items-center justify-center rounded-full bg-[#F4512C] hover:bg-[#E04320] text-white px-4 text-xs font-semibold transition active:scale-[0.98] cursor-pointer whitespace-nowrap shrink-0"
              >
                {t("nav.postNeed")}
              </button>
            ) : (
              <Link
                to="/home"
                state={{ openPostNeed: true }}
                className="hidden sm:inline-flex h-9 items-center justify-center rounded-full bg-[#F4512C] hover:bg-[#E04320] text-white px-4 text-xs font-semibold transition active:scale-[0.98] whitespace-nowrap shrink-0"
              >
                {t("nav.postNeed")}
              </Link>
            )
          )}

          <MobileMenu onPostNeed={onPostNeed} />
        </div>
      </div>
    </header>
  );
}
