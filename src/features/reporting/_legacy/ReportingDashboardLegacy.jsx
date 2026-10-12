import React, { useContext, useEffect, useMemo, useState } from "react";
import { Box, Card, CircularProgress, IconButton, MenuItem, Stack, TextField, Typography, useTheme } from "@mui/material";
import { ArrowBack as ArrowBackIcon, ChevronRight as ChevronRightIcon } from "@mui/icons-material";
import { Link as RouterLink, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../../../contexts/AuthContext";
import { AreaTrendChart, KpiCardGrid, MultiLineTrendChart, PageFrame, PeriodGranularityControl, ReportDataTable, SectionTitle, StatusChip, Trend } from "../../../components/ReportingComponents";

// ---------------------------------------------------------------------------
// This single file is the whole Reporting Dashboard: the top-level landing
// view (Reporting Dashboard.pdf) plus every sub-view it drills into. Which
// one renders is driven entirely by the URL params matched in App.jsx:
//   /reporting/dashboard                             -> Home
//   /reporting/dashboard/cells                       -> CellsOverview
//   /reporting/dashboard/cells/:leaderId              -> LeaderDetail
//   /reporting/dashboard/cells/:leaderId/:cellId       -> CellDetail
// Adding a new section (e.g. "life-class") later means adding another
// `section === "..."` branch at the bottom of this file, plus its own
// sub-view functions above it — no new files needed.
// ---------------------------------------------------------------------------

export default function ReportingDashboard() {
const { authFetch } = useContext(AuthContext);
const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
const location = useLocation();
const navigate = useNavigate();
const { section, leaderId, cellId } = useParams();
const query = new URLSearchParams(location.search);
const granularity = query.get("granularity") || "monthly";
const defaultPeriod = new Date().toISOString().slice(0, 7);
const selectedPeriod = query.get("period") || defaultPeriod;
const reportingRange = query.get("range") || "thisMonth";
const period = granularity === "weekly"
  ? "thisWeek"
  : reportingRange === "previousMonth"
  ? "previousMonth"
  : reportingRange === "thisQuarter"
  ? "thisQuarter"
  : reportingRange === "yearly"
  ? "yearly"
  : selectedPeriod;
const campus = query.get("campus") || "all";
const updateQuery = (key, value) => {
  const nextQuery = new URLSearchParams(location.search);
  nextQuery.set(key, value);
  if (key === "period") nextQuery.set("granularity", "monthly");
  navigate(`${location.pathname}?${nextQuery.toString()}`);
};
const theme = useTheme();
const mode = theme.palette.mode;
const colors = useMemo(
  () => ({
    surface: mode === "dark" ? "#111111" : "#f5f5f5",
    panel: mode === "dark" ? "#18191d" : "#ffffff",
    border: mode === "dark" ? "#2a2d34" : "#e0e0e0",
    text: mode === "dark" ? "#f5f7fa" : "#111111",
    muted: mode === "dark" ? "#8a8f98" : "#666666",
    blue: mode === "dark" ? "#0080ef" : "#0066cc",
    green: mode === "dark" ? "#2ecc71" : "#00a651",
    teal: mode === "dark" ? "#24c6b2" : "#009688",
    orange: mode === "dark" ? "#f59e0b" : "#e65100",
  }),
  [mode]
);

const [dashboard, setDashboard] = useState(null);
const [serviceTargetReport, setServiceTargetReport] = useState(null);
const [twelveTasksReport, setTwelveTasksReport] = useState(null);
const [loading, setLoading] = useState(true);
const [loadError, setLoadError] = useState("");

const leaderColumns = [{ key: "name", label: "LEADER NAME" }, { key: "cells", label: "TOTAL CELLS", numeric: true }, { key: "attendance", label: "TOTAL ATTENDANCE", numeric: true }, { key: "average", label: "AVG ATTENDANCE", numeric: true }, { key: "last", label: "LAST ACTIVE" }, { key: "status", label: "STATUS", render: (row) => <StatusChip>{row.status}</StatusChip> }];

const allCells = dashboard?.cells || [];
const allCampuses = dashboard?.campus_comparison || [];
const campuses = [...new Set(allCampuses.map((item) => item.campus))];
const visibleCells = campus === "all" ? allCells : allCells.filter((cell) => cell.location === campus);
const weekLabels = dashboard?.attendance_trend?.labels || [];
const trendLabels = weekLabels.map((label) => new Date(`${label}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "2-digit" }));
const attendanceTrend = campus === "all"
  ? dashboard?.attendance_trend?.values || []
  : dashboard?.attendance_trend_by_campus?.[campus] || weekLabels.map(() => 0);
const campusComparison = Object.entries(dashboard?.attendance_by_campus || {})
  .filter(([name]) => campus === "all" || name === campus)
  .map(([name, value]) => ({ campus: name, value }));
const campusMax = Math.max(1, ...campusComparison.map((item) => item.value));
const attendanceRows = weekLabels.map((label, index) => ({
  period: new Date(`${label}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
  attendance: attendanceTrend[index] || 0,
}));

const cellRows = visibleCells.map((cell) => ({
  id: cell.id,
  leaderId: cell.leader.toLowerCase().replace(/\s+/g, "-"),
  name: cell.name,
  day: "—",
  campus: cell.location,
  attendance: cell.attendance,
  average: cell.average,
  trend: cell.growth_rate,
  sessions: cell.session_count,
  previousAttendance: cell.previous_attendance,
  history: cell.sessions,
}));
const leadersById = new Map();
visibleCells.forEach((cell) => {
  const id = cell.leader.toLowerCase().replace(/\s+/g, "-");
  const leader = leadersById.get(id) || {
    id,
    name: cell.leader,
    cells: 0,
    attendance: 0,
    previousAttendance: 0,
    sessions: 0,
    last: "",
    weeklyAttendance: weekLabels.map(() => 0),
  };
  leader.cells += 1;
  leader.attendance += cell.attendance;
  leader.previousAttendance += cell.previous_attendance;
  leader.sessions += cell.session_count;
  const lastSession = cell.sessions.map((session) => session.date).sort().at(-1) || "";
  leader.last = [leader.last, lastSession].filter(Boolean).sort().at(-1) || "";
  cell.sessions.forEach((session) => {
    const weekIndex = weekLabels.findIndex((label, index) => (
      session.date >= label && (!weekLabels[index + 1] || session.date < weekLabels[index + 1])
    ));
    if (weekIndex >= 0) leader.weeklyAttendance[weekIndex] += session.attendance;
  });
  leadersById.set(id, leader);
});
const leaders = [...leadersById.values()].map((leader) => ({
  ...leader,
  average: leader.sessions ? (leader.attendance / leader.sessions).toFixed(1) : "0.0",
  growthRate: leader.previousAttendance
    ? ((leader.attendance - leader.previousAttendance) / leader.previousAttendance) * 100
    : (leader.attendance ? 100 : 0),
}));
const activeCellsByWeek = weekLabels.map((label, index) => {
  if (campus === "all") return dashboard?.active_cells_by_week?.[index] || 0;
  const cellIds = new Set();
  visibleCells.forEach((cell) => cell.sessions.forEach((session) => {
    if (session.date >= label && (!weekLabels[index + 1] || session.date < weekLabels[index + 1])) cellIds.add(cell.id);
  }));
  return cellIds.size;
});

const targetTotal = serviceTargetReport?.total_target;
const taskRows = twelveTasksReport?.rows || [];
const taskActual = taskRows.reduce((total, row) => total + (Number(row.this_week) || 0), 0);
const taskTarget = taskRows.reduce((total, row) => total + (Number(row.target) || 0), 0);
const totalAttendance = campus === "all"
  ? dashboard?.total_attendance
  : dashboard?.attendance_by_campus?.[campus] || 0;
const totalActiveCells = campus === "all" ? dashboard?.active_cells : visibleCells.length;
const kpiTiles = [
  { key: "attendance", label: "Total Attendance", value: totalAttendance?.toLocaleString() ?? "—", caption: dashboard ? `${dashboard.growth_rate >= 0 ? "+" : ""}${dashboard.growth_rate}% vs previous period` : "Loading", tone: colors.green, path: null },
  { key: "cells", label: "Active Cells", value: totalActiveCells?.toLocaleString() ?? "—", caption: `${campus === "all" ? dashboard?.active_leaders ?? "—" : leaders.length} active leaders`, tone: colors.green, path: "/reporting/dashboard/cells" },
  { key: "life-class", label: "Life Class", value: "—", caption: "No live aggregate available", tone: colors.green, path: null },
  { key: "school-of-leaders", label: "School of Leaders", value: "—", caption: "No live aggregate available", tone: colors.muted, path: null },
  { key: "plan-40", label: "Plan 40", value: "—", caption: "No live aggregate available", tone: colors.green, path: null },
  { key: "service-target", label: "Service Target", value: targetTotal?.toLocaleString() ?? "—", caption: serviceTargetReport ? `${serviceTargetReport.total_targets} targets` : "No target data", tone: colors.green, path: null },
  { key: "twelve-tasks", label: "Twelve Tasks", value: taskRows.length ? `${taskActual}/${taskTarget || "—"}` : "—", caption: taskRows.length ? "completed this week / target" : "No task data", tone: colors.green, path: null },
  { key: "staff-interns-youth", label: "Staff / Interns / Youth", value: "—", caption: dashboard ? `${dashboard.total_people} people tracked` : "Loading", tone: colors.muted, path: null },
];

useEffect(() => {
  let cancelled = false;
  const fetchReports = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await authFetch(`${backendUrl}/stats/reporting-dashboard?period=${encodeURIComponent(period)}`);
      if (!response.ok) throw new Error((await response.json()).detail || `Dashboard request failed (${response.status})`);
      const data = await response.json();
      if (cancelled) return;
      setDashboard(data);

      const [targetResult, taskResult] = await Promise.allSettled([
        authFetch(`${backendUrl}/stats/service-target-report`),
        authFetch(`${backendUrl}/stats/twelve-tasks?period=thisWeek`),
      ]);
      if (cancelled) return;
      if (targetResult.status === "fulfilled" && targetResult.value.ok) {
        setServiceTargetReport(await targetResult.value.json());
      } else if (targetResult.status === "rejected") {
        console.error("Service target report failed:", targetResult.reason);
      }
      if (taskResult.status === "fulfilled" && taskResult.value.ok) {
        setTwelveTasksReport(await taskResult.value.json());
      } else if (taskResult.status === "rejected") {
        console.error("Twelve Tasks report failed:", taskResult.reason);
      }
    } catch (error) {
      console.error("Reporting dashboard fetch failed:", error);
      if (!cancelled) setLoadError(error.message || "Unable to load dashboard data.");
    } finally {
      if (!cancelled) setLoading(false);
    }
  };

  fetchReports();
  return () => { cancelled = true; };
}, [authFetch, backendUrl, period]);

