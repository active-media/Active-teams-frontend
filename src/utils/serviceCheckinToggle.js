export function getEntryId(entry) {
  return entry ? (entry.id || entry._id || entry.person_id || "") : "";
}

export function findPresentEntry(presentAttendees, gridId) {
  if (!gridId || !Array.isArray(presentAttendees)) return null;
  return presentAttendees.find((a) => getEntryId(a) === gridId) || null;
}

export function findNewPersonEntry(newPeople, person) {
  if (!person || !Array.isArray(newPeople)) return null;
  const id = person._id || person.id;
  const email = String(person.email || "").toLowerCase().trim();
  return (
    newPeople.find((np) => {
      const npId = getEntryId(np);
      if (id && npId === id) return true;
      if (email) {
        const npEmail = String(np.email || np.person_email || "").toLowerCase().trim();
        if (npEmail === email) return true;
      }
      return false;
    }) || null
  );
}

export function isNewOrFirstTimePerson(person) {
  if (!person) return false;
  if (person.isNew === true) return true;
  const stage = String(person.stage || person.Stage || "").toLowerCase().trim();
  return stage === "new" || stage.includes("first time");
}

export function saDateKey(input) {
  if (!input) return "";
  let ms;
  if (input instanceof Date) ms = input.getTime();
  else if (typeof input === "number") ms = input;
  else {
    let s = String(input);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) s += "T00:00:00+00:00";
    else if (!/Z$|[+-]\d{2}:\d{2}$/.test(s)) s += "Z";
    ms = new Date(s).getTime();
  }
  if (Number.isNaN(ms)) return "";
  return new Date(ms + 2 * 3600 * 1000).toISOString().slice(0, 10);
}

export function saTodayKey() {
  return saDateKey(new Date());
}

export function getPersonCreatedKey(person) {
  if (!person) return "";
  return saDateKey(
    person.DateCreated || person.created_at || person.createdAt || person.CreatedAt || ""
  );
}

export function isNewToday(person, todayKey) {
  const key = getPersonCreatedKey(person);
  if (!key) return false;
  return key === (todayKey || saTodayKey());
}

export function classifyToggleAdd(status, body = {}) {
  const msg = String(body.detail || body.message || body.error || "").toLowerCase();
  if (status >= 200 && status < 300) {
    return body.success === true ? "success" : "failure";
  }
  return msg.includes("already") ? "alreadyPresent" : "failure";
}

export function classifyToggleRemove(status, body = {}) {
  const msg = String(body.detail || body.message || body.error || "").toLowerCase();
  if (status >= 200 && status < 300) {
    return body.success === true ? "success" : "failure";
  }
  if (
    msg.includes("not found") ||
    msg.includes("not in") ||
    msg.includes("not checked in") ||
    msg.includes("no longer")
  ) {
    return "alreadyAbsent";
  }
  return "failure";
}

export function hasStatus(status) {
  return status !== "failure";
}

export function mergeFreshPersonData(entry, person) {
  const fp = person || {};
  return {
    ...entry,
    ...fp,
    name: fp.name || entry.name || "",
    surname: fp.surname || entry.surname || "",
    email: fp.email || entry.email || "",
    phone: fp.phone || entry.phone || "",
    leader1: fp.leader1 || entry.leader1 || "",
    leader12: fp.leader12 || entry.leader12 || "",
    leader144: fp.leader144 || entry.leader144 || "",
    id: entry.id || entry._id,
    _id: entry.id || entry._id,
  };
}

export function newPeopleFromPresent(presentAttendees, peopleById, newSet, todayKey) {
  if (!Array.isArray(presentAttendees)) return [];
  const tk = todayKey || saTodayKey();
  return presentAttendees
    .map((a) => mergeFreshPersonData(a, peopleById && peopleById.get ? peopleById.get(a.id || a._id) : null))
    .filter((p) => (newSet ? isNewInSet(p, newSet) : isNewToday(p, tk)));
}

export function newIdentitySet(entries) {
  const ids = new Set();
  const emails = new Set();
  (Array.isArray(entries) ? entries : []).forEach((e) => {
    const id = getEntryId(e);
    if (id) ids.add(id);
    const email = String(e.email || e.Email || e.person_email || "").toLowerCase().trim();
    if (email) emails.add(email);
  });
  return { ids, emails };
}

export function isNewInSet(person, newSet) {
  if (!person || !newSet) return false;
  const id = String(person._id || person.id || "").trim();
  const email = String(person.email || "").toLowerCase().trim();
  return (id && newSet.ids.has(id)) || (email && newSet.emails.has(email));
}