import { useContext, useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Phone, Plus, Filter, X, Check, Search, Users, ChevronDown, MapPin, Calendar } from "lucide-react";
import { useTheme } from "@mui/material/styles";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthContext } from "../contexts/AuthContext";
import { useTaskUpdate } from "../contexts/TaskUpdateContext";
import {
  Box,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Divider,
  Typography,
  InputAdornment,
} from "@mui/material";
import { useMediaQuery } from "@mui/material";

// ─── Design System Colors ──────────────────────────────────────────────
const COLORS = {
  // Light mode
  light: {
    background: "#f8f9fa",
    backgroundSecondary: "#ffffff",
    card: "#ffffff",
    border: "#e5e7eb",
    borderSecondary: "#d1d5db",
    foreground: "#1a1a24",
    mutedForeground: "#6b7280",
    primary: "#6366f1",
    primaryForeground: "#ffffff",
    primaryHover: "#4f46e5",
    primaryBorder: "#818cf8",
    teal: "#14b8a6",
    tealBg: "#ecfdf5",
    tealBorder: "#14b8a6",
    gold: "#f59e0b",
    overdue: "#f59e0b",
    completed: "#22c55e",
    inProgress: "#3b82f6",
    awaiting: "#f97316",
    cardHover: "#f3f4f6",
    inputBg: "#f9fafb",
    inputBorder: "#d1d5db",
    ring: "#6366f1",
    overlay: "rgba(0, 0, 0, 0.6)",
    sidebar: "#ffffff",
    sidebarBorder: "#e5e7eb",
    sidebarActive: "#f3f4f6",
  },
  // Dark mode
  dark: {
    background: "#111827",
    backgroundSecondary: "#1e1e1e",
    card: "#1e1e1e",
    border: "#374151",
    borderSecondary: "#4b5563",
    foreground: "#f9fafb",
    mutedForeground: "#9ca3af",
    primary: "#6366f1",
    primaryForeground: "#ffffff",
    primaryHover: "#818cf8",
    primaryBorder: "#818cf8",
    teal: "#14b8a6",
    tealBg: "#064e3b",
    tealBorder: "#14b8a6",
    gold: "#f59e0b",
    overdue: "#f59e0b",
    completed: "#22c55e",
    inProgress: "#60a5fa",
    awaiting: "#fb923c",
    cardHover: "#2d2d2d",
    inputBg: "#1f2937",
    inputBorder: "#374151",
    ring: "#818cf8",
    overlay: "rgba(0, 0, 0, 0.75)",
    sidebar: "#1e1e1e",
    sidebarBorder: "#374151",
    sidebarActive: "#2d2d2d",
  },
};

// ─── People cache helpers (mirrors the working Daily Tasks branch) ────────────
const CACHE_DURATION = 30 * 60 * 1000;

const getRawCachedPeople = () => {
  // Daily Tasks keeps its own lightweight cache so it never overwrites the
  // richer person objects cached by the People page.
  if (Array.isArray(window.dailyTasksPeopleCache) && window.dailyTasksPeopleCache.length > 0) {
    return window.dailyTasksPeopleCache;
  }
  const cache = window.globalPeopleCache;
  return Array.isArray(cache)
    ? cache
    : Array.isArray(cache?.data)
      ? cache.data
      : [];
};

const getPeopleCacheTimestamp = () =>
  Array.isArray(window.dailyTasksPeopleCache) && window.dailyTasksPeopleCache.length > 0
    ? window.dailyTasksPeopleCacheTimestamp || 0
    : window.globalCacheTimestamp || 0;

// Fallback data (people/all-minimal) is capped at 1000 people, so it must not
// be treated as fresh — the full cache load should still upgrade it later.
const isPeopleCachePartial = () =>
  Array.isArray(window.dailyTasksPeopleCache) && window.dailyTasksPeopleCache.length > 0
    ? window.dailyTasksPeopleCachePartial === true
    : false;

const normalizePerson = (raw = {}) => {
  const fullName = (raw.FullName || raw.fullName || "").toString().trim();
  const nameParts = fullName ? fullName.split(/\s+/) : [];
  const name = (raw.Name || raw.name || nameParts[0] || "").toString().trim();
  const surname = (raw.Surname || raw.surname || nameParts.slice(1).join(" "))
    .toString()
    .trim();
  const displayName = `${name} ${surname}`.trim();

  return {
    _id: (raw._id || raw.id || raw.person_id || "").toString(),
    name,
    surname,
    fullName: displayName,
    fullNameLower: displayName.toLowerCase(),
    email: (raw.Email || raw.email || "").toString().trim().toLowerCase(),
    phone: (raw.Number || raw.phone || raw.Phone || "").toString().trim(),
    leader1: (raw["Leader @1"] || raw.leader1 || "").toString().trim(),
    leader12: (raw["Leader @12"] || raw.leader12 || "").toString().trim(),
    leader144: (raw["Leader @144"] || raw.leader144 || "").toString().trim(),
    leader1728: (raw["Leader @1728"] || raw.leader1728 || "").toString().trim(),
  };
};

const getCachedPeople = () => getRawCachedPeople().map(normalizePerson);

