import React, { useContext } from "react";
import { describe, test, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import { AuthContext, AuthProvider } from "../../src/contexts/AuthContext";
import { API_BASE } from "../../src/api/config";

const EMAIL = import.meta.env.VITE_E2E_EMAIL || import.meta.env.E2E_EMAIL || "";
const PASSWORD = import.meta.env.VITE_E2E_PASSWORD || import.meta.env.E2E_PASSWORD || "";
const RUN_E2E = Boolean(EMAIL);

function Harness({ onReady }) {
  const ctx = useContext(AuthContext);
  onReady(ctx);
  return <div data-testid="state">{ctx?.isAuthenticated ? "authed" : "anon"}</div>;
}

describe.skipIf(!RUN_E2E)("E2E: frontend Supabase login against the merged backend", () => {
  test("login works and the session token authorises backend calls", async () => {
    let ctx = null;
    render(
      <AuthProvider>
        <Harness onReady={(c) => { ctx = c; }} />
      </AuthProvider>
    );

    await waitFor(() => expect(ctx).toBeTruthy());

    const result = await ctx.login(EMAIL, PASSWORD);
    expect(result.user.email).toBe(EMAIL);
    await waitFor(() =>
      expect(screen.getAllByTestId("state").some((n) => n.textContent === "authed")).toBe(true)
    );

    // Sam's own endpoint (Mongo data) behind the new Supabase auth
    const peopleRes = await ctx.authFetch(`${API_BASE}/people`);
    expect(peopleRes.status).toBe(200);
    const people = await peopleRes.json();
    expect(Array.isArray(people.results)).toBe(true);
    expect(people.total).toBeGreaterThan(0);

    // Endpoint newly added by the supabase-test branch
    const catalogRes = await ctx.authFetch(`${API_BASE}/reporting/catalog`);
    expect(catalogRes.status).toBe(200);
    const catalog = await catalogRes.json();
    expect(catalog.length).toBeGreaterThan(0);

    const statsRes = await ctx.authFetch(`${API_BASE}/stats/twelve-tasks?period=thisWeek`);
    expect(statsRes.status).toBe(200);

    const schedulesRes = await ctx.authFetch(`${API_BASE}/report-schedules`);
    expect(schedulesRes.status).toBe(200);

    // Endpoint the merged frontend calls from the attendance modal
    const paginatedRes = await ctx.authFetch(`${API_BASE}/people/paginated?page=1&perPage=100`);
    expect(paginatedRes.status).toBe(200);
    const paginated = await paginatedRes.json();
    expect(paginated.results.length).toBeGreaterThan(0);
    expect(paginated.total).toBeGreaterThan(0);
    expect(typeof paginated.hasMore).toBe("boolean");

    // Unauthenticated call must be rejected by the backend
    const noToken = await fetch(`${API_BASE}/people`);
    expect(noToken.status).toBe(401);
  }, 60000);
});
