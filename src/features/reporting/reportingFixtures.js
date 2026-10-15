const periodMeta = {
  start: "2025-02-01",
  end: "2025-02-28",
  label: "February 2025",
  token: "2025-02",
};

const emptyColumns = [
  { key: "ministry", label: "Ministry", format: null },
  { key: "registered", label: "Registered", format: "number" },
  { key: "attended", label: "Attended", format: "number" },
  { key: "completed", label: "Completed", format: "number" },
  { key: "attendance_percent", label: "Attendance %", format: "percent" },
  { key: "completion_percent", label: "Completion %", format: "percent" },
];

const twelveTasks = {
  meta: { report_type: "twelve_tasks", title: "Twelve Tasks", period: periodMeta, campus: null, generated_at: "2026-10-05T12:00:00Z" },
  kpis: [
    { key: "completed_tasks", label: "Completed Tasks", value: 4, delta: null, delta_label: null, format: "number", hint: null },
    { key: "tracked_people", label: "Tracked People", value: 1, delta: null, delta_label: null, format: "number", hint: null },
  ],
  tables: [{
    key: "twelve_tasks",
    title: "Twelve Tasks",
    columns: [
      { key: "name", label: "Name", format: null },
      { key: "last_week", label: "Last Week", format: "number" },
      { key: "target", label: "Target", format: "number" },
      { key: "this_week", label: "This Week", format: "number" },
    ],
    rows: [{ person_id: "person-1", name: "Alex Leader", last_week: 2, target: 3, this_week: 4 }],
  }],
  series: [],
};

const emptyEnvelope = (reportType, title) => ({
  meta: { report_type: reportType, title, period: periodMeta, campus: null, generated_at: "2026-10-05T12:00:00Z" },
  kpis: [],
  tables: [],
  series: [],
});

export const REPORT_FIXTURES = {
  catalog: [
    ["twelve_tasks", "Twelve Tasks", true, "Completed task counts for tracked people and targets."],
    ["cells_graph", "Cells Graph", true, "Cell attendance and active-cell trends."],
    ["life_class", "Life Class", false, "Life Class attendance report."],
    ["school_of_leaders", "School of Leaders", false, "School of Leaders attendance report."],
    ["plan_40", "Plan 40", false, "Plan 40 progress report."],
    ["staff_interns_youth", "Staff/Interns/Youth", false, "Staff, interns, and youth report."],
    ["school_cell", "School Cell", true, "Weekly School Cell attendance and leader summary."],
    ["service_target", "Service Target", true, "Weekly leader service targets."],
  ].map(([report_type, title, implemented, description]) => ({
    report_type,
    title,
    implemented,
    description,
    params: ["period", "start_date", "end_date"].map((name) => ({
      name,
      required: false,
      allowed_values: name === "period"
        ? ["today", "thisWeek", "thisMonth", "previous7", "previousWeek", "previousMonth", "thisQuarter", "yearly", "YYYY-MM"]
        : null,
    })),
    supports_export: ["csv", "xlsx"],
  })),
  dashboard: {
    meta: { report_type: "dashboard", title: "Reporting Dashboard", period: periodMeta, campus: "North", generated_at: "2026-10-05T12:00:00Z" },
    kpis: [
      ["total_attendance", "Total Attendance", 24, "number"],
      ["active_cells", "Active Cells", 2, "number"],
      ["life_class", "Life Class", null, "number"],
      ["school_of_leaders", "School of Leaders", null, "number"],
      ["plan_40", "Plan 40", null, "number"],
      ["service_target", "Service Target", 30, "number"],
      ["twelve_tasks", "Twelve Tasks", 4, "number"],
      ["staff_interns_youth", "Staff/Interns/Youth", null, "number"],
    ].map(([key, label, value, format]) => ({ key, label, value, delta: null, delta_label: null, format, hint: null })),
    tables: [
      { key: "ministry_performance", title: "Ministry Performance", columns: emptyColumns, rows: [] },
      {
        key: "cells",
        title: "Cells",
        columns: [
          { key: "name", label: "Cell", format: null },
          { key: "leader", label: "Leader", format: null },
          { key: "attendance", label: "Attendance", format: "number" },
          { key: "location", label: "Campus", format: null },
        ],
        rows: [{ name: "Central Cell", leader: "Alex Leader", attendance: 24, location: "North" }],
      },
    ],
    series: [
      { key: "attendance_trend", title: "Attendance Trend", type: "line", points: [{ x: "2025-02-01", y: 24, group: null }] },
      { key: "campus_comparison", title: "Campus Comparison", type: "bar", points: [{ x: "North", y: 24, group: null }] },
    ],
  },
  reports: {
    twelve_tasks: twelveTasks,
    cells_graph: emptyEnvelope("cells_graph", "Cells Graph"),
    school_cell: emptyEnvelope("school_cell", "School Cell"),
    service_target: emptyEnvelope("service_target", "Service Target"),
  },
};

export const fixtureHistory = [];

export function makeFixtureRun(type, params = {}) {
  const report = REPORT_FIXTURES.reports[type] || twelveTasks;
  return {
    id: `fixture-run-${Date.now()}`,
    org: params.organization || "Example Org",
    report_type: type,
    params,
    payload: report,
    generated_by: "fixture-user",
    created_at: new Date().toISOString(),
  };
}