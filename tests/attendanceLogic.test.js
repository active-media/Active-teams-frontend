import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeEventAttendance,
  resolveHeadcount,
  numericFieldSum,
  computeTicketSubtotals,
  pickDownloadPeople,
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

    assert.equal(rows[0].Headcount, ""); // headcount only lives on the TOTAL row
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
      attendees: [{ email: "e@x.com", name: "Eve", price: 99 }],
    };
    const rows = normalizeEventAttendance(event, {
      getEventType: (name) => (name === "Camp" ? { isTicketed: true } : undefined),
    });
    assert.equal(rows[0].Price, "R99.00");
    assert.equal(rows[0]["Price Tier"], "");
    assert.equal(rows[rows.length - 1].Name, "TOTAL");
  });

  test("people who were never checked in are excluded from the download", () => {
    const event = {
      date: "2026-09-13",
      eventName: "Gala",
      isTicketed: true,
      attendees: [{ email: "a@x.com", name: "Amy" }],
      registrants: [
        { email: "a@x.com", name: "Amy" }, // same person, deduped
        { email: "n@x.com", name: "Noah", price: 300 }, // paid but never showed
      ],
    };
    const rows = normalizeEventAttendance(event);
    const dataRows = rows.filter((r) => r.Name !== "TOTAL");
    assert.equal(dataRows.length, 1);
    assert.equal(dataRows[0].Name, "Amy");
    assert.equal(dataRows[0]["Checked In"], "Yes");
    assert.ok(!rows.some((r) => r.Name === "Noah"));
  });

  test("includeEveryone exports paid no-shows too and totals their money", () => {
    const event = {
      date: "2026-09-13",
      eventName: "Gala",
      isTicketed: true,
      attendees: [{ email: "a@x.com", name: "Amy", price: 150, paid: 150 }],
      registrants: [
        { email: "a@x.com", name: "Amy" }, // same person, deduped
        { email: "n@x.com", name: "Noah", price: 300, paid: 300, priceTier: "Gold" },
      ],
    };
    const rows = normalizeEventAttendance(event, { includeEveryone: true });
    const dataRows = rows.filter((r) => r.Name !== "TOTAL");
    assert.equal(dataRows.length, 2);
    const amy = dataRows.find((r) => r.Name === "Amy");
    const noah = dataRows.find((r) => r.Name === "Noah");
    assert.equal(amy["Checked In"], "Yes");
    assert.equal(noah["Checked In"], "No");
    assert.equal(noah["Price Tier"], "Gold");
    assert.equal(noah.Price, "R300.00");
    const total = rows[rows.length - 1];
    assert.equal(total.Name, "TOTAL");
    assert.equal(total.Price, "R450.00"); // 150 + 300: everyone's money counts
    assert.equal(total.Paid, "R450.00");
  });

  test("ticketed event always exports the Leader at 12 column even without a hierarchy", () => {
    const event = {
      date: "2026-09-13",
      eventName: "Gala",
      isTicketed: true,
      attendees: [{ email: "a@x.com", name: "Amy" }],
    };
    const rows = normalizeEventAttendance(event);
    assert.equal(rows[0]["Leader @12"], "");
    assert.equal(rows[0]["Leader @1"], "");
    assert.equal(rows[0]["Leader @144"], "");
    assert.ok("Leader @12" in rows[0]);
  });

  test("all Event... columns are grouped together at the front of the row", () => {
    const event = {
      date: "2026-09-13",
      eventName: "Gala",
      eventType: "Gala",
      isTicketed: true,
      eventLeaderName: "Lea",
      eventLeaderEmail: "lea@x.com",
      attendees: [{ email: "a@x.com", name: "Amy" }],
    };
    const keys = Object.keys(normalizeEventAttendance(event)[0]);
    const eventKeys = keys.filter((k) => k.toLowerCase().startsWith("event"));
    const leaderIdx = keys.indexOf("Leader @12");
    // The whole event block comes first, nothing event-y appears after "Name".
    assert.deepEqual(eventKeys, [
      "Event Name",
      "Event Type",
      "Event Date",
      "Event Leader Name",
      "Event Leader Email",
    ]);
    assert.equal(leaderIdx, 14); // ...after the 13 base columns, right before Leader @12
    assert.equal(keys[0], "Event Name");
    assert.equal(keys[1], "Event Type");
  });

  test("the TOTAL row leaves a space before the amount fields", () => {
    const event = {
      date: "2026-09-13",
      eventName: "Gala",
      isTicketed: true,
      attendees: [{ email: "a@x.com", name: "Amy", price: 150, paid: 150 }],
    };
    const total = normalizeEventAttendance(event).slice(-1)[0];
    assert.equal(total.Name, "TOTAL");
    assert.equal(total["Event Name"], ""); // blank space before the label
    assert.equal(total["Event Date"], "");
    assert.equal(total["Is Ticketed"], "");
    assert.equal(total.Price, "R150.00");
    assert.equal(total.Headcount, 0);
  });

  test("headcount is filled on exactly one row", () => {
    const base = {
      date: "2026-09-13",
      eventName: "Svc",
      total_headcounts: 45, // the stipulated "45 heads found"
      attendees: [
        { email: "a@x.com", name: "Amy" },
        { email: "b@x.com", name: "Ben" },
      ],
    };

    // Ticketed: the TOTAL row carries it, every person row stays blank.
    const ticketed = normalizeEventAttendance({ ...base, isTicketed: true });
    const filled = ticketed.filter((r) => r.Headcount !== "");
    assert.equal(filled.length, 1);
    assert.equal(filled[0].Name, "TOTAL");
    assert.equal(filled[0].Headcount, 45);

    // Non-ticketed (no TOTAL row): the first row carries it, the rest blank.
    const plain = normalizeEventAttendance(base);
    const plainFilled = plain.filter((r) => r.Headcount !== "");
    assert.equal(plainFilled.length, 1);
    assert.equal(plainFilled[0].Name, "Amy");
    assert.equal(plainFilled[0].Headcount, 45);
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
  test("presetHeadcountValue stays at zero when no saved headcount", () => {
    assert.equal(presetHeadcountValue(0), "0");
    assert.equal(presetHeadcountValue(12), "12");
  });

  test("resolveDownloadHeadcount uses the edited value when present", () => {
    assert.equal(resolveDownloadHeadcount("", 5), 5);
    assert.equal(resolveDownloadHeadcount(null, 5), 5);
    assert.equal(resolveDownloadHeadcount("7", 5), 7);
    assert.equal(resolveDownloadHeadcount(0, 5), 0);
    assert.equal(resolveDownloadHeadcount("abc", 5), 0);
  });
});

