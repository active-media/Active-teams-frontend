import { useContext, useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DownloadIcon from "@mui/icons-material/Download";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import { AuthContext } from "../../contexts/AuthContext";
import { exportWeeklyResults, getWeeklyResults } from "./api";
import {
  isMonday,
  lastCompletedWeekStart,
  weekRangeLabel,
} from "./dateUtils";

function getRows(data) {
  return data?.results || [];
}

function rowName(row) {
  return row.person_name || row.name || row.full_name || row.leader_name || row.person?.name || row.person_id || "Unknown";
}

function rowPercentage(row) {
  const target = Number(row.weekly_target || 0);
  return target > 0 ? Math.min(100, (Number(row.weekly_completed || 0) / target) * 100) : 0;
}

function responseWeekRange(week, fallbackStart) {
  if (!week?.start || !week?.end) return weekRangeLabel(fallbackStart);
  const formatDate = (date) => new Intl.DateTimeFormat("en-ZA", {
    timeZone: "Africa/Johannesburg",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00Z`));
  return `${formatDate(week.start)} – ${formatDate(week.end)} (SAST)`;
}

function statusText(status) {
  if (status === "met") return "Met";
  if (status === "not_met") return "Not met";
  return "In progress";
}

function statusColor(status) {
  if (status === "met") return "success";
  if (status === "not_met") return "error";
  return "default";
}

function statusIcon(status) {
  if (status === "met") return <CheckCircleIcon fontSize="small" aria-hidden="true" />;
  if (status === "not_met") return <ErrorOutlineIcon fontSize="small" aria-hidden="true" />;
  return <HourglassEmptyIcon fontSize="small" aria-hidden="true" />;
}

function downloadFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function WeeklyReviewTab({ readOnly = false }) {
  const { authFetch } = useContext(AuthContext);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [weekStart, setWeekStart] = useState(lastCompletedWeekStart);
  const [weekError, setWeekError] = useState("");
  const [week, setWeek] = useState(null);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [leaderFilter, setLeaderFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("worst");
  const [exporting, setExporting] = useState("");

  const lastCompleted = useMemo(() => lastCompletedWeekStart(), []);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const params = {
          week: weekStart,
          ...(statusFilter !== "all" ? { status: statusFilter } : {}),
          ...(leaderFilter ? { leader: leaderFilter } : {}),
          ...(roleFilter ? { role: roleFilter } : {}),
          ...(search.trim() ? { search: search.trim() } : {}),
          sort,
        };
        const data = await getWeeklyResults(authFetch, params);
        if (!active) return;
        setRows(getRows(data));
        setSummary(data?.summary || {});
        setWeek(data?.week || null);
      } catch (requestError) {
        if (!active) return;
        setRows([]);
        setSummary({});
        setWeek(null);
        setError(requestError.message || "Unable to load weekly results.");
      } finally {
        if (active) setLoading(false);
      }
    }, search.trim() ? 250 : 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [authFetch, leaderFilter, roleFilter, search, sort, statusFilter, weekStart]);

  const counts = useMemo(() => {
    return {
      met: Number(summary.met ?? rows.filter((row) => row.status === "met").length),
      notMet: Number(summary.not_met ?? rows.filter((row) => row.status === "not_met").length),
      inProgress: Number(summary.in_progress ?? rows.filter((row) => row.status === "in_progress").length),
      total: Number(summary.total ?? rows.length),
    };
  }, [rows, summary]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      const status = row.status || "in_progress";
      const searchText = rowName(row).toLowerCase();
      return (statusFilter === "all" || status === statusFilter) &&
        (!query || searchText.includes(query));
    });
    return filtered.sort((first, second) => {
      if (sort === "name") return rowName(first).localeCompare(rowName(second));
      if (sort === "percentage") return rowPercentage(second) - rowPercentage(first);
      return rowPercentage(first) - rowPercentage(second);
    });
  }, [rows, search, sort, statusFilter]);

  const handleWeekChange = (value) => {
    if (!isMonday(value)) {
      setWeekError("Choose a Monday to review a complete week.");
      return;
    }
    if (value > lastCompleted) {
      setWeekError("Only completed weeks can be reviewed.");
      return;
    }
    setWeekStart(value);
    setWeekError("");
  };

  const handleExport = async (format) => {
    setExporting(format);
    setError("");
    try {
      const result = await exportWeeklyResults(authFetch, {
        week: weekStart,
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
        ...(leaderFilter ? { leader: leaderFilter } : {}),
        ...(roleFilter ? { role: roleFilter } : {}),
        ...(search.trim() ? { search: search.trim() } : {}),
        sort,
        format,
      });
      downloadFile(result.blob, result.filename);
    } catch (requestError) {
      setError(requestError.message || "Unable to export weekly results.");
    } finally {
      setExporting("");
    }
  };

  const excludedNoCompletedAt = summary.excluded_no_completedat ?? rows.reduce(
    (total, row) => total + Number(row.excluded_no_completedat || 0),
    0,
  );
  const unmappedCompletedTasks = summary.unmapped_completed_tasks ?? 0;
  const totalCount = counts.total;
  const metCount = counts.met;

  return (
    <Stack spacing={2} sx={{ minWidth: 0 }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography component="h2" variant="h6" fontWeight={700}>Weekly Review</Typography>
          <Typography variant="body2" color="text.secondary">{responseWeekRange(week, weekStart)}</Typography>
        </Box>
        <TextField
          label="Week starting Monday"
          type="date"
          size="small"
          value={weekStart}
          onChange={(event) => handleWeekChange(event.target.value)}
          error={!!weekError}
          helperText={weekError || "Date range is shown in South African Standard Time."}
          InputLabelProps={{ shrink: true }}
          inputProps={{ max: lastCompleted }}
          sx={{ width: { xs: "100%", sm: 230 } }}
        />
        <Button
          variant="outlined"
          startIcon={exporting ? <CircularProgress size={18} /> : <DownloadIcon />}
          onClick={() => handleExport("csv")}
          disabled={!!exporting || !!weekError}
          fullWidth={isMobile}
        >
          Export CSV
        </Button>
        <Button
          variant="outlined"
          startIcon={exporting ? <CircularProgress size={18} /> : <DownloadIcon />}
          onClick={() => handleExport("xlsx")}
          disabled={!!exporting || !!weekError}
          fullWidth={isMobile}
        >
          Export XLSX
        </Button>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}
      {loading ? (
        <Box sx={{ display: "grid", placeItems: "center", py: 6 }}><CircularProgress /></Box>
      ) : (
        <>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" fontWeight={800}>{metCount} of {totalCount} met target</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                <Chip color="success" variant="outlined" label={`Met: ${counts.met}`} />
                <Chip color="error" variant="outlined" label={`Not met: ${counts.notMet}`} />
                <Chip label={`In progress: ${counts.inProgress}`} />
              </Stack>
            </CardContent>
          </Card>

          <Box component="details" sx={{ color: "text.secondary", fontSize: 13 }}>
            <Box component="summary" sx={{ cursor: "pointer", py: 0.5 }}>Data notes</Box>
            <Typography variant="caption" component="div">
              Completed tasks with no completedAt excluded: {excludedNoCompletedAt}. Unmapped completed tasks: {unmappedCompletedTasks}.
            </Typography>
          </Box>

          <Box sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(5, minmax(0, 1fr))" },
            gap: 1,
          }}>
            <FormControl size="small">
              <InputLabel id="weekly-status-label">Status</InputLabel>
              <Select labelId="weekly-status-label" label="Status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="met">Met</MenuItem>
                <MenuItem value="not_met">Not met</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Leader" size="small" value={leaderFilter} onChange={(event) => setLeaderFilter(event.target.value)} />
            <TextField label="Role" size="small" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} />
            <TextField label="Search" size="small" value={search} onChange={(event) => setSearch(event.target.value)} />
            <FormControl size="small">
              <InputLabel id="weekly-sort-label">Sort</InputLabel>
              <Select labelId="weekly-sort-label" label="Sort" value={sort} onChange={(event) => setSort(event.target.value)}>
                <MenuItem value="worst">Worst first</MenuItem>
                <MenuItem value="name">Name</MenuItem>
                <MenuItem value="percentage">Percentage</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {filteredRows.length === 0 ? (
            <Alert severity="info">{rows.length ? "No weekly results match these filters." : "No results are available for this completed week."}</Alert>
          ) : (
            <Stack spacing={1}>
              {filteredRows.map((row, index) => {
                const status = row.status || "in_progress";
                const percentage = rowPercentage(row);
                return (
                  <Accordion key={row.person_id || index} disableGutters>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Stack spacing={0.75} sx={{ width: "100%", minWidth: 0, pr: 1 }}>
                        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                          {statusIcon(status)}
                          <Typography fontWeight={700} sx={{ overflowWrap: "anywhere" }}>{rowName(row)}</Typography>
                          <Chip
                            size="small"
                            color={statusColor(status)}
                            variant={status === "in_progress" ? "outlined" : "filled"}
                            icon={statusIcon(status)}
                            label={statusText(status)}
                          />
                          {(row.provisional ?? week?.provisional) && <Chip size="small" label="Provisional" variant="outlined" />}
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          {row.weekly_completed ?? 0} / {row.weekly_target ?? 0} · {Math.round(percentage)}%
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={percentage}
                          aria-label={`${rowName(row)} completion progress`}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            bgcolor: "action.hover",
                            "& .MuiLinearProgress-bar": {
                              bgcolor: status === "met" ? "success.main" : status === "not_met" ? "error.main" : "text.secondary",
                            },
                          }}
                        />
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Alert severity="info">
                        Daily target and completion values are not included in the weekly-results response.
                      </Alert>
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </Stack>
          )}
        </>
      )}
      {readOnly && <Typography variant="caption" color="text.secondary">Read-only progress for your account.</Typography>}
    </Stack>
  );
}
