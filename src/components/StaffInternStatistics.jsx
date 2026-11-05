import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Button,
  TextField,
  Chip,
  Alert,
  LinearProgress,
  Grid,
  MenuItem,
  Card,
  Pagination,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { Search, Download } from "@mui/icons-material";
import { toast } from "react-toastify";
import { Line } from "react-chartjs-2";
import * as XLSX from "xlsx";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import {
  canAccessStaffIntern,
  splitPeopleByClassification,
  buildTargetsByPerson,
  combineClassificationAndTargets,
  buildTargetVsActualChart,
  computeTargetVsActual,
  buildTargetExport,
  buildHistoryExport,
  validateTargetPayload,
  toNonNegativeInt,
  SERVICES,
  SERVICE_LABELS,
} from "../utils/staffIntern";

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Title, Tooltip, Legend);

const targetKey = (pid, service) => `${pid}:${service}`;

/**
 * Staff & Intern Statistics.
 *
 * Only `admin` and `leader@12` may view/edit. Lists all people, lets the user
 * classify each as Staff or Intern (stored on the People document) and set a
 * per-week Friday/Sunday service target + actual (stored in the backend
 * `service_targets` table). Each service target is automatically marked
 * met/not-met and locked once the service day has passed; admins / leader@12
 * can close or reopen it. Current or date-filtered historical targets and
 * actuals can be downloaded as XLSX.
 */
