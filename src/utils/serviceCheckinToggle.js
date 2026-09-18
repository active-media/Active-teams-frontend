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