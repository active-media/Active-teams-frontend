import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { Bar, Line } from "react-chartjs-2";
import { CategoryScale, Chart as ChartJS, Legend, LinearScale, BarElement, Tooltip } from "chart.js";
import { AuthContext } from "../contexts/AuthContext";

ChartJS.register(CategoryScale, BarElement, Legend, LinearScale, Tooltip);

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";
const ENTITY_TYPES = [
  { value: "leader1", label: "Leader@1" },
  { value: "leader12", label: "Leader@12" },
  { value: "leader144", label: "Leader@144" },
];
const PERIOD_TYPES = ["monthly", "yearly"];
const CELL_COLORS = ["#42a5f5", "#26c6da", "#ab47bc", "#ffa726", "#66bb6a", "#ef5350"];
const ATTENDANCE_FIELDS = [
  "cell_name",
  "leader_name",
  "period",
  "total_attendance",
  "previous_period_attendance",
  "attendance_growth_rate",
];

const getUserId = (user) => user?.user_id || user?.id || user?.sub || "";

const sortByPeriod = (left, right) => String(left.period || "").localeCompare(String(right.period || ""));

const parseResponse = async (response) => {
  const body = await response.text();
  let parsedBody = body;
  try {
    parsedBody = body ? JSON.parse(body) : null;
  } catch {
    // Keep non-JSON error bodies readable.
  }
  return { parsedBody, displayBody: typeof parsedBody === "string" ? parsedBody : JSON.stringify(parsedBody, null, 2) };
};

const getSeries = (payload) => (Array.isArray(payload?.series) ? payload.series : []);

const formatGrowthRate = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? `${numericValue * 100}%` : String(value);
};

const ErrorState = ({ error, metric }) => {
  if (!error) return null;
  const message = {
    401: "Your session is not authorized to view this report.",
    403: "You do not have permission to view this report.",
    404: "This report endpoint was not found.",
    500: "The backend could not generate this report.",
  }[error.status] || "The report request failed.";

  return (
    <Alert severity="error" sx={{ mt: 2 }}>
      <Typography fontWeight={700}>{metric}: {message}</Typography>
      <Typography variant="body2" sx={{ mt: 0.5 }}>HTTP {error.status}</Typography>
      <Box component="pre" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", mb: 0, mt: 1 }}>{error.body}</Box>
    </Alert>
  );
};

