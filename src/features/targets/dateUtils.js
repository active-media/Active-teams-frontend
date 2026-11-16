const DAY_MS = 24 * 60 * 60 * 1000;
const SAST_ZONE = "Africa/Johannesburg";

export function formatSastDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SAST_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function mondayOfWeek(dateString) {
  const date = new Date(`${dateString}T00:00:00Z`);
  const day = date.getUTCDay() || 7;
  return addDays(dateString, 1 - day);
}

export function lastCompletedWeekStart(today = formatSastDate()) {
  return addDays(mondayOfWeek(today), -7);
}

export function nextMonday(today = formatSastDate()) {
  const monday = mondayOfWeek(today);
  return monday === today ? monday : addDays(monday, 7);
}

export function isMonday(dateString) {
  if (!dateString) return false;
  return new Date(`${dateString}T00:00:00Z`).getUTCDay() === 1;
}

export function isSunday(dateString) {
  if (!dateString) return false;
  return new Date(`${dateString}T00:00:00Z`).getUTCDay() === 0;
}

export function weekRangeLabel(monday) {
  if (!monday || !isMonday(monday)) return "";
  const sunday = addDays(monday, 6);
  const format = (date) => new Intl.DateTimeFormat("en-ZA", {
    timeZone: SAST_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00Z`));
  return `${format(monday)} – ${format(sunday)} (SAST)`;
}

export function isoWeekId(date = new Date()) {
  const dateKey = formatSastDate(date);
  const value = new Date(`${dateKey}T00:00:00Z`);
  const day = value.getUTCDay() || 7;
  value.setUTCDate(value.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(value.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((value - yearStart) / DAY_MS + 1) / 7);
  return `${value.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function getRecentWeekStarts(count = 12, from = lastCompletedWeekStart()) {
  return Array.from({ length: count }, (_, index) => addDays(from, -7 * index));
}
