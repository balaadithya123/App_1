import { supabase } from "@/lib/supabase";

export class PassbookError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

/** Calls a passbook/rate-guide endpoint and turns failures into PassbookError. */
export async function passbookApi<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.auth) Object.assign(headers, await authHeaders());
  let res: Response;
  try {
    res = await fetch(path, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new PassbookError("No connection. Check your network and try again.", "network", 0);
  }
  let payload: any = null;
  try {
    payload = await res.json();
  } catch {
    // Non-JSON error bodies (e.g. a gateway page) fall through to the generic message.
  }
  if (!res.ok) {
    throw new PassbookError(
      payload?.message || "Something went wrong. Please try again.",
      payload?.code || "error",
      res.status,
    );
  }
  return payload as T;
}

export const TRADE_CATEGORIES = [
  "Electrician",
  "Plumber",
  "Carpenter",
  "Painter",
  "Cleaner",
] as const;

export function formatRupees(amount: number): string {
  return `₹${new Intl.NumberFormat("en-IN").format(amount)}`;
}

export function todayIso(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
