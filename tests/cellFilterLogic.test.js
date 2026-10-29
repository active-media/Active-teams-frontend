import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  getCellStatus,
  isCellOverdue,
  filterCells,
  computeCellFilterCounts,
  getCellLeader12,
  extractCellPeople,
  cellMatchesPerson,
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

describe("getCellLeader12", () => {
  test("extracts leader_at_12 across varying field keys", () => {
    assert.equal(getCellLeader12({ leader12: "Pastor David" }), "Pastor David");
    assert.equal(getCellLeader12({ leader_at_12: "Pastor Kenny" }), "Pastor Kenny");
    assert.equal(getCellLeader12({ leaderAt12: "Leader Grace" }), "Leader Grace");
    assert.equal(getCellLeader12({ "Leader @12": "Bishop John" }), "Bishop John");
    assert.equal(getCellLeader12({ "Leader at 12": "Elder Paul" }), "Elder Paul");
  });

  test("returns empty string if missing", () => {
    assert.equal(getCellLeader12(null), "");
    assert.equal(getCellLeader12({}), "");
  });
});

describe("extractCellPeople", () => {
  test("includes cell leader_at_12 even if they don't have cells as event_leader", () => {
    const cells = [
      { eventLeaderName: "Alice", leader12: "Overseer Bob" },
      { eventLeaderName: "Charlie", leader12: "Overseer Bob" },
      { eventLeaderName: "Dana", leader_at_12: "Pastor Evans" },
    ];

    const people = extractCellPeople(cells);
    // Overseer Bob and Pastor Evans do not have cells as eventLeaderName, but MUST be included
    assert.deepEqual(people, [
      "Alice",
      "Charlie",
      "Dana",
      "Overseer Bob",
      "Pastor Evans",
    ]);
  });

  test("deduplicates person who is both eventLeaderName and leader_at_12", () => {
    const cells = [
      { eventLeaderName: "Alice", leader12: "Bob" },
      { eventLeaderName: "Bob", leader12: "Charlie" },
    ];

    const people = extractCellPeople(cells);
    assert.deepEqual(people, ["Alice", "Bob", "Charlie"]);
  });
});

