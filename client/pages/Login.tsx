import { FormEvent, useState } from "react";
import { Eye, EyeOff, Loader2, UserRound, ArrowLeft } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
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
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#09090B] text-[#09090B] dark:text-[#FAFAFA] flex flex-col selection:bg-neutral-200 dark:selection:bg-neutral-800">
      {/* Minimal Top Bar: ONLY Logo + Name and Back Button */}
      <header className="sticky top-0 z-30 w-full border-b border-[#E4E4E7] dark:border-[#27272A] bg-white/80 dark:bg-[#141416]/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 sm:h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          {/* Logo & Name */}
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-2.5 group cursor-pointer text-left focus:outline-none"
            aria-label="LocalWorker"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-black text-white dark:bg-white dark:text-black font-extrabold text-sm shadow-sm transition-transform group-hover:scale-105">
              L
            </span>
            <span className="text-base font-bold tracking-tight text-[#09090B] dark:text-[#FAFAFA]">
              LocalWorker
            </span>
          </button>

          {/* Back Button */}
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-[#09090B] dark:text-[#FAFAFA] hover:bg-[#F4F4F5] dark:hover:bg-[#27272A] hover:border-neutral-400 dark:hover:border-neutral-500 transition shadow-xs cursor-pointer active:scale-95"
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
          <section className="rounded-[20px] border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-[14px] bg-black text-white dark:bg-white dark:text-black shadow-sm">
              <UserRound size={22} />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-[#09090B] dark:text-[#FAFAFA]">
              Welcome back
            </h1>
            <p className="mt-1.5 text-xs text-[#71717A] dark:text-[#A1A1AA]">
              Sign in to manage your worker profile, bookmarks, and requests.
            </p>

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="login-email"
                  className="mb-1.5 block text-xs font-bold text-[#09090B] dark:text-[#FAFAFA]"
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
                  className="h-11 w-full rounded-[12px] border border-[#E4E4E7] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#09090B] px-3.5 text-sm text-[#09090B] dark:text-[#FAFAFA] placeholder:text-[#A1A1AA] dark:placeholder:text-[#71717A] focus:border-neutral-400 dark:focus:border-neutral-500 focus:outline-none transition shadow-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="mb-1.5 block text-xs font-bold text-[#09090B] dark:text-[#FAFAFA]"
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
                    className="h-11 w-full rounded-[12px] border border-[#E4E4E7] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#09090B] px-3.5 pr-11 text-sm text-[#09090B] dark:text-[#FAFAFA] placeholder:text-[#A1A1AA] dark:placeholder:text-[#71717A] focus:border-neutral-400 dark:focus:border-neutral-500 focus:outline-none transition shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center text-[#71717A] hover:text-[#09090B] dark:hover:text-[#FAFAFA] cursor-pointer"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-[#71717A] dark:text-[#A1A1AA] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded accent-black dark:accent-white"
                  />
                  Remember me
                </label>
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-[12px] border border-rose-200 bg-rose-50 dark:bg-rose-950/40 dark:border-rose-900/60 px-3.5 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-black text-white dark:bg-white dark:text-black text-sm font-bold shadow-sm hover:bg-neutral-800 dark:hover:bg-neutral-200 transition disabled:opacity-60 cursor-pointer active:scale-[0.99]"
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

            <div className="mt-6 border-t border-[#E4E4E7] dark:border-[#27272A] pt-5 text-center">
              <p className="text-xs text-[#71717A] dark:text-[#A1A1AA]">
                Don't have an account yet?
              </p>
              <div className="mt-3 flex items-center justify-center gap-2">
                <Link
                  to="/join"
                  className="inline-flex rounded-full border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] px-5 py-2 text-xs font-bold text-[#09090B] dark:text-[#FAFAFA] hover:border-neutral-400 dark:hover:border-neutral-500 transition shadow-sm"
                >
                  Join as Worker
                </Link>
                <Link
                  to="/register-agency"
                  className="inline-flex rounded-full border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] px-5 py-2 text-xs font-bold text-[#09090B] dark:text-[#FAFAFA] hover:border-neutral-400 dark:hover:border-neutral-500 transition shadow-sm"
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
