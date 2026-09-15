import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeEventAttendance,
  resolveHeadcount,
  numericFieldSum,
  shouldSyncServiceCheckIn,
  presetHeadcountValue,
  resolveDownloadHeadcount,
} from "../src/utils/attendanceLogic.js";

// ── normalizeEventAttendance ────────────────────────────────────────────────

describe("normalizeEventAttendance", () => {
  test("returns [] for empty input", () => {
    assert.deepEqual(normalizeEventAttendance(null), []);
    assert.deepEqual(normalizeEventAttendance(undefined), []);
  });

  test("returns [] when no people are tied to the event", () => {
    const rows = normalizeEventAttendance({ date: "2026-09-13", eventName: "Svc" });
    assert.deepEqual(rows, []);
  });

  test("dedupes a person across checked-in and registrant lists (checked in wins)", () => {
    const event = {
      date: "2026-09-13",
      eventName: "Sunday Service",
      eventType: "Service",
      attendance: {
        "2026-09-13": { attendees: [{ email: "a@x.com", name: "Amy", checkedIn: true }] },
      },
      registrants: [{ email: "a@x.com", name: "Amy" }],
    };
    const rows = normalizeEventAttendance(event);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].Name, "Amy");
    assert.equal(rows[0]["Checked In"], "Yes");
  });

  test("headcount falls back to the per-date attendance total_headcounts", () => {
    const event = {
      date: "2026-09-13",
      eventName: "Svc",
      attendance: {
        "2026-09-13": { total_headcounts: 42, attendees: [{ email: "a@x.com", name: "Amy" }] },
      },
    };
    const rows = normalizeEventAttendance(event);
    assert.equal(rows[0].Headcount, 42);
  });

  test("headcount priority: last_headcount > total_headcounts > attendance record > 0", () => {
    const mk = (extra) => ({
      date: "2026-09-13",
      eventName: "Svc",
      attendance: {
        "2026-09-13": { total_headcounts: 10, attendees: [{ email: "a@x.com", name: "Amy" }] },
      },
      ...extra,
    });
    assert.equal(normalizeEventAttendance(mk({}))[0].Headcount, 10);
    assert.equal(
      normalizeEventAttendance(mk({ total_headcounts: 20 }))[0].Headcount,
      20,
    );
    assert.equal(
      normalizeEventAttendance(mk({ last_headcount: 33 }))[0].Headcount,
      33,
    );
    assert.equal(
      normalizeEventAttendance(mk({ last_headcount: 0, total_headcounts: 0 }))[0].Headcount,
      10,
    );
    const none = normalizeEventAttendance({
      date: "2026-09-13",
      eventName: "Svc",
      attendees: [{ email: "a@x.com", name: "Amy" }],
    });
    assert.equal(none[0].Headcount, 0);
  });

  test("ticketed event: correct ticketed columns and a TOTAL row summing the price tiers", () => {
    const event = {
      date: "2026-09-13",
      eventName: "Gala",
      eventType: "Ticketed Event",
      isTicketed: true,
      attendees: [
        { email: "b@x.com", name: "Bob", priceTier: "Gold", price: 150, paid: 150, owing: 0 },
        { email: "c@x.com", name: "Chloe", priceTier: "Platinum", price: 350, paid: 100, owing: 250 },
        { email: "d@x.com", name: "Dan", priceTier: "Silver", price: 250, paid: 250, owing: 0, paymentMethod: "EFT" },
      ],
    };
    const rows = normalizeEventAttendance(event);

    const dataRows = rows.filter((r) => r.Name !== "TOTAL");
    assert.equal(dataRows.length, 3);

    assert.equal(rows[0].Headcount, 0);
    assert.equal(rows[0]["Price Tier"], "Gold");
    assert.equal(rows[0].Price, "R150.00");
    assert.equal(rows[0].Paid, "R150.00");
    assert.equal(rows[1]["Price Tier"], "Platinum");
    assert.equal(rows[1].Price, "R350.00");
    assert.equal(rows[1].Owing, "R250.00");

    const total = rows[rows.length - 1];
    assert.equal(total.Name, "TOTAL");
    assert.equal(total.Headcount, 0);
    assert.equal(total.Price, "R750.00"); // 150 + 350 + 250 across the tiers
    assert.equal(total.Paid, "R500.00"); // 150 + 100 + 250
    assert.equal(total.Owing, "R250.00"); // 0 + 250 + 0
  });

  test("ticketed detection also works through the event-type matcher", () => {
    const event = {
      date: "2026-09-13",
      eventName: "Camp",
      eventType: "Camp",
      registrants: [{ email: "e@x.com", name: "Eve", price: 99 }],
    };
    const rows = normalizeEventAttendance(event, {
      getEventType: (name) => (name === "Camp" ? { isTicketed: true } : undefined),
    });
    assert.equal(rows[0].Price, "R99.00");
    assert.equal(rows[rows.length - 1].Name, "TOTAL");
  });

  test("non-ticketed event: no TOTAL row and no Price/Paid/Owing fields", () => {
    const event = {
      date: "2026-09-13",
      eventName: "Cell",
      eventType: "Cell",
      leader1: "Lead A",
      leader12: "Lead B",
      attendees: [{ email: "f@x.com", name: "Finn" }],
    };
    const rows = normalizeEventAttendance(event);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]["Leader @1"], "Lead A");
    assert.equal(rows[0]["Leader @12"], "Lead B");
    assert.equal(rows[0].Price, undefined);
    assert.equal(rows[0].Paid, undefined);
    assert.ok(!rows.some((r) => r.Name === "TOTAL"));
  });

  test("person with a missing price still counts, and totals ignore it", () => {
    const event = {
      date: "2026-09-13",
      eventName: "Gala",
      isTicketed: true,
      attendees: [
        { email: "g@x.com", name: "Gus", price: 100 },
        { email: "h@x.com", name: "Hal", price: 1 },
        { email: "i@x.com", name: "Ivy" },
      ],
    };
    const rows = normalizeEventAttendance(event);
    assert.equal(rows[0].Price, "R100.00");
    assert.equal(rows[1].Price, "R1.00");
    assert.equal(rows[2].Price, "");
    assert.equal(rows[rows.length - 1].Price, "R101.00");
  });
});

