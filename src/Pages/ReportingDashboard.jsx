import React, { useContext, useEffect, useMemo, useState } from "react";
import { Box, Card, CircularProgress, Stack, Typography, useTheme } from "@mui/material";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import { AreaTrendChart, KpiCardGrid, PageFrame, ReportDataTable, SectionTitle, StatusChip, Trend } from "../components/ReportingComponents";

// ---------------------------------------------------------------------------
// This single file is the whole Reporting Dashboard: the top-level landing
// view (Reporting Dashboard.pdf) plus every sub-view it drills into. Which
// one renders is driven entirely by the URL params matched in App.jsx:
//   /reporting/dashboard                              -> Home
//   /reporting/dashboard/cells                        -> CellsOverview
//   /reporting/dashboard/cells/:leaderId               -> LeaderDetail
//   /reporting/dashboard/cells/:leaderId/:cellId        -> CellDetail
// Adding a new section (e.g. "life-class") later means adding another
// `section === "..."` branch at the bottom of this file, plus its own
// sub-view functions above it — no new files needed.
//
// DATA SOURCE: everything below calls the FastAPI backend in main.py
// (via authFetch, so the auth token + refresh logic is handled for us),
// not Supabase directly. The endpoints this file depends on:
//   GET /stats/overview?period=              -> Home KPIs + charts (total_attendance, growth_rate, attendance_breakdown)
//   GET /stats/twelve-tasks?period=         -> Twelve Tasks completion data
//   GET /stats/service-target-report         -> Service Target target data
//   GET /events/cells/optimized                      -> Cells leader/cell list
//   GET /events/{event_id}/statistics                -> Cell weekly history
//
// /stats/dashboard-comprehensive is NOT used as a KPI source — it is a
// Tasks/consolidation dashboard. The KPI tiles below draw from the confirmed
// endpoints listed above. Field names are taken from the actual backend
// response shapes, not guessed from the endpoint name.
// ---------------------------------------------------------------------------

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function useColors() {
  const theme = useTheme();
  const mode = theme.palette.mode;
  return useMemo(
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
}

function LoadingPanel() {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 8 }}>
      <CircularProgress size={28} />
    </Box>
  );
}

function ErrorPanel({ message }) {
  return (
    <Box sx={{ py: 4 }}>
      <Typography sx={{ color: "#e65100", fontWeight: 600 }}>Couldn't load this data.</Typography>
      <Typography sx={{ color: "#8a8f98", fontSize: 14 }}>{message}</Typography>
    </Box>
  );
}

function ChartPanel({ title, subtitle, footnote, children }) {
  const colors = useColors();
  return (
    <Card sx={{ p: 2.5, bgcolor: colors.panel, border: `1px solid ${colors.border}`, borderRadius: 2 }}>
      <Typography sx={{ fontWeight: 700 }}>{title}</Typography>
      {subtitle && <Typography sx={{ color: colors.muted, fontSize: 13, mb: 1.5 }}>{subtitle}</Typography>}
      {children}
      {footnote && <Typography sx={{ color: colors.muted, fontSize: 12, mt: 1.5 }}>{footnote}</Typography>}
    </Card>
  );
}

function Header({ title, subtitle }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>{title}</Typography>
      {subtitle && <Typography sx={{ color: "#8a8f98" }}>{subtitle}</Typography>}
    </Box>
  );
}

