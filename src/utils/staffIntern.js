/**
 * Staff & Intern Statistics — pure helpers.
 *
 * These functions contain the classification / weekly service-target logic that
 * powers the "Staff & Intern Statistics" section on the Stats page. They are
 * kept framework-free so they can be unit tested with node:test.
 *
 * Classification (`staffStatus`) lives on the People document. The weekly
 * Friday/Sunday targets live in the backend `service_targets` table and are
 * loaded per week via `/staff-intern/targets`.
 */

export const SERVICES = ["friday", "sunday"];

export const SERVICE_LABELS = {
  friday: "Friday Service",
  sunday: "Sunday Service",
};

/**
 * Role gate for the Staff & Intern section.
 * Only `admin` and `leader@12` (any spelling) may view or edit the data.
 * @param {object|null} user
 * @returns {boolean}
 */
export const canAccessStaffIntern = (user) => {
  if (!user) return false;
  const role = String(user.role || "")
    .toLowerCase()
    .replace(/[\s@_-]/g, "");
  // "leaderAt12" -> leaderat12, "leader@12" -> leader12
  return role === "admin" || role === "leaderat12" || role === "leader12";
};

/**
 * Coerce any value to a non-negative integer. Invalid / negative values become 0.
 * @param {*} value
 * @returns {number}
 */
export const toNonNegativeInt = (value) => {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || Number.isNaN(n) || n < 0) return 0;
  return n;
};

/**
 * Validate a single service-target payload.
 * @param {{service?: string, target?: *, actual?: *}} payload
 * @returns {{ valid: boolean, errors: string[] }}
 */
export const validateTargetPayload = (payload = {}) => {
  const errors = [];
  if (!SERVICES.includes(payload.service)) {
    errors.push("service must be one of friday|sunday");
  }
  for (const field of ["target", "actual"]) {
    if (payload[field] === undefined) continue;
    const n = Number(payload[field]);
    if (!Number.isInteger(n) || n < 0) {
      errors.push(`${field} must be a non-negative integer`);
    }
  }
  return { valid: errors.length === 0, errors };
};

/**
 * Turn the `/staff-intern/targets` response into a `{ personId: { service: {...} } }`
 * lookup.
 * @param {Array<object>} targets
 * @returns {Object<string, object>}
 */
export const buildTargetsByPerson = (targets = []) => {
  const byPerson = {};
  for (const t of targets) {
    const pid = t.person_id || t.personId;
    if (!pid || !SERVICES.includes(t.service)) continue;
    byPerson[pid] = byPerson[pid] || {};
    byPerson[pid][t.service] = {
      id: t.id ?? null,
      target: toNonNegativeInt(t.target),
      actual: toNonNegativeInt(t.actual),
      met: Boolean(t.met),
      closed: Boolean(t.closed),
      closedAt: t.closed_at ?? null,
      closedBy: t.closed_by ?? null,
    };
  }
  return byPerson;
};

const emptyServiceEntry = () => ({ target: 0, actual: 0, met: false, closed: false });

/**
 * Combine the Staff/Intern classification with the week's targets into the
 * shape used by the chart / totals / export.
 *
 * @param {Object<string, {type: string}>} marked
 * @param {Object<string, object>} targetsByPerson
 * @returns {Object<string, {type: string, friday: object, sunday: object}>}
 */
export const combineClassificationAndTargets = (marked = {}, targetsByPerson = {}) => {
  const out = {};
  for (const [pid, m] of Object.entries(marked)) {
    if (!m || (m.type !== "staff" && m.type !== "intern")) continue;
    const personTargets = targetsByPerson[pid] || {};
    out[pid] = { type: m.type };
    for (const service of SERVICES) {
      const t = personTargets[service];
      out[pid][service] = t
        ? {
            target: toNonNegativeInt(t.target),
            actual: toNonNegativeInt(t.actual),
            met: Boolean(t.met),
            closed: Boolean(t.closed),
          }
        : emptyServiceEntry();
    }
  }
  return out;
};