describe("cellMatchesPerson", () => {
  test("matches when person is the eventLeaderName", () => {
    const cell = { eventLeaderName: "Alice", leader12: "Overseer Bob" };
    assert.equal(cellMatchesPerson(cell, "Alice"), true);
  });

  test("matches when person is the cell leader_at_12", () => {
    const cell = { eventLeaderName: "Alice", leader12: "Overseer Bob" };
    assert.equal(cellMatchesPerson(cell, "Overseer Bob"), true);
  });

  test("is case-insensitive and trims whitespace", () => {
    const cell = { eventLeaderName: "Alice Smith", leader12: "Bob Jones" };
    assert.equal(cellMatchesPerson(cell, "  alice smith  "), true);
    assert.equal(cellMatchesPerson(cell, "BOB JONES"), true);
  });

  test("returns false for non-matching person", () => {
    const cell = { eventLeaderName: "Alice", leader12: "Bob" };
    assert.equal(cellMatchesPerson(cell, "Charlie"), false);
  });

  test("returns true when filter is 'all' or empty", () => {
    const cell = { eventLeaderName: "Alice", leader12: "Bob" };
    assert.equal(cellMatchesPerson(cell, "all"), true);
    assert.equal(cellMatchesPerson(cell, ""), true);
    assert.equal(cellMatchesPerson(cell, null), true);
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
      leader12: "Overseer Bob",
    },
    {
      _id: "c2",
      eventName: "Flagged Overdue Cell",
      date: "2026-10-29",
      status: "incomplete",
      is_overdue: true,
      eventLeaderName: "Leader Dave",
      leader12: "Overseer Bob",
    },
    {
      _id: "c3",
      eventName: "Today Incomplete Cell (Not Overdue)",
      date: "2026-10-28",
      status: "incomplete",
      eventLeaderName: "Leader Alice",
      leader12: "Overseer Bob",
    },
    {
      _id: "c4",
      eventName: "Future Incomplete Cell (Not Overdue)",
      date: "2026-10-30",
      status: "incomplete",
      eventLeaderName: "Leader Charlie",
      leader12: "Pastor Evans",
    },
    {
      _id: "c5",
      eventName: "Completed Cell",
      date: "2026-10-10",
      status: "completed",
      eventLeaderName: "Leader Alice",
      leader12: "Overseer Bob",
    },
    {
      _id: "c6",
      eventName: "Did Not Meet Cell",
      date: "2026-10-12",
      status: "did_not_meet",
      eventLeaderName: "Leader Dave",
      leader12: "Overseer Bob",
    },
    {
      _id: "c7",
      eventName: "Bob's Own Cell",
      date: "2026-10-28",
      status: "incomplete",
      eventLeaderName: "Overseer Bob",
      leader12: "Bishop Frank",
    },
  ];

  test("incomplete tab EXCLUDES overdue cells", () => {
    const result = filterCells(sampleCells, {
      cellFilter: "incomplete",
      isOverdueFn: customIsOverdue,
    });

    const ids = result.map((c) => c._id);
    // c3, c4, c7 are non-overdue incomplete
    assert.deepEqual(ids.sort(), ["c3", "c4", "c7"]);

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

  test("all tab returns all cells", () => {
    const result = filterCells(sampleCells, {
      cellFilter: "all",
      isOverdueFn: customIsOverdue,
    });

    assert.equal(result.length, 7);
  });

  test("person filter matches cells where selected person is leader_at_12", () => {
    // Overseer Bob is leader_at_12 for c1, c2, c3, c5, c6 AND eventLeader for c7
    const result = filterCells(sampleCells, {
      cellFilter: "all",
      selectedCellPerson: "Overseer Bob",
      isOverdueFn: customIsOverdue,
    });

    const ids = result.map((c) => c._id);
    assert.deepEqual(ids.sort(), ["c1", "c2", "c3", "c5", "c6", "c7"]);
  });

  test("person filter for leader_at_12 with incomplete tab excludes overdue cells under that leader", () => {
    const result = filterCells(sampleCells, {
      cellFilter: "incomplete",
      selectedCellPerson: "Overseer Bob",
      isOverdueFn: customIsOverdue,
    });

    const ids = result.map((c) => c._id);
    // Overseer Bob has c3 (Alice, today) and c7 (Bob, today).
    // c1 (past) and c2 (flagged overdue) must be excluded!
    assert.deepEqual(ids.sort(), ["c3", "c7"]);
  });

  test("person filter matches direct event leader", () => {
    const result = filterCells(sampleCells, {
      cellFilter: "all",
      selectedCellPerson: "Leader Charlie",
      isOverdueFn: customIsOverdue,
    });

    const ids = result.map((c) => c._id);
    assert.deepEqual(ids, ["c4"]);
  });
});

describe("computeCellFilterCounts", () => {
  const referenceToday = "2026-10-28";
  const customIsOverdue = (cell) => isCellOverdue(cell, referenceToday);

  const sampleCells = [
    { _id: "c1", status: "incomplete", date: "2026-10-15", eventLeaderName: "Alice", leader12: "Bob" }, // overdue
    { _id: "c2", status: "incomplete", date: "2026-10-28", eventLeaderName: "Alice", leader12: "Bob" }, // incomplete (today)
    { _id: "c3", status: "incomplete", date: "2026-10-30", eventLeaderName: "Charlie", leader12: "David" },   // incomplete (future)
    { _id: "c4", status: "completed",  date: "2026-10-10", eventLeaderName: "Alice", leader12: "Bob" }, // completed
    { _id: "c5", status: "did_not_meet", date: "2026-10-11", eventLeaderName: "Charlie", leader12: "David" }, // did_not_meet
  ];

  test("counts correctly respect leader_at_12 person filter", () => {
    // Bob is leader12 for c1, c2, c4
    const counts = computeCellFilterCounts(sampleCells, {
      selectedCellPerson: "Bob",
      isOverdueFn: customIsOverdue,
    });

    assert.equal(counts.all, 3);
    assert.equal(counts.overdue, 1);    // c1
    assert.equal(counts.incomplete, 1); // c2
    assert.equal(counts.completed, 1);  // c4
    assert.equal(counts.didNotMeet, 0);

    assert.equal(
      counts.overdue + counts.incomplete + counts.completed + counts.didNotMeet,
      counts.all,
    );
  });
});
