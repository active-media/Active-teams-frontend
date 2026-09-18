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