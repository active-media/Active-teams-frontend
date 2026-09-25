import React from "react";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import {
  screen,
  within,
  waitFor,
  fireEvent,
  cleanup,
} from "@testing-library/react";
import { toast } from "react-toastify";

import Events from "../../src/Pages/Events";
import {
  makeAuthFetch,
  jsonResponse,
  renderWithProviders,
} from "./helpers";

// ── Module mocks for events-only dependencies ────────────────────────────────

vi.mock("../../src/contexts/OrgConfigContext", async () => {
  const React = await import("react");
  return {
    default: ({ children }) => children,
    OrgConfigProvider: ({ children }) => children,
    useOrgConfig: () => ({
      orgConfig: { org_id: "demo-church", name: "Demo Church" },
      configLoaded: true,
    }),
  };
});

// The heavy child components are stubbed so the page's own wiring can be
// driven through real DOM events instead of their internals.
vi.mock("../../src/Pages/CreateEvents", async () => {
  const React = await import("react");
  return {
    default: (props) =>
      React.createElement(
        "div",
        { "data-testid": "create-events-modal", "data-type": props.selectedEventType || "" },
        "Create Event Data Form",
      ),
  };
});

vi.mock("../../src/Pages/EventTypesModal", async () => {
  const React = await import("react");
  return {
    default: (props) =>
      props.open
        ? React.createElement(
            "div",
            {
              "data-testid": "event-types-modal",
              "data-editing": props.selectedEventType?.name || "",
            },
            React.createElement("p", null, "Event Types Form"),
            React.createElement(
              "button",
              { onClick: () => props.onSubmit({ name: "Blitz" }) },
              "Submit New Type",
            ),
            React.createElement(
              "button",
              {
                // The real modal passes the selected type's id as arg 2, which
                // is what switches handleSaveEventType into its PUT branch.
                onClick: () =>
                  props.onSubmit({ name: "Blitz Renamed" }, props.selectedEventType?._id || null),
              },
              "Submit Edit Type",
            ),
            React.createElement("button", { onClick: props.onClose }, "Close Types"),
          )
        : null,
  };
});

vi.mock("../../src/Pages/EditEventModal", async () => {
  const React = await import("react");
  return {
    default: (props) =>
      props.isOpen
        ? React.createElement(
            "div",
            { "data-testid": "edit-event-modal", "data-event": props.event?.eventName || "" },
            "Edit Event Form",
          )
        : null,
  };
});

vi.mock("../../src/Pages/AddPersonToEvents", async () => {
  const React = await import("react");
  return {
    default: (props) =>
      props.open
        ? React.createElement("div", { "data-testid": "add-filter-modal" }, "Add Person Filter")
        : null,
  };
});

vi.mock("../../src/Pages/AttendanceModal", async () => {
  const React = await import("react");
  return {
    default: (props) =>
      props.isOpen && props.event
        ? React.createElement(
            "div",
            { "data-testid": "attendance-modal", "data-event": props.event.eventName || "" },
            React.createElement("p", null, `Attendance: ${props.event.eventName}`),
            React.createElement(
              "button",
              {
                onClick: () =>
                  props.onSubmit([
                    { id: "p1", name: "Amy", email: "amy@example.com", checked_in: true },
                  ]),
              },
              "Submit Attendees",
            ),
            React.createElement(
              "button",
              { onClick: () => props.onSubmit("did_not_meet") },
              "Mark Did Not Meet",
            ),
            React.createElement("button", { onClick: props.onClose }, "Close Attendance"),
          )
        : null,
  };
});

vi.mock("@mui/x-data-grid", async () => {
  const React = await import("react");
  return {
    DataGrid: ({ rows, columns }) =>
      React.createElement(
        "table",
        { "data-testid": "datagrid" },
        React.createElement(
          "tbody",
          null,
          (rows || []).map((row) =>
            React.createElement(
              "tr",
              { key: row.id ?? row._id ?? row.email, "data-row-id": row.id ?? row._id },
              (columns || []).map((col) =>
                React.createElement(
                  "td",
                  { key: col.field, "data-field": col.field },
                  col.renderCell
                    ? col.renderCell({
                        row,
                        value: row[col.field],
                        field: col.field,
                        id: row.id ?? row._id,
                      })
                    : (row[col.field] ?? ""),
                ),
              ),
            ),
          ),
        ),
      ),
    GridToolbar: () => null,
  };
});

