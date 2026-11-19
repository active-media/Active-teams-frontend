import { useContext } from "react";
import { act, renderHook } from "@testing-library/react";
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";

import {
  migrateLegacyAccount,
  prepareLegacyAccountForReset,
} from "../../src/services/legacyMigration.js";
import { AuthContext, AuthProvider } from "../../src/contexts/AuthContext.jsx";

const supabaseMock = vi.hoisted(() => ({
  auth: {
    signInWithPassword: vi.fn(),
    setSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    getSession: vi.fn(),
    signOut: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
  },
  from: vi.fn(),
}));

vi.mock("../../supabaseClient", () => ({ default: supabaseMock }));

const originalFetch = globalThis.fetch;

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("migrateLegacyAccount", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn(async () => jsonResponse(200, {}));
  });

  test("posts the credentials and returns the session on success", async () => {
    globalThis.fetch = vi.fn(async () =>
      jsonResponse(200, {
        access_token: "access-1",
        refresh_token: "refresh-1",
        migrated: true,
        profile: { _id: "legacy-id", email: "legacy@example.com", role: "leader" },
      })
    );

    const result = await migrateLegacyAccount("legacy@example.com", "secret123");

    expect(result.ok).toBe(true);
    expect(result.session.access_token).toBe("access-1");
    expect(result.session.refresh_token).toBe("refresh-1");
    expect(result.profile).toEqual({
      _id: "legacy-id",
      email: "legacy@example.com",
      role: "leader",
    });

    const [url, options] = globalThis.fetch.mock.calls[0];
    expect(url).toMatch(/\/auth\/migrate-legacy$/);
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({
      email: "legacy@example.com",
      password: "secret123",
    });
  });

  test("reports the backend message when the credentials are wrong", async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse(401, { detail: "Invalid credentials" }));

    const result = await migrateLegacyAccount("legacy@example.com", "wrong");

    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
    expect(result.message).toBe("Invalid credentials");
  });

  test("marks the endpoint as unsupported when the backend does not have it", async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse(404, { detail: "Not Found" }));

    const result = await migrateLegacyAccount("legacy@example.com", "secret123");

    expect(result.ok).toBe(false);
    expect(result.unsupported).toBe(true);
  });

  test("keeps the guidance when the account exists with a different password", async () => {
    globalThis.fetch = vi.fn(async () =>
      jsonResponse(409, {
        detail:
          "This account already exists in Supabase with a different password. Use “Forgot password” to set a new one.",
      })
    );

    const result = await migrateLegacyAccount("legacy@example.com", "secret123");

    expect(result.ok).toBe(false);
    expect(result.status).toBe(409);
    expect(result.message).toMatch(/Forgot password/);
  });

  test("does not throw when the network fails", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("network down");
    });

    const result = await migrateLegacyAccount("legacy@example.com", "secret123");

    expect(result.ok).toBe(false);
    expect(result.unsupported).toBe(true);
  });
});

describe("prepareLegacyAccountForReset", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn(async () => jsonResponse(200, {}));
  });

  test("asks the backend to prepare the account", async () => {
    await prepareLegacyAccountForReset("legacy@example.com");

    const [url, options] = globalThis.fetch.mock.calls[0];
    expect(url).toMatch(/\/auth\/legacy-account-exists$/);
    expect(JSON.parse(options.body)).toEqual({ email: "legacy@example.com" });
  });

  test("never throws when the backend is unreachable", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("network down");
    });

    await expect(prepareLegacyAccountForReset("legacy@example.com")).resolves.toBeUndefined();
  });
});

describe("AuthContext legacy login", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    supabaseMock.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: null } });
    supabaseMock.auth.signOut.mockResolvedValue({ error: null });
    supabaseMock.from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          limit: async () => ({ data: [], error: null }),
        }),
      }),
    }));
  });

  test("backfills the profile when a Supabase session already exists", async () => {
    supabaseMock.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: "auth-id" }, session: { access_token: "supabase-access" } },
      error: null,
    });
    supabaseMock.auth.setSession.mockResolvedValue({
      data: { user: { id: "auth-id" }, session: { access_token: "migrated-access" } },
      error: null,
    });
    globalThis.fetch = vi.fn(async () =>
      jsonResponse(200, {
        access_token: "migrated-access",
        refresh_token: "migrated-refresh",
        profile: {
          _id: "legacy-id",
          email: "legacy@example.com",
          role: "leader",
          org_id: "active-teams",
        },
      })
    );

    const { result } = renderHook(() => useContext(AuthContext), { wrapper: AuthProvider });
    await act(async () => {
      await result.current.login("legacy@example.com", "legacy-secret");
    });

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(supabaseMock.auth.setSession).toHaveBeenCalledWith({
      access_token: "migrated-access",
      refresh_token: "migrated-refresh",
    });
    expect(result.current.user.role).toBe("leader");
    expect(result.current.user._id).toBe("legacy-id");
  });
});
