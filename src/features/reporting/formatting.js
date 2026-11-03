export function formatReportValue(value, format = "number") {
  if (value == null) return "—";
  if (format === "percent" && typeof value === "number") return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value)}%`;
  if (format === "number" && typeof value === "number") return new Intl.NumberFormat().format(value);
  if (format === "ratio" && typeof value === "number") return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
  return String(value);
}

export function formatTableValue(value, format) {
  if (value == null) return "—";
  if (format === "ratio" && typeof value === "number") return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
  return formatReportValue(value, format || "text");
}