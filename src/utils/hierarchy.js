// Single source of truth for working with an org's hierarchy and a person's leaders.
// Every screen should derive what levels/labels/labels to show from `getLevels(orgConfig)`
// and read/write leader names through these helpers, NOT hardcoded "leader1/leader12/...".

export const LEGACY_PATTERN = /^leader(\d+)$/;

export function getLevels(orgConfig) {
  const hierarchy = orgConfig?.hierarchy;
  if (Array.isArray(hierarchy) && hierarchy.length > 0) {
    const levels = [...hierarchy].sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
    return levels;
  }
  return [];
}

export function getLevelsWithLabels(orgConfig) {
  return getLevels(orgConfig).map((lv) => ({
    ...lv,
    key: lv.key || lv.field || "",
    label: lv.label || lv.key || lv.field || "",
  }));
}

// The most reliable lookup of a leader's value for a given level key on a person.
// Supports the canonical `leaders` object plus legacy flat fields during migration.
export function getLeaderValue(person, key) {
  if (!person || !key) return "";
  const val =
    person?.leaders?.[key] != null && person.leaders[key] !== ""
      ? person.leaders[key]
      : person?.[key];
  if (val == null) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  return "";
}

// All leader values for a person, in the org's hierarchy order.
// Returns [{ key, label, level, value }] skipping blanks.
export function getPersonLeaders(orgConfig, person) {
  const levels = getLevelsWithLabels(orgConfig);
  const out = [];
  for (const lv of levels) {
    const value = getLeaderValue(person, lv.key);
    if (value) out.push({ key: lv.key, label: lv.label, level: lv.level, value });
  }
  return out;
}

export function getPersonLeadersMap(orgConfig, person) {
  const map = {};
  for (const lv of getLevelsWithLabels(orgConfig)) {
    const value = getLeaderValue(person, lv.key);
    if (value) map[lv.key] = value;
  }
  return map;
}

export function getPersonLeadersCombined(orgConfig, person) {
  return getPersonLeaders(orgConfig, person)
    .map((l) => l.value)
    .join(" ");
}

// Best-effort label for a level, used in exports/headers (falls back to key).
export function labelForLevel(orgConfig, key) {
  const found = getLevels(orgConfig).find((lv) => (lv.key || lv.field) === key);
  return found?.label || found?.key || key || "";
}

// A person is a leader at any configured level if their name appears as a leader value
// for somebody else in the same org. `people` is optional (perf) — if omitted caller
// decides (returns false).
export function isLeaderInHierarchy(orgConfig, person, people = null) {
  if (!person || !people) return false;
  const names = [
    person.Name,
    person.name,
    person.fullName,
    person.Surname,
    getLeaderValue(person, ""),
  ]
    .filter(Boolean)
    .map((n) => String(n).trim().toLowerCase());
  if (names.length === 0) return false;
  for (const p of people) {
    for (const lv of getLevels(orgConfig)) {
      const v = getLeaderValue(p, lv.key).trim().toLowerCase();
      if (v && names.some((n) => v === n || v.startsWith(n.split(" ")[0]))) return true;
    }
  }
  return false;
}

// Top-level default used when an org hasn't configured anything yet (compat with today's G12 app).
export const DEFAULT_HIERARCHY = [
  { key: "leader1", field: "leader1", label: "Leader @1", level: 1 },
  { key: "leader12", field: "leader12", label: "Leader @12", level: 12 },
  { key: "leader144", field: "leader144", label: "Leader @144", level: 144 },
  { key: "leader1728", field: "leader1728", label: "Leader @1728", level: 1728 },
];