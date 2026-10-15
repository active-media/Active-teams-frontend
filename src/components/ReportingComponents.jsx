import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Box, Breadcrumbs, Button, Card, Chip, FormControl, MenuItem, Select,
  Stack, Table, TableBody, TableCell, TableHead, TableRow, ToggleButton,
  ToggleButtonGroup, Typography,
} from "@mui/material";
import { ChevronRight, ArrowUpward, ArrowDownward } from "@mui/icons-material";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

export const REPORT_TYPES = [
  ["twelve-tasks", "Twelve Tasks", "Completion and follow-up performance across leaders."],
  ["cells-graph", "Cells Graph", "Attendance trends across cells, leaders, and campuses."],
  ["life-class", "Life Class", "Life Class attendance and completion summary."],
  ["school-of-leaders", "School of Leaders", "School of Leaders participation and progress."],
  ["plan-40", "Plan 40", "Plan 40 activity and completion overview."],
  ["staff-interns-youth", "Staff & Interns Youth Statistics", "People tracked across ministry groups."],
  ["school-cell", "School Cell", "School cell attendance and activity."],
  ["service-target", "Service Target", "Service attendance against target."],
].map(([id, name, description]) => ({ id, name, description }));

export const colors = { surface: "#111111", panel: "#18191d", border: "#2a2d34", text: "#f5f7fa", muted: "#8a8f98", blue: "#0080ef", green: "#2ecc71", teal: "#24c6b2", orange: "#f59e0b" };
export const panelSx = { bgcolor: colors.panel, border: `1px solid ${colors.border}`, borderRadius: 2, boxShadow: "none" };

export function ReportingBreadcrumbs({ segments }) {
  return <Breadcrumbs separator={<ChevronRight sx={{ fontSize: 15, color: colors.muted }} />} sx={{ mb: 2, "& .MuiBreadcrumbs-li": { fontSize: 13 } }}>
    {segments.map((segment, index) => segment.to ? <Link key={`${segment.label}-${index}`} component={Link} to={segment.to} style={{ color: colors.muted, textDecoration: "none" }}>{segment.label}</Link> : <Typography key={`${segment.label}-${index}`} sx={{ color: colors.text, fontWeight: 700, fontSize: 13 }}>{segment.label}</Typography>)}
  </Breadcrumbs>;
}

export function PageFrame({ children, segments }) { return <Box sx={{ minHeight: "calc(100vh - 64px)", bgcolor: colors.surface, color: colors.text, p: { xs: 2, md: 4 }, maxWidth: 1440, mx: "auto" }}><ReportingBreadcrumbs segments={segments} />{children}</Box>; }

export function PeriodGranularityControl() {
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search);
  const granularity = query.get("granularity") || "monthly";
  const period = query.get("period") || "2026-08";
  const update = (key, value) => { query.set(key, value); navigate(`${location.pathname}?${query.toString()}`); };
  return <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
    <ToggleButtonGroup value={granularity} exclusive onChange={(_, value) => value && update("granularity", value)} size="small" sx={{ bgcolor: colors.panel, "& .MuiToggleButton-root": { color: colors.muted, borderColor: colors.border, textTransform: "none", px: 1.5 }, "& .Mui-selected": { bgcolor: `${colors.blue} !important`, color: "white !important" } }}>
      <ToggleButton value="weekly">Weekly</ToggleButton><ToggleButton value="monthly">Monthly</ToggleButton><ToggleButton value="custom">Custom</ToggleButton>
    </ToggleButtonGroup>
    <FormControl size="small"><Select value={period} onChange={(event) => update("period", event.target.value)} sx={{ color: colors.text, bgcolor: colors.panel, ".MuiOutlinedInput-notchedOutline": { borderColor: colors.border } }}><MenuItem value="2026-08">Period: Aug 2026</MenuItem><MenuItem value="2026-09">Period: Sep 2026</MenuItem></Select></FormControl>
  </Stack>;
}