export default function StaffInternStatistics({ authFetch, currentUser, backendUrl }) {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [marked, setMarked] = useState({});
  const [targetsByPerson, setTargetsByPerson] = useState({});
  const [week, setWeek] = useState("");
  const [services, setServices] = useState({});
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [savingTarget, setSavingTarget] = useState({});
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [historyService, setHistoryService] = useState("all");
  const [history, setHistory] = useState(null);
  const [historyServices, setHistoryServices] = useState([]);
  const [historyRange, setHistoryRange] = useState(null);
  const [historyAppliedService, setHistoryAppliedService] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [historyMessage, setHistoryMessage] = useState(null);

  const authorized = canAccessStaffIntern(currentUser);
  const ROWS_PER_PAGE = 25;

  const flatten = (data) => data?.results || data?.people || (Array.isArray(data) ? data : []);

  const fetchPeopleList = useCallback(async () => {
    const PER_PAGE = 200;
    const MAX_PAGES = 200; // safety cap
    const fetchPage = async (page) => {
      const res = await authFetch(`${backendUrl}/people?page=${page}&perPage=${PER_PAGE}`);
      if (!res.ok) {
        let detail = "Failed to fetch people";
        try {
          const err = await res.json();
          detail = err.detail || detail;
        } catch { /* ignore */ }
        throw new Error(detail);
      }
      return res.json();
    };

    const first = await fetchPage(1);
    const list = flatten(first);
    const reportedTotal = Number(first?.total);
    const reportedPages = Number(first?.total_pages);
    const totalPages = Math.min(
      200,
      Number.isFinite(reportedPages) && reportedPages > 0
        ? reportedPages
        : Number.isFinite(reportedTotal) && reportedTotal > 0
          ? Math.ceil(reportedTotal / 200)
          : list.length < 200
            ? 1
            : 200,
    );

    const CONCURRENCY = 8;
    for (let start = 2; start <= totalPages; start += CONCURRENCY) {
      const pages = [];
      for (let p = start; p < start + CONCURRENCY && p <= totalPages; p += 1) pages.push(p);
      const batch = await Promise.all(pages.map((p) =>
        authFetch(`${backendUrl}/people?page=${p}&perPage=200`).then((r) => (r.ok ? r.json() : { results: [] })),
      ));
      batch.forEach((data) => {
        const arr = data?.results || data?.people || (Array.isArray(data) ? data : []);
        list.push(...arr);
      });
    }
    return list;
  }, [authFetch, backendUrl]);

  const loadTargets = useCallback(async () => {
    try {
      const res = await authFetch(`${backendUrl}/staff-intern/targets`);
      if (!res.ok) return;
      const data = await res.json();
      setWeek(data.week_identifier || "");
      setServices(data.services || {});
      setTargetsByPerson(buildTargetsByPerson(data.targets || []));
    } catch {
      /* targets are best-effort; the classification list still works */
    }
  }, [authFetch, backendUrl]);

  const fetchAll = useCallback(async () => {
    if (!authorized) return;
    try {
      setLoading(true);
      setError(null);
      const list = await fetchPeopleList();
      const initial = {};
      list.forEach((p) => {
        const pid = p._id || p.id;
        if (pid && p.staffStatus && p.staffStatus !== "none") {
          initial[pid] = { type: p.staffStatus, saving: false };
        }
      });
      setMarked(initial);
      setPeople(list);
    } catch (err) {
      setError(err.message || "Failed to load people");
    } finally {
      setLoading(false);
    }
    await loadTargets();
  }, [authorized, fetchPeopleList, loadTargets]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const mergeTarget = useCallback((pid, service, row) => {
    if (!row) return;
    setTargetsByPerson((prev) => ({
      ...prev,
      [pid]: {
        ...(prev[pid] || {}),
        [service]: {
          id: row.id ?? null,
          target: toNonNegativeInt(row.target),
          actual: toNonNegativeInt(row.actual),
          met: Boolean(row.met),
          closed: Boolean(row.closed),
          closedAt: row.closed_at ?? null,
          closedBy: row.closed_by ?? null,
        },
      },
    }));
  }, []);

  // ── classification ────────────────────────────────────────────────────────
  const persistClassification = useCallback(
    async (pid, type) => {
      if (!pid) return;
      setMarked((m) => ({ ...m, [pid]: { type, saving: true } }));
      try {
        const res = await authFetch(`${backendUrl}/people/${pid}/staff-intern`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ staffStatus: type }),
        });
        if (!res.ok) {
          let detail = "Failed to save";
          try { detail = (await res.json()).detail || detail; } catch { /* ignore */ }
          throw new Error(detail);
        }
        setMarked((m) => ({ ...m, [pid]: { type, saving: false } }));
      } catch (err) {
        toast.error(err.message || "Failed to save classification");
        setMarked((m) => {
          const c = { ...m };
          if (type === "none") delete c[pid];
          else c[pid] = { type, saving: false };
          return c;
        });
      }
    },
    [authFetch, backendUrl],
  );

  const mark = useCallback((pid, type) => persistClassification(pid, type), [persistClassification]);
  const unmark = useCallback((pid) => persistClassification(pid, "none"), [persistClassification]);

  // ── targets ───────────────────────────────────────────────────────────────
  const setTargetField = (pid, service, field, value) =>
    setTargetsByPerson((prev) => {
      const cur = prev[pid]?.[service] || { target: 0, actual: 0, met: false, closed: false };
      return {
        ...prev,
        [pid]: { ...(prev[pid] || {}), [service]: { ...cur, [field]: toNonNegativeInt(value) } },
      };
    });

  const saveTarget = useCallback(
    async (pid, service) => {
      const entry = targetsByPerson[pid]?.[service] || { target: 0, actual: 0 };
      const payload = { service, target: entry.target, actual: entry.actual, week_identifier: week || undefined };
      const { valid, errors } = validateTargetPayload(payload);
      if (!valid) {
        toast.error(errors[0] || "Targets and actuals must be non-negative whole numbers");
        return;
      }
      const key = targetKey(pid, service);
      setSavingTarget((s) => ({ ...s, [key]: true }));
      try {
        const res = await authFetch(`${backendUrl}/staff-intern/targets/${pid}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.status === 409) {
          toast.error("This target is closed. Reopen it before editing.");
          return;
        }
        if (!res.ok) {
          let detail = "Failed to save target";
          try { detail = (await res.json()).detail || detail; } catch { /* ignore */ }
          throw new Error(detail);
        }
        const data = await res.json();
        mergeTarget(pid, service, data.target);
        toast.success("Saved");
      } catch (err) {
        toast.error(err.message || "Failed to save target");
      } finally {
        setSavingTarget((s) => ({ ...s, [key]: false }));
      }
    },
    [authFetch, backendUrl, targetsByPerson, week, mergeTarget],
  );

  const closeTarget = useCallback(
    async (pid, service) => {
      try {
        const res = await authFetch(`${backendUrl}/staff-intern/targets/${pid}/close`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ service, week_identifier: week || undefined }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Failed to close");
        const data = await res.json();
        mergeTarget(pid, service, data.target);
        toast.success("Target closed");
      } catch (err) {
        toast.error(err.message || "Failed to close target");
      }
    },
    [authFetch, backendUrl, week, mergeTarget],
  );

  const reopenTarget = useCallback(
    async (pid, service) => {
      try {
        const res = await authFetch(`${backendUrl}/staff-intern/targets/${pid}/reopen`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ service, week_identifier: week || undefined }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Failed to reopen");
        const data = await res.json();
        mergeTarget(pid, service, data.target);
        toast.success("Target reopened");
      } catch (err) {
        toast.error(err.message || "Failed to reopen target");
      }
    },
    [authFetch, backendUrl, week, mergeTarget],
  );

  // ── derived ───────────────────────────────────────────────────────────────
  const entries = useMemo(
    () => combineClassificationAndTargets(marked, targetsByPerson),
    [marked, targetsByPerson],
  );
  const { unmarked, staff, intern } = useMemo(
    () => splitPeopleByClassification(people, marked),
    [people, marked],
  );
  const chartData = useMemo(() => buildTargetVsActualChart(entries), [entries]);
  const totals = useMemo(() => computeTargetVsActual(entries), [entries]);
  const markedCount = Object.keys(entries).length;

  const peopleById = useMemo(
    () => Object.fromEntries(people.map((p) => [p._id || p.id, p])),
    [people],
  );

  const searchTerm = search.trim().toLowerCase();
  const filteredUnmarked = useMemo(() => {
    if (!searchTerm) return unmarked;
    return unmarked.filter((p) => {
      const haystack = [p.Name || p.name, p.Surname || p.surname, p.Email || p.email]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(searchTerm);
    });
  }, [unmarked, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredUnmarked.length / ROWS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * ROWS_PER_PAGE;
  const pagedUnmarked = filteredUnmarked.slice(pageStart, pageStart + ROWS_PER_PAGE);
  const historyIsCurrent = Boolean(
    history !== null &&
    historyRange?.start === rangeStart &&
    historyRange?.end === rangeEnd &&
    historyAppliedService === historyService
  );

  const loadHistory = useCallback(async () => {
    if (!rangeStart || !rangeEnd) {
      toast.info("Choose both a start and end date.");
      return;
    }
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const params = new URLSearchParams({ start_date: rangeStart, end_date: rangeEnd });
      if (historyService !== "all") params.set("service", historyService);
      const res = await authFetch(
        `${backendUrl}/staff-intern/targets?${params.toString()}`,
      );
      if (!res.ok) {
        let detail = "Failed to load past targets";
        try {
          const err = await res.json();
          detail = err.detail || detail;
        } catch { /* ignore */ }
        throw new Error(detail);
      }
      const data = await res.json();
      setHistory(Array.isArray(data.targets) ? data.targets : []);
      setHistoryServices(Array.isArray(data.services) ? data.services : []);
      setHistoryRange({ start: data.start_date || rangeStart, end: data.end_date || rangeEnd });
      setHistoryAppliedService(historyService);
      setHistoryMessage(data.message || null);
    } catch (err) {
      setHistoryError(err.message || "Failed to load past targets");
      setHistory(null);
      setHistoryServices([]);
      setHistoryRange(null);
      setHistoryAppliedService(null);
      setHistoryMessage(null);
    } finally {
      setHistoryLoading(false);
    }
  }, [authFetch, backendUrl, rangeStart, rangeEnd, historyService]);

  const clearHistory = useCallback(() => {
    setHistory(null);
    setHistoryServices([]);
    setHistoryRange(null);
    setHistoryAppliedService(null);
    setHistoryError(null);
    setHistoryMessage(null);
    setRangeStart("");
    setRangeEnd("");
  }, []);

  const handleDownload = useCallback(() => {
    try {
      let summary;
      let detail;
      let name;
      if ((rangeStart || rangeEnd) && !historyIsCurrent) {
        toast.info("Apply the selected date range and service before downloading.");
        return;
      }
      if (historyIsCurrent) {
        if (history.length === 0) {
          toast.info("No past targets to download for this range.");
          return;
        }
        ({ summary, detail } = buildHistoryExport(history, peopleById, marked));
        const serviceSuffix = historyAppliedService === "all" ? "" : `-${historyAppliedService}`;
        name = `staff-intern${serviceSuffix}-${historyRange?.start || "from"}_${historyRange?.end || "to"}`;
      } else {
        ({ summary, detail } = buildTargetExport(entries, peopleById, services, week));
        if (summary.length === 0 && detail.length === 0) {
          toast.info("No target data to download yet.");
          return;
        }
        name = `staff-intern-${week || "current-week"}`;
      }
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), "Summary");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detail), "Detail");
      XLSX.writeFile(wb, `${name}.xlsx`);
      toast.success("Downloaded staff & intern targets");
    } catch (err) {
      toast.error(err.message || "Failed to build Excel file");
    }
  }, [entries, peopleById, services, week, history, historyIsCurrent, historyRange, historyAppliedService, marked, rangeStart, rangeEnd]);

  if (!authorized) return null;

  return (
    <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 1 }} data-testid="staff-intern-section">
      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} mb={2}>
        <Typography variant="h6" fontWeight={600}>Staff &amp; Intern Statistics</Typography>
        <Box display="flex" alignItems="center" gap={1}>
          {week && <Chip size="small" label={`Week ${week}`} data-testid="staff-intern-week" />}
          <Button
            size="small"
            variant="outlined"
            startIcon={<Download />}
            onClick={handleDownload}
            disabled={historyLoading || Boolean((rangeStart || rangeEnd) && !historyIsCurrent)}
            data-testid="download-xlsx"
          >
            Download XLSX
          </Button>
        </Box>
      </Box>

      {/* Upcoming services */}
      {Object.keys(services).length > 0 && (
        <Stack direction="row" spacing={1} flexWrap="wrap" mb={2} data-testid="staff-intern-services">
          {Object.entries(services).map(([key, s]) => (
            <Chip
              key={key}
              size="small"
              color={s.passed ? "default" : "primary"}
              variant={s.passed ? "outlined" : "filled"}
              label={`${s.label || key}: ${s.date}${s.event?.event_name ? ` — ${s.event.event_name}` : ""}${s.passed ? " (closed)" : " (upcoming)"}`}
            />
          ))}
        </Stack>
      )}

      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} action={<Button size="small" onClick={fetchAll}>Retry</Button>}>
          {error}
        </Alert>
      )}

      {!loading && people.length === 0 && !error ? (
        <Alert severity="info" data-testid="staff-intern-empty">No people found.</Alert>
      ) : (
        <Box>
          {/* ── Unmarked people (main list) ── */}
          <Typography variant="subtitle1" fontWeight={600} mb={1}>
            People ({unmarked.length} unmarked)
          </Typography>
          <TextField
            size="small"
            fullWidth
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            sx={{ mb: 2 }}
            InputProps={{ startAdornment: (<InputAdornment position="start"><Search fontSize="small" /></InputAdornment>) }}
          />
          <Stack spacing={1} sx={{ mb: 3 }}>
            {pagedUnmarked.map((p) => {
              const pid = p._id || p.id;
              return (
                <Box key={pid} data-testid={`unmarked-${pid}`} sx={{ p: 1, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
                  <Box display="flex" alignItems="center" gap={1} flexWrap="wrap" justifyContent="space-between">
                    <Typography variant="body2">{p.Name || p.name} {p.Surname || p.surname} ({p.Email || p.email})</Typography>
                    <Box display="flex" gap={1}>
                      <Button size="small" variant="outlined" color="primary" onClick={() => mark(pid, "staff")}>Mark as Staff</Button>
                      <Button size="small" variant="outlined" color="secondary" onClick={() => mark(pid, "intern")}>Mark as Intern</Button>
                    </Box>
                  </Box>
                </Box>
              );
            })}
            {unmarked.length === 0 && (<Alert severity="info">Everyone has been classified as Staff or Intern.</Alert>)}
            {unmarked.length > 0 && filteredUnmarked.length === 0 && (
              <Alert severity="info">No people match “{search}”.</Alert>
            )}
          </Stack>
          {filteredUnmarked.length > ROWS_PER_PAGE && (
            <Box display="flex" justifyContent="center" mb={3}>
              <Pagination size="small" count={totalPages} page={currentPage} onChange={(_, value) => setPage(value)} />
            </Box>
          )}

          {/* ── Marked Staff / Intern group ── */}
          <Typography variant="subtitle1" fontWeight={600} mb={1}>
            Staff &amp; Intern Group ({markedCount} — {staff.length} staff, {intern.length} intern)
          </Typography>
          {markedCount === 0 ? (
            <Alert severity="info" sx={{ mb: 3 }}>No one marked yet. Use “Mark as Staff” or “Mark as Intern” above.</Alert>
          ) : (
            <Stack spacing={1.5} sx={{ mb: 3 }}>
              {[...staff, ...intern].map((p) => {
                const pid = p._id || p.id;
                const m = marked[pid];
                return (
                  <Box key={pid} data-testid={`marked-${pid}`} sx={{ p: 1.5, border: "1px solid", borderColor: m.type === "staff" ? "primary.main" : "secondary.main", borderRadius: 1, bgcolor: "action.hover" }}>
                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap" justifyContent="space-between" mb={1}>
                      <Typography variant="body2" fontWeight={600}>
                        {p.Name || p.name} {p.Surname || p.surname}
                        <Chip size="small" sx={{ ml: 1 }} color={m.type === "staff" ? "primary" : "secondary"} label={m.type === "staff" ? "Staff" : "Intern"} />
                      </Typography>
                      <Button size="small" color="error" onClick={() => unmark(pid)}>Unmark</Button>
                    </Box>
                    <Grid container spacing={1.5}>
                      {SERVICES.map((service) => {
                        const s = targetsByPerson[pid]?.[service] || { target: 0, actual: 0, met: false, closed: false };
                        const saving = savingTarget[targetKey(pid, service)];
                        return (
                          <Grid item xs={12} md={6} key={service}>
                            <Typography variant="caption" color="text.secondary">
                              {SERVICE_LABELS[service]}
                            </Typography>
                            <Box display="flex" flexWrap="wrap" gap={1} alignItems="center">
                              <TextField size="small" label="Target" type="number" value={s.target} disabled={s.closed}
                                inputProps={{ min: 0, step: 1 }} onChange={(e) => setTargetField(pid, service, "target", e.target.value)}
                                data-testid={`target-${pid}-${service}`} />
                              <TextField size="small" label="Actual" type="number" value={s.actual} disabled={s.closed}
                                inputProps={{ min: 0, step: 1 }} onChange={(e) => setTargetField(pid, service, "actual", e.target.value)}
                                data-testid={`actual-${pid}-${service}`} />
                              {s.closed && (
                                <Chip
                                  size="small"
                                  color={s.met ? "success" : "error"}
                                  label={s.met ? "Met" : "Not met"}
                                  data-testid={`met-${pid}-${service}`}
                                />
                              )}
                              {!s.closed ? (
                                <>
                                  <Button size="small" variant="contained" disabled={saving} onClick={() => saveTarget(pid, service)}>Save</Button>
                                  <Button size="small" variant="outlined" color="warning" onClick={() => closeTarget(pid, service)} data-testid={`close-${pid}-${service}`}>Close</Button>
                                </>
                              ) : (
                                <Button size="small" variant="outlined" onClick={() => reopenTarget(pid, service)} data-testid={`reopen-${pid}-${service}`}>Reopen</Button>
                              )}
                            </Box>
                          </Grid>
                        );
                      })}
                    </Grid>
                  </Box>
                );
              })}
            </Stack>
          )}

          {/* ── Target vs Actual totals ── */}
          <Grid container spacing={2} mb={2}>
            <Grid item xs={12} sm={6}>
              <Card variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">Friday Service</Typography>
                <Typography variant="h6">{totals.friday.actual} / {totals.friday.target} ({totals.friday.percent}%)</Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Card variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">Sunday Service</Typography>
                <Typography variant="h6">{totals.sunday.actual} / {totals.sunday.target} ({totals.sunday.percent}%)</Typography>
              </Card>
            </Grid>
          </Grid>

          {/* ── Chart ── */}
          <Typography variant="subtitle1" fontWeight={600} mb={2}>Target vs Actual — Staff vs Intern</Typography>
          {markedCount === 0 ? (
            <Alert severity="info">Classification data will appear in the chart once people are marked.</Alert>
          ) : (
            <Box sx={{ height: 320 }}>
              <Line
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: "top" },
                    title: { display: false },
                    tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label} — ${ctx.label}: ${ctx.parsed.y}` } },
                  },
                  scales: {
                    x: { title: { display: true, text: "Service" } },
                    y: { beginAtZero: true, title: { display: true, text: "Count" }, ticks: { precision: 0 } },
                  },
                }}
              />
            </Box>
          )}
        </Box>
      )}

      {/* ── Past targets by date range ── */}
      <Box mt={4} data-testid="staff-intern-history">
        <Typography variant="subtitle1" fontWeight={600} mb={1}>
          Past Targets (Date Range)
        </Typography>
        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap" mb={2}>
          <TextField
            size="small"
            type="date"
            label="From"
            InputLabelProps={{ shrink: true }}
            value={rangeStart}
            onChange={(e) => setRangeStart(e.target.value)}
            inputProps={{ "data-testid": "history-start" }}
          />
          <TextField
            size="small"
            type="date"
            label="To"
            InputLabelProps={{ shrink: true }}
            value={rangeEnd}
            onChange={(e) => setRangeEnd(e.target.value)}
            inputProps={{ "data-testid": "history-end" }}
          />
          <TextField
            size="small"
            select
            label="Service"
            value={historyService}
            onChange={(e) => setHistoryService(e.target.value)}
            inputProps={{ "data-testid": "history-service" }}
          >
            <MenuItem value="all">All services</MenuItem>
            <MenuItem value="friday">{SERVICE_LABELS.friday}</MenuItem>
            <MenuItem value="sunday">{SERVICE_LABELS.sunday}</MenuItem>
          </TextField>
          <Button
            size="small"
            variant="contained"
            startIcon={<Search />}
            onClick={loadHistory}
            disabled={historyLoading}
            data-testid="history-apply"
          >
            Apply
          </Button>
          {history && (
            <Button size="small" onClick={clearHistory} data-testid="history-clear">
              Clear
            </Button>
          )}
        </Box>

        {historyLoading && <LinearProgress sx={{ mb: 2 }} />}
        {historyError && (
          <Alert severity="error" sx={{ mb: 2 }} data-testid="history-error">
            {historyError}
          </Alert>
        )}
        {history && historyRange && (
          <Typography variant="body2" color="text.secondary" mb={1}>
            Showing {history.length} target{history.length === 1 ? "" : "s"} from {historyRange.start} to {historyRange.end}
          </Typography>
        )}
        {history && historyServices.length > 0 && (
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
            <Table size="small" data-testid="history-services-table">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Service</TableCell>
                  <TableCell align="right">People with targets</TableCell>
                  <TableCell align="right">Target</TableCell>
                  <TableCell align="right">Actual</TableCell>
                  <TableCell>Targets</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {historyServices.map((s) => (
                  <TableRow key={`${s.service}-${s.date}`} data-testid={`history-service-${s.service}-${s.date}`}>
                    <TableCell>{s.date}</TableCell>
                    <TableCell>{s.label || SERVICE_LABELS[s.service] || s.service}</TableCell>
                    <TableCell align="right">{s.targets_recorded || 0}</TableCell>
                    <TableCell align="right">{toNonNegativeInt(s.target)}</TableCell>
                    <TableCell align="right">{toNonNegativeInt(s.actual)}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={s.has_targets ? "success" : "default"}
                        variant={s.has_targets ? "filled" : "outlined"}
                        label={s.has_targets ? "Targets recorded" : "No targets recorded"}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        {history && history.length === 0 && (
          <Alert severity="info" data-testid="history-empty">
            {historyMessage || "No targets found in this range."}
          </Alert>
        )}
        {history && history.length > 0 && (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small" data-testid="history-table">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Service</TableCell>
                  <TableCell align="right">Target</TableCell>
                  <TableCell align="right">Actual</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((t) => {
                  const person = peopleById[t.person_id] || {};
                  const name =
                    [person.Name || person.name, person.Surname || person.surname]
                      .filter(Boolean)
                      .join(" ") || t.leader_name || "—";
                  const type = marked[t.person_id]?.type;
                  const status = t.closed ? (t.met ? "Met" : "Not met") : "Open";
                  const color = t.closed ? (t.met ? "success" : "error") : "default";
                  return (
                    <TableRow
                      key={`${t.person_id}-${t.week_identifier}-${t.service}`}
                      data-testid={`history-row-${t.person_id}-${t.service}-${t.week_identifier}`}
                    >
                      <TableCell>{t.date || "—"}</TableCell>
                      <TableCell>{name}</TableCell>
                      <TableCell>{type === "staff" ? "Staff" : type === "intern" ? "Intern" : "—"}</TableCell>
                      <TableCell>{SERVICE_LABELS[t.service] || t.service}</TableCell>
                      <TableCell align="right">{toNonNegativeInt(t.target)}</TableCell>
                      <TableCell align="right">{toNonNegativeInt(t.actual)}</TableCell>
                      <TableCell>
                        <Chip size="small" color={color} variant={t.closed ? "filled" : "outlined"} label={status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Paper>
  );
}
