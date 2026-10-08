import React, {
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  IconButton,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Avatar,
  useTheme,
  useMediaQuery,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Paper,
  Checkbox,
  FormControlLabel,
  Stack,
  Divider,
  Tooltip,
  Tabs,
  Tab,
  Container,
  CircularProgress,
} from "@mui/material";
import Collapse from "@mui/material/Collapse";
import ExpandMore from "@mui/icons-material/ExpandMore";
import {
  People,
  Task,
  Warning,
  Refresh,
  Add,
  Close,
  Visibility,
  ChevronLeft,
  ChevronRight,
  Save,
  Event,
  Download,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { AuthContext } from "../contexts/AuthContext";
import CreateEvents from "./CreateEvents";

const toSATime = (d) => {
  if (!d) return null;
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return null;
    // South Africa is UTC+2, no daylight saving
    return new Date(
      date.toLocaleString("en-US", { timeZone: "Africa/Johannesburg" }),
    );
  } catch {
    return null;
  }
};
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// Add this memoized component OUTSIDE StatsDashboard
const TaskGroupRow = React.memo(
  ({ group, isExpanded, onToggle, formatDate }) => {
    const { user, tasks, totalCount, completedCount, incompleteCount } = group;
    const key = user.email || user.fullName;

    return (
      <Box
        sx={{
          backgroundColor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          boxShadow: 1,
          overflow: "hidden",
          transition: "all 0.2s",
          "&:hover": { boxShadow: 2 },
        }}
      >
        <Box
          sx={{
            p: 1.5,
            cursor: "pointer",
            backgroundColor: incompleteCount > 0 ? "error.50" : "transparent",
            "&:hover": { backgroundColor: "action.hover" },
          }}
          onClick={() => onToggle(key)}
        >
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
          >
            <Box display="flex" alignItems="center" gap={1.5}>
              <Avatar
                sx={{
                  bgcolor: "primary.main",
                  width: 40,
                  height: 40,
                  fontSize: "1rem",
                  fontWeight: "bold",
                }}
              >
                {user.fullName?.charAt(0)?.toUpperCase?.() || "?"}
              </Avatar>
              <Box>
                <Typography variant="body2" fontWeight="medium">
                  {user.fullName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {totalCount} task{totalCount !== 1 ? "s" : ""} captured •{" "}
                  {completedCount} completed • {incompleteCount} remaining
                  {incompleteCount === 0 && totalCount > 0 && " — ALL DONE! ✓"}
                </Typography>
              </Box>
            </Box>
            <IconButton size="small" sx={{ p: 0.5 }}>
              <ExpandMore
                sx={{
                  transition: "transform 0.2s ease",
                  transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </IconButton>
          </Box>
        </Box>

        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <Box sx={{ px: 1.5, pb: 1.5, pt: 1, backgroundColor: "grey.50" }}>
            <Divider sx={{ mb: 1.5 }} />
            {tasks.length === 0 ? (
              <Typography
                color="text.secondary"
                fontStyle="italic"
                variant="caption"
              >
                No tasks assigned
              </Typography>
            ) : (
              <Stack spacing={1}>
                {tasks.map((task) => (
                  <Box
                    key={task._id}
                    sx={{
                      p: 1.5,
                      borderRadius: 1.5,
                      backgroundColor: "background.paper",
                      border: "1px solid",
                      borderColor: "divider",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Box>
                      <Typography variant="caption" fontWeight="medium">
                        {task.name || "Unknown"}
                      </Typography>
                      {task.contacted_person?.name && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block", fontSize: "0.7rem" }}
                        >
                          Contacted: {task.contacted_person.name}
                        </Typography>
                      )}
                      {task.type && task.type.length < 30 && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            display: "block",
                            fontSize: "0.7rem",
                            textTransform: "capitalize",
                          }}
                        >
                          {task.type}
                        </Typography>
                      )}
                      {task.followup_date && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            display: "block",
                            mt: 0.25,
                            fontSize: "0.7rem",
                          }}
                        >
                          Due: {formatDate(task.followup_date)}
                        </Typography>
                      )}
                    </Box>
                    <Chip
                      label={task.status || "Pending"}
                      size="small"
                      color={
                        ["completed", "done"].includes(
                          task.status?.toLowerCase?.(),
                        )
                          ? "success"
                          : task.status?.toLowerCase?.() === "overdue"
                            ? "error"
                            : "warning"
                      }
                      sx={{ fontSize: "0.7rem", height: 22 }}
                    />
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </Collapse>
      </Box>
    );
  },
);

const StatsDashboard = () => {
  const theme = useTheme();
  const isXsDown = useMediaQuery(theme.breakpoints.down("xs"));
  const isSmDown = useMediaQuery(theme.breakpoints.down("sm"));
  const isMdDown = useMediaQuery(theme.breakpoints.down("md"));
  const isLgDown = useMediaQuery(theme.breakpoints.down("lg"));

  const getResponsiveValue = (values) => {
    if (isXsDown) return values.xs;
    if (isSmDown) return values.sm;
    if (isMdDown) return values.md;
    if (isLgDown) return values.lg;
    return values.xl;
  };

  const [stats, setStats] = useState({
    overview: null,
    events: [],
    overdueCells: [],
    allTasks: [],
    allUsers: [],
    groupedTasks: [],
    loading: false,
    error: null,
    dateRange: { start: "", end: "" },
  });

  const [period, setPeriod] = useState("today");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toLocaleDateString("en-CA", {
      timeZone: "Africa/Johannesburg",
    });
  });

  useEffect(() => {
    const todayStr = new Date().toLocaleDateString("en-CA", {
      timeZone: "Africa/Johannesburg",
    });

    try {
      const selDate = new Date(selectedDate);
      const sameMonth =
        selDate.getFullYear() === currentMonth.getFullYear() &&
        selDate.getMonth() === currentMonth.getMonth();

      if (!selectedDate || !sameMonth || selDate < new Date("2020-01-01")) {
        setSelectedDate(todayStr);
      }
    } catch {
      setSelectedDate(todayStr);
    }
  }, [currentMonth]);

  const [createEventModalOpen, setCreateEventModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [expandedUsers, setExpandedUsers] = useState([]);
  const [newEventData, setNewEventData] = useState({
    eventName: "",
    eventTypeName: "",
    date: "",
    eventLeaderName: "",
    eventLeaderEmail: "",
    location: "",
    time: "19:00",
    description: "",
    isRecurring: false,
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [eventTypes, setEventTypes] = useState([]);
  const [, setEventTypesLoading] = useState(true);
  const [overdueModalOpen, setOverdueModalOpen] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [viewMoreModalOpen, setViewMoreModalOpen] = useState(false);
  const [cells, setCells] = useState([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [cellsLoading, setCellsLoading] = useState(false);
  const [cellsError, setCellsError] = useState(null);
  const { authFetch } = useContext(AuthContext);
  const statsLockRef = useRef(false);
  const cellsLockRef = useRef(false);

  const canStartFetch = (lockRef, forceRefresh) => {
    if (lockRef.current && !forceRefresh) return false;
    lockRef.current = true;
    return true;
  };

  const releaseFetchLock = (lockRef) => {
    lockRef.current = false;
  };

  const periodOptions = [
    { value: "today", label: "Today" },
    { value: "thisWeek", label: "This Week" },
    { value: "thisMonth", label: "This Month" },
    { value: "previousWeek", label: "Previous Week" },
    { value: "previousMonth", label: "Previous Month" },
  ];

  useEffect(() => {
    if (cells.length > 0) {
      console.group("📅 Overdue Cells — " + cells.length + " found");
      console.table(
        cells.map((cell) => ({
          name: cell.eventName || "—",
          date: cell.date ? new Date(cell.date).toLocaleDateString() : "—",
          leader: cell.eventLeaderName || "—",
          status: cell.status || cell.Status || "incomplete",
          location: cell.location || "—",
          id: cell._id?.slice(-6) + "...",
        })),
      );
      console.groupEnd();
    } else if (!cellsLoading) {
      console.log("No overdue cells right now");
    }
  }, [cells, cellsLoading]);

  const fetchCalendarEvents = useCallback(async () => {
    if (calendarLoading) return;
    setCalendarLoading(true);

    try {
      // Test with NO query params first
      const url = `${BACKEND_URL}/events/eventsdata`;
      console.log("[TEST FETCH] URL:", url);

      const res = await authFetch(url);
      console.log("[TEST FETCH] Status:", res.status);

      if (!res.ok) {
        const errorBody = await res.text().catch(() => "No body");
        console.error("[TEST FETCH] Error:", res.status, errorBody);
        throw new Error(`Test failed: ${res.status} - ${errorBody}`);
      }

      const data = await res.json();
      console.log("[TEST FETCH] Data keys:", Object.keys(data));
      const events = data.events || data.data || [];
      console.log(`[TEST FETCH] Loaded ${events.length} events`);

      setCalendarEvents(events);
    } catch (err) {
      console.error("Test calendar fetch failed:", err);
    } finally {
      setCalendarLoading(false);
    }
  }, [authFetch]);

  const fetchOverdueCells = useCallback(
    async (forceRefresh = false) => {
      /** CHANGE:
       * Use the CELLS lock only.
       * This prevents duplicate CELLS calls, but does NOT affect STATS.
       */
      if (!canStartFetch(cellsLockRef, forceRefresh)) {
        console.log("   Already fetching CELLS — skipping duplicate call");
        return;
      }

      console.log(">>> ENTERED fetchOverdueCells", { forceRefresh, period });

      setCellsLoading(true);
      setCellsError(null);

      console.log("→ Starting fetchOverdueCells", {
        forceRefresh,
        period,
        startDate: "2026-01-22",
      });

      try {
        const startDate = "2026-01-22"; // adjust as needed

        let allEvents = [];
        let page = 1;
        const limit = 90;

        while (true) {
          console.log(
            `   Fetching cells page ${page} (limit=${limit}, start=${startDate})`,
          );

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 100000);

          try {
            const url = `${BACKEND_URL}/events/cells?page=${page}&limit=${limit}&start_date=${startDate}&status=incomplete`;
            console.log(" → URL:", url);

            const res = await authFetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            console.log(` ← Response status: ${res.status}`);

            if (!res.ok) {
              const errText = await res.text().catch(() => "No error details");
              console.warn(`Failed page ${page}: ${res.status} – ${errText}`);
              throw new Error(
                `Cells page ${page} failed: ${res.status} – ${errText}`,
              );
            }

            const json = await res.json();
            const pageEvents =
              json.cells || json.data || json.events || json.results || [];

            console.log(` ← Got ${pageEvents.length} cells on page ${page}`);

            if (pageEvents.length === 0) break;

            allEvents.push(...pageEvents);

            if (pageEvents.length < limit) break;
            page++;
          } catch (err) {
            if (err?.name === "AbortError") {
              console.warn(`Cell fetch timeout on page ${page}`);
            } else {
              console.error(`Cell fetch error on page ${page}:`, err);
            }
            break;
          }
        }

        console.log(`← Total cells fetched: ${allEvents.length}`);
        if (allEvents.length > 0) console.table(allEvents.slice(0, 5));

        // ────────────────────────────────────────────────
        // Filter only incomplete / overdue / missed cells
        // ────────────────────────────────────────────────
        const overdueCells = allEvents.filter((cell) => {
          if ("is_overdue" in cell) {
            return !!cell.is_overdue; // true → show, false/null/undefined → hide
          }

          const raw = (cell.status || cell.Status || "").trim();
          const status = raw.toLowerCase();

          const isIncomplete =
            status === "incomplete" ||
            status.includes("incomplete") ||
            status === "incomp" ||
            status === "not completed";

          const cellDate = cell.date ? new Date(cell.date) : null;
          const isValidDate = cellDate && !isNaN(cellDate.getTime());

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const isPast = isValidDate && cellDate < today;

          return isIncomplete && isPast;
        });
        console.log(
          `Filtered down to ${overdueCells.length} overdue/incomplete cells (from ${allEvents.length} total)`,
        );

        if (overdueCells.length > 0) {
          console.table(overdueCells.slice(0, 5), [
            "eventName",
            "date",
            "status",
            "eventLeaderName",
          ]);
        }

        setCells(overdueCells);
        console.log(
          `Set cells state with ${overdueCells.length} overdue cells`,
        );
      } catch (err) {
        console.error("Overdue cells fetch failed:", err);
        setCellsError(err.message || "Failed to load overdue cells");
        toast.error("Could not load overdue cells");
      } finally {
        setCellsLoading(false);
        cellsLockRef.current = false;
        console.log("fetchOverdueCells finished / released lock");
      }
    },
    [authFetch],
  );
  const isOverdue = useCallback((cell) => {
    if (!cell) return false;
    if ("is_overdue" in cell) {
      return !!cell.is_overdue;
    }
    const status = (cell.status || cell.Status || "").trim().toLowerCase();
    const isIncomplete =
      status === "incomplete" ||
      status.includes("incomplete") ||
      status === "incomp" ||
      status === "not completed";

    const cellDate = cell.date ? new Date(cell.date) : null;
    const isValidDate = cellDate && !isNaN(cellDate.getTime());

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isPast = isValidDate && cellDate < today;

    return isIncomplete && isPast;
  }, []);

  const fetchStats = useCallback(
    async (forceRefresh = false) => {
      /** CHANGE:
       * Use the STATS lock only.
       * This prevents duplicate STATS calls, but does NOT affect CELLS.
       */
      if (!canStartFetch(statsLockRef, forceRefresh)) {
        console.log("   Already fetching STATS — skipping duplicate call");
        return;
      }

      setStats((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const response = await authFetch(
          `${BACKEND_URL}/stats/dashboard-comprehensive?period=${period}`,
          { retryOnAuthFailure: true, maxRetries: 1 },
        );

        if (!response.ok) {
          const errorText = await response.text();
          if (response.status === 401)
            throw new Error("Authentication required");
          throw new Error(
            `HTTP ${response.status}: ${errorText || response.statusText}`,
          );
        }

        const data = await response.json();

        setStats({
          overview: data.overview,
          events: data.events || [],
          /** CHANGE:
           * The old code had data.fetchOverdueCells which was incorrect.
           * This keeps it safer by checking common backend field names.
           */
          overdueCells: data.overdueCells || data.overdue_cells || [],
          allTasks: data.allTasks || [],
          allUsers: data.allUsers || [],
          groupedTasks: data.groupedTasks || [],
          dateRange: data.date_range || { start: "", end: "" },
          loading: false,
          error: null,
        });
      } catch (err) {
        console.error("Fetch stats error:", err);
        setStats((prev) => ({ ...prev, loading: false, error: err.message }));
      } finally {
        /** CHANGE:
         * Always release only the stats lock here.
         */
        releaseFetchLock(statsLockRef);
      }
    },
    [period, authFetch],
  );

  const handlePeriodChange = (e) => {
    /** CHANGE:
     * Before, period changes were blocked during fetch.
     * Now, period changes are safe.
     */

    setPeriod(e.target.value);
  };

  /**
   * CHANGE:
   * When the period changes, fetch stats and cells.
   * They won’t block each other because they use different locks.
   */
  useEffect(() => {
    console.log("[OVERDUE + STATS FETCH TRIGGER]", {
      period,
      timestamp: new Date().toISOString(),
    });

    fetchOverdueCells(false);
    fetchStats(false);
  }, [period, fetchOverdueCells, fetchStats]);

  const filteredOverdueCells = useMemo(() => {
    return [...cells].sort((a, b) => {
      const dateA = a.date
        ? new Date(a.date).getTime()
        : Number.MAX_SAFE_INTEGER;
      const dateB = b.date
        ? new Date(b.date).getTime()
        : Number.MAX_SAFE_INTEGER;
      return dateB - dateA;
    });
  }, [cells]);

  const filteredTasks = useMemo(() => stats.allTasks, [stats.allTasks]);
  const filteredEvents = useMemo(() => stats.events, [stats.events]);

  const getPeriodDisplayText = (periodType) => {
    switch (periodType) {
      case "today":
        return "Today";
      case "thisWeek":
        return "This Week";
      case "thisMonth":
        return "This Month";
      case "previousWeek":
        return "Previous Week";
      case "previousMonth":
        return "Previous Month";
      default:
        return periodType;
    }
  };

  // Excel helpers
  const formatDateForExcel = (dateStr) => {
    if (!dateStr) return "";
    try {
      const date = toSATime(dateStr);
      if (!date) return dateStr;

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");

      return `${year}-${month}-${day} ${hours}:${minutes}`;
    } catch (e) {
      console.warn("Date formatting error:", e, "for date:", dateStr);
      return dateStr;
    }
  };

  // Excel Download Function
  const downloadFilteredStats = () => {
    try {
      const currentPeriod = getPeriodDisplayText(period);
      const today = new Date().toISOString().split("T")[0];

      let dataToExport = [];
      let sheetName = "";
      let fileName = "";

      if (activeTab === 0) {
        if (!filteredOverdueCells || filteredOverdueCells.length === 0) {
          toast.info(
            "No overdue cells data to download for the selected period.",
          );
          return;
        }

        dataToExport = filteredOverdueCells.map((cell) => ({
          "Event ID": cell._id || "",
          "Event Name": cell.eventName || "Unnamed",
          "Event Type": cell.eventTypeName || "",
          Date: cell.date ? formatDateForExcel(cell.date) : "",
          Time: cell.time || "",
          Location: cell.location || "",
          "Event Leader": cell.eventLeaderName || "",
          "Leader Email": cell.eventLeaderEmail || "",
          Status: cell.status || cell.Status || "incomplete",
          Description: cell.description || "",
          "Attendees Count": cell.attendees ? cell.attendees.length : 0,
          "Is Recurring": cell.isRecurring ? "Yes" : "No",
          "Created At": cell.created_at
            ? formatDateForExcel(cell.created_at)
            : "",
          "Updated At": cell.updated_at
            ? formatDateForExcel(cell.updated_at)
            : "",
        }));

        sheetName = "Overdue_Cells";
        fileName = `overdue_cells_${currentPeriod
          .toLowerCase()
          .replace(/\s+/g, "_")}_${today}.xlsx`;
      } else if (activeTab === 1) {
        if (!filteredTasks || filteredTasks.length === 0) {
          toast.info("No tasks data to download for the selected period.");
          return;
        }

        dataToExport = filteredTasks.map((task) => ({
          "Task ID": task._id || "",
          "Task Name": task.name || task.taskType || "Untitled Task",
          "Task Type": task.type || "",
          "Contact Person": task.contacted_person?.name || "",
          "Contact Phone":
            task.contacted_person?.phone || task.contacted_person?.Number || "",
          "Contact Email": task.contacted_person?.email || "",
          "Assigned To": task.assignedfor || task.name || "",
          "Assigned For": task.assignedfor || "",
          "Due Date": task.followup_date
            ? formatDateForExcel(task.followup_date)
            : "",
          Status: task.status || "pending",
          "Task Stage": task.taskStage || "",
          "Created At": task.created_at
            ? formatDateForExcel(task.created_at)
            : "",
          "Updated At": task.updated_at
            ? formatDateForExcel(task.updated_at)
            : "",
          "Member ID": task.memberID || "",
          "Task Description": task.description || "",
        }));

        sheetName = "Tasks";
        fileName = `tasks_${currentPeriod
          .toLowerCase()
          .replace(/\s+/g, "_")}_${today}.xlsx`;
      } else if (activeTab === 2) {
        if (!filteredEvents || filteredEvents.length === 0) {
          toast.info("No events data to download for the selected period.");
          return;
        }

        dataToExport = filteredEvents.map((event) => ({
          "Event ID": event._id || "",
          "Event Name": event.eventName || "",
          "Event Type": event.eventTypeName || "",
          Date: event.date ? formatDateForExcel(event.date) : "",
          Time: event.time || "",
          Location: event.location || "",
          "Event Leader": event.eventLeaderName || "",
          "Leader Email": event.eventLeaderEmail || "",
          Description: event.description || "",
          Status: event.status || event.Status || "incomplete",
          "Is Recurring": event.isRecurring ? "Yes" : "No",
          "Created At": event.created_at
            ? formatDateForExcel(event.created_at)
            : "",
          "Updated At": event.updated_at
            ? formatDateForExcel(event.updated_at)
            : "",
        }));

        sheetName = "Events";
        fileName = `events_${currentPeriod
          .toLowerCase()
          .replace(/\s+/g, "_")}_${today}.xlsx`;
      }

      if (dataToExport.length === 0) {
        toast.info("No data to download for the selected period.");
        return;
      }

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      const wbout = XLSX.write(wb, {
        bookType: "xlsx",
        type: "array",
        bookSST: false,
      });

      const blob = new Blob([wbout], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.href = url;
      link.download = fileName;
      link.target = "_blank";
      link.rel = "noopener";
      link.style.display = "none";
      document.body.appendChild(link);
      link.dispatchEvent(
        new MouseEvent("click", {
          view: window,
          bubbles: true,
          cancelable: true,
        }),
      );

      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 200);

      toast.success(`Downloaded ${dataToExport.length} records (${sheetName})`);
    } catch (error) {
      console.error("Error downloading Excel file:", error);
      toast.error("Error creating Excel file: " + error.message);
    }
  };
  const handleDownloadCalendar = useCallback(() => {
    if (isDownloading) return;

    try {
      setIsDownloading(true);

      if (!calendarEvents || calendarEvents.length === 0) {
        toast.warning("No calendar data available to download.");
        return;
      }

      const today = new Date().toISOString().split("T")[0];

      const dataToExport = calendarEvents.map((event) => ({
        "Event ID":     event._id || "",
        "Event Name":   event.eventName || "Unnamed Event",
        "Event Type":   event.eventTypeName || "",
        Date:           event.date ? formatDateForExcel(event.date) : "",
        Time:           event.time || "",
        Location:       event.location || "",
        "Event Leader": event.eventLeaderName || "",
        "Leader Email": event.eventLeaderEmail || "",
        Status:         event.status || event.Status || "incomplete",
        "Is Recurring": event.isRecurring ? "Yes" : "No",
        Description:    event.description || "",
        "Created At":   event.created_at ? formatDateForExcel(event.created_at) : "",
        "Updated At":   event.updated_at ? formatDateForExcel(event.updated_at) : "",
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      XLSX.utils.book_append_sheet(wb, ws, "Calendar");

      const fileName = `calendar_events_${today}.xlsx`;
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array", bookSST: false });
      const blob = new Blob([wbout], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = fileName;
      link.style.display = "none";
      document.body.appendChild(link);
      link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 200);

      toast.success(`Downloaded ${dataToExport.length} calendar events`);

    } catch (error) {
      console.error("Calendar download error:", error);
      toast.error("Failed to download calendar: " + error.message);
    } finally {
      setIsDownloading(false);
    }
  }, [calendarEvents, formatDateForExcel, isDownloading]);

  useEffect(() => {
    fetchCalendarEvents();
  }, [fetchCalendarEvents]);
  useEffect(() => {
    fetchCalendarEvents();
  }, [currentMonth.getFullYear(), currentMonth.getMonth()]);

  useEffect(() => {
    const fetchEventTypes = async () => {
      try {
        const res = await authFetch(`${BACKEND_URL}/event-types`);
        if (!res.ok) throw new Error("Failed to load event types");

        const data = await res.json();
        const types = data.eventTypes || data.data || data || [];
        setEventTypes(types);
      } catch (err) {
        console.error("Failed to load event types:", err);
        setEventTypes([
          { name: "CELLS" },
          { name: "GLOBAL" },
          { name: "SERVICE" },
          { name: "MEETING" },
          { name: "TRAINING" },
          { name: "OUTREACH" },
        ]);
      } finally {
        setEventTypesLoading(false);
      }
    };

    fetchEventTypes();
  }, [authFetch]);

  useEffect(() => {
    const handleTaskUpdate = () => {
      console.log("Task update detected, refreshing stats...");
      fetchStats(true);
      fetchOverdueCells(true);
    };

    window.addEventListener("taskUpdated", handleTaskUpdate);

    return () => {
      window.removeEventListener("taskUpdated", handleTaskUpdate);
    };
  }, [fetchStats, fetchOverdueCells]);

  const toggleExpand = useCallback((key) => {
    setExpandedUsers((prev) =>
      prev.includes(key) ? prev.filter((e) => e !== key) : [...prev, key],
    );
  }, []);

  const formatDate = useCallback((d) => {
    if (!d) return "Not set";
    try {
      const date = toSATime(d);
      if (!date) return "Not set";
      return date.toLocaleDateString("en-ZA", {
        timeZone: "Africa/Johannesburg",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Not set";
    }
  }, []);

  const formatLocalDisplayDate = useCallback((d) => {
    if (!d) return "Not set";
    try {
      const date = toSATime(d);
      if (!date) return "Not set";
      return date.toLocaleDateString("en-ZA", {
        timeZone: "Africa/Johannesburg",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Not set";
    }
  }, []);

  const getEventsForDate = useCallback(
    (date) => {
      console.log("Filtering for date:", date);

      return calendarEvents.filter((e) => {
        if (!e.date) return false;

        // Create date at local midnight
        const eventDate = new Date(e.date);
        const eventYear = eventDate.getFullYear();
        const eventMonth = String(eventDate.getMonth() + 1).padStart(2, "0");
        const eventDay = String(eventDate.getDate()).padStart(2, "0");
        const eventDateStr = `${eventYear}-${eventMonth}-${eventDay}`;

        console.log(
          `Comparing event date ${eventDateStr} with selected date ${date} for event:`,
          e,
        );

        return eventDateStr === date;
      });
    },
    [calendarEvents],
  );

  // And in eventCounts calculation:
  const eventCounts = {};
  calendarEvents.forEach((e) => {
    if (e.date) {
      const d = new Date(e.date).toISOString().split("T")[0];
      eventCounts[d] = (eventCounts[d] || 0) + 1;
    }
  });

  const globalEvent = eventTypes?.find(
    (et) => et.name?.toLowerCase() === "global events",
  );

  const filteredEventTypes = eventTypes?.filter((et) => !et.isTicketed);

  const handleCloseCreateEventModal = useCallback((shouldRefresh = false) => {
  setCreateEventModalOpen(false);

  if (shouldRefresh) {
    toast.success("Event created successfully!");

    // Refresh all relevant data
    fetchStats(true);
    fetchOverdueCells(true);
    fetchCalendarEvents();

    // Optional: small delay for better UX
    setTimeout(() => {
      console.log("✅ Event created - data refreshed");
    }, 300);
  }
}, [fetchStats, fetchOverdueCells, fetchCalendarEvents]);

  const handleCreateEvent = useCallback(() => {
    setNewEventData((prev) => ({
      ...prev,
      date: selectedDate,
      eventTypeName: globalEvent?.name || "Global Events",
    }));

    setCreateEventModalOpen(true);
  }, [selectedDate, globalEvent]);

  const EnhancedCalendar = useMemo(() => {
    const eventCounts = {};
    calendarEvents.forEach((e) => {
      if (e.date) {
        const d = new Date(e.date).toISOString().split("T")[0];
        eventCounts[d] = (eventCounts[d] || 0) + 1;
      }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0); // force local midnight
    const todayStr = new Date().toLocaleDateString("en-CA", {
      timeZone: "Africa/Johannesburg",
    });
    console.log("[EnhancedCalendar] todayStr calculated as:", todayStr);

    const goToPreviousMonth = () =>
      setCurrentMonth((prev) => {
        const m = new Date(prev);
        m.setMonth(m.getMonth() - 1);
        return m;
      });

    const goToNextMonth = () =>
      setCurrentMonth((prev) => {
        const m = new Date(prev);
        m.setMonth(m.getMonth() + 1);
        return m;
      });

    const goToToday = () => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const todayStr = now.toISOString().split("T")[0];
      console.log(
        "[goToToday] Setting currentMonth and selectedDate to:",
        todayStr,
      );
      setCurrentMonth(now);
      setSelectedDate(todayStr);
    };

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startWeekday = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();

    const days = [];
    for (let i = 0; i < startWeekday; i++) days.push(null);

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month, day);
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      days.push({
        day,
        date: dateStr,
        dateObj,
        eventCount: eventCounts[dateStr] || 0,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
      });
    }

    while (days.length % 7 !== 0) days.push(null);

    return (
      <Box sx={{ width: "100%" }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h6" fontWeight="medium">
            {currentMonth.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </Typography>

          <Box sx={{ display: "flex", gap: 1 }}>
            <IconButton size="small" onClick={goToPreviousMonth}>
              <ChevronLeft fontSize="small" />
            </IconButton>

            <Button
              variant="outlined"
              size="small"
              onClick={goToToday}
              sx={{ minWidth: 80 }}
            >
              Today
            </Button>

            <IconButton size="small" onClick={goToNextMonth}>
              <ChevronRight fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 0.5,
            mb: 1,
          }}
        >
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => (
            <Box
              key={day}
              sx={{
                py: 1,
                textAlign: "center",
                fontSize: "0.8rem",
                fontWeight: "medium",
                color: i === 0 || i === 6 ? "text.secondary" : "text.primary",
                bgcolor: i === 0 || i === 6 ? "action.hover" : "transparent",
                borderRadius: 1,
              }}
            >
              {isSmDown ? day[0] : day}
            </Box>
          ))}
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 0.5,
          }}
        >
          {days.map((d, i) =>
            !d ? (
              <Box key={`empty-${i}`} sx={{ height: 54, minHeight: 54 }} />
            ) : (
              <Box
                key={d.date}
                onClick={() => {
                  console.log("User clicked:", d.date);
                  setSelectedDate(d.date);
                  // Optional: force scroll or focus
                  window.scrollTo(0, 0);
                }}
                sx={{
                  height: 54,
                  minHeight: 54,
                  borderRadius: 2,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  bgcolor: d.isSelected
                    ? "primary.main"
                    : d.isToday
                      ? "primary.50"
                      : "background.paper",
                  color: d.isSelected ? "white" : "text.primary",
                  border:
                    d.isToday && !d.isSelected ? "2px solid" : "1px solid",
                  borderColor:
                    d.isToday && !d.isSelected ? "primary.main" : "divider",
                  transition: "all 0.18s ease",
                  "&:hover": {
                    bgcolor: d.isSelected ? "primary.dark" : "action.hover",
                    transform: "scale(1.04)",
                    boxShadow: 2,
                    zIndex: 1,
                  },
                }}
              >
                <Typography
                  variant="body2"
                  fontWeight={d.isToday || d.isSelected ? "bold" : "medium"}
                >
                  {d.day}
                </Typography>

                {d.eventCount > 0 && (
                  <Box
                    sx={{
                      mt: 0.5,
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      bgcolor: d.isSelected ? "white" : "primary.main",
                    }}
                  />
                )}
              </Box>
            ),
          )}
        </Box>
      </Box>
    );
  }, [filteredEvents, currentMonth, selectedDate, isSmDown]);

  const StatCard = React.memo(
    ({ title, value, subtitle, icon, color = "primary" }) => (
      <Paper
        variant="outlined"
        sx={{
          p: getResponsiveValue({ xs: 1, sm: 1.5, md: 1.5, lg: 2, xl: 2 }),
          textAlign: "center",
          boxShadow: 1,
          height: "100%",
          borderTop: `3px solid ${theme.palette[color].main}`,
          transition: "all 0.2s",
          "&:hover": { boxShadow: 3, transform: "translateY(-1px)" },
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="center"
          spacing={1}
          mb={0.5}
        >
          <Avatar
            sx={{
              bgcolor: `${color}.main`,
              width: getResponsiveValue({
                xs: 28,
                sm: 32,
                md: 32,
                lg: 36,
                xl: 36,
              }),
              height: getResponsiveValue({
                xs: 28,
                sm: 32,
                md: 32,
                lg: 36,
                xl: 36,
              }),
            }}
          >
            {icon}
          </Avatar>
          <Typography
            variant={getResponsiveValue({
              xs: "h6",
              sm: "h6",
              md: "h5",
              lg: "h5",
              xl: "h5",
            })}
            fontWeight={600}
            color={`${color}.main`}
          >
            {value}
          </Typography>
        </Stack>
        <Typography
          variant={getResponsiveValue({
            xs: "caption",
            sm: "body2",
            md: "body2",
            lg: "body2",
            xl: "body2",
          })}
          color="text.secondary"
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Paper>
    ),
  );

  const SkeletonLoader = () => (
    <Container
      maxWidth="xl"
      sx={{
        p: getResponsiveValue({ xs: 1, sm: 1.5, md: 2, lg: 2, xl: 2 }),
        mt: 8,
      }}
    >
      <Box display="flex" justifyContent="flex-end" mb={2}>
        <Skeleton variant="circular" width={32} height={32} />
      </Box>

      <Grid
        container
        spacing={getResponsiveValue({ xs: 1, sm: 1.5, md: 2, lg: 2, xl: 2 })}
        mb={3}
      >
        {[...Array(3)].map((_, i) => (
          <Grid item xs={12} sm={6} md={4} key={i}>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                height: "100%",
                borderTop: "3px solid",
                borderColor: "divider",
              }}
            >
              <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                gap={1}
                mb={1}
              >
                <Skeleton variant="circular" width={32} height={32} />
                <Skeleton width={40} height={40} />
              </Box>
              <Skeleton width="80%" height={20} sx={{ mx: "auto" }} />
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper variant="outlined" sx={{ mb: 1.5, p: 0.5 }}>
        <Box display="flex">
          {["Overdue Cells", "Tasks", "Calendar"].map((_tab, i) => (
            <Box key={i} sx={{ flex: 1, p: 1, textAlign: "center" }}>
              <Skeleton width="100%" height={24} />
            </Box>
          ))}
        </Box>
      </Paper>

      <Paper
        sx={{
          p: 2,
          height: getResponsiveValue({
            xs: "auto",
            sm: "calc(100vh - 320px)",
            md: "calc(100vh - 320px)",
            lg: "calc(100vh - 320px)",
            xl: "calc(100vh - 320px)",
          }),
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Skeleton height={24} width={200} sx={{ mb: 2 }} />
        <Stack spacing={1.5}>
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} height={64} sx={{ borderRadius: "12px" }} />
          ))}
        </Stack>
      </Paper>
    </Container>
  );

  if (stats.loading && !stats.overview) {
    return <SkeletonLoader />;
  }

  if (stats.error && !stats.overview) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 3,
        }}
      >
        <Alert
          severity="error"
          action={<Button onClick={() => fetchStats(true)}>Retry</Button>}
        >
          {stats.error}
        </Alert>
      </Box>
    );
  }

  const eventsOnSelectedDate = getEventsForDate(selectedDate);

  return (
    <Container
      maxWidth="xl"
      sx={{
        p: getResponsiveValue({ xs: 1, sm: 1.5, md: 2, lg: 2.5, xl: 3 }),
        mt: { xs: 4, md: 6 },
      }}
    >
      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems={isXsDown ? "flex-start" : "center"}
        mb={3}
        flexDirection={isXsDown ? "column" : "row"}
        gap={2}
      >
        <Box>
          <Typography variant="h5" fontWeight="medium">
            Dashboard
          </Typography>
          {stats.dateRange.start && stats.dateRange.end && (
            <Typography variant="body2" color="text.secondary">
              {formatDate(stats.dateRange.start)} –{" "}
              {formatDate(stats.dateRange.end)}
            </Typography>
          )}
        </Box>

        <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Period</InputLabel>
            <Select
              value={period}
              label="Period"
              onChange={handlePeriodChange}
              disabled={stats.loading}
            >
              {periodOptions.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* CHANGE: Refresh should refresh BOTH stats & cells */}
          <Tooltip title="Refresh">
            <IconButton
              onClick={() => {
                //CHANGE: forceRefresh=true so both fetches run even if a previous call is mid-flight.
                fetchStats(true);
                fetchOverdueCells(true);
              }}
              disabled={stats.loading || cellsLoading}
            >
              <Refresh />
            </IconButton>
          </Tooltip> 
          {/* Download button should download based  */}
          <Button
            size="small"
            onClick={downloadFilteredStats}
            startIcon={ <Download />}
            variant="outlined"
            disabled={
              stats.loading ||
              cellsLoading ||
              (activeTab === 0
                ? filteredOverdueCells.length === 0
                : activeTab === 1
                ? filteredTasks.length === 0
                : filteredEvents.length === 0)
            }
          >
            {isDownloading ? "Downloading..." : "Download"}
          </Button>
        </Box>
      </Box>

      {(stats.loading || cellsLoading) && <LinearProgress sx={{ mb: 3 }} />}

      {/* Stat Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Overdue Cells"
            color="warning"
            subtitle={getPeriodDisplayText(period)}
            value={filteredOverdueCells.length}
            icon={<Warning />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Tasks Due"
            subtitle={getPeriodDisplayText(period)}
            color="secondary"
            value={stats.overview?.tasks_due_in_period || 0}
            icon={<Task />}
          />
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper variant="outlined" sx={{ mb: 2 }}>
        <Tabs
          variant={isSmDown ? "scrollable" : "standard"}
          centered
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
        >
          <Tab label={`Overdue Cells (${filteredOverdueCells.length})`} />
          <Tab label={`Tasks (${filteredTasks.length})`} />
          <Tab label={`Calendar (${calendarEvents.length} events)`} />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Box sx={{ minHeight: "0px" }}>
        {/* OVERDUE CELLS TAB */}
        {activeTab === 0 && (
          <Paper
            sx={{
              p: 3,
              height: "calc(100vh - 380px)",
              display: "flex",
              flexDirection: "column",
              borderRadius: 2,
              boxShadow: 1,
            }}
          >
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={2.5}
              flexWrap="wrap"
              gap={2}
            >
              <Box>
                <Typography variant="h6" component="div" fontWeight={600}>
                  Overdue Cells
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {getPeriodDisplayText(period)} • {filteredOverdueCells.length}{" "}
                  found
                </Typography>
              </Box>
              <Box display="flex" gap={1.5} alignItems="center">
                <Chip
                  label={getPeriodDisplayText(period)}
                  color="warning"
                  size="small"
                  variant="outlined"
                />
                <Button
                  color="warning"
                  variant="outlined"
                  size="small"
                  disabled={filteredOverdueCells.length === 0}
                  onClick={() => setOverdueModalOpen(true)}
                  startIcon={<Visibility fontSize="small" />}
                >
                  View All
                </Button>
              </Box>
            </Box>

            {cellsLoading ? (
              <Box
                sx={{
                  flexGrow: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CircularProgress color="warning" size={60} thickness={4} />
              </Box>
            ) : cellsError ? (
              <Alert
                severity="error"
                sx={{ my: 3 }}
                action={
                  <Button
                    color="error"
                    size="small"
                    onClick={fetchOverdueCells}
                    startIcon={<Refresh />}
                  >
                    Retry
                  </Button>
                }
              >
                {cellsError}
              </Alert>
            ) : filteredOverdueCells.length === 0 ? (
              <Box
                sx={{
                  px: 3,
                  textAlign: "center",
                  color: "text.secondary",
                  justifyContent: "center",
                  alignItems: "center",
                  flexGrow: 1,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Warning
                  sx={{
                    fontSize: 90,
                    opacity: 0.25,
                    mb: 3,
                    color: "warning.main",
                  }}
                />
                <Typography variant="h6" gutterBottom>
                  No overdue cells
                </Typography>
                <Typography variant="body1" sx={{ maxWidth: 480 }}>
                  All cells are up to date for the selected period.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ flexGrow: 1, overflowY: "auto", pr: 1 }}>
                <Stack spacing={2}>
                  {filteredOverdueCells.map((cell) => (
                    <Card
                      key={cell._id}
                      variant="outlined"
                      sx={{
                        transition: "all 0.18s ease",
                        borderLeft: isOverdue(cell)
                          ? "4px solid #dc3545"
                          : "1px solid",
                        borderLeftColor: isOverdue(cell)
                          ? "#dc3545"
                          : "divider",
                        bgcolor: isOverdue(cell)
                          ? "error.50"
                          : "background.paper",
                        "&:hover": {
                          boxShadow: 4,
                          transform: "translateY(-2px)",
                        },
                      }}
                    >
                      <CardContent sx={{ py: 2, px: 2.5 }}>
                        <Box
                          display="flex"
                          justifyContent="space-between"
                          alignItems="flex-start"
                          gap={2}
                        >
                          <Box flex={1}>
                            <Typography variant="subtitle1" fontWeight={600}>
                              {cell.eventName || "Unnamed Cell"}
                            </Typography>
                            <Stack
                              direction="row"
                              spacing={2}
                              mt={0.5}
                              alignItems="center"
                              flexWrap="wrap"
                            >
                              {cell.date && (
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                  }}
                                >
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    <Event
                                      fontSize="small"
                                      sx={{ verticalAlign: "middle", mr: 0.5 }}
                                    />
                                    {formatDate(cell.date)}
                                  </Typography>
                                  {isOverdue(cell) && (
                                    <Chip
                                      label="OVERDUE"
                                      size="small"
                                      color="error"
                                      variant="outlined"
                                      sx={{
                                        height: 20,
                                        fontSize: "0.68rem",
                                        fontWeight: "bold",
                                        borderWidth: 1.5,
                                      }}
                                    />
                                  )}
                                </Box>
                              )}
                              {cell.eventLeaderName && (
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  <People
                                    fontSize="small"
                                    sx={{ verticalAlign: "middle", mr: 0.5 }}
                                  />
                                  Leader: {cell.eventLeaderName}
                                </Typography>
                              )}
                            </Stack>
                            {cell.description && (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mt: 1.5, lineHeight: 1.5 }}
                              >
                                {cell.description}
                              </Typography>
                            )}
                          </Box>
                          <Box textAlign="right">
                            {isOverdue(cell) ? (
                              <Box
                                sx={{
                                  bgcolor: "#dc35451a",
                                  color: "#dc3545",
                                  border: "1px solid #dc3545",
                                  borderRadius: 1,
                                  px: 2,
                                  py: 0.75,
                                  fontSize: "0.875rem",
                                  fontWeight: "bold",
                                  whiteSpace: "nowrap",
                                  display: "inline-block",
                                }}
                              >
                                OVERDUE
                              </Box>
                            ) : (
                              <Chip
                                label={(cell.Status || "incomplete")
                                  .replace("_", " ")
                                  .toUpperCase()}
                                size="small"
                                color={
                                  cell.Status?.toLowerCase() === "complete"
                                    ? "success"
                                    : cell.Status?.toLowerCase() ===
                                        "did_not_meet"
                                      ? "error"
                                      : "default"
                                }
                                sx={{ minWidth: 110, fontWeight: 600 }}
                              />
                            )}
                            {cell.attendees?.length > 0 && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                display="block"
                                mt={1}
                              >
                                {cell.attendees.length} attendee
                                {cell.attendees.length !== 1 ? "s" : ""}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </Box>
            )}
          </Paper>
        )}

        {/* TASKS TAB */}
        {activeTab === 1 && (
          <Paper
            sx={{
              p: getResponsiveValue({ xs: 1, sm: 1.5, md: 2, lg: 2, xl: 2 }),
              height: "calc(100vh - 320px)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: isXsDown ? "flex-start" : "center",
                mb: { xs: 2.5, md: 3 },
                flexShrink: 0,
                flexDirection: isXsDown ? "column" : "row",
                gap: isXsDown ? 1 : 0,
              }}
            >
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  All Tasks by Person ({stats.groupedTasks.length} people •{" "}
                  {filteredTasks.length} total)
                </Typography>
              </Box>
              <Chip
                label={`Period: ${getPeriodDisplayText(period)}`}
                color="secondary"
                size="small"
                variant="outlined"
              />
            </Box>

            <Box
              sx={{
                flexGrow: 1,
                overflow: "auto",
                pr: 1,
                "&::-webkit-scrollbar": { width: "6px" },
                "&::-webkit-scrollbar-track": {
                  background: "#f1f1f1",
                  borderRadius: "3px",
                },
                "&::-webkit-scrollbar-thumb": {
                  background: "#888",
                  borderRadius: "3px",
                },
                "&::-webkit-scrollbar-thumb:hover": { background: "#555" },
              }}
            >
              {stats.groupedTasks.length === 0 && !stats.loading ? (
                <Box
                  sx={{
                    textAlign: "center",
                    py: 6,
                    color: "text.secondary",
                    border: "2px dashed",
                    borderColor: "divider",
                    borderRadius: 1.5,
                  }}
                >
                  <Task sx={{ fontSize: 48, opacity: 0.3, mb: 1.5 }} />
                  <Typography variant="body1">No tasks found</Typography>
                  <Typography variant="caption" sx={{ fontSize: "0.75rem" }}>
                    No tasks found for {getPeriodDisplayText(period)}.
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={1.5}>
                  {stats.groupedTasks.map((group) => {
                    const key = group.user.email || group.user.fullName;
                    return (
                      <TaskGroupRow
                        key={key}
                        group={group}
                        isExpanded={expandedUsers.includes(key)}
                        onToggle={toggleExpand}
                        formatDate={formatDate}
                      />
                    );
                  })}
                </Stack>
              )}
            </Box>
          </Paper>
        )}

        {/* CALENDAR TAB */}
        {activeTab === 2 && (
          <>
            <Paper
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                borderRadius: 2,
                boxShadow: 1,
                minHeight: { xs: "auto", md: "500px" },
              }}
            >
              <Box
                sx={{
                  p: { xs: 2, md: 2.5 },
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  flexShrink: 0,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 2,
                  }}
                >
                  <Typography variant="subtitle1" fontWeight="medium">
                    Event Calendar ({calendarEvents.length} events total)
                  </Typography>
                <Box display="flex" gap={1}>       
              <Button
                  variant="outlined"
                 size="small"
                 startIcon={isDownloading ? <CircularProgress size={14} /> : <Download />}
                 onClick={handleDownloadCalendar}
                 disabled={isDownloading || calendarEvents.length === 0}
                >
                  {isDownloading ? "Downloading..." : "Download"}
                  </Button>  
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Add />}
                    onClick={handleCreateEvent}
                  >
                    Create Event
                  </Button>
                </Box>
              </Box>
              </Box>

              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  flexDirection: { xs: "column", md: "row" },
                  gap: 0,
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    flex: { xs: "1 1 auto", md: "0 0 420px" },
                    overflowY: "auto",
                    p: { xs: 2, md: 2.5 },
                    borderRight: { md: "1px solid" },
                    borderColor: "divider",
                  }}
                >
                  {EnhancedCalendar}
                </Box>

                <Box
                  sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    bgcolor: "background.default",
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      p: { xs: 2, md: 2.5 },
                      pb: 1,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      bgcolor: "background.paper",
                      zIndex: 1,
                    }}
                  >
                    <Typography variant="subtitle1" component="div">
                      Events on {formatLocalDisplayDate(selectedDate)}
                      <Typography
                        component="span"
                        variant="caption"
                        sx={{ ml: 1.5, color: "text.secondary" }}
                      >
                        ({eventsOnSelectedDate.length} event
                        {eventsOnSelectedDate.length !== 1 ? "s" : ""})
                      </Typography>
                    </Typography>
                  </Box>

                  {calendarLoading ? (
                    <Box
                      sx={{
                        flex: 1,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <CircularProgress />
                    </Box>
                  ) : eventsOnSelectedDate.length === 0 ? (
                    <Box
                      sx={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "text.secondary",
                        textAlign: "center",
                        p: 4,
                      }}
                    >
                      <Event sx={{ fontSize: 64, opacity: 0.3, mb: 2 }} />
                      <Typography variant="h6" gutterBottom>
                        No events on this date
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<Add />}
                        onClick={handleCreateEvent}
                        sx={{ mt: 2 }}
                      >
                        Create Event for this day
                      </Button>
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        flex: 1,
                        overflowY: "auto",
                        px: { xs: 2, md: 2.5 },
                        py: 1,
                        pb: 3,
                      }}
                    >
                      <Stack spacing={2}>
                        {eventsOnSelectedDate.slice(0, 2).map((e) => (
                          <Card
                            key={e._id}
                            variant="outlined"
                            sx={{
                              p: 2,
                              borderRadius: 2,
                              transition: "all 0.2s",
                              "&:hover": {
                                boxShadow: 3,
                                transform: "translateY(-2px)",
                              },
                            }}
                          >
                            <Typography
                              variant="subtitle2"
                              fontWeight="medium"
                              gutterBottom
                            >
                              {e.eventName || "Unnamed Event"}
                            </Typography>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                mb: 0.5,
                              }}
                            >
                              <Event fontSize="small" color="action" />
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {formatLocalDisplayDate(e.date)} •{" "}
                                {e.time || "No time specified"}
                              </Typography>
                            </Box>
                            <Box
                              sx={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 1,
                                mt: 1,
                              }}
                            >
                              <Chip
                                label={e.eventTypeName || "Event"}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                              {e.location && (
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  {e.location}
                                </Typography>
                              )}
                            </Box>
                            {e.eventLeaderName && (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mt: 1 }}
                              >
                                Leader: {e.eventLeaderName}
                              </Typography>
                            )}
                          </Card>
                        ))}
                      </Stack>
                      {eventsOnSelectedDate.length > 0 && (
                        <Box sx={{ textAlign: "center", mt: 3, pb: 2 }}>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => setViewMoreModalOpen(true)}
                          >
                            View all {eventsOnSelectedDate.length} events
                          </Button>
                        </Box>
                      )}
                    </Box>
                  )}
                </Box>
              </Box>
            </Paper>

            <Dialog
              open={viewMoreModalOpen}
              onClose={() => setViewMoreModalOpen(false)}
              maxWidth="sm"
              fullWidth
            >
              <DialogTitle>
                All Events on {formatLocalDisplayDate(selectedDate)} (
                {eventsOnSelectedDate.length})
              </DialogTitle>
              <DialogContent dividers>
                <Stack spacing={2}>
                  {eventsOnSelectedDate.map((e) => (
                    <Card
                      key={e._id}
                      variant="outlined"
                      sx={{ p: 2, borderRadius: 2 }}
                    >
                      <Typography
                        variant="subtitle2"
                        fontWeight="medium"
                        gutterBottom
                      >
                        {e.eventName || "Unnamed Event"}
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mb: 0.5,
                        }}
                      >
                        <Event fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {formatLocalDisplayDate(e.date)} •{" "}
                          {e.time || "No time specified"}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 1,
                          mt: 1,
                        }}
                      >
                        <Chip
                          label={e.eventTypeName || "Event"}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                        {e.location && (
                          <Typography variant="body2" color="text.secondary">
                            {e.location}
                          </Typography>
                        )}
                      </Box>
                      {e.eventLeaderName && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 1 }}
                        >
                          Leader: {e.eventLeaderName}
                        </Typography>
                      )}
                    </Card>
                  ))}
                </Stack>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setViewMoreModalOpen(false)}>
                  Close
                </Button>
              </DialogActions>
            </Dialog>
          </>
        )}
      </Box>
      {/* CREATE EVENT MODAL - Consistent with your first example */}
