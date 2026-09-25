import React from "react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import { screen, within, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "react-toastify";

import ServiceCheckIn from "../../src/Pages/ServiceCheckIn";
import {
  TODAY,
  makeAuthFetch,
  makeEvent,
  makePerson,
  makeRealtime,
  renderWithProviders,
} from "./helpers";

// ── Mocks for MUI DataGrid and child components ──────────────────────────────
// The real DataGrid virtualizes rows and needs real layout; these stubs render
// the page's own renderCell logic for every row so we can drive real buttons.

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
          rows.map((row) =>
            React.createElement(
              "tr",
              { key: row.id ?? row._id ?? row.email },
              columns.map((col) =>
                React.createElement(
                  "td",
                  { key: col.field, "data-field": col.field },
                  col.renderCell ? col.renderCell({ row }) : row[col.field] ?? "",
                ),
              ),
            ),
          ),
        ),
      ),
    GridToolbar: () => null,
  };
});

vi.mock("../../src/components/AddPersonDialog", async () => {
  const React = await import("react");
  return {
    default: (props) =>
      props.open
        ? React.createElement(
            "div",
            { "data-testid": "add-person-dialog", "data-is-edit": String(props.isEdit) },
            React.createElement(
              "button",
              { onClick: () => props.onSave(props.formData) },
              "Save Person",
            ),
            React.createElement("button", { onClick: props.onClose }, "Cancel Person"),
          )
        : null,
  };
});

vi.mock("../../src/components/DeleteConfirmationModal", async () => {
  const React = await import("react");
  return {
    default: (props) =>
      props.open
        ? React.createElement(
            "div",
            { "data-testid": "delete-confirmation", "data-person": props.personName },
            React.createElement(
              "button",
              { onClick: () => props.onConfirm() },
              "Confirm Delete",
            ),
            React.createElement("button", { onClick: props.onClose }, "Cancel Delete"),
          )
        : null,
  };
});

vi.mock("../../src/components/ConsolidationModal", async () => {
  const React = await import("react");
  return {
    default: (props) =>
      props.open
        ? React.createElement(
            "div",
            { "data-testid": "consolidation-modal" },
            React.createElement(
              "button",
              {
                onClick: () =>
                  props.onFinish({
                    person_name: "Ben",
                    person_surname: "Ndlovu",
                    decision_type: "Commitment",
                  }),
              },
              "Finish Consolidation",
            ),
            React.createElement("button", { onClick: props.onClose }, "Cancel Consolidation"),
          )
        : null,
  };
});

vi.mock("../../src/components/EventHistory", async () => {
  const React = await import("react");
  return {
    default: (props) =>
      React.createElement(
        "div",
        { "data-testid": "event-history", "data-count": String(props.events?.length || 0) },
        (props.events || []).map((ev) =>
          React.createElement(
            "div",
            { key: ev.id || ev._id, "data-testid": `history-${ev.id || ev._id}` },
            ev.eventName,
            React.createElement(
              "button",
              { onClick: () => props.onUnsaveEvent(ev) },
              "Reopen Event",
            ),
            React.createElement(
              "button",
              { onClick: () => props.onViewDetails(ev, []) },
              "View Details",
            ),
          ),
        ),
      ),
  };
});

vi.mock("../../src/components/EventHistoryModal", async () => {
  const React = await import("react");
  return {
    default: (props) =>
      props.open
        ? React.createElement(
            "div",
            { "data-testid": "event-history-modal", "data-type": props.type },
            React.createElement("button", { onClick: props.onClose }, "Close History"),
          )
        : null,
  };
});

