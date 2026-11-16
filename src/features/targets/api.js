import { API_BASE } from "../../api/config";

const TARGETS_BASE = `${API_BASE}/targets`;
const CUSTOM_TARGETS_BASE = `${TARGETS_BASE}/custom-targets`;

const statusMessages = {
  400: "Check the target values and eligibility, then try again.",
  403: "You do not have permission to perform this action.",
  404: "The requested target or person could not be found.",
  409: "This target conflicts with an existing active date range.",
};

function queryString(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });
  const value = query.toString();
  return value ? `?${value}` : "";
}

function parseFilename(header) {
  if (!header) return null;
  const encoded = header.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded.replace(/"/g, ""));
    } catch {
      return encoded.replace(/"/g, "");
    }
  }
  return header.match(/filename="?([^";]+)"?/i)?.[1] || null;
}

async function errorFromResponse(response) {
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    const body = await response.text().catch(() => "");
    if (body) payload = { detail: body };
  }

  const detail = payload?.detail;
  let message;
  if (typeof detail === "string" && detail.trim()) {
    message = detail;
  } else if (detail && typeof detail === "object" && !Array.isArray(detail)) {
    message = detail.message || detail.detail || JSON.stringify(detail);
  } else if (Array.isArray(detail)) {
    message = detail.map((item) => {
      const field = Array.isArray(item.loc) ? item.loc.slice(1).join(".") : "";
      return `${field ? `${field}: ` : ""}${item.msg || "Invalid value"}`;
    }).join("; ");
  } else {
    message = statusMessages[response.status] || `Request failed (${response.status}).`;
  }

  const error = new Error(message || statusMessages[response.status] || `Request failed (${response.status}).`);
  error.status = response.status;
  error.code = detail?.code || `http_${response.status}`;
  error.results = payload?.results || detail?.results || [];
  return error;
}

async function requestJson(authFetch, path, options = {}) {
  const response = await authFetch(`${TARGETS_BASE}${path}`, {
    ...options,
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!response.ok) throw await errorFromResponse(response);
  if (response.status === 204) return null;
  return response.json();
}

export function listCustomTargets(authFetch) {
  return requestJson(authFetch, "/custom-targets");
}

export function createCustomTarget(authFetch, payload) {
  return requestJson(authFetch, "/custom-targets", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateCustomTarget(authFetch, targetId, payload) {
  return requestJson(authFetch, `/custom-targets/${encodeURIComponent(targetId)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deactivateCustomTarget(authFetch, targetId) {
  return requestJson(authFetch, `/custom-targets/${encodeURIComponent(targetId)}/deactivate`, {
    method: "POST",
  });
}

export function bulkCreateCustomTargets(authFetch, payload) {
  return requestJson(authFetch, "/custom-targets/bulk", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getWeeklyResults(authFetch, params = {}) {
  return requestJson(authFetch, `/custom-targets/weekly-results${queryString(params)}`);
}

export function evaluateWeeklyTargets(authFetch, payload) {
  return requestJson(authFetch, "/custom-targets/evaluate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getEligiblePeople(authFetch, params = {}) {
  return requestJson(authFetch, `/custom-targets/eligible-people${queryString(params)}`);
}

export async function exportWeeklyResults(authFetch, params = {}) {
  const response = await authFetch(
    `${CUSTOM_TARGETS_BASE}/weekly-results/export${queryString(params)}`,
    { method: "GET" },
  );
  if (!response.ok) throw await errorFromResponse(response);
  return {
    blob: await response.blob(),
    filename: parseFilename(response.headers?.get?.("Content-Disposition")) ||
      `weekly-targets.${params.format || "csv"}`,
  };
}

export function getServiceTargets(authFetch, week, organization) {
  return authFetch(
    `${TARGETS_BASE}/service?week=${encodeURIComponent(week)}&org=${encodeURIComponent(organization)}`,
    { method: "GET", headers: { "Content-Type": "application/json" } },
  );
}

export function getTwelveTasksTargets(authFetch, week, organization) {
  return authFetch(
    `${TARGETS_BASE}/twelve-tasks?week=${encodeURIComponent(week)}&org=${encodeURIComponent(organization)}`,
    { method: "GET", headers: { "Content-Type": "application/json" } },
  );
}

export function getAvailableTargetWeeks(authFetch, organization) {
  return authFetch(
    `${TARGETS_BASE}/available-weeks?organization=${encodeURIComponent(organization)}`,
    { method: "GET", headers: { "Content-Type": "application/json" } },
  );
}

export function copyLastWeekTargets(authFetch) {
  return authFetch(`${TARGETS_BASE}/copy-last-week`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
}

export function saveServiceTarget(authFetch, payload) {
  return authFetch(`${TARGETS_BASE}/service`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function saveTwelveTasksTarget(authFetch, payload) {
  return authFetch(`${TARGETS_BASE}/twelve-tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function parseTargetError(response) {
  return errorFromResponse(response);
}