/**
 * Split the full people list into the unmarked list and the marked
 * Staff / Intern groups. Marked people are removed from the main list.
 * @param {Array<object>} people
 * @param {Object<string, {type: string}>} marked
 * @returns {{ unmarked: Array<object>, staff: Array<object>, intern: Array<object> }}
 */
export const splitPeopleByClassification = (people = [], marked = {}) => {
  const unmarked = [];
  const staff = [];
  const intern = [];
  for (const person of people) {
    const pid = person._id || person.id;
    const entry = pid ? marked[pid] : null;
    if (!entry || (entry.type !== "staff" && entry.type !== "intern")) {
      unmarked.push(person);
    } else if (entry.type === "staff") {
      staff.push(person);
    } else {
      intern.push(person);
    }
  }
  return { unmarked, staff, intern };
};

const emptyTotals = () => ({
  fridayTarget: 0,
  fridayActual: 0,
  sundayTarget: 0,
  sundayActual: 0,
});

const sumGroup = (entries, type) => {
  const totals = emptyTotals();
  for (const e of Object.values(entries)) {
    if (!e || e.type !== type) continue;
    totals.fridayTarget += toNonNegativeInt(e.friday?.target);
    totals.fridayActual += toNonNegativeInt(e.friday?.actual);
    totals.sundayTarget += toNonNegativeInt(e.sunday?.target);
    totals.sundayActual += toNonNegativeInt(e.sunday?.actual);
  }
  return totals;
};

/**
 * Build Chart.js-ready data for the Staff & Intern chart.
 *
 * X-axis: the service categories ("Friday Service", "Sunday Service").
 * Y-axis: the number.
 * Four dotted trend lines: Staff Target, Staff Actual, Intern Target,
 * Intern Actual. Staff lines are blue shades, Intern lines are red shades.
 *
 * @param {Object<string, object>} entries
 * @returns {{ labels: string[], datasets: Array<object> }}
 */
export const buildTargetVsActualChart = (entries = {}) => {
  const staff = sumGroup(entries, "staff");
  const intern = sumGroup(entries, "intern");

  const line = (label, data, color) => ({
    label,
    data,
    showLine: true,
    borderColor: color,
    backgroundColor: color,
    borderDash: [6, 6],
    borderWidth: 2,
    pointRadius: 8,
    pointHoverRadius: 11,
    pointBackgroundColor: color,
    pointBorderColor: "#fff",
    pointBorderWidth: 2,
    fill: false,
    tension: 0,
  });

  return {
    labels: [SERVICE_LABELS.friday, SERVICE_LABELS.sunday],
    datasets: [
      line("Staff Target", [staff.fridayTarget, staff.sundayTarget], "rgba(54,162,235,0.55)"),
      line("Staff Actual", [staff.fridayActual, staff.sundayActual], "rgba(54,162,235,1)"),
      line("Intern Target", [intern.fridayTarget, intern.sundayTarget], "rgba(255,99,132,0.55)"),
      line("Intern Actual", [intern.fridayActual, intern.sundayActual], "rgba(255,99,132,1)"),
    ],
  };
};

/**
 * Compute Target vs Actual totals and completion percentages per service.
 * @param {Object<string, object>} entries
 * @returns {{ friday: object, sunday: object }}
 */
export const computeTargetVsActual = (entries = {}) => {
  const pct = (actual, target) => (target > 0 ? Math.round((actual / target) * 100) : 0);
  const build = (service) => {
    let target = 0;
    let actual = 0;
    let closed = 0;
    let met = 0;
    for (const e of Object.values(entries)) {
      if (!e || !e[service]) continue;
      target += toNonNegativeInt(e[service].target);
      actual += toNonNegativeInt(e[service].actual);
      if (e[service].closed) closed += 1;
      if (e[service].closed && e[service].met) met += 1;
    }
    return { target, actual, percent: pct(actual, target), closed, met };
  };
  return { friday: build("friday"), sunday: build("sunday") };
};

