// Contract source: docs/REPORTING_API_CONTRACT.md, Period tokens and GET /reporting/catalog.
export const PERIOD_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "thisWeek", label: "This week" },
  { value: "thisMonth", label: "This month" },
  { value: "previous7", label: "Previous 7 days" },
  { value: "previousWeek", label: "Previous week" },
  { value: "previousMonth", label: "Previous month" },
  { value: "thisQuarter", label: "This quarter" },
  { value: "yearly", label: "This year" },
  { value: "month", label: "Choose month" },
  { value: "custom", label: "Custom range" },
];

export const REPORT_TYPES = [
  "twelve_tasks",
  "cells_graph",
  "life_class",
  "school_of_leaders",
  "plan_40",
  "staff_interns_youth",
  "school_cell",
  "service_target",
];

export const REPORT_EXPORT_FORMATS = ["csv", "xlsx"];
export const ALL_CAMPUSES = "all";
export const DEFAULT_PERIOD = "thisMonth";

// Existing schedules persist legacy values; convert those values at this boundary.
export const LEGACY_SCHEDULE_TYPES = {
  overall_church_performance: "cells_graph",
  cells_report: "cells_graph",
  life_class_report: "life_class",
  school_of_leaders_report: "school_of_leaders",
  plan_40_report: "plan_40",
  school_cell_report: "school_cell",
  service_target_report: "service_target",
  twelve_tasks_report: "twelve_tasks",
  staff_interns_youth_report: "staff_interns_youth",
};

export const SCHEDULE_FREQUENCIES = ["daily", "weekly", "monthly"];
export const SCHEDULE_FORMATS = ["pdf", "csv", "xlsx"];
export const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export const toCatalogReportType = (reportType) => LEGACY_SCHEDULE_TYPES[reportType] || reportType;

export const getReportTitle = (catalog, reportType) => (
  catalog?.find((report) => report.report_type === toCatalogReportType(reportType))?.title
  || toCatalogReportType(reportType).replaceAll("_", " ")
);