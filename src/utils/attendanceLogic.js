/**
 * Explore-headcount / attendance download logic shared by Events and AttendanceModal.
 * Kept dependency-free (pure functions) so it can be unit tested with `node --test`.
 */

const EXCLUDED_SERVICE_TYPES = [
  "cell",
  "cells",
  "all cells",
  "training",
  "trainings",
  "training session",
];

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Resolves the headcount for an event/download.
 * Priority: event.last_headcount ?? event.total_headcounts, then the per-date
 * attendance record's total_headcounts, then 0.
 * @param {object} event - The (full) event object.
 * @param {string} [eventDate] - The date key inside event.attendance.
 * @returns {number}
 */
export const resolveHeadcount = (event, eventDate) => {
  if (!event) return 0;
  return (
    (event.last_headcount ?? event.total_headcounts) ||
    (event.attendance &&
    typeof event.attendance === "object" &&
    event.attendance[eventDate]
      ? event.attendance[eventDate].total_headcounts || 0
      : 0) ||
    0
  );
};

/**
 * Sums a numeric column across rows, stripping currency prefixes/separators.
 * @param {object[]} rows - Row objects.
 * @param {string} field - Column key.
 * @param {{ strip?: string[] }} [opts]
 * @returns {number}
 */
export const numericFieldSum = (rows, field, { strip = ["R", ","] } = {}) =>
  (rows || []).reduce((sum, row) => {
    let raw =
      row && row[field] !== undefined && row[field] !== null
        ? String(row[field])
        : "";
    if (strip && strip.length) {
      strip.forEach((ch) => {
        raw = raw.replaceAll(ch, "");
      });
    }
    return sum + toNum(raw);
  }, 0);

/**
 * Column order for every attendance export row. All "Event ..." columns are
 * kept together at the front so the file reads Event Name / Event Type /
 * Event Date / Event Leader Name / Event Leader Email in one block.
 */
const BASE_ROW_KEYS = [
  "Event Name",
  "Event Type",
  "Event Date",
  "Event Leader Name",
  "Event Leader Email",
  "Is Ticketed",
  "Checked In",
  "Name",
  "Email",
  "Phone",
  "Decision",
  "Price Tier",
  "Headcount",
];

const LEADER_HIERARCHY_KEYS = ["Leader @1", "Leader @12", "Leader @144"];
const TICKETED_FINANCIAL_KEYS = ["Payment Method", "Price", "Paid", "Owing"];

/**
 * Builds the normalized attendance download rows for an event.
 * Unifies the previous duplicated implementations in Events.jsx:
 * - By default ONLY people who were actually checked in are exported (every
 *   row carries the event's Headcount). Pass `opts.includeEveryone: true` to
 *   export every associated person (checked-in + paid no-shows + registrants)
 *   so the money of people who bought tickets but never showed up still counts.
 * - ALL "Event ..." columns stay grouped together (Event Name / Event Type /
 *   Event Date / Event Leader Name / Event Leader Email) regardless of which
 *   fields happen to exist on the event.
 * - Ticketed events always include the Leader @1 / @12 / @144 columns, Price
 *   Tier / Payment Method / Price / Paid / Owing.
 * - Ticketed events append a TOTAL row (with the leading cells left blank as a
 *   visible space before the amount fields) summing Price / Paid / Owing.
 * @param {object} event - The full event object.
 * @param {{ getEventType?: (typeName: string) => object, includeEveryone?: boolean }} [opts]
 * @returns {object[]}
 */