// ── computeTicketSubtotals ─────────────────────────────────────────────────

describe("computeTicketSubtotals", () => {
  const people = [
    { id: 1, price: 150, paidAmount: 150 },
    { id: 2, price: 350, paidAmount: 100 },
    { id: 3, price: 250, paidAmount: 250 }, // fully paid
    { id: 4, price: 100 }, // unpaid -> owing the full price
    { id: 5, price: 80, paidAmount: 100 }, // over-paid -> change 20
  ];

  test("sums price/paid/owing/change across people like an invoice subtotal", () => {
    const totals = computeTicketSubtotals(people, (p) => ({
      price: p.price,
      paidAmount: p.paidAmount ?? 0,
    }));
    assert.equal(totals.totalPrice, 930); // 150+350+250+100+80
    assert.equal(totals.totalPaid, 600); // 150+100+250+0+100
    assert.equal(totals.totalOwing, 350); // 0+250+0+100+0
    assert.equal(totals.totalChange, 20); // 0+0+0+0+20
  });

  test("uses the row object directly when no getter is provided", () => {
    const totals = computeTicketSubtotals([
      { price: "100", paidAmount: "40" },
      { price: 50 },
    ]);
    assert.equal(totals.totalPrice, 150);
    assert.equal(totals.totalPaid, 40);
    assert.equal(totals.totalOwing, 110); // 60 + 50
    assert.equal(totals.totalChange, 0);
  });

  test("handles empty input", () => {
    assert.deepEqual(computeTicketSubtotals([], () => ({})), {
      totalPrice: 0,
      totalPaid: 0,
      totalOwing: 0,
      totalChange: 0,
    });
  });
});

// ── pickDownloadPeople ─────────────────────────────────────────────────────

describe("pickDownloadPeople", () => {
  const people = [
    { id: "a", name: "Checked in" },
    { id: "b", name: "Paid, no-show" },
    { id: "c", name: "Free, no ticket" },
    null,
  ];
  const checkedInIds = ["a"];

  test("non-ticketed: only checked-in people are exported", () => {
    const picked = pickDownloadPeople(people, checkedInIds);
    assert.deepEqual(picked.map((p) => p.id), ["a"]);
  });

  test("ticketed: only checked-in people are exported (paid no-shows are excluded)", () => {
    const picked = pickDownloadPeople(people, checkedInIds);
    assert.deepEqual(picked.map((p) => p.id), ["a"]);
  });

  test("includeEveryone exports all associated people", () => {
    const picked = pickDownloadPeople(people, checkedInIds, {
      includeEveryone: true,
    });
    assert.deepEqual(picked.map((p) => p.id), ["a", "b", "c"]);
  });

  test("empty input is safe", () => {
    assert.deepEqual(pickDownloadPeople([], []), []);
  });
});

// ── resolveHeadcount (direct) ───────────────────────────────────────────────

describe("resolveHeadcount", () => {
  test("empty / missing event -> 0", () => {
    assert.equal(resolveHeadcount(), 0);
  });
});