// ── Fixtures ─────────────────────────────────────────────────────────────────

const makeEvt = (overrides = {}) => ({
  _id: "evt-1",
  eventName: "Sunday Celebration",
  date: "2026-09-20",
  eventLeaderName: "Test Leader",
  eventLeaderEmail: "leader@x.com",
  status: "incomplete",
  event_type: "Service",
  attendees: [],
  ...overrides,
});

const makeType = (overrides = {}) => ({
  _id: "type-1",
  name: "Service",
  isBuiltIn: true,
  ...overrides,
});

const eventTypes = [makeType(), makeType({ _id: "type-2", name: "Cells" })];

const fullEvent = {
  ...makeEvt(),
  attendees: [
    {
      id: "p1",
      name: "Amy",
      surname: "Ndlovu",
      email: "amy@example.com",
      phone: "0821111111",
    },
  ],
  registrants: [
    {
      id: "p2",
      name: "Ben",
      surname: "Mokoena",
      email: "ben@example.com",
      phone: "0822222222",
    },
  ],
};

const isEventTypesRoot = (u) => /\/event-types\/?(\?.*)?$/.test(String(u));
const isEventTypeItem = (u) => /\/event-types\/[^/?]+/.test(String(u));
const isEventById = (u) => /\/events\/[^/?]+(\?.*)?$/.test(String(u));
const isSingleEvent = (u) => isEventById(u) && !String(u).includes("eventsdata");

/** Route table for the Events page. Overridable per test. */
const eventsRoutes = ({
  events = [makeEvt()],
  total_events,
  total_pages = 1,
} = {}) =>
  makeAuthFetch([
    { method: "GET", url: "/event-types", data: eventTypes },
    { method: "POST", url: isEventTypesRoot, data: { name: "Blitz" } },
    { method: "PUT", url: isEventTypeItem, data: { name: "Blitz Renamed" } },
    { method: "DELETE", url: isEventTypeItem, data: { message: "deleted" } },
    {
      method: "GET",
      url: "/events/eventsdata",
      data: {
        events,
        total_events: total_events ?? events.length,
        total_pages,
      },
    },
    { method: "GET", url: isEventById, data: fullEvent },
    { method: "DELETE", url: isEventById, data: { message: "deleted" } },
  ]);

const renderEvents = (routes) => {
  const utils = renderWithProviders(<Events />, { authFetch: routes });
  return { ...utils, routes };
};

// The type selector renders one clickable card per event type.
const typeCard = (name) => screen.getAllByText(name)[0];

// Nearest ancestor that owns a button — the event-type card with its ⋮ menu.
const typeCardWithMenu = (name) => {
  let node = typeCard(name);
  while (node && !node.querySelector?.("button")) node = node.parentElement;
  if (!node) throw new Error(`event type card for ${name} not found`);
  return node;
};

const getRow = (name) => {
  const cell = screen.getByText(name).closest("tr");
  if (!cell) throw new Error(`row for ${name} not found`);
  return cell;
};

// Row action buttons, in page order: capture, edit, delete, download, everyone.
const rowSvgButtons = (row) =>
  within(row)
    .getAllByRole("button")
    .filter((b) => b.querySelector("svg"));

const eventsDataCalls = (routes, match = () => true) =>
  routes.mock.calls
    .map(([u]) => String(u))
    .filter((u) => u.includes("/events/eventsdata") && match(u));

