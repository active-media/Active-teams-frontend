import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  getEntryId,
  findPresentEntry,
  findNewPersonEntry,
  isNewOrFirstTimePerson,
  classifyToggleAdd,
  classifyToggleRemove,
  hasStatus,
  mergeFreshPersonData,
  newPeopleFromPresent,
  newIdentitySet,
  isNewInSet,
  saDateKey,
  saTodayKey,
  getPersonCreatedKey,
  isNewToday,
} from "../src/utils/serviceCheckinToggle.js";

// ── getEntryId ──────────────────────────────────────────────────────────────

describe("getEntryId", () => {
  test("returns the first present id key (id, _id, person_id)", () => {
    assert.equal(getEntryId({ id: "a" }), "a");
    assert.equal(getEntryId({ _id: "b" }), "b");
    assert.equal(getEntryId({ person_id: "c" }), "c");
    assert.equal(getEntryId({ id: "a", _id: "b", person_id: "c" }), "a");
    assert.equal(getEntryId(null), "");
    assert.equal(getEntryId({}), "");
  });
});

// ── findPresentEntry ────────────────────────────────────────────────────────

describe("findPresentEntry", () => {
  const present = [
    { id: "p1", name: "Amy" },
    { _id: "p2", name: "Bob" },
    { person_id: "p3", name: "Cid" },
  ];

  test("matches on any id key", () => {
    assert.equal(findPresentEntry(present, "p1").name, "Amy");
    assert.equal(findPresentEntry(present, "p2").name, "Bob");
    assert.equal(findPresentEntry(present, "p3").name, "Cid");
  });

  test("returns null when missing", () => {
    assert.equal(findPresentEntry(present, "nope"), null);
    assert.equal(findPresentEntry(present, ""), null);
    assert.equal(findPresentEntry(null, "p1"), null);
    assert.equal(findPresentEntry(present, null), null);
  });
});

// ── findNewPersonEntry ──────────────────────────────────────────────────────

describe("findNewPersonEntry", () => {
  const newPeople = [
    { id: "new_abc", email: "Amy@X.com", name: "Amy" },
    { _id: "person_1", email: "bob@x.com", name: "Bob" },
  ];

  test("matches a stored new-person entry by its own id", () => {
    assert.equal(findNewPersonEntry(newPeople, { _id: "new_abc" }).name, "Amy");
    assert.equal(findNewPersonEntry(newPeople, { id: "person_1" }).name, "Bob");
  });

  test("matches by email case-insensitively even when ids differ", () => {
    const match = findNewPersonEntry(newPeople, { _id: "dup_db_row", email: "amy@x.com" });
    assert.equal(match.name, "Amy");
  });

  test("prevents a duplicate new-person entry for the same person", () => {
    const existing = findNewPersonEntry(newPeople, { _id: "other", email: "AMY@X.COM" });
    assert.ok(existing);
  });

  test("returns null when no email/id overlap", () => {
    assert.equal(findNewPersonEntry(newPeople, { _id: "zz", email: "nobody@x.com" }), null);
    assert.equal(findNewPersonEntry(null, { _id: "zz" }), null);
    assert.equal(findNewPersonEntry(newPeople, null), null);
  });
});

// ── isNewOrFirstTimePerson ──────────────────────────────────────────────────

describe("isNewOrFirstTimePerson", () => {
  test("true for First Time / New stages and explicit isNew", () => {
    assert.equal(isNewOrFirstTimePerson({ stage: "First Time" }), true);
    assert.equal(isNewOrFirstTimePerson({ Stage: "first time" }), true);
    assert.equal(isNewOrFirstTimePerson({ _stage: "New" }), false);
    assert.equal(isNewOrFirstTimePerson({ stage: "new" }), true);
    assert.equal(isNewOrFirstTimePerson({ isNew: true }), true);
  });

  test("false for returning stages and empty values", () => {
    assert.equal(isNewOrFirstTimePerson({ stage: "Returning" }), false);
    assert.equal(isNewOrFirstTimePerson({ stage: "" }), false);
    assert.equal(isNewOrFirstTimePerson({}), false);
    assert.equal(isNewOrFirstTimePerson(null), false);
  });
});

// ── classifyToggleAdd ───────────────────────────────────────────────────────

describe("classifyToggleAdd", () => {
  test("2xx with success:true is a success", () => {
    assert.equal(classifyToggleAdd(200, { success: true }), "success");
  });

  test("server returns 'already checked in' in detail/message/error -> alreadyPresent", () => {
    assert.equal(classifyToggleAdd(400, { detail: "John is already checked in" }), "alreadyPresent");
    assert.equal(classifyToggleAdd(400, { message: "already checked in" }), "alreadyPresent");
    assert.equal(classifyToggleAdd(409, { error: "ALREADY CHECKED IN" }), "alreadyPresent");
  });

  test("other errors are failures", () => {
    assert.equal(classifyToggleAdd(500, { detail: "boom" }), "failure");
    assert.equal(classifyToggleAdd(400, {}), "failure");
    assert.equal(classifyToggleAdd(200, { success: false }), "failure");
    assert.equal(classifyToggleAdd(200, {}), "failure");
  });
});

