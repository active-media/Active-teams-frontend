import React, { useContext, useMemo, useState } from "react";
import {
  Box,
  Breadcrumbs,
  Link,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  InputAdornment,
  Grid,
  Card,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Dialog,
  DialogContent,
  IconButton,
  MenuItem,
  Chip,
  Stack,
  Divider,
} from "@mui/material";
import {
  Search as SearchIcon,
  Description as DescriptionIcon,
  PlayArrow as PlayArrowIcon,
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon,
  History as HistoryIcon,
  PictureAsPdf as PictureAsPdfIcon,
  Download as DownloadIcon,
} from "@mui/icons-material";

import { AuthContext } from "../contexts/AuthContext";

// ---------------------------------------------------------------------------
// Report catalog — mirrors the approved "Reports" grid design.
// Each entry's `accent` drives the card's top border + icon color.
// ---------------------------------------------------------------------------
const REPORT_TYPES = [
  {
    id: "overall_church_performance",
    name: "Overall Church Performance",
    description: "High-level leadership report combining all major metrics",
    accent: "#3b82f6",
  },
  {
    id: "cells_report",
    name: "Cells Report",
    description: "Cell attendance, growth and active cells",
    accent: "#3b82f6",
  },
  {
    id: "life_class_report",
    name: "Life Class Report",
    description: "Registered, attended and completion rates",
    accent: "#22c55e",
  },
  {
    id: "school_of_leaders_report",
    name: "School of Leaders Report",
    description: "Enrolled, attendance and completion trends",
    accent: "#a855f7",
  },
  {
    id: "plan_40_report",
    name: "Plan 40 Report",
    description: "Plan 40 participation and progress",
    accent: "#f59e0b",
  },
  {
    id: "school_cell_report",
    name: "School Cell Report",
    description: "School cell attendance and completion",
    accent: "#14b8a6",
  },
  {
    id: "service_target_report",
    name: "Service Target Report",
    description: "Target vs actual attendance and achievement",
    accent: "#ef4444",
  },
  {
    id: "twelve_tasks_report",
    name: "Twelve Tasks Report",
    description: "Task completion and outstanding items",
    accent: "#6b7280",
  },
  {
    id: "staff_interns_youth_report",
    name: "Staff, Interns & Youth Report",
    description: "People statistics by category and campus",
    accent: "#ec4899",
  },
];

const PERIOD_OPTIONS = [
  "Today",
  "This Week",
  "This Month",
  "Last Month",
  "This Quarter",
  "This Year",
  "Custom Range",
];

const CAMPUS_OPTIONS = ["All Campuses", "Main Campus", "North Campus", "East Campus"];

const FORMAT_OPTIONS = ["PDF", "CSV"];

// ---------------------------------------------------------------------------
// Styling helpers — dark, card-based surface matching the mock.
// ---------------------------------------------------------------------------
const surface = {
  page: "#000000",
  card: "#0d0d0d",
  cardBorder: "#242424",
  input: "#111111",
  inputBorder: "#2a2a2a",
  textPrimary: "#f5f5f5",
  textSecondary: "#9a9a9a",
};

function ReportCard({ report, onGenerate }) {
  return (
    <Card
      sx={{
        position: "relative",
        bgcolor: surface.card,
        border: `1px solid ${surface.cardBorder}`,
        borderRadius: 2,
        p: 2.5,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        height: "100%",
        minHeight: 210,
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          bgcolor: report.accent,
        },
      }}
      elevation={0}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: `${report.accent}22`,
          color: report.accent,
        }}
      >
        <DescriptionIcon fontSize="small" />
      </Box>

      <Box sx={{ flexGrow: 1 }}>
        <Typography sx={{ color: surface.textPrimary, fontWeight: 600, fontSize: 15 }}>
          {report.name}
        </Typography>
        <Typography sx={{ color: surface.textSecondary, fontSize: 13, mt: 0.5 }}>
          {report.description}
        </Typography>
      </Box>

      <Button
        onClick={() => onGenerate(report)}
        startIcon={<PlayArrowIcon />}
        variant="contained"
        sx={{
          bgcolor: "#2563eb",
          textTransform: "none",
          fontWeight: 600,
          borderRadius: 1.5,
          "&:hover": { bgcolor: "#1d4ed8" },
        }}
      >
        Generate
      </Button>
    </Card>
  );
}

