import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
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
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import { AuthContext } from "../../contexts/AuthContext";
import { normalizeRole } from "../../utils/roleNormalizer";
import {
  bulkCreateCustomTargets,
  createCustomTarget,
  deactivateCustomTarget,
  getEligiblePeople,
  getWeeklyResults,
  listCustomTargets,
  updateCustomTarget,
} from "./api";
import {
  formatSastDate,
  isMonday,
  isSunday,
  nextMonday,
  mondayOfWeek,
} from "./dateUtils";

const DAYS = [
  ["monday", "Mon"],
  ["tuesday", "Tue"],
  ["wednesday", "Wed"],
  ["thursday", "Thu"],
  ["friday", "Fri"],
  ["saturday", "Sat"],
  ["sunday", "Sun"],
];
const EMPTY_DAYS = Object.fromEntries(DAYS.map(([key]) => [key, "0"]));
const PAGE_SIZE = 25;

function getRows(data, key) {
  return data?.[key] || [];
}

function personId(row) {
  return String(row.person_id ?? row.person?.person_id ?? row.person?.id ?? "");
}

function targetId(row) {
  return row.id || row._id;
}

function targetDays(target) {
  return Object.fromEntries(DAYS.map(([key, short]) => [
    key,
    Number(target.days?.[key] ?? target[key] ?? target[`${short.toLowerCase()}_target`] ?? 0),
  ]));
}

function weeklyTarget(target) {
  const days = targetDays(target);
  return Number(target.weekly_target ?? Object.values(days).reduce((total, value) => total + value, 0));
}

function targetStatusFor(target, reviewByPerson) {
  const review = reviewByPerson.get(personId(target));
  return review?.status || target.status || "—";
}

function targetPayload(person, days, startDate, endDate, organization, includePerson = true) {
  return {
    ...(includePerson ? { person_id: person.person_id || person.id } : {}),
    days: Object.fromEntries(DAYS.map(([key]) => [key, Number(days[key])])),
    start_date: startDate,
    end_date: endDate || null,
    organization,
  };
}

function validateForm({ people, bulk, days, startDate, endDate, editingTarget }) {
  const errors = {};
  const selected = bulk ? people : (people ? [people] : []);
  if (selected.length === 0) errors.people = "Choose at least one eligible person.";
  DAYS.forEach(([key, label]) => {
    const raw = days[key];
    if (!/^\d+$/.test(String(raw))) errors[key] = `${label} must be a whole number greater than or equal to 0.`;
  });
  if (DAYS.every(([key]) => /^\d+$/.test(String(days[key])) && Number(days[key]) === 0)) {
    errors.week = "The weekly target must be greater than 0.";
  }
  if (!isMonday(startDate)) errors.startDate = "Start date must be a Monday.";
  const today = formatSastDate();
  const earliest = today === mondayOfWeek(today) ? today : nextMonday(today);
  if (!editingTarget && isMonday(startDate) && startDate < earliest) {
    errors.startDate = "A target set during the week starts the following Monday.";
  }
  if (endDate && !isSunday(endDate)) errors.endDate = "End date must be a Sunday.";
  if (endDate && startDate && endDate < startDate) errors.endDate = "End date must be on or after the start date.";
  return errors;
}