export default function CellsReport() {
  const { user, authFetch } = useContext(AuthContext);
  const userId = getUserId(user);
  const [entityType, setEntityType] = useState("leader1");
  const [periodType, setPeriodType] = useState("monthly");
  const [startPeriod, setStartPeriod] = useState("");
  const [endPeriod, setEndPeriod] = useState("");
  const [attendanceSeries, setAttendanceSeries] = useState([]);
  const [newCellsSeries, setNewCellsSeries] = useState([]);
  const [selectedCellIds, setSelectedCellIds] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [newCellsLoading, setNewCellsLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState(null);
  const [newCellsError, setNewCellsError] = useState(null);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchReports = useCallback(async () => {
    setHasFetched(true);
    setAttendanceError(null);
    setNewCellsError(null);

    if (!userId) {
      const error = { status: "Unavailable", body: "No logged-in user ID is available." };
      setAttendanceError(error);
      setNewCellsError(error);
      return;
    }

    const query = new URLSearchParams({
      user_id: String(userId),
      entity_type: entityType,
      period_type: periodType,
    });
    if (startPeriod) query.set("start_period", startPeriod);
    if (endPeriod) query.set("end_period", endPeriod);

    const fetchMetric = async (endpoint, metric, setLoading, setSeries, setError) => {
      setLoading(true);
      try {
        const response = await authFetch(`${BACKEND_URL}${endpoint}?${query.toString()}`);
        const { parsedBody, displayBody } = await parseResponse(response);
        console.log(`Cells Report raw ${metric} response:`, parsedBody);
        if (!response.ok) {
          setSeries([]);
          setError({ status: response.status, body: displayBody });
          return;
        }
        setSeries(getSeries(parsedBody));
      } catch (requestError) {
        setSeries([]);
        setError({ status: "Request failed", body: requestError.message });
      } finally {
        setLoading(false);
      }
    };

    await Promise.all([
      fetchMetric("/stats/cells-attendance-growth", "attendance", setAttendanceLoading, setAttendanceSeries, setAttendanceError),
      fetchMetric("/stats/new-cells", "new cells", setNewCellsLoading, setNewCellsSeries, setNewCellsError),
    ]);
  }, [authFetch, endPeriod, entityType, periodType, startPeriod, userId]);

  useEffect(() => {
    if (userId) fetchReports();
  }, [fetchReports, userId]);

  useEffect(() => {
    const availableIds = attendanceSeries.map((cell) => cell.cell_id).filter(Boolean);
    setSelectedCellIds((currentIds) => {
      const stillAvailable = currentIds.filter((id) => availableIds.includes(id));
      return stillAvailable.length ? stillAvailable : availableIds;
    });
  }, [attendanceSeries]);

  const selectedCells = useMemo(
    () => attendanceSeries.filter((cell) => selectedCellIds.includes(cell.cell_id)),
    [attendanceSeries, selectedCellIds],
  );

  const attendancePeriods = useMemo(
    () => [...new Set(selectedCells.flatMap((cell) => (cell.periods || []).map((item) => item.period)))].sort(),
    [selectedCells],
  );

  const attendanceChartData = useMemo(() => ({
    labels: attendancePeriods,
    datasets: selectedCells.map((cell, index) => ({
      label: cell.cell_name || cell.cell_id,
      data: attendancePeriods.map((period) => (cell.periods || []).find((item) => item.period === period)?.total_attendance ?? null),
      borderColor: CELL_COLORS[index % CELL_COLORS.length],
      backgroundColor: CELL_COLORS[index % CELL_COLORS.length],
      tension: 0.3,
      spanGaps: true,
    })),
  }), [attendancePeriods, selectedCells]);

  const newCellsPeriods = newCellsSeries.map((item) => item.period).sort();
  const totalNewCells = newCellsSeries.reduce((total, item) => total + (Number(item.new_cells_count) || 0), 0);
  const newCellsChartData = {
    labels: newCellsPeriods,
    datasets: [{
      label: "New cells created",
      data: newCellsPeriods.map((period) => newCellsSeries.find((item) => item.period === period)?.new_cells_count ?? 0),
      backgroundColor: "#42a5f5",
      borderColor: "#90caf9",
      borderWidth: 1,
    }],
  };
  const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: "#dbeafe" } } }, scales: { x: { ticks: { color: "#a9c5e8" }, grid: { color: "rgba(148, 163, 184, 0.14)" } }, y: { beginAtZero: true, ticks: { color: "#a9c5e8" }, grid: { color: "rgba(148, 163, 184, 0.14)" } } } };

  const controls = (
    <Paper sx={{ p: { xs: 2, md: 2.5 }, mb: 3, bgcolor: "#111d31", border: "1px solid #263b5a", color: "#fff" }}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
        <TextField label="Leader / user ID" value={userId} fullWidth InputProps={{ readOnly: true }} helperText="From the authenticated session" sx={{ input: { color: "#fff" }, label: { color: "#a9c5e8" }, "& .MuiFormHelperText-root": { color: "#8fa9ca" } }} />
        <FormControl fullWidth><InputLabel sx={{ color: "#a9c5e8" }}>Entity type</InputLabel><Select value={entityType} label="Entity type" onChange={(event) => setEntityType(event.target.value)} sx={{ color: "#fff", ".MuiOutlinedInput-notchedOutline": { borderColor: "#46658b" } }}>{ENTITY_TYPES.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}</Select></FormControl>
        <FormControl fullWidth><InputLabel sx={{ color: "#a9c5e8" }}>Reporting period</InputLabel><Select value={periodType} label="Reporting period" onChange={(event) => setPeriodType(event.target.value)} sx={{ color: "#fff", ".MuiOutlinedInput-notchedOutline": { borderColor: "#46658b" } }}>{PERIOD_TYPES.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</Select></FormControl>
        <TextField label="Start period" placeholder={periodType === "monthly" ? "YYYY-MM" : "YYYY"} value={startPeriod} onChange={(event) => setStartPeriod(event.target.value)} sx={{ input: { color: "#fff" }, label: { color: "#a9c5e8" } }} />
        <TextField label="End period" placeholder={periodType === "monthly" ? "YYYY-MM" : "YYYY"} value={endPeriod} onChange={(event) => setEndPeriod(event.target.value)} sx={{ input: { color: "#fff" }, label: { color: "#a9c5e8" } }} />
        <Button variant="contained" startIcon={attendanceLoading || newCellsLoading ? <CircularProgress size={18} color="inherit" /> : <RefreshIcon />} onClick={fetchReports} disabled={!userId || attendanceLoading || newCellsLoading} sx={{ height: 56, minWidth: 125, bgcolor: "#1976d2" }}>Refresh</Button>
      </Stack>
    </Paper>
  );

  return (
    <Box sx={{ minHeight: "100vh", p: { xs: 2, md: 4 }, bgcolor: "#08111f", color: "#fff" }}>
      <Box sx={{ maxWidth: 1400, mx: "auto" }}>
        <Typography variant="overline" sx={{ color: "#90caf9", letterSpacing: 2 }}>Reports / Cells</Typography>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Cells Report</Typography>
        <Typography color="#a9c5e8" sx={{ mb: 3 }}>Attendance performance and newly created cells by reporting period.</Typography>
        {controls}

        <Box component="section" sx={{ mb: 4 }}>
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>Cell Attendance Growth</Typography>
          <ErrorState error={attendanceError} metric="Cell attendance growth" />
          {!attendanceLoading && !attendanceError && hasFetched && attendanceSeries.length === 0 && <Alert severity="info">No cell attendance growth data is available for these filters.</Alert>}
          {attendanceSeries.length > 0 && (
            <>
              <Paper sx={{ p: { xs: 2, md: 3 }, mb: 2, bgcolor: "#111d31", border: "1px solid #263b5a" }}>
                <FormControl fullWidth sx={{ mb: 2, maxWidth: 520 }}><InputLabel sx={{ color: "#a9c5e8" }}>Compare cells</InputLabel><Select multiple value={selectedCellIds} onChange={(event) => setSelectedCellIds(event.target.value)} input={<OutlinedInput label="Compare cells" />} renderValue={(ids) => selectedCells.map((cell) => cell.cell_name || cell.cell_id).join(", ")} sx={{ color: "#fff", ".MuiOutlinedInput-notchedOutline": { borderColor: "#46658b" } }}>{attendanceSeries.map((cell) => <MenuItem key={cell.cell_id} value={cell.cell_id}>{cell.cell_name || cell.cell_id}</MenuItem>)}</Select></FormControl>
                <Box sx={{ height: { xs: 300, md: 410 } }}>{selectedCells.length ? <Line data={attendanceChartData} options={chartOptions} /> : <Alert severity="info">Select at least one cell to compare.</Alert>}</Box>
              </Paper>
              <Paper sx={{ overflowX: "auto", bgcolor: "#111d31", border: "1px solid #263b5a" }}><Table size="small"><TableHead><TableRow>{ATTENDANCE_FIELDS.map((field) => <TableCell key={field} sx={{ color: "#90caf9", fontWeight: 700 }}>{field}</TableCell>)}</TableRow></TableHead><TableBody>{selectedCells.flatMap((cell) => (cell.periods || []).map((item) => ({ ...item, cell_name: cell.cell_name, leader_name: cell.leader_name, cell_id: cell.cell_id }))).sort(sortByPeriod).map((item, index) => <TableRow key={`${item.cell_id}-${item.period}-${index}`}><TableCell sx={{ color: "#fff" }}>{item.cell_name || item.cell_id}</TableCell><TableCell sx={{ color: "#fff" }}>{item.leader_name || "-"}</TableCell><TableCell sx={{ color: "#fff" }}>{item.period}</TableCell><TableCell sx={{ color: "#fff" }}>{item.total_attendance}</TableCell><TableCell sx={{ color: "#fff" }}>{item.previous_period_attendance}</TableCell><TableCell sx={{ color: "#fff" }}>{formatGrowthRate(item.attendance_growth_rate)}</TableCell></TableRow>)}</TableBody></Table></Paper>
            </>
          )}
        </Box>

        <Box component="section">
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>New Cells Created</Typography>
          <ErrorState error={newCellsError} metric="New cells" />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }}><Card sx={{ minWidth: 220, bgcolor: "#102a43", border: "1px solid #1d4f7a", color: "#fff" }}><CardContent><Typography color="#a9c5e8" variant="body2">Total new cells</Typography><Typography variant="h3" sx={{ color: "#90caf9", fontWeight: 800 }}>{totalNewCells}</Typography></CardContent></Card></Stack>
          {!newCellsLoading && !newCellsError && hasFetched && newCellsSeries.length === 0 && <Alert severity="info">No newly created cells are available for these filters.</Alert>}
          {newCellsSeries.length > 0 && <><Paper sx={{ p: { xs: 2, md: 3 }, mb: 2, bgcolor: "#111d31", border: "1px solid #263b5a" }}><Box sx={{ height: { xs: 280, md: 360 } }}><Bar data={newCellsChartData} options={chartOptions} /></Box></Paper><Paper sx={{ overflowX: "auto", bgcolor: "#111d31", border: "1px solid #263b5a" }}><Table size="small"><TableHead><TableRow><TableCell sx={{ color: "#90caf9", fontWeight: 700 }}>period</TableCell><TableCell sx={{ color: "#90caf9", fontWeight: 700 }}>new_cells_count</TableCell></TableRow></TableHead><TableBody>{newCellsSeries.slice().sort(sortByPeriod).map((item, index) => <TableRow key={`${item.period}-${index}`}><TableCell sx={{ color: "#fff" }}>{item.period}</TableCell><TableCell sx={{ color: "#fff" }}>{item.new_cells_count}</TableCell></TableRow>)}</TableBody></Table></Paper></>}
        </Box>
      </Box>
    </Box>
  );
}