function GenerateReportDialog({ report, open, onClose, onGenerated }) {
  const [period, setPeriod] = useState("This Month");
  const [campus, setCampus] = useState("All Campuses");
  const [format, setFormat] = useState("PDF");
  const [submitting, setSubmitting] = useState(false);

  if (!report) return null;

  const handleGenerate = async () => {
    setSubmitting(true);
    await authFetch(`${backendUrl}/reports/${report.id}/generate`, {
      method: "POST",
      body: JSON.stringify({ period, campus, format }),
    });
    setSubmitting(false);
    onGenerated({ report, period, campus, format });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          bgcolor: "#0d0d0d",
          border: `1px solid ${surface.cardBorder}`,
          borderRadius: 2,
          width: 420,
        },
      }}
    >
      <DialogContent sx={{ p: 3 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography sx={{ color: surface.textPrimary, fontWeight: 700, fontSize: 17 }}>
            Generate {report.name}
          </Typography>
          <IconButton size="small" onClick={onClose} sx={{ color: surface.textSecondary }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Stack spacing={2}>
          <Box>
            <Typography sx={{ color: surface.textSecondary, fontSize: 13, mb: 0.5 }}>
              Reporting Period
            </Typography>
            <TextField
              select
              fullWidth
              size="small"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              sx={fieldSx}
            >
              {PERIOD_OPTIONS.map((opt) => (
                <MenuItem key={opt} value={opt}>
                  {opt}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <Box>
            <Typography sx={{ color: surface.textSecondary, fontSize: 13, mb: 0.5 }}>
              Campus
            </Typography>
            <TextField
              select
              fullWidth
              size="small"
              value={campus}
              onChange={(e) => setCampus(e.target.value)}
              sx={fieldSx}
            >
              {CAMPUS_OPTIONS.map((opt) => (
                <MenuItem key={opt} value={opt}>
                  {opt}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <Box>
            <Typography sx={{ color: surface.textSecondary, fontSize: 13, mb: 0.5 }}>
              Format
            </Typography>
            <TextField
              select
              fullWidth
              size="small"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              sx={fieldSx}
            >
              {FORMAT_OPTIONS.map((opt) => (
                <MenuItem key={opt} value={opt}>
                  {opt}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <Button
            onClick={handleGenerate}
            disabled={submitting}
            startIcon={<PlayArrowIcon />}
            variant="contained"
            sx={{
              alignSelf: "flex-end",
              bgcolor: "#2563eb",
              textTransform: "none",
              fontWeight: 600,
              borderRadius: 1.5,
              px: 3,
              "&:hover": { bgcolor: "#1d4ed8" },
            }}
          >
            {submitting ? "Generating..." : "Generate Report"}
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    bgcolor: surface.input,
    color: surface.textPrimary,
    "& fieldset": { borderColor: surface.inputBorder },
    "&:hover fieldset": { borderColor: "#3a3a3a" },
    "&.Mui-focused fieldset": { borderColor: "#2563eb" },
  },
  "& .MuiSvgIcon-root": { color: surface.textSecondary },
};

// ---------------------------------------------------------------------------
// Report preview / detail screen — shown after a report is generated.
// Wire the SUMMARY + MINISTRY PERFORMANCE values to the real payload
// returned by the backend once the endpoint exists.
// ---------------------------------------------------------------------------
function ReportPreview({ entry, onBack }) {
  const { report, period, format } = entry;

  const summaryCards = [
    { label: "Total Attendance", sub: "new visitors", value: "—" },
    { label: "Active Cells", sub: "cell attendance", value: "—" },
    { label: "Life Class", sub: "attendance", value: "—" },
    { label: "School of Leaders", sub: "attendance", value: "—" },
    { label: "Plan 40", sub: "completion", value: "—" },
    { label: "Service Target", sub: "target", value: "—" },
    { label: "Twelve Tasks", sub: "complete", value: "—" },
    { label: "Staff / Interns / Youth", sub: "people tracked", value: "—" },
  ];

  const ministryRows = [
    "Life Class",
    "School of Leaders",
    "Plan 40",
    "School Cell",
  ].map((name) => ({
    name,
    registered: 0,
    attended: 0,
    completed: 0,
    attendanceRate: "—",
    completionRate: "—",
  }));

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Button
          onClick={onBack}
          startIcon={<ArrowBackIcon />}
          sx={{ color: surface.textSecondary, textTransform: "none" }}
        >
          Back to Reports
        </Button>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<PictureAsPdfIcon fontSize="small" />}
            sx={{
              color: surface.textPrimary,
              borderColor: surface.inputBorder,
              textTransform: "none",
              "&:hover": { borderColor: "#3a3a3a" },
            }}
          >
            PDF
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon fontSize="small" />}
            sx={{
              color: surface.textPrimary,
              borderColor: surface.inputBorder,
              textTransform: "none",
              "&:hover": { borderColor: "#3a3a3a" },
            }}
          >
            CSV
          </Button>
        </Stack>
      </Stack>

      <Card
        sx={{
          bgcolor: surface.card,
          border: `1px solid ${surface.cardBorder}`,
          borderRadius: 2,
          p: 4,
        }}
        elevation={0}
      >
        <Box textAlign="center" mb={4}>
          <Typography sx={{ color: surface.textSecondary, fontSize: 11, letterSpacing: 1 }}>
            ACTIVE TEAMS V2
          </Typography>
          <Typography sx={{ color: surface.textPrimary, fontWeight: 700, fontSize: 26, mt: 0.5 }}>
            {report.name}
          </Typography>
          <Typography sx={{ color: surface.textSecondary, fontSize: 13, mt: 0.5 }}>
            {period}
          </Typography>
          <Typography sx={{ color: "#555", fontSize: 11, mt: 0.5 }}>
            Generated {new Date().toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" })} — {format}
          </Typography>
        </Box>

        <Typography sx={{ color: surface.textSecondary, fontSize: 11, letterSpacing: 1, mb: 1.5 }}>
          SUMMARY
        </Typography>
        <Grid container spacing={2} mb={4}>
          {summaryCards.map((c) => (
            <Grid item xs={6} sm={3} key={c.label}>
              <Box
                sx={{
                  border: `1px solid ${surface.cardBorder}`,
                  borderRadius: 1.5,
                  p: 2,
                }}
              >
                <Typography sx={{ color: "#3b82f6", fontWeight: 700, fontSize: 20 }}>
                  {c.value}
                </Typography>
                <Typography sx={{ color: surface.textPrimary, fontSize: 13, mt: 0.5 }}>
                  {c.label}
                </Typography>
                <Typography sx={{ color: surface.textSecondary, fontSize: 11 }}>
                  {c.sub}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Typography sx={{ color: surface.textSecondary, fontSize: 11, letterSpacing: 1, mb: 1 }}>
          MINISTRY PERFORMANCE
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              {["Ministry", "Registered", "Attended", "Completed", "Attendance Rate", "Completion Rate"].map(
                (h, i) => (
                  <TableCell
                    key={h}
                    align={i === 0 ? "left" : "right"}
                    sx={{ color: surface.textSecondary, borderColor: surface.cardBorder, fontSize: 11 }}
                  >
                    {h.toUpperCase()}
                  </TableCell>
                )
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {ministryRows.map((row) => (
              <TableRow key={row.name}>
                <TableCell sx={{ color: surface.textPrimary, borderColor: surface.cardBorder }}>
                  {row.name}
                </TableCell>
                <TableCell align="right" sx={{ color: surface.textPrimary, borderColor: surface.cardBorder }}>
                  {row.registered}
                </TableCell>
                <TableCell align="right" sx={{ color: surface.textPrimary, borderColor: surface.cardBorder }}>
                  {row.attended}
                </TableCell>
                <TableCell align="right" sx={{ color: surface.textPrimary, borderColor: surface.cardBorder }}>
                  {row.completed}
                </TableCell>
                <TableCell align="right" sx={{ color: surface.textSecondary, borderColor: surface.cardBorder }}>
                  {row.attendanceRate}
                </TableCell>
                <TableCell align="right" sx={{ color: surface.textSecondary, borderColor: surface.cardBorder }}>
                  {row.completionRate}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Main Reports page
// ---------------------------------------------------------------------------
export default function Reports() {
  const { user, authFetch } = useContext(AuthContext) || {};
  const [layout, setLayout] = useState("grid"); // 'grid' | 'table'
  const [search, setSearch] = useState("");
  const [dialogReport, setDialogReport] = useState(null);
  const [history, setHistory] = useState([]); // { id, report, period, campus, format, generatedAt, status }
  const [previewEntry, setPreviewEntry] = useState(null);

  const filteredReports = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return REPORT_TYPES;
    return REPORT_TYPES.filter(
      (r) => r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
    );
  }, [search]);

  const handleGenerated = ({ report, period, campus, format }) => {
    const entry = {
      id: `${report.id}-${Date.now()}`,
      report,
      period,
      campus,
      format,
      generatedAt: new Date(),
      status: "Ready",
    };
    setHistory((prev) => [entry, ...prev]);
    setDialogReport(null);
    setPreviewEntry(entry);
  };

  if (previewEntry) {
    return (
      <Box sx={{ bgcolor: surface.page, minHeight: "100vh", width: "100%", boxSizing: "border-box", p: { xs: 2, md: 4 } }}>
        <Breadcrumbs sx={{ mb: 2, "& *": { color: surface.textSecondary, fontSize: 13 } }}>
          <Link underline="hover" color="inherit" href="#">
            Reporting
          </Link>
          <Typography sx={{ color: surface.textPrimary, fontSize: 13 }}>Reports</Typography>
        </Breadcrumbs>
        <ReportPreview entry={previewEntry} onBack={() => setPreviewEntry(null)} />
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: surface.page, minHeight: "100vh", width: "100%", boxSizing: "border-box", p: { xs: 2, md: 4 } }}>
      <Breadcrumbs sx={{ mb: 2, "& *": { color: surface.textSecondary, fontSize: 13 } }}>
        <Link underline="hover" color="inherit" href="#">
          Reporting
        </Link>
        <Typography sx={{ color: surface.textPrimary, fontSize: 13 }}>Reports</Typography>
      </Breadcrumbs>

      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography sx={{ color: surface.textPrimary, fontWeight: 700, fontSize: 24 }}>
            Reports
          </Typography>
          <Typography sx={{ color: surface.textSecondary, fontSize: 13, mt: 0.5 }}>
            Choose a report and period — the system calculates the numbers automatically.
          </Typography>
        </Box>

        <ToggleButtonGroup
          exclusive
          size="small"
          value={layout}
          onChange={(e, val) => val && setLayout(val)}
          sx={{
            bgcolor: surface.input,
            border: `1px solid ${surface.inputBorder}`,
            borderRadius: 1.5,
            "& .MuiToggleButton-root": {
              color: surface.textSecondary,
              textTransform: "none",
              border: "none",
              px: 2,
              "&.Mui-selected": {
                bgcolor: "#2563eb",
                color: "#fff",
                "&:hover": { bgcolor: "#1d4ed8" },
              },
            },
          }}
        >
          <ToggleButton value="grid">Grid</ToggleButton>
          <ToggleButton value="table">Table</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <TextField
        fullWidth
        placeholder="Search reports..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        size="small"
        sx={{ mb: 3, ...fieldSx }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: surface.textSecondary, fontSize: 20 }} />
            </InputAdornment>
          ),
        }}
      />

      {layout === "grid" ? (
        <Box
          sx={{
            display: "grid",
            gap: 2.5,
            gridTemplateColumns: {
              xs: "repeat(1, 1fr)",
              sm: "repeat(2, 1fr)",
              md: "repeat(3, 1fr)",
              lg: "repeat(4, 1fr)",
            },
            alignItems: "stretch",
          }}
        >
          {filteredReports.map((report) => (
            <ReportCard key={report.id} report={report} onGenerate={setDialogReport} />
          ))}
        </Box>
      ) : (
        <Card sx={{ bgcolor: surface.card, border: `1px solid ${surface.cardBorder}`, borderRadius: 2 }} elevation={0}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {["Report", "Description", ""].map((h) => (
                  <TableCell key={h} sx={{ color: surface.textSecondary, borderColor: surface.cardBorder, fontSize: 11 }}>
                    {h.toUpperCase()}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredReports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell sx={{ borderColor: surface.cardBorder }}>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          bgcolor: report.accent,
                        }}
                      />
                      <Typography sx={{ color: surface.textPrimary, fontWeight: 600, fontSize: 14 }}>
                        {report.name}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ color: surface.textSecondary, borderColor: surface.cardBorder, fontSize: 13 }}>
                    {report.description}
                  </TableCell>
                  <TableCell align="right" sx={{ borderColor: surface.cardBorder }}>
                    <Button
                      onClick={() => setDialogReport(report)}
                      startIcon={<PlayArrowIcon fontSize="small" />}
                      size="small"
                      variant="contained"
                      sx={{
                        bgcolor: "#2563eb",
                        textTransform: "none",
                        fontWeight: 600,
                        "&:hover": { bgcolor: "#1d4ed8" },
                      }}
                    >
                      Generate
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Stack direction="row" alignItems="center" spacing={1} mt={4} mb={1.5}>
        <HistoryIcon sx={{ color: surface.textSecondary, fontSize: 18 }} />
        <Typography sx={{ color: surface.textPrimary, fontWeight: 600, fontSize: 15 }}>
          Report History
        </Typography>
      </Stack>

      <Card sx={{ bgcolor: surface.card, border: `1px solid ${surface.cardBorder}`, borderRadius: 2 }} elevation={0}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {["Report", "Generated", "Status", "Actions"].map((h, i) => (
                <TableCell
                  key={h}
                  align={i === 3 ? "right" : "left"}
                  sx={{ color: surface.textSecondary, borderColor: surface.cardBorder, fontSize: 11 }}
                >
                  {h.toUpperCase()}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {history.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} sx={{ color: surface.textSecondary, borderColor: surface.cardBorder, fontSize: 13, py: 3 }}>
                  No reports generated yet.
                </TableCell>
              </TableRow>
            ) : (
              history.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell sx={{ color: surface.textPrimary, borderColor: surface.cardBorder, fontSize: 13 }}>
                    {entry.report.name}
                  </TableCell>
                  <TableCell sx={{ color: surface.textSecondary, borderColor: surface.cardBorder, fontSize: 13 }}>
                    {entry.generatedAt.toLocaleString()}
                  </TableCell>
                  <TableCell sx={{ borderColor: surface.cardBorder }}>
                    <Chip
                      label={entry.status}
                      size="small"
                      sx={{ bgcolor: "#16a34a22", color: "#4ade80", fontWeight: 600, fontSize: 11 }}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ borderColor: surface.cardBorder }}>
                    <Button
                      size="small"
                      onClick={() => setPreviewEntry(entry)}
                      sx={{ color: "#60a5fa", textTransform: "none" }}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <GenerateReportDialog
        report={dialogReport}
        open={Boolean(dialogReport)}
        onClose={() => setDialogReport(null)}
        onGenerated={handleGenerated}
      />
    </Box>
  );
}