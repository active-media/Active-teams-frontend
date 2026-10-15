import { API_BASE } from "./config";
import { REPORT_FIXTURES, fixtureHistory, makeFixtureRun } from "../features/reporting/reportingFixtures";
import { toCatalogReportType } from "../features/reporting/constants";
import * as XLSX from "xlsx";

const useFixtures = import.meta.env.VITE_USE_REPORT_FIXTURES === "true";
const fixtureSchedules = [];

export function buildQueryString(params = {}) {
  const query = new URLSearchParams();
  const hasCustomRange = Boolean(params.start_date || params.end_date);

  if (hasCustomRange) {
    query.set("start_date", params.start_date);
    query.set("end_date", params.end_date);
  } else if (params.period) {
    query.set("period", params.period);
  } else {
    if (params.start_date) query.set("start_date", params.start_date);
    if (params.end_date) query.set("end_date", params.end_date);
  }

  if (params.campus && params.campus !== "all") query.set("campus", params.campus);
  if (params.format) query.set("format", params.format);
  if (params.limit != null) query.set("limit", String(params.limit));
  if (params.organization) query.set("organization", params.organization);

  return query.toString();
}

export async function parseApiError(response) {
  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  const detail = payload?.detail;
  if (detail && typeof detail === "object" && !Array.isArray(detail)) {
    return {
      status: response.status,
      code: detail.code || `http_${response.status}`,
      message: detail.message || JSON.stringify(detail),
      ...(detail.report_type ? { reportType: detail.report_type } : {}),
    };
  }

  if (Array.isArray(detail)) {
    return {
      status: response.status,
      code: `http_${response.status}`,
      message: detail.map((item) => {
        const location = Array.isArray(item.loc) ? item.loc.join(".") : "request";
        return `${location}: ${item.msg || "Invalid value"}`;
      }).join("; "),
    };
  }

  return {
    status: response.status,
    code: `http_${response.status}`,
    message: typeof detail === "string" ? detail : `Request failed (${response.status})`,
  };
}

async function requestJson(authFetch, path, options) {
  const response = await authFetch(`${API_BASE}${path}`, options);
  if (!response.ok) throw await parseApiError(response);
  return response.json();
}

const queryPath = (path, params) => {
  const query = buildQueryString(params);
  return query ? `${path}?${query}` : path;
};

export function getCatalog(authFetch) {
  if (useFixtures) return Promise.resolve(REPORT_FIXTURES.catalog);
  return requestJson(authFetch, "/reporting/catalog");
}

export function getDashboard(authFetch, params = {}) {
  if (useFixtures) return Promise.resolve(REPORT_FIXTURES.dashboard);
  return requestJson(authFetch, queryPath("/reporting/dashboard", params));
}

export function getReport(authFetch, type, params = {}) {
  if (useFixtures) {
    const item = REPORT_FIXTURES.catalog.find((entry) => entry.report_type === type);
    if (item && !item.implemented) {
      return Promise.reject({ status: 501, code: "not_implemented", reportType: type, message: `The ${type} report is not implemented.` });
    }
    return Promise.resolve(REPORT_FIXTURES.reports[type] || REPORT_FIXTURES.reports.twelve_tasks);
  }
  return requestJson(authFetch, queryPath(`/reporting/reports/${encodeURIComponent(type)}`, params));
}

export function generateReport(authFetch, type, params = {}) {
  if (useFixtures) {
    const item = REPORT_FIXTURES.catalog.find((entry) => entry.report_type === type);
    if (item && !item.implemented) {
      return Promise.reject({ status: 501, code: "not_implemented", reportType: type, message: `The ${type} report is not implemented.` });
    }
    const run = makeFixtureRun(type, params);
    fixtureHistory.unshift(run);
    return Promise.resolve(run);
  }
  return requestJson(authFetch, queryPath(`/reporting/reports/${encodeURIComponent(type)}/generate`, params), {
    method: "POST",
  });
}

export function getHistory(authFetch, params = {}) {
  if (useFixtures) return Promise.resolve(fixtureHistory);
  return requestJson(authFetch, queryPath("/reporting/history", params));
}

