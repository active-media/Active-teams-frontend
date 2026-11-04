import { useContext, useEffect, useState, useCallback, useMemo } from "react";
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
  const backgroundColor = normalizedStatus === "completed"
    ? `${colors.completed}20`
    : normalizedStatus === "in-progress"
      ? `${colors.inProgress}20`
      : normalizedStatus === "overdue"
        ? `${colors.overdue}20`
        : `${colors.border}80`;
  const color = normalizedStatus === "completed"
    ? colors.completed
    : normalizedStatus === "in-progress"
      ? colors.inProgress
      : normalizedStatus === "overdue"
        ? colors.overdue
        : colors.mutedForeground;

  return (
    <span style={{ borderRadius: 999, padding: "6px 10px", backgroundColor, color, fontSize: 12, fontWeight: 600 }}>
      {status || "Open"}
    </span>
  );
}

function CallTaskModal({ isOpen, onClose, taskData, handleChange, taskTypes, handleSubmit, submitting, currentUser, allPeople, isAdmin, canViewTeam }) {
  const availableTaskTypes = taskTypes.length
    ? taskTypes.map((taskType) => typeof taskType === "string" ? taskType : taskType.name).filter(Boolean)
    : ["Awaiting Call", "Service Invitation", "Service Follow Up", "Follow Up", "New Member Care"];

  const stageOptions = ["Awaiting Task", "Open", "Completed"];

  // For assigned to: admin can assign to anyone, leaders to their hierarchy, others only themselves
  const currentUserOption = { 
    email: currentUser?.email, 
    name: `${currentUser?.name || ""} ${currentUser?.surname || ""}`.trim() 
  };
  
  const getAssignablePeople = () => {
    let people = [];
    if (isAdmin || canViewTeam) {
      people = allPeople;
    }
    const hasCurrentUser = people.some(p => p.email === currentUserOption.email);
    if (!hasCurrentUser && currentUserOption.email) {
      people = [currentUserOption, ...people];
    }
    return people;
  };

  const assignablePeople = getAssignablePeople();

  // Recipient search state
  const [recipientSearch, setRecipientSearch] = useState("");
  const [recipientResults, setRecipientResults] = useState([]);
  const [showRecipientDropdown, setShowRecipientDropdown] = useState(false);

  // Search people for recipient
  useEffect(() => {
    if (recipientSearch.trim().length >= 1) {
      const q = recipientSearch.toLowerCase().trim();
      const results = allPeople
        .filter((p) => {
          const name = `${p.name || ""}`.toLowerCase().trim();
          const email = (p.email || "").toLowerCase().trim();
          return name.includes(q) || email.includes(q);
        })
        .slice(0, 20);
      setRecipientResults(results);
      setShowRecipientDropdown(true);
    } else {
      setRecipientResults(allPeople.slice(0, 20));
      setShowRecipientDropdown(true);
    }
  }, [recipientSearch, allPeople]);

  const handleRecipientSelect = (person) => {
    setRecipientSearch(person.name);
    setShowRecipientDropdown(false);
    handleChange({ target: { name: "recipient", value: person.email } });
    // Also set contacted_person fields
    handleChange({ target: { name: "contactedPersonName", value: person.name } });
    handleChange({ target: { name: "contactedPersonEmail", value: person.email } });
    handleChange({ target: { name: "contactedPersonPhone", value: "" } });
  };

  const handleRecipientSearchChange = (e) => {
    const value = e.target.value;
    setRecipientSearch(value);
    handleChange(e);
  };

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="sm">
      <form onSubmit={handleSubmit}>
        <DialogTitle>Call Task</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 2, pt: "12px !important" }}>
          <TextField
            select
            required
            label="Task type"
            name="taskType"
            value={taskData.taskType}
            onChange={handleChange}
          >
            {availableTaskTypes.map((taskType) => (
              <MenuItem key={taskType} value={taskType}>{taskType}</MenuItem>
            ))}
          </TextField>
          
          {/* Recipient - who the task is for (searchable) */}
          <TextField
            required
            label="Recipient"
            name="recipient"
            value={recipientSearch}
            onChange={handleRecipientSearchChange}
            onClick={() => setShowRecipientDropdown(true)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Search color="action" />
                </InputAdornment>
              ),
            }}
          />
          {showRecipientDropdown && recipientResults.length > 0 && (
            <Box
              sx={{
                position: "absolute",
                zIndex: 10,
                mt: 1,
                maxHeight: 300,
                overflow: "auto",
                bgcolor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                boxShadow: 3,
                width: "100%",
              }}
            >
              {recipientResults.map((person) => (
                <MenuItem
                  key={person.email}
                  onClick={() => handleRecipientSelect(person)}
                  style={{ padding: "8px 16px" }}
                >
                  {person.name}
                </MenuItem>
              ))}
            </Box>
          )}

          {/* Assigned to - defaults to current user but can be changed */}
          <TextField
            select
            label="Assigned to"
            name="assignedTo"
            value={taskData.assignedTo || currentUser?.email || ""}
            onChange={handleChange}
          >
            {assignablePeople.map((person) => (
              <MenuItem key={person.email} value={person.email}>
                {person.name}
              </MenuItem>
            ))}
          </TextField>
          
          <TextField
            required
            label="Due date"
            name="dueDate"
            type="datetime-local"
            value={taskData.dueDate}
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
          />
          
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
          
          {/* Hidden fields for contacted_person */}
          <input type="hidden" name="contactedPersonName" value={taskData.contactedPersonName || ""} onChange={handleChange} />
          <input type="hidden" name="contactedPersonEmail" value={taskData.contactedPersonEmail || ""} onChange={handleChange} />
          <input type="hidden" name="contactedPersonPhone" value={taskData.contactedPersonPhone || ""} onChange={handleChange} />
        </DialogContent>
        <DialogActions>
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
  isDarkMode 
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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth sx={{ "& .MuiDialog-paper": { maxHeight: "90vh" } }}>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box>
          <Typography variant="h6">Select People</Typography>
          <Typography variant="caption" color="text.secondary">
            {teamMembers.length} {teamMembers.length === 1 ? "person" : "people"} under you
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
            onClick={() => onSelectionChange(teamMembers)}
            startIcon={<Check />}
          >
            Select All ({teamMembers.length})
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
    ...(canViewTeam
      ? [{ value: "disciples", label: "Disciples", description: "Tasks for your disciples and hierarchy" }]
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

          {/* Person filter — only for disciples/all view, not personal */}
          {(pendingViewFilter === "disciples" || pendingViewFilter === "all") && (
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
  if (!window.globalPeopleCache) window.globalPeopleCache = [];
  if (!window.globalCacheTimestamp) window.globalCacheTimestamp = 0;

  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";
  // Use sidebar background color for main content
  const sidebarBg = isDarkMode ? "#1e1e1e" : "#ffffff";
  const sidebarBorder = isDarkMode ? "#374151" : "#e5e7eb";
  const colors = isDarkMode ? COLORS.dark : COLORS.light;

  const { user, authFetch } = useContext(AuthContext);
  const { updateCount } = useTaskUpdate();

  const [tasks, setTasks] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);
  const [allPeople, setAllPeople] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  // ─── Helper: Resolve team hierarchy from People cache ─────────────────────
  const resolveTeamHierarchy = useCallback(async () => {
    if (!user?.email) return { teamMembers: [], allPeople: [] };
    try {
      // Fetch all people in org (using cache endpoint for efficiency)
      const res = await authFetch(`${API_URL}/cache/people`);
      if (!res.ok) throw new Error("Failed to fetch people cache");
      const data = await res.json();
      const allPeopleData = data.cached_data || data.people || [];
      
      const userName = `${user.name || ""} ${user.surname || ""}`.trim();
      const userEmail = user.email.toLowerCase().trim();
      
      // Find people where current user is in Leader @1, @12, @144, or @1728
      const teamMembers = allPeopleData.filter((p) => {
        const leaderFields = [
          p["Leader @1"],
          p["Leader @12"],
          p["Leader @144"],
          p["Leader @1728"],
        ].map((l) => (l || "").toLowerCase().trim());
        
        return leaderFields.includes(userName.toLowerCase()) || leaderFields.includes(userEmail);
      });
      
      // Map all people for search (admin can search all, leaders search their hierarchy)
      const mappedAllPeople = allPeopleData.map((p) => ({
        email: (p.Email || "").toLowerCase().trim(),
        name: `${p.Name || ""} ${p.Surname || ""}`.trim(),
        _id: p._id,
      }));
      
      const mappedTeamMembers = teamMembers.map((p) => ({
        email: (p.Email || "").toLowerCase().trim(),
        name: `${p.Name || ""} ${p.Surname || ""}`.trim(),
        _id: p._id,
      }));
      
      return { teamMembers: mappedTeamMembers, allPeople: mappedAllPeople };
    } catch (err) {
      console.error("Error resolving team hierarchy:", err.message);
      return { teamMembers: [], allPeople: [] };
    }
  }, [user, authFetch, API_URL]);

  // ─── Load team hierarchy and all people on mount ───────────────────────────
  useEffect(() => {
    if (user) {
      // Check if user can view team (has people under them in hierarchy)
      resolveTeamHierarchy().then(({ teamMembers, allPeople }) => {
        setTeamPeopleObjects(teamMembers);
        setAllPeople(allPeople);
        setCanViewTeam(teamMembers.length > 0);
        
        // Check if admin/super_admin
        const role = (user.role || "").toLowerCase();
        setIsAdmin(["admin", "super_admin"].includes(role));
      });
    }
  }, [user, resolveTeamHierarchy]);

  // ─── Dynamic filter counts from actual tasks ──────────────────────────────
  const filterCounts = useMemo(() => {
    const counts = tasks.reduce(
      (acc, t) => {
        const stage = String(t.taskStage || t.status || "open").toLowerCase();
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

  const [taskData, setTaskData] = useState({
    taskType: "",
    recipient: "", // who the task is for
    assignedTo: user ? user.email : "", // defaults to current user
    assignedEmail: user?.email || "",
    dueDate: new Date().toISOString().slice(0, 16),
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
    recipient: "",
    contactedPersonName: "",
    contactedPersonEmail: "",
    contactedPersonPhone: "",
    assignedTo: user ? user.email : "",
    dueDate: new Date().toISOString().slice(0, 16),
    taskStage: "Open",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTaskData((prev) => ({ ...prev, [name]: value }));
  };

  const handleOpen = (type) => {
    setIsModalOpen(true);
    const initialData = getInitialTaskData();
    if (type === "call" || type === "visit") {
      initialData.taskType = type === "call" ? "Awaiting Call" : "Service Invitation";
    }
    setTaskData(initialData);
    setSubmitting(false);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setIsAddTypeModalOpen(false);
  };

  const createTaskType = async () => {
    if (!newTaskTypeName.trim() || addingTaskType) return;
    setAddingTaskType(true);
    try {
      const res = await authFetch(`${API_URL}/task-types`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTaskTypeName.trim() }),
      });
      if (!res.ok) throw new Error("Failed to create task type");
      const data = await res.json();
      if (data.taskType) {
        setTaskTypes((prev) => [...prev, data.taskType]);
        toast.success("Task type created successfully");
      }
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
    setSubmitting(true);
    try {
      // Build task payload with contacted_person object
      const payload = {
        name: taskData.name || "",
        taskType: taskData.taskType,
        type: taskData.taskType?.toLowerCase().includes("call") ? "call" : "visit",
        followup_date: taskData.dueDate,
        status: taskData.taskStage || "Open",
        assignedfor: taskData.assignedTo || user?.email || "",
        assigned_to_email: taskData.assignedTo || user?.email || "",
        contacted_person: {
          name: taskData.contactedPersonName || taskData.recipient || "",
          email: taskData.contactedPersonEmail || "",
          phone: taskData.contactedPersonPhone || "",
        },
        // Additional fields
        description: taskData.description || "",
        memberID: taskData.memberID || "",
        priority: taskData.priority || "",
      };
      // Submit to backend
      const res = await authFetch(`${API_URL}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create task");
      toast.success("Task created successfully");
      handleClose();
      await fetchUserTasks();
    } catch (err) {
      toast.error(err.message || "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Helper: Calculate date range for filter panel presets ────────────────────
  const getFilterDateRangeParams = useCallback((range, customRange) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

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
        return { start_date: start.toISOString().split("T")[0], end_date: end.toISOString().split("T")[0] };
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
        return { start_date: lastWeekStart.toISOString().split("T")[0], end_date: lastWeekEnd.toISOString().split("T")[0] };
      }
      case "this_month": {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        return { start_date: start.toISOString().split("T")[0], end_date: end.toISOString().split("T")[0] };
      }
      case "previous_month": {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        end.setHours(23, 59, 59, 999);
        return { start_date: start.toISOString().split("T")[0], end_date: end.toISOString().split("T")[0] };
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
        // Send selected people emails
        selectedPeople.forEach((p) => params.append("email", p.email));
      }
      // For "personal" view, only the user's email is sent (already in params)
      
      const res = await authFetch(`${API_URL}/tasks?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const data = await res.json();
      const fetchedTasks = Array.isArray(data) ? data : data.tasks || [];
      
      // Normalize tasks
      const normalized = fetchedTasks.map((task) => ({
        ...task,
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

  // Filter tasks based on stage filter (client-side fallback if needed)
  const visibleTasks = tasks.filter((t) => filter === "all" || String(t.taskStage || t.status || "").toLowerCase() === filter);
  const totalCount = tasks.length;

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
                {totalCount}
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
                  key={task.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "20px",
                    borderRadius: "14px",
                    border: `1px solid ${colors.border}`,
                    backgroundColor: colors.card,
                    padding: "24px",
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
                    {task.name.charAt(0)}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: "18px", fontWeight: "600", color: colors.foreground }}>
                      {task.name}
                    </div>
                    <div style={{ marginTop: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: "14px", color: colors.mutedForeground }}>
                      {task.person} <span style={{ margin: "0 8px" }}>•</span> {task.type}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexShrink: 0, alignItems: "center", gap: "32px", marginLeft: "auto" }}>
              <StatusBadge status={task.taskStage || task.status} colors={colors} />
              <span style={{ fontSize: "13px", color: colors.mutedForeground }}>
                {task.date}
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
          currentUser={user}
          allPeople={allPeople}
          isAdmin={isAdmin}
          canViewTeam={canViewTeam}
          authFetch={authFetch}
          API_URL={API_URL}
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
        teamMembers={teamPeopleObjects}
        selectedPeople={selectedPeople}
        onSelectionChange={setSelectedPeople}
        isDarkMode={isDarkMode}
      />

      {/* Advanced Filter Panel Modal */}
      <FilterPanelModal
        open={filterPanelOpen}
        onClose={() => setFilterPanelOpen(false)}
        onApply={() => {
          setFilterPanelOpen(false);
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
        allPeople={allPeople}
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
