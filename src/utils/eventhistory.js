export const saveToEventHistory = ({
  eventId,
  service_name,
  eventType,
  status,
  attendees = [],
  reason = "",
  leader12 = "-",
  leader12_email = "-",
  userEmail = "",
  closedAt = "",
  // accept any additional fields
  ...otherFields
}) => {
  // Get current history from localStorage or default to empty array
  const currentHistory = JSON.parse(localStorage.getItem("eventHistory")) || [];

  // Create new event entry and merge any extra fields passed
  const newEntry = {
    eventId,
    service_name,
    eventType,
    status,
    attendees,
    reason,
    leader12,
    leader12_email,
    userEmail,
    closedAt,
    ...otherFields,
    timestamp: new Date().toISOString(),
  };

  // Add new entry to the history
  currentHistory.push(newEntry);

  // Save updated history back to localStorage
  localStorage.setItem("eventHistory", JSON.stringify(currentHistory));

  // Optional: emit event to notify listeners that history was updated
  window.dispatchEvent(new Event("eventHistoryUpdated"));

  console.log("Saved event history:", newEntry);
};
