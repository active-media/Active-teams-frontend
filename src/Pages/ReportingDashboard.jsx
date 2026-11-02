import { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Alert, Box, Breadcrumbs, Button, LinearProgress, Paper, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Typography, useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import ChecklistIcon from "@mui/icons-material/Checklist";
import ManageAccountsOutlinedIcon from "@mui/icons-material/ManageAccountsOutlined";
import InsightsIcon from "@mui/icons-material/Insights";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import { getDashboard } from "../api/reportingApi";
import { ALL_CAMPUSES, DEFAULT_PERIOD } from "../features/reporting/constants";
import CampusSelect from "../features/reporting/components/CampusSelect";
import PeriodPicker from "../features/reporting/components/PeriodPicker";

/* ------------------------------------------------------------------ */
/* Response normalisers. If the backend field names differ, adjust     */
/* ONLY these helpers - the UI below does not need to change.          */
/* ------------------------------------------------------------------ */

const KPI_ORDER = [
  "total_attendance", "active_cells", "life_class", "school_of_leaders",
  "plan_40", "service_target", "twelve_tasks", "staff_interns_youth",
];

const KPI_ICONS = {
  total_attendance: PeopleOutlineIcon,
  active_cells: AccountTreeOutlinedIcon,
  life_class: SchoolOutlinedIcon,
  school_of_leaders: MenuBookOutlinedIcon,
  plan_40: TrackChangesIcon,
  service_target: TrendingUpIcon,
  twelve_tasks: ChecklistIcon,
  staff_interns_youth: ManageAccountsOutlinedIcon,
};

/* Where each KPI box leads. null = page not built yet, so the box renders
   as a disabled "Coming soon" card instead of a dead click. */
const KPI_ROUTES = {
  total_attendance: "/reporting/attendance",
  active_cells: "/reports/cells_graph",
  service_target: "/reporting/service-target",
  twelve_tasks: "/reporting/twelve-tasks",
  life_class: null,
  school_of_leaders: null,
  plan_40: null,
  staff_interns_youth: null,
};

/* Carry the dashboard's period, custom dates and campus into the sub-page. */
const CARRIED_PARAMS = ["period", "start_date", "end_date", "custom", "campus"];

function formatValue(item) {
  const raw = item.value;
  if (raw === null || raw === undefined || raw === "") return "—";
  if (typeof raw !== "number") return String(raw);
  if (item.format === "percent") return `${raw.toFixed(1)}%`;
  return raw.toLocaleString();
}

function kpiCaption(item) {
  if (item.delta_label) return item.delta_label;
  if (typeof item.delta === "number") return `${item.delta > 0 ? "+" : ""}${item.delta.toFixed(1)}%`;
  return item.hint ?? "";
}

function kpiTone(item) {
  if (typeof item.delta !== "number") return "neutral";
  if (item.delta > 0) return "success";
  if (item.delta < 0) return "error";
  return "neutral";
}

function getKpis(dashboard) {
  const src = dashboard?.kpis;
  if (!src) return [];
  const list = Array.isArray(src)
    ? src
    : Object.entries(src).map(([key, v]) =>
        v && typeof v === "object" ? { key, ...v } : { key, value: v });
  return list
    .map((item, index) => ({
      key: item.key ?? item.id ?? `kpi-${index}`,
      label: item.label ?? item.key,
      value: formatValue(item),
      caption: kpiCaption(item),
      tone: kpiTone(item),
      index,
    }))
    .sort((a, b) => {
      const ai = KPI_ORDER.indexOf(a.key);
      const bi = KPI_ORDER.indexOf(b.key);
      if (ai === -1 && bi === -1) return a.index - b.index;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
}

function getTable(dashboard, key) {
  const table = dashboard?.tables?.find((t) => t.key === key);
  if (!table) return null;
  const columns = (table.columns || []).map((c, i) =>
    typeof c === "string" ? { key: c, label: c } : { key: c.key ?? `c${i}`, label: c.label ?? c.key, format: c.format });
  const rows = (table.rows || []).map((r) =>
    Array.isArray(r) ? Object.fromEntries(columns.map((c, i) => [c.key, r[i]])) : r);
  return { title: table.title ?? "Ministry Performance", columns, rows };
}

function getSeries(dashboard, key) {
  const series = dashboard?.series?.find((s) => s.key === key);
  const points = (series?.points || []).map((p) =>
    Array.isArray(p) ? { x: p[0], y: p[1] } : p);
  return { title: series?.title ?? series?.label, points };
}

/* ------------------------------------------------------------------ */
/* Tiny dependency-free charts                                         */
/* ------------------------------------------------------------------ */

function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

function niceMax(value) {
  if (!value || value <= 0) return 4;
  const pow = 10 ** Math.floor(Math.log10(value));
  const n = value / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 4 ? 4 : n <= 5 ? 5 : 10;
  return step * pow;
}

function formatX(x) {
  if (typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x)) {
    const d = new Date(`${x}T00:00:00`);
    return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
  }
  return String(x ?? "");
}

function smoothPath(pts) {
  if (pts.length < 2) return pts.length ? `M${pts[0][0]},${pts[0][1]}` : "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const cx = (x0 + x1) / 2;
    d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }
  return d;
}

function ChartFrame({ points, height = 260, render }) {
  const theme = useTheme();
  const [ref, width] = useWidth();
  const pad = { top: 12, right: 16, bottom: 28, left: 44 };
  const maxY = niceMax(Math.max(0, ...points.map((p) => Number(p.y) || 0)));
  const ticks = Array.from({ length: 5 }, (_, i) => (maxY / 4) * i);
  const innerW = Math.max(0, width - pad.left - pad.right);
  const innerH = height - pad.top - pad.bottom;
  const y = (v) => pad.top + innerH - (v / maxY) * innerH;
  const muted = theme.palette.text.secondary;
  const grid = alpha(theme.palette.text.primary, 0.08);

  return (
    <Box ref={ref} sx={{ width: "100%" }}>
      {width > 0 && (
        <svg width={width} height={height} role="img">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke={grid} />
              <text x={pad.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill={muted}>
                {Math.round(t).toLocaleString()}
              </text>
            </g>
          ))}
          {render({ pad, innerW, innerH, y, width, height, muted, grid })}
        </svg>
      )}
    </Box>
  );
}