function DashboardBreadcrumb({ trail, onBack }) {
  const colors = useColors();
  if (!trail.length) return null;
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2, color: colors.muted, fontSize: 14 }}>
      {onBack && <Typography onClick={onBack} sx={{ cursor: "pointer", fontWeight: 600, color: colors.blue }}>← Back</Typography>}
      {trail.map((item, i) => (
        <Typography key={i} sx={{ color: i === trail.length - 1 ? colors.text : colors.muted }}>
          {item.label}{i < trail.length - 1 ? " /" : ""}
        </Typography>
      ))}
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Home — top-level dashboard
// ---------------------------------------------------------------------------
function Home({ activeCellsCount }) {
  const colors = useColors();
  const { authFetch } = useContext(AuthContext);
  const navigate = useNavigate();

  const [period, setPeriod] = useState("thisMonth");
  const [overview, setOverview] = useState(null);     // /stats/overview
  const [twelveTasks, setTwelveTasks] = useState(null); // /stats/twelve-tasks
  const [serviceTarget, setServiceTarget] = useState(null); // /stats/service-target-report
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  

  useEffect(() => {
    let cancelled = false;

    const fetchHomeData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [overviewRes, twelveTasksRes, serviceTargetRes] = await Promise.all([
          authFetch(`${BACKEND_URL}/stats/overview?period=${period}`),
          authFetch(`${BACKEND_URL}/stats/twelve-tasks?period=${period === "thisMonth" ? "thisWeek" : period}`),
          authFetch(`${BACKEND_URL}/stats/service-target-report`),
        ]);

        if (!overviewRes.ok) throw new Error(`Overview request failed (${overviewRes.status})`);
        const overviewData = await overviewRes.json();
        if (!cancelled) setOverview(overviewData);

        // Twelve Tasks and Service Target are allowed to fail independently —
        // a hiccup in one shouldn't blank the whole page.
        if (twelveTasksRes.ok && !cancelled) setTwelveTasks(await twelveTasksRes.json());
        if (serviceTargetRes.ok && !cancelled) setServiceTarget(await serviceTargetRes.json());
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Something went wrong");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchHomeData();
    return () => { cancelled = true; };
  }, [authFetch, period, setPeriod, setError]);

  if (loading) return <LoadingPanel />;
  if (error) return <ErrorPanel message={error} />;
  if (!overview) return null;

  // --- Adapt each real response into what its tile/chart needs. ----------
  // sb_get_stats_overview() returns: total_attendance, growth_rate,
  // attendance_breakdown ({label: count}), outstanding_cells, total_people.
  const totalAttendance = overview?.total_attendance ?? "—";
  const growthRate = overview?.growth_rate;
  const trendEntries = Object.entries(overview?.attendance_breakdown || {});
  const trendLabels = trendEntries.map(([label]) => label);
  const trendValues = trendEntries.map(([, value]) => value);

  // /stats/twelve-tasks returns: {period, previous_period, rows:[{person_id, name, last_week, target, this_week}]}
  const twelveTasksSummary = twelveTasks
    ? `${twelveTasks.rows?.reduce((sum, r) => sum + (r.this_week || 0), 0) ?? "—"}/${twelveTasks.rows?.length ?? "—"}`
    : "—";

  // /stats/service-target-report returns: {targets:[{leader_name, target_count, ...}], total_target, total_targets}
  const serviceTargetPct = serviceTarget?.total_target ?? "—";
  const serviceTargetCaption = serviceTarget?.total_target
    ? `of ${serviceTarget?.total_targets || "—"} targets set`
    : "No targets configured";

  // Active Cells tile reuses the same /events/cells/optimized fetch the Cells
  // section uses (see useCellsData below) — passed down as activeCellsCount.

  // path: null => that section's overview isn't built yet, so the tile stays a
  // plain card (no click-through). Flip to a real path once that section's
  // sub-view exists (see the section === "..." branches at the bottom of this file).
  const kpiTiles = [
    { key: "attendance", label: "Total Attendance", value: totalAttendance, caption: growthRate != null ? `${growthRate > 0 ? "+" : ""}${growthRate}% vs last period` : "", tone: colors.green, path: null },
    { key: "cells", label: "Active Cells", value: activeCellsCount ?? "—", caption: "", tone: colors.green, path: "/reporting/dashboard/cells" },
    { key: "life-class", label: "Life Class", value: "Not available yet", caption: "needs a backend query", tone: colors.muted, path: null },
    { key: "school-of-leaders", label: "School of Leaders", value: "Not available yet", caption: "needs a backend query", tone: colors.muted, path: null },
    { key: "plan-40", label: "Plan 40", value: "Not available yet", caption: "needs a backend query", tone: colors.muted, path: null },
    { key: "service-target", label: "Service Target", value: serviceTargetPct, caption: serviceTargetCaption, tone: colors.green, path: null },
    { key: "twelve-tasks", label: "Twelve Tasks", value: twelveTasksSummary, caption: "", tone: colors.green, path: null },
    { key: "staff-interns-youth", label: "Staff / Interns / Youth", value: "Not available yet", caption: "needs a backend query", tone: colors.muted, path: null },
  ];

  return (
    <>
      <Header title="Reporting Dashboard" subtitle="Automated church metrics — calculated from live data." />

      <KpiCardGrid
        items={kpiTiles.map((tile) => ({
          label: tile.label,
          value: tile.value,
          caption: tile.caption,
          tone: tile.tone,
          onClick: tile.path ? () => navigate(tile.path) : undefined,
        }))}
      />

      <Box sx={{ my: 2 }}>
        <ChartPanel title="Attendance Trend" subtitle="Total attendance across all services and ministries">
          {trendValues.length ? (
            <AreaTrendChart labels={trendLabels} data={trendValues} />
          ) : (
            <Typography sx={{ color: colors.muted, fontSize: 13 }}>No attendance data for this period yet.</Typography>
          )}
        </ChartPanel>
      </Box>

      <Card sx={{ p: 2.5, bgcolor: colors.panel, border: `1px solid ${colors.border}`, borderRadius: 2 }}>
        <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Ministry Breakdown</Typography>
        <Typography sx={{ color: colors.muted, fontSize: 13 }}>
          Not available yet — Life Class, School of Leaders, Plan 40 and School Cell each need their own
          backend query before this table can show real registered/attended/completed numbers per ministry.
        </Typography>
      </Card>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-views: Cells section
// ---------------------------------------------------------------------------

// Turns the flat list of cell events from /events/cells/optimized into the
// per-leader roster the overview table needs, plus a flat list of individual
// cells so LeaderDetail/CellDetail can look one up by id.
function groupCellsByLeader(cellEvents) {
  const grouped = {};
  const cellRows = [];

  cellEvents.forEach((event) => {
    const leaderName = event.eventLeaderName || event.Leader || "Unassigned";
    const leaderId = leaderName.toLowerCase().replace(/\s+/g, "-");
    const attendance = event.attendance ? Number(event.attendance.checked_in_count || 0) : 0;

    if (!grouped[leaderId]) {
      grouped[leaderId] = { id: leaderId, name: leaderName, cells: 0, attendance: 0 };
    }
    grouped[leaderId].cells += 1;
    grouped[leaderId].attendance += attendance;

    cellRows.push({
      id: event._id || event.id,
      leaderId,
      name: event.eventName || event.name || "Untitled Cell",
      day: event.day || "—",
      campus: event.campus || "—",
      attendance,
      average: attendance,
      trend: event.attendance && event.attendance.status ? (event.attendance.status === "complete" ? " ▲" : " ▼") : "—",
      sessions: event.persistent_attendees ? event.persistent_attendees.length : 1,
    });
  });

  const leaders = Object.values(grouped).map((leader) => ({
    ...leader,
    average: leader.cells ? (leader.attendance / leader.cells).toFixed(1) : "0.0",
    last: "—",
  }));

  return { leaders, cellRows };
}

function useCellsData() {
  const { authFetch } = useContext(AuthContext);
  const [leaders, setLeaders] = useState([]);
  const [cellRows, setCellRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchCells = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await authFetch(`${BACKEND_URL}/events/cells/optimized?limit=100`);
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const data = await res.json();
        // The real /events/cells/optimized returns {"events": [...]}
        const cellEvents = data.events || [];
        const { leaders: leaderRows, cellRows: rows } = groupCellsByLeader(cellEvents);
        if (!cancelled) {
          setLeaders(leaderRows);
          setCellRows(rows);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Something went wrong");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchCells();
    return () => { cancelled = true; };
  }, [authFetch]);

  return { leaders, cellRows, loading, error };
}

const leaderColumns = [
  { key: "name", label: "LEADER NAME" },
  { key: "cells", label: "TOTAL CELLS", numeric: true },
  { key: "attendance", label: "TOTAL ATTENDANCE", numeric: true },
  { key: "average", label: "AVG ATTENDANCE", numeric: true },
  { key: "last", label: "LAST ACTIVE" },
  { key: "status", label: "STATUS", render: () => <StatusChip>Active</StatusChip> },
];

function CellsOverview({ leaders, cellRows }) {
  const colors = useColors();
  const navigate = useNavigate();

  const totalAttendance = cellRows.reduce((sum, c) => sum + (c.attendance || 0), 0);
  const totalCells = cellRows.length;
  const avgPerCell = totalCells ? (totalAttendance / totalCells).toFixed(1) : "0.0";

  return (
    <>
      <Header title="Cells Overview" subtitle="Aggregated cell attendance and leader performance across all campuses." />
      <KpiCardGrid
        items={[
          { label: "Total Cell Attendance", value: totalAttendance, tone: colors.green },
          { label: "Total Active Cells", value: totalCells, tone: colors.teal },
          { label: "Average per Cell", value: avgPerCell, tone: colors.blue },
          { label: "Active Cell Leaders", value: leaders.length, caption: leaders.map((l) => l.name).slice(0, 3).join(", "), tone: colors.orange },
        ]}
      />
      <SectionTitle title="Cell Leaders" />
      <ReportDataTable
        columns={leaderColumns}
        rows={leaders}
        onRowClick={(row) => navigate(`/reporting/dashboard/cells/${row.id}`)}
      />
    </>
  );
}

function LeaderDetail({ leaderId, leaders, cellRows }) {
  const colors = useColors();
  const navigate = useNavigate();
  const leader = leaders.find((item) => item.id === leaderId);

  // Invalid leaderId (typo, stale link) -> back to Cells overview rather than
  // silently rendering the first leader's data.
  if (!leader) return <Navigate to="/reporting/dashboard/cells" replace />;

  const leaderCells = cellRows.filter((cell) => cell.leaderId === leader.id);
  const columns = [
    { key: "name", label: "CELL/EVENT NAME" },
    { key: "day", label: "DAY" },
    { key: "campus", label: "CAMPUS" },
    { key: "attendance", label: "ATTENDANCE (PERIOD)", numeric: true },
    { key: "average", label: "AVG ATTENDANCE", numeric: true },
    { key: "trend", label: "TREND", render: (row) => <Trend value={row.trend} /> },
    { key: "sessions", label: "SESSIONS", numeric: true },
  ];

  return (
    <>
      <Header title={leader.name} subtitle="Cell Leader Performance Summary & cell group insights." />
      <KpiCardGrid
        items={[
          { label: "Total Cells", value: leader.cells, caption: "under supervision" },
          { label: "Total Attendance", value: leader.attendance, tone: colors.green },
          { label: "Sessions Run", value: leaderCells.reduce((s, c) => s + (c.sessions || 0), 0) },
          { label: "Average per Session", value: leader.average },
        ]}
      />
      <Box mt={2}>
        <SectionTitle title={`${leader.name}'s Cells & Events`} />
        <ReportDataTable
          columns={columns}
          rows={leaderCells}
          onRowClick={(row) => navigate(`/reporting/dashboard/cells/${leader.id}/${row.id}`)}
        />
      </Box>
    </>
  );
}

function CellDetail({ leaderId, cellId, leaders, cellRows }) {
  const colors = useColors();
  const { authFetch } = useContext(AuthContext);
  const leader = leaders.find((item) => item.id === leaderId);
  const cell = cellRows.find((item) => item.id === cellId && item.leaderId === leaderId);

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!cell) return;
    let cancelled = false;

    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await authFetch(`${BACKEND_URL}/events/${cell.id}/statistics`);
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const data = await res.json();
        // TODO: confirm the weekly-history key on this response shape.
        const weeks = data.weeklyHistory || data.weekly_history || data.weeks || [];
        if (!cancelled) setHistory(weeks);
      } catch (err) {
        if (!cancelled) setError(err.message || "Something went wrong");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchHistory();
    return () => { cancelled = true; };
  }, [authFetch, cell]);

  if (!leader) return <Navigate to="/reporting/dashboard/cells" replace />;
  if (!cell) return <Navigate to={`/reporting/dashboard/cells/${leaderId}`} replace />;

  const rows = history.map((week, index) => ({
    week: `Week ${index + 1}`,
    date: week.date || week.session_date || "—",
    attendance: week.attendance_count ?? week.checked_in_count ?? 0,
    visitors: week.checked_in_attendees ?? week.new_visitors ?? 0,
    notes: week.notes || "-",
    status: week.status || (week.last_attendance_breakdown && week.last_attendance_breakdown.total > 0 ? "Has data" : "—"),
  }));
  const columns = [
    { key: "week", label: "WEEK" },
    { key: "date", label: "DATE" },
    { key: "attendance", label: "ATTENDANCE", numeric: true },
    { key: "visitors", label: "NEW VISITORS", numeric: true },
    { key: "notes", label: "NOTES" },
    { key: "status", label: "STATUS", render: (row) => <Typography sx={{ color: colors.green, fontWeight: 700 }}>{row.status}</Typography> },
  ];

  return (
    <>
      <Header title={cell.name} subtitle={`${leader.name} · ${cell.campus} Campus · Every ${cell.day} evening.`} />
      <KpiCardGrid
        items={[
          { label: "Total Attendance", value: cell.attendance, caption: "cumulative for period" },
          { label: "Sessions Held", value: rows.length },
          { label: "Average Attendance", value: cell.average, caption: "per active session" },
        ]}
      />
      {loading ? (
        <LoadingPanel />
      ) : error ? (
        <ErrorPanel message={error} />
      ) : (
        <>
          <ChartPanel title="Attendance Progression" subtitle="Session attendance count by weekly history">
            {rows.length ? (
              <AreaTrendChart labels={rows.map((r) => r.date)} data={rows.map((r) => r.attendance)} />
            ) : (
              <Typography sx={{ color: colors.muted, fontSize: 13 }}>No session history recorded yet.</Typography>
            )}
          </ChartPanel>
          <Box mt={2}>
            <SectionTitle title="Weekly Session History" />
            <ReportDataTable columns={columns} rows={rows} />
          </Box>
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Entry point — decides which sub-view to render from the URL params.
// ---------------------------------------------------------------------------
export default function ReportingDashboard() {
  const { section, leaderId, cellId } = useParams();
  const navigate = useNavigate();

  // Cells data is shared across CellsOverview/LeaderDetail/CellDetail, so it's
  // fetched once here rather than separately in each sub-view.
  const { leaders, cellRows, loading, error } = useCellsData();

  if (!section) {
    return (
      <PageFrame segments={[]}>
        <DashboardBreadcrumb trail={[]} />
        <Home activeCellsCount={cellRows.length} />
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
        {loading ? (
          <LoadingPanel />
        ) : error ? (
          <ErrorPanel message={error} />
        ) : cellId ? (
          <CellDetail leaderId={leaderId} cellId={cellId} leaders={leaders} cellRows={cellRows} />
        ) : leaderId ? (
          <LeaderDetail leaderId={leaderId} leaders={leaders} cellRows={cellRows} />
        ) : (
          <CellsOverview leaders={leaders} cellRows={cellRows} />
        )}
      </PageFrame>
    );
  }

  // Unknown/not-yet-built section (e.g. life-class before it exists) -> back home.
  return <Navigate to="/reporting/dashboard" replace />;
} 