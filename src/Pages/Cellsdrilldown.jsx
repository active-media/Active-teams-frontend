import { useContext, useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Alert, Box, Breadcrumbs, Button, LinearProgress, Link, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { AuthContext } from "../contexts/AuthContext";
import { getCellsCell, getCellsLeader } from "../api/reportingApi";
import { DEFAULT_PERIOD } from "../features/reporting/constants";
import PeriodPicker from "../features/reporting/components/PeriodPicker";
import ReportTable from "../features/reporting/components/ReportTable";
import { ReportErrorState } from "../features/reporting/components/ReportStates";
// LineChart and cardSx are exported from ReportingDashboard.jsx
import { LineChart, cardSx } from "./ReportingDashboard";

const CELLS_PATH = "/reports/cells_graph";

const LEADER_SUMMARY = [
  { key: "total_attendance", label: "Total attendance" },
  { key: "average_attendance", label: "Average per meeting" },
  { key: "cells", label: "Cells" },
  { key: "leaders", label: "Leaders" },
];
const CELL_SUMMARY = [
  { key: "total_attendance", label: "Total attendance" },
  { key: "average_attendance", label: "Average per meeting" },
  { key: "meetings_held", label: "Meetings held" },
  { key: "did_not_meet", label: "Did not meet" },
];

const LEADER_TABLES = {
  leaders: {
    title: "Leaders in this view",
    columns: [
      { key: "leader", label: "Leader" },
      { key: "cells", label: "Cells", format: "number" },
      { key: "meetings", label: "Meetings", format: "number" },
      { key: "attendance", label: "Attendance", format: "number" },
      { key: "average", label: "Avg / meeting", format: "number" },
    ],
  },
  cells: {
    title: "Cells",
    columns: [
      { key: "name", label: "Cell" },
      { key: "leader", label: "Leader" },
      { key: "meetings", label: "Meetings", format: "number" },
      { key: "attendance", label: "Attendance", format: "number" },
      { key: "location", label: "Campus" },
    ],
  },
};
const CELL_TABLE = {
  title: "Meetings",
  columns: [
    { key: "date", label: "Date" },
    { key: "week", label: "Week" },
    { key: "status", label: "Status" },
    { key: "attendance", label: "Attendance", format: "number" },
  ],
};

function show(value) {
  if (value === null || value === undefined || value === "") return "—";
  return typeof value === "number" ? value.toLocaleString() : String(value);
}

export default function CellsDrilldown({ mode }) {
  const { leaderId, cellId } = useParams();
  const { authFetch } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [view, setView] = useState("downline");

  const periodValue = {
    period: searchParams.get("period") || DEFAULT_PERIOD,
    start_date: searchParams.get("start_date") || "",
    end_date: searchParams.get("end_date") || "",
    isCustom: searchParams.get("custom") === "true",
  };
  const params = useMemo(() => (
    periodValue.isCustom && periodValue.start_date && periodValue.end_date
      ? { start_date: periodValue.start_date, end_date: periodValue.end_date }
      : { period: periodValue.period }
  ), [periodValue.isCustom, periodValue.start_date, periodValue.end_date, periodValue.period]);

  const id = mode === "leader" ? leaderId : cellId;
  const paramsKey = JSON.stringify(params);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const request = mode === "leader"
      ? getCellsLeader(authFetch, id, { ...JSON.parse(paramsKey), scope: view })
      : getCellsCell(authFetch, id, JSON.parse(paramsKey));
    request
      .then((result) => { if (active) setData(result); })
      .catch((e) => { if (active) { setData(null); setError(e); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [authFetch, mode, id, paramsKey, view, reload]);

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

  const search = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const meta = data?.meta || {};
  const summaryDef = mode === "leader" ? LEADER_SUMMARY : CELL_SUMMARY;
  const trend = data?.series?.[0];
  const rows = (key) => data?.tables?.find((t) => t.key === key)?.rows || [];
  const title = meta.title || (mode === "leader" ? "Leader" : "Cell");

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 3, maxWidth: 1440, mx: "auto" }}>
      <Breadcrumbs sx={{ mb: 1.5, fontSize: 13 }}>
        <Link component={RouterLink} to="/reports" underline="hover" color="text.secondary" variant="caption">Reports</Link>
        <Link component={RouterLink} to={`${CELLS_PATH}${search}`} underline="hover" color="text.secondary" variant="caption">Cells Graph</Link>
        {mode === "cell" && meta.leader_id && (
          <Link component={RouterLink} to={`${CELLS_PATH}/leader/${encodeURIComponent(meta.leader_id)}${search}`} underline="hover" color="text.secondary" variant="caption">
            {meta.parent_title}
          </Link>
        )}
        <Typography variant="caption" color="text.primary">{title}</Typography>
      </Breadcrumbs>

      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={1.5} sx={{ mb: 2 }}>
        <Box>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 0.75 }}>Back</Button>
          <Typography variant="h4" component="h1" fontWeight={800}>{title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {mode === "leader"
              ? view === "downline" ? "This leader's cells and every disciple beneath them." : "This leader's cells and their direct disciples."
              : [meta.parent_title && `Led by ${meta.parent_title}`, meta.location].filter(Boolean).join(" · ")}
          </Typography>
        </Box>
        {mode === "leader" && (
          <ToggleButtonGroup size="small" exclusive value={view} onChange={(_, v) => v && setView(v)} aria-label="Leader scope">
            <ToggleButton value="downline">Whole downline</ToggleButton>
            <ToggleButton value="direct">Direct only</ToggleButton>
          </ToggleButtonGroup>
        )}
      </Stack>

      <Box sx={{ mb: 2 }}>
        <PeriodPicker value={periodValue} onChange={updatePeriod} resolvedLabel={meta.period && `${meta.period.start} – ${meta.period.end}`} />
      </Box>

      {loading && <LinearProgress sx={{ mb: 1.5 }} />}

      {error?.status === 403 && <Alert severity="warning" sx={{ mb: 2 }}>You don't have access to this {mode === "leader" ? "leader" : "cell"}.</Alert>}
      {error?.status === 404 && <Alert severity="info" sx={{ mb: 2 }}>This {mode === "leader" ? "leader" : "cell"} could not be found.</Alert>}
      {error && ![403, 404].includes(error.status) && <ReportErrorState error={error} onRetry={() => setReload((n) => n + 1)} />}

      {!error && (
        <>
          {meta.ambiguous_cells > 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {meta.ambiguous_cells} cell{meta.ambiguous_cells === 1 ? "" : "s"} could not be matched to a single leader (more than one person has that name) and {meta.ambiguous_cells === 1 ? "is" : "are"} not shown here.
            </Alert>
          )}

          <Box sx={{ display: "grid", gap: 2, mb: 2, gridTemplateColumns: { xs: "1fr 1fr", lg: "repeat(4, 1fr)" } }}>
            {summaryDef.map((item) => (
              <Paper key={item.key} variant="outlined" sx={{ ...cardSx, p: 2 }}>
                <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2 }}>{show(data?.summary?.[item.key])}</Typography>
                <Typography variant="caption" color="text.secondary">{item.label}</Typography>
              </Paper>
            ))}
          </Box>

          <Paper variant="outlined" sx={{ ...cardSx, mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>{trend?.title || "Attendance by Week"}</Typography>
            {!trend?.points?.length ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 6, textAlign: "center" }}>No meetings in this period.</Typography>
            ) : <LineChart points={trend.points} />}
          </Paper>

          <Stack spacing={2}>
            {mode === "leader" ? (
              <>
                <ReportTable table={{ key: "leaders", ...LEADER_TABLES.leaders, rows: rows("leaders") }} />
                <ReportTable table={{ key: "cells", ...LEADER_TABLES.cells, rows: rows("cells") }} />
              </>
            ) : (
              <ReportTable table={{ key: "sessions", ...CELL_TABLE, rows: rows("sessions") }} />
            )}
          </Stack>
        </>
      )}
    </Box>
  );
}