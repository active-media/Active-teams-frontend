import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  canAccessStaffIntern,
  toNonNegativeInt,
  validateTargetPayload,
  buildTargetsByPerson,
  combineClassificationAndTargets,
  splitPeopleByClassification,
  buildTargetVsActualChart,
  computeTargetVsActual,
  buildTargetExport,
} from "../src/utils/staffIntern.js";

// ── canAccessStaffIntern ────────────────────────────────────────────────────

describe("canAccessStaffIntern", () => {
  test("allows admin and leader@12 spellings only", () => {
    assert.equal(canAccessStaffIntern({ role: "admin" }), true);
    assert.equal(canAccessStaffIntern({ role: "leaderAt12" }), true);
    assert.equal(canAccessStaffIntern({ role: "leader@12" }), true);
    assert.equal(canAccessStaffIntern({ role: "leader at 12" }), true);
  });

  test("rejects everyone else", () => {
    for (const role of ["user", "leader", "registrant", ""]) {
      assert.equal(canAccessStaffIntern({ role }), false, `role=${role}`);
    }
    assert.equal(canAccessStaffIntern(null), false);
    assert.equal(canAccessStaffIntern(undefined), false);
  });
});

// ── toNonNegativeInt ────────────────────────────────────────────────────────

describe("toNonNegativeInt", () => {
  test("parses valid numbers", () => {
    assert.equal(toNonNegativeInt(5), 5);
    assert.equal(toNonNegativeInt("7"), 7);
    assert.equal(toNonNegativeInt(0), 0);
  });

  test("clamps invalid / negative to 0", () => {
    assert.equal(toNonNegativeInt(-3), 0);
    assert.equal(toNonNegativeInt("abc"), 0);
    assert.equal(toNonNegativeInt(null), 0);
    assert.equal(toNonNegativeInt(undefined), 0);
    assert.equal(toNonNegativeInt(2.5), 2);
  });
});

// ── validateTargetPayload ───────────────────────────────────────────────────

describe("validateTargetPayload", () => {
  test("accepts a valid friday/sunday payload", () => {
    assert.equal(validateTargetPayload({ service: "friday", target: 3, actual: 2 }).valid, true);
    assert.equal(validateTargetPayload({ service: "sunday", target: 0, actual: 0 }).valid, true);
  });

  test("rejects a bad service", () => {
    assert.equal(validateTargetPayload({ service: "monday", target: 1 }).valid, false);
  });

  test("rejects negative / non-integer values", () => {
    assert.equal(validateTargetPayload({ service: "friday", target: -1 }).valid, false);
    assert.equal(validateTargetPayload({ service: "friday", actual: 1.5 }).valid, false);
    assert.equal(validateTargetPayload({ service: "friday", actual: "abc" }).valid, false);
  });
});

// ── buildTargetsByPerson ────────────────────────────────────────────────────

describe("buildTargetsByPerson", () => {
  test("indexes target rows by person and service", () => {
    const byPerson = buildTargetsByPerson([
      { person_id: "p1", service: "friday", target: 5, actual: 4, met: false, closed: true },
      { person_id: "p1", service: "sunday", target: 2, actual: 2, met: true, closed: true },
    ]);
    assert.equal(byPerson.p1.friday.target, 5);
    assert.equal(byPerson.p1.friday.closed, true);
    assert.equal(byPerson.p1.sunday.met, true);
  });

  test("ignores unknown services and missing ids", () => {
    const byPerson = buildTargetsByPerson([
      { person_id: "p1", service: "monday", target: 1 },
      { service: "friday", target: 1 },
    ]);
    assert.deepEqual(byPerson, {});
  });
});

// ── combineClassificationAndTargets ─────────────────────────────────────────

describe("combineClassificationAndTargets", () => {
  test("merges classification with targets and defaults missing services to 0", () => {
    const entries = combineClassificationAndTargets(
      { p1: { type: "staff" }, p2: { type: "intern" }, p3: { type: "none" } },
      { p1: { friday: { target: 5, actual: 3, met: false, closed: true } } },
    );
    assert.deepEqual(Object.keys(entries).sort(), ["p1", "p2"]);
    assert.equal(entries.p1.friday.target, 5);
    assert.equal(entries.p1.friday.closed, true);
    assert.equal(entries.p1.sunday.target, 0);
    assert.equal(entries.p2.friday.target, 0);
    assert.equal(entries.p2.type, "intern");
  });
});

// ── splitPeopleByClassification ─────────────────────────────────────────────

describe("splitPeopleByClassification", () => {
  const people = [
    { _id: "1", Name: "Alice" },
    { _id: "2", Name: "Bob" },
    { _id: "3", Name: "Carol" },
  ];

  test("keeps unmarked people in the main list and separates staff & intern", () => {
    const marked = { "1": { type: "staff" }, "2": { type: "intern" } };
    const { unmarked, staff, intern } = splitPeopleByClassification(people, marked);
    assert.deepEqual(unmarked.map(p => p._id), ["3"]);
    assert.deepEqual(staff.map(p => p._id), ["1"]);
    assert.deepEqual(intern.map(p => p._id), ["2"]);
  });

  test("treats 'none' classification as unmarked", () => {
    const { unmarked } = splitPeopleByClassification(people, { "1": { type: "none" } });
    assert.equal(unmarked.length, 3);
  });
});

