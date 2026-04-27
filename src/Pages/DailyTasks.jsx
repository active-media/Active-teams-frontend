import { useContext, useEffect, useState, useCallback, useRef } from "react";
import { Phone, UserPlus, Plus } from "lucide-react";
import { useTheme } from "@mui/material/styles";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthContext } from "../contexts/AuthContext";
const CACHE_DURATION = 30 * 60 * 1000;
function Modal({ isOpen, onClose, children, isDarkMode }) {
  if (!isOpen) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: isDarkMode ? "#1e1e1e" : "white",
          color: isDarkMode ? "#fff" : "#1a1a24",
          padding: "clamp(25px, 4vw, 40px)",
          borderRadius: "16px",
          maxWidth: "clamp(200px, 85vw, 480px)",
          width: "90%",
          maxHeight: "90vh",
          overflowY: "auto",
          position: "relative",
          boxShadow: isDarkMode
            ? "0 12px 40px rgba(255,255,255,0.12)"
            : "0 12px 40px rgba(0,0,0,0.35)",
          border: `1px solid ${isDarkMode ? "#444" : "#e5e7eb"}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "none",
            border: "none",
            fontSize: "clamp(20px,4vw,28px)",
            cursor: "pointer",
            color: isDarkMode ? "#aaa" : "#6b7280",
            fontWeight: "bold",
          }}
          onClick={onClose}
          aria-label="Close modal"
        >
          ×
        </button>
        <div style={{ marginTop: "clamp(8px,2vw,16px)" }}>{children}</div>
      </div>
    </div>
  );
}

// Spinner component
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

export default function DailyTasks() {
  if (!window.globalPeopleCache) window.globalPeopleCache = [];
  if (!window.globalCacheTimestamp) window.globalCacheTimestamp = 0;

  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";

  const { user, authFetch } = useContext(AuthContext);

  const [tasks, setTasks] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddTypeModalOpen, setIsAddTypeModalOpen] = useState(false);
  const [formType, setFormType] = useState("");
  const [dateRange, setDateRange] = useState("today");
  const [filterType, setFilterType] = useState("all");
  const [newTaskTypeName, setNewTaskTypeName] = useState("");
  const [addingTaskType, setAddingTaskType] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingPeople, setIsLoadingPeople] = useState(false);
  const [isEditTypeModalOpen, setIsEditTypeModalOpen] = useState(false);
  const [editTaskTypeName, setEditTaskTypeName] = useState("");
  const [updatingTaskType, setUpdatingTaskType] = useState(false);
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [selectedTypeToManage, setSelectedTypeToManage] = useState(null);
  const isAdmin = user?.role?.toLowerCase() === "admin";

  const [deletingTaskType, setDeletingTaskType] = useState(false);
  const API_URL = `${import.meta.env.VITE_BACKEND_URL}`;

  const getCurrentDateTime = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localDate = new Date(now.getTime() - offset * 60000);
    return localDate.toISOString().slice(0, 16);
  };

  const getInitialTaskData = () => ({
    taskType: "",
    recipient: null,
    recipientDisplay: "",
    assignedTo: user ? `${user.name || ""} ${user.surname || ""}`.trim() : "",
    assignedEmail: user?.email || "",
    dueDate: getCurrentDateTime(),
    status: "Open",
    taskStage: "Open",
  });

  const [taskData, setTaskData] = useState(getInitialTaskData());
  const [searchResults, setSearchResults] = useState([]);
  const [assignedResults, setAssignedResults] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [allPeople, setAllPeople] = useState(window.globalPeopleCache || []);
  const isFetchingRef = useRef(false);
  const peopleFetchPromiseRef = useRef(null);
  const fetchPeopleDebounceRef = useRef(null);
  const RECIPIENT_DEBOUNCE = 100;
  const PEOPLE_TOAST_ID = "loading-people";
  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  };

  const isSameDay = (date1, date2) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  const isDateInRange = (date, startDate, endDate) => {
    return date >= startDate && date <= endDate;
  };

  const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const getEndOfWeek = (date) => {
    const start = getStartOfWeek(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
  };

  const getStartOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  };

  const getEndOfMonth = (date) => {
    return new Date(
      date.getFullYear(),
      date.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const fetchTaskTypes = async () => {
    try {
      const res = await authFetch(`${API_URL}/tasktypes`);
      if (!res.ok) throw new Error("Failed to fetch task types");
      const data = await res.json();
      setTaskTypes(Array.isArray(data) ? data : data.taskTypes || []);
    } catch (err) {
      console.error("Error fetching task types:", err.message);
      toast.error(err.message);
    }
  };

  const createTaskType = async () => {
    if (!newTaskTypeName.trim()) {
      toast.warning("Please enter a task type name");
      return;
    }
    setAddingTaskType(true);
    try {
      const res = await authFetch(`${API_URL}/tasktypes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTaskTypeName.trim() }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Failed to create task type");
      setTaskTypes([...taskTypes, data.taskType || data]);
      setNewTaskTypeName("");
      setIsAddTypeModalOpen(false);
    } catch (err) {
      console.error("Error creating task type:", err.message);
      toast.error("Failed to create task type: " + err.message);
    } finally {
      setAddingTaskType(false);
    }
  };
  const updateTaskType = async () => {
    if (!selectedTypeToManage) {
      toast.error("No task type selected");
      return;
    }

    const taskTypeId = selectedTypeToManage._id || selectedTypeToManage.id;
    if (!taskTypeId) {
      toast.error("Missing task type ID");
      return;
    }

    const newName = editTaskTypeName.trim();
    if (!newName) {
      toast.warning("Please enter a task type name");
      return;
    }

    if (newName === selectedTypeToManage.name) {
      toast.info("No changes to save");
      setIsEditTypeModalOpen(false);
      return;
    }

    setUpdatingTaskType(true);

    try {
      const res = await authFetch(`${API_URL}/tasktypes/${taskTypeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to update task type");
      }

      setTaskTypes((prev) =>
        prev.map((t) => {
          const tid = t._id || t.id;
          if (tid === taskTypeId) {
            return { ...t, name: newName };
          }
          return t;
        }),
      );

      toast.success("Task type updated!");

      setIsEditTypeModalOpen(false);
      setTypeMenuOpen(false);
      setSelectedTypeToManage(null);
      setEditTaskTypeName("");
    } catch (err) {
      console.error("Update error:", err);
      toast.error(err.message || "Could not update task type");
    } finally {
      setUpdatingTaskType(false);
    }
  };

  const deleteTaskType = async (taskTypeId) => {
    if (!taskTypeId || typeof taskTypeId !== "string") {
      toast.error("No valid task type ID provided");
      console.warn("Invalid ID passed to deleteTaskType:", taskTypeId);
      return;
    }

    console.log("Deleting TaskType ID:", taskTypeId);

    setDeletingTaskType(true);

    try {
      const res = await authFetch(`${API_URL}/tasktypes/${taskTypeId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      console.log("Delete response:", data);
      console.log("Delete status:", res.status);

      if (!res.ok) {
        throw new Error(data.message || "Failed to delete task type");
      }

      toast.success("Task type deleted!");

      setTaskTypes((prev) =>
        prev.filter((t) => (t._id || t.id) !== taskTypeId),
      );

      setTypeMenuOpen(false);
      setSelectedTypeToManage(null);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Error deleting task type");
    } finally {
      setDeletingTaskType(false);
    }
  };

  const fetchUserTasks = useCallback(async () => {
    if (!user?.email) return;
    const controller = new AbortController();
    const signal = controller.signal;

    try {
      setLoading(true);
      const res = await authFetch(
        `${API_URL}/tasks?email=${encodeURIComponent(user.email)}`,
        { signal },
      );
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const data = await res.json();
      const tasksArray = Array.isArray(data) ? data : data.tasks || [];

      const normalizedTasks = tasksArray.map((task) => {
        const isConsolidation =
          task.taskType === "consolidation" || task.is_consolidation_task;
        let assignedTo = "";
        if (isConsolidation) {
          assignedTo =
            task.leader_name ||
            task.leader_assigned ||
            task.assigned_to ||
            `${user.name || ""} ${user.surname || ""}`.trim();
          if (assignedTo.includes("@")) assignedTo = "Consolidation Leader";
        } else {
          assignedTo = task.name || task.assignedfor || "";
        }

        let recipientId = task.recipient_id || task.assignedfor_id || null;
        if (!recipientId && task.assignedfor_email) {
          const matchedPerson = window.globalPeopleCache?.find(
            (p) =>
              p.email.toLowerCase() === task.assignedfor_email.toLowerCase(),
          );
          recipientId = matchedPerson?._id || null;
        }

        return {
          ...task,
          assignedTo,
          recipientId,
          date: task.date || task.followup_date,
          status: (task.status || "Open").toLowerCase(),
          taskName: task.name || task.taskName,
          type:
            task.type ||
            (task.taskType?.toLowerCase()?.includes("visit")
              ? "visit"
              : "call") ||
            "call",
          leader_name: task.leader_name || task.leader_assigned,
          leader_assigned: task.leader_assigned,
          consolidation_name:
            task.consolidation_name ||
            (isConsolidation
              ? `${task.person_name || ""} ${task.person_surname || ""} - ${task.decision_display_name || "Consolidation"}`
              : task.name),
          decision_display_name: task.decision_display_name,
          is_consolidation_task: isConsolidation,
        };
      });

      const myTasks = normalizedTasks.filter((task) => {
        const isMyTask =
          task.assignedfor === user.email ||
          task.assigned_to_email === user.email;
        const isAssignedToSomeoneElse =
          task.assignedfor &&
          task.assignedfor !== user.email &&
          task.assigned_to_email !== user.email;
        return isMyTask && !isAssignedToSomeoneElse;
      });

      setTasks(myTasks);
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Error fetching user tasks:", err.message);
      }
    } finally {
      if (!signal.aborted) setLoading(false);
    }

    return () => controller.abort();
  }, [user, authFetch, API_URL]);

  const pollIntervalRef = useRef(null);

  const pollUntilCacheComplete = useCallback(
    (mapPerson) => {
      // Clear any existing poll
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

      let attempts = 0;
      const MAX_ATTEMPTS = 30; // 30 * 2s = 60s max

      pollIntervalRef.current = setInterval(async () => {
        attempts++;
        try {
          const res = await authFetch(`${API_URL}/cache/people/status`);
          if (!res?.ok) return;
          const status = await res.json();

          const isComplete = status?.is_complete ?? false;
          const progress = status?.cache?.load_progress ?? 0;

          // Fetch latest partial data if progressing
          if (progress > 0) {
            const dataRes = await authFetch(`${API_URL}/cache/people`);
            if (dataRes?.ok) {
              const data = await dataRes.json();
              const rawPeople = data?.cached_data || [];
              if (rawPeople.length > 0) {
                const mapped = rawPeople.map(mapPerson);
                window.globalPeopleCache = mapped;
                window.globalCacheTimestamp = Date.now();
                setAllPeople(mapped);
              }
            }
          }

          // Done — stop polling, hide banner
          if (isComplete || attempts >= MAX_ATTEMPTS) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            setIsLoadingPeople(false);
          }
        } catch (err) {
          console.error("Poll error:", err);
          if (attempts >= MAX_ATTEMPTS) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            setIsLoadingPeople(false);
          }
        }
      }, 2000); // poll every 2 seconds
    },
    [API_URL, authFetch],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (fetchPeopleDebounceRef.current)
        clearTimeout(fetchPeopleDebounceRef.current);
    };
  }, []);

  // Fix fetchAllPeople — add finally safety and prevent re-entry properly

  const fetchAllPeople = useCallback(
    async (forceRefresh = false) => {
      const now = Date.now();

      // Cache still valid — use it
      if (
        !forceRefresh &&
        window.globalPeopleCache?.length > 0 &&
        window.globalCacheTimestamp &&
        now - window.globalCacheTimestamp < CACHE_DURATION
      ) {
        setAllPeople(window.globalPeopleCache);
        return window.globalPeopleCache;
      }

      if (isFetchingRef.current && peopleFetchPromiseRef.current) {
        return await peopleFetchPromiseRef.current;
      }
      if (isFetchingRef.current) return window.globalPeopleCache || [];

      isFetchingRef.current = true;
      setIsLoadingPeople(true);

      peopleFetchPromiseRef.current = (async () => {
        try {
          const mapPerson = (raw) => {
            const name = (raw.Name || raw.name || "").toString().trim();
            const surname = (raw.Surname || raw.surname || "")
              .toString()
              .trim();
            return {
              _id: (raw._id || raw.id || "").toString(),
              name,
              surname,
              email: (raw.Email || raw.email || "").toString().trim(),
              phone: (raw.Number || raw.phone || raw.Phone || "")
                .toString()
                .trim(),
              fullNameLower: `${name} ${surname}`.toLowerCase().trim(),
            };
          };

          // Single request to /cache/people
          const res = await authFetch(`${API_URL}/cache/people`);
          if (!res?.ok) throw new Error("Failed to fetch people cache");
          const data = await res.json();

          const rawPeople = data?.cached_data || [];
          const isComplete = data?.is_complete ?? true;

          // Load whatever we have immediately
          if (rawPeople.length > 0) {
            const mapped = rawPeople.map(mapPerson);
            window.globalPeopleCache = mapped;
            window.globalCacheTimestamp = Date.now();
            setAllPeople(mapped);

            // If backend is still loading, poll until complete
            if (!isComplete) {
              pollUntilCacheComplete(mapPerson);
            } else {
              setIsLoadingPeople(false);
            }

            return mapped;
          }

          // Cache empty on backend — poll for it
          pollUntilCacheComplete(mapPerson);
          return [];
        } catch (err) {
          console.error("Fetch people error:", err);
          setIsLoadingPeople(false);
          return window.globalPeopleCache || [];
        } finally {
          isFetchingRef.current = false;
          peopleFetchPromiseRef.current = null;
        }
      })();

      return await peopleFetchPromiseRef.current;
    },
    [API_URL, authFetch],
  );

  useEffect(() => {
    if (!user) return;
    if (window.globalPeopleCache?.length > 0 && allPeople.length === 0) {
      setAllPeople(window.globalPeopleCache);
    }
    if (
      (!window.globalPeopleCache || window.globalPeopleCache.length === 0) &&
      !isFetchingRef.current
    ) {
      fetchAllPeople(false).catch(() => {});
    }
  }, [user, fetchAllPeople]);

  // === SEARCH PEOPLE FUNCTION (exactly as you requested, but safer) ===
  const searchPeople = useCallback((peopleList, searchValue) => {
    if (!searchValue?.trim() || !Array.isArray(peopleList)) return [];
    const searchLower = searchValue.toLowerCase().trim();
    return peopleList.filter(
      (person) =>
        (person.fullNameLower || "").includes(searchLower) ||
        (person.email || "").toLowerCase().includes(searchLower) ||
        (person.phone || "").toLowerCase().includes(searchLower),
    );
  }, []);

  // === FETCH PEOPLE (fixed argument passing) ===
  // Fix fetchPeople — use cache directly, don't re-fetch if cache exists
  const fetchPeople = useCallback(
    async (q) => {
      if (!q?.trim() || q.trim().length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);

      try {
        // Cache ready — search instantly, no network
        const localSource =
          window.globalPeopleCache?.length > 0
            ? window.globalPeopleCache
            : allPeople;

        if (localSource.length > 0) {
          const results = searchPeople(localSource, q);
          setSearchResults(results.slice(0, 50));
          return;
        }

        // Cache empty — hit /people/search-fast directly
        const res = await authFetch(
          `${API_URL}/people/search-fast?query=${encodeURIComponent(q.trim())}&limit=25`,
        );

        if (res.ok) {
          const data = await res.json();
          const mapped = (data.results || []).map((raw) => ({
            _id: raw._id,
            name: raw.Name || "",
            surname: raw.Surname || "",
            email: raw.Email || "",
            phone: raw.Number || "",
            fullNameLower: (raw.FullName || `${raw.Name} ${raw.Surname}`)
              .toLowerCase()
              .trim(),
          }));
          setSearchResults(mapped);
        }
      } catch (err) {
        console.error("Search error:", err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [allPeople, searchPeople, authFetch, API_URL],
  );

  // === FETCH ASSIGNED (fixed argument passing) ===
  const fetchAssigned = useCallback(
  async (q) => {
    if (!q?.trim()) {
      setAssignedResults([]);
      return;
    }

    const localSource =
      window.globalPeopleCache?.length > 0
        ? window.globalPeopleCache
        : allPeople;

    if (localSource.length > 0) {
      const results = searchPeople(localSource, q.trim());
      setAssignedResults(results.slice(0, 50));
    } else {
      setAssignedResults([]);
    }
  },
  [allPeople, searchPeople],
  // No fetchAllPeople dependency — cache only
);

  // === HANDLE RECIPIENT INPUT (fixed argument passing + minor safety) ===
  // Fix handleRecipientInput — don't call fetchPeople if cache exists
  const handleRecipientInput = useCallback(
    (value) => {
      setTaskData((prev) => ({
        ...prev,
        recipientDisplay: value,
        recipient: null,
      }));

      if (!value?.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      // Cache ready — instant local search
      const localSource =
        window.globalPeopleCache?.length > 0
          ? window.globalPeopleCache
          : allPeople;

      if (localSource.length > 0) {
        const quick = searchPeople(localSource, value);
        setSearchResults(quick.slice(0, 50));
        setIsSearching(false);
        return;
      }

      // Cache not ready — fire search-fast immediately after 2 chars
      // Don't show "loading" banner, just search
      if (value.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      if (fetchPeopleDebounceRef.current)
        clearTimeout(fetchPeopleDebounceRef.current);
      fetchPeopleDebounceRef.current = setTimeout(
        () => fetchPeople(value),
        250,
      );
    },
    [allPeople, searchPeople, fetchPeople],
  );

  const createTask = async (taskPayload) => {
    try {
      const res = await authFetch(`${API_URL}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskPayload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create task");

      if (data.task) {
        const isAssignedToMe =
          data.task.assignedfor === user.email ||
          data.task.assigned_to_email === user.email;

        // Only add to local state if assigned to current user
        if (isAssignedToMe) {
          setTasks((prev) => [
            {
              ...data.task,
              assignedTo: data.task.name || `${user.name} ${user.surname}`,
              date: data.task.followup_date,
              status: (data.task.status || "Open").toLowerCase(),
              taskName: data.task.name,
              type: data.task.type,
            },
            ...prev,
          ]);
        }
      }
      return data;
    } catch (err) {
      console.error("Error creating task:", err.message);
      throw err;
    }
  };

  useEffect(() => {
    if (user && !loading) {
      fetchUserTasks();
      fetchTaskTypes();
    }
  }, [user]);

  const handleOpen = (type) => {
    setFormType(type);
    setIsModalOpen(true);
    setTaskData(getInitialTaskData());
    setSearchResults([]);
    setAssignedResults([]);
    setSelectedTask({});
    if (
      (!window.globalPeopleCache || window.globalPeopleCache.length === 0) &&
      !isFetchingRef.current
    ) {
      toast.info("Loading people…", {
        toastId: PEOPLE_TOAST_ID,
        autoClose: false,
      });
      fetchAllPeople(false)
        .then(() => toast.dismiss(PEOPLE_TOAST_ID))
        .catch(() => toast.dismiss(PEOPLE_TOAST_ID));
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setTaskData(getInitialTaskData());
    setSearchResults([]);
    setAssignedResults([]);
    setSelectedTask({});
    setFormType("");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTaskData({ ...taskData, [e.target.name]: e.target.value });
  };

  const updateTask = async (taskId, updatedData) => {
    try {
      const isConsolidationTask =
        selectedTask?.taskType === "consolidation" ||
        selectedTask?.is_consolidation_task;

      if (isConsolidationTask) {
        updatedData.name = selectedTask.leader_name || selectedTask.name;
        updatedData.leader_name = selectedTask.leader_name;
        updatedData.leader_assigned = selectedTask.leader_assigned;
      }

      if (updatedData.status?.toLowerCase() === "completed") {
        updatedData.completedAt = new Date().toISOString();
      }

      const res = await authFetch(`${API_URL}/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update task");

      setTasks((prev) =>
        prev.map((t) =>
          t._id === taskId
            ? {
                ...t,
                ...data.updatedTask,
                date: data.updatedTask.followup_date,
                ...(isConsolidationTask && {
                  leader_name: selectedTask.leader_name,
                  leader_assigned: selectedTask.leader_assigned,
                }),
              }
            : t,
        ),
      );
      handleClose();
    } catch (err) {
      console.error("Error updating task:", err.message);
      toast.error("Failed to update task: " + err.message);
    }
  };

  const handleEdit = (task) => {
    if (task.status?.toLowerCase() === "completed") {
      toast.info(
        "This task has been marked as completed and cannot be edited.",
      );
      return;
    }

    setSelectedTask(task);
    setFormType(task.type);
    setIsModalOpen(true);

    const nameParts = (task.contacted_person?.name || "").split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    setTaskData({
      taskType:
        taskTypes.find((t) => (t._id || t.id) === task.taskType)?.name ||
        task.taskType ||
        "",
      recipient: {
        Name: firstName,
        Surname: lastName,
        Phone:
          task.contacted_person?.phone || task.contacted_person?.Number || "",
        Email: task.contacted_person?.email || "",
      },
      recipientDisplay: task.contacted_person?.name || "",
      assignedTo:task.assignedTo || (user ? `${user.name} ${user.surname}` : ""),
      assignedEmail: task.assignedfor || user?.email || "",
      dueDate: formatDateTime(task.date),
      status: task.status,
      taskStage: task.status,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (!user?.id) throw new Error("Logged-in user ID not found");

      const person = taskData.recipient;
      if (!person || !person.Name) {
        throw new Error(
          "Person details not found. Please select a valid recipient.",
        );
      }

      const isConsolidationTask =
        selectedTask?.taskType === "consolidation" ||
        selectedTask?.is_consolidation_task;

      const taskPayload = {
        memberID: user.id,
        name: isConsolidationTask
          ? taskData.assignedTo
          : taskData.assignedTo || (user ? `${user.name} ${user.surname}` : ""),
        taskType:
          taskTypes.find((t) => (t._id || t.id) === taskData.taskType)?.name ||
          taskData.taskType ||
          (isConsolidationTask
            ? "consolidation"
            : formType === "call"
              ? "Call Task"
              : "Visit Task"),
        contacted_person: {
          name: `${person.Name} ${person.Surname || ""}`.trim(),
          phone: person.Phone || person.Number || "",
          email: person.Email || "",
        },
        followup_date: new Date(taskData.dueDate).toISOString(),
        status: taskData.taskStage || "Open",
        type: formType || "call",
        assignedfor: taskData.assignedEmail || user.email,
        assigned_to_email: taskData.assignedEmail || user.email,
        created_by_email: user.email,
        created_by_name: `${user.name} ${user.surname}`.trim(),
      };

      if (isConsolidationTask) {
        taskPayload.leader_name =
          selectedTask.leader_name || taskData.assignedTo;
        taskPayload.leader_assigned =
          selectedTask.leader_assigned || taskData.assignedTo;
        taskPayload.is_consolidation_task = true;
      }

      if (selectedTask && selectedTask._id) {
        await updateTask(selectedTask._id, taskPayload);
        toast.info(
          `Task for ${person.Name} ${person.Surname} updated successfully!`,
        );
      } else {
        await createTask(taskPayload);

        const isAssignedToSomeoneElse =
          taskData.assignedEmail &&
          taskData.assignedEmail.toLowerCase() !== user.email.toLowerCase();

        if (isAssignedToSomeoneElse) {
          toast.success(
            `You have successfully assigned a task to ${taskData.assignedTo} for ${person.Name} ${person.Surname}`,
          );
        } else {
          toast.success(
            `You have successfully captured ${person.Name} ${person.Surname}`,
          );
        }
      }
      handleClose();
    } catch (err) {
      console.error("Error adding task:", err.message);
      toast.error("Failed to create task: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTasks = tasks.filter((task) => {
    const taskDate = parseDate(task.date);
    if (!taskDate) return false;
    let matchesType =
      filterType === "all" ||
      task.type === filterType ||
      (filterType === "consolidation" && task.taskType === "consolidation");
    let matchesDate = true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dateRange === "today") {
      matchesDate = isSameDay(taskDate, today);
    } else if (dateRange === "thisWeek") {
      const startOfWeek = getStartOfWeek(today);
      const endOfWeek = getEndOfWeek(today);
      matchesDate = isDateInRange(taskDate, startOfWeek, endOfWeek);
    } else if (dateRange === "thisMonth") {
      const startOfMonth = getStartOfMonth(today);
      const endOfMonth = getEndOfMonth(today);
      matchesDate = isDateInRange(taskDate, startOfMonth, endOfMonth);
    } else if (dateRange === "previous7") {
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      const endOfToday = new Date(today);
      endOfToday.setHours(23, 59, 59, 999);
      matchesDate = isDateInRange(taskDate, sevenDaysAgo, endOfToday);
    } else if (dateRange === "previousWeek") {
      const lastWeekDate = new Date(today);
      lastWeekDate.setDate(today.getDate() - 7);
      const startOfLastWeek = getStartOfWeek(lastWeekDate);
      const endOfLastWeek = getEndOfWeek(lastWeekDate);
      matchesDate = isDateInRange(taskDate, startOfLastWeek, endOfLastWeek);
    } else if (dateRange === "previousMonth") {
      const lastMonthDate = new Date(today);
      lastMonthDate.setMonth(today.getMonth() - 1);
      const startOfLastMonth = getStartOfMonth(lastMonthDate);
      const endOfLastMonth = getEndOfMonth(lastMonthDate);
      matchesDate = isDateInRange(taskDate, startOfLastMonth, endOfLastMonth);
    }

    return matchesType && matchesDate;
  });

  const downloadFilteredTasks = () => {
    try {
      if (!filteredTasks || filteredTasks.length === 0) {
        toast.info("No data to download.");
        return;
      }

      const formattedTasks = filteredTasks.map((task) => ({
        "Member ID": task.memberID || user.id || "",
        Name: task.name || user.name || "",
        "Task Type": task.taskType || "",
        "Contact Person": task.contacted_person?.name || "",
        "Contact Phone":
          task.contacted_person?.phone || task.contacted_person?.Number || "",
        "Contact Email": task.contacted_person?.email || "",
        "Follow-up Date": task.followup_date
          ? new Date(task.followup_date).toLocaleString()
          : "",
        Status: task.status || "",
        Type: task.type || "",
        "Assigned For": task.assignedfor || user.email || "",
      }));

      const headers = Object.keys(formattedTasks[0]);

      const columnWidths = headers.map((header) => {
        let maxLength = header.length;
        formattedTasks.forEach((task) => {
          const value = String(task[header] || "");
          if (value.length > maxLength) {
            maxLength = value.length;
          }
        });
        return Math.min(Math.max(maxLength * 7 + 5, 65), 350);
      });

      let html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
          <head>
            <meta charset="utf-8">
            <!--[if gte mso 9]>
            <xml>
              <x:ExcelWorkbook>
                <x:ExcelWorksheets>
                  <x:ExcelWorksheet>
                    <x:Name>Filtered Tasks</x:Name>
                    <x:WorksheetOptions>
                      <x:DisplayGridlines/>
                    </x:WorksheetOptions>
                    <x:WorksheetColumns>
      ${columnWidths.map((width, index) => `                    <x:Column ss:Index="${index + 1}" ss:AutoFitWidth="0" ss:Width="${width}"/>`).join("\n")}
                    </x:WorksheetColumns>
                  </x:ExcelWorksheet>
                </x:ExcelWorksheets>
              </x:ExcelWorkbook>
            </xml>
            <![endif]-->
            <style>
              table {
                border-collapse: collapse;
                width: 100%;
                font-family: Calibri, Arial, sans-serif;
              }
              th {
                background-color: #a3aca3ff;
                color: white;
                font-weight: bold;
                padding: 12px 8px;
                text-align: center;
                border: 1px solid #ddd;
                font-size: 11pt;
                white-space: nowrap;
              }
              td {
                padding: 8px;
                border: 1px solid #ddd;
                font-size: 10pt;
                text-align: left;
              }
              tr:nth-child(even) {
                background-color: #f2f2f2;
              }
            </style>
          </head>
          <body>
            <table border="1">
              <thead>
                <tr>
      `;

      headers.forEach((header) => {
        html += `                <th>${header}</th>\n`;
      });

      html += `              </tr>\n            </thead>\n            <tbody>\n`;

      formattedTasks.forEach((task) => {
        html += `              <tr>\n`;
        headers.forEach((header) => {
          const value = task[header] || "";
          html += `                <td>${value}</td>\n`;
        });
        html += `              </tr>\n`;
      });

      html += `            </tbody>
            </table>
          </body>
        </html>`;

      const blob = new Blob([html], {
        type: "application/vnd.ms-excel;charset=utf-8;",
      });

      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      const fileName = `filtered_tasks_${user?.name || "user"}_${new Date().toISOString().split("T")[0]}.xls`;

      link.href = url;
      link.download = fileName;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);

      console.log("Download successful!");
    } catch (error) {
      console.error("Error downloading Excel file:", error);
      toast.error("Error creating Excel file: " + error.message);
    }
  };

  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const count = filteredTasks.filter(
      (t) =>
        (t.status || "").toLowerCase() === "completed" ||
        (t.status || "").toLowerCase() === "awaiting task",
    ).length;

    setTotalCount(count);
  }, [filteredTasks]);

  useEffect(() => {
    if (!user) return;

    const handleTaskUpdated = (event) => {
      console.log("Task updated event received:", event.detail);
      fetchUserTasks();

      if (event.detail?.action === "tasksDeleted") {
        toast.info(`${event.detail.count} task(s) removed`);
      } else if (event.detail?.action === "consolidationCreated") {
        toast.info("New consolidation task added");
      }
    };

    window.addEventListener("taskUpdated", handleTaskUpdated);

    return () => {
      window.removeEventListener("taskUpdated", handleTaskUpdated);
    };
  }, [user]);

  // Whether people are still being loaded for the first time
  const peopleNotLoadedYet =
    (!window.globalPeopleCache || window.globalPeopleCache.length === 0) &&
    allPeople.length === 0;

  return (
    <div
      style={{
        height: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        backgroundColor: isDarkMode ? "#1e1e1e" : "#f8f9fa",
        paddingTop: "5rem",
      }}
    >
      {/* Header section */}
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "16px 16px 0 16px",
          width: "100%",
          flexShrink: 0,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            backgroundColor: isDarkMode ? "#1e1e1e" : "#ffffff",
            color: isDarkMode ? "#fff" : "#1a1a24",
            borderRadius: "16px",
            padding: "24px 16px",
            textAlign: "center",
            boxShadow: isDarkMode
              ? "0 2px 8px rgba(255,255,255,0.1)"
              : "0 4px 24px rgba(0, 0, 0, 0.08)",
            border: `1px solid ${isDarkMode ? "#444" : "#e5e7eb"}`,
          }}
        >
          <h1
            style={{
              fontSize: "clamp(48px, 8vw, 72px)",
              fontWeight: "700",
              margin: 0,
              letterSpacing: "-2px",
              lineHeight: "1.2",
            }}
          >
            {totalCount}
          </h1>
          <p
            style={{
              marginTop: "8px",
              fontSize: "14px",
              letterSpacing: "1px",
              textTransform: "uppercase",
              color: isDarkMode ? "#aaa" : "#6b7280",
              fontWeight: "600",
            }}
          >
            Tasks Complete
          </p>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "12px",
              marginTop: "24px",
              flexWrap: "wrap",
            }}
          >
            <button
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                backgroundColor: isDarkMode ? "#fff" : "#000",
                color: isDarkMode ? "#000" : "#fff",
                fontWeight: "600",
                padding: "12px 20px",
                borderRadius: "10px",
                border: "none",
                cursor: "pointer",
                fontSize: "14px",
                boxShadow: isDarkMode
                  ? "0 2px 8px rgba(18, 163, 37, 0.1)"
                  : "0 4px 24px rgba(0, 0, 0, 0.08)",
                width: "140px",
                minHeight: "44px",
              }}
              onClick={() => handleOpen("call")}
            >
              <Phone size={18} /> Call Task
            </button>
            <button
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                backgroundColor: isDarkMode ? "#fff" : "#000",
                color: isDarkMode ? "#000" : "#fff",
                fontWeight: "600",
                padding: "12px 20px",
                borderRadius: "10px",
                border: "none",
                cursor: "pointer",
                fontSize: "14px",
                boxShadow: isDarkMode
                  ? "0 2px 8px rgba(255,255,255,0.1)"
                  : "0 4px 24px rgba(0, 0, 0, 0.08)",
                width: "140px",
                minHeight: "44px",
              }}
              onClick={() => handleOpen("visit")}
            >
              <UserPlus size={18} /> Visit Task
            </button>

            {isAdmin && (
              <button
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  backgroundColor: isDarkMode ? "#fff" : "#000",
                  color: isDarkMode ? "#000" : "#fff",
                  fontWeight: "600",
                  padding: "12px 20px",
                  borderRadius: "10px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "14px",
                  boxShadow: isDarkMode
                    ? "0 2px 8px rgba(255,255,255,0.1)"
                    : "0 4px 24px rgba(0, 0, 0, 0.08)",
                  width: "140px",
                  minHeight: "44px",
                }}
                onClick={() => {
                  console.log(
                    "New Task Type button clicked – setter exists:",
                    !!setNewTaskTypeName,
                  );
                  setIsAddTypeModalOpen(true);
                  setNewTaskTypeName("");
                }}
              >
                <Plus size={18} /> New Task Type
              </button>
            )}
          </div>

          <div style={{ marginTop: "20px" }}>
            <select
              style={{
                padding: "10px 16px",
                borderRadius: "10px",
                border: `2px solid ${isDarkMode ? "#444" : "#e5e7eb"}`,
                backgroundColor: isDarkMode ? "#2d2d2d" : "#f3f4f6",
                color: isDarkMode ? "#fff" : "#1a1a24",
                fontSize: "14px",
                cursor: "pointer",
                fontWeight: "500",
                outline: "none",
                width: "100%",
                maxWidth: "280px",
              }}
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="today">Today</option>
              <option value="thisWeek">This Week</option>
              <option value="thisMonth">This Month</option>
              <option value="previousWeek">Previous Week</option>
              <option value="previousMonth">Previous Month</option>
            </select>
          </div>

          <div style={{ marginTop: "12px" }}>
            <button
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                backgroundColor: isDarkMode ? "#fff" : "#000",
                color: isDarkMode ? "#000" : "#fff",
                fontWeight: "600",
                padding: "12px 20px",
                borderRadius: "10px",
                border: "none",
                cursor: "pointer",
                fontSize: "14px",
                boxShadow: isDarkMode
                  ? "0 2px 8px rgba(255,255,255,0.1)"
                  : "0 4px 24px rgba(0, 0, 0, 0.08)",
                width: "100%",
                maxWidth: "280px",
                margin: "0 auto",
              }}
              onClick={downloadFilteredTasks}
            >
              Download Filtered Tasks
            </button>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "8px",
            marginTop: "20px",
            flexWrap: "wrap",
            overflowX: "auto",
            paddingBottom: "8px",
          }}
        >
          {["all", "call", "visit", "consolidation"].map((type) => (
            <button
              key={type}
              style={{
                padding: "8px 16px",
                borderRadius: "20px",
                border:
                  filterType === type
                    ? "none"
                    : `2px solid ${isDarkMode ? "#444" : "#e5e7eb"}`,
                fontWeight: "600",
                cursor: "pointer",
                backgroundColor:
                  filterType === type
                    ? isDarkMode
                      ? "#fff"
                      : "#000"
                    : isDarkMode
                      ? "#2d2d2d"
                      : "#ffffff",
                color:
                  filterType === type
                    ? isDarkMode
                      ? "#000"
                      : "#fff"
                    : isDarkMode
                      ? "#fff"
                      : "#1a1a24",
                fontSize: "13px",
                boxShadow:
                  filterType === type
                    ? isDarkMode
                      ? "0 2px 8px rgba(255,255,255,0.1)"
                      : "0 4px 24px rgba(0, 0, 0, 0.08)"
                    : "none",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
              onClick={() => setFilterType(type)}
            >
              {type === "all"
                ? "All"
                : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Task list container */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 16px 16px 16px",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div style={{ marginTop: "16px" }}>
          {loading ? (
            <p
              style={{
                textAlign: "center",
                color: isDarkMode ? "#aaa" : "#6b7280",
                fontStyle: "italic",
                padding: "20px",
              }}
            >
              Loading tasks...
            </p>
          ) : filteredTasks.length === 0 ? (
            <p
              style={{
                textAlign: "center",
                color: isDarkMode ? "#aaa" : "#6b7280",
                padding: "20px",
              }}
            >
              No tasks yet.
            </p>
          ) : (
            filteredTasks.map((task) => {
              const recipientName = task.contacted_person?.name || "";

              const isConsolidation =
                task.taskType === "consolidation" || task.is_consolidation_task;

              const assignedDisplay = task.assignedTo || "";

              const sourceDisplay = task.source_display || "Manual";

              return (
                <div
                  key={task._id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    backgroundColor: isDarkMode ? "#1e1e1e" : "#ffffff",
                    padding: "16px",
                    borderRadius: "12px",
                    border: `1px solid ${isDarkMode ? "#444" : "#e5e7eb"}`,
                    marginBottom: "10px",
                    cursor: "pointer",
                    boxShadow: isDarkMode
                      ? "0 2px 8px rgba(255,255,255,0.1)"
                      : "0 4px 24px rgba(0, 0, 0, 0.08)",
                  }}
                >
                  <div
                    style={{
                      cursor: "pointer",
                      flex: 1,
                      minWidth: 0,
                    }}
                    onClick={() => handleEdit(task)}
                  >
                    <p
                      style={{
                        fontWeight: "700",
                        color: isDarkMode ? "#fff" : "#1a1a24",
                        margin: "0 0 4px 0",
                        fontSize: "15px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {recipientName || "No recipient"}
                    </p>

                    <p
                      style={{
                        fontSize: "13px",
                        color: isDarkMode ? "#fff" : "#1a1a24",
                        margin: "0 0 4px 0",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {assignedDisplay || "Not assigned"}
                    </p>

                    {isConsolidation &&
                      sourceDisplay &&
                      sourceDisplay !== "Manual" && (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: "700",
                            backgroundColor:
                              sourceDisplay === "Service"
                                ? "#dcfce7"
                                : sourceDisplay === "Cell"
                                  ? "#fef3c7"
                                  : "#e0e7ff",
                            color:
                              sourceDisplay === "Service"
                                ? "#166534"
                                : sourceDisplay === "Cell"
                                  ? "#92400e"
                                  : "#3730a3",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            display: "inline-block",
                            marginTop: "4px",
                            marginRight: "6px",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                          }}
                        >
                          {sourceDisplay} Consolidation
                        </span>
                      )}

                    {task.isRecurring && (
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: "700",
                          backgroundColor: "#fde047",
                          color: "#854d0e",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          display: "inline-block",
                          marginTop: "6px",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        Recurring
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      textAlign: "right",
                      marginLeft: "12px",
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        padding: "5px 12px",
                        borderRadius: "16px",
                        fontSize: "12px",
                        fontWeight: "600",
                        textTransform: "capitalize",
                        border: "2px solid",
                        cursor: "pointer",
                        backgroundColor:
                          task.status === "open"
                            ? isDarkMode
                              ? "#2d2d2d"
                              : "#ffffff"
                            : task.status === "completed"
                              ? isDarkMode
                                ? "#fff"
                                : "#000"
                              : isDarkMode
                                ? "#3a3a3a"
                                : "#e5e5e5",
                        color:
                          task.status === "open"
                            ? isDarkMode
                              ? "#fff"
                              : "#000"
                            : task.status === "completed"
                              ? isDarkMode
                                ? "#000"
                                : "#fff"
                              : isDarkMode
                                ? "#fff"
                                : "#1a1a24",
                        borderColor:
                          task.status === "open"
                            ? isDarkMode
                              ? "#fff"
                              : "#000"
                            : task.status === "completed"
                              ? isDarkMode
                                ? "#fff"
                                : "#000"
                              : isDarkMode
                                ? "#444"
                                : "#6b7280",
                      }}
                      onClick={() => handleEdit(task)}
                    >
                      {task.status}
                    </span>
                    <div
                      style={{
                        fontSize: "11px",
                        color: isDarkMode ? "#aaa" : "#6b7280",
                        marginTop: "6px",
                        fontWeight: "500",
                      }}
                    >
                      {formatDate(task.date)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {isEditTypeModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.75)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 2000,
          }}
        >
          <div
            style={{
              backgroundColor: isDarkMode ? "#1e1e1e" : "#fff",
              color: isDarkMode ? "#fff" : "#1a1a24",
              padding: "32px",
              borderRadius: "16px",
              width: "90%",
              maxWidth: "480px",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
              position: "relative",
            }}
          >
            <h2 style={{ margin: "0 0 24px 0", textAlign: "center" }}>
              Edit Task Type
            </h2>

            <input
              type="text"
              value={editTaskTypeName}
              onChange={(e) => setEditTaskTypeName(e.target.value)}
              placeholder="Task type name"
              autoFocus
              style={{
                width: "100%",
                padding: "12px 16px",
                fontSize: "16px",
                borderRadius: "10px",
                border: `2px solid ${isDarkMode ? "#555" : "#d1d5db"}`,
                backgroundColor: isDarkMode ? "#2a2a2a" : "#f9fafb",
                color: isDarkMode ? "#fff" : "#111827",
                marginBottom: "24px",
              }}
            />

            <div style={{ display: "flex", gap: "16px" }}>
              <button
                onClick={updateTaskType}
                disabled={updatingTaskType || !editTaskTypeName.trim()}
                style={{
                  flex: 1,
                  padding: "12px",
                  backgroundColor: "#2563eb",
                  color: "white",
                  borderRadius: "10px",
                  border: "none",
                  fontWeight: "600",
                  cursor: updatingTaskType ? "not-allowed" : "pointer",
                  opacity: updatingTaskType ? 0.7 : 1,
                }}
              >
                {updatingTaskType ? "Saving..." : "Save Changes"}
              </button>

              <button
                onClick={() => {
                  setIsEditTypeModalOpen(false);
                  setEditTaskTypeName("");
                }}
                style={{
                  flex: 1,
                  padding: "12px",
                  backgroundColor: "#6b7280",
                  color: "white",
                  borderRadius: "10px",
                  border: "none",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleClose}
        isDarkMode={isDarkMode}
        contentStyle={{
          width: "90%",
          maxWidth: "900px",
          maxHeight: "85vh",
          overflowY: "auto",
          padding: "20px",
          borderRadius: "16px",
          backgroundColor: isDarkMode ? "#1a1a1e" : "#ffffff",
        }}
      >
        <form
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          onSubmit={handleSubmit}
        >
          <h3
            style={{
              fontSize: "20px",
              fontWeight: "bold",
              color: isDarkMode ? "#fff" : "#1a1a24",
              margin: 0,
              textAlign: "center",
            }}
          >
            {selectedTask?.taskType === "consolidation" ||
            selectedTask?.is_consolidation_task
              ? "Consolidation Task"
              : formType === "call"
                ? "Call Task"
                : "Visit Task"}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "600",
                color: isDarkMode ? "#fff" : "#1a1a24",
                marginBottom: "13px",
              }}
            >
              Task Type
            </label>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <select
                name="taskType"
                value={taskData.taskType}
                onChange={handleChange}
                required
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: `2px solid ${isDarkMode ? "#444" : "#e5e7eb"}`,
                  fontSize: "14px",
                  backgroundColor: isDarkMode ? "#2d2d2d" : "#f3f4f6",
                  color: isDarkMode ? "#fff" : "#1a1a24",
                  outline: "none",
                }}
              >
                <option value="">Select a task type</option>
                {taskTypes.map((opt) => (
                  <option key={opt._id || opt.id} value={opt._id || opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>

              {isAdmin && (
                <div style={{ position: "relative" }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!taskData.taskType) {
                        toast.info("Please select a task type first");
                        return;
                      }

                      const selectedValue = taskData.taskType.trim();

                      let selected = taskTypes.find(
                        (t) => String(t._id || t.id) === selectedValue,
                      );

                      if (!selected) {
                        selected = taskTypes.find(
                          (t) => t.name === selectedValue,
                        );
                      }

                      if (!selected) {
                        toast.error("Cannot find the selected task type");
                        return;
                      }

                      setSelectedTypeToManage(selected);
                      setTypeMenuOpen(true);
                    }}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: `2px solid ${isDarkMode ? "#444" : "#e5e7eb"}`,
                      backgroundColor: isDarkMode ? "#2d2d2d" : "#f3f4f6",
                      color: isDarkMode ? "#fff" : "#000",
                      fontWeight: "800",
                      cursor: "pointer",
                      fontSize: "18px",
                      lineHeight: "1",
                    }}
                  >
                    :
                  </button>

                  {typeMenuOpen && selectedTypeToManage && (
                    <div
                      style={{
                        position: "absolute",
                        right: 0,
                        top: "48px",
                        backgroundColor: isDarkMode ? "#1e1e1e" : "#fff",
                        border: `1px solid ${isDarkMode ? "#444" : "#e5e7eb"}`,
                        borderRadius: "10px",
                        width: "160px",
                        boxShadow: isDarkMode
                          ? "0 8px 24px rgba(255,255,255,0.1)"
                          : "0 8px 24px rgba(0,0,0,0.2)",
                        zIndex: 99,
                        overflow: "hidden",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (!selectedTypeToManage) return;
                          setEditTaskTypeName(selectedTypeToManage.name || "");
                          setIsEditTypeModalOpen(true);
                          setTypeMenuOpen(false);
                        }}
                        style={{
                          width: "100%",
                          padding: "12px",
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          textAlign: "left",
                          fontWeight: "600",
                          color: isDarkMode ? "#fff" : "#000",
                        }}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const id =
                            selectedTypeToManage?._id ||
                            selectedTypeToManage?.id;
                          if (!id) {
                            toast.error("Cannot delete — missing task type ID");
                            return;
                          }
                          deleteTaskType(id);
                        }}
                        disabled={deletingTaskType || !selectedTypeToManage}
                        style={{
                          width: "100%",
                          padding: "12px",
                          border: "none",
                          background: "transparent",
                          cursor: deletingTaskType ? "not-allowed" : "pointer",
                          textAlign: "left",
                          fontWeight: "700",
                          color: "#ef4444",
                        }}
                      >
                        {deletingTaskType ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Recipient field with loading state */}
          {/* Recipient field with loading state */}
          <div style={{ position: "relative" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "600",
                color: isDarkMode ? "#fff" : "#1a1a24",
                marginBottom: "6px",
              }}
            >
              Recipient
            </label>

            {/* Banner shown when people haven't loaded yet */}
            {isLoadingPeople && peopleNotLoadedYet && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  backgroundColor: isDarkMode ? "#2a2a2a" : "#f0f9ff",
                  border: `1px solid ${isDarkMode ? "#555" : "#bae6fd"}`,
                  borderRadius: "8px",
                  padding: "10px 14px",
                  marginBottom: "10px",
                  fontSize: "13px",
                  color: isDarkMode ? "#a5b4fc" : "#0369a1",
                  fontWeight: "500",
                }}
              >
                <Spinner size={16} color={isDarkMode ? "#a5b4fc" : "#3b82f6"} />
                Loading people data, please wait…
              </div>
            )}

            <div style={{ position: "relative" }}>
              <input
                type="text"
                name="recipientDisplay"
                value={taskData.recipientDisplay || ""}
                onChange={(e) => handleRecipientInput(e.target.value)}
                autoComplete="off"
                required
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  paddingRight: isSearching ? "44px" : "14px",
                  borderRadius: "10px",
                  border: `2px solid ${isDarkMode ? "#555" : "#e5e7eb"}`,
                  fontSize: "15px",
                  backgroundColor: isDarkMode ? "#2d2d2d" : "#f8fafc",
                  color: isDarkMode ? "#fff" : "#1a1a24",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                placeholder={
                  isLoadingPeople && peopleNotLoadedYet
                    ? "Loading people…"
                    : "Type name to search..."
                }
              />

              {/* Spinner inside input when actively searching */}
              {isSearching && (
                <div
                  style={{
                    position: "absolute",
                    right: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                >
                  <Spinner
                    size={18}
                    color={isDarkMode ? "#94a3b8" : "#64748b"}
                  />
                </div>
              )}
            </div>

            {/* Search results dropdown - NICER STYLING */}
            {searchResults.length > 0 && (
              <ul
                style={{
                  position: "absolute",
                  zIndex: 20,
                  width: "100%",
                  backgroundColor: isDarkMode ? "#1e1e1e" : "#ffffff",
                  border: `2px solid ${isDarkMode ? "#555" : "#e5e7eb"}`,
                  borderRadius: "12px",
                  marginTop: "6px",
                  maxHeight: "260px",
                  overflowY: "auto",
                  listStyle: "none",
                  padding: "6px 0",
                  boxShadow: isDarkMode
                    ? "0 10px 30px rgba(0,0,0,0.6)"
                    : "0 10px 30px rgba(0,0,0,0.15)",
                }}
              >
                {searchResults.map((person) => {
                  const displayName =
                    `${person?.name || ""} ${person?.surname || ""}`.trim();
                  if (!displayName) return null;

                  return (
                    <li
                      key={person._id || Math.random()}
                      style={{
                        padding: "12px 16px",
                        cursor: "pointer",
                        fontSize: "15px",
                        color: isDarkMode ? "#e2e8f0" : "#1e2937",
                        borderBottom: `1px solid ${isDarkMode ? "#333" : "#f1f5f9"}`,
                      }}
                      onClick={() => {
                        setTaskData({
                          ...taskData,
                          recipient: {
                            Name: person.name || "",
                            Surname: person.surname || "",
                            Phone: person.phone || "",
                            Email: person.email || "",
                          },
                          recipientDisplay: displayName,
                        });
                        setSearchResults([]);
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = isDarkMode
                          ? "#334155"
                          : "#f8fafc";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      {displayName}
                    </li>
                  );
                })}
              </ul>
            )}

            {/* No results message */}
            {!isSearching &&
              taskData.recipientDisplay?.trim().length > 2 &&
              searchResults.length === 0 &&
              taskData.recipient === null &&
              !isLoadingPeople && (
                <p
                  style={{
                    fontSize: "13px",
                    color: isDarkMode ? "#94a3b8" : "#64748b",
                    margin: "8px 4px 0",
                    fontStyle: "italic",
                  }}
                >
                  No matching people found.
                </p>
              )}
          </div>

          <div style={{ position: "relative" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "600",
                color: isDarkMode ? "#fff" : "#1a1a24",
                marginBottom: "6px",
              }}
            >
              {selectedTask?.taskType === "consolidation" ||
              selectedTask?.is_consolidation_task
                ? "Leader Assigned"
                : "Assigned To"}
            </label>
            <input
              type="text"
              name="assignedTo"
              value={taskData.assignedTo}
              onChange={(e) => {
                const value = e.target.value;
                setTaskData({
                  ...taskData,
                  assignedTo: value,
                  assignedEmail: "",
                });
                if (
                  !(
                    selectedTask?.taskType === "consolidation" ||
                    selectedTask?.is_consolidation_task
                  )
                ) {
                  fetchAssigned(value);
                }
              }}
              autoComplete="off"
              disabled={
                selectedTask?.taskType === "consolidation" ||
                selectedTask?.is_consolidation_task
              }
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "10px",
                border: `2px solid ${isDarkMode ? "#444" : "#e5e7eb"}`,
                fontSize: "14px",
                backgroundColor: isDarkMode ? "#2d2d2d" : "#f3f4f6",
                color: isDarkMode ? "#fff" : "#1a1a24",
                outline: "none",
                cursor:
                  selectedTask?.taskType === "consolidation" ||
                  selectedTask?.is_consolidation_task
                    ? "not-allowed"
                    : "text",
              }}
              placeholder={
                selectedTask?.taskType === "consolidation" ||
                selectedTask?.is_consolidation_task
                  ? "Leader name (read-only)"
                  : "Search and select assignee..."
              }
            />
            {assignedResults.length > 0 &&
              !(
                selectedTask?.taskType === "consolidation" ||
                selectedTask?.is_consolidation_task
              ) && (
                <ul
                  style={{
                    position: "absolute",
                    zIndex: 10,
                    width: "100%",
                    backgroundColor: isDarkMode ? "#1e1e1e" : "#ffffff",
                    border: `2px solid ${isDarkMode ? "#444" : "#e5e7eb"}`,
                    borderRadius: "10px",
                    marginTop: "4px",
                    maxHeight: "200px",
                    overflowY: "auto",
                    listStyle: "none",
                    padding: 0,
                    margin: "4px 0 0 0",
                    boxShadow: isDarkMode
                      ? "0 2px 8px rgba(255,255,255,0.1)"
                      : "0 4px 24px rgba(0, 0, 0, 0.08)",
                  }}
                >
                  {assignedResults.map((person) => (
                    <li
                      key={person._id}
                      style={{
                        padding: "10px 12px",
                        cursor: "pointer",
                        borderBottom: `1px solid ${isDarkMode ? "#444" : "#e5e7eb"}`,
                        color: isDarkMode ? "#fff" : "#1a1a24",
                      }}
                      onClick={() => {
                        setTaskData({
                          ...taskData,
                          assignedTo: `${person.name} ${person.surname}`,
                          assignedEmail: person.email || "",
                        });
                        setAssignedResults([]);
                      }}
                      onMouseEnter={(e) =>
                        (e.target.style.backgroundColor = isDarkMode
                          ? "#2d2d2d"
                          : "#f3f4f6")
                      }
                      onMouseLeave={(e) =>
                        (e.target.style.backgroundColor = "transparent")
                      }
                    >
                      {person.name} {person.surname}
                    </li>
                  ))}
                </ul>
              )}
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "600",
                color: isDarkMode ? "#fff" : "#1a1a24",
                marginBottom: "6px",
              }}
            >
              Due Date & Time
            </label>
            <input
              type="datetime-local"
              name="dueDate"
              value={taskData.dueDate}
              onChange={handleChange}
              disabled
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "10px",
                border: `2px solid ${isDarkMode ? "#444" : "#e5e7eb"}`,
                backgroundColor: isDarkMode ? "#2d2d2d" : "#f3f4f6",
                fontSize: "14px",
                color: isDarkMode ? "#aaa" : "#6b7280",
                outline: "none",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "600",
                color: isDarkMode ? "#fff" : "#1a1a24",
                marginBottom: "6px",
              }}
            >
              Task Stage
            </label>
            <select
              name="taskStage"
              value={taskData.taskStage}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "10px",
                border: `2px solid ${isDarkMode ? "#444" : "#e5e7eb"}`,
                fontSize: "14px",
                backgroundColor: isDarkMode ? "#2d2d2d" : "#f3f4f6",
                color: isDarkMode ? "#fff" : "#1a1a24",
                outline: "none",
              }}
            >
              <option value="Open">Open</option>
              <option value="Awaiting task">Awaiting task</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "10px",
              paddingTop: "12px",
            }}
          >
            <button
              type="button"
              style={{
                padding: "10px 20px",
                borderRadius: "10px",
                backgroundColor: isDarkMode ? "#2d2d2d" : "#e5e5e5",
                color: isDarkMode ? "#fff" : "#1a1a24",
                fontWeight: "600",
                border: `1px solid ${isDarkMode ? "#444" : "transparent"}`,
                cursor: "pointer",
                fontSize: "14px",
                flex: 1,
              }}
              onClick={handleClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: "10px 20px",
                borderRadius: "10px",
                backgroundColor: submitting
                  ? "#666"
                  : isDarkMode
                    ? "#fff"
                    : "#000",
                color: submitting ? "#fff" : isDarkMode ? "#000" : "#fff",
                fontWeight: "600",
                border: "none",
                cursor: submitting ? "not-allowed" : "pointer",
                fontSize: "14px",
                flex: 1,
              }}
              disabled={submitting}
            >
              {submitting ? "Saving..." : "Save Task"}
            </button>
          </div>
        </form>
      </Modal>
      {isAddTypeModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
          }}
        >
          <div
            style={{
              backgroundColor: isDarkMode ? "#1e1e1e" : "#ffffff",
              color: isDarkMode ? "#ffffff" : "#1a1a24",
              padding: "32px",
              borderRadius: "16px",
              width: "90%",
              maxWidth: "480px",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
              position: "relative",
            }}
          >
            <h2
              style={{
                margin: "0 0 24px 0",
                textAlign: "center",
                fontSize: "24px",
              }}
            >
              Add New Task Type
            </h2>

            <input
              type="text"
              value={newTaskTypeName}
              onChange={(e) => setNewTaskTypeName(e.target.value)}
              placeholder="Enter task type name"
              autoFocus
              style={{
                width: "100%",
                padding: "14px 16px",
                fontSize: "16px",
                borderRadius: "10px",
                border: `2px solid ${isDarkMode ? "#555" : "#d1d5db"}`,
                backgroundColor: isDarkMode ? "#2a2a2a" : "#f9fafb",
                color: isDarkMode ? "#fff" : "#111827",
                marginBottom: "24px",
                outline: "none",
              }}
            />

            <div style={{ display: "flex", gap: "16px" }}>
              <button
                onClick={createTaskType}
                disabled={addingTaskType || !newTaskTypeName.trim()}
                style={{
                  flex: 1,
                  padding: "14px",
                  backgroundColor: "#2563eb",
                  color: "white",
                  borderRadius: "10px",
                  border: "none",
                  fontWeight: "600",
                  fontSize: "16px",
                  cursor: addingTaskType ? "not-allowed" : "pointer",
                  opacity: addingTaskType ? 0.7 : 1,
                }}
              >
                {addingTaskType ? "Adding..." : "Add"}
              </button>

              <button
                onClick={() => {
                  setIsAddTypeModalOpen(false);
                  setNewTaskTypeName("");
                }}
                style={{
                  flex: 1,
                  padding: "14px",
                  backgroundColor: "#6b7280",
                  color: "white",
                  borderRadius: "10px",
                  border: "none",
                  fontWeight: "600",
                  fontSize: "16px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
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