// ── numericFieldSum ─────────────────────────────────────────────────────────

describe("numericFieldSum", () => {
  test("strips R prefix and thousand separators", () => {
    const rows = [
      { "Price (R)": "R1,500.00" },
      { "Price (R)": "R250.50" },
      { "Price (R)": "" },
      { "Price (R)": "abc" },
    ];
    assert.equal(numericFieldSum(rows, "Price (R)"), 1750.5);
  });

  test("handles numeric and missing values", () => {
    const rows = [{ Price: 5 }, { Price: "7" }, {}];
    assert.equal(numericFieldSum(rows, "Price"), 12);
  });

  test("with stripping disabled, non-numeric values contribute 0", () => {
    const rows = [{ v: "1,5" }, { v: "2,5" }];
    assert.equal(numericFieldSum(rows, "v", { strip: [] }), 0);
  });
});

// ── shouldSyncServiceCheckIn ────────────────────────────────────────────────

describe("shouldSyncServiceCheckIn", () => {
  test("no event / plain event -> false", () => {
    assert.equal(shouldSyncServiceCheckIn(), false);
    assert.equal(shouldSyncServiceCheckIn({ eventName: "Cell", eventType: "Cell" }), false);
  });

  test("ticketed events (bool or string) -> true", () => {
    assert.equal(shouldSyncServiceCheckIn({ isTicketed: true }), true);
    assert.equal(shouldSyncServiceCheckIn({ isTicketed: "true" }), true);
  });

  test("global events (bool or string true) -> true", () => {
    assert.equal(shouldSyncServiceCheckIn({ isGlobal: true, eventType: "Service" }), true);
    assert.equal(shouldSyncServiceCheckIn({ isGlobal: "true", eventType: "Service" }), true);
  });

  test("global events that are cell/training types -> false (never sync those)", () => {
    assert.equal(
      shouldSyncServiceCheckIn({ isGlobal: true, eventType: "Cells" }),
      false,
    );
    assert.equal(
      shouldSyncServiceCheckIn({ isGlobal: "true", eventType: "All Cells" }),
      false,
    );
    assert.equal(
      shouldSyncServiceCheckIn({ isGlobal: true, eventType: "Training Session" }),
      false,
    );
  });

  test("ticketed but type is excluded -> false", () => {
    assert.equal(
      shouldSyncServiceCheckIn({ isTicketed: true, eventType: "Cell" }),
      false,
    );
  });
});

// ── headcount helpers ───────────────────────────────────────────────────────

describe("headcount helpers", () => {
  test("presetHeadcountValue defaults to attendees when no saved headcount", () => {
    assert.equal(presetHeadcountValue(0, 5), "5");
    assert.equal(presetHeadcountValue(0, 0), "0");
    assert.equal(presetHeadcountValue(12, 5), "12");
  });

  test("resolveDownloadHeadcount uses the edited value when present", () => {
    assert.equal(resolveDownloadHeadcount("", 5), 5);
    assert.equal(resolveDownloadHeadcount(null, 5), 5);
    assert.equal(resolveDownloadHeadcount("7", 5), 7);
    assert.equal(resolveDownloadHeadcount(0, 5), 0);
    assert.equal(resolveDownloadHeadcount("abc", 5), 0);
  });
});

// ── resolveHeadcount (direct) ───────────────────────────────────────────────

describe("resolveHeadcount", () => {
  test("empty / missing event -> 0", () => {
    assert.equal(resolveHeadcount(), 0);
  });
});