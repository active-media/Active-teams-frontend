import React from "react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

import StaffInternStatistics from "../../src/components/StaffInternStatistics";
import { makeAuthFetch, jsonResponse } from "./helpers";

// Chart.js needs a real canvas; stub the React wrapper for jsdom.
vi.mock("react-chartjs-2", () => ({
  Line: () => <div data-testid="line-chart" />,
}));
vi.mock("chart.js", () => ({
  Chart: { register: vi.fn() },
  CategoryScale: {},
  LinearScale: {},
  LineElement: {},
  PointElement: {},
  Title: {},
  Tooltip: {},
  Legend: {},
}));
vi.mock("xlsx", () => ({
  utils: {
    book_new: vi.fn(() => ({})),
    json_to_sheet: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

import * as XLSX from "xlsx";

const ADMIN = { _id: "u1", role: "admin", email: "admin@example.com" };
const LEADER12 = { _id: "u2", role: "leaderAt12", email: "l12@example.com" };
const PLAIN = { _id: "u3", role: "user", email: "user@example.com" };

const people = [
  { _id: "p1", Name: "Alice", Surname: "A", Email: "a@x.com" },
  { _id: "p2", Name: "Bob", Surname: "B", Email: "b@x.com" },
];

const targetsResponse = (targets = []) => ({
  week_identifier: "2026-W41",
  services: {
    friday: { label: "Friday Service", date: "2026-10-09", passed: false, event: null },
    sunday: { label: "Sunday Service", date: "2026-10-11", passed: false, event: null },
  },
  targets,
});

const baseRoutes = () => [
  { method: "GET", url: "/people", data: { results: people } },
  { method: "GET", url: "/staff-intern/targets", data: targetsResponse() },
];

const renderSection = (authFetch, currentUser) =>
  render(
    <StaffInternStatistics
      authFetch={authFetch}
      currentUser={currentUser}
      backendUrl="http://backend"
    />,
  );

describe("StaffInternStatistics", () => {
  let routes;
  beforeEach(() => {
    routes = baseRoutes();
    vi.clearAllMocks();
  });

  test("renders nothing for users without admin/leader@12 role", () => {
    const authFetch = makeAuthFetch(routes);
    const { container } = renderSection(authFetch, PLAIN);
    expect(container).toBeEmptyDOMElement();
    expect(authFetch).not.toHaveBeenCalled();
  });

  test("shows empty state when no people exist", async () => {
    const authFetch = makeAuthFetch([
      { method: "GET", url: "/people", data: { results: [] } },
      { method: "GET", url: "/staff-intern/targets", data: targetsResponse() },
    ]);
    renderSection(authFetch, ADMIN);
    expect(await screen.findByTestId("staff-intern-empty")).toHaveTextContent("No people found.");
  });

  test("pages through the people endpoint when total_pages > 1", async () => {
    const authFetch = makeAuthFetch([
      { method: "GET", url: "/people?page=1", data: { results: [people[0]], total: 2, total_pages: 2 } },
      { method: "GET", url: "/people?page=2", data: { results: [people[1]], total: 2, total_pages: 2 } },
      { method: "GET", url: "/staff-intern/targets", data: targetsResponse() },
    ]);
    renderSection(authFetch, ADMIN);
    await waitFor(() => expect(screen.getByText(/Alice/)).toBeInTheDocument());
    expect(screen.getByText(/Bob/)).toBeInTheDocument();
  });

  test("leader@12 can access the section and sees the week", async () => {
    const authFetch = makeAuthFetch(routes);
    renderSection(authFetch, LEADER12);
    expect(await screen.findByText("Staff & Intern Statistics")).toBeInTheDocument();
    expect(await screen.findByTestId("staff-intern-week")).toHaveTextContent("2026-W41");
  });

  test("lists unmarked people and separates them once marked", async () => {
    const authFetch = makeAuthFetch([
      ...routes,
      { method: "PUT", url: "/people/p1/staff-intern", data: { message: "ok" } },
    ]);
    renderSection(authFetch, ADMIN);

    expect(await screen.findByTestId("unmarked-p1")).toBeInTheDocument();
    expect(screen.getByTestId("unmarked-p2")).toBeInTheDocument();

    fireEvent.click(screen.getAllByText("Mark as Staff")[0]);

    await waitFor(() => {
      expect(screen.queryByTestId("unmarked-p1")).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("marked-p1")).toBeInTheDocument();
    expect(screen.getByTestId("unmarked-p2")).toBeInTheDocument();
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });

  test("persists classification via PUT with staffStatus", async () => {
    const authFetch = makeAuthFetch([
      ...routes,
      { method: "PUT", url: "/people/p1/staff-intern", data: { message: "ok" } },
    ]);
    renderSection(authFetch, ADMIN);
    await screen.findByTestId("unmarked-p1");

    fireEvent.click(screen.getAllByText("Mark as Intern")[0]);

    await waitFor(() => {
      const put = authFetch.mock.calls.find((c) => (c[1]?.method || "GET") === "PUT");
      expect(put).toBeTruthy();
      const body = JSON.parse(put[1].body);
      expect(body).toEqual({ staffStatus: "intern" });
    });
  });

  test("saves a weekly target via PUT to /staff-intern/targets", async () => {
    const authFetch = makeAuthFetch([
      ...routes,
      { method: "PUT", url: "/people/p1/staff-intern", data: { message: "ok" } },
      {
        method: "PUT",
        url: "/staff-intern/targets/p1",
        handler: (url, options) => {
          const body = JSON.parse(options.body);
          return jsonResponse({ success: true, target: { ...body, id: 1, met: false, closed: false } });
        },
      },
    ]);
    renderSection(authFetch, ADMIN);
    await screen.findByTestId("unmarked-p1");
    fireEvent.click(screen.getAllByText("Mark as Staff")[0]);
    await screen.findByTestId("marked-p1");

    fireEvent.change(screen.getByTestId("target-p1-friday").querySelector("input"), { target: { value: "7" } });
    fireEvent.change(screen.getByTestId("actual-p1-friday").querySelector("input"), { target: { value: "6" } });
    fireEvent.click(screen.getAllByText("Save")[0]);

    await waitFor(() => {
      const put = authFetch.mock.calls.find(
        (c) => (c[1]?.method) === "PUT" && String(c[0]).includes("/staff-intern/targets/p1"),
      );
      expect(put).toBeTruthy();
      const body = JSON.parse(put[1].body);
      expect(body.service).toBe("friday");
      expect(body.target).toBe(7);
      expect(body.actual).toBe(6);
      expect(body.week_identifier).toBe("2026-W41");
    });
  });

  test("shows met/not-met and reopen for closed targets", async () => {
    const p1 = { ...people[0], staffStatus: "staff" };
    const authFetch = makeAuthFetch([
      { method: "GET", url: "/people", data: { results: [p1, people[1]] } },
      {
        method: "GET",
        url: "/staff-intern/targets",
        data: targetsResponse([
          { id: 1, person_id: "p1", service: "friday", target: 5, actual: 6, met: true, closed: true },
          { id: 2, person_id: "p1", service: "sunday", target: 5, actual: 2, met: false, closed: true },
        ]),
      },
    ]);
    renderSection(authFetch, ADMIN);

    expect(await screen.findByTestId("met-p1-friday")).toHaveTextContent("Met");
    expect(screen.getByTestId("met-p1-sunday")).toHaveTextContent("Not met");
    // Closed targets are locked and offer Reopen.
    expect(screen.getByTestId("target-p1-friday").querySelector("input")).toBeDisabled();
    expect(screen.getByTestId("reopen-p1-friday")).toBeInTheDocument();
  });

  test("downloads the chart/targets as XLSX", async () => {
    const p1 = { ...people[0], staffStatus: "staff" };
    const authFetch = makeAuthFetch([
      { method: "GET", url: "/people", data: { results: [p1] } },
      {
        method: "GET",
        url: "/staff-intern/targets",
        data: targetsResponse([
          { id: 1, person_id: "p1", service: "friday", target: 5, actual: 3, met: false, closed: false },
        ]),
      },
    ]);
    renderSection(authFetch, ADMIN);
    await screen.findByTestId("marked-p1");

    fireEvent.click(screen.getByTestId("download-xlsx"));

    await waitFor(() => {
      expect(XLSX.writeFile).toHaveBeenCalledTimes(1);
      expect(XLSX.utils.book_append_sheet).toHaveBeenCalledTimes(2);
    });
  });

  test("filters past targets by service and downloads the applied history as XLSX", async () => {
    const p1 = { ...people[0], staffStatus: "staff" };
    const authFetch = makeAuthFetch([
      { method: "GET", url: "/people", data: { results: [p1] } },
      {
        method: "GET",
        url: (url) => new URL(url).pathname.endsWith("/staff-intern/targets") &&
          !new URL(url).searchParams.has("start_date"),
        data: targetsResponse(),
      },
      {
        method: "GET",
        url: (url) => url.includes("start_date="),
        data: {
          start_date: "2026-10-09",
          end_date: "2026-10-11",
          count: 1,
          services: [{
            service: "friday",
            label: "Friday Service",
            date: "2026-10-09",
            has_targets: true,
            targets_recorded: 1,
            target: 5,
            actual: 4,
          }],
          targets: [{
            id: 1,
            person_id: "p1",
            service: "friday",
            week_identifier: "2026-W41",
            date: "2026-10-09",
            target: 5,
            actual: 4,
            closed: true,
            met: false,
          }],
        },
      },
    ]);
    renderSection(authFetch, ADMIN);
    await screen.findByTestId("marked-p1");

    fireEvent.change(screen.getByTestId("history-start"), { target: { value: "2026-10-09" } });
    fireEvent.change(screen.getByTestId("history-end"), { target: { value: "2026-10-11" } });
    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Service" }));
    fireEvent.click(await screen.findByRole("option", { name: "Friday Service" }));
    fireEvent.click(screen.getByTestId("history-apply"));

    expect(await screen.findByTestId("history-row-p1-friday-2026-W41")).toBeInTheDocument();
    expect(screen.getByTestId("history-service-friday-2026-10-09")).toHaveTextContent("Targets recorded");
    const historyRequest = authFetch.mock.calls.find(([url]) => String(url).includes("start_date="));
    const requestUrl = new URL(historyRequest[0]);
    expect(requestUrl.searchParams.get("service")).toBe("friday");
    expect(requestUrl.searchParams.get("start_date")).toBe("2026-10-09");
    expect(requestUrl.searchParams.get("end_date")).toBe("2026-10-11");

    fireEvent.click(screen.getByTestId("download-xlsx"));
    await waitFor(() => expect(XLSX.writeFile).toHaveBeenCalledWith(
      expect.anything(),
      "staff-intern-friday-2026-10-09_2026-10-11.xlsx",
    ));
    expect(XLSX.utils.json_to_sheet.mock.calls[1][0]).toEqual(expect.arrayContaining([
      expect.objectContaining({
        Service: "Friday Service",
        Target: 5,
        Actual: 4,
        Status: "Not met",
      }),
    ]));
  });

  test("lists past services even when no targets were recorded", async () => {
    const authFetch = makeAuthFetch([
      { method: "GET", url: "/people", data: { results: people } },
      {
        method: "GET",
        url: (url) => new URL(url).pathname.endsWith("/staff-intern/targets") &&
          !new URL(url).searchParams.has("start_date"),
        data: targetsResponse(),
      },
      {
        method: "GET",
        url: (url) => url.includes("start_date="),
        data: {
          start_date: "2026-10-03",
          end_date: "2026-10-25",
          count: 0,
          service_count: 2,
          message: "No targets were recorded between 2026-10-03 and 2026-10-25; the services are still listed.",
          services: [
            { service: "friday", label: "Friday Service", date: "2026-10-09", has_targets: false, targets_recorded: 0, target: 0, actual: 0 },
            { service: "sunday", label: "Sunday Service", date: "2026-10-11", has_targets: false, targets_recorded: 0, target: 0, actual: 0 },
          ],
          targets: [],
        },
      },
    ]);
    renderSection(authFetch, ADMIN);
    await screen.findByText(/No people found|People \(/);

    fireEvent.change(screen.getByTestId("history-start"), { target: { value: "2026-10-03" } });
    fireEvent.change(screen.getByTestId("history-end"), { target: { value: "2026-10-25" } });
    fireEvent.click(screen.getByTestId("history-apply"));

    expect(await screen.findByTestId("history-service-friday-2026-10-09")).toHaveTextContent("No targets recorded");
    expect(screen.getByTestId("history-service-sunday-2026-10-11")).toHaveTextContent("No targets recorded");
    expect(screen.getByTestId("history-empty")).toHaveTextContent("No targets were recorded between 2026-10-03 and 2026-10-25");
  });
});
