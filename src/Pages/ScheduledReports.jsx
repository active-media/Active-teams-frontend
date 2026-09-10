import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Card,
  Chip,
  CircularProgress,
  FormControl,
  Link,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { ChevronRight, Refresh, TrendingDown, TrendingUp } from "@mui/icons-material";
import { AuthContext } from "../contexts/AuthContext";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const periodOptions = [
  { value: "thisWeek", label: "This week" },
  { value: "previousWeek", label: "Previous week" },
  { value: "thisMonth", label: "This month" },
  { value: "previousMonth", label: "This month" },
  { value: "today", label: "Today" },
];

// ---- Design tokens (matches the v2 dark dashboard screens) ----
const surface = "#0e0f12";
const cardBg = "#16181d";
const cardBorder = "#25272e";
const textPrimary = "#f4f4f5";
const textSecondary = "#9a9ba3";
const accent = "#3b82f6";
const success = "#22c55e";
const danger = "#ef4444";

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

function TrendChip({ change, percent }) {
  if (!change) {
    return <Chip size="small" label="No change" sx={{ bgcolor: "#1f2127", color: textSecondary }} />;
  }
  const positive = change > 0;
  const label = `${positive ? "+" : ""}${change} (${percent === null ? "New" : `${positive ? "+" : ""}${percent}%`})`;
  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      {positive ? (
        <TrendingUp fontSize="small" sx={{ color: success }} />
      ) : (
        <TrendingDown fontSize="small" sx={{ color: danger }} />
      )}
      <Typography fontWeight={700} fontSize={13} sx={{ color: positive ? success : danger }}>
        {label}
      </Typography>
    </Stack>
  );
}

