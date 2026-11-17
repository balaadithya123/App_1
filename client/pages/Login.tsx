import { FormEvent, useState } from "react";
import { Eye, EyeOff, Loader2, UserRound, ArrowLeft } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import BrandLogo from "@/components/BrandLogo";
import { supabase } from "@/lib/supabase";

const REMEMBER_KEY = "localworker.rememberMe";
const EMAIL_KEY = "localworker.rememberedEmail";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const remembered =
    typeof window !== "undefined" &&
    localStorage.getItem(REMEMBER_KEY) === "true";
  const [email, setEmail] = useState(
    remembered ? (localStorage.getItem(EMAIL_KEY) ?? "") : "",
  );
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(remembered);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Determine if the user arrived from the landing page or the main site
  const fromState = (location.state as any)?.from;
  const fromParam = new URLSearchParams(location.search).get("from");
  const fromStorage =
    typeof window !== "undefined"
      ? sessionStorage.getItem("lw_auth_origin")
      : null;

  const isFromLanding =
    fromState === "landing" ||
    fromParam === "landing" ||
    (!fromState && !fromParam && fromStorage === "landing");

  const handleBack = () => {
    if (isFromLanding) {
      navigate("/");
    } else {
      navigate("/home");
    }
  };

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (!supabase) {
      setError(
        "Login is not configured yet. Please check the Supabase environment variables.",
      );
      return;
    }
    setLoading(true);
    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (loginError) {
      setError(
        loginError.message.includes("Invalid login credentials")
          ? "Incorrect email or password."
          : loginError.message,
      );
      return;
    }
    if (rememberMe) {
      localStorage.setItem(REMEMBER_KEY, "true");
      localStorage.setItem(EMAIL_KEY, email.trim());
    } else {
      localStorage.removeItem(REMEMBER_KEY);
      localStorage.removeItem(EMAIL_KEY);
    }
    const role = data.user?.user_metadata?.role;
    // Only a Work Passbook job link may be returned to, never an arbitrary URL.
    const next = new URLSearchParams(location.search).get("next");
    if (next && /^\/job\/[a-f0-9]{32}$/.test(next)) {
      navigate(next, { replace: true });
      return;
    }
    navigate(
      role === "worker"
        ? "/worker-dashboard"
        : role === "agency"
          ? "/agency"
          : "/home",
      {
        replace: true,
      },
    );
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#0B0A09] text-[#141210] dark:text-[#FAFAFA] flex flex-col selection:bg-[#F4512C]/20">
      {/* Minimal Top Bar: ONLY Logo + Name and Back Button */}
      <header className="sticky top-0 z-30 w-full border-b border-[#EAE2DC] dark:border-white/10 bg-white/95 dark:bg-[#0B0A09]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo & Name */}
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-2.5 group cursor-pointer text-left focus:outline-none"
            aria-label="Builderco"
          >
            <BrandLogo className="h-7 w-auto transition-transform group-hover:scale-105" />
          </button>

          {/* Back Button */}
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-[#141210] dark:text-[#FAFAFA] hover:border-[#F4512C]/50 transition shadow-xs cursor-pointer active:scale-95"
            aria-label={isFromLanding ? "Back to Landing Page" : "Back to Home"}
          >
            <ArrowLeft size={15} />
            <span>Back</span>
          </button>
        </div>
      </header>

      {/* Main Area: ONLY the Login Box */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-[420px]">
          <section className="rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-6 shadow-sm sm:p-8">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C]">
              <UserRound size={22} />
            </div>

            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#F4512C]">
              Account Access
            </span>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#141210] dark:text-[#FAFAFA]">
              Welcome back
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-[#6B645F] dark:text-[#9E958F]">
              Sign in to manage your worker profile, bookmarks, and requests.
            </p>

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="login-email"
                  className="mb-1.5 block text-xs font-bold text-[#141210] dark:text-[#FAFAFA]"
                >
                  Email Address
                </label>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-11 w-full rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-3.5 text-sm text-[#141210] dark:text-[#FAFAFA] placeholder:text-[#6B645F]/70 focus:border-[#F4512C] focus:outline-none transition"
                />
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="mb-1.5 block text-xs font-bold text-[#141210] dark:text-[#FAFAFA]"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your account password"
                    className="h-11 w-full rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-3.5 pr-11 text-sm text-[#141210] dark:text-[#FAFAFA] placeholder:text-[#6B645F]/70 focus:border-[#F4512C] focus:outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center text-[#6B645F] dark:text-[#9E958F] hover:text-[#141210] dark:hover:text-[#FAFAFA] cursor-pointer"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-[#6B645F] dark:text-[#9E958F] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded accent-[#F4512C]"
                  />
                  Remember me
                </label>
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 dark:border-rose-900/60 px-3.5 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#F4512C] text-white text-sm font-bold shadow-sm hover:bg-[#E04320] transition disabled:opacity-60 cursor-pointer active:scale-[0.99]"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-current" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            <div className="mt-6 border-t border-[#EAE2DC] dark:border-white/10 pt-5 text-center">
              <p className="text-xs text-[#6B645F] dark:text-[#9E958F]">
                Don't have an account yet?
              </p>
              <div className="mt-3 flex items-center justify-center gap-2">
                <Link
                  to="/join"
                  className="inline-flex rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-5 py-2 text-xs font-bold text-[#141210] dark:text-[#FAFAFA] hover:border-[#F4512C]/50 transition"
                >
                  Join as Worker
                </Link>
                <Link
                  to="/register-agency"
                  className="inline-flex rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-5 py-2 text-xs font-bold text-[#141210] dark:text-[#FAFAFA] hover:border-[#F4512C]/50 transition"
                >
                  Join as Agency
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
