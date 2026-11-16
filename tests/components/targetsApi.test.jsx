import { describe, expect, test, vi } from "vitest";
import { API_BASE } from "../../src/api/config";
import {
  bulkCreateCustomTargets,
  copyLastWeekTargets,
  createCustomTarget,
  deactivateCustomTarget,
  evaluateWeeklyTargets,
  exportWeeklyResults,
  getAvailableTargetWeeks,
  getEligiblePeople,
  getServiceTargets,
  getTwelveTasksTargets,
  getWeeklyResults,
  listCustomTargets,
  parseTargetError,
  saveServiceTarget,
  saveTwelveTasksTarget,
  updateCustomTarget,
} from "../../src/features/targets/api";
import { jsonResponse } from "./helpers";

const JSON_HEADERS = { "Content-Type": "application/json" };
const TARGETS_BASE = `${API_BASE}/targets`;
const CUSTOM_TARGETS_BASE = `${TARGETS_BASE}/custom-targets`;

describe("targets API", () => {
  test("lists targets with the contract response shape and no unsupported query params", async () => {
    const data = { targets: [{ id: "target-1", person_id: "person-1", monday: 2 }] };
    const authFetch = vi.fn().mockResolvedValue(jsonResponse(data));

    await expect(listCustomTargets(authFetch)).resolves.toEqual(data);
    expect(authFetch).toHaveBeenCalledExactlyOnceWith(
      CUSTOM_TARGETS_BASE,
      { method: "GET", headers: JSON_HEADERS },
    );
  });

  test("creates a target with nested days and the contract request keys", async () => {
    const payload = {
      person_id: "person-1",
      days: { monday: 2, tuesday: 1, wednesday: 0, thursday: 0, friday: 0, saturday: 0, sunday: 0 },
      start_date: "2026-11-16",
      end_date: null,
      organization: "Active Church",
    };
    const responseRow = { id: "target-1", set_by: "user-1", created_at: "2026-11-12T10:00:00Z" };
    const authFetch = vi.fn().mockResolvedValue(jsonResponse(responseRow));

    await expect(createCustomTarget(authFetch, payload)).resolves.toEqual(responseRow);
    expect(authFetch).toHaveBeenCalledExactlyOnceWith(
      CUSTOM_TARGETS_BASE,
      { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(payload) },
    );
  });

  test("updates with PUT and sends only the update contract fields", async () => {
    const payload = {
      days: { monday: 3, tuesday: 2, wednesday: 0, thursday: 0, friday: 0, saturday: 0, sunday: 0 },
      start_date: "2026-11-16",
      end_date: "2026-11-29",
      organization: "Active Church",
    };
    const authFetch = vi.fn().mockResolvedValue(jsonResponse({ id: "target-1", ...payload }));

    await updateCustomTarget(authFetch, "target/1", payload);

    expect(authFetch).toHaveBeenCalledExactlyOnceWith(
      `${CUSTOM_TARGETS_BASE}/target%2F1`,
      { method: "PUT", headers: JSON_HEADERS, body: JSON.stringify(payload) },
    );
  });

  test("deactivates with POST and no request body", async () => {
    const authFetch = vi.fn().mockResolvedValue(jsonResponse({ id: "target-1" }));

    await deactivateCustomTarget(authFetch, "target-1");

    expect(authFetch).toHaveBeenCalledExactlyOnceWith(
      `${CUSTOM_TARGETS_BASE}/target-1/deactivate`,
      { method: "POST", headers: JSON_HEADERS },
    );
  });

  test("bulk creates with nested per-target days and reads results plus summary", async () => {
    const payload = {
      targets: [{
        person_id: "person-1",
        days: { monday: 2, tuesday: 1, wednesday: 0, thursday: 0, friday: 0, saturday: 0, sunday: 0 },
        start_date: "2026-11-16",
        end_date: null,
        organization: "Active Church",
      }],
    };
    const response = {
      results: [
        { person_id: "person-1", status: "ok", target: { id: "target-1" } },
        { person_id: "person-2", status: "error", status_code: 409, error: "Date range overlaps" },
      ],
      summary: { total: 2, ok: 1, errors: 1 },
    };
    const authFetch = vi.fn().mockResolvedValue(jsonResponse(response));

    await expect(bulkCreateCustomTargets(authFetch, payload)).resolves.toEqual(response);
    expect(authFetch).toHaveBeenCalledExactlyOnceWith(
      `${CUSTOM_TARGETS_BASE}/bulk`,
      { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(payload) },
    );
  });

  test("evaluates a week with the exact body and response shape", async () => {
    const payload = { week_start: "2026-11-02", organization: "Active Church" };
    const response = {
      week: { start: "2026-11-02", end: "2026-11-08", provisional: false, phase: "frozen" },
      summary: {
        total: 1, met: 1, not_met: 0, in_progress: 0,
        excluded_no_completedat: 3, unmapped_completed_tasks: 2,
      },
      results: [{
        person_id: "person-1", person_name: "Amy Able", week_start: "2026-11-02",
        weekly_target: 10, weekly_completed: 10, excluded_no_completedat: 0,
        status: "met", provisional: false,
      }],
      evaluated: true,
      provisional: false,
    };
    const authFetch = vi.fn().mockResolvedValue(jsonResponse(response));

    await expect(evaluateWeeklyTargets(authFetch, payload)).resolves.toEqual(response);
    expect(authFetch).toHaveBeenCalledExactlyOnceWith(
      `${CUSTOM_TARGETS_BASE}/evaluate`,
      { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(payload) },
    );
  });

  test("gets weekly results with only the documented query parameters and response shape", async () => {
    const params = {
      week: "2026-11-02",
      status: "not_met",
      leader: "Leader One",
      role: "leader",
      search: "Amy",
      sort: "worst",
      limit: 25,
      offset: 50,
    };
    const response = {
      week: { start: "2026-11-02", end: "2026-11-08", provisional: true, phase: "provisional" },
      summary: {
        total: 1, met: 0, not_met: 1, in_progress: 0,
        excluded_no_completedat: 2, unmapped_completed_tasks: 1,
      },
      results: [{
        person_id: "person-1", person_name: "Amy Able", week_start: "2026-11-02",
        weekly_target: 10, weekly_completed: 3, excluded_no_completedat: 0,
        status: "not_met", provisional: true,
      }],
    };
    const authFetch = vi.fn().mockResolvedValue(jsonResponse(response));

    await expect(getWeeklyResults(authFetch, params)).resolves.toEqual(response);
    expect(authFetch).toHaveBeenCalledExactlyOnceWith(
      `${CUSTOM_TARGETS_BASE}/weekly-results?week=2026-11-02&status=not_met&leader=Leader+One&role=leader&search=Amy&sort=worst&limit=25&offset=50`,
      { method: "GET", headers: JSON_HEADERS },
    );
  });

  test("exports weekly results from the contract route with exact filters and format", async () => {
    const blob = new Blob(["csv"], { type: "text/csv" });
    const authFetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => blob,
      headers: { get: () => "attachment; filename*=UTF-8''weekly%20targets.csv" },
    });

    const result = await exportWeeklyResults(authFetch, {
      week: "2026-11-02",
      status: "not_met",
      format: "csv",
    });

    expect(authFetch).toHaveBeenCalledExactlyOnceWith(
      `${CUSTOM_TARGETS_BASE}/weekly-results/export?week=2026-11-02&status=not_met&format=csv`,
      { method: "GET" },
    );
    expect(result).toEqual({ blob, filename: "weekly targets.csv" });
  });

  test("gets eligible people with documented paging/search and response shape", async () => {
    const params = { search: "Amy", limit: 25, offset: 50 };
    const response = {
      people: [{ person_id: "person-1", name: "Amy Able", email: "amy@example.com", has_active_target: true }],
      total: 75,
      limit: 25,
      offset: 50,
    };
    const authFetch = vi.fn().mockResolvedValue(jsonResponse(response));

    await expect(getEligiblePeople(authFetch, params)).resolves.toEqual(response);
    expect(authFetch).toHaveBeenCalledExactlyOnceWith(
      `${CUSTOM_TARGETS_BASE}/eligible-people?search=Amy&limit=25&offset=50`,
      { method: "GET", headers: JSON_HEADERS },
    );
  });

  test("preserves readable status errors and server eligibility messages", async () => {
    const response = {
      status: 400,
      json: async () => ({
        detail: "This person has no user account, so their tasks can't be tracked",
      }),
    };

    await expect(createCustomTarget(vi.fn().mockResolvedValue(response), {}))
      .rejects.toMatchObject({
        status: 400,
        message: "This person has no user account, so their tasks can't be tracked",
      });

    const error = await parseTargetError(jsonResponse({}, 409));
    expect(error).toMatchObject({
      status: 409,
      message: "This target conflicts with an existing active date range.",
    });
  });

  test("uses the existing legacy target routes and exact request options", async () => {
    const authFetch = vi.fn().mockResolvedValue(jsonResponse({ targets: [] }));
    const week = "2026-W45";
    const organization = "Active Church";

    await getServiceTargets(authFetch, week, organization);
    expect(authFetch).toHaveBeenLastCalledWith(
      `${TARGETS_BASE}/service?week=2026-W45&org=Active%20Church`,
      { method: "GET", headers: JSON_HEADERS },
    );

    await getTwelveTasksTargets(authFetch, week, organization);
    expect(authFetch).toHaveBeenLastCalledWith(
      `${TARGETS_BASE}/twelve-tasks?week=2026-W45&org=Active%20Church`,
      { method: "GET", headers: JSON_HEADERS },
    );

    await getAvailableTargetWeeks(authFetch, organization);
    expect(authFetch).toHaveBeenLastCalledWith(
      `${TARGETS_BASE}/available-weeks?organization=Active%20Church`,
      { method: "GET", headers: JSON_HEADERS },
    );

    await copyLastWeekTargets(authFetch);
    expect(authFetch).toHaveBeenLastCalledWith(
      `${TARGETS_BASE}/copy-last-week`,
      { method: "POST", headers: JSON_HEADERS, body: "{}" },
    );

    const servicePayload = { target_count: 2 };
    await saveServiceTarget(authFetch, servicePayload);
    expect(authFetch).toHaveBeenLastCalledWith(
      `${TARGETS_BASE}/service`,
      { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(servicePayload) },
    );

    const twelveTasksPayload = { target: 12 };
    await saveTwelveTasksTarget(authFetch, twelveTasksPayload);
    expect(authFetch).toHaveBeenLastCalledWith(
      `${TARGETS_BASE}/twelve-tasks`,
      { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(twelveTasksPayload) },
    );
  });
});
