import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import { AuthContext } from "../../contexts/AuthContext";
import {
  copyLastWeekTargets,
  getAvailableTargetWeeks,
  getEligiblePeople,
  getServiceTargets,
  getTwelveTasksTargets,
  parseTargetError,
  saveServiceTarget,
  saveTwelveTasksTarget,
} from "./api";
import { isoWeekId } from "./dateUtils";
import { normalizeRole } from "../../utils/roleNormalizer";

const recentWeeks = ["2026-W41", "2026-W40", "2026-W39", "2026-W38"];

function getTargetRows(response) {
  return response?.targets || [];
}

function personLabel(person) {
  return `${person.name || ""}${person.email ? ` (${person.email})` : ""}`.trim();
}

export default function LegacyTargetsTab({
  type,
  selectedWeek,
  setSelectedWeek,
  organization,
  setOrganization,
  isSupremeAdmin,
}) {
  const { authFetch, user } = useContext(AuthContext);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isService = type === "service";
  const [availableWeeks, setAvailableWeeks] = useState([]);
  const [targets, setTargets] = useState([]);
  const [people, setPeople] = useState([]);
  const [form, setForm] = useState({ person: null, count: "" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [weekError, setWeekError] = useState("");
  const [notice, setNotice] = useState("");

  const isAdmin = normalizeRole(user?.role) === "admin" || isSupremeAdmin;

  const loadTargets = useCallback(async () => {
    if (!selectedWeek || !organization) {
      setTargets([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = isService
        ? await getServiceTargets(authFetch, selectedWeek, organization)
        : await getTwelveTasksTargets(authFetch, selectedWeek, organization);
      if (!response.ok) throw await parseTargetError(response);
      setTargets(getTargetRows(await response.json()));
    } catch (requestError) {
      setTargets([]);
      setError(requestError.message || "Unable to load targets.");
    } finally {
      setLoading(false);
    }
  }, [authFetch, isService, organization, selectedWeek]);

  useEffect(() => {
    loadTargets();
  }, [loadTargets]);

  useEffect(() => {
    let active = true;
    const loadWeeks = async () => {
      try {
        const response = await getAvailableTargetWeeks(authFetch, organization);
        if (!response.ok) throw await parseTargetError(response);
        const data = await response.json();
        if (active) {
          setAvailableWeeks(data.weeks || recentWeeks);
          setWeekError("");
        }
      } catch (requestError) {
        if (active) {
          setAvailableWeeks(recentWeeks);
          setWeekError(requestError.message || "Unable to load available weeks; showing recent weeks.");
        }
      }
    };
    loadWeeks();
    return () => {
      active = false;
    };
  }, [authFetch, organization]);

  const weekOptions = useMemo(
    () => [...new Set([selectedWeek, isoWeekId(), ...availableWeeks])].sort().reverse(),
    [availableWeeks, selectedWeek],
  );

  const loadPeople = useCallback(
    async (quiet = false) => {
      if (!quiet) {
        setPeopleLoading(true);
        setError("");
      }
      try {
        let rows;
        if (isAdmin) {
          const response = await authFetch(
            `${import.meta.env.VITE_BACKEND_URL || "http://localhost:8000"}/admin/users?skip=0&limit=500&organization=${encodeURIComponent(organization)}`,
            { method: "GET", headers: { "Content-Type": "application/json" } },
          );
          if (!response.ok) throw await parseTargetError(response);
          const data = await response.json();
          rows = (data.users || []).map((person) => ({
            id: person.id || person._id,
            name: [person.name, person.surname].filter(Boolean).join(" ") || "Unknown",
            email: person.email || "",
          }));
        } else {
          const data = await getEligiblePeople(authFetch, { limit: 200 });
          rows = (data.people || []).map((person) => ({
            id: person.person_id,
            name: person.name || "Unknown",
            email: person.email || "",
          }));
        }
        setPeople(rows);
      } catch (requestError) {
        if (quiet) {
          console.warn("Unable to load people for target name resolution:", requestError.message);
        } else {
          setError(requestError.message || "Unable to load people.");
        }
      } finally {
        if (!quiet) setPeopleLoading(false);
      }
    },
    [authFetch, organization, isAdmin],
  );

  // Load people once so table rows can resolve person IDs to full names via an
  // id -> name map (single fetch, not an N+1 per-row lookup).
  useEffect(() => {
    loadPeople(true);
  }, [loadPeople]);

  const openDialog = () => {
    setForm({ person: null, count: "" });
    setDialogOpen(true);
    loadPeople();
  };

  const handleCopyLastWeek = async () => {
    setNotice("");
    setError("");
    setLoading(true);
    try {
      const response = await copyLastWeekTargets(authFetch);
      if (!response.ok) throw await parseTargetError(response);
      const data = await response.json();
      setNotice(data.message || "Targets copied successfully.");
      await loadTargets();
    } catch (requestError) {
      setError(requestError.message || "Unable to copy last week's targets.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const { person, count } = form;
    if (!person || count === "" || !Number.isInteger(Number(count)) || Number(count) < 0) {
      setError("Pick a person and enter a whole-number target (0 or more).");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = isService
        ? await saveServiceTarget(authFetch, {
          leader_name: person.name,
          email: person.email,
          target_count: parseInt(count, 10),
          week_identifier: selectedWeek,
          person_id: person.id,
          target_type: "service",
        })
        : await saveTwelveTasksTarget(authFetch, {
          person_id: person.id,
          target: parseInt(count, 10),
          week_identifier: selectedWeek,
          organization,
          is_default: false,
        });
      if (!response.ok) throw await parseTargetError(response);
      const data = await response.json();
      if (!isService && data.roster_status && data.roster_message) {
        setNotice(data.roster_message);
      } else {
        setNotice("");
      }
      setDialogOpen(false);
      await loadTargets();
    } catch (requestError) {
      setError(requestError.message || "Unable to save target.");
    } finally {
      setSaving(false);
    }
  };

  const peopleById = useMemo(
    () => new Map(people.map((person) => [String(person.id), person.name])),
    [people],
  );

  // Resolve a target's person to a full name (first + last). Falls back to the
  // name carried on the target, then the person ID, then "Unknown person" —
  // never crashes when the person is missing or the lookup fails.
  const personName = useCallback(
    (target) => {
      const id = target?.person_id;
      const fromMap =
        id && peopleById.has(String(id)) ? peopleById.get(String(id)) : undefined;
      return (
        fromMap ||
        target.leader_name ||
        target.name ||
        (id ? String(id) : "Unknown person")
      );
    },
    [peopleById],
  );

  const columns = isService
    ? [
      ["Person", personName],
      ["Email", (target) => target.email || "—"],
      ["Target", (target) => target.target_count ?? "—"],
      ["Actual", (target) => target.actual_count ?? 0],
    ]
    : [
      ["Person", personName],
      ["Target", (target) => target.target ?? "—"],
      ["Actual", (target) => target.actual ?? 0],
      ["Type", (target) => target.is_default ? "Default" : "Custom"],
    ];

  return (
    <Stack spacing={2} sx={{ minWidth: 0 }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography component="h2" variant="h6" fontWeight={700}>
            {isService ? "Service Targets" : "12 Tasks"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Weekly targets for {organization}.
          </Typography>
        </Box>
        {isSupremeAdmin && (
          <TextField
            label="Organization"
            size="small"
            value={organization}
            onChange={(event) => setOrganization(event.target.value)}
            sx={{ width: { xs: "100%", sm: 220 } }}
          />
        )}
        <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 150 } }}>
          <InputLabel id={`${type}-week-label`}>Week</InputLabel>
          <Select
            labelId={`${type}-week-label`}
            label="Week"
            value={selectedWeek}
            onChange={(event) => setSelectedWeek(event.target.value)}
          >
            {weekOptions.map((week) => (
              <MenuItem key={week} value={week}>
                {week}{week === isoWeekId() ? " (this week)" : ""}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openDialog}
          fullWidth={isMobile}
        >
          {isService ? "Service target" : "12 Tasks target"}
        </Button>
        <Button
          variant="outlined"
          onClick={handleCopyLastWeek}
          disabled={loading}
          fullWidth={isMobile}
        >
          Copy last week
        </Button>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}
      {weekError && <Alert severity="warning">{weekError}</Alert>}
      {notice && <Alert severity="success">{notice}</Alert>}

      {loading ? (
        <Box sx={{ display: "grid", placeItems: "center", py: 5 }}><CircularProgress size={28} /></Box>
      ) : targets.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
          No {isService ? "service" : "12 Tasks"} targets for {selectedWeek}.
        </Typography>
      ) : isMobile ? (
        <Stack spacing={1}>
          {targets.map((target, index) => (
            <Card key={target.id || target._id || index} variant="outlined">
              <CardContent>
                <Typography fontWeight={700}>{columns[0][1](target)}</Typography>
                {columns.slice(1).map(([label, value]) => (
                  <Typography key={label} variant="body2" color="text.secondary">
                    {label}: {value(target)}
                  </Typography>
                ))}
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
        <TableContainer sx={{ borderRadius: 1, border: 1, borderColor: "divider", maxWidth: "100%" }}>
          <Table size="small">
            <TableHead>
              <TableRow>{columns.map(([label]) => <TableCell key={label}>{label}</TableCell>)}</TableRow>
            </TableHead>
            <TableBody>
              {targets.map((target, index) => (
                <TableRow key={target.id || target._id || index} hover>
                  {columns.map(([label, value]) => <TableCell key={label}>{value(target)}</TableCell>)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => !saving && setDialogOpen(false)}
        fullScreen={isMobile}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Set {isService ? "service" : "12 Tasks"} target · {selectedWeek}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <Autocomplete
              options={people}
              loading={peopleLoading}
              value={form.person}
              onChange={(_, person) => setForm((current) => ({ ...current, person }))}
              getOptionLabel={personLabel}
              isOptionEqualToValue={(first, second) => first.id === second.id}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>{personLabel(option)}</li>
              )}
              renderInput={(params) => <TextField {...params} label="Person" />}
            />
            <TextField
              label={isService ? "Target (services this week)" : "Target (tasks this week)"}
              type="number"
              inputProps={{ min: 0, step: 1 }}
              value={form.count}
              onChange={(event) => setForm((current) => ({ ...current, count: event.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={saving || peopleLoading || !form.person || form.count === ""}
            variant="contained"
            startIcon={saving ? <CircularProgress size={18} /> : <CheckIcon />}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