function KPICard({ label, value, sublabel, badge }) {
  return (
    <Card
      sx={{
        flex: 1,
        bgcolor: cardBg,
        border: `1px solid ${cardBorder}`,
        borderRadius: 2,
        p: 2.5,
        boxShadow: "none",
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Typography sx={{ color: textSecondary, fontSize: 13 }}>{label}</Typography>
        {badge}
      </Stack>
      <Typography sx={{ color: textPrimary, fontSize: 32, fontWeight: 800, mt: 0.5 }}>{value}</Typography>
      {sublabel && (
        <Typography sx={{ color: textSecondary, fontSize: 12.5, mt: 0.5 }}>{sublabel}</Typography>
      )}
    </Card>
  );
}

export default function ScheduledReports() {
  const { authFetch } = useContext(AuthContext);
  const navigate = useNavigate();
  const [period, setPeriod] = useState("thisMonth");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = state("");

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await authFetch(
        `${BACKEND_URL}/stats/scheduled-reports?period=${period}`,
        { retryOnAuthFailure: true, maxRetries: 1 },
      );
      if (!response.ok) {
        throw new Error(`Unable to load report (${response.status})`);
      }
      setReport(await response.json());
    } catch (fetchError) {
      setError(fetchError.message || "Unable to load the report.");
    } finally {
      setLoading(false);
    }
  }, [authFetch, period]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const { currentTotal, previousTotal, activeLeaders, avgPerLeader, completionRate, totalChangePercent } =
    useMemo(() => {
      const current = report?.currentTotal || 0;
      const previous = report?.previousTotal || 0;
      const active = report?.activeLeaders || 0;
      const avg = report?.avgPerLeader || 0;
      const rate = report?.completionRate || 0;
      const changePct = previous ? ((current - previous) / previous) * 100 : current ? 100 : 0;
      return {
        currentTotal: current,
        previousTotal: previous,
        activeLeaders: active,
        avgPerLeader: avg,
        completionRate: rate,
        totalChangePercent: changePct,
      };
    }, [report]);

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1280, mx: "auto", bgcolor: surface, minHeight: "100%" }}>
      <Breadcrumbs
        separator={<ChevronRight sx={{ fontSize: 14, color: textSecondary }} />}
        sx={{ mb: 1, "& .MuiBreadcrumbs-li": { fontSize: 13 } }}
      >
        <Link underline="hover" sx={{ color: textSecondary, cursor: "pointer" }} onClick={() => navigate("/reporting/dashboard")}>
          Reporting
        </Link>
        <Typography sx={{ color: textPrimary, fontSize: 13 }}>Scheduled Reports</Typography>
      </Breadcrumbs>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        spacing={2}
        mb={3}
      >
        <Box>
          <Typography sx={{ color: textPrimary, fontSize: 28, fontWeight: 800 }}>Scheduled Reports</Typography>
          <Typography sx={{ color: textSecondary, fontSize: 14 }}>
            Scheduled report activity per leader, compared with the previous period.
          </Typography>
        </Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <FormControl size="small" sx={{ minWidth: 170 }}>
            <Select
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              sx={{
                bgcolor: cardBg,
                color: textPrimary,
                "& .MuiOutlinedInput-notchedOutline": { borderColor: cardBorder },
              }}
            >
              {periodOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchReport}
            disabled={loading}
            sx={{ borderColor: cardBorder, color: textPrimary }}
          >
            Refresh
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Stack direction="column" spacing={2} sx={{ mb: 3 }}>
        <KPICard
          label="Tasks Scheduled"
          value={`${currentTotal}`}
          sublabel={`${formatDate(report?.period?.start)} – ${formatDate(report?.period?.end)}`}
          badge={<Chip size="small" label="Live" sx={{ bgcolor: "#0f2a1c", color: success, fontSize: 11 }} />}
        />
        <KPICard
          label="Active Leaders"
          value={`${activeLeaders}/${report?.leadersLength || 0}`}
          sublabel="with scheduled tasks"
        />
        <KPICard
          label="Avg per Leader"
          value={avgPerLeader.toFixed(1)}
          sublabel={`out of 12 tasks`}
        />
        <KPICard
          label="Completion Rate"
          value={`${completionRate.toFixed(0)}%`}
          sublabel={`vs previous: ${previousTotal} scheduled`}
          badge={
            <Chip
              size="small"
              label={`${totalChangePercent >= 0 ? "+" : ""}${totalChangePercent.toFixed(1)}%`}
              sx={{
                bgcolor: totalChangePercent >= 0 ? "#0f2a1c" : "#2a1414",
                color: totalChangePercent >= 0 ? success : danger,
                fontSize: 11,
              }}
            />
          }
        />
      </Stack>

      <TableContainer
        component={Card}
        sx={{ bgcolor: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 2, boxShadow: "none" }}
      >
        <Table>
          <TableHead>
            <TableRow>
              {["Leader", "Scheduled", "Previous", "Change", ""].map((head) => (
                <TableCell
                  key={head}
                  align={head === "Current" || head === "Previous" ? "right" : "left"}
                  sx={{ color: textSecondary, borderColor: cardBorder, fontSize: 12, textTransform: "uppercase" }}
                >
                  {head}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 5, borderColor: cardBorder }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : report?.leaders?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 5, borderColor: cardBorder, color: textSecondary }}>
                  No scheduled report activity for this period.
                </TableCell>
              </TableRow>
            ) : (
              report.leaders.map((leader) => (
                <TableRow
                  key={leader.id || leader.name}
                  hover
                  sx={{ cursor: "pointer", "&:hover": { bgcolor: "#1c1e24" } }}
                >
                  <TableCell sx={{ color: textPrimary, borderColor: cardBorder, fontWeight: 600 }}>
                    {leader.name}
                  </TableCell>
                  <TableCell align="right" sx={{ color: textPrimary, borderColor: cardBorder }}>
                    {leader.scheduled}/{TASKS_PER_LEADER}
                  </TableCell>
                  <TableCell align="right" sx={{ color: textSecondary, borderColor: cardBorder }}>
                    {leader.previous_scheduled}/{TASKS_PER_LEADER}
                  </TableCell>
                  <TableCell sx={{ borderColor: cardBorder }}>
                    <TrendChip change={leader.change} percent={leader.change_percent} />
                  </TableCell>
                  <TableCell align="right" sx={{ borderColor: cardBorder }}>
                    <ChevronRight sx={{ color: textSecondary, fontSize: 18 }} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}