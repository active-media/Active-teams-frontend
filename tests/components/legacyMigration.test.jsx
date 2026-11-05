import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";

import {
  migrateLegacyAccount,
  prepareLegacyAccountForReset,
} from "../../src/services/legacyMigration.js";

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
      })
    );

    const result = await migrateLegacyAccount("legacy@example.com", "secret123");

    expect(result.ok).toBe(true);
    expect(result.session.access_token).toBe("access-1");
    expect(result.session.refresh_token).toBe("refresh-1");

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
