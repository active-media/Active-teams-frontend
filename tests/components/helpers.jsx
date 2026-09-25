import React from "react";
import { vi } from "vitest";
import { render } from "@testing-library/react";
import { AuthContext } from "../../src/contexts/AuthContext";
import { TaskUpdateContext } from "../../src/contexts/TaskUpdateContext";
import { saTodayKey } from "../../src/utils/serviceCheckinToggle";

export const TODAY = saTodayKey();

// ── response / fetch helpers ─────────────────────────────────────────────────

export const jsonResponse = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
});

export const textResponse = (text, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => ({ detail: text }),
});

/**
 * Builds a vi.fn() authFetch that answers routes like:
 *   { method: "GET", url: "/events/eventsdata", data: { events: [...] } }
 * url can be a string (substring match) or a matcher fn.
 */
export const makeAuthFetch = (routes = []) =>
  vi.fn(async (url, options = {}) => {
    const method = (options?.method || "GET").toUpperCase();
    const route = routes.find(
      (r) =>
        r.method === method &&
        (typeof r.url === "function" ? r.url(url) : String(url).includes(r.url)),
    );
    if (!route) return jsonResponse({ detail: `Unhandled: ${method} ${url}` }, 404);
    if (route.handler) return route.handler(url, options);
    return jsonResponse(route.data ?? {});
  });

// ── fixtures ─────────────────────────────────────────────────────────────────

export const makeEvent = (overrides = {}) => ({
  id: "evt_1",
  eventName: "Sunday Service",
  date: TODAY,
  rawDate: TODAY,
  status: "open",
  isGlobal: true,
  eventType: "Service",
  attendees: [],
  new_people: [],
  consolidations: [],
  attendance: 0,
  newPeople: 0,
  consolidated: 0,
  ...overrides,
});

export const makePerson = (overrides = {}) => ({
  _id: "p1",
  id: "p1",
  name: "Amy",
  surname: "Ndlovu",
  email: "amy@example.com",
  phone: "0821111111",
  number: "0821111111",
  leader1: "L1",
  leader12: "L12",
  leader144: "L144",
  gender: "F",
  stage: "Win",
  ...overrides,
});

export const makeRealtime = (overrides = {}) => ({
  success: true,
  present_attendees: [],
  new_people: [],
  new_people_count: 0,
  consolidations: [],
  consolidation_count: 0,
  present_count: 0,
  attendanceData: [],
  ...overrides,
});

/** Default fixture routes: eventsdata, people cache, and realtime data. */
export const defaultRoutes = ({
  events = [makeEvent()],
  people = [makePerson()],
  realtime = makeRealtime(),
} = {}) => [
  {
    method: "GET",
    url: "/events/eventsdata",
    data: { events },
  },
  {
    method: "GET",
    url: "/cache/people",
    data: { success: true, cached_data: people },
  },
  {
    method: "GET",
    url: "/service-checkin/real-time-data",
    handler: () => jsonResponse(realtime, 200),
  },
];

// ── render helpers ───────────────────────────────────────────────────────────

export const baseUser = { _id: "u1", email: "leader@x.com", fullName: "Test Leader" };

const defaultTaskUpdate = {
  notifyTaskUpdate: vi.fn(),
  triggerStatsRefresh: vi.fn(),
};

const defaultAuth = {
  token: "test-token",
  user: baseUser,
  logout: vi.fn(),
  handleLogout: vi.fn(),
  login: vi.fn(async () => ({})),
  signup: vi.fn(async () => ({})),
};

/**
 * Renders a page inside the real Auth/TaskUpdate providers with a controllable
 * authFetch so any component using useContext can exercise its actions.
 */
export const renderWithProviders = (ui, { authFetch, auth, taskUpdate } = {}) => {
  const authValue = { ...defaultAuth, ...auth, authFetch };
  const taskValue = { ...defaultTaskUpdate, ...taskUpdate };
  return render(
    <AuthContext.Provider value={authValue}>
      <TaskUpdateContext.Provider value={taskValue}>{ui}</TaskUpdateContext.Provider>
    </AuthContext.Provider>,
  );
};

export const waitForLoad = async () => {
  // Give the mount effects a chance to settle (fetch happens async).
  await new Promise((r) => setTimeout(r, 0));
};