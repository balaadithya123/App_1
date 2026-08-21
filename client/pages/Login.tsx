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

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setError("");
    if (!supabase) { setError("Login is not configured yet. Please check the Supabase environment variables."); return; }
    setLoading(true);
    const { data, error: loginError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (loginError) { setError(loginError.message.includes("Invalid login credentials") ? "Incorrect email or password." : loginError.message); return; }
    if (rememberMe) { localStorage.setItem(REMEMBER_KEY, "true"); localStorage.setItem(EMAIL_KEY, email.trim()); } else { localStorage.removeItem(REMEMBER_KEY); localStorage.removeItem(EMAIL_KEY); }
    const role=data.user?.user_metadata?.role;
    navigate(role === "worker" ? "/worker-dashboard" : role === "agency" ? "/agency/dashboard" : "/", { replace: true });
  };

  return <PageShell backLabel="Find Workers"><section className="mx-auto max-w-[470px] rounded-[16px] border border-line bg-card px-5 py-7 text-card-foreground sm:px-8 sm:py-9"><div className="mb-7 flex h-11 w-11 items-center justify-center rounded-[12px] bg-primary text-primary-foreground"><LogIn size={21}/></div><h1 className="text-[29px] font-extrabold text-foreground">Welcome back</h1><p className="mt-2 text-[14px] text-muted-foreground">Sign in to your LocalWorker account.</p><form onSubmit={handleLogin} className="mt-7 space-y-4"><div><label htmlFor="login-email" className="mb-1.5 block text-[13px] font-bold text-foreground">Email</label><input id="login-email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" className="h-12 w-full rounded-[10px] border border-input bg-background px-3.5 text-sm text-foreground placeholder:text-muted-foreground"/></div><div><label htmlFor="login-password" className="mb-1.5 block text-[13px] font-bold text-foreground">Password</label><div className="relative"><input id="login-password" type={showPassword?"text":"password"} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Your password" className="h-12 w-full rounded-[10px] border border-input bg-background px-3.5 pr-11 text-sm text-foreground placeholder:text-muted-foreground"/><button type="button" onClick={()=>setShowPassword(v=>!v)} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center text-muted-foreground">{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></div><label className="flex items-center gap-2 text-[13px] font-semibold text-muted-foreground"><input type="checkbox" checked={rememberMe} onChange={e=>setRememberMe(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]"/>Remember me</label>{error&&<p role="alert" className="rounded-[9px] border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] font-semibold text-red-700">{error}</p>}<button type="submit" disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-primary text-sm font-bold text-primary-foreground disabled:opacity-60">{loading?<><Loader2 size={17} className="animate-spin"/>Signing in...</>:"Sign in"}</button></form><div className="mt-7 border-t border-line pt-5 text-center"><p className="text-[13px] text-muted-foreground">Haven't created an account yet?</p><Link to="/register" className="mt-3 inline-flex rounded-full border border-primary px-6 py-2 text-sm font-bold text-primary hover:bg-primary hover:text-primary-foreground">Register</Link></div></section></PageShell>;
}
