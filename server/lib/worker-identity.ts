import type { Request } from "express";
import { supabase } from "./supabase";

export const normalizePhone = (value: unknown) =>
  String(value || "")
    .replace(/^\+91/, "")
    .replace(/\D/g, "")
    .slice(-10);

/** Resolves the logged-in user from a Bearer token, or throws UNAUTHORIZED. */
export async function requireUser(req: Request) {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) throw new Error("UNAUTHORIZED");
  const { data, error } = await supabase.auth.getUser(
    authorization.slice("Bearer ".length),
  );
  if (error || !data.user) throw new Error("UNAUTHORIZED");
  return data.user;
}

/**
 * Resolves the worker record that belongs to the logged-in user. The link is the
 * phone number Supabase itself verified (`user.phone`), never user_metadata,
 * which users can edit. The worker must also have completed phone verification.
 */
export async function requireVerifiedWorker(req: Request) {
  const user = await requireUser(req);
  const phone = normalizePhone(user.phone);
  if (!/^\d{10}$/.test(phone)) throw new Error("PHONE_NOT_VERIFIED");
  const { data: worker, error } = await supabase
    .from("workers")
    .select("id,name,category,locality,phone_verified")
    .eq("phone_number", phone)
    .maybeSingle();
  if (error) throw error;
  if (!worker) throw new Error("WORKER_NOT_FOUND");
  if (!worker.phone_verified) throw new Error("PHONE_NOT_VERIFIED");
  return { user, worker };
}

/** True when a Postgres/PostgREST error means the table or function does not exist yet. */
export function isMissingTable(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null;
  return Boolean(
    e &&
      (e.code === "42P01" ||
        e.code === "PGRST205" ||
        /does not exist|schema cache/i.test(e.message ?? "")),
  );
}