export function LineChart({ points }) {
  const theme = useTheme();
  const color = theme.palette.primary.main;
  return (
    <ChartFrame
      points={points}
      render={({ pad, innerW, y, height, muted }) => {
        const step = points.length > 1 ? innerW / (points.length - 1) : 0;
        const xy = points.map((p, i) => [pad.left + (points.length > 1 ? i * step : innerW / 2), y(Number(p.y) || 0)]);
        const labelEvery = Math.ceil(points.length / 6);
        return (
          <>
            <path d={smoothPath(xy)} fill="none" stroke={color} strokeWidth="2.5" />
            {xy.map(([cx, cy], i) => (
              <g key={`${points[i].x}-${i}`}>
                <circle cx={cx} cy={cy} r="4" fill={color}>
                  <title>{`${formatX(points[i].x)}: ${Number(points[i].y).toLocaleString()}`}</title>
                </circle>
                {i % labelEvery === 0 && (
                  <text x={cx} y={height - 8} fontSize="11" fill={muted}
                    textAnchor={i === 0 ? "start" : i === xy.length - 1 ? "end" : "middle"}>
                    {formatX(points[i].x)}
                  </text>
                )}
              </g>
            ))}
          </>
        );
      }}
    />
  );
}

const MAX_BARS = 8;

