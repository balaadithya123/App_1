import type { RequestHandler } from "express";
import { supabase } from "../lib/supabase.js";

export const handleCompletePhoneVerification: RequestHandler = async (req, res) => {
  try {
    const authorization = req.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) return res.status(401).json({ message: "Your login session is invalid or expired." });
    const token = authorization.slice("Bearer ".length);
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return res.status(401).json({ message: "Your login session is invalid or expired." });
    const user = data.user;
    const phone = String(user.phone || "").replace(/^\+91/, "").replace(/\D/g, "").slice(-10);
    if (!/^\d{10}$/.test(phone)) return res.status(400).json({ message: "A verified phone number was not found on this account." });
    const role = String(user.user_metadata?.role || "");
    if (role === "worker") {
      const { data: worker, error: workerError } = await supabase.from("workers").update({ phone_number: phone, phone: phone, phone_verified: true }).eq("phone_number", phone).select("id,phone_verified").maybeSingle();
      if (workerError) throw workerError;
      if (!worker) return res.status(404).json({ message: "Worker profile was not found for this phone number." });
      return res.json({ phoneVerified: true });
    }
    if (role === "agency") {
      const { error: agencyError } = await supabase.from("agencies").update({ phone_number: phone, phone: phone, phone_verified: true }).eq("user_id", user.id);
      if (agencyError) throw agencyError;
      return res.json({ phoneVerified: true });
    }
    if (role === "employer") {
      const { error: employerError } = await supabase.from("employers").update({ phone_number: phone, phone: phone }).eq("id", user.id);
      if (employerError) throw employerError;
      const { error: profileError } = await supabase.from("profiles").upsert({ id: user.id, role: "employer", name: String(user.user_metadata?.name || ""), phone_number: phone, phone: phone, email: user.email || null, phone_verified: true });
      if (profileError) throw profileError;
      return res.json({ phoneVerified: true });
    }
    return res.status(400).json({ message: "Unsupported account type." });
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : "Unable to save phone verification." });
  }
};
