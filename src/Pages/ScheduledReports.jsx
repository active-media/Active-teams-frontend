import React, { useContext, useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Breadcrumbs,
  Link as MuiLink,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  IconButton,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Tooltip,
  Stack,
  CircularProgress,
  Alert,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import PauseCircleOutlineIcon from "@mui/icons-material/PauseCircleOutline";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";

import { AuthContext } from "../contexts/AuthContext";

// Same report catalogue shown on the Reports page — keep these in sync.
const REPORT_TYPES = [
  { value: "overall_church_performance", label: "Overall Church Performance" },
  { value: "cells_report", label: "Cells Report" },
  { value: "life_class_report", label: "Life Class Report" },
  { value: "school_of_leaders_report", label: "School of Leaders Report" },
  { value: "plan_40_report", label: "Plan 40 Report" },
  { value: "school_cell_report", label: "School Cell Report" },
  { value: "service_target_report", label: "Service Target Report" },
  { value: "twelve_tasks_report", label: "Twelve Tasks Report" },
  { value: "staff_interns_youth_report", label: "Staff, Interns & Youth Report" },
];

const FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const WEEKDAYS = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

const FORMATS = [
  { value: "pdf", label: "PDF" },
  { value: "csv", label: "CSV" },
  { value: "xlsx", label: "Excel (.xlsx)" },
];

const emptyFormState = {
  report_type: "",
  frequency: "weekly",
  weekday: "monday",
  day_of_month: 1,
  time: "07:00",
  format: "pdf",
  recipients: "",
};

function frequencyLabel(schedule) {
  if (schedule.frequency === "daily") return `Daily at ${schedule.time}`;
  if (schedule.frequency === "weekly") {
    const day = WEEKDAYS.find((w) => w.value === schedule.weekday)?.label || schedule.weekday;
    return `Weekly on ${day} at ${schedule.time}`;
  }
  if (schedule.frequency === "monthly") {
    return `Monthly on day ${schedule.day_of_month} at ${schedule.time}`;
  }
  return "";
}

function reportLabel(value) {
  return REPORT_TYPES.find((r) => r.value === value)?.label || value;
}

export default function ScheduledReports() {
  const { authFetch } = useContext(AuthContext);
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyFormState);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const loadSchedules = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await authFetch(`${backendUrl}/report-schedules`);
      if (!res.ok) throw new Error("Failed to load scheduled reports");
      const data = await res.json();
      setSchedules(Array.isArray(data) ? data : data.schedules || []);
    } catch (e) {
      console.error("Error loading scheduled reports:", e);
      setError("Couldn't load scheduled reports. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openNewSchedule = () => {
    setEditingId(null);
    setForm(emptyFormState);
    setFormError("");
    setModalOpen(true);
  };

  const openEditSchedule = (schedule) => {
    setEditingId(schedule.id);
    setForm({
      report_type: schedule.report_type,
      frequency: schedule.frequency,
      weekday: schedule.weekday || "monday",
      day_of_month: schedule.day_of_month || 1,
      time: schedule.time || "07:00",
      format: schedule.format,
      recipients: (schedule.recipients || []).join(", "),
    });
    setFormError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
  };

  const handleFieldChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const validate = () => {
    if (!form.report_type) return "Please choose a report.";
    if (!form.recipients.trim()) return "Add at least one recipient email.";
    const emails = form.recipients.split(",").map((e) => e.trim()).filter(Boolean);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalid = emails.find((e) => !emailRegex.test(e));
    if (invalid) return `"${invalid}" doesn't look like a valid email.`;
    return "";
  };

  const handleSave = async () => {
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setSaving(true);
    setFormError("");

    const payload = {
      report_type: form.report_type,
      frequency: form.frequency,
      weekday: form.frequency === "weekly" ? form.weekday : undefined,
      day_of_month: form.frequency === "monthly" ? Number(form.day_of_month) : undefined,
      time: form.time,
      format: form.format,
      recipients: form.recipients.split(",").map((e) => e.trim()).filter(Boolean),
    };

    try {
      const url = editingId
        ? `${backendUrl}/report-schedules/${editingId}`
        : `${backendUrl}/report-schedules`;
      const method = editingId ? "PUT" : "POST";

      const res = await authFetch(url, {
        method,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to save schedule");
      }

      setModalOpen(false);
      await loadSchedules();
    } catch (e) {
      console.error("Error saving schedule:", e);
      setFormError(e.message || "Something went wrong saving this schedule.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this scheduled report? This can't be undone.")) return;
    try {
      const res = await authFetch(`${backendUrl}/report-schedules/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete schedule");
      setSchedules((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      console.error("Error deleting schedule:", e);
      setError("Couldn't delete that schedule. Please try again.");
    }
  };

  const handleToggleActive = async (schedule) => {
    try {
      const res = await authFetch(`${backendUrl}/report-schedules/${schedule.id}`, {
        method: "PUT",
        body: JSON.stringify({ active: !schedule.active }),
      });
      if (!res.ok) throw new Error("Failed to update schedule");
      setSchedules((prev) =>
        prev.map((s) => (s.id === schedule.id ? { ...s, active: !s.active } : s))
      );
    } catch (e) {
      console.error("Error toggling schedule:", e);
      setError("Couldn't update that schedule. Please try again.");
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <MuiLink underline="hover" color="text.secondary" href="#">
          Reporting
        </MuiLink>
        <Typography color="text.primary">Scheduled Reports</Typography>
      </Breadcrumbs>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Scheduled Reports
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Automate report generation and email delivery to leadership.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openNewSchedule}
          sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
        >
          New Schedule
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Paper
        variant="outlined"
        sx={{ borderRadius: 2, overflow: "hidden", bgcolor: "background.paper" }}
      >
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        ) : schedules.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 6, px: 2 }}>
            <CalendarMonthIcon sx={{ fontSize: 32, color: "text.disabled", mb: 1 }} />
            <Typography color="text.secondary">No scheduled reports yet.</Typography>
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Report</TableCell>
                <TableCell>Schedule</TableCell>
                <TableCell>Format</TableCell>
                <TableCell>Recipients</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {schedules.map((schedule) => (
                <TableRow key={schedule.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {reportLabel(schedule.report_type)}
                  </TableCell>
                  <TableCell>{frequencyLabel(schedule)}</TableCell>
                  <TableCell sx={{ textTransform: "uppercase" }}>{schedule.format}</TableCell>
                  <TableCell>
                    <Tooltip title={(schedule.recipients || []).join(", ")}>
                      <span>
                        {(schedule.recipients || []).length} recipient
                        {(schedule.recipients || []).length === 1 ? "" : "s"}
                      </span>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={schedule.active ? "Active" : "Paused"}
                      color={schedule.active ? "success" : "default"}
                      variant={schedule.active ? "filled" : "outlined"}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title={schedule.active ? "Pause" : "Resume"}>
                      <IconButton size="small" onClick={() => handleToggleActive(schedule)}>
                        {schedule.active ? (
                          <PauseCircleOutlineIcon fontSize="small" />
                        ) : (
                          <PlayCircleOutlineIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => openEditSchedule(schedule)}>
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => handleDelete(schedule.id)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Dialog open={modalOpen} onClose={closeModal} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editingId ? "Edit Schedule" : "New Schedule"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}

            <TextField
              select
              label="Report"
              value={form.report_type}
              onChange={handleFieldChange("report_type")}
              fullWidth
            >
              {REPORT_TYPES.map((r) => (
                <MenuItem key={r.value} value={r.value}>
                  {r.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Frequency"
              value={form.frequency}
              onChange={handleFieldChange("frequency")}
              fullWidth
            >
              {FREQUENCIES.map((f) => (
                <MenuItem key={f.value} value={f.value}>
                  {f.label}
                </MenuItem>
              ))}
            </TextField>

            {form.frequency === "weekly" && (
              <TextField
                select
                label="Day of week"
                value={form.weekday}
                onChange={handleFieldChange("weekday")}
                fullWidth
              >
                {WEEKDAYS.map((w) => (
                  <MenuItem key={w.value} value={w.value}>
                    {w.label}
                  </MenuItem>
                ))}
              </TextField>
            )}

            {form.frequency === "monthly" && (
              <TextField
                type="number"
                label="Day of month"
                value={form.day_of_month}
                onChange={handleFieldChange("day_of_month")}
                inputProps={{ min: 1, max: 28 }}
                fullWidth
                helperText="Capped at 28 so it always lands on a real date."
              />
            )}

            <TextField
              type="time"
              label="Time"
              value={form.time}
              onChange={handleFieldChange("time")}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              select
              label="Format"
              value={form.format}
              onChange={handleFieldChange("format")}
              fullWidth
            >
              {FORMATS.map((f) => (
                <MenuItem key={f.value} value={f.value}>
                  {f.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Recipients"
              placeholder="pastor@church.org, leader12@church.org"
              value={form.recipients}
              onChange={handleFieldChange("recipients")}
              helperText="Comma-separated email addresses."
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeModal} disabled={saving} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={saving}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            {saving ? "Saving..." : editingId ? "Save Changes" : "Create Schedule"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}