import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  getCellStatus,
  isCellOverdue,
  filterCells,
  computeCellFilterCounts,
} from "../src/utils/cellFilterLogic.js";

describe("getCellStatus", () => {
  test("returns incomplete for empty or undefined input", () => {
    assert.equal(getCellStatus(null), "incomplete");
    assert.equal(getCellStatus(undefined), "incomplete");
    assert.equal(getCellStatus({}), "incomplete");
  });

  test("identifies completed variations", () => {
    assert.equal(getCellStatus({ status: "complete" }), "completed");
    assert.equal(getCellStatus({ status: "Completed" }), "completed");
    assert.equal(getCellStatus({ Status: "closed" }), "completed");
  });

  test("identifies did_not_meet variations", () => {
    assert.equal(getCellStatus({ status: "did_not_meet" }), "did_not_meet");
    assert.equal(getCellStatus({ status: "did-not-meet" }), "did_not_meet");
    assert.equal(getCellStatus({ Status: "DIDNOTMEET" }), "did_not_meet");
  });

  test("defaults to incomplete for anything else", () => {
    assert.equal(getCellStatus({ status: "pending" }), "incomplete");
    assert.equal(getCellStatus({ status: "incomplete" }), "incomplete");
  });
});

describe("isCellOverdue", () => {
  const referenceToday = "2026-10-28";

  test("returns true when is_overdue or isOverdue is explicitly true", () => {
    assert.equal(isCellOverdue({ is_overdue: true }, referenceToday), true);
    assert.equal(isCellOverdue({ isOverdue: true }, referenceToday), true);
  });

  test("returns false for completed cells even if past date", () => {
    assert.equal(
      isCellOverdue(
        { status: "completed", date: "2026-10-01" },
        referenceToday,
      ),
      false,
    );
  });

  test("returns false for did_not_meet cells even if past date", () => {
    assert.equal(
      isCellOverdue(
        { status: "did_not_meet", date: "2026-10-01" },
        referenceToday,
      ),
      false,
    );
  });

  test("returns true for incomplete cell scheduled before today", () => {
    assert.equal(
      isCellOverdue(
        { status: "incomplete", date: "2026-10-20" },
        referenceToday,
      ),
      true,
    );
  });

  test("returns false for incomplete cell scheduled today or in future", () => {
    assert.equal(
      isCellOverdue(
        { status: "incomplete", date: "2026-10-28" },
        referenceToday,
      ),
      false,
    );
    assert.equal(
      isCellOverdue(
        { status: "incomplete", date: "2026-11-05" },
        referenceToday,
      ),
      false,
    );
  });

  test("returns false if cell has no date", () => {
    assert.equal(
      isCellOverdue({ status: "incomplete" }, referenceToday),
      false,
    );
  });
});