vi.mock("xlsx", () => ({
  utils: {
    book_new: vi.fn(),
    json_to_sheet: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

// ── helpers ──────────────────────────────────────────────────────────────────

const rowButtons = (row) =>
  within(row).getAllByRole("button").filter((b) => b.querySelector("svg")); // [delete, edit, check-in]
// The new-flag chip has no svg, so the svg-buttons are: delete, edit, check-in.

const getRow = (name) => {
  const cell = screen.getByText(name).closest("tr");
  if (!cell) throw new Error(`row for ${name} not found`);
  return cell;
};

const routesFor = ({ events, people, realtime } = {}) =>
  makeAuthFetch([
    { method: "GET", url: "/events/eventsdata", data: { events: events || [] } },
    { method: "GET", url: "/cache/people", data: { success: true, cached_data: people || [] } },
    { method: "POST", url: "/cache/people/refresh", data: { success: true }, },
    { method: "GET", url: "/service-checkin/real-time-data", data: realtime || makeRealtime() },
    { method: "POST", url: "/service-checkin/checkin", data: { success: true } },
    { method: "DELETE", url: "/service-checkin/remove", data: { success: true } },
    { method: "DELETE", url: "/service-checkin/remove-consolidation", data: { success: true, task_deletion: { deleted: false } } },
    { method: "DELETE", url: "/people/", data: { success: true } },
    { method: "PATCH", url: "/toggle-status", data: { action: "reopened", message: "Reopened" } },
  ]);

const amy = makePerson();
const ben = makePerson({
  _id: "p2",
  id: "p2",
  name: "Ben",
  surname: "Ndlovu",
  email: "ben@example.com",
  phone: "0832222222",
  number: "0832222222",
});

const renderPage = (routes) => {
  const authFetch = routes;
  const utils = renderWithProviders(<ServiceCheckIn />, { authFetch });
  return { ...utils, authFetch };
};

describe("ServiceCheckIn page actions", () => {
  beforeEach(() => {
    window.confirm = vi.fn(() => true);
    window.globalPeopleCache = null;
    window.globalCacheTimestamp = null;
    vi.clearAllMocks();
  });

  test("mount loads events + people and auto-selects today's open event (fetches realtime)", async () => {
    const routes = routesFor({
      events: [makeEvent()],
      people: [amy, ben],
      realtime: makeRealtime(),
    });
    renderPage(routes);

    await waitFor(() => {
      expect(routes).toHaveBeenCalledWith(
        expect.stringContaining("/events/eventsdata"),
      );
      expect(routes).toHaveBeenCalledWith(expect.stringContaining("/cache/people"));
    });
    await waitFor(() => {
      expect(routes).toHaveBeenCalledWith(
        expect.stringContaining("/service-checkin/real-time-data?event_id=evt_1"),
      );
    });
    // The auto-selected event name appears in the loaded select
    expect(await screen.findByText("Sunday Service")).toBeInTheDocument();
    // Both people rows render
    expect(screen.getByText("Amy Ndlovu")).toBeInTheDocument();
    expect(screen.getByText("Ben Ndlovu")).toBeInTheDocument();
  });

  test("checking in an absent person POSTs to /service-checkin/checkin and toasts", async () => {
    const routes = routesFor({ events: [makeEvent()], people: [amy], realtime: makeRealtime() });
    renderPage(routes);

    await screen.findByText("Amy Ndlovu");
    const row = getRow("Amy Ndlovu");
    const [, , checkIn] = rowButtons(row);

    fireEvent.click(checkIn);

    await waitFor(() => {
      const call = routes.mock.calls.find(([u]) => u.includes("/service-checkin/checkin"));
      expect(call).toBeTruthy();
      const body = JSON.parse(call[1].body);
      expect(body.event_id).toBe("evt");
      expect(body.type).toBe("attendee");
      expect(body.person_data.id).toBe("p1");
      expect(body.person_data.email).toBe("amy@example.com");
    });
    expect(toast.success).toHaveBeenCalledWith("Amy Ndlovu checked in");
  });

  test("removing a present person DELETEs /service-checkin/remove and toasts", async () => {
    const routes = routesFor({
      events: [makeEvent()],
      people: [amy],
      realtime: makeRealtime({
        present_attendees: [{ id: "p1", _id: "p1", name: "Amy", surname: "Ndlovu", email: "amy@example.com" }],
        present_count: 1,
      }),
    });
    renderPage(routes);

    await screen.findByText("Amy Ndlovu");
    const row = getRow("Amy Ndlovu");
    const [, , checkIn] = rowButtons(row);

    fireEvent.click(checkIn);

    await waitFor(() => {
      const call = routes.mock.calls.find(([u]) => u.includes("/service-checkin/remove"));
      expect(call).toBeTruthy();
      const body = JSON.parse(call[1].body);
      expect(body.event_id).toBe("evt");
      expect(body.type).toBe("attendees");
      expect(body.person_id).toBe("p1");
    });
    expect(toast.info).toHaveBeenCalledWith("Amy Ndlovu removed from check-in");
  });

  test("add person warns when no event is selected", async () => {
    // No today-open event -> nothing auto-selected -> currentEventId stays ""
    const routes = routesFor({
      events: [makeEvent({ rawDate: "2026-01-01", date: "2026-01-01", status: "open" })],
      people: [amy],
    });
    const { authFetch } = renderPage(routes);
    await screen.findByText("Amy Ndlovu");

    // ActionButtons add-person icon (MUI icons expose data-testid)
    const addIcon = document.querySelector('[data-testid="PersonAddIcon"]');
    expect(addIcon).toBeInTheDocument();
    fireEvent.click(addIcon);

    // No event selected -> add person is rejected with a toast, no dialog
    expect(toast.error).toHaveBeenCalledWith(
      "Please select an event first before adding people",
    );
    expect(screen.queryByTestId("add-person-dialog")).not.toBeInTheDocument();
    // And nothing was POSTed
    expect(
      authFetch.mock.calls.filter(([u]) => String(u).includes("/service-checkin/checkin")),
    ).toHaveLength(0);
  });

  test("add person opens the dialog, and saving posts a cache refresh + success toast", async () => {
    const routes = routesFor({ events: [makeEvent()], people: [amy], realtime: makeRealtime() });
    renderPage(routes);
    await screen.findByText("Amy Ndlovu");

    // Add Person icon (PersonAdd) — MUI icons expose data-testid
    fireEvent.click(document.querySelector('[data-testid="PersonAddIcon"]'));

    const dialog = await screen.findByTestId("add-person-dialog");
    expect(dialog).toHaveAttribute("data-is-edit", "false");

    fireEvent.click(within(dialog).getByText("Save Person"));

    await waitFor(() => {
      const call = routes.mock.calls.find(([u]) => String(u).endsWith("/cache/people/refresh"));
      expect(call).toBeTruthy();
      expect(call[1].method).toBe("POST");
    });
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("added successfully"));
    });
    // Dialog closed after save
    await waitFor(() => expect(screen.queryByTestId("add-person-dialog")).not.toBeInTheDocument());
  });

  test("edit person opens the dialog in edit mode", async () => {
    const routes = routesFor({ events: [makeEvent()], people: [amy], realtime: makeRealtime() });
    renderPage(routes);
    await screen.findByText("Amy Ndlovu");

    const row = getRow("Amy Ndlovu");
    const [, edit] = rowButtons(row);
    fireEvent.click(edit);

    const dialog = await screen.findByTestId("add-person-dialog");
    expect(dialog).toHaveAttribute("data-is-edit", "true");
  });

  test("delete person shows confirmation and DELETEs /people/{id} on confirm", async () => {
    const routes = routesFor({ events: [makeEvent()], people: [amy], realtime: makeRealtime() });
    renderPage(routes);
    await screen.findByText("Amy Ndlovu");

    const row = getRow("Amy Ndlovu");
    const [del] = rowButtons(row);
    fireEvent.click(del);

    const confirm = await screen.findByTestId("delete-confirmation");
    expect(confirm).toHaveAttribute("data-person", "Amy Ndlovu");
    fireEvent.click(within(confirm).getByText("Confirm Delete"));

    await waitFor(() => {
      const call = routes.mock.calls.find(([u]) => String(u).includes("/people/p1"));
      expect(call).toBeTruthy();
      expect(call[1].method).toBe("DELETE");
    });
  });

  test("save and close event PATCHes toggle-status after confirm", async () => {
    const routes = routesFor({ events: [makeEvent()], people: [amy], realtime: makeRealtime() });
    renderPage(routes);
    await screen.findByText("Amy Ndlovu");

    fireEvent.click(screen.getByRole("button", { name: /Save/i }));
    expect(window.confirm).toHaveBeenCalled();

    await waitFor(() => {
      const call = routes.mock.calls.find(([u]) => String(u).includes("/toggle-status"));
      expect(call).toBeTruthy();
      expect(call[1].method).toBe("PATCH");
      expect(String(call[0])).toContain("/events/evt_1/toggle-status");
    });
  });

  test("mark as new flag POSTs a new_person check-in", async () => {
    const routes = routesFor({ events: [makeEvent()], people: [amy], realtime: makeRealtime() });
    renderPage(routes);
    await screen.findByText("Amy Ndlovu");

    const row = getRow("Amy Ndlovu");
    fireEvent.click(within(row).getByText("+ New"));

    await waitFor(() => {
      const call = routes.mock.calls.find(
        ([u]) => String(u).includes("/service-checkin/checkin"),
      );
      const body = JSON.parse(call[1].body);
      expect(body.type).toBe("new_person");
      expect(body.person_data.id).toBe("p1");
    });
    expect(toast.success).toHaveBeenCalledWith("Amy Ndlovu marked as new this service");
  });

  test("full refresh re-fetches people cache and events", async () => {
    const routes = routesFor({ events: [makeEvent()], people: [amy], realtime: makeRealtime() });
    renderPage(routes);
    await screen.findByText("Amy Ndlovu");

    const callsBefore = routes.mock.calls.length;
    // Refresh icon (MUI IconButton exposes data-testid on the svg)
    const refreshBtn = document.querySelector('[data-testid="RefreshIcon"]');
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      const madeRefreshCalls = routes.mock.calls
        .slice(callsBefore)
        .filter(([u]) => String(u).includes("/cache/people"));
      expect(madeRefreshCalls.length).toBeGreaterThanOrEqual(1);
    });
  });

  test("event history tab shows closed events and reopening PATCHes toggle-status", async () => {
    const routes = routesFor({
      events: [makeEvent(), makeEvent({ id: "evt_2", eventName: "Last Sunday", status: "complete" })],
      people: [amy],
      realtime: makeRealtime(),
    });
    renderPage(routes);
    await screen.findByText("Amy Ndlovu");

    fireEvent.click(screen.getByRole("tab", { name: "Event History" }));
    await screen.findByTestId("event-history");

    const historyRow = await screen.findByTestId("history-evt_2");
    expect(within(historyRow).getByText("Last Sunday")).toBeInTheDocument();

    fireEvent.click(within(historyRow).getByText("Reopen Event"));
    await waitFor(() => {
      const call = routes.mock.calls.find(([u]) => String(u).includes("/events/evt_2/toggle-status"));
      expect(call).toBeTruthy();
      expect(call[1].method).toBe("PATCH");
    });
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("reopened"));
  });

  test("viewing event details from history opens the history modal", async () => {
    const routes = routesFor({
      events: [makeEvent(), makeEvent({ id: "evt_2", eventName: "Last Sunday", status: "complete" })],
      people: [amy],
      realtime: makeRealtime(),
    });
    renderPage(routes);
    await screen.findByText("Amy Ndlovu");

    fireEvent.click(screen.getByRole("tab", { name: "Event History" }));
    const historyRow = await screen.findByTestId("history-evt_2");
    fireEvent.click(within(historyRow).getByText("View Details"));

    const modal = await screen.findByTestId("event-history-modal");
    expect(modal).toHaveAttribute("data-type", "attendance");
  });

  test("present modal lists present attendees, exports, and can remove", async () => {
    const routes = routesFor({
      events: [makeEvent()],
      people: [amy],
      realtime: makeRealtime({
        present_attendees: [{ id: "p1", _id: "p1", name: "Amy", surname: "Ndlovu", email: "amy@example.com", time: "09:00" }],
        present_count: 1,
      }),
    });
    renderPage(routes);
    await screen.findByText("Amy Ndlovu");

    fireEvent.click(screen.getByText("Present"));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Attendees Present: 1")).toBeInTheDocument();
    expect(within(dialog).getByText("Amy Ndlovu")).toBeInTheDocument();

    // Export doesn't crash (xlsx mocked); then remove from check-in
    fireEvent.click(within(dialog).getByText("Download XLSX"));
    fireEvent.click(dialog.querySelector('[data-testid="CheckCircleOutlineIcon"]'));
    await waitFor(() => {
      const call = routes.mock.calls.find(([u]) => String(u).includes("/service-checkin/remove"));
      expect(call).toBeTruthy();
    });
  });

  test("new people modal lists new present people and can remove", async () => {
    const routes = routesFor({
      events: [makeEvent()],
      people: [amy, ben],
      realtime: makeRealtime({
        present_attendees: [{ id: "p2", _id: "p2", name: "Ben", surname: "Ndlovu", email: "ben@example.com" }],
        new_people: [{ id: "p2", _id: "p2", email: "ben@example.com" }],
        present_count: 1,
      }),
    });
    renderPage(routes);
    await screen.findByText("Amy Ndlovu");

    fireEvent.click(screen.getByText("New People"));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("New People: 1")).toBeInTheDocument();
    expect(within(dialog).getByText("Ben Ndlovu")).toBeInTheDocument();

    fireEvent.click(dialog.querySelector('[data-testid="DeleteForeverIcon"]'));
    await waitFor(() => {
      const call = routes.mock.calls.find(([u]) => String(u).includes("/service-checkin/remove"));
      expect(call).toBeTruthy();
    });
  });

  test("consolidated modal lists consolidations and removing DELETEs remove-consolidation", async () => {
    const routes = routesFor({
      events: [makeEvent()],
      people: [amy],
      realtime: makeRealtime({
        consolidations: [
          {
            id: "c1",
            person_name: "Ben",
            person_surname: "Ndlovu",
            person_email: "ben@example.com",
            decision_type: "Commitment",
            assigned_to: "",
            created_at: "2026-09-01T08:00:00.000Z",
          },
        ],
        consolidation_count: 1,
      }),
    });
    renderPage(routes);
    await screen.findByText("Amy Ndlovu");

    fireEvent.click(screen.getByText("Consolidated"));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Consolidated: 1")).toBeInTheDocument();
    expect(within(dialog).getByText("Ben Ndlovu")).toBeInTheDocument();

    fireEvent.click(dialog.querySelector('[data-testid="DeleteForeverIcon"]'));
    await waitFor(() => {
      const call = routes.mock.calls.find(([u]) => String(u).includes("/service-checkin/remove-consolidation"));
      expect(call).toBeTruthy();
      expect(String(call[0])).toContain("consolidation_id=c1");
      expect(call[1].method).toBe("DELETE");
    });
  });

  test("add consolidation opens the modal and finishing toasts + notifies", async () => {
    const routes = routesFor({ events: [makeEvent()], people: [amy], realtime: makeRealtime() });
    renderPage(routes);
    await screen.findByText("Amy Ndlovu");

    fireEvent.click(document.querySelector('[data-testid="EmojiPeopleIcon"]'));
    const modal = await screen.findByTestId("consolidation-modal");
    expect(modal).toBeInTheDocument();

    fireEvent.click(within(modal).getByText("Finish Consolidation"));
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Ben Ndlovu consolidated successfully");
    });
  });

  test("search filters the attendee list", async () => {
    const routes = routesFor({ events: [makeEvent()], people: [amy, ben], realtime: makeRealtime() });
    renderPage(routes);
    await screen.findByText("Amy Ndlovu");

    await userEvent.type(screen.getByPlaceholderText("Search attendees…"), "ben");
    await waitFor(() => {
      expect(screen.getByText("Ben Ndlovu")).toBeInTheDocument();
      expect(screen.queryByText("Amy Ndlovu")).not.toBeInTheDocument();
    });
  });
});