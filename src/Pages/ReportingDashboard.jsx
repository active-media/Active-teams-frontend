import React from "react";
import { Box, Card, IconButton, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { ArrowBack as ArrowBackIcon, ChevronRight as ChevronRightIcon } from "@mui/icons-material";
import { Link as RouterLink, Navigate, useNavigate, useParams } from "react-router-dom";
import { AreaTrendChart, colors, KpiCardGrid, MultiLineTrendChart, PageFrame, PeriodGranularityControl, ReportDataTable, SectionTitle, StatusChip, Trend } from "../components/ReportingComponents";

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

const weekLabels = ["Aug 02", "Aug 09", "Aug 16", "Aug 23", "Aug 30"];

const leaders = [
  { id: "gavin", name: "Gavin", cells: 4, attendance: 28, average: "7.0", last: "Aug 23 2026" },
  { id: "mercia", name: "Mercia", cells: 2, attendance: 15, average: "7.5", last: "Aug 23 2026" },
  { id: "david", name: "David", cells: 1, attendance: 8, average: "8.0", last: "Aug 22 2026" },
];

// Each cell is tied to the leader who runs it via leaderId, so drilling into
// a leader only shows that leader's own cells.
const cellRows = [
  { id: "springfield-monday", leaderId: "gavin", name: "Springfield Monday", day: "Monday", campus: "Springfield", attendance: 18, average: "9.0", trend: 6, sessions: 4 },
  { id: "business-friday", leaderId: "mercia", name: "Business Friday", day: "Friday", campus: "Central", attendance: 14, average: "7.0", trend: 0, sessions: 4 },
  { id: "springfield-thursday", leaderId: "gavin", name: "Springfield Thursday", day: "Thursday", campus: "Springfield", attendance: 12, average: "6.0", trend: 15, sessions: 4 },
];

const leaderColumns = [{ key: "name", label: "LEADER NAME" }, { key: "cells", label: "TOTAL CELLS", numeric: true }, { key: "attendance", label: "TOTAL ATTENDANCE", numeric: true }, { key: "average", label: "AVG ATTENDANCE", numeric: true }, { key: "last", label: "LAST ACTIVE" }, { key: "status", label: "STATUS", render: () => <StatusChip /> }];

// Landing-page data, straight from Reporting Dashboard.pdf.
const trendLabels = ["Aug 02, 2026", "Aug 09, 2026", "Aug 16, 2026", "Aug 23, 2026"];
const attendanceTrend = [1280, 1300, 1400, 1400];
const campusComparison = [
  { campus: "Springfield", value: 3000 },
  { campus: "Riverside", value: 950 },
  { campus: "Northside", value: 800 },
];
const campusMax = 3600;
const ministryRows = [
  { ministry: "Life Class", registered: 200, attended: 173, completed: 152, attendancePct: "+86.5%", completionPct: "+76.0%" },
  { ministry: "School of Leaders", registered: 60, attended: 52, completed: 44, attendancePct: "+86.7%", completionPct: "+73.3%" },
  { ministry: "Plan 40", registered: 140, attended: 124, completed: 126, attendancePct: "+88.6%", completionPct: "+90.0%" },
  { ministry: "School Cell", registered: 50, attended: 42, completed: 38, attendancePct: "+84.0%", completionPct: "+76.0%" },
];
// path: null => that section's overview isn't built yet, so the tile is static.
const kpiTiles = [
  { key: "attendance", label: "Total Attendance", value: "5,490", caption: "86 new visitors", tone: colors.green, path: null },
  { key: "cells", label: "Active Cells", value: "5", caption: "51 cell attendance", tone: colors.green, path: "/reporting/dashboard/cells" },
  { key: "life-class", label: "Life Class", value: "173", caption: "+86.5% attendance", tone: colors.green, path: null },
  { key: "school-of-leaders", label: "School of Leaders", value: "52", caption: "+86.7% attendance", tone: colors.muted, path: null },
  { key: "plan-40", label: "Plan 40", value: "126", caption: "+90.0% completion", tone: colors.green, path: null },
  { key: "service-target", label: "Service Target", value: "343.1%", caption: "target 1,600", tone: colors.green, path: null },
  { key: "twelve-tasks", label: "Twelve Tasks", value: "4/12", caption: "+33.3% complete", tone: colors.green, path: null },
  { key: "staff-interns-youth", label: "Staff / Interns / Youth", value: "4/3/5", caption: "people tracked", tone: colors.muted, path: null },
];

// ---------------------------------------------------------------------------
// Small shared pieces
// ---------------------------------------------------------------------------
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
          <Typography sx={{ color: trail?.length ? colors.muted : "#fff", fontSize: 14, fontWeight: trail?.length ? 400 : 700 }}>
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
                  <Typography sx={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>{seg.label}</Typography>
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
  return (
    <>
      <Header title="Reporting Dashboard" subtitle="Automated church metrics — calculated from live data." />

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={3}>
        <TextField select label="Reporting Period" defaultValue="This Month" size="small" sx={{ minWidth: 220 }}>
          {["This Month", "Last Month", "This Quarter", "This Year"].map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
        </TextField>
        <TextField select label="Campus" defaultValue="All Campuses" size="small" sx={{ minWidth: 220 }}>
          {["All Campuses", "Springfield", "Riverside", "Northside"].map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </TextField>
      </Stack>

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
            {ministryRows.map((row) => (
              <Box component="tr" key={row.ministry} sx={{ borderBottom: `1px solid ${colors.border}` }}>
                <Box component="td" sx={{ p: 1.5, fontWeight: 600 }}>{row.ministry}</Box>
                <Box component="td" sx={{ p: 1.5 }}>{row.registered}</Box>
                <Box component="td" sx={{ p: 1.5 }}>{row.attended}</Box>
                <Box component="td" sx={{ p: 1.5 }}>{row.completed}</Box>
                <Box component="td" sx={{ p: 1.5, color: colors.blue }}>{row.attendancePct}</Box>
                <Box component="td" sx={{ p: 1.5, color: colors.green }}>{row.completionPct}</Box>
              </Box>
            ))}
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
      <KpiCardGrid items={[{ label: "Total Cell Attendance", value: 51, caption: "+8.3% vs last week", tone: colors.green }, { label: "Total Active Cells", value: 5, caption: "across 3 campuses", tone: colors.teal }, { label: "Average per Cell", value: "10.2", caption: "trend positive", tone: colors.blue }, { label: "Active Cell Leaders", value: 3, caption: "Gavin, Mercia, David", tone: colors.orange }]} />
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" }, gap: 2, mb: 2 }}>
        <ChartPanel title="Weekly Attendance Trend" subtitle="Attendance performance by leader over current month" footnote="Note: Aggregate = total cell attendances across all leaders (not unique people).">
          <MultiLineTrendChart labels={weekLabels} datasets={[{ label: "All Cells (Aggregate)", data: [38, 42, 47, 51, 51], borderColor: colors.teal, borderWidth: 3, tension: .35 }, { label: "Gavin", data: [20, 22, 24, 28, 28], borderColor: "#b18cff", tension: .35 }, { label: "Mercia", data: [10, 12, 13, 15, 15], borderColor: colors.blue, borderDash: [5, 5], tension: .35 }, { label: "David", data: [8, 8, 10, 8, 8], borderColor: colors.orange, tension: .35 }]} />
        </ChartPanel>
        <ChartPanel title="Weekly Active Cells" subtitle="Total cell counts run per week">
          <Stack spacing={1.2}>{weekLabels.map((label, index) => <Stack direction="row" justifyContent="space-between" key={label}><Typography sx={{ color: colors.muted }}>{label}, 2026</Typography><StatusChip>{[4, 5, 5, 5, 5][index]} cells</StatusChip></Stack>)}</Stack>
        </ChartPanel>
      </Box>
      <SectionTitle title="Cell Leaders" />
      <ReportDataTable columns={leaderColumns} rows={leaders.map((leader) => ({ ...leader, status: "Active" }))} onRowClick={(row) => navigate(`/reporting/dashboard/cells/${row.id}`)} />
    </>
  );
}

function LeaderDetail({ leaderId }) {
  const navigate = useNavigate();
  const leader = leaders.find((item) => item.id === leaderId);

  // Invalid leaderId (typo, stale link) -> back to Cells overview rather than
  // silently rendering the first leader's data.
  if (!leader) return <Navigate to="/reporting/dashboard/cells" replace />;

  const leaderCells = cellRows.filter((cell) => cell.leaderId === leader.id);
  const columns = [{ key: "name", label: "CELL/EVENT NAME" }, { key: "day", label: "DAY" }, { key: "campus", label: "CAMPUS" }, { key: "attendance", label: "ATTENDANCE (PERIOD)", numeric: true }, { key: "average", label: "AVG ATTENDANCE", numeric: true }, { key: "trend", label: "TREND", render: (row) => <Trend value={row.trend} /> }, { key: "sessions", label: "SESSIONS", numeric: true }];

  return (
    <>
      <Header title={leader.name} subtitle="Cell Leader Performance Summary & cell group insights." />
      <KpiCardGrid items={[{ label: "Total Cells", value: leader.cells, caption: "under supervision" }, { label: "Total Attendance", value: leader.attendance, caption: "+12% vs prior period", tone: colors.green }, { label: "Sessions Run", value: 16, caption: "across 4 weeks" }, { label: "Average per Session", value: "7.0", caption: "target 8.0", tone: colors.orange }]} />
      <ChartPanel title="Cell Performance Over Time" subtitle="Individual performance and combined active cell output" footnote={`Note: Aggregate = total attendances across ${leader.name}'s selected cells.`}>
        <MultiLineTrendChart labels={weekLabels} datasets={[{ label: "Aggregate", data: [8, 10, 12, 14, 15], borderColor: "#fff", borderDash: [4, 4], tension: .35 }, ...leaderCells.map((cell, index) => ({ label: cell.name, data: [4 + index, 5 + index, 6 + index, 7 + index, 8 + index], borderColor: [colors.teal, colors.blue, colors.orange][index % 3], tension: .35 }))]} />
      </ChartPanel>
      <Box mt={2}>
        <SectionTitle title={`${leader.name}'s Cells & Events`} />
        <ReportDataTable columns={columns} rows={leaderCells} onRowClick={(row) => navigate(`/reporting/dashboard/cells/${leader.id}/${row.id}`)} />
      </Box>
    </>
  );
}

function CellDetail({ leaderId, cellId }) {
  const leader = leaders.find((item) => item.id === leaderId);
  const cell = cellRows.find((item) => item.id === cellId && item.leaderId === leaderId);

  if (!leader) return <Navigate to="/reporting/dashboard/cells" replace />;
  if (!cell) return <Navigate to={`/reporting/dashboard/cells/${leaderId}`} replace />;

  const weeks = weekLabels.slice(0, 4);
  const weeklyAttendance = [4, 6, 5, 8];
  const rows = weeks.map((week, index) => ({ week: `Week ${index + 1}`, date: week + ", 2026", attendance: weeklyAttendance[index], visitors: [1, 0, 2, 1][index], notes: index === 3 ? "Strong turnout" : "-", status: "Completed ✓" }));
  const columns = [{ key: "week", label: "WEEK" }, { key: "date", label: "DATE" }, { key: "attendance", label: "ATTENDANCE", numeric: true }, { key: "visitors", label: "NEW VISITORS", numeric: true }, { key: "notes", label: "NOTES" }, { key: "status", label: "STATUS", render: (row) => <Typography sx={{ color: colors.green, fontWeight: 700 }}>{row.status}</Typography> }];

  return (
    <>
      <Header title={cell.name} subtitle={`${leader.name} · ${cell.campus} Campus · Every ${cell.day} evening.`} />
      <KpiCardGrid items={[{ label: "Total Attendance", value: cell.attendance, caption: "cumulative for period" }, { label: "Sessions Held", value: "4", caption: "100% completion", tone: colors.green }, { label: "Average Attendance", value: cell.average, caption: "per active session" }, { label: "Trend Rate", value: "+3.2%", caption: "vs last month", tone: colors.orange }]} />
      <ChartPanel title="Attendance Progression" subtitle="Session attendance count by week">
        <AreaTrendChart labels={weeks} data={weeklyAttendance} />
      </ChartPanel>
      <Box mt={2}>
        <SectionTitle title="Weekly Session History" />
        <ReportDataTable columns={columns} rows={rows} totalRow={{ week: "Total", attendance: 23, visitors: 4, status: "4/4 Complete" }} />
      </Box>
    </>
  );
}

// ---------------------------------------------------------------------------
// Entry point — decides which sub-view to render from the URL params.
// ---------------------------------------------------------------------------
export default function ReportingDashboard() {
  const { section, leaderId, cellId } = useParams();
  const navigate = useNavigate();

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