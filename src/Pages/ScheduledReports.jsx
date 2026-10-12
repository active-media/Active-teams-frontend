import { useCallback, useContext, useEffect, useState } from "react";
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import PauseCircleOutlineIcon from "@mui/icons-material/PauseCircleOutline";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import { AuthContext } from "../contexts/AuthContext";
import { createSchedule, deleteSchedule, getCatalog, getSchedules, updateSchedule } from "../api/reportingApi";
import { SCHEDULE_FORMATS, SCHEDULE_FREQUENCIES, WEEKDAYS, getReportTitle } from "../features/reporting/constants";
import { ReportErrorState } from "../features/reporting/components/ReportStates";

const emptyForm = { report_type: "", frequency: "weekly", weekday: "monday", day_of_month: 1, time: "07:00", format: "pdf", recipients: "" };
const titleCase = (value = "") => value.charAt(0).toUpperCase() + value.slice(1);

function scheduleSummary(schedule) {
  if (schedule.frequency === "daily") return `Daily at ${schedule.time}`;
  if (schedule.frequency === "weekly") return `Weekly on ${titleCase(schedule.weekday)} at ${schedule.time}`;
  return `Monthly on day ${schedule.day_of_month} at ${schedule.time}`;
}

export default function ScheduledReports() {
  const { authFetch } = useContext(AuthContext);
  const [catalog, setCatalog] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [items, rows] = await Promise.all([getCatalog(authFetch), getSchedules(authFetch)]);
      setCatalog(items);
      setSchedules(rows);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => { load(); }, [load]);

  const createNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
    setDialogOpen(true);
  };

  const edit = (schedule) => {
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
    setDialogOpen(true);
  };

  const save = async () => {
    const recipients = form.recipients.split(",").map((email) => email.trim()).filter(Boolean);
    if (!form.report_type || recipients.length === 0 || !form.time) {
      setFormError("Choose a report, time, and at least one recipient email.");
      return;
    }
    if (recipients.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      setFormError("Enter valid recipient email addresses separated by commas.");
      return;
    }
    setSaving(true);
    setFormError("");
    const payload = {
      ...form,
      recipients,
      ...(form.frequency === "weekly" ? { weekday: form.weekday } : { weekday: undefined }),
      ...(form.frequency === "monthly" ? { day_of_month: Number(form.day_of_month) } : { day_of_month: undefined }),
    };
    try {
      if (editingId) await updateSchedule(authFetch, editingId, payload);
      else await createSchedule(authFetch, payload);
      setDialogOpen(false);
      await load();
    } catch (requestError) {
      setFormError(requestError.message || "Unable to save schedule.");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (schedule) => {
    try {
      await updateSchedule(authFetch, schedule.id, { active: !schedule.active });
      setSchedules((previous) => previous.map((item) => item.id === schedule.id ? { ...item, active: !item.active } : item));
    } catch (requestError) {
      setError(requestError);
    }
  };

  const remove = async (schedule) => {
    try {
      await deleteSchedule(authFetch, schedule.id);
      setSchedules((previous) => previous.filter((item) => item.id !== schedule.id));
    } catch (requestError) {
      setError(requestError);
    }
  };

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 3, maxWidth: 1440, mx: "auto" }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} spacing={2} sx={{ mb: 2.5 }}>
        <Box><Typography variant="h4" component="h1" fontWeight={800}>Scheduled Reports</Typography><Typography color="text.secondary" sx={{ mt: 0.5 }}>Manage recurring report delivery.</Typography></Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={createNew}>New schedule</Button>
      </Stack>
      {error && <ReportErrorState error={error} onRetry={load} />}
      <Paper variant="outlined" sx={{ borderRadius: 1, overflow: "hidden" }}>
        {loading ? <Box sx={{ py: 5, display: "grid", placeItems: "center" }}><CircularProgress size={28} /></Box> : schedules.length === 0 ? <Typography color="text.secondary" sx={{ p: 3 }}>No scheduled reports yet.</Typography> : (
          <Table size="small"><TableHead><TableRow>{["Report", "Schedule", "Format", "Recipients", "Status", "Actions"].map((label) => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead>
            <TableBody>{schedules.map((schedule) => <TableRow key={schedule.id} hover>
              <TableCell sx={{ fontWeight: 600 }}>{getReportTitle(catalog, schedule.report_type)}</TableCell>
              <TableCell>{scheduleSummary(schedule)}</TableCell>
              <TableCell>{schedule.format?.toUpperCase()}</TableCell>
              <TableCell><Tooltip title={(schedule.recipients || []).join(", ")}><span>{schedule.recipients?.length || 0} recipient(s)</span></Tooltip></TableCell>
              <TableCell><Chip size="small" label={schedule.active ? "Active" : "Paused"} color={schedule.active ? "success" : "default"} variant={schedule.active ? "filled" : "outlined"} /></TableCell>
              <TableCell align="right">
                <Tooltip title={schedule.active ? "Pause" : "Resume"}><IconButton size="small" onClick={() => toggle(schedule)}>{schedule.active ? <PauseCircleOutlineIcon fontSize="small" /> : <PlayCircleOutlineIcon fontSize="small" />}</IconButton></Tooltip>
                <Tooltip title="Edit"><IconButton size="small" onClick={() => edit(schedule)}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>
                <Tooltip title="Delete"><IconButton size="small" onClick={() => remove(schedule)}><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip>
              </TableCell>
            </TableRow>)}</TableBody>
          </Table>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingId ? "Edit schedule" : "New schedule"}</DialogTitle>
        <DialogContent><Stack spacing={2} sx={{ mt: 1 }}>
          {formError && <Alert severity="error" role="alert">{formError}</Alert>}
          <TextField select label="Report" value={form.report_type} onChange={(event) => setForm((previous) => ({ ...previous, report_type: event.target.value }))}>
            {catalog.map((item) => <MenuItem key={item.report_type} value={item.report_type}>{item.title}{item.implemented ? "" : " (coming soon)"}</MenuItem>)}
          </TextField>
          <TextField select label="Frequency" value={form.frequency} onChange={(event) => setForm((previous) => ({ ...previous, frequency: event.target.value }))}>
            {SCHEDULE_FREQUENCIES.map((frequency) => <MenuItem key={frequency} value={frequency}>{titleCase(frequency)}</MenuItem>)}
          </TextField>
          {form.frequency === "weekly" && <TextField select label="Weekday" value={form.weekday} onChange={(event) => setForm((previous) => ({ ...previous, weekday: event.target.value }))}>{WEEKDAYS.map((day) => <MenuItem key={day} value={day}>{titleCase(day)}</MenuItem>)}</TextField>}
          {form.frequency === "monthly" && <TextField type="number" label="Day of month" value={form.day_of_month} inputProps={{ min: 1, max: 28 }} onChange={(event) => setForm((previous) => ({ ...previous, day_of_month: event.target.value }))} />}
          <TextField type="time" label="Time" value={form.time} InputLabelProps={{ shrink: true }} onChange={(event) => setForm((previous) => ({ ...previous, time: event.target.value }))} />
          <TextField select label="Format" value={form.format} onChange={(event) => setForm((previous) => ({ ...previous, format: event.target.value }))}>{SCHEDULE_FORMATS.map((format) => <MenuItem key={format} value={format}>{format.toUpperCase()}</MenuItem>)}</TextField>
          <TextField label="Recipients" helperText="Separate email addresses with commas." value={form.recipients} onChange={(event) => setForm((previous) => ({ ...previous, recipients: event.target.value }))} />
        </Stack></DialogContent>
        <DialogActions sx={{ p: 2 }}><Button disabled={saving} onClick={() => setDialogOpen(false)}>Cancel</Button><Button variant="contained" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save schedule"}</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