// ── classifyToggleRemove ────────────────────────────────────────────────────

describe("classifyToggleRemove", () => {
  test("2xx with success:true is a success", () => {
    assert.equal(classifyToggleRemove(200, { success: true }), "success");
  });

  test("404 not-found responses are alreadyAbsent (uncapture accepted)", () => {
    assert.equal(classifyToggleRemove(404, { detail: "Person not found in specified list" }), "alreadyAbsent");
    assert.equal(classifyToggleRemove(404, { message: "not checked in" }), "alreadyAbsent");
    assert.equal(classifyToggleRemove(400, { error: "Person is not in the present list" }), "alreadyAbsent");
    assert.equal(classifyToggleRemove(404, { detail: "no longer present" }), "alreadyAbsent");
  });

  test("other errors are failures", () => {
    assert.equal(classifyToggleRemove(500, { detail: "boom" }), "failure");
    assert.equal(classifyToggleRemove(404, {}), "failure");
    assert.equal(classifyToggleRemove(400, { detail: "Invalid event ID" }), "failure");
    assert.equal(classifyToggleRemove(200, { success: false }), "failure");
  });
});

// ── hasStatus ───────────────────────────────────────────────────────────────

describe("hasStatus", () => {
  test("only 'failure' is a failure", () => {
    assert.equal(hasStatus("success"), true);
    assert.equal(hasStatus("alreadyPresent"), true);
    assert.equal(hasStatus("alreadyAbsent"), true);
    assert.equal(hasStatus("failure"), false);
  });
});

// ── mergeFreshPersonData ────────────────────────────────────────────────────

describe("mergeFreshPersonData", () => {
  test("merges person profile data onto a present entry", () => {
    const merged = mergeFreshPersonData(
      { id: "p1", name: "", email: "e@x.com", phone: "" },
      { name: "Amy", surname: "Smith", email: "amy@x.com", phone: "123", leader12: "Bob" }
    );
    assert.equal(merged.name, "Amy");
    assert.equal(merged.surname, "Smith");
    assert.equal(merged.email, "amy@x.com");
    assert.equal(merged.phone, "123");
    assert.equal(merged.leader12, "Bob");
    assert.equal(merged.id, "p1");
  });

  test("falls back to entry fields and handles a missing profile", () => {
    const merged = mergeFreshPersonData({ id: "p1", name: "Amy", surname: "Smith" }, null);
    assert.equal(merged.name, "Amy");
    assert.equal(merged.surname, "Smith");
    assert.equal(merged._id, "p1");
  });
});

// ── saDateKey / isNewToday ───────────────────────────────────────────────────

describe("saDateKey", () => {
  test("converts backend UTC timestamps to the Africa/Johannesburg date", () => {
    assert.equal(saDateKey("2026-09-20T07:00:00"), "2026-09-20");
    assert.equal(saDateKey("2026-09-20T22:00:00"), "2026-09-21");
  });

  test("handles plain dates, Date objects, and invalid inputs", () => {
    assert.equal(saDateKey("2026-09-20"), "2026-09-20");
    assert.equal(saDateKey(new Date("2026-09-20T09:00:00Z")), "2026-09-20");
    assert.equal(saDateKey(null), "");
    assert.equal(saDateKey(""), "");
    assert.equal(saDateKey("not-a-date"), "");
  });

  test("saTodayKey returns today's SA date", () => {
    assert.equal(saTodayKey(), saDateKey(new Date()));
  });
});

describe("getPersonCreatedKey / isNewToday", () => {
  const todayKey = "2026-09-20";

  test("reads DateCreated / created_at / createdAt fields", () => {
    assert.equal(getPersonCreatedKey({ DateCreated: "2026-09-20T07:00:00" }), "2026-09-20");
    assert.equal(getPersonCreatedKey({ created_at: "2026-09-20T07:00:00" }), "2026-09-20");
    assert.equal(getPersonCreatedKey({ createdAt: "2026-09-20T07:00:00" }), "2026-09-20");
    assert.equal(getPersonCreatedKey({}), "");
  });

  test("true only when the person was created today", () => {
    assert.equal(isNewToday({ DateCreated: "2026-09-20T07:00:00" }, todayKey), true);
    assert.equal(isNewToday({ created_at: "2026-09-20T21:30:00" }, todayKey), true);
  });

  test("false for people created on a previous service day", () => {
    assert.equal(isNewToday({ DateCreated: "2026-09-13T07:00:00" }, todayKey), false);
    assert.equal(isNewToday({ DateCreated: "2026-09-19T07:00:00" }, todayKey), false);
    assert.equal(isNewToday({}, todayKey), false);
    assert.equal(isNewToday({ stage: "First Time", isNew: true }, todayKey), false);
  });
});

