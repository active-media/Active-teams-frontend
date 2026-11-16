import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";
import Targets from "../../src/Pages/Targets";
import { makeAuthFetch, renderWithProviders } from "./helpers";

const weeklyRows = [
  {
    person_id: "p1",
    person_name: "Amy Able",
    role: "leader",
    leader_name: "Leader One",
    weekly_target: 45,
    weekly_completed: 45,
    status: "met",
    provisional: true,
  },
  {
    person_id: "p2",
    person_name: "Ben Baker",
    role: "leaderAt12",
    leader_name: "Leader Two",
    weekly_target: 40,
    weekly_completed: 20,
    status: "not_met",
    provisional: false,
  },
  {
    person_id: "p3",
    person_name: "Cy Cole",
    role: "registrant",
    leader_name: "Leader One",
    weekly_target: 30,
    weekly_completed: 8,
    status: "in_progress",
    provisional: false,
  },
];

function targetRoutes(extra = [], reviewRows = []) {
  return makeAuthFetch([
    ...extra,
    {
      method: "GET",
      url: (url) => url.includes("/targets/custom-targets/eligible-people"),
      data: {
        people: [
          { person_id: "p1", name: "Amy Able", email: "amy@example.com", has_active_target: false },
          { person_id: "p2", name: "Ben Baker", email: "ben@example.com", has_active_target: true },
        ],
        total: 2,
        limit: 25,
        offset: 0,
      },
    },
    {
      method: "GET",
      url: (url) => url.includes("/targets/custom-targets/weekly-results"),
      data: {
        week: { start: "2026-11-02", end: "2026-11-08", provisional: false, phase: "frozen" },
        results: reviewRows,
        summary: {
          total: reviewRows.length,
          met: reviewRows.filter((row) => row.status === "met").length,
          not_met: reviewRows.filter((row) => row.status === "not_met").length,
          in_progress: reviewRows.filter((row) => row.status === "in_progress").length,
          excluded_no_completedat: 3,
          unmapped_completed_tasks: 2,
        },
      },
    },
    {
      method: "GET",
      url: (url) => url.endsWith("/targets/custom-targets"),
      data: { targets: [] },
    },
    { method: "GET", url: "/targets/twelve-tasks", data: { targets: [] } },
    { method: "GET", url: "/targets/service", data: { targets: [] } },
    { method: "GET", url: "/targets/available-weeks", data: { weeks: ["2026-W45"] } },
    { method: "POST", url: "/targets/twelve-tasks", data: {} },
    { method: "POST", url: "/targets/service", data: {} },
  ]);
}

function renderTargets({ role = "admin", isSupremeAdmin = false, authFetch, ...auth } = {}) {
  return renderWithProviders(<Targets />, {
    authFetch: authFetch || targetRoutes([], weeklyRows),
    auth: {
      user: {
        role,
        is_supreme_admin: isSupremeAdmin,
        Organization: "Active Church",
        person_id: "p1",
        ...auth,
      },
    },
  });
}