function ChartPanel({ title, subtitle, children, footnote }) {
  return (
    <Card sx={{ bgcolor: colors.panel, border: `1px solid ${colors.border}`, borderRadius: 2, boxShadow: "none", p: 2.5, height: "100%" }}>
      <SectionTitle title={title} subtitle={subtitle} />
      {children}
      {footnote && <Typography sx={{ color: colors.muted, fontSize: 12, fontStyle: "italic", mt: 1 }}>{footnote}</Typography>}
    </Card>
  );
}

// Two-row breadcrumb: "Reporting > Dashboard" is always present and always
// links back to the landing page; `trail` is the deeper path within the
// current section (e.g. Cells / Overall / Gavin), shown only once you're
// inside a section. `onBack` steps up exactly one level in the hierarchy —
// not browser history, so it behaves the same no matter how you arrived.
function DashboardBreadcrumb({ trail, onBack }) {
  return (
    <Stack direction="row" alignItems="flex-start" spacing={1.5} mb={2}>
      {onBack && (
        <IconButton
          onClick={onBack}
          size="small"
          sx={{ color: colors.muted, border: `1px solid ${colors.border}`, borderRadius: 1.5, mt: 0.25 }}
        >
          <ArrowBackIcon fontSize="small" />
        </IconButton>
      )}
      <Stack spacing={0.5}>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Typography
            component={RouterLink}
            to="/reporting/dashboard"
            sx={{ color: colors.muted, fontSize: 14, textDecoration: "none", "&:hover": { color: colors.teal } }}
          >
            Reporting
          </Typography>
          <ChevronRightIcon sx={{ fontSize: 16, color: colors.muted }} />
          <Typography sx={{ color: trail?.length ? colors.muted : colors.text, fontSize: 14, fontWeight: trail?.length ? 400 : 700 }}>
            Dashboard
          </Typography>
        </Stack>
        {Boolean(trail?.length) && (
          <Stack direction="row" alignItems="center" spacing={0.75} flexWrap="wrap">
            {trail.map((seg, index) => (
              <React.Fragment key={seg.label}>
                {seg.to ? (
                  <Typography
                    component={RouterLink}
                    to={seg.to}
                    sx={{ color: colors.muted, fontSize: 15, textDecoration: "none", "&:hover": { color: colors.teal } }}
                  >
                    {seg.label}
                  </Typography>
                ) : (
                  <Typography sx={{ color: colors.text, fontSize: 15, fontWeight: 700 }}>{seg.label}</Typography>
                )}
                {index < trail.length - 1 && <Typography sx={{ color: colors.muted, fontSize: 15 }}>/</Typography>}
              </React.Fragment>
            ))}
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}

function Header({ title, subtitle }) {
  return (
    <Stack direction={{ xs: "column", lg: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", lg: "flex-start" }} gap={2} mb={3}>
      <Box>
        <Typography sx={{ fontSize: { xs: 28, md: 34 }, fontWeight: 800 }}>{title}</Typography>
        <Typography sx={{ color: colors.muted }}>{subtitle}</Typography>
      </Box>
      <PeriodGranularityControl />
    </Stack>
  );
}

function KpiTile({ tile }) {
  const navigate = useNavigate();
  const clickable = Boolean(tile.path);
  return (
    <Card
      onClick={clickable ? () => navigate(tile.path) : undefined}
      sx={{
        bgcolor: colors.panel,
        border: `1px solid ${colors.border}`,
        borderRadius: 2,
        boxShadow: "none",
        p: 2.5,
        cursor: clickable ? "pointer" : "default",
        transition: "border-color 0.15s ease",
        "&:hover": clickable ? { borderColor: colors.teal } : undefined,
      }}
    >
      <Stack direction="row" justifyContent="flex-end" mb={1}>
        <Typography sx={{ color: tile.tone, fontSize: 12, fontWeight: 600 }}>{tile.caption}</Typography>
      </Stack>
      <Typography sx={{ fontSize: 30, fontWeight: 800, lineHeight: 1.1 }}>{tile.value}</Typography>
      <Typography sx={{ color: colors.muted, fontSize: 13, mt: 0.5 }}>{tile.label}</Typography>
    </Card>
  );
}

function CampusBarChart() {
  return (
    <Stack direction="row" alignItems="flex-end" spacing={3} sx={{ height: 220, px: 1 }}>
      {campusComparison.map((c) => (
        <Stack key={c.campus} alignItems="center" spacing={1} sx={{ flex: 1, height: "100%", justifyContent: "flex-end" }}>
          <Typography sx={{ color: colors.muted, fontSize: 12 }}>{c.value.toLocaleString()}</Typography>
          <Box sx={{ width: "60%", height: `${(c.value / campusMax) * 100}%`, bgcolor: colors.blue, borderRadius: "4px 4px 0 0" }} />
          <Typography sx={{ color: colors.muted, fontSize: 12 }}>{c.campus}</Typography>
        </Stack>
      ))}
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Sub-view: landing page (Reporting Dashboard.pdf)
// ---------------------------------------------------------------------------
function Home() {
  const periodOption = reportingRange;
  return (
    <>
      <Header title="Reporting Dashboard" subtitle="Automated church metrics — calculated from live data." />

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={3}>
        <TextField select label="Reporting Period" value={periodOption} onChange={(event) => updateQuery("range", event.target.value)} size="small" sx={{ minWidth: 220 }}>
          {[["thisMonth", "This Month"], ["previousMonth", "Last Month"], ["thisQuarter", "This Quarter"], ["yearly", "This Year"]].map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
        </TextField>
        <TextField select label="Campus" value={campus} onChange={(event) => updateQuery("campus", event.target.value)} size="small" sx={{ minWidth: 220 }}>
          {[<MenuItem key="all" value="all">All Campuses</MenuItem>, ...campuses.map((name) => <MenuItem key={name} value={name}>{name}</MenuItem>)]}
        </TextField>
      </Stack>

      {loadError && <Typography color="error" role="alert">{loadError}</Typography>}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 2, mb: 2 }}>
        {kpiTiles.map((tile) => <KpiTile key={tile.key} tile={tile} />)}
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 2, mb: 2 }}>
        <ChartPanel title="Attendance Trend">
          <MultiLineTrendChart labels={trendLabels} datasets={[{ label: "Total Attendance", data: attendanceTrend, borderColor: colors.blue, borderWidth: 3, tension: 0.35 }]} />
        </ChartPanel>
        <ChartPanel title="Campus Comparison">
          <CampusBarChart />
        </ChartPanel>
      </Box>

      <SectionTitle title="Ministry Performance" />
      <Card sx={{ bgcolor: colors.panel, border: `1px solid ${colors.border}`, borderRadius: 2, boxShadow: "none", overflow: "hidden" }}>
        <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
          <Box component="thead">
            <Box component="tr" sx={{ borderBottom: `1px solid ${colors.border}` }}>
              {["Ministry", "Registered", "Attended", "Completed", "Attendance %", "Completion %"].map((h) => (
                <Box component="th" key={h} sx={{ textAlign: "left", color: colors.muted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", p: 1.5 }}>{h}</Box>
              ))}
            </Box>
          </Box>
          <Box component="tbody">
            <Box component="tr" sx={{ borderBottom: `1px solid ${colors.border}` }}>
              <Box component="td" colSpan={6} sx={{ p: 1.5, color: colors.muted }}>
                {loading ? "Loading attendance data..." : "Ministry registration and completion data is not available."}
              </Box>
            </Box>
          </Box>
        </Box>
      </Card>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-views: Cells section
// ---------------------------------------------------------------------------
function CellsOverview() {
  const navigate = useNavigate();
  return (
    <>
      <Header title="Cells Overview" subtitle="Aggregated cell attendance and leader performance across all campuses." />
      <KpiCardGrid items={[{ label: "Total Cell Attendance", value: visibleCells.reduce((total, cell) => total + cell.attendance, 0).toLocaleString(), caption: "selected period", tone: colors.green }, { label: "Total Active Cells", value: visibleCells.length, caption: `across ${campuses.length} campuses`, tone: colors.teal }, { label: "Average per Cell", value: visibleCells.length ? (visibleCells.reduce((total, cell) => total + cell.attendance, 0) / visibleCells.length).toFixed(1) : "0.0", caption: "selected period", tone: colors.blue }, { label: "Active Cell Leaders", value: leaders.length, caption: `${leaders.length} leaders tracked`, tone: colors.orange }]} />
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" }, gap: 2, mb: 2 }}>
        <ChartPanel title="Weekly Attendance Trend" subtitle="Attendance performance by leader over current month" footnote="Note: Aggregate = total cell attendances across all leaders (not unique people).">
          <MultiLineTrendChart labels={trendLabels} datasets={[{ label: "All Cells (Aggregate)", data: attendanceTrend, borderColor: colors.teal, borderWidth: 3, tension: .35 }, ...leaders.map((leader, index) => ({ label: leader.name, data: leader.weeklyAttendance, borderColor: [colors.blue, colors.orange, colors.green][index % 3], tension: .35 }))]} />
        </ChartPanel>
        <ChartPanel title="Weekly Active Cells" subtitle="Total cell counts run per week">
          <Stack spacing={1.2}>{trendLabels.map((label, index) => <Stack direction="row" justifyContent="space-between" key={label}><Typography sx={{ color: colors.muted }}>{label}</Typography><StatusChip>{activeCellsByWeek[index] || 0} cells</StatusChip></Stack>)}</Stack>
        </ChartPanel>
      </Box>
      <SectionTitle title="Cell Leaders" />
      <ReportDataTable columns={leaderColumns} rows={leaders.map((leader) => ({ ...leader, average: leader.average, status: "Active" }))} onRowClick={(row) => navigate(`/reporting/dashboard/cells/${row.id}`)} />
    </>
  );
}

function LeaderDetail({ leaderId }) {
  const navigate = useNavigate();
  if (loading) return <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>;

  const leader = leaders.find((item) => item.id === leaderId);

  // Invalid leaderId (typo, stale link) -> back to Cells overview rather than
  // silently rendering the first leader's data.
  if (!leader) return <Navigate to="/reporting/dashboard/cells" replace />;

  const leaderCells = cellRows.filter((cell) => cell.leaderId === leader.id);
  const columns = [{ key: "name", label: "CELL/EVENT NAME" }, { key: "day", label: "DAY" }, { key: "campus", label: "CAMPUS" }, { key: "attendance", label: "ATTENDANCE (PERIOD)", numeric: true }, { key: "average", label: "AVG ATTENDANCE", numeric: true }, { key: "trend", label: "TREND", render: (row) => <Trend value={row.trend} /> }, { key: "sessions", label: "SESSIONS", numeric: true }];
  const leaderTrend = weekLabels.map((label, index) => {
    const nextLabel = weekLabels[index + 1];
    return leaderCells.reduce((total, cell) => total + cell.history.reduce((cellTotal, session) => (
      session.date >= label && (!nextLabel || session.date < nextLabel)
        ? cellTotal + session.attendance
        : cellTotal
    ), 0), 0);
  });

  return (
    <>
      <Header title={leader.name} subtitle="Cell Leader Performance Summary & cell group insights." />
      <KpiCardGrid items={[{ label: "Total Cells", value: leader.cells, caption: "under supervision" }, { label: "Total Attendance", value: leader.attendance.toLocaleString(), caption: `${leader.growthRate >= 0 ? "+" : ""}${leader.growthRate.toFixed(1)}% vs prior period`, tone: colors.green }, { label: "Sessions Run", value: leader.sessions, caption: "selected period" }, { label: "Average per Session", value: leader.average, caption: "selected period", tone: colors.orange }]} />
      <ChartPanel title="Cell Performance Over Time" subtitle="Individual performance and combined active cell output" footnote={`Note: Aggregate = total attendances across ${leader.name}'s selected cells.`}>
        <MultiLineTrendChart labels={trendLabels} datasets={[{ label: "Aggregate", data: leaderTrend, borderColor: "#fff", borderDash: [4, 4], tension: .35 }, ...leaderCells.map((cell, cellIndex) => ({ label: cell.name, data: weekLabels.map((label, index) => cell.history.reduce((total, session) => (
          session.date >= label && (!weekLabels[index + 1] || session.date < weekLabels[index + 1]) ? total + session.attendance : total
        ), 0)), borderColor: [colors.teal, colors.blue, colors.orange][cellIndex % 3], tension: .35 }))]} />
      </ChartPanel>
      <Box mt={2}>
        <SectionTitle title={`${leader.name}'s Cells & Events`} />
        <ReportDataTable columns={columns} rows={leaderCells} onRowClick={(row) => navigate(`/reporting/dashboard/cells/${leader.id}/${row.id}`)} />
      </Box>
    </>
  );
}

function CellDetail({ leaderId, cellId }) {
  if (loading) return <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>;

  const leader = leaders.find((item) => item.id === leaderId);
  const cell = cellRows.find((item) => item.id === cellId && item.leaderId === leaderId);

  if (!leader) return <Navigate to="/reporting/dashboard/cells" replace />;
  if (!cell) return <Navigate to={`/reporting/dashboard/cells/${leaderId}`} replace />;

  const history = [...cell.history].sort((left, right) => left.date.localeCompare(right.date));
  const historyLabels = history.map((session) => new Date(`${session.date}T00:00:00`).toLocaleDateString());
  const historyAttendance = history.map((session) => session.attendance);
  const rows = history.map((session) => ({ week: session.date, date: session.date, attendance: session.attendance, visitors: "—", notes: "—", status: session.status }));
  const columns = [{ key: "week", label: "WEEK" }, { key: "date", label: "DATE" }, { key: "attendance", label: "ATTENDANCE", numeric: true }, { key: "visitors", label: "NEW VISITORS", numeric: true }, { key: "notes", label: "NOTES" }, { key: "status", label: "STATUS", render: (row) => <Typography sx={{ color: colors.green, fontWeight: 700 }}>{row.status}</Typography> }];

  return (
    <>
      <Header title={cell.name} subtitle={`${leader.name} · ${cell.campus} Campus · Every ${cell.day} evening.`} />
      <KpiCardGrid items={[{ label: "Total Attendance", value: cell.attendance.toLocaleString(), caption: "selected period" }, { label: "Sessions Held", value: cell.sessions, caption: "completed sessions", tone: colors.green }, { label: "Average Attendance", value: cell.average, caption: "per active session" }, { label: "Trend Rate", value: `${cell.trend >= 0 ? "+" : ""}${cell.trend.toFixed(1)}%`, caption: "vs previous period", tone: colors.orange }]} />
      <ChartPanel title="Attendance Progression" subtitle="Session attendance count by week">
        <AreaTrendChart labels={historyLabels} data={historyAttendance} />
      </ChartPanel>
      <Box mt={2}>
        <SectionTitle title="Weekly Session History" />
        <ReportDataTable columns={columns} rows={rows} totalRow={{ week: "Total", attendance: cell.attendance, visitors: "—", status: `${cell.sessions} sessions` }} />
      </Box>
    </>
  );
}

// ---------------------------------------------------------------------------
// Entry point — decides which sub-view to render from the URL params.
// ---------------------------------------------------------------------------
  if (!section) {
    return (
      <PageFrame segments={[]}>
        <DashboardBreadcrumb trail={[]} />
        <Home />
      </PageFrame>
    );
  }

  if (section === "cells") {
    const leader = leaders.find((item) => item.id === leaderId);
    const cell = cellRows.find((item) => item.id === cellId);

    const trail = [{ label: "Cells", to: "/reporting/dashboard/cells" }, { label: "Overall", to: "/reporting/dashboard/cells" }];
    if (leader) trail.push({ label: leader.name, to: `/reporting/dashboard/cells/${leader.id}` });
    if (cell) trail.push({ label: cell.name });

    // One step up per level: Cell -> its Leader, Leader -> Cells overview,
    // Cells overview -> the main Dashboard.
    const goBack = cellId
      ? () => navigate(`/reporting/dashboard/cells/${leaderId}`)
      : leaderId
      ? () => navigate("/reporting/dashboard/cells")
      : () => navigate("/reporting/dashboard");

    return (
      <PageFrame segments={[]}>
        <DashboardBreadcrumb trail={trail} onBack={goBack} />
        {cellId ? <CellDetail leaderId={leaderId} cellId={cellId} /> : leaderId ? <LeaderDetail leaderId={leaderId} /> : <CellsOverview />}
      </PageFrame>
    );
  }

  // Unknown/not-yet-built section (e.g. life-class before it exists) -> back home.
  return <Navigate to="/reporting/dashboard" replace />;
}