import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock("./supabase", () => ({ supabase: { auth: { getUser } } }));

import { requireAdmin, sendAuthError } from "./admin-auth";

const req = (authorization?: string) => ({ headers: { authorization } }) as any;

describe("requireAdmin", () => {
  beforeEach(() => getUser.mockReset());

  it("rejects requests without a bearer token", async () => {
    await expect(requireAdmin(req())).rejects.toThrow("UNAUTHORIZED");
    expect(getUser).not.toHaveBeenCalled();
  });

  it("rejects invalid tokens", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: new Error("bad") });
    await expect(requireAdmin(req("Bearer x"))).rejects.toThrow("UNAUTHORIZED");
  });

  it("does not trust user-editable user_metadata.role", async () => {
    getUser.mockResolvedValue({
      data: { user: { email: "a@b.com", user_metadata: { role: "admin" }, app_metadata: {} } },
      error: null,
    });
    await expect(requireAdmin(req("Bearer x"))).rejects.toThrow("FORBIDDEN");
  });

  it("allows app_metadata.is_admin", async () => {
    getUser.mockResolvedValue({
      data: { user: { email: "a@b.com", app_metadata: { is_admin: true } } },
      error: null,
    });
    await expect(requireAdmin(req("Bearer x"))).resolves.toBeTruthy();
  });

  it("allows the owner only when the email is confirmed", async () => {
    const owner = { email: "pgbalaadithya@gmail.com", app_metadata: {} };
    getUser.mockResolvedValue({ data: { user: owner }, error: null });
    await expect(requireAdmin(req("Bearer x"))).rejects.toThrow("FORBIDDEN");
    getUser.mockResolvedValue({
      data: { user: { ...owner, email_confirmed_at: "2026-01-01T00:00:00Z" } },
      error: null,
    });
    await expect(requireAdmin(req("Bearer x"))).resolves.toBeTruthy();
  });
});

describe("sendAuthError", () => {
  const makeRes = () => {
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    return { res: { status } as any, status, json };
  };

  it("maps auth errors to 401/403 and ignores others", () => {
    const a = makeRes();
    expect(sendAuthError(new Error("UNAUTHORIZED"), a.res)).toBe(true);
    expect(a.status).toHaveBeenCalledWith(401);
    const b = makeRes();
    expect(sendAuthError(new Error("FORBIDDEN"), b.res)).toBe(true);
    expect(b.status).toHaveBeenCalledWith(403);
    const c = makeRes();
    expect(sendAuthError(new Error("boom"), c.res)).toBe(false);
    expect(c.status).not.toHaveBeenCalled();
  });
});