export function KpiCard({ label, value, caption, icon, tone = colors.teal }) { return <Card sx={{ ...panelSx, p: 2.25, minWidth: 0 }}><Stack direction="row" justifyContent="space-between"><Box sx={{ width: 34, height: 34, display: "grid", placeItems: "center", borderRadius: 1.5, bgcolor: `${tone}22`, color: tone }}>{icon || "▦"}</Box><Chip label="Live" size="small" sx={{ color: colors.green, bgcolor: `${colors.green}18`, height: 22 }} /></Stack><Typography sx={{ mt: 2, fontSize: 30, fontWeight: 800 }}>{value}</Typography><Typography sx={{ fontWeight: 700 }}>{label}</Typography><Typography sx={{ color: colors.muted, fontSize: 12, mt: .5 }}>{caption}</Typography></Card>; }
export function KpiCardGrid({ items }) { return <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }, gap: 2, mb: 2 }}>{items.map((item) => <KpiCard key={item.label} {...item} />)}</Box>; }

export function ReportDataTable({ columns, rows, onRowClick, totalRow }) { return <Box sx={{ ...panelSx, overflowX: "auto" }}><Table size="small"><TableHead><TableRow>{columns.map((column) => <TableCell key={column.key} align={column.numeric ? "right" : "left"} sx={{ color: colors.muted, borderColor: colors.border, fontSize: 11, fontWeight: 700 }}>{column.label}</TableCell>)}</TableRow></TableHead><TableBody>{rows.map((row, index) => <TableRow key={row.id || index} hover onClick={() => onRowClick?.(row)} sx={{ cursor: onRowClick ? "pointer" : "default", "&:hover": { bgcolor: "#202329" } }}>{columns.map((column) => <TableCell key={column.key} align={column.numeric ? "right" : "left"} sx={{ color: colors.text, borderColor: colors.border }}>{column.render ? column.render(row) : row[column.key]}</TableCell>)}</TableRow>)}{totalRow && <TableRow sx={{ bgcolor: "#22252b" }}>{columns.map((column) => <TableCell key={column.key} align={column.numeric ? "right" : "left"} sx={{ color: colors.text, borderColor: colors.border, fontWeight: 800 }}>{totalRow[column.key] ?? "—"}</TableCell>)}</TableRow>}</TableBody></Table></Box>; }

const defaultOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: colors.muted } } }, scales: { x: { ticks: { color: colors.muted }, grid: { color: "#292c32" } }, y: { beginAtZero: true, ticks: { color: colors.muted }, grid: { color: "#292c32" } } } };
export function MultiLineTrendChart({ labels, datasets, fill = false }) { return <Box sx={{ height: 300 }}><Line data={{ labels, datasets }} options={defaultOptions} /></Box>; }
export function AreaTrendChart({ labels, data }) { return <MultiLineTrendChart labels={labels} datasets={[{ label: "Attendance", data, borderColor: colors.teal, backgroundColor: `${colors.teal}33`, fill: true, tension: .35 }]} fill />; }

export function Trend({ value }) { const positive = value > 0; const flat = value === 0; return <Stack direction="row" alignItems="center" spacing={.25} sx={{ color: flat ? colors.muted : positive ? colors.green : "#ef5350" }}>{flat ? "→" : positive ? <ArrowUpward sx={{ fontSize: 15 }} /> : <ArrowDownward sx={{ fontSize: 15 }} />}{Math.abs(value)}%</Stack>; }
export function StatusChip({ children = "Active" }) { return <Chip size="small" label={children} sx={{ bgcolor: `${colors.green}1c`, color: colors.green, height: 24 }} />; }
export function SectionTitle({ title, subtitle }) { return <Box sx={{ mb: 1.5 }}><Typography sx={{ fontWeight: 800, fontSize: 18 }}>{title}</Typography>{subtitle && <Typography sx={{ color: colors.muted, fontSize: 13 }}>{subtitle}</Typography>}</Box>; }