const searchPeopleLocal = (peopleList, searchValue) => {
  if (!Array.isArray(peopleList)) return [];
  const q = (searchValue || "").toLowerCase().trim();
  if (!q) return peopleList;

  return peopleList.filter((person) => {
    const haystack = [
      person.fullNameLower,
      person.name,
      person.surname,
      person.email,
      person.phone,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
};

const COMPLETED_STAGES = ["completed", "done", "closed", "finished"];

const toDateOnly = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const isTaskCompleted = (task) => {
  const stage = String(task?.taskStage ?? task?.status ?? "")
    .toLowerCase()
    .trim();
  return COMPLETED_STAGES.includes(stage);
};

const isTaskOverdue = (task) => {
  if (isTaskCompleted(task)) return false;
  const rawDate = task?.followup_date || task?.date;
  if (!rawDate) return false;
  const due = new Date(rawDate);
  return !Number.isNaN(due.getTime()) && due.getTime() < Date.now();
};

// Maps a task to one of the filter stage keys (completed/overdue/awaiting task/open).
const getTaskStageKey = (task) => {
  const stage = String(task?.taskStage ?? task?.status ?? "open")
    .toLowerCase()
    .trim();
  if (COMPLETED_STAGES.includes(stage)) return "completed";
  if (isTaskOverdue(task)) return "overdue";
  if (stage === "awaiting task" || stage === "awaiting") return "awaiting task";
  return stage || "open";
};

function Spinner({ size = 16, color = "#6b7280" }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        border: `2px solid transparent`,
        borderTop: `2px solid ${color}`,
        borderRight: `2px solid ${color}`,
        borderRadius: "50%",
        animation: "spin 0.6s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}

function StatusBadge({ status, colors }) {
  const normalizedStatus = String(status || "open").toLowerCase();
  const isAwaiting = normalizedStatus === "awaiting task" || normalizedStatus === "awaiting";
  const backgroundColor = normalizedStatus === "completed"
    ? `${colors.completed}20`
    : normalizedStatus === "in-progress"
      ? `${colors.inProgress}20`
      : normalizedStatus === "overdue"
        ? `${colors.overdue}20`
        : isAwaiting
          ? `${colors.awaiting}20`
          : `${colors.border}80`;
  const color = normalizedStatus === "completed"
    ? colors.completed
    : normalizedStatus === "in-progress"
      ? colors.inProgress
      : normalizedStatus === "overdue"
        ? colors.overdue
        : isAwaiting
          ? colors.awaiting
          : colors.mutedForeground;

  const label = normalizedStatus === "awaiting task" || normalizedStatus === "awaiting"
    ? "Awaiting Task"
    : normalizedStatus === "in-progress"
      ? "In Progress"
      : normalizedStatus
        ? normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1)
        : "Open";

  return (
    <span style={{ borderRadius: 999, padding: "6px 10px", backgroundColor, color, fontSize: 12, fontWeight: 600 }}>
      {label}
    </span>
  );
}

function CallTaskModal({
  isOpen,
  onClose,
  taskData,
  handleChange,
  taskTypes,
  handleSubmit,
  submitting,
  recipientPeople,
  assigneePeople,
  isLoadingPeople,
  modalType,
}) {
  const availableTaskTypes = taskTypes.length
    ? taskTypes.map((taskType) => typeof taskType === "string" ? taskType : taskType.name).filter(Boolean)
    : ["Awaiting Call", "Service Invitation", "Service Follow Up", "Follow Up", "New Member Care"];

  // Never let a preselected task type fall outside the select's options.
  if (taskData.taskType && !availableTaskTypes.includes(taskData.taskType)) {
    availableTaskTypes.unshift(taskData.taskType);
  }

  const stageOptions = ["Awaiting Task", "Open", "Completed"];

  const [recipientSearch, setRecipientSearch] = useState(taskData.recipientDisplay || "");
  const [recipientOpen, setRecipientOpen] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState(taskData.assignedTo || "");
  const [assigneeOpen, setAssigneeOpen] = useState(false);

  const recipientResults = useMemo(
    () =>
      searchPeopleLocal(recipientPeople || [], recipientSearch)
        .filter((person) => person.fullName)
        .slice(0, 50),
    [recipientPeople, recipientSearch],
  );

  const assigneeResults = useMemo(
    () =>
      searchPeopleLocal(assigneePeople || [], assigneeSearch)
        .filter((person) => person.fullName)
        .slice(0, 50),
    [assigneePeople, assigneeSearch],
  );

  const handleRecipientInput = (event) => {
    const value = event.target.value;
    setRecipientSearch(value);
    setRecipientOpen(true);

    // Typing invalidates a previously selected recipient.
    if (taskData.recipient && value !== taskData.recipientDisplay) {
      handleChange({ target: { name: "recipient", value: null } });
    }
    handleChange({ target: { name: "recipientDisplay", value } });
  };

  const handleRecipientSelect = (person) => {
    setRecipientSearch(person.fullName);
    setRecipientOpen(false);
    handleChange({ target: { name: "recipient", value: person } });
    handleChange({ target: { name: "recipientDisplay", value: person.fullName } });
    handleChange({ target: { name: "contactedPersonName", value: person.fullName } });
    handleChange({ target: { name: "contactedPersonEmail", value: person.email } });
    handleChange({ target: { name: "contactedPersonPhone", value: person.phone } });
  };

  const handleAssigneeInput = (event) => {
    const value = event.target.value;
    setAssigneeSearch(value);
    setAssigneeOpen(true);
    handleChange({ target: { name: "assignedTo", value } });
    handleChange({ target: { name: "assignedEmail", value: "" } });
  };

  const handleAssigneeSelect = (person) => {
    setAssigneeSearch(person.fullName);
    setAssigneeOpen(false);
    handleChange({ target: { name: "assignedTo", value: person.fullName } });
    handleChange({ target: { name: "assignedEmail", value: person.email } });
  };

  const renderPeopleDropdown = (people, onSelect, emptyLabel) => (
    <Box
      sx={{
        position: "absolute",
        top: "calc(100% + 4px)",
        left: 0,
        right: 0,
        zIndex: 1400,
        maxHeight: 260,
        overflowY: "auto",
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        boxShadow: 6,
      }}
    >
      {people.length === 0 ? (
        <Box sx={{ px: 2, py: 1.5, fontSize: 13, color: "text.secondary" }}>
          {emptyLabel}
        </Box>
      ) : (
        people.map((person) => (
          <MenuItem
            key={`${person.email || person._id || person.fullName}-${person.fullName}`}
            onClick={() => onSelect(person)}
            sx={{ py: 1 }}
          >
            {person.fullName}
          </MenuItem>
        ))
      )}
    </Box>
  );

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: "18px",
          background: "background.paper",
        },
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {modalType === "visit" ? "Visit Task" : "Call Task"}
        </DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 2, pt: "12px !important" }}>
          <TextField
            select
            required
            label="Task Type"
            name="taskType"
            value={taskData.taskType}
            onChange={handleChange}
          >
            {availableTaskTypes.map((taskType) => (
              <MenuItem key={taskType} value={taskType}>{taskType}</MenuItem>
            ))}
          </TextField>

          {/* Recipient — who the task is for */}
          <Box sx={{ position: "relative" }}>
            <TextField
              required
              fullWidth
              autoComplete="off"
              label="Recipient"
              placeholder="Type name to search..."
              value={recipientSearch}
              onChange={handleRecipientInput}
              onFocus={() => setRecipientOpen(true)}
              onBlur={() => setTimeout(() => setRecipientOpen(false), 150)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    {isLoadingPeople && recipientPeople.length === 0 ? (
                      <Spinner size={16} />
                    ) : (
                      <Search size={18} color="action" />
                    )}
                  </InputAdornment>
                ),
              }}
            />
            {recipientOpen &&
              renderPeopleDropdown(
                recipientResults,
                handleRecipientSelect,
                isLoadingPeople && recipientPeople.length === 0
                  ? "Loading people…"
                  : recipientSearch.trim()
                    ? "No matching people found."
                    : "Start typing a name…",
              )}
          </Box>

          {/* Assigned To — searchable, defaults to the current user */}
          <Box sx={{ position: "relative" }}>
            <TextField
              required
              fullWidth
              autoComplete="off"
              label="Assigned To"
              placeholder="Search and select assignee..."
              value={assigneeSearch}
              onChange={handleAssigneeInput}
              onFocus={() => setAssigneeOpen(true)}
              onBlur={() => setTimeout(() => setAssigneeOpen(false), 150)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Search size={18} color="action" />
                  </InputAdornment>
                ),
              }}
            />
            {assigneeOpen &&
              renderPeopleDropdown(
                assigneeResults,
                handleAssigneeSelect,
                assigneeSearch.trim()
                  ? "No matching people found."
                  : "Start typing a name…",
              )}
          </Box>

          {/* Due date is automatic; only the time is editable */}
          <Box>
            <Typography
              variant="caption"
              sx={{ display: "block", mb: 1, fontWeight: 700, color: "text.secondary" }}
            >
              Due Date &amp; Time
            </Typography>
            <Box sx={{ display: "flex", gap: 1.5 }}>
              <TextField
                label="Due Date"
                type="date"
                value={taskData.dueDate || ""}
                disabled
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Time"
                type="time"
                name="dueTime"
                value={taskData.dueTime || ""}
                onChange={handleChange}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          </Box>

          {/* Task Stage instead of Status */}
          <TextField
            select
            required
            label="Task Stage"
            name="taskStage"
            value={taskData.taskStage || "Open"}
            onChange={handleChange}
          >
            {stageOptions.map((stage) => (
              <MenuItem key={stage} value={stage}>{stage}</MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? "Saving..." : "Save Task"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function NewTaskTypeModal({ isOpen, onClose, newTaskTypeName, setNewTaskTypeName, createTaskType, addingTaskType }) {
  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="xs">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          createTaskType();
        }}
      >
        <DialogTitle>New Task Type</DialogTitle>
        <DialogContent sx={{ pt: "12px !important" }}>
          <TextField
            autoFocus
            required
            fullWidth
            label="Task type name"
            value={newTaskTypeName}
            onChange={(event) => setNewTaskTypeName(event.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={addingTaskType || !newTaskTypeName.trim()}>
            {addingTaskType ? "Adding..." : "Add Type"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// Person Filter Modal Component
function PersonFilterModal({ 
  open, 
  onClose, 
  teamMembers, 
  selectedPeople, 
  onSelectionChange,
  isDarkMode,
  isAdmin,
}) {
  const [searchResults, setSearchResults] = useState([]);
  const [localSearch, setLocalSearch] = useState("");

  // Reset the search each time the picker opens so the full list is visible.
  useEffect(() => {
    if (open) setLocalSearch("");
  }, [open]);

  useEffect(() => {
    if (localSearch.trim().length >= 1) {
      const q = localSearch.toLowerCase().trim();
      const results = teamMembers
        .filter((p) => {
          const name = `${p.name || ""} ${p.surname || ""}`.toLowerCase().trim();
          const email = (p.email || "").toLowerCase().trim();
          return name.includes(q) || email.includes(q);
        })
        .slice(0, 50)
        .map((p) => ({
          email: (p.email || "").toLowerCase().trim(),
          name: `${p.name || ""} ${p.surname || ""}`.trim(),
          _id: p._id,
        }));
      setSearchResults(results);
    } else {
      setSearchResults(teamMembers.slice(0, 50).map((p) => ({
        email: (p.email || "").toLowerCase().trim(),
        name: `${p.name || ""} ${p.surname || ""}`.trim(),
        _id: p._id,
      })));
    }
  }, [localSearch, teamMembers]);

  const handleToggle = (person) => {
    const newSelection = selectedPeople.some((p) => p.email === person.email)
      ? selectedPeople.filter((p) => p.email !== person.email)
      : [...selectedPeople, person];
    onSelectionChange(newSelection);
  };

  const isSelected = (person) => selectedPeople.some((p) => p.email === person.email);

  // Keep the request URL manageable when an admin selects a whole organization.
  const selectAllLimit = 200;
  const selectAllPeople = teamMembers.slice(0, selectAllLimit);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth sx={{ "& .MuiDialog-paper": { maxHeight: "90vh" } }}>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box>
          <Typography variant="h6">Select People</Typography>
          <Typography variant="caption" color="text.secondary">
            {isAdmin
              ? `${teamMembers.length} ${teamMembers.length === 1 ? "person" : "people"} in your organization`
              : `${teamMembers.length} ${teamMembers.length === 1 ? "person" : "people"} under you`}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" aria-label="close">
          <X />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ maxHeight: "60vh", overflow: "auto" }}>
        <Box sx={{ mb: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => onSelectionChange(selectAllPeople)}
            startIcon={<Check />}
          >
            Select All ({selectAllPeople.length}{teamMembers.length > selectAllLimit ? ` of ${teamMembers.length}` : ""})
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => onSelectionChange([])}
            startIcon={<X />}
          >
            Clear All
          </Button>
        </Box>
        
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            autoFocus
            placeholder="Search by name or email, e.g. Kenny Gloire"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search color="action" />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Divider />
        
        <List dense>
          {searchResults.map((person) => (
            <ListItem
              key={person.email}
              button
              onClick={() => handleToggle(person)}
              sx={{
                backgroundColor: isSelected(person) 
                  ? (isDarkMode ? "rgba(25, 118, 210, 0.12)" : "rgba(25, 118, 210, 0.08)") 
                  : "transparent",
                "&:hover": {
                  backgroundColor: isDarkMode 
                    ? "rgba(25, 118, 210, 0.08)" 
                    : "rgba(25, 118, 210, 0.04)",
                },
              }}
            >
              <ListItemIcon>
                <Checkbox
                  checked={isSelected(person)}
                  onClick={(e) => e.stopPropagation()}
                />
              </ListItemIcon>
              <ListItemText
                primary={person.name}
                secondary={person.email}
              />
            </ListItem>
          ))}
        </List>
        
        {searchResults.length === 0 && (
          <Box sx={{ p: 3, textAlign: "center", color: "text.secondary" }}>
            {teamMembers.length === 0
              ? "No people found under you. Check that your name is set as Leader @1/@12/@144/@1728 on the People page."
              : "No people match your search."}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {selectedPeople.length} of {teamMembers.length} selected
        </Typography>
        <Button onClick={onClose} variant="outlined">Done</Button>
      </DialogActions>
    </Dialog>
  );
}

// Advanced Filter Panel Modal
function FilterPanelModal({
  open,
  onClose,
  onApply,
  isDarkMode,
  canViewTeam,
  isAdmin,
  // pending values
  pendingViewFilter,
  setPendingViewFilter,
  pendingFilterType,
  setPendingFilterType,
  pendingStageFilter,
  setPendingStageFilter,
  pendingDateRange,
  setPendingDateRange,
  customDateRange,
  setCustomDateRange,
  selectedPeople,
  allPeople,
  onOpenPersonModal,
  onClearPeople,
  onRemovePerson,
  batchSize,
  setBatchSize,
  taskTypes,
}) {
  const isSmallScreen = useMediaQuery("(max-width:600px)");

  const typeOptions = [
    { value: "all", label: "All Types" },
    { value: "call", label: "Call" },
    { value: "visit", label: "Visit" },
    { value: "follow up", label: "Follow Up" },
    { value: "consolidation", label: "Consolidation" },
  ];

  const stageOptions = [
    { value: "all", label: "All Stages" },
    { value: "open", label: "Open" },
    { value: "completed", label: "Completed" },
    { value: "awaiting task", label: "Awaiting Task" },
    { value: "overdue", label: "Overdue" },
  ];

  const dateRangeOptions = [
    { value: "this_week", label: "This Week" },
    { value: "last_week", label: "Last Week" },
    { value: "this_month", label: "This Month" },
    { value: "previous_month", label: "Previous Month" },
    { value: "custom", label: "Custom Range" },
  ];

  const viewOptions = [
    { value: "personal", label: "Personal", description: "Only your own tasks" },
    ...(canViewTeam || isAdmin
      ? [{
          value: "disciples",
          label: "Disciples",
          description: isAdmin
            ? "Tasks for any person you select in your organization"
            : "Tasks for your disciples and hierarchy",
        }]
      : []),
    ...(isAdmin ? [{ value: "all", label: "All", description: "Every task in your organization" }] : []),
  ];

  const clearAllFilters = () => {
    setPendingViewFilter(isAdmin ? "all" : "personal");
    setPendingFilterType("all");
    setPendingStageFilter("all");
    setPendingDateRange("this_week");
    setCustomDateRange({ start: "", end: "" });
    onClearPeople();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isSmallScreen}
      PaperProps={{
        sx: {
          borderRadius: isSmallScreen ? 0 : "18px",
          background: isDarkMode ? "#1a1a1e" : "#fff",
          color: isDarkMode ? "#fff" : "#1a1a24",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontWeight: 700,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Filter size={20} />
          <span>Filter Tasks</span>
        </Box>
        <IconButton onClick={onClose} size="small" aria-label="close filters">
          <X size={20} />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 3, py: 3 }}>
        {/* View selector */}
        <Box>
          <Typography
            variant="overline"
            sx={{ fontWeight: 700, color: isDarkMode ? "#9ca3af" : "#6b7280", letterSpacing: "0.08em" }}
          >
            View
          </Typography>
          <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}>
            {viewOptions.map((option) => {
              const isActive = pendingViewFilter === option.value;
              return (
                <Button
                  key={option.value}
                  size="small"
                  variant={isActive ? "contained" : "outlined"}
                  onClick={() => {
                    setPendingViewFilter(option.value);
                    if (option.value === "personal") {
                      onClearPeople();
                    }
                  }}
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    borderRadius: "10px",
                    background: isActive
                      ? isDarkMode
                        ? "#fff"
                        : "#111"
                      : "transparent",
                    color: isActive
                      ? isDarkMode
                        ? "#111"
                        : "#fff"
                      : isDarkMode
                        ? "#e5e7eb"
                        : "#374151",
                    borderColor: isDarkMode ? "#4b5563" : "#d1d5db",
                    "&:hover": {
                      background: isActive
                        ? isDarkMode
                          ? "#f3f4f6"
                          : "#000"
                        : isDarkMode
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(17,17,17,0.06)",
                    },
                  }}
                >
                  {option.label}
                </Button>
              );
            })}
          </Box>
          <Typography variant="caption" sx={{ display: "block", mt: 1, color: isDarkMode ? "#9ca3af" : "#6b7280" }}>
            {viewOptions.find((o) => o.value === pendingViewFilter)?.description}
          </Typography>

          {/* Person filter — only for the disciples view, not personal/all */}
          {pendingViewFilter === "disciples" && (
            <Box
              sx={{
                mt: 2,
                p: 2,
                borderRadius: "12px",
                border: `1px solid ${isDarkMode ? "#374151" : "#e5e7eb"}`,
                background: isDarkMode ? "rgba(255,255,255,0.03)" : "#f9fafb",
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    People
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {allPeople.length === 0
                      ? "No people found"
                      : selectedPeople.length === 0
                        ? `All ${allPeople.length} people available`
                        : `${selectedPeople.length} of ${allPeople.length} selected`}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", gap: 1 }}>
                  {selectedPeople.length > 0 && (
                    <Button size="small" onClick={onClearPeople} sx={{ textTransform: "none" }}>
                      Clear
                    </Button>
                  )}
                  <Button
                    size="small"
                    variant="contained"
                    onClick={onOpenPersonModal}
                    startIcon={<Users size={16} />}
                    disabled={allPeople.length === 0}
                    sx={{
                      textTransform: "none",
                      fontWeight: 600,
                      borderRadius: "10px",
                      background: isDarkMode ? "#fff" : "#111",
                      color: isDarkMode ? "#111" : "#fff",
                      "&:hover": { background: isDarkMode ? "#f3f4f6" : "#000" },
                      "&.Mui-disabled": {
                        background: isDarkMode ? "#374151" : "#e5e7eb",
                        color: isDarkMode ? "#6b7280" : "#9ca3af",
                      },
                    }}
                  >
                    Choose People
                  </Button>
                </Box>
              </Box>

              {selectedPeople.length > 0 && (
                <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 1.5 }}>
                  {selectedPeople.slice(0, 8).map((person) => (
                    <Chip
                      key={person.email}
                      label={person.name || person.email}
                      size="small"
                      onDelete={() => onRemovePerson && onRemovePerson(person)}
                      sx={{ maxWidth: 180 }}
                    />
                  ))}
                  {selectedPeople.length > 8 && (
                    <Chip label={`+${selectedPeople.length - 8} more`} size="small" />
                  )}
                </Box>
              )}
            </Box>
          )}
        </Box>

        <Divider />

        {/* Time Period */}
        <Box>
          <Typography
            variant="overline"
            sx={{ fontWeight: 700, color: isDarkMode ? "#9ca3af" : "#6b7280", letterSpacing: "0.08em" }}
          >
            Time Period
          </Typography>
          <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}>
            {dateRangeOptions.map((option) => {
              const isActive = pendingDateRange === option.value;
              return (
                <Button
                  key={option.value}
                  size="small"
                  variant={isActive ? "contained" : "outlined"}
                  onClick={() => setPendingDateRange(option.value)}
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    borderRadius: "10px",
                    background: isActive
                      ? isDarkMode
                        ? "#fff"
                        : "#111"
                      : "transparent",
                    color: isActive
                      ? isDarkMode
                        ? "#111"
                        : "#fff"
                      : isDarkMode
                        ? "#e5e7eb"
                        : "#374151",
                    borderColor: isDarkMode ? "#4b5563" : "#d1d5db",
                    "&:hover": {
                      background: isActive
                        ? isDarkMode
                          ? "#f3f4f6"
                          : "#000"
                        : isDarkMode
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(17,17,17,0.06)",
                    },
                  }}
                >
                  {option.label}
                </Button>
              );
            })}
          </Box>
          
          {/* Custom date range inputs */}
          {pendingDateRange === "custom" && (
            <Box sx={{ display: "flex", gap: 2, mt: 2, flexWrap: "wrap" }}>
              <TextField
                type="date"
                label="Start Date"
                size="small"
                value={customDateRange.start}
                onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })}
                sx={{ minWidth: 200 }}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                type="date"
                label="End Date"
                size="small"
                value={customDateRange.end}
                onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
                sx={{ minWidth: 200 }}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          )}
        </Box>

        <Divider />

        {/* Task Stage Filter */}
        <Box>
          <Typography
            variant="overline"
            sx={{ fontWeight: 700, color: isDarkMode ? "#9ca3af" : "#6b7280", letterSpacing: "0.08em" }}
          >
            Task Stage
          </Typography>
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <Select
              value={pendingStageFilter}
              onChange={(e) => setPendingStageFilter(e.target.value)}
              sx={{ borderRadius: "10px" }}
            >
              {stageOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Divider />

        {/* Task Type */}
        <Box>
          <Typography
            variant="overline"
            sx={{ fontWeight: 700, color: isDarkMode ? "#9ca3af" : "#6b7280", letterSpacing: "0.08em" }}
          >
            Task Type
          </Typography>
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <Select
              value={pendingFilterType}
              onChange={(e) => setPendingFilterType(e.target.value)}
              sx={{ borderRadius: "10px" }}
            >
              {typeOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
              {/* Include any custom task types loaded from backend */}
              {taskTypes
                .map((t) => (t.name || "").toLowerCase().trim())
                .filter(
                  (name) =>
                    name &&
                    !typeOptions.some((o) => o.value === name) &&
                    !["service follow up", "new_person", "new person"].includes(name),
                )
                .map((name) => (
                  <MenuItem key={name} value={name}>
                    {name.charAt(0).toUpperCase() + name.slice(1)}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </Box>

        <Divider />

        {/* Batch size */}
        <Box>
          <Typography
            variant="overline"
            sx={{ fontWeight: 700, color: isDarkMode ? "#9ca3af" : "#6b7280", letterSpacing: "0.08em" }}
          >
            Tasks Per Fetch
          </Typography>
          <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}>
            {[25, 50, 100, 200, 500].map((size) => {
              const isActive = batchSize === size;
              return (
                <Button
                  key={size}
                  size="small"
                  variant={isActive ? "contained" : "outlined"}
                  onClick={() => setBatchSize(size)}
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    borderRadius: "10px",
                    minWidth: 64,
                    background: isActive ? (isDarkMode ? "#fff" : "#111") : "transparent",
                    color: isActive ? (isDarkMode ? "#111" : "#fff") : isDarkMode ? "#e5e7eb" : "#374151",
                    borderColor: isDarkMode ? "#4b5563" : "#d1d5db",
                    "&:hover": {
                      background: isActive
                        ? isDarkMode
                          ? "#f3f4f6"
                          : "#000"
                        : isDarkMode
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(17,17,17,0.06)",
                    },
                  }}
                >
                  {size}
                </Button>
              );
            })}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button
          onClick={clearAllFilters}
          sx={{ textTransform: "none", fontWeight: 600, color: isDarkMode ? "#9ca3af" : "#6b7280" }}
        >
          Reset
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose} sx={{ textTransform: "none", fontWeight: 600 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={onApply}
          startIcon={<Check size={16} />}
          sx={{
            textTransform: "none",
            fontWeight: 700,
            borderRadius: "10px",
            background: isDarkMode ? "#fff" : "#111",
            color: isDarkMode ? "#111" : "#fff",
            "&:hover": { background: isDarkMode ? "#f3f4f6" : "#000" },
          }}
        >
          Apply Filters
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function DailyTasks() {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";
  // Use sidebar background color for main content
  const sidebarBg = isDarkMode ? "#1e1e1e" : "#ffffff";
  const sidebarBorder = isDarkMode ? "#374151" : "#e5e7eb";
  const colors = isDarkMode ? COLORS.dark : COLORS.light;

  const { user, authFetch } = useContext(AuthContext);
  const { updateCount } = useTaskUpdate();

  const userOrgKey = (user?.org_id || user?.Organization || user?.organization || "")
    .toString()
    .toLowerCase()
    .trim();

  const loadInitialPeople = () => {
    const cachedOrg = window.dailyTasksPeopleCacheOrg || "";
    if (cachedOrg && userOrgKey && cachedOrg !== userOrgKey) {
      window.dailyTasksPeopleCache = null;
      window.dailyTasksPeopleCacheTimestamp = 0;
      window.dailyTasksPeopleCacheOrg = "";
    }
    return getCachedPeople();
  };

  const [tasks, setTasks] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);
  const [allPeople, setAllPeople] = useState(loadInitialPeople);
  const [isLoadingPeople, setIsLoadingPeople] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState("call");
  const [editingTask, setEditingTask] = useState(null);
  const [isAddTypeModalOpen, setIsAddTypeModalOpen] = useState(false);
  const [newTaskTypeName, setNewTaskTypeName] = useState("");
  const [addingTaskType, setAddingTaskType] = useState(false);

  // Advanced filter state
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [pendingViewFilter, setPendingViewFilter] = useState("personal"); // personal, disciples, all
  const [pendingFilterType, setPendingFilterType] = useState("all");
  const [pendingStageFilter, setPendingStageFilter] = useState("all");
  const [pendingDateRange, setPendingDateRange] = useState("this_week");
  const [customDateRange, setCustomDateRange] = useState({ start: "", end: "" });
  const [selectedPeople, setSelectedPeople] = useState([]);
  const [teamPeopleObjects, setTeamPeopleObjects] = useState([]);
  const [batchSize, setBatchSize] = useState(50);
  const [canViewTeam, setCanViewTeam] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Quick filter pills state (synced with pendingStageFilter)
  const [filter, setFilter] = useState("all");

  // Pagination state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalTasks, setTotalTasks] = useState(0);

  // Person filter modal state
  const [personFilterOpen, setPersonFilterOpen] = useState(false);

  const API_URL = `${import.meta.env.VITE_BACKEND_URL}`;

  // ─── People cache loading ───────────────────────────────────────────────────
  const isFetchingPeopleRef = useRef(false);
  const peopleFetchPromiseRef = useRef(null);
  const peoplePollRef = useRef(null);

  const applyPeople = useCallback((rawPeople, { isPartial = false } = {}) => {
    const mapped = (Array.isArray(rawPeople) ? rawPeople : []).map(normalizePerson);
    if (mapped.length > 0) {
      window.dailyTasksPeopleCache = mapped;
      window.dailyTasksPeopleCacheTimestamp = Date.now();
      window.dailyTasksPeopleCacheOrg = userOrgKey;
      if (isPartial) {
        window.dailyTasksPeopleCachePartial = true;
      } else {
        delete window.dailyTasksPeopleCachePartial;
      }
      setAllPeople(mapped);
    }
    return mapped;
  }, [userOrgKey]);

  // Fast single-query fallback so recipient/assignee search is usable right
  // away while the full people cache is still loading in the background.
  const fetchMinimalPeopleFallback = useCallback(async () => {
    try {
      const fallbackRes = await authFetch(`${API_URL}/people/all-minimal`);
      if (fallbackRes?.ok) {
        const fallbackData = await fallbackRes.json();
        const mapped = applyPeople(fallbackData?.people || [], { isPartial: true });
        if (mapped.length > 0) setIsLoadingPeople(false);
        return mapped.length;
      }
    } catch (fallbackErr) {
      console.error("People fallback failed:", fallbackErr.message);
    }
    return 0;
  }, [API_URL, authFetch, applyPeople]);

  const pollPeopleCache = useCallback(() => {
    if (peoplePollRef.current) clearInterval(peoplePollRef.current);
    let attempts = 0;
    const MAX_ATTEMPTS = 90; // 3 minutes at 2s intervals
    let pollInFlight = false;

    peoplePollRef.current = setInterval(async () => {
      attempts += 1;
      if (pollInFlight) return;
      pollInFlight = true;
      try {
        const res = await authFetch(`${API_URL}/cache/people`);
        pollInFlight = false;
        if (res?.ok) {
          const data = await res.json();
          const mapped = applyPeople(data?.cached_data || data?.people || []);

          if (data?.is_complete !== false) {
            clearInterval(peoplePollRef.current);
            peoplePollRef.current = null;
            setIsLoadingPeople(false);

            // Last-resort fallback so recipient search still has data.
            if (mapped.length === 0) {
              await fetchMinimalPeopleFallback();
            }
            return;
          }

          // Dropdowns are empty — serve the fast fallback while the heavy
          // cache load finishes in the background.
          if (mapped.length === 0 && attempts <= 2) {
            fetchMinimalPeopleFallback();
          }
          return;
        }
      } catch (err) {
        pollInFlight = false;
        console.error("People cache poll failed:", err.message);
      }

      if (attempts >= MAX_ATTEMPTS) {
        clearInterval(peoplePollRef.current);
        peoplePollRef.current = null;
        setIsLoadingPeople(false);
        await fetchMinimalPeopleFallback();
      }
    }, 2000);
  }, [API_URL, authFetch, applyPeople, fetchMinimalPeopleFallback]);

  const fetchAllPeople = useCallback(async (forceRefresh = false) => {
    const cachedOrg = window.dailyTasksPeopleCacheOrg || "";
    if (cachedOrg && userOrgKey && cachedOrg !== userOrgKey) {
      window.dailyTasksPeopleCache = null;
      window.dailyTasksPeopleCacheTimestamp = 0;
      window.dailyTasksPeopleCacheOrg = "";
    }

    const cached = getCachedPeople();
    const cacheTimestamp = getPeopleCacheTimestamp();
    const cacheIsFresh =
      cached.length > 0 &&
      !isPeopleCachePartial() &&
      cacheTimestamp &&
      Date.now() - cacheTimestamp < CACHE_DURATION;

    if (!forceRefresh && cacheIsFresh) {
      setAllPeople(cached);
      return cached;
    }

    if (isFetchingPeopleRef.current && peopleFetchPromiseRef.current) {
      return peopleFetchPromiseRef.current;
    }
    if (isFetchingPeopleRef.current) return cached;

    isFetchingPeopleRef.current = true;
    setIsLoadingPeople(true);

    peopleFetchPromiseRef.current = (async () => {
      try {
        const res = await authFetch(`${API_URL}/cache/people`);
        if (!res?.ok) throw new Error("Failed to fetch people cache");
        const data = await res.json();
        const mapped = applyPeople(data?.cached_data || data?.people || []);

        if (mapped.length > 0 && data?.is_complete !== false) {
          setIsLoadingPeople(false);
          return mapped;
        }

        // While the cache loads (partial or empty), kick off the quick
        // minimal-people fetch so searches work immediately, then keep
        // polling until the full cache lands.
        if (mapped.length === 0) {
          fetchMinimalPeopleFallback();
        }
        pollPeopleCache();
        return mapped;
      } catch (err) {
        console.error("Fetch people error:", err.message);
        setIsLoadingPeople(false);
        // Serve whatever we have and get the minimal fallback loading.
        await fetchMinimalPeopleFallback();
        return getCachedPeople();
      } finally {
        isFetchingPeopleRef.current = false;
        peopleFetchPromiseRef.current = null;
      }
    })();

    return peopleFetchPromiseRef.current;
  }, [API_URL, authFetch, applyPeople, pollPeopleCache, fetchMinimalPeopleFallback, userOrgKey]);

  useEffect(() => {
    if (!user) return;
    fetchAllPeople(false).catch(() => {});
  }, [user, fetchAllPeople]);

  useEffect(() => {
    return () => {
      if (peoplePollRef.current) clearInterval(peoplePollRef.current);
    };
  }, []);

  // ─── Resolve team hierarchy from the loaded People cache ───────────────────
  useEffect(() => {
    const userName = `${user?.name || ""} ${user?.surname || ""}`.trim().toLowerCase();
    const userEmail = (user?.email || "").trim().toLowerCase();
    if (!userName && !userEmail) return;

    const team = allPeople.filter((person) => {
      const leaderFields = [
        person.leader1,
        person.leader12,
        person.leader144,
        person.leader1728,
      ].map((leader) => (leader || "").toLowerCase().trim());

      return leaderFields.includes(userName) || leaderFields.includes(userEmail);
    });

    setTeamPeopleObjects(team);
    setCanViewTeam(team.length > 0);
  }, [allPeople, user]);

  useEffect(() => {
    const role = (user?.role || "").toLowerCase();
    setIsAdmin(["admin", "super_admin"].includes(role));
  }, [user]);

  const currentUserFullName = `${user?.name || ""} ${user?.surname || ""}`.trim();

  const currentUserPerson = useMemo(() => {
    const person = normalizePerson({
      _id: user?.id || user?.email || "",
      Name: user?.name || "",
      Surname: user?.surname || "",
      Email: user?.email || "",
      Number: user?.phone || user?.number || "",
    });
    if (!person.fullName) {
      person.fullName = "Me";
      person.fullNameLower = "me";
    }
    return person;
  }, [user]);

  const recipientPeople = useMemo(() => {
    if (isAdmin) return allPeople;
    if (canViewTeam) return teamPeopleObjects;
    return allPeople;
  }, [isAdmin, canViewTeam, allPeople, teamPeopleObjects]);

  const assigneePeople = useMemo(() => {
    const base = isAdmin ? allPeople : canViewTeam ? teamPeopleObjects : [];
    const hasSelf = base.some(
      (person) => person.email && person.email === currentUserPerson.email,
    );
    return hasSelf ? base : [currentUserPerson, ...base];
  }, [isAdmin, canViewTeam, allPeople, teamPeopleObjects, currentUserPerson]);

  // People an admin/leader may pick in the Disciples filter.
  const selectablePeople = useMemo(
    () => (isAdmin ? allPeople : teamPeopleObjects),
    [isAdmin, allPeople, teamPeopleObjects],
  );

  // ─── Dynamic filter counts from actual tasks ──────────────────────────────
  const filterCounts = useMemo(() => {
    const counts = tasks.reduce(
      (acc, t) => {
        const stage = getTaskStageKey(t);
        acc.all++;
        if (stage === "completed") acc.completed++;
        else if (stage === "open") acc.open++;
        else if (stage === "awaiting task") acc["awaiting task"]++;
        else if (stage === "overdue") acc.overdue++;
        return acc;
      },
      { all: 0, completed: 0, open: 0, "awaiting task": 0, overdue: 0 },
    );
    return counts;
  }, [tasks]);

  const FILTERS = useMemo(
    () => [
      { key: "all", label: `All (${filterCounts.all})` },
      { key: "open", label: `Open (${filterCounts.open})` },
      { key: "completed", label: `Completed (${filterCounts.completed})` },
      { key: "awaiting task", label: `Awaiting Task (${filterCounts["awaiting task"]})` },
      { key: "overdue", label: `Overdue (${filterCounts.overdue})` },
    ],
    [filterCounts],
  );

  const getTodayDateInput = () => toDateOnly(new Date());

  const getCurrentTimeInput = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  };

  const toLocalDateInput = (value) => {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return getTodayDateInput();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  const toLocalTimeInput = (value) => {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return getCurrentTimeInput();
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  };

  const normalizeStage = (status) => {
    const normalized = String(status || "Open").toLowerCase().trim();
    if (normalized === "completed" || normalized === "done") return "Completed";
    if (normalized === "awaiting task" || normalized === "awaiting") return "Awaiting Task";
    return "Open";
  };

  const formatTaskDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const [taskData, setTaskData] = useState({
    taskType: "",
    recipient: null, // selected recipient person
    recipientDisplay: "",
    contactedPersonName: "",
    contactedPersonEmail: "",
    contactedPersonPhone: "",
    assignedTo: currentUserFullName || "Me", // defaults to current user
    assignedEmail: user?.email || "",
    dueDate: getTodayDateInput(), // fixed / read-only
    dueTime: getCurrentTimeInput(),
    taskStage: "Open",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchTaskTypes = useCallback(async () => {
    if (!user?.email) return;
    try {
      const res = await authFetch(`${API_URL}/tasktypes`);
      if (!res.ok) throw new Error("Failed to fetch task types");
      const data = await res.json();
      const types = Array.isArray(data) ? data : data.taskTypes || [];
      setTaskTypes(types);
    } catch (err) {
      console.error("Error fetching task types:", err.message);
    }
  }, [user, authFetch, API_URL]);

  const getInitialTaskData = () => ({
    taskType: "",
    recipient: null,
    recipientDisplay: "",
    contactedPersonName: "",
    contactedPersonEmail: "",
    contactedPersonPhone: "",
    assignedTo: currentUserFullName || "Me",
    assignedEmail: user?.email || "",
    dueDate: getTodayDateInput(),
    dueTime: getCurrentTimeInput(),
    taskStage: "Open",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTaskData((prev) => ({ ...prev, [name]: value }));
  };

  const handleOpen = (type) => {
    const nextType = type === "visit" ? "visit" : "call";
    setModalType(nextType);
    setEditingTask(null);

    const initialData = getInitialTaskData();
    const defaultTypeName = nextType === "call" ? "Awaiting Call" : "Service Invitation";
    const matchingType = taskTypes.find(
      (taskType) =>
        (taskType?.name || taskType || "").toLowerCase().trim() ===
        defaultTypeName.toLowerCase(),
    );
    initialData.taskType = matchingType?.name || defaultTypeName;

    setTaskData(initialData);
    setSubmitting(false);
    setIsModalOpen(true);

    if (allPeople.length === 0) {
      fetchAllPeople(false).catch(() => {});
    }
  };

  const handleEdit = (task) => {
    if (isTaskCompleted(task)) {
      toast.info("This task is completed and cannot be edited.");
      return;
    }

    const recipientName = (
      task.contacted_person?.name ||
      task.person_name ||
      ""
    ).trim();
    const nameParts = recipientName.split(/\s+/).filter(Boolean);
    const recipientPerson = normalizePerson({
      Name: nameParts[0] || "",
      Surname: nameParts.slice(1).join(" "),
      Email: task.contacted_person?.email || "",
      Number: task.contacted_person?.phone || "",
    });

    const matchedType = taskTypes.find(
      (taskType) =>
        (taskType?.name || "").toLowerCase().trim() ===
          (task.taskType || "").toLowerCase().trim() ||
        String(taskType?._id || taskType?.id || "") === String(task.taskType || ""),
    );

    const currentStatus = normalizeStage(task.taskStage || task.status);
    const assigneeEmail = task.assigned_to_email || task.assignedfor || user?.email || "";
    const matchedAssignee = allPeople.find(
      (person) => person.email && person.email === assigneeEmail.toLowerCase(),
    );

    // `task.type` holds the task-type label after normalization, so rely on
    // the preserved kind or infer a visit from the task type.
    const taskKindLabel = `${task.taskKind || ""} ${task.taskType || ""}`.toLowerCase();
    const isVisitTask =
      task.taskKind === "visit" ||
      taskKindLabel.includes("visit") ||
      taskKindLabel.includes("service invitation");

    setEditingTask(task);
    setModalType(isVisitTask ? "visit" : "call");
    setTaskData({
      taskType: matchedType?.name || task.taskType || "",
      recipient: recipientPerson.fullName ? recipientPerson : null,
      recipientDisplay: recipientPerson.fullName,
      contactedPersonName: recipientPerson.fullName,
      contactedPersonEmail: recipientPerson.email,
      contactedPersonPhone: recipientPerson.phone,
      assignedTo:
        matchedAssignee?.fullName ||
        (task.name && task.name !== "Unknown" ? task.name : "") ||
        currentUserFullName ||
        "Me",
      assignedEmail: assigneeEmail,
      dueDate: toLocalDateInput(task.followup_date || task.date),
      dueTime: toLocalTimeInput(task.followup_date || task.date),
      taskStage: currentStatus,
    });
    setSubmitting(false);
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setIsAddTypeModalOpen(false);
    setEditingTask(null);
  };

  const createTaskType = async () => {
    if (!newTaskTypeName.trim() || addingTaskType) return;
    setAddingTaskType(true);
    try {
      const res = await authFetch(`${API_URL}/tasktypes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTaskTypeName.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Failed to create task type");

      const created = data.taskType || data;
      if (created?.name) {
        setTaskTypes((prev) => [...prev, created]);
      }
      toast.success("Task type created successfully");
      setIsAddTypeModalOpen(false);
      setNewTaskTypeName("");
    } catch (err) {
      toast.error(err.message || "Failed to create task type");
    } finally {
      setAddingTaskType(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const person = taskData.recipient;
    if (!person?.fullName) {
      toast.error("Please select a recipient from the list.");
      return;
    }

    const assigneeName = (taskData.assignedTo || "").trim();
    if (!assigneeName) {
      toast.error("Please select who the task is assigned to.");
      return;
    }

    setSubmitting(true);
    try {
      let assigneeEmail = (taskData.assignedEmail || "").trim().toLowerCase();
      let resolvedAssigneeName = assigneeName;

      // If the user typed a name without picking a suggestion, resolve it.
      if (!assigneeEmail) {
        const normalizedAssigneeName = assigneeName.toLowerCase().trim();
        const match = assigneePeople.find(
          (candidate) =>
            candidate.fullNameLower === normalizedAssigneeName ||
            candidate.email === normalizedAssigneeName,
        );
        if (match) {
          assigneeEmail = match.email;
          resolvedAssigneeName = match.fullName;
        } else if (
          normalizedAssigneeName !==
          (currentUserFullName || "Me").toLowerCase().trim()
        ) {
          throw new Error("Please select an assignee from the list.");
        }
      }
      if (!assigneeEmail) {
        assigneeEmail = (user?.email || "").trim().toLowerCase();
        resolvedAssigneeName = currentUserFullName || "Me";
      }

      // Due date is fixed; combine it with the editable time.
      const dueDatePart = taskData.dueDate || getTodayDateInput();
      const dueTimePart = taskData.dueTime || getCurrentTimeInput();
      const localDue = new Date(`${dueDatePart}T${dueTimePart}:00`);
      const followupDate = Number.isNaN(localDue.getTime())
        ? new Date().toISOString()
        : localDue.toISOString();

      const payload = {
        memberID: user?.id || user?.email || "",
        name: resolvedAssigneeName,
        taskType: taskData.taskType,
        type: modalType,
        followup_date: followupDate,
        status: taskData.taskStage || "Open",
        assignedfor: assigneeEmail,
        assigned_to_email: assigneeEmail,
        created_by_email: user?.email || "",
        created_by_name: currentUserFullName,
        contacted_person: {
          name: person.fullName,
          email: person.email || "",
          phone: person.phone || "",
        },
        description: taskData.description || "",
        priority: taskData.priority || "",
      };

      const res = await authFetch(
        editingTask
          ? `${API_URL}/tasks/${editingTask._id || editingTask.id}`
          : `${API_URL}/tasks`,
        {
          method: editingTask ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || data.message || "Failed to save task");
      }

      toast.success(
        editingTask
          ? "Task updated successfully"
          : `Task captured for ${person.fullName}`,
      );
      handleClose();
      setPage(1);
      await fetchUserTasks(1, false);
    } catch (err) {
      toast.error(err.message || "Failed to save task");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Helper: Calculate date range for filter panel presets ────────────────────
  const getFilterDateRangeParams = useCallback((range, customRange) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (range) {
      case "this_week": {
        // Start from Monday
        const day = today.getDay();
        const diff = day === 0 ? -6 : 1 - day; // Monday = 1
        const start = new Date(today);
        start.setDate(today.getDate() + diff);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return { start_date: toDateOnly(start), end_date: toDateOnly(end) };
      }
      case "last_week": {
        const day = today.getDay();
        const diff = day === 0 ? -6 : 1 - day; // Monday = 1
        const thisWeekStart = new Date(today);
        thisWeekStart.setDate(today.getDate() + diff);
        const lastWeekStart = new Date(thisWeekStart);
        lastWeekStart.setDate(thisWeekStart.getDate() - 7);
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
        lastWeekEnd.setHours(23, 59, 59, 999);
        return { start_date: toDateOnly(lastWeekStart), end_date: toDateOnly(lastWeekEnd) };
      }
      case "this_month": {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        return { start_date: toDateOnly(start), end_date: toDateOnly(end) };
      }
      case "previous_month": {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        end.setHours(23, 59, 59, 999);
        return { start_date: toDateOnly(start), end_date: toDateOnly(end) };
      }
      case "custom": {
        if (customRange.start && customRange.end) {
          return { start_date: customRange.start, end_date: customRange.end };
        }
        return { all_dates: true };
      }
      default:
        return { all_dates: true };
    }
  }, []);

  // ─── Fetch user tasks with filters ───────────────────────────────────
  const fetchUserTasks = useCallback(async (pageNum = 1, append = false) => {
    if (!user?.email) return;
    setLoading(true);
    try {
      const dateParams = getFilterDateRangeParams(pendingDateRange, customDateRange);
      const params = new URLSearchParams({
        email: user.email,
        page: pageNum.toString(),
        limit: batchSize.toString(),
      });
      
      // Date range filters
      if (dateParams.start_date) params.append("start_date", dateParams.start_date);
      if (dateParams.end_date) params.append("end_date", dateParams.end_date);
      if (dateParams.all_dates) params.append("all_dates", "true");
      
      // Task Stage filter (from advanced modal)
      if (pendingStageFilter !== "all") {
        params.append("task_stage", pendingStageFilter);
      }
      
      // Task type filter (from advanced modal)
      if (pendingFilterType !== "all") {
        params.append("task_type", pendingFilterType);
      }
      
      // View filter (personal/disciples/all)
      if (pendingViewFilter === "all") {
        params.append("view_all", "true");
      } else if (pendingViewFilter === "disciples" && selectedPeople.length > 0) {
        // Send selected people emails as one comma-separated value so the
        // backend receives every selected person (repeated params only keep one).
        const discipleEmails = [
          ...new Set(selectedPeople.map((person) => person.email).filter(Boolean)),
        ];
        if (discipleEmails.length > 0) {
          params.set("email", discipleEmails.join(","));
        }
      }
      // For "personal" view, only the user's email is sent (already in params)
      
      const res = await authFetch(`${API_URL}/tasks?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const data = await res.json();
      const fetchedTasks = Array.isArray(data) ? data : data.tasks || [];
      
      // Normalize tasks
      const normalized = fetchedTasks.map((task) => ({
        ...task,
        taskKind: task.type === "visit" ? "visit" : "call",
        name: task.name || task.taskName || "Unknown",
        person: task.contacted_person?.name || task.person_name || "Unknown",
        type: task.taskType || task.type || "Unknown",
        taskStage: (task.taskStage || task.status || "open"),
        date: task.followup_date || task.date || task.created_at || new Date().toISOString(),
      }));
      
      if (append) {
        setTasks((prev) => [...prev, ...normalized]);
      } else {
        setTasks(normalized);
      }
      
      setHasMore(data.has_more || false);
      setTotalTasks(data.total || data.total_tasks || normalized.length);
      setPage(pageNum);
    } catch (err) {
      console.error("Error fetching tasks:", err.message);
      // Don't update state on error to avoid infinite retry loops
    } finally {
      setLoading(false);
    }
  }, [user, authFetch, API_URL, pendingDateRange, customDateRange, pendingStageFilter, pendingFilterType, pendingViewFilter, selectedPeople, batchSize, getFilterDateRangeParams]);

  // Load tasks on mount and when filters change
  useEffect(() => {
    if (user) {
      setPage(1);
      fetchUserTasks(1, false);
      fetchTaskTypes();
    }
  }, [user, fetchUserTasks, fetchTaskTypes]);

  useEffect(() => {
    if (updateCount > 0) {
      setPage(1);
      fetchUserTasks(1, false);
    }
  }, [updateCount, fetchUserTasks]);

  // Filter tasks based on stage filter (overdue is derived from the due date)
  const visibleTasks = tasks.filter(
    (t) => filter === "all" || getTaskStageKey(t) === filter,
  );
  const totalCount = tasks.length;
  // Design stat card: completed + awaiting tasks in the current view.
  const completedTaskCount = visibleTasks.filter((t) =>
    ["completed", "awaiting task"].includes(getTaskStageKey(t)),
  ).length;

  // ─── Main Render ────────────────────────────────────────────────────
  return (
    <div
      style={{
        height: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        backgroundColor: sidebarBg,
      }}
    >
      {/* Main column */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Top bar */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "32px 40px 16px 40px",
            backgroundColor: sidebarBg,
            borderBottom: `1px solid ${sidebarBorder}`,
          }}
        >
          <h1 style={{ fontSize: "20px", fontWeight: "600", letterSpacing: "-0.02em", color: colors.foreground }}>
            Daily Tasks Overview
          </h1>
        </header>

        <main style={{ flex: 1, padding: "0 40px 64px 40px" }}>
          {/* Heading + action buttons */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "24px" }}>
            <h2 style={{ fontSize: "36px", fontWeight: "700", letterSpacing: "-0.02em", color: colors.foreground }}>
              Daily Tasks
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button
                onClick={() => handleOpen("call")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  borderRadius: "10px",
                  backgroundColor: colors.primary,
                  color: colors.primaryForeground,
                  fontWeight: "500",
                  padding: "12px 20px",
                  fontSize: "14px",
                  border: `1px solid ${colors.primaryBorder}`,
                  cursor: "pointer",
                }}
              >
                <Phone size={16} />
                Call Task
              </button>
              <button
                onClick={() => handleOpen("visit")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  borderRadius: "10px",
                  backgroundColor: colors.card,
                  color: colors.foreground,
                  fontWeight: "500",
                  padding: "12px 20px",
                  fontSize: "14px",
                  border: `1px solid ${colors.border}`,
                  cursor: "pointer",
                }}
              >
                <MapPin size={16} />
                Visit Task
              </button>
              <button
                onClick={() => {
                  setIsAddTypeModalOpen(true);
                  setNewTaskTypeName("");
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  borderRadius: "10px",
                  border: `1px solid ${colors.tealBorder}`,
                  backgroundColor: "transparent",
                  color: colors.teal,
                  fontWeight: "500",
                  padding: "12px 20px",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                <Plus size={16} />
                New Task Type
              </button>
            </div>
          </div>

          {/* Filter Panel Button */}
          <button
            onClick={() => setFilterPanelOpen(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              borderRadius: "10px",
              backgroundColor: colors.card,
              color: colors.foreground,
              fontWeight: "500",
              padding: "12px 20px",
              fontSize: "14px",
              border: `1px solid ${colors.border}`,
              cursor: "pointer",
            }}
          >
            <Filter size={16} />
            Filters
          </button>

          {/* Stat card + filter pills + right controls */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "16px", marginTop: "32px" }}>
            <div
              style={{
                borderRadius: "14px",
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.card,
                padding: "24px 32px",
              }}
            >
              <div style={{ fontSize: "48px", fontWeight: "700", lineHeight: "1", color: colors.foreground }}>
                {completedTaskCount}
              </div>
              <div style={{ marginTop: "8px", fontSize: "11px", fontWeight: "500", letterSpacing: "0.18em", textTransform: "uppercase", color: colors.mutedForeground }}>
                TASKS COMPLETE
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => {
                    setFilter(f.key);
                    setPendingStageFilter(f.key); // sync with advanced filter modal
                    setPage(1);
                    fetchUserTasks(1, false);
                  }}
                  style={{
                    borderRadius: "10px",
                    padding: "10px 16px",
                    fontSize: "13px",
                    fontWeight: "500",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    backgroundColor: filter === f.key ? colors.primary : colors.card,
                    color: filter === f.key ? colors.primaryForeground : colors.foreground,
                    border: filter === f.key ? "none" : `1px solid ${colors.border}`,
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "12px" }}>
              <button
                style={{
                  borderRadius: "10px",
                  backgroundColor: colors.foreground,
                  color: colors.background,
                  fontWeight: "600",
                  padding: "10px 16px",
                  fontSize: "13px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Download Filtered Tasks
              </button>
            </div>
          </div>

          {/* Task rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "40px" }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: "40px", color: colors.mutedForeground }}>
                <Spinner size={32} color={colors.primary} />
                <div style={{ marginTop: "16px" }}>Loading tasks...</div>
              </div>
            ) : visibleTasks.length === 0 ? (
              <div
                style={{
                  borderRadius: "14px",
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.card,
                  padding: "40px",
                  textAlign: "center",
                  fontSize: "14px",
                  color: colors.mutedForeground,
                }}
              >
                No tasks in this view.
              </div>
            ) : (
              visibleTasks.map((task) => (
                <div
                  key={task._id || task.id || `${task.name}-${task.date}`}
                  onClick={() => handleEdit(task)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "20px",
                    borderRadius: "14px",
                    border: `1px solid ${colors.border}`,
                    backgroundColor: colors.card,
                    padding: "24px",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      flexShrink: 0,
                      borderRadius: "50%",
                      backgroundColor: colors.border,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "18px",
                      fontWeight: "600",
                      color: colors.mutedForeground,
                    }}
                  >
                    {(task.person || task.name || "?").charAt(0)}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: "18px", fontWeight: "600", color: colors.foreground }}>
                      {task.person || "No recipient"}
                    </div>
                    <div style={{ marginTop: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: "14px", color: colors.mutedForeground }}>
                      {task.name} <span style={{ margin: "0 8px" }}>•</span> {task.type}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexShrink: 0, alignItems: "center", gap: "32px", marginLeft: "auto" }}>
                    <StatusBadge status={getTaskStageKey(task)} colors={colors} />
                    <span style={{ fontSize: "13px", color: colors.mutedForeground }}>
                      {formatTaskDate(task.date)}
                    </span>
                  </div>
                </div>
              ))
            )}
            {/* Load More */}
            {hasMore && !loading && (
              <button
                onClick={() => fetchUserTasks(page + 1, true)}
                style={{
                  marginTop: "24px",
                  padding: "12px 24px",
                  borderRadius: "10px",
                  backgroundColor: colors.primary,
                  color: colors.primaryForeground,
                  fontWeight: "600",
                  fontSize: "14px",
                  border: "none",
                  cursor: "pointer",
                  alignSelf: "center",
                }}
              >
                Load More ({totalCount} of {totalTasks})
              </button>
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      {isModalOpen && (
        <CallTaskModal
          isOpen={isModalOpen}
          onClose={handleClose}
          taskData={taskData}
          handleChange={handleChange}
          taskTypes={taskTypes}
          handleSubmit={handleSubmit}
          submitting={submitting}
          recipientPeople={recipientPeople}
          assigneePeople={assigneePeople}
          isLoadingPeople={isLoadingPeople}
          modalType={modalType}
        />
      )}

      {isAddTypeModalOpen && (
        <NewTaskTypeModal
          isOpen={isAddTypeModalOpen}
          onClose={() => {
            setIsAddTypeModalOpen(false);
            setNewTaskTypeName("");
          }}
          newTaskTypeName={newTaskTypeName}
          setNewTaskTypeName={setNewTaskTypeName}
          createTaskType={createTaskType}
          addingTaskType={addingTaskType}
        />
      )}

      {/* Person Filter Modal */}
      <PersonFilterModal
        open={personFilterOpen}
        onClose={() => setPersonFilterOpen(false)}
        teamMembers={selectablePeople}
        selectedPeople={selectedPeople}
        onSelectionChange={setSelectedPeople}
        isDarkMode={isDarkMode}
        isAdmin={isAdmin}
      />

      {/* Advanced Filter Panel Modal */}
      <FilterPanelModal
        open={filterPanelOpen}
        onClose={() => setFilterPanelOpen(false)}
        onApply={() => {
          setFilterPanelOpen(false);
          // Keep the quick stage pills in sync with the advanced stage filter.
          setFilter(pendingStageFilter);
          setPage(1);
          fetchUserTasks(1, false);
        }}
        isDarkMode={isDarkMode}
        canViewTeam={canViewTeam}
        isAdmin={isAdmin}
        pendingViewFilter={pendingViewFilter}
        setPendingViewFilter={setPendingViewFilter}
        pendingFilterType={pendingFilterType}
        setPendingFilterType={setPendingFilterType}
        pendingStageFilter={pendingStageFilter}
        setPendingStageFilter={setPendingStageFilter}
        pendingDateRange={pendingDateRange}
        setPendingDateRange={setPendingDateRange}
        customDateRange={customDateRange}
        setCustomDateRange={setCustomDateRange}
        selectedPeople={selectedPeople}
        allPeople={selectablePeople}
        onOpenPersonModal={() => setPersonFilterOpen(true)}
        onClearPeople={() => setSelectedPeople([])}
        onRemovePerson={(person) => setSelectedPeople((prev) => prev.filter((p) => p.email !== person.email))}
        batchSize={batchSize}
        setBatchSize={setBatchSize}
        taskTypes={taskTypes}
      />

      {/* Toast container */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        pauseOnHover
        theme={isDarkMode ? "dark" : "light"}
      />

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
