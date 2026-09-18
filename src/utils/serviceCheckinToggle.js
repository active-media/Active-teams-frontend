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

export function newPeopleFromPresent(presentAttendees, peopleById) {
  if (!Array.isArray(presentAttendees)) return [];
  return presentAttendees
    .map((a) => mergeFreshPersonData(a, peopleById && peopleById.get ? peopleById.get(a.id || a._id) : null))
    .filter((p) => isNewOrFirstTimePerson(p));
}