describe("Targets role gating", () => {
  test.each(["admin", "leader", "leaderAt12", "registrant"])("%s sees all sections", async (role) => {
    renderTargets({ role });

    expect(await screen.findByRole("tab", { name: "12 Tasks" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Service Targets" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Custom Targets" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Weekly Review" })).toBeInTheDocument();
  });

  test("supreme admin sees all sections regardless of account role", () => {
    renderTargets({ role: "registrant", isSupremeAdmin: "true" });

    expect(screen.getByRole("tab", { name: "12 Tasks" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Custom Targets" })).toBeInTheDocument();
  });

  test("plain user sees only their read-only Weekly Review", async () => {
    renderTargets({ role: "user" });

    expect(await screen.findByRole("tab", { name: "Weekly Review" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "12 Tasks" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Custom Targets" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Set target" })).not.toBeInTheDocument();
    expect(screen.getByText("Read-only progress for your account.")).toBeInTheDocument();
  });
});

describe("Custom Targets form", () => {
  async function openSetTarget(authFetch = targetRoutes()) {
    const user = userEvent.setup();
    renderTargets({ authFetch });
    await user.click(screen.getByRole("tab", { name: "Custom Targets" }));
    await user.click(screen.getByRole("button", { name: "Set target" }));
    const dialog = await screen.findByRole("dialog");
    return { user, dialog };
  }

  test("rejects negative values and zero weekly totals with inline errors", async () => {
    const { user, dialog } = await openSetTarget();
    fireEvent.change(within(dialog).getByLabelText("Mon"), { target: { value: "-1" } });
    await user.click(within(dialog).getByRole("button", { name: "Set target" }));
    expect(await within(dialog).findByText(/Mon must be a whole number/)).toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText("Mon"), { target: { value: "0" } });
    await user.click(within(dialog).getByRole("button", { name: "Set target" }));
    expect(await within(dialog).findByText("The weekly target must be greater than 0.")).toBeInTheDocument();
  });

  test("rejects a non-Monday start date", async () => {
    const { user, dialog } = await openSetTarget();
    fireEvent.change(within(dialog).getByLabelText("Start date (Monday)"), {
      target: { value: "2026-11-17" },
    });

    await user.click(within(dialog).getByRole("button", { name: "Set target" }));

    expect(await within(dialog).findByText("Start date must be a Monday.")).toBeInTheDocument();
  });

  test("updates the weekly total live", async () => {
    const { dialog } = await openSetTarget();
    ["Mon", "Tue", "Wed", "Thu", "Fri"].forEach((day) => {
      fireEvent.change(within(dialog).getByLabelText(day), { target: { value: "5" } });
    });
    fireEvent.change(within(dialog).getByLabelText("Sat"), { target: { value: "10" } });
    fireEvent.change(within(dialog).getByLabelText("Sun"), { target: { value: "10" } });

    expect(within(dialog).getByText("Weekly total: 45")).toBeInTheDocument();
  });

  test("shows per-person results when a bulk request partially fails", async () => {
    const authFetch = targetRoutes([
      {
        method: "POST",
        url: "/targets/custom-targets/bulk",
        data: {
          results: [
            { person_id: "p1", status: "ok", target: { id: "target-1" } },
            { person_id: "p2", status: "error", status_code: 409, error: "Date range overlaps" },
          ],
          summary: { total: 2, ok: 1, errors: 1 },
        },
      },
    ]);
    const { user, dialog } = await openSetTarget(authFetch);
    await user.click(within(dialog).getByRole("checkbox", { name: "Set for multiple people" }));

    const peopleInput = within(dialog).getByRole("combobox", { name: "People" });
    await user.click(peopleInput);
    await user.click(await screen.findByRole("option", { name: /Amy Able/ }));
    await user.click(peopleInput);
    await user.click(await screen.findByRole("option", { name: /Ben Baker/ }));

    fireEvent.change(within(dialog).getByLabelText("Mon"), { target: { value: "1" } });
    await user.click(within(dialog).getByRole("button", { name: "Set targets" }));

    await waitFor(() => {
      expect(authFetch).toHaveBeenCalledWith(
        expect.stringContaining("/targets/custom-targets/bulk"),
        expect.objectContaining({ method: "POST" }),
      );
    });
    expect(await within(dialog).findByText(/Ben Baker: Date range overlaps/)).toBeInTheDocument();
    const bulkCall = authFetch.mock.calls.find(([url]) => String(url).includes("/targets/custom-targets/bulk"));
    expect(JSON.parse(bulkCall[1].body)).toEqual({
      targets: [
        {
          person_id: "p1",
          days: { monday: 1, tuesday: 0, wednesday: 0, thursday: 0, friday: 0, saturday: 0, sunday: 0 },
          start_date: within(dialog).getByLabelText("Start date (Monday)").value,
          end_date: null,
          organization: "Active Church",
        },
        {
          person_id: "p2",
          days: { monday: 1, tuesday: 0, wednesday: 0, thursday: 0, friday: 0, saturday: 0, sunday: 0 },
          start_date: within(dialog).getByLabelText("Start date (Monday)").value,
          end_date: null,
          organization: "Active Church",
        },
      ],
    });
  });
});

describe("Weekly Review", () => {
  test("renders status text and icons, provisional tag, data notes, and filters results", async () => {
    const user = userEvent.setup();
    renderTargets({ authFetch: targetRoutes([], weeklyRows) });
    await user.click(screen.getByRole("tab", { name: "Weekly Review" }));

    expect(await screen.findByText("Amy Able")).toBeInTheDocument();
    expect(screen.getByText("Met")).toBeInTheDocument();
    expect(screen.getByText("Not met")).toBeInTheDocument();
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getByText("Provisional")).toBeInTheDocument();
    expect(screen.getByText("1 of 3 met target")).toBeInTheDocument();

    await user.click(screen.getByText("Data notes"));
    expect(screen.getByText(/excluded: 3\. Unmapped completed tasks: 2/)).toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: "Status" }));
    await user.click(screen.getByRole("option", { name: "Not met" }));
    expect(screen.getByText("Ben Baker")).toBeInTheDocument();
    expect(screen.queryByText("Amy Able")).not.toBeInTheDocument();
  });

  test("supports name search and the name sort selection", async () => {
    const user = userEvent.setup();
    renderTargets({ authFetch: targetRoutes([], weeklyRows) });
    await user.click(screen.getByRole("tab", { name: "Weekly Review" }));
    await screen.findByText("Amy Able");

    await user.type(screen.getByRole("textbox", { name: "Search" }), "Cy");
    expect(screen.getByText("Cy Cole")).toBeInTheDocument();
    expect(screen.queryByText("Amy Able")).not.toBeInTheDocument();

    await user.clear(screen.getByRole("textbox", { name: "Search" }));
    await user.click(screen.getByRole("combobox", { name: "Sort" }));
    await user.click(screen.getByRole("option", { name: "Name" }));
    expect(screen.getByText("Amy Able")).toBeInTheDocument();
  });
});