// ── newPeopleFromPresent / per-service new set ─────────────────────────────

describe("newPeopleFromPresent", () => {
  const todayKey = "2026-09-20";
  const peopleById = new Map([
    // Amy: added today (genuinely new this service)
    ["p1", { name: "Amy", surname: "Smith", stage: "First Time", DateCreated: "2026-09-20T07:00:00" }],
    // Bob: was new LAST week, still at First Time stage, but record is older
    ["p2", { name: "Bob", surname: "Jones", stage: "First Time", DateCreated: "2026-09-13T07:00:00" }],
  ]);

  const present = [
    { id: "p1", name: "" },
    { id: "p2", name: "" },
    { id: "p3", name: "Cid", stage: "New", DateCreated: "2026-09-20T08:00:00" },
  ];

  test("counts only people whose record was created today when no new set is given", () => {
    const newPeople = newPeopleFromPresent(present, peopleById, null, todayKey);
    const names = newPeople.map((p) => `${p.name} ${p.surname}`).sort();
    assert.deepEqual(names, ["Amy Smith", "Cid "]);
  });

  test("people who were new last week are NOT counted today", () => {
    const newPeople = newPeopleFromPresent(present, peopleById, null, todayKey);
    assert.ok(!newPeople.some((p) => p.name === "Bob"));
  });

  test("is empty for a non-recurring/regular present list", () => {
    assert.deepEqual(
      newPeopleFromPresent([{ id: "p2" }], peopleById, null, todayKey).map((p) => p.name),
      []
    );
    assert.deepEqual(newPeopleFromPresent(null, peopleById, null, todayKey), []);
  });
});

describe("per-service new set", () => {
  const todayKey = "2026-09-20";

  test("newIdentitySet collects person ids and emails from new_people entries", () => {
    const set = newIdentitySet([
      { id: "n1", email: "neo@x.com" },
      { person_id: "n2", Email: "AMY@X.COM" },
      { id: "" },
    ]);
    assert.ok(set.ids.has("n1"));
    assert.ok(set.ids.has("n2"));
    assert.ok(set.emails.has("neo@x.com"));
    assert.ok(set.emails.has("amy@x.com"));
    assert.equal(set.ids.size, 2);
  });

  test("isNewInSet matches by id or email", () => {
    const set = newIdentitySet([{ id: "n1", email: "neo@x.com" }]);
    assert.equal(isNewInSet({ _id: "n1" }, set), true);
    assert.equal(isNewInSet({ id: "OTHER", email: "NEO@X.COM" }, set), true);
    assert.equal(isNewInSet({ _id: "zz", email: "x@y.com" }, set), false);
    assert.equal(isNewInSet(null, set), false);
  });

  test("Neo-style existing record (old, First Time) counts when present and in the new set", () => {
    const peopleById = new Map([
      // Neo is already on the system: record older than today, stage First Time
      ["NEO1", { name: "Neo", surname: "Khumalo", stage: "First Time", DateCreated: "2026-09-10T09:00:00" }],
      // Kamogelo: was new last week, NOT in today's new set
      ["KAM1", { name: "Kamogelo", surname: "Xaba", stage: "First Time", DateCreated: "2026-09-13T09:00:00" }],
    ]);
    const newSet = newIdentitySet([{ id: "NEO1", email: "neo@khumalo.com" }]);
    const present = [{ id: "NEO1", name: "" }, { id: "KAM1", name: "" }];

    const newPeople = newPeopleFromPresent(present, peopleById, newSet, todayKey);
    const names = newPeople.map((p) => `${p.name} ${p.surname}`).sort();
    assert.deepEqual(names, ["Neo Khumalo"]);
  });

  test("matching by email counts a present person even if the stored id differs", () => {
    const peopleById = new Map([
      ["REC1", { name: "Neo", surname: "Khumalo", stage: "First Time", email: "neo@khumalo.com", DateCreated: "2026-09-10T09:00:00" }],
    ]);
    const newSet = newIdentitySet([{ id: "OLDTOKEN", email: "neo@khumalo.com" }]);
    const newPeople = newPeopleFromPresent([{ id: "REC1", name: "" }], peopleById, newSet, todayKey);
    assert.deepEqual(newPeople.map((p) => `${p.name} ${p.surname}`), ["Neo Khumalo"]);
  });
});