// ── computeTargetVsActual ───────────────────────────────────────────────────

describe("computeTargetVsActual", () => {
  test("sums targets/actuals and computes percentages", () => {
    const totals = computeTargetVsActual({
      a: { type: "staff", friday: { target: 10, actual: 5 }, sunday: { target: 4, actual: 4 } },
      b: { type: "staff", friday: { target: 10, actual: 5 }, sunday: { target: 0, actual: 0 } },
    });
    assert.equal(totals.friday.target, 20);
    assert.equal(totals.friday.actual, 10);
    assert.equal(totals.friday.percent, 50);
    assert.equal(totals.sunday.percent, 100);
  });

  test("counts closed and met targets", () => {
    const totals = computeTargetVsActual({
      a: { type: "staff", friday: { target: 1, actual: 1, closed: true, met: true } },
      b: { type: "intern", friday: { target: 1, actual: 0, closed: true, met: false } },
    });
    assert.equal(totals.friday.closed, 2);
    assert.equal(totals.friday.met, 1);
  });

  test("avoids divide-by-zero when there is no target", () => {
    const totals = computeTargetVsActual({ a: { type: "intern", friday: { target: 0, actual: 3 } } });
    assert.equal(totals.friday.percent, 0);
  });
});

// ── buildTargetVsActualChart ────────────────────────────────────────────────

describe("buildTargetVsActualChart", () => {
  test("builds four dotted lines (Target/Actual per group) over service categories", () => {
    const entries = {
      "1": { type: "staff", friday: { target: 5, actual: 3 }, sunday: { target: 2, actual: 2 } },
      "2": { type: "intern", friday: { target: 1, actual: 1 }, sunday: { target: 1, actual: 0 } },
    };
    const chart = buildTargetVsActualChart(entries);
    assert.deepEqual(chart.labels, ["Friday Service", "Sunday Service"]);
    assert.equal(chart.datasets.length, 4);

    assert.equal(chart.datasets[0].label, "Staff Target");
    assert.deepEqual(chart.datasets[0].data, [5, 2]);
    assert.equal(chart.datasets[1].label, "Staff Actual");
    assert.deepEqual(chart.datasets[1].data, [3, 2]);
    assert.equal(chart.datasets[2].label, "Intern Target");
    assert.deepEqual(chart.datasets[2].data, [1, 1]);
    assert.equal(chart.datasets[3].label, "Intern Actual");
    assert.deepEqual(chart.datasets[3].data, [1, 0]);

    for (const ds of chart.datasets) {
      assert.equal(ds.showLine, true);
      assert.deepEqual(ds.borderDash, [6, 6]);
    }
    assert.notEqual(chart.datasets[0].borderColor, chart.datasets[2].borderColor);
  });

  test("ignores missing/unclassified entries and defaults fields to 0", () => {
    const chart = buildTargetVsActualChart({ "9": { type: "none" } });
    assert.deepEqual(chart.datasets.map((d) => d.data), [[0, 0], [0, 0], [0, 0], [0, 0]]);
  });
});

// ── buildTargetExport ───────────────────────────────────────────────────────

describe("buildTargetExport", () => {
  test("builds a summary and a per-person detail sheet", () => {
    const entries = {
      p1: { type: "staff", friday: { target: 5, actual: 3, closed: true, met: false }, sunday: { target: 2, actual: 2, closed: false, met: false } },
      p2: { type: "intern", friday: { target: 1, actual: 4, closed: true, met: true }, sunday: { target: 0, actual: 0 } },
    };
    const peopleById = { p1: { _id: "p1", Name: "Alice", Surname: "A", Email: "a@x.com" } };
    const services = {
      friday: { label: "Friday Service", date: "2026-10-09" },
      sunday: { label: "Sunday Service", date: "2026-10-11" },
    };
    const { summary, detail } = buildTargetExport(entries, peopleById, services, "2026-W41");

    assert.equal(summary.length, 2);
    const friday = summary.find((r) => r.Service === "Friday Service");
    assert.equal(friday["Staff Target"], 5);
    assert.equal(friday["Staff Actual"], 3);
    assert.equal(friday["Intern Target"], 1);
    assert.equal(friday["Intern Actual"], 4);

    assert.equal(detail.length, 4); // 2 people x 2 services
    const aliceFriday = detail.find((r) => r.Name === "Alice A" && r.Service === "Friday Service");
    assert.equal(aliceFriday.Classification, "Staff");
    assert.equal(aliceFriday.Target, 5);
    assert.equal(aliceFriday.Status, "Not met");
    const bobFriday = detail.find((r) => r.Service === "Friday Service" && r.Classification === "Intern");
    assert.equal(bobFriday.Status, "Met");
  });

  test("handles empty input", () => {
    const { summary, detail } = buildTargetExport({}, {}, {}, "2026-W41");
    assert.deepEqual(summary, []);
    assert.deepEqual(detail, []);
  });
});
