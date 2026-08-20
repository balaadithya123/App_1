import { useState, type FormEvent } from "react";
import { Building2, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { supabase } from "@/lib/supabase";

export default function AgencyRegister() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(""); setSuccess("");
    if (!supabase) { setError("Registration is not configured yet."); return; }
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const phone = String(form.get("phone") || "").replace(/\D/g, "");
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    const location = String(form.get("location") || "").trim();
    const services = String(form.get("services") || "").trim();
    const description = String(form.get("description") || "").trim();
    if (!/^\d{10}$/.test(phone)) { setError("Phone number must be exactly 10 digits."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setBusy(true);
    try {
      const { data, error: authError } = await supabase.auth.signUp({ email, password, options: { data: { role: "agency", name, phone, location } } });
      if (authError) throw authError;
      if (!data.session) { setSuccess("Agency account created. Check your email if confirmation is required, then sign in to finish your profile."); return; }
      const response = await fetch("/api/agencies/register", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ name, phone, email, location, services, description }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message || "Unable to save agency profile.");
      navigate("/agency", { replace: true });
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Registration failed. Please try again."); }
    finally { setBusy(false); }
  };

  return <PageShell backTo="/register" backLabel="Choose registration type"><section className="rounded-[16px] border border-[#dcece7] bg-[#edf7f3] px-5 py-7 dark:border-white/10 dark:bg-black sm:px-8 sm:py-9"><div className="flex items-center gap-3"><Building2 size={32} className="text-navy dark:text-white"/><div><h1 className="text-[30px] font-extrabold leading-tight tracking-[-0.045em] text-navy dark:text-white">Register as an Agency</h1><p className="mt-2 text-sm text-slate dark:text-slate-300">Create an agency profile to represent your team and services.</p></div></div></section><form onSubmit={submit} className="mt-7 space-y-4 rounded-[13px] border border-line bg-white p-5 shadow-sm dark:border-white/10 dark:bg-black sm:p-7"><div className="grid gap-4 sm:grid-cols-2"><div><label className="mb-2 block text-[13px] font-bold text-navy dark:text-slate-100">Agency Name</label><input name="name" required placeholder="Your agency name" className="h-11 w-full rounded-[9px] border border-line bg-[#fbfcfc] px-3 text-sm outline-none dark:border-white/10 dark:bg-[#050505] dark:text-white"/></div><div><label className="mb-2 block text-[13px] font-bold text-navy dark:text-slate-100">Phone Number</label><input name="phone" required inputMode="numeric" maxLength={10} pattern="[0-9]{10}" onInput={e=>{e.currentTarget.value=e.currentTarget.value.replace(/\D/g,"").slice(0,10)}} placeholder="10-digit mobile number" className="h-11 w-full rounded-[9px] border border-line bg-[#fbfcfc] px-3 text-sm outline-none dark:border-white/10 dark:bg-[#050505] dark:text-white"/></div></div><div className="grid gap-4 sm:grid-cols-2"><div><label className="mb-2 block text-[13px] font-bold text-navy dark:text-slate-100">Email Address</label><input name="email" type="email" required placeholder="agency@example.com" className="h-11 w-full rounded-[9px] border border-line bg-[#fbfcfc] px-3 text-sm outline-none dark:border-white/10 dark:bg-[#050505] dark:text-white"/></div><div><label className="mb-2 block text-[13px] font-bold text-navy dark:text-slate-100">Password</label><input name="password" type="password" minLength={6} required placeholder="At least 6 characters" className="h-11 w-full rounded-[9px] border border-line bg-[#fbfcfc] px-3 text-sm outline-none dark:border-white/10 dark:bg-[#050505] dark:text-white"/></div></div><div><label className="mb-2 block text-[13px] font-bold text-navy dark:text-slate-100">Location</label><input name="location" required placeholder="Town or locality" className="h-11 w-full rounded-[9px] border border-line bg-[#fbfcfc] px-3 text-sm outline-none dark:border-white/10 dark:bg-[#050505] dark:text-white"/></div><div><label className="mb-2 block text-[13px] font-bold text-navy dark:text-slate-100">Services</label><input name="services" placeholder="e.g. Electrical, plumbing, cleaning" className="h-11 w-full rounded-[9px] border border-line bg-[#fbfcfc] px-3 text-sm outline-none dark:border-white/10 dark:bg-[#050505] dark:text-white"/></div><div><label className="mb-2 block text-[13px] font-bold text-navy dark:text-slate-100">About the Agency</label><textarea name="description" rows={4} placeholder="Tell people what your agency does" className="w-full resize-none rounded-[9px] border border-line bg-[#fbfcfc] px-3 py-3 text-sm outline-none dark:border-white/10 dark:bg-[#050505] dark:text-white"/></div>{error&&<p role="alert" className="text-center text-[13px] font-semibold text-red-600">{error}</p>}{success&&<p role="status" className="rounded-[9px] bg-emerald-50 px-3 py-2.5 text-center text-[13px] font-semibold text-emerald-700">{success}</p>}<button disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-navy text-sm font-bold text-white disabled:opacity-70">{busy?<><Loader2 size={17} className="animate-spin"/> Creating agency...</>:"Register Agency"}</button><p className="text-center text-sm text-slate">Already registered? <Link to="/login" className="font-bold text-navy dark:text-white">Sign in</Link></p></form></PageShell>;
}