describe("filterCells and incomplete tab filtering", () => {
  const referenceToday = "2026-10-28";
  const customIsOverdue = (cell) => isCellOverdue(cell, referenceToday);

  const sampleCells = [
    {
      _id: "c1",
      eventName: "Past Incomplete Cell (Overdue)",
      date: "2026-10-15",
      status: "incomplete",
      eventLeaderName: "Leader Alice",
    },
    {
      _id: "c2",
      eventName: "Flagged Overdue Cell",
      date: "2026-10-29",
      status: "incomplete",
      is_overdue: true,
      eventLeaderName: "Leader Bob",
    },
    {
      _id: "c3",
      eventName: "Today Incomplete Cell (Not Overdue)",
      date: "2026-10-28",
      status: "incomplete",
      eventLeaderName: "Leader Alice",
    },
    {
      _id: "c4",
      eventName: "Future Incomplete Cell (Not Overdue)",
      date: "2026-10-30",
      status: "incomplete",
      eventLeaderName: "Leader Charlie",
    },
    {
      _id: "c5",
      eventName: "Completed Cell",
      date: "2026-10-10",
      status: "completed",
      eventLeaderName: "Leader Alice",
    },
    {
      _id: "c6",
      eventName: "Did Not Meet Cell",
      date: "2026-10-12",
      status: "did_not_meet",
      eventLeaderName: "Leader Bob",
    },
  ];

  test("incomplete tab EXCLUDES overdue cells", () => {
    const result = filterCells(sampleCells, {
      cellFilter: "incomplete",
      isOverdueFn: customIsOverdue,
    });

    const ids = result.map((c) => c._id);
    // Should contain c3 (today) and c4 (future)
    assert.deepEqual(ids.sort(), ["c3", "c4"]);

    // Should NOT contain c1 (past incomplete) or c2 (flagged overdue)
    assert.equal(ids.includes("c1"), false);
    assert.equal(ids.includes("c2"), false);
  });

  test("overdue tab returns only overdue cells", () => {
    const result = filterCells(sampleCells, {
      cellFilter: "overdue",
      isOverdueFn: customIsOverdue,
    });

    const ids = result.map((c) => c._id);
    assert.deepEqual(ids.sort(), ["c1", "c2"]);
  });

  test("completed tab returns only completed cells", () => {
    const result = filterCells(sampleCells, {
      cellFilter: "completed",
      isOverdueFn: customIsOverdue,
    });

    const ids = result.map((c) => c._id);
    assert.deepEqual(ids, ["c5"]);
  });

  test("did_not_meet tab returns only did_not_meet cells", () => {
    const result = filterCells(sampleCells, {
      cellFilter: "did_not_meet",
      isOverdueFn: customIsOverdue,
    });

    const ids = result.map((c) => c._id);
    assert.deepEqual(ids, ["c6"]);
  });

  test("all tab returns all cells", () => {
    const result = filterCells(sampleCells, {
      cellFilter: "all",
      isOverdueFn: customIsOverdue,
    });

    assert.equal(result.length, 6);
  });

  test("person filter works in conjunction with incomplete filter", () => {
    const result = filterCells(sampleCells, {
      cellFilter: "incomplete",
      selectedCellPerson: "Leader Alice",
      isOverdueFn: customIsOverdue,
    });

    const ids = result.map((c) => c._id);
    // Only c3 belongs to Alice and is non-overdue incomplete
    assert.deepEqual(ids, ["c3"]);
  });

  test("sorts cells descending by date", () => {
    const result = filterCells(sampleCells, {
      cellFilter: "all",
      isOverdueFn: customIsOverdue,
    });

    const dates = result.map((c) => c.date);
    for (let i = 0; i < dates.length - 1; i++) {
      assert.ok(new Date(dates[i]) >= new Date(dates[i + 1]));
    }
  });
});

describe("computeCellFilterCounts", () => {
  const referenceToday = "2026-10-28";
  const customIsOverdue = (cell) => isCellOverdue(cell, referenceToday);

  const sampleCells = [
    { _id: "c1", status: "incomplete", date: "2026-10-15", eventLeaderName: "Alice" }, // overdue
    { _id: "c2", status: "incomplete", date: "2026-10-28", eventLeaderName: "Alice" }, // incomplete (today)
    { _id: "c3", status: "incomplete", date: "2026-10-30", eventLeaderName: "Bob" },   // incomplete (future)
    { _id: "c4", status: "completed",  date: "2026-10-10", eventLeaderName: "Alice" }, // completed
    { _id: "c5", status: "did_not_meet", date: "2026-10-11", eventLeaderName: "Bob" }, // did_not_meet
  ];

  test("counts are mutually exclusive and sum to total", () => {
    const counts = computeCellFilterCounts(sampleCells, {
      isOverdueFn: customIsOverdue,
    });

    assert.equal(counts.all, 5);
    assert.equal(counts.overdue, 1);
    assert.equal(counts.incomplete, 2); // Only c2 and c3, c1 is overdue!
    assert.equal(counts.completed, 1);
    assert.equal(counts.didNotMeet, 1);

    assert.equal(
      counts.overdue + counts.incomplete + counts.completed + counts.didNotMeet,
      counts.all,
    );
  });

  test("counts correctly respect selected person filter", () => {
    const counts = computeCellFilterCounts(sampleCells, {
      selectedCellPerson: "Alice",
      isOverdueFn: customIsOverdue,
    });

    assert.equal(counts.all, 3);
    assert.equal(counts.overdue, 1);     // c1
    assert.equal(counts.incomplete, 1);  // c2
    assert.equal(counts.completed, 1);   // c4
    assert.equal(counts.didNotMeet, 0);
  });
});