export default function CustomTargetsTab() {
  const { authFetch, user } = useContext(AuthContext);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const organization = user?.Organization || user?.organization || "Active Church";
  const [targets, setTargets] = useState([]);
  const [weeklyRows, setWeeklyRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulk, setBulk] = useState(false);
  const [selectedPeople, setSelectedPeople] = useState([]);
  const [days, setDays] = useState({ ...EMPTY_DAYS });
  const [startDate, setStartDate] = useState(nextMonday());
  const [endDate, setEndDate] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [eligiblePeople, setEligiblePeople] = useState([]);
  const [eligibleSearchInput, setEligibleSearchInput] = useState("");
  const [eligibleSearch, setEligibleSearch] = useState("");
  const [eligiblePage, setEligiblePage] = useState(0);
  const [eligibleTotal, setEligibleTotal] = useState(0);
  const [eligibleLoading, setEligibleLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bulkResults, setBulkResults] = useState([]);
  const [bulkSummary, setBulkSummary] = useState(null);
  const [editingTarget, setEditingTarget] = useState(null);
  const [deactivatingTarget, setDeactivatingTarget] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  const isAdmin = normalizeRole(user?.role) === "admin";
  const [people, setPeople] = useState([]);

  const currentWeekStart = useMemo(() => mondayOfWeek(formatSastDate()), []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [targetData, weeklyData] = await Promise.all([
        listCustomTargets(authFetch),
        getWeeklyResults(authFetch, { week: currentWeekStart }),
      ]);
      setTargets(getRows(targetData, "targets"));
      setWeeklyRows(getRows(weeklyData, "results"));
    } catch (requestError) {
      setTargets([]);
      setWeeklyRows([]);
      setError(requestError.message || "Unable to load custom targets.");
    } finally {
      setLoading(false);
    }
  }, [authFetch, currentWeekStart]);

  // Load people once so table rows can fall back to a people lookup for names.
  const loadPeople = useCallback(
    async (quiet = false) => {
      try {
        let rows;
        if (isAdmin) {
          const response = await authFetch(
            `${import.meta.env.VITE_BACKEND_URL || "http://localhost:8000"}/admin/users?skip=0&limit=500&organization=${encodeURIComponent(organization)}`,
            { method: "GET", headers: { "Content-Type": "application/json" } },
          );
          if (!response.ok) throw new Error("Unable to load people");
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
        if (!quiet) {
          setError(requestError.message || "Unable to load people.");
        }
      }
    },
    [authFetch, organization, isAdmin],
  );

  // Load people once on mount (quietly — no error alerts) so the Person cell
  // can fall back to an id -> name map if the API row is unenriched.
  useEffect(() => {
    loadPeople(true);
  }, [loadPeople]);

  const peopleById = useMemo(
    () => new Map(people.map((person) => [String(person.id), person.name])),
    [people],
  );

  // Person name resolver: API-supplied person_name first, then the people map,
  // then the raw id, then "Unknown".  Never crashes when the person is missing.
  const personName = useCallback(
    (target) => {
      const id = personId(target);
      const fromMap = id && peopleById.has(id) ? peopleById.get(id) : undefined;
      return (
        target.person_name ||
        target.name ||
        target.full_name ||
        target.person?.name ||
        target.leader_name ||
        fromMap ||
        id ||
        "Unknown"
      );
    },
    [peopleById],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setEligiblePage(0);
      setEligibleSearch(eligibleSearchInput.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [eligibleSearchInput]);

  useEffect(() => {
    if (!dialogOpen || editingTarget) return undefined;
    let active = true;
    setEligibleLoading(true);
    getEligiblePeople(authFetch, {
      search: eligibleSearch,
      limit: PAGE_SIZE,
      offset: eligiblePage * PAGE_SIZE,
    }).then((data) => {
      if (!active) return;
      setEligiblePeople(data.people || []);
      setEligibleTotal(Number(data.total || 0));
    }).catch((requestError) => {
      if (active) setError(requestError.message || "Unable to load eligible people.");
    }).finally(() => {
      if (active) setEligibleLoading(false);
    });
    return () => {
      active = false;
    };
  }, [authFetch, dialogOpen, editingTarget, eligiblePage, eligibleSearch]);

  const reviewByPerson = useMemo(
    () => new Map(weeklyRows.map((row) => [String(row.person_id), row])),
    [weeklyRows],
  );
  const roles = useMemo(
    () => [...new Set(targets.map((target) => target.role || target.person?.role).filter(Boolean))].sort(),
    [targets],
  );
  const visibleTargets = useMemo(() => {
    const query = search.trim().toLowerCase();
    return targets.filter((target) => {
      const name = personName(target).toLowerCase();
      const role = String(target.role || target.person?.role || "").toLowerCase();
      const status = targetStatusFor(target, reviewByPerson);
      return (!query || name.includes(query) || role.includes(query)) &&
        (roleFilter === "all" || role === roleFilter.toLowerCase()) &&
        (statusFilter === "all" || status === statusFilter);
    });
  }, [reviewByPerson, roleFilter, search, statusFilter, targets, personName]);

  const resetForm = (target = null) => {
    setEditingTarget(target);
    setBulk(false);
    setSelectedPeople(target ? [{
      person_id: personId(target),
      id: personId(target),
      name: personName(target),
      email: target.email || target.person?.email || "",
      role: target.role || target.person?.role || "",
    }] : []);
    setDays(target ? Object.fromEntries(DAYS.map(([key, short]) => [
      key,
      String(target.days?.[key] ?? target[key] ?? target[`${short.toLowerCase()}_target`] ?? 0),
    ])) : { ...EMPTY_DAYS });
    setStartDate(target?.start_date || nextMonday());
    setEndDate(target?.end_date || "");
    setFieldErrors({});
    setBulkResults([]);
    setBulkSummary(null);
    setError("");
    setDialogOpen(true);
  };

  const closeForm = () => {
    if (submitting) return;
    setDialogOpen(false);
    setEditingTarget(null);
    setError("");
  };

  const handleSubmit = async () => {
    const selected = bulk ? selectedPeople : selectedPeople[0];
    const errors = validateForm({
      people: selected,
      bulk,
      days,
      startDate,
      endDate,
      editingTarget,
    });
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setSubmitting(true);
    setError("");
    setBulkResults([]);
    setBulkSummary(null);
    try {
      if (bulk) {
        const payload = {
          targets: selectedPeople.map((person) => targetPayload(person, days, startDate, endDate, organization)),
        };
        const result = await bulkCreateCustomTargets(authFetch, payload);
        const items = result.results || [];
        setBulkResults(items);
        setBulkSummary(result.summary || null);
        if (items.length === 0) {
          setDialogOpen(false);
          setEditingTarget(null);
        }
        await loadData();
      } else {
        const payload = targetPayload(
          selectedPeople[0],
          days,
          startDate,
          endDate,
          organization,
          !editingTarget,
        );
        if (editingTarget) {
          await updateCustomTarget(authFetch, targetId(editingTarget), payload);
        } else {
          await createCustomTarget(authFetch, payload);
        }
        setDialogOpen(false);
        setEditingTarget(null);
        await loadData();
      }
    } catch (requestError) {
      if (requestError.results?.length) setBulkResults(requestError.results);
      if (requestError.summary) setBulkSummary(requestError.summary);
      setError(requestError.message || "Unable to save the target.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivatingTarget) return;
    setDeactivating(true);
    setError("");
    try {
      await deactivateCustomTarget(authFetch, targetId(deactivatingTarget));
      setDeactivatingTarget(null);
      await loadData();
    } catch (requestError) {
      setError(requestError.message || "Unable to deactivate the target.");
      setDeactivatingTarget(null);
    } finally {
      setDeactivating(false);
    }
  };

  const total = DAYS.reduce((sum, [key]) => sum + (Number(days[key]) || 0), 0);
  const personOptions = eligiblePeople;
  const currentEligible = useMemo(
    () => new Map(personOptions.map((person) => [String(person.person_id), person])),
    [personOptions],
  );
  const selectedValue = bulk
    ? selectedPeople.map((person) => currentEligible.get(String(person.person_id || person.id)) || person)
    : selectedPeople[0] || null;

  const getCurrentStatusLabel = (target) => {
    const status = targetStatusFor(target, reviewByPerson);
    if (status === "met") return "Met";
    if (status === "not_met") return "Not met";
    if (status === "in_progress") return "In progress";
    return status;
  };

  return (
    <Stack spacing={2} sx={{ minWidth: 0 }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography component="h2" variant="h6" fontWeight={700}>Custom Targets</Typography>
          <Typography variant="body2" color="text.secondary">
            Set and review weekly targets by person and role.
          </Typography>
        </Box>
        <TextField
          label="Search"
          size="small"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{ width: { xs: "100%", sm: 220 } }}
        />
        <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 150 } }}>
          <InputLabel id="custom-target-role-label">Role</InputLabel>
          <Select
            labelId="custom-target-role-label"
            label="Role"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
          >
            <MenuItem value="all">All roles</MenuItem>
            {roles.map((role) => <MenuItem key={role} value={role}>{role}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 150 } }}>
          <InputLabel id="custom-target-status-label">Status</InputLabel>
          <Select
            labelId="custom-target-status-label"
            label="Status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <MenuItem value="all">All statuses</MenuItem>
            <MenuItem value="met">Met</MenuItem>
            <MenuItem value="not_met">Not met</MenuItem>
            <MenuItem value="in_progress">In progress</MenuItem>
          </Select>
        </FormControl>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => resetForm()}
          fullWidth={isMobile}
        >
          Set target
        </Button>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}
      {loading ? (
        <Box sx={{ display: "grid", placeItems: "center", py: 6 }}><CircularProgress /></Box>
      ) : visibleTargets.length === 0 ? (
        <Alert severity="info">{targets.length ? "No targets match the selected filters." : "No custom targets found."}</Alert>
      ) : isMobile ? (
        <Stack spacing={1}>
          {visibleTargets.map((target, index) => {
            const dayValues = targetDays(target);
            return (
              <Card key={targetId(target) || index} variant="outlined">
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography fontWeight={700} sx={{ overflowWrap: "anywhere" }}>{personName(target)}</Typography>
                      <Typography variant="body2" color="text.secondary">{target.role || target.person?.role || "Role unavailable"}</Typography>
                    </Box>
                    <Stack direction="row" spacing={0}>
                      <IconButton aria-label={`Edit ${personName(target)}`} onClick={() => resetForm(target)} size="small"><EditIcon /></IconButton>
                      <IconButton aria-label={`Deactivate ${personName(target)}`} onClick={() => setDeactivatingTarget(target)} size="small"><DeleteOutlineIcon /></IconButton>
                    </Stack>
                  </Stack>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {DAYS.map(([key, label]) => `${label} ${dayValues[key]}`).join(" · ")}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                    <Typography variant="body2" fontWeight={700}>Weekly total: {weeklyTarget(target)}</Typography>
                    <Chip size="small" label={getCurrentStatusLabel(target)} variant="outlined" />
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      ) : (
        <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 1, maxWidth: "100%", overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {["Name", "Role", "Daily values", "Weekly total", "Current-week status", "Actions"].map((label) => (
                  <TableCell key={label}>{label}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleTargets.map((target, index) => {
                const dayValues = targetDays(target);
                return (
                  <TableRow key={targetId(target) || index} hover>
                    <TableCell>{personName(target)}</TableCell>
                    <TableCell>{target.role || target.person?.role || "—"}</TableCell>
                    <TableCell>{DAYS.map(([key, label]) => `${label} ${dayValues[key]}`).join(" · ")}</TableCell>
                    <TableCell>{weeklyTarget(target)}</TableCell>
                    <TableCell>{getCurrentStatusLabel(target)}</TableCell>
                    <TableCell>
                      <IconButton aria-label={`Edit ${personName(target)}`} onClick={() => resetForm(target)} size="small"><EditIcon /></IconButton>
                      <IconButton aria-label={`Deactivate ${personName(target)}`} onClick={() => setDeactivatingTarget(target)} size="small"><DeleteOutlineIcon /></IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={closeForm} fullScreen={isMobile} maxWidth="sm" fullWidth>
        <DialogTitle>{editingTarget ? "Edit target" : "Set target"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            {!editingTarget && (
              <>
                <Box>
                  <Checkbox
                    checked={bulk}
                    onChange={(event) => {
                      setBulk(event.target.checked);
                      setSelectedPeople((current) => event.target.checked ? current : current.slice(0, 1));
                      setFieldErrors((current) => ({ ...current, people: undefined }));
                    }}
                    inputProps={{ "aria-label": "Set for multiple people" }}
                  />
                  <Typography component="span">Set for multiple people</Typography>
                </Box>
                <Autocomplete
                  multiple={bulk}
                  options={personOptions}
                  value={selectedValue}
                  loading={eligibleLoading}
                  filterOptions={(options) => options}
                  getOptionLabel={(person) => `${person.name || "Unknown"}${person.email ? ` (${person.email})` : ""}`}
                  isOptionEqualToValue={(first, second) => String(first.person_id) === String(second.person_id || second.id)}
                  onInputChange={(_, value, reason) => {
                    if (reason === "input") setEligibleSearchInput(value);
                  }}
                  onChange={(_, value) => {
                    setSelectedPeople(bulk ? value : value ? [value] : []);
                    setFieldErrors((current) => ({ ...current, people: undefined }));
                  }}
                  renderOption={(props, person) => (
                    <li {...props} key={person.person_id}>
                      <Stack direction="row" justifyContent="space-between" spacing={1} sx={{ width: "100%" }}>
                        <span>{person.name}{person.email ? ` · ${person.email}` : ""}</span>
                        {person.has_active_target && <Chip size="small" label="Has active target" />}
                      </Stack>
                    </li>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={bulk ? "People" : "Person"}
                      error={!!fieldErrors.people}
                      helperText={fieldErrors.people || "Only server-eligible people with linked user accounts are listed."}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {eligibleLoading ? <CircularProgress color="inherit" size={18} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" color="text.secondary">
                    {eligibleTotal ? `${eligiblePage * PAGE_SIZE + 1}–${Math.min((eligiblePage + 1) * PAGE_SIZE, eligibleTotal)} of ${eligibleTotal}` : "No eligible people"}
                  </Typography>
                  <Stack direction="row">
                    <Button disabled={eligiblePage === 0 || eligibleLoading} onClick={() => setEligiblePage((page) => page - 1)}>Previous</Button>
                    <Button disabled={(eligiblePage + 1) * PAGE_SIZE >= eligibleTotal || eligibleLoading} onClick={() => setEligiblePage((page) => page + 1)}>Next</Button>
                  </Stack>
                </Stack>
              </>
            )}
            {editingTarget && (
              <Typography variant="body2" color="text.secondary">{personName(editingTarget)} · {editingTarget.role || "Role unavailable"}</Typography>
            )}
            <Typography variant="subtitle2" fontWeight={700}>Daily targets</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(4, minmax(0, 1fr))" }, gap: 1 }}>
              {DAYS.map(([key, label]) => (
                <TextField
                  key={key}
                  label={label}
                  type="number"
                  inputProps={{ min: 0, step: 1 }}
                  value={days[key]}
                  onChange={(event) => setDays((current) => ({ ...current, [key]: event.target.value }))}
                  error={!!fieldErrors[key]}
                  helperText={fieldErrors[key] || " "}
                />
              ))}
            </Box>
            {fieldErrors.week && <Alert severity="error">{fieldErrors.week}</Alert>}
            <Typography aria-live="polite" fontWeight={700}>Weekly total: {total}</Typography>
            <Alert severity="info">
              A target set during the week starts the following Monday.
            </Alert>
            <TextField
              label="Start date (Monday)"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              error={!!fieldErrors.startDate}
              helperText={fieldErrors.startDate || " "}
              InputLabelProps={{ shrink: true }}
              inputProps={editingTarget ? {} : { min: nextMonday() }}
            />
            <TextField
              label="End date (optional Sunday)"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              error={!!fieldErrors.endDate}
              helperText={fieldErrors.endDate || "Leave blank for an open-ended target."}
              InputLabelProps={{ shrink: true }}
            />
            {bulkResults.length > 0 && (
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Bulk results</Typography>
                {bulkSummary && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {bulkSummary.ok} of {bulkSummary.total} succeeded · {bulkSummary.errors} failed
                  </Typography>
                )}
                <Stack spacing={0.75}>
                  {bulkResults.map((item, index) => {
                    const selectedPerson = selectedPeople.find(
                      (person) => String(person.person_id || person.id) === String(item.person_id),
                    );
                    return (
                      <Alert key={item.person_id || index} severity={item.status === "error" ? "error" : "success"}>
                        {item.person_name || item.name || (selectedPerson && personName(selectedPerson)) || item.person_id || "Person"}: {item.status === "error"
                          ? `${item.error || "Failed"}${item.status_code ? ` (HTTP ${item.status_code})` : ""}`
                          : "Created"}
                      </Alert>
                    );
                  })}
                </Stack>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeForm} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || eligibleLoading} variant="contained">
            {submitting ? <CircularProgress size={20} /> : editingTarget ? "Save changes" : bulk ? "Set targets" : "Set target"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deactivatingTarget} onClose={() => !deactivating && setDeactivatingTarget(null)}>
        <DialogTitle>Deactivate target?</DialogTitle>
        <DialogContent>
          <Typography>
            Deactivate {deactivatingTarget ? personName(deactivatingTarget) : "this target"}? It will end on Sunday of the current week and will not be deleted.
          </Typography>
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeactivatingTarget(null)} disabled={deactivating}>Cancel</Button>
          <Button onClick={handleDeactivate} disabled={deactivating} color="error" variant="contained">
            {deactivating ? <CircularProgress size={18} /> : "Deactivate"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