/** Render, wait for the type selector, click the Service card, wait for rows. */
const openEventsView = async (routes) => {
  renderEvents(routes);
  await screen.findByText("Select Event Type");
  fireEvent.click(typeCard("Service"));
  await screen.findByText("Sunday Celebration");
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe("Events page actions", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("access_token", "test-token");
    localStorage.setItem(
      "userProfile",
      JSON.stringify({
        role: "admin",
        email: "leader@x.com",
        org_id: "demo-church",
        Organization: "Demo Church",
        name: "Test Leader",
        surname: "Leader",
      }),
    );
    window.confirm = vi.fn(() => true);
    vi.clearAllMocks();

    // handleCaptureClick + attendance submit go through window.fetch, not authFetch.
    globalThis.fetch = vi.fn(async (url, options = {}) => {
      const u = String(url);
      const method = (options.method || "GET").toUpperCase();
      if (method === "GET" && u.includes("/events/evt-1")) return jsonResponse(fullEvent);
      if (method === "PUT" && u.includes("/submit-attendance/evt-1")) {
        return jsonResponse({ success: true, message: "Attendance captured" });
      }
      return jsonResponse({ detail: `Unhandled fetch: ${method} ${u}` }, 404);
    });
  });

  afterEach(() => cleanup());

  describe("type selector", () => {
    test("mount fetches event types and renders a card per type", async () => {
      const routes = eventsRoutes();
      renderEvents(routes);

      expect(await screen.findByText("Select Event Type")).toBeInTheDocument();
      await waitFor(() => expect(eventsDataCalls(routes).length).toBe(0));
      expect(routes.mock.calls.some(([u]) => String(u).includes("/event-types"))).toBe(true);
      expect(screen.getByText("Service")).toBeInTheDocument();
      expect(screen.getByText("Cells")).toBeInTheDocument();
      // Types view is the landing view — no event rows yet.
      expect(screen.queryByTestId("datagrid")).not.toBeInTheDocument();
    });

    test("the type search box filters the visible cards", async () => {
      renderEvents(eventsRoutes());
      await screen.findByText("Select Event Type");

      const search = screen.getByPlaceholderText("Search event types...");
      fireEvent.change(search, { target: { value: "serv" } });

      expect(screen.getByText("Service")).toBeInTheDocument();
      expect(screen.queryByText("Cells")).not.toBeInTheDocument();

      fireEvent.change(search, { target: { value: "zzz" } });
      expect(await screen.findByText("No event types found")).toBeInTheDocument();
    });

    test("clicking a type card enters the events view and fetches that type", async () => {
      const routes = eventsRoutes();
      await openEventsView(routes);

      expect(screen.getByTestId("datagrid")).toBeInTheDocument();
      const urls = eventsDataCalls(routes);
      expect(urls.some((u) => u.includes("event_type=Service"))).toBe(true);
      expect(urls.some((u) => u.includes("status=incomplete"))).toBe(true);
      expect(screen.queryByText("Select Event Type")).not.toBeInTheDocument();
    });

    test("the Back button returns to the type selector", async () => {
      const routes = eventsRoutes();
      await openEventsView(routes);

      fireEvent.click(screen.getByRole("button", { name: /^Back$/ }));

      expect(await screen.findByText("Select Event Type")).toBeInTheDocument();
      expect(screen.queryByTestId("datagrid")).not.toBeInTheDocument();
    });
  });

  describe("event list controls", () => {
    test("search narrows the event list to matching rows", async () => {
      const routes = eventsRoutes({
        events: [makeEvt(), makeEvt({ _id: "evt-2", eventName: "Midweek Connect" })],
        total_events: 2,
      });
      await openEventsView(routes);
      expect(screen.getByText("Midweek Connect")).toBeInTheDocument();

      const searchBox = screen.getByPlaceholderText("Search by Event Name, Leader, or Email...");
      // Focusing the box loads the full unfiltered set the search filters over.
      const before = eventsDataCalls(routes).length;
      fireEvent.click(searchBox);
      await waitFor(() => expect(eventsDataCalls(routes).length).toBeGreaterThan(before));
      fireEvent.change(searchBox, { target: { value: "celebration" } });

      await waitFor(
        () => {
          expect(screen.getByText("Sunday Celebration")).toBeInTheDocument();
          expect(screen.queryByText("Midweek Connect")).not.toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });

    test("CLEAR ALL restores the unfiltered list", async () => {
      const routes = eventsRoutes({
        events: [makeEvt(), makeEvt({ _id: "evt-2", eventName: "Midweek Connect" })],
        total_events: 2,
      });
      await openEventsView(routes);

      const searchBox = screen.getByPlaceholderText("Search by Event Name, Leader, or Email...");
      fireEvent.click(searchBox);
      fireEvent.change(searchBox, { target: { value: "celebration" } });
      await waitFor(() => expect(screen.queryByText("Midweek Connect")).not.toBeInTheDocument());

      fireEvent.click(screen.getByRole("button", { name: /CLEAR ALL/i }));

      expect(await screen.findByText("Midweek Connect")).toBeInTheDocument();
      expect(searchBox).toHaveValue("");
    });

    test.each([
      ["COMPLETE", "complete"],
      ["DID NOT MEET", "did_not_meet"],
    ])("the %s status badge refetches with status=%s", async (label, status) => {
      const routes = eventsRoutes();
      await openEventsView(routes);
      routes.mockClear();

      fireEvent.click(screen.getByText(label));

      await waitFor(() =>
        expect(
          eventsDataCalls(routes, (u) => u.includes(`status=${status}`)).length,
        ).toBeGreaterThan(0),
      );
    });

    test("Next > / < Previous walk the pages", async () => {
      const many = [
        makeEvt(),
        ...Array.from({ length: 54 }, (_, i) =>
          makeEvt({ _id: `evt-${i + 2}`, eventName: `Service ${i + 2}` }),
        ),
      ];
      const routes = eventsRoutes({ events: many, total_events: 55, total_pages: 2 });
      await openEventsView(routes);

      const pageLabel = () =>
        screen.getByText((_, el) => el?.textContent?.trim() === "Page 1 of 2");
      expect(pageLabel()).toBeTruthy();

      fireEvent.click(screen.getByRole("button", { name: /Next >/ }));

      await waitFor(() =>
        expect(
          screen.getByText((_, el) => el?.textContent?.trim() === "Page 2 of 2"),
        ).toBeTruthy(),
      );

      fireEvent.click(screen.getByRole("button", { name: /< Previous/ }));
      await waitFor(() =>
        expect(
          screen.getByText((_, el) => el?.textContent?.trim() === "Page 1 of 2"),
        ).toBeTruthy(),
      );
    });

    test("changing rows per page updates the page size", async () => {
      const routes = eventsRoutes();
      await openEventsView(routes);

      const select = screen.getByRole("combobox");
      fireEvent.change(select, { target: { value: "25" } });

      await waitFor(() => expect(select).toHaveValue("25"));
    });
  });

  describe("event type management", () => {
    test("FAB opens the create event type modal in the types view", async () => {
      renderEvents(eventsRoutes());
      await screen.findByText("Select Event Type");

      fireEvent.click(screen.getByRole("button", { name: /Open menu/i }));
      fireEvent.click(screen.getByRole("button", { name: /Create Event Type/i }));

      const modal = await screen.findByTestId("event-types-modal");
      expect(modal).toHaveAttribute("data-editing", "");
    });

    test("saving a new event type POSTs /event-types and toasts", async () => {
      const routes = eventsRoutes();
      renderEvents(routes);
      await screen.findByText("Select Event Type");

      fireEvent.click(screen.getByRole("button", { name: /Open menu/i }));
      fireEvent.click(screen.getByRole("button", { name: /Create Event Type/i }));
      fireEvent.click(within(await screen.findByTestId("event-types-modal")).getByText("Submit New Type"));

      await waitFor(() => {
        const post = routes.mock.calls.find(
          ([u, o]) => o?.method === "POST" && isEventTypesRoot(u),
        );
        expect(post).toBeTruthy();
        expect(JSON.parse(post[1].body)).toEqual({ name: "Blitz" });
      });
      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith("Event type created successfully!"),
      );
    });

    test("the type card ⋮ menu edits an event type via PUT", async () => {
      const routes = eventsRoutes();
      renderEvents(routes);
      await screen.findByText("Select Event Type");

      fireEvent.click(within(typeCardWithMenu("Service")).getByRole("button"));
      fireEvent.click(await screen.findByRole("menuitem", { name: /Edit/ }));

      const modal = await screen.findByTestId("event-types-modal");
      expect(modal).toHaveAttribute("data-editing", "Service");

      fireEvent.click(within(modal).getByText("Submit Edit Type"));

      await waitFor(() => {
        const put = routes.mock.calls.find(
          ([u, o]) => o?.method === "PUT" && isEventTypeItem(u),
        );
        expect(put).toBeTruthy();
        expect(String(put[0])).toContain("/event-types/Service");
        expect(JSON.parse(put[1].body)).toEqual({ name: "Blitz Renamed" });
      });
      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith("Event type updated successfully!"),
      );
    });

    test("the type card ⋮ menu confirms then DELETEs an event type", async () => {
      const routes = eventsRoutes();
      renderEvents(routes);
      await screen.findByText("Select Event Type");

      fireEvent.click(within(typeCardWithMenu("Service")).getByRole("button"));
      fireEvent.click(await screen.findByRole("menuitem", { name: /Delete/ }));

      const dialog = await screen.findByRole("dialog");
      expect(dialog).toHaveTextContent(/Are you sure you want to delete the event type "Service"/);
      fireEvent.click(within(dialog).getByRole("button", { name: /^Delete$/ }));

      await waitFor(() => {
        const del = routes.mock.calls.find(
          ([u, o]) => o?.method === "DELETE" && isEventTypeItem(u),
        );
        expect(del).toBeTruthy();
        expect(String(del[0])).toContain("/event-types/Service");
      });
    });

    test("cancelling the delete dialog does not call the API", async () => {
      const routes = eventsRoutes();
      renderEvents(routes);
      await screen.findByText("Select Event Type");
      routes.mockClear();

      fireEvent.click(within(typeCardWithMenu("Service")).getByRole("button"));
      fireEvent.click(await screen.findByRole("menuitem", { name: /Delete/ }));
      const dialog = await screen.findByRole("dialog");
      fireEvent.click(within(dialog).getByRole("button", { name: /^Cancel$/ }));

      await waitFor(() =>
        expect(
          routes.mock.calls.some(([, o]) => o?.method === "DELETE"),
        ).toBe(false),
      );
    });
  });

  describe("create / edit / delete events", () => {
    test("FAB opens the create event modal with the active type", async () => {
      const routes = eventsRoutes();
      await openEventsView(routes);

      fireEvent.click(screen.getByRole("button", { name: /Open menu/i }));
      fireEvent.click(screen.getByRole("button", { name: /Create Event Data/i }));

      expect(await screen.findByText("Create New Event")).toBeInTheDocument();
      const modal = screen.getByTestId("create-events-modal");
      expect(modal).toHaveAttribute("data-type", "Service");
    });

    test("edit event opens the edit modal prefilled with that row", async () => {
      const routes = eventsRoutes();
      await openEventsView(routes);

      fireEvent.click(rowSvgButtons(getRow("Sunday Celebration"))[1]);

      const modal = await screen.findByTestId("edit-event-modal");
      expect(modal).toHaveAttribute("data-event", "Sunday Celebration");
    });

    test("delete event confirms then DELETEs /events/{id} and toasts", async () => {
      const routes = eventsRoutes();
      await openEventsView(routes);

      fireEvent.click(rowSvgButtons(getRow("Sunday Celebration"))[2]);

      expect(window.confirm).toHaveBeenCalled();
      await waitFor(() => {
        const del = routes.mock.calls.find(
          ([u, o]) => o?.method === "DELETE" && isEventById(u),
        );
        expect(del).toBeTruthy();
        expect(String(del[0])).toContain("/events/evt-1");
      });
      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith("Event deleted successfully!"),
      );
    });
  });

  describe("attendance capture", () => {
    test("capture fetches the full event and opens the attendance modal", async () => {
      const routes = eventsRoutes();
      await openEventsView(routes);

      fireEvent.click(rowSvgButtons(getRow("Sunday Celebration"))[0]);

      expect(await screen.findByText("Attendance: Sunday Celebration")).toBeInTheDocument();
      expect(window.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/events/evt-1"),
        expect.anything(),
      );
      const modal = screen.getByTestId("attendance-modal");
      expect(modal).toHaveAttribute("data-event", "Sunday Celebration");
    });

    test("closing the attendance modal dismisses it", async () => {
      const routes = eventsRoutes();
      await openEventsView(routes);

      fireEvent.click(rowSvgButtons(getRow("Sunday Celebration"))[0]);
      await screen.findByTestId("attendance-modal");
      fireEvent.click(screen.getByText("Close Attendance"));

      await waitFor(() => expect(screen.queryByTestId("attendance-modal")).not.toBeInTheDocument());
    });

    test("submitting attendees PUTs the attendance payload and toasts", async () => {
      const routes = eventsRoutes();
      await openEventsView(routes);

      fireEvent.click(rowSvgButtons(getRow("Sunday Celebration"))[0]);
      await screen.findByTestId("attendance-modal");
      fireEvent.click(screen.getByText("Submit Attendees"));

      await waitFor(() => {
        const put = window.fetch.mock.calls.find(
          ([u, o]) => String(u).includes("/submit-attendance/evt-1") && o?.method === "PUT",
        );
        expect(put).toBeTruthy();
        const body = JSON.parse(put[1].body);
        expect(body.event_id).toBe("evt-1_2026-09-20");
        expect(body.did_not_meet).toBe(false);
        expect(body.leaderEmail).toBe("leader@x.com");
        expect(body.leaderName).toBe("Test Leader Leader");
        expect(body.event_date).toBe("2026-09-20");
        expect(body.attendees).toHaveLength(1);
        expect(body.all_attendees).toEqual(body.attendees);
      });
      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith(
          "Successfully captured attendance for Sunday Celebration",
        ),
      );
    });

    test("'did not meet' PUTs an empty attendance payload and toasts", async () => {
      const routes = eventsRoutes();
      await openEventsView(routes);

      fireEvent.click(rowSvgButtons(getRow("Sunday Celebration"))[0]);
      await screen.findByTestId("attendance-modal");
      fireEvent.click(screen.getByText("Mark Did Not Meet"));

      await waitFor(() => {
        const put = window.fetch.mock.calls.find(
          ([u, o]) => String(u).includes("/submit-attendance/evt-1") && o?.method === "PUT",
        );
        expect(put).toBeTruthy();
        const body = JSON.parse(put[1].body);
        expect(body.did_not_meet).toBe(true);
        expect(body.event_id).toBe("evt-1_2026-09-20");
        expect(body.attendees).toEqual([]);
      });
      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith(
          "Sunday Celebration marked as 'Did Not Meet'.",
        ),
      );
    });
  });

  describe("attendance downloads", () => {
    let anchorSpy;
    let downloaded;

    beforeEach(() => {
      downloaded = [];
      anchorSpy = vi
        .spyOn(HTMLAnchorElement.prototype, "click")
        .mockImplementation(function mockClick() {
          downloaded.push({ download: this.download, href: this.href });
        });
    });

    afterEach(() => anchorSpy.mockRestore());

    test("download attendance fetches the full event and exports an .xls blob", async () => {
      const routes = eventsRoutes();
      await openEventsView(routes);

      fireEvent.click(rowSvgButtons(getRow("Sunday Celebration"))[3]);

      await waitFor(() => {
        const get = routes.mock.calls.find(
          ([u, o]) => (!o?.method || o.method === "GET") && isSingleEvent(u),
        );
        expect(get).toBeTruthy();
      });
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(downloaded).toHaveLength(1);
      expect(downloaded[0].download).toMatch(/^attendance_Sunday_Celebration_\d{4}-\d{2}-\d{2}\.xls$/);
      // Only the checked-in attendee is exported by default.
      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith("Downloaded 1 people for this event"),
      );
    });

    test("download everyone exports every associated person", async () => {
      const routes = eventsRoutes();
      await openEventsView(routes);

      fireEvent.click(rowSvgButtons(getRow("Sunday Celebration"))[4]);

      await waitFor(() => expect(downloaded).toHaveLength(1));
      expect(downloaded[0].download).toMatch(
        /^everyone_Sunday_Celebration_\d{4}-\d{2}-\d{2}\.xls$/,
      );
      // attendees + registrants
      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith(
          "Downloaded 2 associated people for this event",
        ),
      );
    });
  });
});
