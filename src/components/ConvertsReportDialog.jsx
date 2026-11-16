import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DownloadIcon from "@mui/icons-material/Download";
import RefreshIcon from "@mui/icons-material/Refresh";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";

const toDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const initialRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 90);
  return { start: toDateInput(start), end: toDateInput(end) };
};

const displayName = (person) =>
  [person?.name, person?.surname].filter(Boolean).join(" ") ||
  person?.email ||
  "Unknown person";

const ConvertsReportDialog = ({
  open,
  onClose,
  authFetch,
  backendUrl = "",
}) => {
  const [range, setRange] = useState(initialRange);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchReport = useCallback(async () => {
    if (!authFetch || !backendUrl) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        start_date: range.start,
        end_date: range.end,
      });
      const response = await authFetch(
        `${backendUrl}/events/converts-report?${params.toString()}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.detail || `HTTP ${response.status}`);
      }
      setReport(payload);
    } catch (err) {
      console.error("Converts report fetch failed:", err);
      setError(err.message || "Could not load converts report");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [authFetch, backendUrl, range.start, range.end]);

  useEffect(() => {
    if (open) fetchReport();
  }, [open, fetchReport]);

  const summary = report?.summary || {
    total: 0,
    first_time: 0,
    recommitment: 0,
    other: 0,
  };
  const groups = report?.groups || [];

  const summaryCards = useMemo(
    () => [
      { label: "Total converts", value: summary.total, color: "#12a5b5" },
      { label: "First-time", value: summary.first_time, color: "#16a34a" },
      { label: "Recommitment", value: summary.recommitment, color: "#2563eb" },
      { label: "Other / unspecified", value: summary.other, color: "#d97706" },
    ],
    [summary.total, summary.first_time, summary.recommitment, summary.other],
  );

  const downloadExcel = () => {
    const rows = report?.rows || [];
    if (!rows.length) {
      toast.info("No converts to export for this period");
      return;
    }

    const exportRows = rows.map((row) => ({
      Event: row.event_name || "",
      Date: row.session_date || "",
      Name: displayName(row),
      Email: row.email || "",
      Phone: row.phone || "",
      Decision: row.decision_display_name || row.decision_type || "",
      "Assigned To": row.assigned_to || "",
      Status: row.status || "",
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Converts");
    XLSX.writeFile(
      workbook,
      `converts_${range.start}_to_${range.end}.xlsx`,
    );
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle sx={{ fontWeight: 700 }}>
        View Converts
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Decisions grouped by event and service date. Use the rows below to
          drill into each event.
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.25}
          alignItems={{ xs: "stretch", sm: "center" }}
          sx={{ mb: 2 }}
        >
          <TextField
            type="date"
            size="small"
            label="Start date"
            value={range.start}
            onChange={(event) =>
              setRange((current) => ({ ...current, start: event.target.value }))
            }
            InputLabelProps={{ shrink: true }}
            inputProps={{ max: range.end }}
            sx={{ minWidth: 170 }}
          />
          <TextField
            type="date"
            size="small"
            label="End date"
            value={range.end}
            onChange={(event) =>
              setRange((current) => ({ ...current, end: event.target.value }))
            }
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: range.start }}
            sx={{ minWidth: 170 }}
          />
          <Button
            variant="contained"
            onClick={fetchReport}
            disabled={loading}
            sx={{ textTransform: "none" }}
          >
            Apply
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchReport}
            disabled={loading}
            sx={{ textTransform: "none" }}
          >
            Refresh
          </Button>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(2, minmax(0, 1fr))",
              sm: `repeat(${summaryCards.length}, minmax(0, 1fr))`,
            },
            gap: 1.25,
            mb: 2,
          }}
        >
          {summaryCards.map((card) => (
            <Card key={card.label} variant="outlined">
              <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                <Typography
                  variant="h5"
                  sx={{ color: card.color, fontWeight: 800, lineHeight: 1.1 }}
                >
                  {card.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {card.label}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>

        {loading ? (
          <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
            <CircularProgress />
          </Box>
        ) : groups.length === 0 ? (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <Typography variant="h6" color="text.secondary">
              No converts found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try widening the date range.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1}>
            {groups.map((group) => (
              <Accordion key={`${group.event_id}-${group.session_date}`} disableGutters>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={0.75}
                      alignItems={{ xs: "flex-start", sm: "center" }}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {group.event_name || "Unknown Event"}
                      </Typography>
                      <Chip
                        size="small"
                        label={group.session_date || "Date unknown"}
                        variant="outlined"
                        sx={{ height: 21, fontSize: "0.62rem" }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {group.total} decision{group.total === 1 ? "" : "s"}
                      </Typography>
                    </Stack>
                  </Box>
                  <Stack direction="row" spacing={0.6} sx={{ mr: 1 }}>
                    <Chip
                      size="small"
                      color="success"
                      label={`${group.first_time} first-time`}
                      sx={{ height: 21, fontSize: "0.6rem" }}
                    />
                    <Chip
                      size="small"
                      color="info"
                      label={`${group.recommitment} recommit`}
                      sx={{ height: 21, fontSize: "0.6rem" }}
                    />
                  </Stack>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                  <Divider />
                  <Box sx={{ overflowX: "auto" }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell>Email</TableCell>
                          <TableCell>Phone</TableCell>
                          <TableCell>Decision</TableCell>
                          <TableCell>Assigned To</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(group.people || []).map((person, index) => (
                          <TableRow key={person.id || `${person.email}-${index}`}>
                            <TableCell>{displayName(person)}</TableCell>
                            <TableCell>{person.email || "—"}</TableCell>
                            <TableCell>{person.phone || "—"}</TableCell>
                            <TableCell>
                              {person.decision_display_name ||
                                person.decision_type ||
                                "—"}
                            </TableCell>
                            <TableCell>{person.assigned_to || "Not assigned"}</TableCell>
                            <TableCell>{person.status || "active"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={downloadExcel}
          disabled={!report?.rows?.length || loading}
        >
          Export XLSX
        </Button>
        <Button variant="contained" onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConvertsReportDialog;