function shorten(value, max = 14) {
  const text = String(value ?? "");
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function BarChart({ points: allPoints, limit = MAX_BARS }) {
  const theme = useTheme();
  const color = theme.palette.primary.main;
  const points = [...allPoints]
    .sort((a, b) => (Number(b.y) || 0) - (Number(a.y) || 0))
    .slice(0, limit);
  return (
    <>
      <ChartFrame
        points={points}
        render={({ pad, innerW, innerH, y, height, muted }) => {
          const slot = innerW / Math.max(points.length, 1);
          const barW = Math.min(slot * 0.7, 120);
          return points.map((p, i) => {
            const cx = pad.left + slot * i + slot / 2;
            const top = y(Number(p.y) || 0);
            return (
              <g key={`${p.x}-${i}`}>
                <rect x={cx - barW / 2} y={top} width={barW} height={pad.top + innerH - top} rx="2" fill={color}>
                  <title>{`${p.x}: ${Number(p.y).toLocaleString()}`}</title>
                </rect>
                <text x={cx} y={height - 8} fontSize="11" fill={muted} textAnchor="middle">
                  <title>{String(p.x)}</title>
                  {shorten(p.x, Math.max(6, Math.floor(slot / 7)))}
                </text>
              </g>
            );
          });
        }}
      />
      {allPoints.length > limit && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          Showing the top {limit} of {allPoints.length}
        </Typography>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Presentational pieces                                               */
/* ------------------------------------------------------------------ */

export const cardSx = {
  p: 2.5,
  borderRadius: 2,
  border: 1,
  borderColor: "divider",
  backgroundImage: "none",
};

function KpiCard({ item, to }) {
  const Icon = KPI_ICONS[item.key] || InsightsIcon;
  const linkProps = to ? { component: RouterLink, to } : {};
  return (
    <Paper
      variant="outlined"
      {...linkProps}
      aria-disabled={to ? undefined : true}
      sx={{
        ...cardSx,
        p: 2,
        display: "block",
        textDecoration: "none",
        color: "inherit",
        ...(to
          ? {
              cursor: "pointer",
              transition: "border-color 120ms, box-shadow 120ms",
              "&:hover, &:focus-visible": { borderColor: "primary.main", boxShadow: 1 },
            }
          : { opacity: 0.65, cursor: "default" }),
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box sx={{ width: 32, height: 32, borderRadius: 1.5, display: "grid", placeItems: "center",
          bgcolor: (t) => alpha(t.palette.primary.main, 0.14), color: "primary.main" }}>
          <Icon sx={{ fontSize: 18 }} />
        </Box>
        {to ? (
          <Typography variant="caption" sx={{ color: item.caption && item.tone !== "neutral" ? `${item.tone}.main` : "text.secondary" }}>
            {item.caption}
          </Typography>
        ) : (
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Coming soon</Typography>
        )}
      </Stack>
      <Typography variant="h5" fontWeight={700} sx={{ mt: 1.5, lineHeight: 1.2 }}>{item.value}</Typography>
      <Typography variant="caption" color="text.secondary">{item.label}</Typography>
    </Paper>
  );
}

function ChartCard({ title, empty, children }) {
  return (
    <Paper variant="outlined" sx={cardSx}>
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>{title}</Typography>
      {empty ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 6, textAlign: "center" }}>
          No data for this period.
        </Typography>
      ) : children}
    </Paper>
  );
}

function cellColor(column) {
  const k = `${column.key} ${column.label}`.toLowerCase();
  if (k.includes("attendance")) return "primary.main";
  if (k.includes("completion")) return "success.main";
  return "text.primary";
}

function formatCell(column, value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") {
    if (column.format === "percent") return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
    return value.toLocaleString();
  }
  return value;
}

function PerformanceTable({ table }) {
  return (
    <Paper variant="outlined" sx={cardSx}>
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>{table.title}</Typography>
      <TableContainer>
        <Table size="small" sx={{ "& td, & th": { borderColor: "divider", py: 1.5 } }}>
          <TableHead>
            <TableRow>
              {table.columns.map((c) => (
                <TableCell key={c.key} sx={{ color: "text.secondary", fontWeight: 400 }}>{c.label}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {table.rows.map((row, ri) => (
              <TableRow key={ri}>
                {table.columns.map((c, ci) => (
                  <TableCell key={c.key} sx={ci === 0 ? { fontWeight: 600 } : { color: cellColor(c) }}>
                    {formatCell(c, row[c.key])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {table.rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={table.columns.length || 1} sx={{ color: "text.secondary", textAlign: "center" }}>
                  No data for this period.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function ReportingDashboard() {
  const { authFetch } = useContext(AuthContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  const periodParams = {
    period: searchParams.get("period") || DEFAULT_PERIOD,
    start_date: searchParams.get("start_date") || "",
    end_date: searchParams.get("end_date") || "",
    isCustom: searchParams.get("custom") === "true",
  };
  const campus = searchParams.get("campus") || ALL_CAMPUSES;
  const requestParams = {
    ...(periodParams.start_date && periodParams.end_date
      ? { start_date: periodParams.start_date, end_date: periodParams.end_date }
      : { period: periodParams.period }),
    campus,
  };
  const requestKey = JSON.stringify(requestParams);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError(null);
    getDashboard(authFetch, JSON.parse(requestKey))
      .then((result) => { if (current) setDashboard(result); })
      .catch((requestError) => { if (current) setError(requestError); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [authFetch, requestKey, reloadToken]);

  const retry = useCallback(() => setReloadToken((n) => n + 1), []);

  const updatePeriod = (next) => {
    const updated = new URLSearchParams(searchParams);
    ["period", "start_date", "end_date", "custom"].forEach((k) => updated.delete(k));
    if (next.start_date !== undefined || next.end_date !== undefined) {
      updated.set("custom", "true");
      if (next.start_date) updated.set("start_date", next.start_date);
      if (next.end_date) updated.set("end_date", next.end_date);
    } else if (next.period) {
      updated.set("period", next.period);
    }
    setSearchParams(updated);
  };

  const trend = useMemo(() => getSeries(dashboard, "attendance_trend"), [dashboard]);
  const comparison = useMemo(() => getSeries(dashboard, "campus_comparison"), [dashboard]);
  const kpis = useMemo(() => getKpis(dashboard), [dashboard]);
  const table = useMemo(() => getTable(dashboard, "ministry_performance"), [dashboard]);

  const campuses = dashboard?.campuses || [];

  const kpiLink = (key) => {
    const route = KPI_ROUTES[key];
    if (!route) return null;
    const carried = new URLSearchParams();
    CARRIED_PARAMS.forEach((k) => {
      const v = searchParams.get(k);
      if (v) carried.set(k, v);
    });
    const qs = carried.toString();
    return qs ? `${route}?${qs}` : route;
  };

  const isNetworkError = error && /failed to fetch|networkerror|load failed/i.test(error.message || "");

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 3, maxWidth: 1440, mx: "auto" }}>
      <Breadcrumbs sx={{ mb: 2, fontSize: 13 }}>
        <Typography variant="caption" color="text.secondary">Reporting</Typography>
        <Typography variant="caption" color="text.primary">Dashboard</Typography>
      </Breadcrumbs>

      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "flex-start" }} spacing={2} sx={{ mb: 2.5 }}>
        <Box>
          <Typography variant="h5" component="h1" fontWeight={700}>Reporting Dashboard</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Automated church metrics — calculated from live data.
          </Typography>
        </Box>
        <Button component={RouterLink} to="/reports" variant="outlined" size="small">Browse reports</Button>
      </Stack>

      <Paper variant="outlined" sx={{ ...cardSx, mb: 2.5 }}>
        <Box sx={{
          display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          "& .MuiFormControl-root": { width: "100%" },
        }}>
          <PeriodPicker value={periodParams} onChange={updatePeriod} />
          <CampusSelect
            value={campus}
            options={campuses}
            onChange={(value) => {
              const updated = new URLSearchParams(searchParams);
              if (value === ALL_CAMPUSES) updated.delete("campus");
              else updated.set("campus", value);
              setSearchParams(updated);
            }}
          />
        </Box>
      </Paper>

      {loading && <LinearProgress sx={{ mb: 2 }} aria-label="Refreshing dashboard" />}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={retry}>Retry</Button>}>
          {isNetworkError
            ? "Can't reach the reporting API. Check that the backend is running and that VITE_BACKEND_URL points to it."
            : error.message || "The dashboard could not be loaded."}
        </Alert>
      )}

      {dashboard && (
        <>
          {kpis.length > 0 && (
            <Box sx={{ display: "grid", gap: 2, mb: 2.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" } }}>
              {kpis.map((item) => <KpiCard key={item.key} item={item} to={kpiLink(item.key)} />)}
            </Box>
          )}

          <Box sx={{ display: "grid", gap: 2, mb: 2.5, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
            <ChartCard title={trend.title || "Attendance Trend"} empty={trend.points.length === 0}>
              <LineChart points={trend.points} />
            </ChartCard>
            <ChartCard title={comparison.title || "Campus Comparison"} empty={comparison.points.length === 0}>
              <BarChart points={comparison.points} />
            </ChartCard>
          </Box>

          {table && <PerformanceTable table={table} />}
        </>
      )}

      {!dashboard && !loading && !error && <Alert severity="info">No dashboard data is available.</Alert>}
    </Box>
  );
}