const personName = (person = {}) => {
  const name = [person.Name || person.name, person.Surname || person.surname]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || person.Email || person.email || "";
};

/**
 * Build the rows for the Excel export.
 *
 * @param {Object<string, object>} entries combined classification + targets
 * @param {Object<string, object>} peopleById person lookup for names/emails
 * @param {Object<string, object>} services service metadata (dates)
 * @param {string} week week identifier
 * @returns {{ summary: Array<object>, detail: Array<object> }}
 */
export const buildTargetExport = (entries = {}, peopleById = {}, services = {}, week = "") => {
  const summary = [];
  for (const [service, meta] of Object.entries(services)) {
    const group = { staff: { target: 0, actual: 0 }, intern: { target: 0, actual: 0 } };
    for (const e of Object.values(entries)) {
      if (!e || !e[service]) continue;
      if (e.type === "staff" || e.type === "intern") {
        group[e.type].target += toNonNegativeInt(e[service].target);
        group[e.type].actual += toNonNegativeInt(e[service].actual);
      }
    }
    summary.push({
      Week: week,
      Service: meta?.label || SERVICE_LABELS[service] || service,
      Date: meta?.date || "",
      "Staff Target": group.staff.target,
      "Staff Actual": group.staff.actual,
      "Intern Target": group.intern.target,
      "Intern Actual": group.intern.actual,
    });
  }

  const detail = [];
  for (const [pid, e] of Object.entries(entries)) {
    if (!e) continue;
    const person = peopleById[pid] || {};
    for (const service of SERVICES) {
      const s = e[service] || emptyServiceEntry();
      detail.push({
        Week: week,
        Name: personName(person),
        Email: person.Email || person.email || "",
        Classification: e.type === "staff" ? "Staff" : "Intern",
        Service: SERVICE_LABELS[service],
        Target: toNonNegativeInt(s.target),
        Actual: toNonNegativeInt(s.actual),
        Status: s.closed ? (s.met ? "Met" : "Not met") : "Open",
      });
    }
  }
  return { summary, detail };
};

const classificationLabel = (type) => (type === "staff" ? "Staff" : type === "intern" ? "Intern" : "");

/**
 * Build Excel rows for a historical (date-range) list of target rows returned
 * by `GET /staff-intern/targets?start_date=&end_date=`.
 *
 * @param {Array<object>} history target rows (with `date`, `week_identifier`)
 * @param {Object<string, object>} peopleById person lookup for names/emails
 * @param {Object<string, {type: string}>} marked classification lookup
 * @returns {{ summary: Array<object>, detail: Array<object> }}
 */
export const buildHistoryExport = (history = [], peopleById = {}, marked = {}) => {
  const detail = [];
  const acc = {};
  for (const t of history) {
    const service = t.service;
    if (!SERVICE_LABELS[service]) continue;
    const person = peopleById[t.person_id] || {};
    const target = toNonNegativeInt(t.target);
    const actual = toNonNegativeInt(t.actual);
    const status = t.closed ? (t.met ? "Met" : "Not met") : "Open";
    detail.push({
      Date: t.date || "",
      Week: t.week_identifier || "",
      Name: personName(person) || t.leader_name || "",
      Email: person.Email || person.email || t.email || "",
      Classification: classificationLabel(marked[t.person_id]?.type),
      Service: SERVICE_LABELS[service],
      Target: target,
      Actual: actual,
      Status: status,
    });
    const a = acc[service] || (acc[service] = { target: 0, actual: 0, met: 0, notMet: 0, open: 0 });
    a.target += target;
    a.actual += actual;
    if (status === "Met") a.met += 1;
    else if (status === "Not met") a.notMet += 1;
    else a.open += 1;
  }
  const summary = Object.entries(acc).map(([service, a]) => ({
    Service: SERVICE_LABELS[service],
    Target: a.target,
    Actual: a.actual,
    Met: a.met,
    "Not met": a.notMet,
    Open: a.open,
  }));
  return { summary, detail };
};
