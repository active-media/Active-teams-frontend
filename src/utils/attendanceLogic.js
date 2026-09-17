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
 * Builds the normalized attendance download rows for an event.
 * Unifies the previous duplicated implementations in Events.jsx:
 * - Every row carries the event Headcount.
 * - Ticketed events add Price Tier / Payment Method / Price / Paid / Owing.
 * - Ticketed events append a TOTAL row summing Price / Paid / Owing across the
 *   different price tiers.
 * @param {object} event - The full event object.
 * @param {{ getEventType?: (typeName: string) => object }} [opts]
 * @returns {object[]}
 */
export const normalizeEventAttendance = (event, opts = {}) => {
  if (!event) return [];

  const getEventType =
    typeof opts.getEventType === "function" ? opts.getEventType : () => undefined;
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

  const headcount = resolveHeadcount(event, eventDate);

  const rows = Array.from(peopleMap.values()).map((person) => {
    const row = {
      "Event Name": event.eventName || event["Event Name"] || "",
      "Event Type": eventTypeName,
      "Is Ticketed": isTicketed ? "Yes" : "No",
      "Event Date": eventDate,
      "Checked In": person.checkedIn ? "Yes" : "No",
      "Name": person.fullName || person.name || "",
      "Email": person.email || "",
      "Phone": person.phone || "",
      "Decision": person.decision || person.Decision || "",
      "Price Tier": person.priceTier || person.price_tier || person.PriceTier || "",
      "Event Leader Name": event.eventLeaderName || event.Leader || "",
      "Headcount": headcount,
    };

    if (hasLeaderHierarchy) {
      row["Leader @1"] = leaderAt1;
      row["Leader @12"] = leaderAt12;
      row["Leader @144"] = leaderAt144;
    }

    if (isTicketed) {
      row["Payment Method"] = person.paymentMethod || person.payment_method || "";
      row["Price"] =
        person.price !== undefined ? `R${Number(person.price).toFixed(2)}` : "";
      row["Paid"] =
        person.paid !== undefined ? `R${Number(person.paid).toFixed(2)}` : "";
      row["Owing"] =
        person.owing !== undefined ? `R${Number(person.owing).toFixed(2)}` : "";
    }

    return row;
  });

  if (isTicketed && rows.length > 0) {
    const totalsRow = {
      "Event Name": event.eventName || event["Event Name"] || "",
      "Event Type": eventTypeName,
      "Is Ticketed": "Yes",
      "Event Date": eventDate,
      "Checked In": "",
      "Name": "TOTAL",
      "Email": "",
      "Phone": "",
      "Decision": "",
      "Price Tier": "",
      "Event Leader Name": "",
      "Headcount": headcount,
    };
    if (hasLeaderHierarchy) {
      totalsRow["Leader @1"] = "";
      totalsRow["Leader @12"] = "";
      totalsRow["Leader @144"] = "";
    }
    totalsRow["Payment Method"] = "";
    totalsRow["Price"] = `R${numericFieldSum(rows, "Price").toFixed(2)}`;
    totalsRow["Paid"] = `R${numericFieldSum(rows, "Paid").toFixed(2)}`;
    totalsRow["Owing"] = `R${numericFieldSum(rows, "Owing").toFixed(2)}`;

    rows.push(totalsRow);
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
 * Picks which people appear in the exported attendance file:
 * - Non-ticketed events export the people who were checked in.
 * - Ticketed events also include every ticket holder — a person may pay for a
 *   ticket but not show up, and that money still counts.
 * @param {object[]} people - All associated people.
 * @param {string[]} checkedInIds - People currently checked in.
 * @param {{ isTicketedEvent: boolean, hasTicketInfo: (person) => boolean }} opts
 * @returns {object[]}
 */
export const pickDownloadPeople = (
  people,
  checkedInIds,
  { isTicketedEvent = false, hasTicketInfo = () => false } = {},
) => {
  const checked = new Set(checkedInIds || []);
  return (people || []).filter((person) => {
    if (!person || person.id == null) return false;
    if (!isTicketedEvent) return checked.has(person.id);
    return checked.has(person.id) || hasTicketInfo(person);
  });
};