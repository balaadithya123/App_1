import { FormEvent, useState } from "react";
import { Eye, EyeOff, Loader2, LogIn, Sparkles, UserRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { supabase } from "@/lib/supabase";

const REMEMBER_KEY = "localworker.rememberMe";
const EMAIL_KEY = "localworker.rememberedEmail";

export default function Login() {
  const navigate = useNavigate();
  const remembered = typeof window !== "undefined" && localStorage.getItem(REMEMBER_KEY) === "true";
  const [email, setEmail] = useState(remembered ? localStorage.getItem(EMAIL_KEY) ?? "" : "");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(remembered);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (!supabase) {
      setError("Login is not configured yet. Please check the Supabase environment variables.");
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
          : loginError.message
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
    navigate(role === "worker" ? "/worker-dashboard" : role === "agency" ? "/agency" : "/profile", {
      replace: true,
    });
  };

  return (
    <PageShell backTo="/" backLabel="Home">
      <div className="mx-auto max-w-[460px] pb-12">
        <section className="rounded-[16px] border border-[#E7ECF1] dark:border-[#1F1F1F] bg-white dark:bg-[#0A0A0A] p-6 shadow-soft sm:p-8">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-[14px] bg-primary text-white shadow-subtle">
            <UserRound size={24} />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-[#2C2C2C] dark:text-[#F4F4F5]">Welcome back</h1>
          <p className="mt-1.5 text-xs text-[#67696D] dark:text-[#A1A1AA]">
            Sign in to manage your worker profile, bookmarks, and requests.
          </p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-xs font-bold text-[#2C2C2C] dark:text-[#F4F4F5]">
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-11 w-full rounded-[12px] border border-[#E7ECF1] dark:border-[#242424] bg-[#F6F9FC] dark:bg-[#141414] px-3.5 text-sm text-[#2C2C2C] dark:text-[#F4F4F5] placeholder:text-[#989EA7] dark:placeholder:text-[#71717A] focus:border-primary focus:bg-white dark:focus:bg-[#0A0A0A] focus:outline-none transition shadow-subtle"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="mb-1.5 block text-xs font-bold text-[#2C2C2C] dark:text-[#F4F4F5]">
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
                  className="h-11 w-full rounded-[12px] border border-[#E7ECF1] dark:border-[#242424] bg-[#F6F9FC] dark:bg-[#141414] px-3.5 pr-11 text-sm text-[#2C2C2C] dark:text-[#F4F4F5] placeholder:text-[#989EA7] dark:placeholder:text-[#71717A] focus:border-primary focus:bg-white dark:focus:bg-[#0A0A0A] focus:outline-none transition shadow-subtle"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center text-[#989EA7] hover:text-[#2C2C2C] dark:hover:text-[#F4F4F5]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs font-semibold text-[#67696D] dark:text-[#A1A1AA] cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded accent-primary"
                />
                Remember me
              </label>
            </div>

            {error && (
              <p role="alert" className="rounded-[12px] border border-rose-200 bg-rose-50 dark:bg-rose-950/40 dark:border-rose-900/60 px-3.5 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-white shadow-subtle hover:bg-[#157ad4] transition disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-[#E7ECF1] dark:border-[#1F1F1F] pt-5 text-center">
            <p className="text-xs text-[#67696D] dark:text-[#A1A1AA]">Don't have an account yet?</p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <Link
                to="/join"
                className="inline-flex rounded-full border border-primary px-5 py-2 text-xs font-bold text-primary hover:bg-primary hover:text-white transition shadow-subtle"
              >
                Join as Worker
              </Link>
              <Link
                to="/register-agency"
                className="inline-flex rounded-full border border-[#E7ECF1] dark:border-[#222222] bg-[#F6F9FC] dark:bg-[#141414] px-5 py-2 text-xs font-bold text-[#2C2C2C] dark:text-[#F4F4F5] hover:border-primary transition shadow-subtle"
              >
                Join as Agency
              </Link>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}

