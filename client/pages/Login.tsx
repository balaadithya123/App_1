import { FormEvent, useState } from "react";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { supabase } from "@/lib/supabase";

const REMEMBER_KEY = "localworker.rememberMe";
const EMAIL_KEY = "localworker.rememberedEmail";

export default function Login() {
  const navigate = useNavigate();
  const remembered = localStorage.getItem(REMEMBER_KEY) === "true";
  const [email, setEmail] = useState(remembered ? localStorage.getItem(EMAIL_KEY) ?? "" : "");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(remembered);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!supabase) {
      setError("Login is not configured yet. Please check the Supabase environment variables.");
      return;
    }

    setLoading(true);
    const { error: loginError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);

    if (loginError) {
      setError(loginError.message.includes("Invalid login credentials") ? "Incorrect email or password." : loginError.message);
      return;
    }

    if (rememberMe) {
      localStorage.setItem(REMEMBER_KEY, "true");
      localStorage.setItem(EMAIL_KEY, email.trim());
    } else {
      localStorage.removeItem(REMEMBER_KEY);
      localStorage.removeItem(EMAIL_KEY);
    }

    navigate("/", { replace: true });
  };

  return (
    <PageShell backTo="/" backLabel="Home">
      <section className="mx-auto max-w-[470px] rounded-[16px] border border-[#dcece7] bg-[#edf7f3] px-5 py-7 sm:px-8 sm:py-9">
        <div className="mb-7 flex h-11 w-11 items-center justify-center rounded-[12px] bg-teal text-white shadow-sm"><LogIn size={21} /></div>
        <h1 className="text-[29px] font-extrabold tracking-[-0.045em] text-navy">Welcome back</h1>
        <p className="mt-2 text-[14px] leading-6 text-slate">Sign in to your LocalWorker account.</p>

        <form onSubmit={handleLogin} className="mt-7 space-y-4">
          <div>
            <label htmlFor="login-email" className="mb-1.5 block text-[13px] font-bold text-navy">Email</label>
            <input id="login-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="h-12 w-full rounded-[10px] border border-line bg-white px-3.5 text-sm text-navy outline-none focus:border-teal focus:ring-2 focus:ring-teal/15" />
          </div>
          <div>
            <label htmlFor="login-password" className="mb-1.5 block text-[13px] font-bold text-navy">Password</label>
            <div className="relative">
              <input id="login-password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" className="h-12 w-full rounded-[10px] border border-line bg-white px-3.5 pr-11 text-sm text-navy outline-none focus:border-teal focus:ring-2 focus:ring-teal/15" />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-md text-slate hover:bg-slate-100"><span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
            </div>
          </div>

          <label className="flex items-center gap-2 text-[13px] font-semibold text-slate">
            <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} className="h-4 w-4 accent-teal" />
            Remember me
          </label>

          {error && <p role="alert" className="rounded-[9px] border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] font-semibold leading-5 text-red-700">{error}</p>}

          <button type="submit" disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-navy text-sm font-bold text-white shadow-[0_5px_12px_rgba(18,63,75,0.18)] transition-colors hover:bg-[#234b59] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2">
            {loading ? <><Loader2 size={17} className="animate-spin" /> Signing in...</> : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-[13px] text-slate">Don't have an account? <Link to="/register" className="font-bold text-teal hover:text-navy">Register as a worker</Link></p>
      </section>
    </PageShell>
  );
}
