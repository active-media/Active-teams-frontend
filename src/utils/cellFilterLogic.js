/**
 * Helpers for filtering and counting cells on the Stats dashboard.
 */

export const getCellStatus = (cell) => {
  if (!cell) return "incomplete";
  const status = (cell.status || cell.Status || "incomplete")
    .trim()
    .toLowerCase()
    .replace(/[ -]+/g, "_");

  if (["complete", "completed", "closed"].includes(status)) return "completed";
  if (["did_not_meet", "didnotmeet"].includes(status)) return "did_not_meet";
  return "incomplete";
};

export const isCellOverdue = (cell, todayStr = null) => {
  if (!cell) return false;
  const isTrueFlag = (value) =>
    value === true ||
    value === 1 ||
    (typeof value === "string" && value.trim().toLowerCase() === "true");

  if (
    getCellStatus(cell) !== "incomplete" ||
    isTrueFlag(cell.did_not_meet)
  ) {
    return false;
  }

  if (
    [cell.is_overdue, cell.isOverdue, cell._is_overdue].some(isTrueFlag)
  ) {
    return true;
  }

  // Compare calendar dates in the org's operating timezone (Africa/Johannesburg)
  const cellDay = cell.date
    ? new Date(cell.date).toLocaleDateString("en-CA", {
        timeZone: "Africa/Johannesburg",
      })
    : null;
  const currentTodayStr =
    todayStr ||
    new Date().toLocaleDateString("en-CA", {
      timeZone: "Africa/Johannesburg",
    });

  return !!cellDay && cellDay < currentTodayStr;
};

export const getCellLeader12 = (cell) => {
  if (!cell) return "";
  return String(
    cell.leader12 ||
    cell.leader_at_12 ||
    cell.leaderAt12 ||
    cell["Leader @12"] ||
    cell["Leader at 12"] ||
    ""
  ).trim();
};

export const extractCellPeople = (cells) => {
  const peopleSet = new Set();
  (cells || []).forEach((cell) => {
    const leaderName = cell.eventLeaderName?.trim();
    if (leaderName) peopleSet.add(leaderName);
    const leader12 = getCellLeader12(cell);
    if (leader12) peopleSet.add(leader12);
  });
  return [...peopleSet].sort((a, b) => a.localeCompare(b));
};

export const cellMatchesPerson = (cell, selectedPerson) => {
  if (!cell || !selectedPerson || selectedPerson === "all") return true;
  const target = selectedPerson.trim().toLowerCase();
  const leaderName = (cell.eventLeaderName || "").trim().toLowerCase();
  const leader12 = getCellLeader12(cell).toLowerCase();
  return leaderName === target || leader12 === target;
};

export const filterCells = (
  cells,
  { cellFilter = "all", selectedCellPerson = "all", isOverdueFn = isCellOverdue } = {},
) => {
  return (cells || [])
    .filter((cell) => {
      const status = getCellStatus(cell);
      const cellIsOverdue = isOverdueFn(cell);
      const matchesStatus =
        cellFilter === "all" ||
        (cellFilter === "overdue" && cellIsOverdue) ||
        (cellFilter === "incomplete" && status === "incomplete" && !cellIsOverdue) ||
        (cellFilter !== "overdue" && cellFilter !== "incomplete" && cellFilter === status);
      const matchesPerson = cellMatchesPerson(cell, selectedCellPerson);
      return matchesStatus && matchesPerson;
    })
    .sort((a, b) => {
      const dateA = a.date
        ? new Date(a.date).getTime()
        : Number.MAX_SAFE_INTEGER;
      const dateB = b.date
        ? new Date(b.date).getTime()
        : Number.MAX_SAFE_INTEGER;
      return dateB - dateA;
    });
};

export const computeCellFilterCounts = (
  cells,
  { selectedCellPerson = "all", isOverdueFn = isCellOverdue } = {},
) => {
  const peopleFiltered = (cells || []).filter((cell) =>
    cellMatchesPerson(cell, selectedCellPerson),
  );
  const count = (filter) => {
    if (filter === "all") return peopleFiltered.length;
    if (filter === "overdue") {
      return peopleFiltered.filter((cell) => isOverdueFn(cell)).length;
    }
    if (filter === "incomplete") {
      return peopleFiltered.filter(
        (cell) => getCellStatus(cell) === "incomplete" && !isOverdueFn(cell),
      ).length;
    }
    return peopleFiltered.filter((cell) => getCellStatus(cell) === filter).length;
  };

  return {
    all: count("all"),
    overdue: count("overdue"),
    incomplete: count("incomplete"),
    completed: count("completed"),
    didNotMeet: count("did_not_meet"),
  };
};