export const normalizeEventAttendance = (event, opts = {}) => {
  if (!event) return [];

  const getEventType =
    typeof opts.getEventType === "function" ? opts.getEventType : () => undefined;
  const includeEveryone = opts.includeEveryone === true;
  const eventDate = event.date;
  const eventTypeName = event.eventType || event.event_type || event.type || "";
  const eventTypeObj = getEventType(eventTypeName);
  const isTicketed =
    eventTypeObj?.isTicketed === true ||
    event.isTicketed === true ||
    event.is_ticketed === true ||
    event.ticketed === true;

  const peopleMap = new Map();

  const addPeople = (list, checkedIn) => {
    if (!Array.isArray(list)) return;
    list.forEach((person) => {
      const key = person.email || person.fullName || person.name || Math.random();
      if (!peopleMap.has(key)) {
        peopleMap.set(key, { ...person, checkedIn });
      } else if (checkedIn) {
        peopleMap.set(key, { ...peopleMap.get(key), checkedIn: true });
      }
    });
  };

  if (event.attendance && typeof event.attendance === "object") {
    const dateAttendance = event.attendance[eventDate];
    if (dateAttendance?.attendees) addPeople(dateAttendance.attendees, true);
  }

  addPeople(event.attendees, true);
  addPeople(event.registrants, false);
  addPeople(event.registered, false);
  addPeople(event.invited, false);
  addPeople(event.members, false);
  addPeople(event.persistent_attendees, false);

  if (event.attendance_data) {
    addPeople(event.attendance_data.attendees, true);
    addPeople(event.attendance_data.registrants, false);
    addPeople(event.attendance_data.registered, false);
  }

  if (peopleMap.size === 0) return [];

  const leaderAt1 =
    event.leaderAt1 || event.leader_at_1 || event.leaderAt1Name || event.leader1 || "";
  const leaderAt12 =
    event.leaderAt12 || event.leader_at_12 || event.leaderAt12Name || event.leader12 || "";
  const leaderAt144 =
    event.leaderAt144 || event.leader_at_144 || event.leaderAt144Name || "";
  const hasLeaderHierarchy = leaderAt1 || leaderAt12 || leaderAt144;

  // Ticketed events always export the leader columns (a leader @12 may be set
  // even when the rest of the hierarchy is not).
  const includeLeaderColumns = hasLeaderHierarchy || isTicketed;

  const headcount = resolveHeadcount(event, eventDate);

  const rowKeys = [
    ...BASE_ROW_KEYS,
    ...(includeLeaderColumns ? LEADER_HIERARCHY_KEYS : []),
    ...(isTicketed ? TICKETED_FINANCIAL_KEYS : []),
  ];

  // Builds a row with the canonical column order; any value absent below
  // becomes an empty cell so every row (and the totals row) lines up.
  const makeRow = (values) => {
    const row = {};
    rowKeys.forEach((key) => {
      row[key] = values[key] !== undefined ? values[key] : "";
    });
    return row;
  };

  const rows = Array.from(peopleMap.values())
    .filter((person) => includeEveryone || person.checkedIn)
    .map((person) =>
      makeRow({
        "Event Name": event.eventName || event["Event Name"] || "",
        "Event Type": eventTypeName,
        "Event Date": eventDate,
        "Event Leader Name": event.eventLeaderName || event.Leader || "",
        "Event Leader Email":
          event.eventLeaderEmail ||
          event.event_leader_email ||
          event.leaderEmail ||
          event.leader_email ||
          "",
        "Is Ticketed": isTicketed ? "Yes" : "No",
        "Checked In": person.checkedIn ? "Yes" : "No",
        "Name": person.fullName || person.name || "",
        "Email": person.email || "",
        "Phone": person.phone || "",
        "Decision": person.decision || person.Decision || "",
        "Price Tier":
          person.priceTier ||
          person.price_tier ||
          person.PriceTier ||
          person.priceName ||
          person.PriceName ||
          "",
        // Headcount is filled once per export (see below) — it is an
        // event-level figure, not a per-person field.
        "Headcount": "",
        ...(includeLeaderColumns && {
          "Leader @1": leaderAt1,
          "Leader @12": leaderAt12,
          "Leader @144": leaderAt144,
        }),
        ...(isTicketed && {
          "Payment Method":
            person.paymentMethod || person.payment_method || "",
          "Price":
            person.price !== undefined ? `R${Number(person.price).toFixed(2)}` : "",
          "Paid":
            person.paid !== undefined ? `R${Number(person.paid).toFixed(2)}` : "",
          "Owing":
            person.owing !== undefined ? `R${Number(person.owing).toFixed(2)}` : "",
        }),
      }),
    );

  if (isTicketed && rows.length > 0) {
    // The totals row leaves the leading cells blank (a visible space before
    // the amount fields) and only fills the TOTAL label, headcount and sums.
    rows.push(
      makeRow({
        "Name": "TOTAL",
        "Headcount": headcount,
        "Price": `R${numericFieldSum(rows, "Price").toFixed(2)}`,
        "Paid": `R${numericFieldSum(rows, "Paid").toFixed(2)}`,
        "Owing": `R${numericFieldSum(rows, "Owing").toFixed(2)}`,
      }),
    );
  } else if (!isTicketed && rows.length > 0) {
    // Non-ticketed events have no TOTAL row, so the headcount lives on the
    // first row — still exactly one row per export.
    rows[0].Headcount = headcount;
  }

  return rows;
};