<Dialog
  open={createEventModalOpen}
  onClose={() => setCreateEventModalOpen(false)}
  maxWidth="md"
  fullWidth
  fullScreen={isXsDown}
  PaperProps={{
    sx: {
      borderRadius: 3,
      boxShadow: 24,
      overflow: "hidden",
    },
  }}
>
  <DialogTitle
    sx={{
      backgroundColor: theme.palette.mode === "dark" ? "#1e1e1e" : "#1976d2",
      color: "white",
      p: 3,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    }}
  >
    <Box>
      <Typography variant="h6" fontWeight="bold">
        Create New Event
      </Typography>
      <Typography variant="body2" sx={{ opacity: 0.9 }}>
        {formatLocalDisplayDate(selectedDate)}
      </Typography>
    </Box>
    <IconButton onClick={() => setCreateEventModalOpen(false)} sx={{ color: "white" }}>
      <Close />
    </IconButton>
  </DialogTitle>

  <DialogContent sx={{ p: 0, overflow: "auto" }}>
    <Box
      sx={{
        height: "100%",
        overflow: "auto",
        backgroundColor: theme.palette.mode === "dark"
          ? theme.palette.background.paper
          : "white",
      }}
    >
      <CreateEvents
        key={newEventData.eventTypeName || "default"}
        user={JSON.parse(localStorage.getItem("userProfile") || "{}")}
        isModal={true}
        onClose={handleCloseCreateEventModal}
        selectedEventType={newEventData.eventTypeName}
        selectedEventTypeObj={
          eventTypes.find((et) => et.name === newEventData.eventTypeName) ?? null
        }
        eventTypes={filteredEventTypes}
        defaultEventType={globalEvent?.name || "Global Events"}
      />
    </Box>
  </DialogContent>