export function getHistoryItem(authFetch, id, params = {}) {
  if (useFixtures) {
    const item = fixtureHistory.find((entry) => entry.id === id);
    return item ? Promise.resolve(item) : Promise.reject({ status: 404, code: "http_404", message: "Report run not found" });
  }
  return requestJson(authFetch, queryPath(`/reporting/history/${encodeURIComponent(id)}`, params));
}

function fallbackFilename(type, format, params = {}) {
  const start = params.start_date || params.period || new Date().toISOString().slice(0, 10);
  const end = params.end_date ? `_${params.end_date}` : "";
  return `${type}_${start}${end}.${format}`;
}

function filenameFromDisposition(header) {
  if (!header) return null;
  const utfMatch = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch) return decodeURIComponent(utfMatch[1].replace(/"/g, ""));
  const plainMatch = header.match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1] || null;
}

export async function exportReport(authFetch, type, format, params = {}) {
  if (useFixtures) {
    const item = REPORT_FIXTURES.catalog.find((entry) => entry.report_type === type);
    if (item && !item.implemented) {
      throw { status: 501, code: "not_implemented", reportType: type, message: `The ${type} report is not implemented.` };
    }
    const envelope = REPORT_FIXTURES.reports[type] || REPORT_FIXTURES.reports.twelve_tasks;
    const workbook = XLSX.utils.book_new();
    envelope.tables.forEach((table) => {
      const rows = [table.columns.map((column) => column.label), ...table.rows.map((row) => table.columns.map((column) => row[column.key] ?? ""))];
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), table.key.slice(0, 31));
    });
    const output = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
    const blob = format === "csv"
      ? new Blob([envelope.tables.map((table) => [table.title, table.columns.map((column) => column.label).join(","), ...table.rows.map((row) => table.columns.map((column) => JSON.stringify(row[column.key] ?? "")).join(","))].join("\n")).join("\n\n")], { type: "text/csv" })
      : new Blob([output], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    return { blob, filename: fallbackFilename(type, format, params) };
  }
  const path = queryPath(`/reporting/reports/${encodeURIComponent(type)}/export`, { ...params, format });
  const response = await authFetch(`${API_BASE}${path}`);
  if (!response.ok) throw await parseApiError(response);
  return {
    blob: await response.blob(),
    filename: filenameFromDisposition(response.headers.get("Content-Disposition")) || fallbackFilename(type, format, params),
  };
}

export function getSchedules(authFetch) {
  if (useFixtures) return Promise.resolve([...fixtureSchedules]);
  return requestJson(authFetch, "/report-schedules").then((rows) => rows.map(normalizeSchedule));
}

export function createSchedule(authFetch, payload) {
  if (useFixtures) {
    const schedule = normalizeSchedule({ ...payload, id: `fixture-${Date.now()}`, active: true, time_of_day: payload.time });
    fixtureSchedules.unshift(schedule);
    return Promise.resolve(schedule);
  }
  return requestJson(authFetch, "/report-schedules", { method: "POST", body: JSON.stringify(payload) }).then(normalizeSchedule);
}

export function updateSchedule(authFetch, id, payload) {
  if (useFixtures) {
    const index = fixtureSchedules.findIndex((schedule) => schedule.id === id);
    if (index < 0) return Promise.reject({ status: 404, code: "http_404", message: "Schedule not found" });
    fixtureSchedules[index] = normalizeSchedule({ ...fixtureSchedules[index], ...payload, time_of_day: payload.time || fixtureSchedules[index].time });
    return Promise.resolve(fixtureSchedules[index]);
  }
  return requestJson(authFetch, `/report-schedules/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(payload) }).then(normalizeSchedule);
}

export function deleteSchedule(authFetch, id) {
  if (useFixtures) {
    const index = fixtureSchedules.findIndex((schedule) => schedule.id === id);
    if (index >= 0) fixtureSchedules.splice(index, 1);
    return Promise.resolve({ success: true });
  }
  return requestJson(authFetch, `/report-schedules/${encodeURIComponent(id)}`, { method: "DELETE" });
}

function normalizeSchedule(schedule) {
  return {
    ...schedule,
    time: schedule.time || schedule.time_of_day,
    report_type: toCatalogReportType(schedule.report_type),
  };
}