/**
 * Only sync check-ins to Service Check-In for events that appear there:
 * ticketed events and global events (services). Never cells / training, etc.
 * @param {object} [event]
 * @returns {boolean}
 */
export const shouldSyncServiceCheckIn = (event) => {
  if (!event) return false;
  const isTicketed = event.isTicketed === true || event.isTicketed === "true";
  const isGlobal = event.isGlobal === true || event.isGlobal === "true";
  const typeName = String(
    event.eventType || event.event_type || event.type || "",
  )
    .toLowerCase()
    .trim();
  const isExcluded = EXCLUDED_SERVICE_TYPES.some((type) =>
    typeName.includes(type),
  );
  return !isExcluded && (isTicketed || isGlobal);
};

/**
 * Headcount shown in the input on load: use the saved event headcount when one
 * exists, otherwise stay at zero. Never defaults to the checked-in count.
 * @param {number} headcount - Saved event headcount (0 when none).
 * @returns {string}
 */
export const presetHeadcountValue = (headcount) =>
  headcount > 0 ? String(headcount) : "0";

/**
 * Headcount used in exports: the explicitly edited value if any, otherwise the
 * number of people checked in.
 * @param {string|number} manualHeadcount
 * @param {number} checkedInCount
 * @returns {number}
 */
export const resolveDownloadHeadcount = (manualHeadcount, checkedInCount) => {
  if (manualHeadcount !== "" && manualHeadcount != null) {
    return Number(manualHeadcount) || 0;
  }
  return checkedInCount;
};

/**
 * Invoice-style subtotals for a ticketed event: sums the per-person financials
 * (price, paid, owing, change) the same way calculateFinancials does per row,
 * so the single subtotal row matches the numbers shown above it.
 * @param {object[]} people - People to total (e.g. the visible table rows).
 * @param {(person) => {price: any, paidAmount: any}} [getTicketInfo] - Resolves
 *   the ticket price + amount already paid for a person.
 * @returns {{ totalPrice: number, totalPaid: number, totalOwing: number, totalChange: number }}
 */
export const computeTicketSubtotals = (people, getTicketInfo) => {
  const toNumber = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const totals = { totalPrice: 0, totalPaid: 0, totalOwing: 0, totalChange: 0 };
  (people || []).forEach((person) => {
    const ticket = getTicketInfo ? getTicketInfo(person) || {} : person || {};
    const price = toNumber(ticket.price);
    const paidAmount = toNumber(ticket.paidAmount);
    totals.totalPrice += price;
    totals.totalPaid += paidAmount;
    if (paidAmount >= price) {
      totals.totalChange += paidAmount - price;
    } else if (paidAmount > 0) {
      totals.totalOwing += price - paidAmount;
    } else {
      totals.totalOwing += price;
    }
  });
  return totals;
};

/**
 * Picks which people appear in the exported attendance file.
 * - Default: only people who were actually checked in are exported — a
 *   ticketed event no longer includes ticket holders who paid but never
 *   showed up, because the attendance file is expected to reflect the people
 *   present (their money is still tracked separately in the finance flows).
 * - `includeEveryone: true` exports every associated person (checked-in people
 *   plus paid no-shows and registrants) with all columns/fields filled.
 * @param {object[]} people - All associated people.
 * @param {string[]} checkedInIds - People currently checked in.
 * @param {{ includeEveryone?: boolean }} [opts]
 * @returns {object[]}
 */
export const pickDownloadPeople = (
  people,
  checkedInIds,
  { includeEveryone = false } = {},
) => {
  const checked = new Set(checkedInIds || []);
  return (people || []).filter((person) => {
    if (!person || person.id == null) return false;
    if (includeEveryone) return true;
    return checked.has(person.id);
  });
};
