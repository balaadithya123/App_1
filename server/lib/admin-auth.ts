import type { Request } from "express";
import { supabase } from "./supabase";

const OWNER_EMAIL = "pgbalaadithya@gmail.com";

/**
 * Resolves the caller from a Bearer token and returns the user only when they
 * are an admin. Admin is decided from values a user cannot edit themselves:
 * `app_metadata.is_admin` (set from the Supabase dashboard / service role) or
 * the confirmed owner email. `user_metadata` is deliberately NOT trusted, since
 * any signed-in user can change it with `auth.updateUser`.
 */
export async function requireAdmin(req: Request) {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) throw new Error("UNAUTHORIZED");
  const { data, error } = await supabase.auth.getUser(
    authorization.slice("Bearer ".length),
  );
  if (error || !data.user) throw new Error("UNAUTHORIZED");
  const user = data.user;
  const isOwner =
    user.email?.toLowerCase() === OWNER_EMAIL && Boolean(user.email_confirmed_at);
  if (user.app_metadata?.is_admin !== true && !isOwner) {
    throw new Error("FORBIDDEN");
  }
  return user;
}

/** Maps requireAdmin failures to HTTP responses. Returns true when it handled one. */
export function sendAuthError(
  err: unknown,
  res: { status: (code: number) => { json: (body: unknown) => unknown } },
): boolean {
  const message = err instanceof Error ? err.message : "";
  if (message === "UNAUTHORIZED") {
    res.status(401).json({ message: "Please sign in." });
    return true;
  }
  if (message === "FORBIDDEN") {
    res.status(403).json({ message: "Admin access required." });
    return true;
  }
  return false;
}