</Dialog>

      {/* OVERDUE CELLS MODAL */}
      <Dialog
        open={overdueModalOpen}
        onClose={() => setOverdueModalOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isXsDown}
      >
        <DialogTitle sx={{ background: "warning", color: "white", p: 3 }}>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
          >
            <Box display="flex" alignItems="center" gap={2}>
              <Warning sx={{ fontSize: 32 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Overdue / Incomplete Cells ({filteredOverdueCells.length})
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Cells that need attention
                </Typography>
              </Box>
            </Box>
            <IconButton
              onClick={() => setOverdueModalOpen(false)}
              sx={{ color: "white" }}
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3 }}>
          {filteredOverdueCells.length === 0 ? (
            <Typography color="text.secondary" align="center" py={4}>
              No overdue cells — great job!
            </Typography>
          ) : (
            <Stack spacing={2}>
              {filteredOverdueCells.map((cell) => (
                <Card
                  key={cell._id}
                  variant="outlined"
                  sx={{ p: 2, backgroundColor: "error.50" }}
                >
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar sx={{ bgcolor: "warning.main" }}>
                      <Warning />
                    </Avatar>
                    <Box flex={1}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {cell.eventName || "Unnamed Cell"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Leader: {cell.eventLeaderName || "Not assigned"}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="error"
                        fontWeight="medium"
                      >
                        {formatDate(cell.date)} —{" "}
                        {(
                          cell.status ||
                          cell.Status ||
                          "INCOMPLETE"
                        ).toUpperCase()}
                      </Typography>
                    </Box>
                    <Chip label={cell.attendees?.length || 0} size="small" />
                  </Box>
                </Card>
              ))}
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOverdueModalOpen(false)} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Container>
  );
};

export default StatsDashboard;
