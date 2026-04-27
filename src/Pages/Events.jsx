import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { useTheme } from "@mui/material/styles";
import { useOrgConfig } from "../contexts/OrgConfigContext";
import AttendanceModal from "./AttendanceModal";
import IconButton from "@mui/material/IconButton";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import Tooltip from "@mui/material/Tooltip";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import {
  Box,
  useMediaQuery,
  LinearProgress,
  TextField,
  InputAdornment,
} from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import SearchIcon from "@mui/icons-material/Search";
import Popover from "@mui/material/Popover";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import GetAppIcon from "@mui/icons-material/GetApp";

import Eventsfilter from "./AddPersonToEvents";
import CreateEvents from "./CreateEvents";
import EventTypesModal from "./EventTypesModal";
import EditEventModal from "./EditEventModal";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthContext } from "../contexts/AuthContext";

const formatRecurringDays = (recurringDays) => {
  if (!recurringDays || recurringDays.length === 0) {
    return null;
  }

  if (recurringDays.length === 1) {
    return ` ${recurringDays[0]}`;
  }

  const dayOrder = {
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
    Sunday: 7,
  };

  const sorted = [...recurringDays].sort((a, b) => dayOrder[a] - dayOrder[b]);

  if (sorted.length === 2) {
    return ` ${sorted[0]} & ${sorted[1]}`;
  }

  const last = sorted.pop();
  return ` ${sorted.join(", ")} & ${last}`;
};

const styles = {
  container: {
    minHeight: "100vh",
    fontFamily: "system-ui, sans-serif",
    padding: "1rem",
    paddingTop: "1rem",
    paddingBottom: "1rem",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    height: "100vh",
    position: "relative",
    width: "100%",
    maxWidth: "100vw",
  },
  topSection: {
    padding: "1.5rem",
    borderRadius: "16px",
    marginBottom: "1rem",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    flexShrink: 0,
  },
  searchFilterRow: {
    display: "flex",
    gap: "1rem",
    alignItems: "center",
    marginBottom: "1.5rem",
    flexWrap: "wrap",
  },
  statusBadgeContainer: {
    display: "flex",
    gap: "0.75rem",
    flexWrap: "wrap",
  },
  eventsContent: {
    flexGrow: 1,
    overflowY: "auto",
    padding: "0 1rem",
    paddingBottom: "70px",
  },
  statusBadge: {
    padding: "0.6rem 1.2rem",
    borderRadius: "12px",
    fontSize: "0.9rem",
    fontWeight: "600",
    cursor: "pointer",
    border: "2px solid",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
  statusBadgeIncomplete: {
    backgroundColor: "#FFA500",
    color: "#fff",
    borderColor: "#FFA500",
  },
  statusBadgeComplete: {
    backgroundColor: "#fff",
    color: "#28a745",
    borderColor: "#28a745",
  },
  statusBadgeDidNotMeet: {
    backgroundColor: "#fff",
    color: "#dc3545",
    borderColor: "#dc3545",
  },
  statusBadgeActive: {
    transform: "scale(1.05)",
    boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
  },
  th: {
    padding: "1rem",
    textAlign: "left",
    fontWeight: 600,
    fontSize: "0.95rem",
    borderBottom: "2px solid #000",
    whiteSpace: "nowrap",
  },
  actionIcons: {
    display: "flex",
    gap: "0.5rem",
    alignItems: "center",
    justifyContent: "center",
  },
  truncatedText: {
    maxWidth: "150px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  emailText: {
    maxWidth: "180px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2000,
    padding: "20px",
  },
  modalContent: {
    position: "relative",
    width: "90%",
    maxWidth: "700px",
    maxHeight: "95vh",
    backgroundColor: "white",
    borderRadius: "16px",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  modalHeader: {
    backgroundColor: "#333",
    color: "white",
    padding: "20px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopLeftRadius: "16px",
    borderTopRightRadius: "16px",
  },
  modalTitle: {
    fontSize: "1.5rem",
    fontWeight: "bold",
    margin: 0,
  },
  modalCloseButton: {
    background: "rgba(255, 255, 255, 0.2)",
    border: "none",
    borderRadius: "50%",
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: "20px",
    color: "white",
    fontWeight: "bold",
    transition: "all 0.2s ease",
  },
  modalBody: {
    flex: 1,
    overflow: "auto",
    padding: "0",
  },
  overdueLabel: {
    color: "red",
    fontSize: "0.8rem",
    marginTop: "0.2rem",
    fontWeight: "bold",
  },
  mobileCard: {
    borderRadius: "16px",
    padding: "1.25rem",
    marginBottom: "1rem",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    border: "1px solid",
    width: "100%",
    boxSizing: "border-box",
    display: "block",
  },
  mobileCardRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "0.5rem",
    fontSize: "0.9rem",
    gap: "0.5rem",
  },
  mobileCardLabel: {
    fontWeight: 600,
    minWidth: "100px",
  },
  mobileCardValue: {
    textAlign: "right",
    flex: 1,
    wordBreak: "break-word",
  },
  mobileActions: {
    display: "flex",
    gap: "0.5rem",
    marginTop: "1rem",
    justifyContent: "flex-end",
  },
  viewFilterContainer: {
    display: "flex",
    gap: "1rem",
    alignItems: "center",
  },
  viewFilterLabel: {
    fontSize: "1rem",
    fontWeight: "600",
    color: "#495057",
  },
  viewFilterRadio: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    cursor: "pointer",
  },
  viewFilterText: {
    fontSize: "1.1rem",
    transition: "all 0.2s ease",
  },
  rowsSelect: {
    padding: "0.25rem 0.5rem",
    border: "1px solid #dee2e6",
    borderRadius: "8px",
    backgroundColor: "#fff",
    fontSize: "0.875rem",
  },
  paginationContainer: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    padding: "1rem",
    borderTop: "1px solid #e9ecef",
    backgroundColor: "#f8f9fa",
    gap: "1.5rem",
    borderBottomLeftRadius: "16px",
    borderBottomRightRadius: "16px",
    flexWrap: "wrap",
    paddingRight: "96px",
  },
  rowsPerPage: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "0.875rem",
    color: "#6c757d",
  },
  paginationInfo: {
    fontSize: "0.875rem",
    color: "#6c757d",
  },
  paginationControls: {
    display: "flex",
    alignItems: "center",
    gap: "0.25rem",
  },
};

const fabStyles = {
  fabContainer: {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    zIndex: 1300,
  },
  fabMenu: {
    position: "absolute",
    bottom: "70px",
    right: "0",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    transition: "all 0.3s ease",
    zIndex: 1300,
  },
  fabMenuItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    background: "#fff",
    padding: "12px 16px",
    borderRadius: "50px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "all 0.2s ease",
    border: "1px solid #e0e0e0",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 6px 16px rgba(0,0,0,0.2)",
      backgroundColor: "#f8f9fa",
    },
    "&:focus": {
      outline: "2px solid #007bff",
      outlineOffset: "2px",
    },
  },
  fabMenuLabel: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#333",
  },
  fabMenuIcon: {
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontSize: "12px",
    fontWeight: "bold",
  },
};

const getEventTypeStyles = (isDarkMode, theme, isMobileView) => ({
  container: {
    backgroundColor: isDarkMode ? theme.palette.background.paper : "#f8f9fa",
    borderRadius: "16px",
    padding: isMobileView ? "1rem" : "1.5rem",
    marginBottom: isMobileView ? "0.75rem" : "1.5rem",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    border: `1px solid ${isDarkMode ? theme.palette.divider : "#e9ecef"}`,
    position: "relative",
    color: isDarkMode ? theme.palette.text.primary : "inherit",
  },
  header: {
    fontSize: isMobileView ? "0.75rem" : "0.875rem",
    fontWeight: "600",
    color: isDarkMode ? theme.palette.text.secondary : "#6c757d",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: isMobileView ? "0.5rem" : "1rem",
  },
  selectedTypeDisplay: {
    fontSize: isMobileView ? "1rem" : "1.25rem",
    fontWeight: "700",
    color: isDarkMode ? theme.palette.primary.main : "#007bff",
    marginBottom: isMobileView ? "0.5rem" : "1rem",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  checkIcon: {
    width: isMobileView ? "20px" : "24px",
    height: isMobileView ? "20px" : "24px",
    borderRadius: "50%",
    backgroundColor: "#28a745",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: isMobileView ? "12px" : "14px",
    fontWeight: "bold",
  },
  typesGrid: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: isMobileView ? "0.5rem" : "0.75rem",
  },
  typeCard: {
    padding: isMobileView ? "0.6rem 0.8rem" : "1rem",
    borderRadius: "12px",
    border: `2px solid ${isDarkMode ? theme.palette.divider : "transparent"}`,
    backgroundColor: isDarkMode ? theme.palette.background.default : "white",
    cursor: "pointer",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    position: "relative",
    overflow: "hidden",
    boxShadow: isDarkMode
      ? "0 2px 4px rgba(0,0,0,0.2)"
      : "0 2px 4px rgba(0,0,0,0.05)",
    color: isDarkMode ? theme.palette.text.primary : "inherit",
  },
  typeCardActive: {
    borderColor: "#007bff",
    backgroundColor: isDarkMode ? "rgba(0, 123, 255, 0.1)" : "#e7f3ff",
    transform: "translateX(8px) scale(1.02)",
    boxShadow: "0 6px 16px rgba(0, 123, 255, 0.25)",
  },
  typeCardHover: {
    borderColor: isDarkMode ? theme.palette.primary.main : "#ddd",
    transform: "translateY(-2px)",
    boxShadow: isDarkMode
      ? "0 4px 8px rgba(0,0,0,0.3)"
      : "0 4px 8px rgba(0,0,0,0.1)",
  },
  typeName: {
    fontSize: isMobileView ? "0.75rem" : "0.9rem",
    fontWeight: "600",
    color: isDarkMode ? theme.palette.text.primary : "#495057",
    textAlign: "center",
    display: "block",
  },
  typeNameActive: {
    color: "#007bff",
  },
});

const formatDate = (date) => {
  if (!date) return "Not set";
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return "Not set";
  return dateObj
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    .replace(/\//g, " - ");
};

const generateDynamicColumns = (events, isOverdue, selectedEventTypeFilter) => {
  if (!events || events.length === 0) return [];

  const isCellType =
    !selectedEventTypeFilter ||
    selectedEventTypeFilter === "all" ||
    selectedEventTypeFilter === "CELLS" ||
    selectedEventTypeFilter.toLowerCase().includes("cell");

  //STATUS column
  const statusCol = {
    field: "overdue",
    headerName: "Status",
    flex: 0.8,
    minWidth: 100,
    renderCell: (params) => {
      const isOverdueEvent = isOverdue(params.row);
      const status = params.row.status || "incomplete";
      if (isOverdueEvent) {
        return (
          <Box sx={{ color: "#dc3545", fontSize: "0.8rem", fontWeight: "bold", textAlign: "center", width: "100%" }}>
            OVERDUE
          </Box>
        );
      }
      return (
        <Box sx={{
          color: status === "complete" ? "#28a745" : status === "did_not_meet" ? "#dc3545" : "#6c757d",
          fontWeight: "500", fontSize: "0.8rem", textTransform: "capitalize", textAlign: "center", width: "100%",
        }}>
          {status.replace("_", " ")}
        </Box>
      );
    },
  };
  // RECURRING column
  const recurringCol = {
    field: "recurring_info",
    headerName: "Recurring",
    flex: 0.8,
    minWidth: 120,
    renderCell: (params) => {
      if (!params?.row) return <Box sx={{ color: "#6c757d", fontSize: "0.95rem" }}>-</Box>;
      const row = params.row;
      const isRecurring =
        row.is_recurring ||
        (row.recurring_days && Array.isArray(row.recurring_days) && row.recurring_days.length > 0);
      return (
        <Box sx={{ color: isRecurring ? "#2196f3" : "#6c757d", fontSize: "0.95rem", fontWeight: isRecurring ? "bold" : "normal", textAlign: "center", width: "100%" }}>
          {isRecurring ? "True" : "False"}
        </Box>
      );
    },
  };
  // NON-CELLS columns
  if (!isCellType) {
    return [
      statusCol,
      recurringCol,
      {
        field: "eventName",
        headerName: "Event Name",
        flex: 1.2,
        minWidth: 160,
        renderCell: (params) => (
          <Box sx={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }} title={params.value || ""}>
            {params.value || "-"}
          </Box>
        ),
      },
      {
        field: "eventLeaderName",
        headerName: "Event Leader Name",
        flex: 1,
        minWidth: 160,
        renderCell: (params) => (
          <Box sx={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }} title={params.value || ""}>
            {params.value || "-"}
          </Box>
        ),
      },
      {
        field: "eventLeaderEmail",
        headerName: "Event Leader Email",
        flex: 1,
        minWidth: 180,
        renderCell: (params) => (
          <Box sx={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200 }} title={params.value || ""}>
            {params.value || "-"}
          </Box>
        ),
      },
      {
        field: "day",
        headerName: "Day",
        flex: 0.7,
        minWidth: 100,
        renderCell: (params) => params.value || "-",
      },
      {
        field: "date",
        headerName: "Date",
        flex: 0.9,
        minWidth: 120,
        renderCell: (params) => formatDate(params.value),
      },
    ];
  }

  //CELLS columns
  const sampleEvent = events[0];
  const filteredFields = Object.keys(sampleEvent).filter((key) => {
    const keyLower = key.toLowerCase();
    const excludedFields = [
      "persistent_attendees", "uuid", "did_not_meet", "status", "week_identifier",
      "attendees", "_id", "id", "isoverdue", "attendance", "location", "eventtype",
      "event_type", "eventtypes", "displaydate", "originatedid", "leader12",
      "leader@12", "leader at 12", "original_event_id", "_is_overdue", "haspersonsteps",
      "has_person_steps", "is_recurring", "isrecurring", "recurring", "recurring_days",
      "is_active", "Is_active", "Is active", "time", "Time", "isGlobal", "isTicketed",
      "description", "new_people", "consolidations", "total_attendance", "closed_by",
      "closed_at", "created_at", "updated_at", "new_people_count", "consolidation_count","priceTiers"
    ];
    const exactMatch = excludedFields.includes(key);
    const caseInsensitiveMatch = excludedFields.some((excluded) => excluded.toLowerCase() === keyLower);
    const containsOverdue = keyLower.includes("overdue");
    const containsDisplayDate = keyLower.includes("display") && keyLower.includes("date");
    const containsOriginated = keyLower.includes("originated");
    const containsLeader12 = keyLower.includes("leader") && keyLower.includes("12");
    const containsLeader1 = keyLower.includes("leader1") || keyLower.includes("leader@1") || keyLower.includes("leader at 1");
    const shouldExcludeLeader1 =
      containsLeader1 &&
      selectedEventTypeFilter !== "all" &&
      selectedEventTypeFilter !== "CELLS" &&
      selectedEventTypeFilter !== "Cells";
    const containsPersonSteps = keyLower.includes("person") && keyLower.includes("steps");
    return !(exactMatch || caseInsensitiveMatch || containsOverdue || containsDisplayDate || containsOriginated || containsLeader12 || shouldExcludeLeader1 || containsPersonSteps);
  });

  const columns = [statusCol, recurringCol];
  columns.push(
    ...filteredFields.map((key) => ({
      field: key,
      headerName: key.replace(/_/g, " ").replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase()),
      flex: 1,
      minWidth: 150,
      renderCell: (params) => {
        const value = params.value;
        if (key.toLowerCase().includes("date")) return formatDate(value);
        if (!value) return "-";
        return (
          <Box sx={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }} title={String(value)}>
            {String(value)}
          </Box>
        );
      },
    })),
  );

  return columns;
};

const MobileEventCard = ({
  event,
  onOpenAttendance,
  onEdit,
  onDelete,
  isOverdue,
  formatDate,
  theme,
  styles,
  isAdmin,

  selectedEventTypeFilter,
}) => {
  if (!theme) {
    return <Box sx={{ height: 100 }} />;
  }
  const isDark = theme.palette.mode === "dark";
  const borderColor = isDark ? theme.palette.divider : "#e9ecef";

  const attendeesCount = event.attendees?.length || 0;
  const isCellEvent =
    selectedEventTypeFilter === "all" ||
    selectedEventTypeFilter === "CELLS" ||
    selectedEventTypeFilter === "Cells";

  const escapeHtml = (s) =>
    String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const buildXlsFromRows = (rows, fileBaseName = "export") => {
    if (!rows || rows.length === 0) {
      toast.info("No data to export");
      return;
    }

    const headers = Object.keys(rows[0]);
    const columnWidths = headers.map((header) => {
      let maxLength = header.length;
      rows.forEach((r) => {
        const v = String(r[header] || "");
        if (v.length > maxLength) maxLength = v.length;
      });
      return Math.min(Math.max(maxLength * 7 + 5, 65), 350);
    });

    const xmlCols = columnWidths
      .map(
        (w, i) =>
          `    <x:Column ss:Index="${i + 1}" ss:AutoFitWidth="0" ss:Width="${w}"/>`,
      )
      .join("\n");

    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head>
          <meta charset="utf-8">
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>${escapeHtml(fileBaseName)}</x:Name>
                  <x:WorksheetOptions>
                    <x:DisplayGridlines/>
                  </x:WorksheetOptions>
                  <x:WorksheetColumns>
${xmlCols}
                  </x:WorksheetColumns>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <style>
            table { border-collapse: collapse; width: 100%; font-family: Calibri, Arial, sans-serif; }
            th { background-color: #a3aca3ff; color: white; font-weight: bold; padding: 12px 8px; text-align: center; border: 1px solid #ddd; font-size: 11pt; white-space: nowrap; }
            td { padding: 8px; border: 1px solid #ddd; font-size: 10pt; text-align: left; }
            tr:nth-child(even) { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <table border="1">
            <thead><tr>
    `;

    headers.forEach((h) => {
      html += `                <th>${escapeHtml(h)}</th>\n`;
    });
    html += `              </tr></thead><tbody>\n`;

    rows.forEach((row) => {
      html += `              <tr>\n`;
      headers.forEach((h) => {
        html += `                <td>${escapeHtml(row[h] || "")}</td>\n`;
      });
      html += `              </tr>\n`;
    });

    html += `            </tbody></table></body></html>`;

    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const fileName = `${fileBaseName}_${new Date().toISOString().split("T")[0]}.xls`;
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  };

  const normalizeEventAttendance = (event) => {
    if (!event) return [];

    const eventDate = event.date;
    let attendees = [];

    // Check attendance object by date key first
    if (event.attendance && typeof event.attendance === "object") {
      const dateAttendance = event.attendance[eventDate];
      if (dateAttendance) {
        attendees = dateAttendance.attendees || [];
      }
    }

    if (attendees.length === 0) {
      attendees = event.attendees || [];
    }

    if (attendees.length === 0) return [];

    return attendees.map((att) => ({
      "Event Name": event.eventName || event["Event Name"] || "",
      "Event Date": eventDate,
      "Name": att.fullName || att.name || "",
      "Email": att.email || "",
      "Event Leader Name": event.eventLeaderName || event.Leader || "",
      "Leader @12": event.leader12 || "",
      "Phone": att.phone || "",
      "Decision": att.decision || "",
      "Price Tier": att.priceTier || "",
      "Payment Method": att.paymentMethod || "",
      "Price": att.price !== undefined ? `R${Number(att.price).toFixed(2)}` : "",
      "Paid": att.paid !== undefined ? `R${Number(att.paid).toFixed(2)}` : "",
      "Owing": att.owing !== undefined ? `R${Number(att.owing).toFixed(2)}` : "",
    }));
  };

  const fetchEventFull = async (event) => {

    try {
      let eventId = event._id || event.id;
      if (!eventId) return event;
      if (eventId.includes("_")) eventId = eventId.split("_")[0];
      const token = localStorage.getItem("access_token");
      const res = await authFetch(`${BACKEND_URL}/events/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res && res.ok) {
        const data = await res.json();
        return data || event;
      }
      return event;
    } catch (err) {
      console.error("Failed to fetch full event:", err);
      return event;
    }
  };

  const downloadEventAttendance = async (event) => {
    const TOAST_ID = `download-event-${event?._id || event?.id || Date.now()}`;
    try {
      toast.info("Preparing event download…", { toastId: TOAST_ID, autoClose: false });

      const hasLocalAttendance =
        (event?.attendees && event.attendees.length > 0) ||
        (event?.attendance && Object.keys(event.attendance).length > 0) ||
        (event?.attendance_data && Array.isArray(event.attendance_data.attendees) && event.attendance_data.attendees.length > 0) ||
        (event?.checked_in_count && event.checked_in_count > 0) ||
        (event?.persistent_attendees && event.persistent_attendees.length > 0);

      const fullEvent = hasLocalAttendance ? event : await fetchEventFull(event);

      const rows = normalizeEventAttendance(fullEvent);
      if (!rows || rows.length === 0) {
        toast.dismiss(TOAST_ID);
        toast.info("No attendees found for this event.");
        return;
      }

      buildXlsFromRows(
        rows,
        `attendance_${(fullEvent.eventName || "event").replace(/\s/g, "_")}`,
      );

      toast.dismiss(TOAST_ID);
      toast.success(`Downloaded attendance of ${rows.length} members`);
    } catch (err) {
      console.error("Download event attendance failed:", err);
      toast.dismiss(TOAST_ID);
      toast.error("Failed to download event attendance");
    }
  };

  return (
    <div
      style={{
        ...styles.mobileCard,
        borderColor: borderColor,
        backgroundColor: isDark ? theme.palette.background.default : "#fff",
      }}
    >
      <Typography
        variant="h6"
        sx={{
          fontWeight: "bold",
          marginBottom: "0.75rem",
          color: isDark ? "#fff" : "#333",
        }}
      >
        {event.eventName || "N/A"}
      </Typography>
      {event.is_recurring &&
        event.recurring_days &&
        event.recurring_days.length > 1 && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.5rem",
              padding: "0.25rem 0.5rem",
              backgroundColor: isDark ? "rgba(33, 150, 243, 0.1)" : "#e3f2fd",
              borderRadius: "8px",
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: "#2196f3",
                fontWeight: "bold",
                fontSize: "0.7rem",
              }}
            >
              RECURRING
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: isDark ? "#fff" : "#666",
                fontSize: "0.7rem",
              }}
            >
              {formatRecurringDays(event.recurring_days)}
            </Typography>
          </Box>
        )}
      {isOverdue && isCellEvent && (
        <Typography
          variant="caption"
          sx={{ color: theme.palette.error.main, fontWeight: "bold" }}
        >
          OVERDUE!
        </Typography>
      )}
      <div style={styles.mobileCardRow}>
        <span style={styles.mobileCardLabel}>Date:</span>
        <span style={styles.mobileCardValue}>{formatDate(event.date)}</span>
      </div>
      <div style={styles.mobileCardRow}>
        <span style={styles.mobileCardLabel}>Leader:</span>
        <span style={styles.mobileCardValue}>
          {event.eventLeaderName || "N/A"}
        </span>
      </div>
      {isCellEvent && (
        <div style={styles.mobileCardRow}>
          <span style={styles.mobileCardLabel}>Leader @1:</span>
          <span style={styles.mobileCardValue}>{event.leader1 || "N/A"}</span>
        </div>
      )}
      {!event.isTicketed && <div style={styles.mobileCardRow}>
        <span style={styles.mobileCardLabel}>Leader @12:</span>
        <span style={styles.mobileCardValue}>{event.leader12 || "N/A"}</span>
      </div>}
      <div style={styles.mobileActions}>
        <Tooltip title={`View Attendance (${attendeesCount} people)`}>
          <IconButton
            onClick={() => onOpenAttendance(event)}
            size="small"
            sx={{ color: theme.palette.primary.main }}
          >
            <CheckBoxIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Edit Event">
          <IconButton
            onClick={() => onEdit(event)}
            size="small"
            sx={{ color: "#ffc107" }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {isAdmin && (
          <Tooltip title="Delete Event">
            <IconButton
              onClick={() => onDelete(event)}
              size="small"
              sx={{ color: theme.palette.error.main }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Download Attendance (Event)" arrow>
          <IconButton
            onClick={() => downloadEventAttendance(params.row)}
            size="small"
            sx={{ color: "#1976d2" }}
          >
            <GetAppIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </div>
    </div>
  );
};

const isValidObjectId = (id) => {
  if (!id || typeof id !== "string") return false;
  return /^[0-9a-fA-F]{24}$/.test(id);
};
const Events = () => {
  const { authFetch, logout } = React.useContext(AuthContext);
  const { orgConfig, configLoaded } = useOrgConfig();
  
  // Get user from localStorage immediately (available on login)
  const currentUser = JSON.parse(localStorage.getItem("userProfile")) || {};
  const userOrganization = currentUser?.Organization || currentUser?.organization || "";
  const userOrgId = currentUser?.org_id || "";
  
  // Determine isActiveTeams immediately from user data
  const isActiveTeams = userOrgId === "active-teams" || userOrganization === "Active Church";
  
  console.log("ORG CONFIG:===============", {
    userOrgId,
    userOrganization,
    isActiveTeams,
    orgConfigLoaded: configLoaded,
    orgConfigId: orgConfig?.org_id
  });

  const theme = useTheme();
  const isMobileView = useMediaQuery(theme.breakpoints.down("lg"));
  const isDarkMode = theme.palette.mode === "dark";
  const token = localStorage.getItem("access_token");
  const eventTypeStyles = useMemo(() => {
    return getEventTypeStyles(isDarkMode, theme);
  }, [isDarkMode, theme]);
  console.log(eventTypeStyles);

  const userRole = currentUser?.role || "";
  const normalizedRole = userRole.toLowerCase();
  
  const isAdmin = normalizedRole === "admin";
  const isRegistrant = normalizedRole === "registrant";
  const isRegularUser = normalizedRole === "user";
  const isLeaderAt12 =
    normalizedRole === "leaderat12" ||
    normalizedRole.includes("leaderat12") ||
    normalizedRole.includes("leader at 12") ||
    normalizedRole.includes("leader@12");

  const isLeader = normalizedRole === "leader" && !isLeaderAt12;

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
  const DEFAULT_API_START_DATE = "2025-11-30";

  const [showFilter, setShowFilter] = useState(false);
  const [events, setEvents] = useState([]);
  const [, setActiveFilters] = useState({});
  const [loading, setLoading] = useState(true);
  const [, setUserCreatedEventTypes] = useState([]);
  const [, setCustomEventTypes] = useState([]);
  const [, setSelectedEventTypeObj] = useState(null);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [createEventModalOpen, setCreateEventModalOpen] = useState(false);

  const [fabMenuOpen, setFabMenuOpen] = useState(false);
  const [selectedEventTypeFilter, setSelectedEventTypeFilter] = useState(
    isActiveTeams ? "all" : ""
  );
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("incomplete");
  const [searchQuery, setSearchQuery] = useState("");
  const [totalEvents, setTotalEvents] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserLeaderAt1, setCurrentUserLeaderAt1] = useState("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [toDeleteType, setToDeleteType] = useState(null);
  const [eventTypesModalOpen, setEventTypesModalOpen] = useState(false);
  const [editingEventType, setEditingEventType] = useState(null);
  const [eventTypes, setEventTypes] = useState([]);
  const [showingEvents, setShowingEvents] = useState(false);
  const [eventTypeSearch, setEventTypeSearch] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedTypeForMenu, setSelectedTypeForMenu] = useState(null);

  const initialViewFilter = useMemo(() => {
    if (isLeaderAt12) {
      return "all";
    } else if (isRegularUser || isRegistrant) {
      return "personal";
    } else if (isAdmin) {
      return "all";
    }
    return "all";
  }, [isLeaderAt12, isRegularUser, isRegistrant, isAdmin]);

  const [viewFilter, setViewFilter] = useState(initialViewFilter);
  const [filterOptions, setFilterOptions] = useState({
    leader: "",
    day: "all",
    eventType: "all",
  });

  const cacheRef = useRef({
    data: new Map(),
    timestamp: new Map(),
    CACHE_DURATION: 24 * 60 * 60 * 1000,
  });

  const clearCache = useCallback(() => {
    cacheRef.current.data.clear();
    cacheRef.current.timestamp.clear();
  }, []);
  const eventsCache = useRef({});

  const escapeHtml = (s) =>
    String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const buildXlsFromRows = (rows, fileBaseName = "export") => {
    if (!rows || rows.length === 0) {
      toast.info("No data to export");
      return;
    }

    const headers = Object.keys(rows[0]);
    const columnWidths = headers.map((header) => {
      let maxLength = header.length;
      rows.forEach((r) => {
        const v = String(r[header] || "");
        if (v.length > maxLength) maxLength = v.length;
      });
      return Math.min(Math.max(maxLength * 7 + 5, 65), 350);
    });

    const xmlCols = columnWidths
      .map(
        (w, i) =>
          `                    <x:Column ss:Index="${i + 1}" ss:AutoFitWidth="0" ss:Width="${w}"/>`,
      )
      .join("\n");

    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head>
          <meta charset="utf-8">
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>${escapeHtml(fileBaseName)}</x:Name>
                  <x:WorksheetOptions>
                    <x:DisplayGridlines/>
                  </x:WorksheetOptions>
                  <x:WorksheetColumns>
${xmlCols}
                  </x:WorksheetColumns>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <style>
            table { border-collapse: collapse; width: 100%; font-family: Calibri, Arial, sans-serif; }
            th { background-color: #a3aca3ff; color: white; font-weight: bold; padding: 12px 8px; text-align: center; border: 1px solid #ddd; font-size: 11pt; white-space: nowrap; }
            td { padding: 8px; border: 1px solid #ddd; font-size: 10pt; text-align: left; }
            tr:nth-child(even) { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <table border="1">
            <thead><tr>
    `;

    headers.forEach((h) => {
      html += `                <th>${escapeHtml(h)}</th>\n`;
    });
    html += `              </tr></thead><tbody>\n`;

    rows.forEach((row) => {
      html += `              <tr>\n`;
      headers.forEach((h) => {
        html += `                <td>${escapeHtml(row[h] || "")}</td>\n`;
      });
      html += `              </tr>\n`;
    });

    html += `            </tbody></table></body></html>`;

    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const fileName = `${fileBaseName}_${new Date().toISOString().split("T")[0]}.xls`;
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  };

  const findEventTypeByName = (typeName) => {
    if (!typeName || typeName === "all") {
      return {
        name: "CELLS",
        isGlobal: false,
        isTicketed: false,
        hasPersonSteps: true,
      };
    }

    // Look for the event type in your eventTypes array
    const found = eventTypes.find((et) => {
      const etName = et.name || et.eventTypeName || et.displayName || "";
      return etName.toLowerCase() === typeName.toLowerCase();
    });

    if (found) {
      return found;
    }

    return {
      name: typeName,
      isGlobal: false,
      isTicketed: false,
      hasPersonSteps: false,
    };
  };
  const fetchInBatches = async (items, fn, batchSize = 6) => {
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      const res = await Promise.all(batch.map((it) => fn(it)));
      results.push(...res);
    }
    return results;
  };
  const downloadEventAttendance = async (event) => {
    const TOAST_ID = `download-event-${event?._id || event?.id || Date.now()}`;
    try {
      toast.info("Preparing event download…", { toastId: TOAST_ID, autoClose: false });
      const hasLocalAttendance =
        (event?.attendees && event.attendees.length > 0) ||
        (event?.attendance && Object.keys(event.attendance).length > 0) ||
        (event?.attendance_data && Array.isArray(event.attendance_data.attendees) && event.attendance_data.attendees.length > 0) ||
        (event?.checked_in_count && event.checked_in_count > 0) ||
        (event?.persistent_attendees && event.persistent_attendees.length > 0);

      const fullEvent = hasLocalAttendance ? event : await fetchEventFull(event);

      const rows = normalizeEventAttendance(fullEvent);
      if (!rows || rows.length === 0) {
        toast.dismiss(TOAST_ID);
        toast.info("No attendees found for this event.");
        return;
      }

      buildXlsFromRows(
        rows,
        `attendance_${(fullEvent.eventName || "event").replace(/\s/g, "_")}`,
      );

      toast.dismiss(TOAST_ID);
      toast.success(`Downloaded attendance of ${rows.length} members`);
    } catch (err) {
      console.error("Download event attendance failed:", err);
      toast.dismiss(TOAST_ID);
      toast.error("Failed to download event attendance");
    }
  };

  const normalizeEventAttendance = (event) => {
    if (!event) return [];
    const eventDate = event.date;
    let attendees = [];

    if (event.attendance && typeof event.attendance === "object") {
      const dateAttendance = event.attendance[eventDate];
      if (dateAttendance) {
        attendees = dateAttendance.attendees || [];
      }
    }

    // Fall back to top-level attendees
    if (attendees.length === 0) {
      attendees = event.attendees || [];
    }

    if (attendees.length === 0) return [];

    return attendees.map((att) => ({
      "Event Name": event.eventName || event["Event Name"] || "",
      "Event Date": eventDate,
      "Name": att.fullName || att.name || "",
      "Email": att.email || "",
      "Event Leader Name": event.eventLeaderName || event.Leader || "",
      "Leader @12": event.leader12 || "",
      "Phone": att.phone || "",
      "Decision": att.decision || "",
      "Price Tier": att.priceTier || "",
      "Payment Method": att.paymentMethod || "",
      "Price": att.price !== undefined ? `R${Number(att.price).toFixed(2)}` : "",
      "Paid": att.paid !== undefined ? `R${Number(att.paid).toFixed(2)}` : "",
      "Owing": att.owing !== undefined ? `R${Number(att.owing).toFixed(2)}` : "",
    }));
  };

  const fetchEventFull = async (event) => {
    try {
      let eventId = event._id || event.id;
      if (!eventId) return event;
      if (eventId.includes("_")) eventId = eventId.split("_")[0];
      const token = localStorage.getItem("access_token");
      const res = await authFetch(`${BACKEND_URL}/events/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res && res.ok) {
        const data = await res.json();
        return data || event;
      }
      return event;
    } catch (err) {
      console.error("Failed to fetch full event:", err);
      return event;
    }
  };
  const isDateInWeek = (dateStr, which = "current") => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;

    const today = new Date();
    const day = today.getDay(); // 0 (Sun) - 6 (Sat)
    const diffToMonday = (day + 6) % 7; // days since Monday
    const mondayThisWeek = new Date(today);
    mondayThisWeek.setDate(today.getDate() - diffToMonday);
    mondayThisWeek.setHours(0, 0, 0, 0);

    const sundayThisWeek = new Date(mondayThisWeek);
    sundayThisWeek.setDate(mondayThisWeek.getDate() + 6);
    sundayThisWeek.setHours(23, 59, 59, 999);

    let start, end;
    if (which === "previous") {
      end = new Date(mondayThisWeek);
      end.setMilliseconds(-1);
      start = new Date(mondayThisWeek);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
    } else {
      start = mondayThisWeek;
      end = sundayThisWeek;
    }

    return d >= start && d <= end;
  };

  const downloadEventsByStatus = async (status, period = "current") => {
    const TOAST_ID = `download-status-${status}-${period}`;
    try {
      if (!status || (status !== "complete" && status !== "did_not_meet")) {
        toast.info("Download is available only for 'complete' and 'did_not_meet' statuses.");
        return;
      }

      toast.info("Preparing export — fetching events...", { toastId: TOAST_ID, autoClose: false });

      const cacheKey = `${selectedEventTypeFilter}_${selectedStatus}_${viewFilter}`;
      let sourceEvents =
        (eventsCache.current && eventsCache.current[cacheKey]) ||
        (allCurrentEvents && allCurrentEvents.length ? allCurrentEvents : null) ||
        (events && events.length ? events : null) ||
        [];

      if (!sourceEvents || sourceEvents.length === 0) {
        try {
          await fetchAllCurrentEvents();
          sourceEvents =
            (eventsCache.current && eventsCache.current[cacheKey]) ||
            (allCurrentEvents && allCurrentEvents.length ? allCurrentEvents : []) ||
            (events && events.length ? events : []);
        } catch (e) {
          console.error("Failed to preload events for download:", e);
        }
      }

      const normalizeStatus = (val) =>
        String(val || "").toLowerCase().trim().replace(/\s/g, "_");

      const eventsToExport = (sourceEvents || []).filter((ev) => {
        const eventDate = ev.date || ev.EventDate || ev.event_date || ev.displayDate;
        if (!isDateInWeek(eventDate, period)) return false;
        const s = normalizeStatus(ev.status || ev.Status);
        const boolDidNot =
          ev.did_not_meet === true || String(ev.did_not_meet || "").toLowerCase() === "true";
        const isDidNotMeet =
          boolDidNot ||
          s === "did_not_meet" ||
          s === "didnotmeet" ||
          (s.includes("did") && s.includes("meet")) ||
          s === "did not meet";
        const isComplete = s === "complete" || s === "completed" || s === "closed";
        return status === "did_not_meet" ? isDidNotMeet : isComplete;
      });

      if (!eventsToExport.length) {
        toast.dismiss(TOAST_ID);
        toast.info("No events with the selected status in the selected week.");
        return;
      }

      const fullEvents = await fetchInBatches(eventsToExport, fetchEventFull, 6);

      const allRows = [];
      for (const ev of fullEvents) {
        const rows = normalizeEventAttendance(ev);
        if (rows && rows.length > 0) {
          allRows.push(...rows);
        } else if (
          status === "did_not_meet" ||
          ev.did_not_meet === true ||
          (ev.status && String(ev.status).toLowerCase().includes("did"))
        ) {
          allRows.push({
            "Event Name": ev.eventName || ev.Event_Name || ev.name || "",
            "Event Date": formatDate(ev.date),
            Name: "",
            Email: "",
            "Event Leader Name ": ev.eventLeaderName || ev.leaderName || ev.eventLeader || ev.leader || "",
            "Leader @12": ev.leader12 || "",
            "Leader @144": ev.leader144 || "",
            Phone: "",
            Decision: "",
            "Price Tier": "",
            "Payment Method": "",
            Price: "",
            Paid: "",
            Owing: "",
            Note: "Did Not Meet",
          });
        }
      }

      if (!allRows.length) {
        toast.dismiss(TOAST_ID);
        toast.info("No attendees found for selected events.");
        return;
      }

      buildXlsFromRows(allRows, `events_${status}_${period}`);
      toast.dismiss(TOAST_ID);
      toast.success(`Downloaded ${allRows.length} rows for ${status} (${period})`);
    } catch (err) {
      console.error("Download events by status failed:", err);
      toast.error("Failed to download events for selected status");
      toast.dismiss(TOAST_ID);
    }
  };
  const paginatedEvents = useMemo(() => events, [events]);

  const startIndex = useMemo(() => {
    return totalEvents > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0;
  }, [currentPage, rowsPerPage, totalEvents]);
  const endIndex = useMemo(() => {
    return Math.min(currentPage * rowsPerPage, totalEvents);
  }, [currentPage, rowsPerPage, totalEvents]);

const allEventTypes = useMemo(() => {
  const typeNames = eventTypes.map((t) => (typeof t === "string" ? t : t.name));
  return typeNames;
}, [eventTypes]);

const fetchEventsFilters = (filters) => {
  const params = {
    page: filters.page || currentPage,
    limit: filters.limit || rowsPerPage,
    start_date: filters.start_date || DEFAULT_API_START_DATE,
    status: filters.status || selectedStatus || "incomplete",
  };

  if (filters.search) params.search = filters.search;
  if (filters.event_type) {
    params.event_type = filters.event_type;
  }

  const currentUser = JSON.parse(localStorage.getItem("userProfile")) || {};
  const userEmail = currentUser?.email || "";
  console.log("Current user email:", userEmail);
  const userName = currentUser?.name || "";
  const userFirstName =
    currentUser?.firstName || userName?.split(" ")[0] || "";
  const userSurname =
    currentUser?.surname || userName?.split(" ").slice(1).join(" ") || "";
  let endpoint = `${BACKEND_URL}/events`;

  const eventType = filters.event_type || selectedEventTypeFilter;
    const userOrg = currentUser?.Organization || currentUser?.organization || "";
  const userOrgId = currentUser?.org_id || "";
  const isCellOrg = userOrgId === "active-teams" || userOrg === "Active Church";
  
  const isCellType = isCellOrg && (!eventType || eventType === "CELLS" || eventType === "all" || eventType.toLowerCase() === "cells" || eventType.toLowerCase().includes("cell"));

  if (isCellType) {
    endpoint = `${BACKEND_URL}/events/cells`;
    params.firstName = userFirstName;
    params.userSurname = userSurname;

    if (isLeaderAt12) {
      params.leader_at_12_view = true;
      params.isLeaderAt12 = true;

      if (viewFilter === "personal") {
        params.personal = true;
        params.show_personal_cells = true;
      } else {
        // For "DISCIPLES" view
        params.include_subordinate_cells = true;
        params.show_all_authorized = true;
      }
    } else if (isAdmin) {
      if (viewFilter === "personal") params.personal = true;
    } else {
      // For regular users, registrants, leaders - show personal cells only
      params.personal = true;
    }
  } else {
    endpoint = `${BACKEND_URL}/events/eventsdata`;
    delete params.personal;
    delete params.leader_at_12_view;
    delete params.include_subordinate_cells;
    delete params.show_personal_cells;
    delete params.show_all_authorized;
    delete params.leader_at_1_identifier;
    delete params.isLeaderAt12;
    delete params.firstName;
    delete params.userSurname;
  }
  return [params, endpoint];
};
    const fetchEvents = useCallback(
      async (filters = {}, showLoader = true, isSearching = false) => {
        console.log("isSearching:", isSearching);
        if (showLoader) {
          setLoading(true);
          setIsLoading(true);
        }

        try {
          const token = localStorage.getItem("access_token");
          if (!token) {
            logout();
            window.location.href = "/login";
            return;
          }
          const [params, endpoint] = fetchEventsFilters(filters);

          const queryString = new URLSearchParams(params).toString();
          console.log("Fetching from:", `${endpoint}?${queryString}`);

          const response = await authFetch(`${endpoint}?${queryString}`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) throw new Error(`HTTP ${response.status}`);

          const data = await response.json();
          console.log("Received events:", data.events?.length || 0);

          const allEvents = data.events || [];
          const filtered = allEvents;

          console.log("Final events to display:", filtered.length);

          setEvents(filtered);
          setTotalEvents(data.total_events || 0);
          setTotalPages(data.total_pages || 1);
        } catch (error) {
          console.error(" Fetch error:", error);
          setEvents([]);
          if (!error.message.includes("401")) {
            toast.error("Failed to load events");
          }
        } finally {
          if (showLoader) {
            setLoading(false);
            setIsLoading(false);
          }
        }
      },
      [
        currentPage,
        rowsPerPage,
        authFetch,
        BACKEND_URL,
        isLeaderAt12,
        isAdmin,
        isRegistrant,
        viewFilter,
        logout,
        selectedEventTypeFilter,
        selectedStatus,
      ],
    );

const fetchEventTypes = useCallback(async () => {
  try {
    const token = localStorage.getItem("access_token");

    const response = await authFetch(`${BACKEND_URL}/event-types`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch event types");
    }

    const eventTypesData = await response.json();
    
    let filteredTypes = eventTypesData.filter((type) => {
      if (isActiveTeams && (type.name === "Cells" || type.name === "CELLS" || type.name?.toLowerCase() === "cells")) {
        console.log("Removing Cells event type for Active Teams");
        return false;
      }
      
      // Built-in types are already org-filtered by backend — always show them
      if (type.isBuiltIn) return true;
      
      const role = (currentUser?.role || "").toLowerCase().trim();
      const email = (currentUser?.email || "").toLowerCase();
      const isManager = role === "admin" || role === "leaderat12" || role === "registrant";
      
      if (isManager) return true;
      const isGlobalType = type.isGlobal === true || type.isGlobal === "true";
      const isOwner = type.userEmail?.toLowerCase() === email;
      return type.isEventType === true && (isGlobalType || isOwner);
    });

    setEventTypes(filteredTypes);
    setCustomEventTypes(filteredTypes);
    setUserCreatedEventTypes(filteredTypes);
    return filteredTypes;
  } catch (error) {
    console.error("Error fetching event types:", error);
    return [];
  }
}, [BACKEND_URL, authFetch, currentUser?.email, currentUser?.role, isActiveTeams]);

    useEffect(() => {
      if (currentUser?.email) {
        fetchEventTypes();
      }
    }, [fetchEventTypes, currentUser?.email]);
    useEffect(() => {
      // When event type filter changes, reset to "incomplete" status
      if (selectedEventTypeFilter && selectedEventTypeFilter !== "all") {
        setSelectedStatus("incomplete");
      }
    }, [selectedEventTypeFilter]);

    useEffect(() => {
      const getUserProfile = () => {
        const userProfile = localStorage.getItem("userProfile");
        if (userProfile) {
          try {
            const user = JSON.parse(userProfile);
            console.log("Current user profile:", user);
            console.log(
              "Leader at 1 field:",
              user.leaderAt1 || user.leader_at_1 || user.leaderAt1Identifier,
            );

            const leaderAt1 =
              user.leaderAt1 ||
              user.leader_at_1 ||
              user.leaderAt1Identifier ||
              "";
            setCurrentUserLeaderAt1(leaderAt1);
          } catch (error) {
            console.error("Error parsing user profile:", error);
          }
        }
      };

      getUserProfile();
    }, []);

const getFilteredEventTypes = (allEventTypes) => {
  if (!allEventTypes || allEventTypes.length === 0) return [];
  const currentUser = JSON.parse(localStorage.getItem("userProfile")) || {};
  const userRole = currentUser?.role || "";
  const normalizedRole = userRole.toLowerCase();

  const isAdmin = normalizedRole === "admin";
  const isRegistrant = normalizedRole === "registrant";
  const isRegularUser = normalizedRole === "user";
  const isLeaderAt12 =
    normalizedRole === "leaderat12" ||
    normalizedRole.includes("leaderat12") ||
    normalizedRole.includes("leader at 12") ||
    normalizedRole.includes("leader@12");
  const isLeader = normalizedRole === "leader" && !isLeaderAt12;

  try {
    const eventTypeMapStr = localStorage.getItem("eventTypeMap");
    const eventTypeMap = eventTypeMapStr ? JSON.parse(eventTypeMapStr) : {};

    let filtered = allEventTypes.filter((eventType) => {
      const typeName =
        typeof eventType === "string"
          ? eventType
          : eventType.name || eventType;
      
      // For Active Teams, completely filter out "CELLS" event type
      if (isActiveTeams && typeName === "CELLS") {
        console.log("Filtering out CELLS for Active Teams");
        return false;
      }
      
      const typeInfo = eventTypeMap[typeName];

      if (!typeInfo) {
        console.log(
          `  -> No type info, showing to authorized users:`,
          isAdmin || isLeaderAt12 || isRegistrant || isLeader,
        );
        return isAdmin || isLeaderAt12 || isRegistrant || isLeader;
      }

      const isGlobalEvent = typeInfo.isGlobal === true;
      const isNonGlobal = typeInfo.isGlobal === false;

      // Global events: Show to everyone
      if (isGlobalEvent) {
        return true;
      }
      // Non-global events (isGlobal = false): Show to Admin, LeaderAt12, AND Registrant
      if (isNonGlobal) {
        const showToAuthorized = isAdmin || isLeaderAt12 || isRegistrant;
        return showToAuthorized;
      }
      if (isRegularUser) {
        return false;
      }

      const showToAuthorized =
        isAdmin || isLeaderAt12 || isLeader || isRegistrant;
      return showToAuthorized;
    });
    
    return filtered;
  } catch (error) {
    console.error("Error filtering event types:", error);
    let filtered = allEventTypes.filter(() => {
      return isAdmin || isLeaderAt12 || isRegistrant || isLeader;
    });
        if (isActiveTeams) {
      filtered = filtered.filter(type => {
        const typeName = typeof type === "string" ? type : type.name || type;
        return typeName !== "CELLS";
      });
    }
    
    return filtered;
  }
};

  const EventTypeGridView = ({
    eventTypes,
    onEventTypeClick,
    selectedEventTypeFilter,
  }) => {
    const theme = useTheme();
    const isMobileView = useMediaQuery(theme.breakpoints.down("md"));
    const isDarkMode = theme.palette.mode === "dark";
    const [searchQuery, setSearchQuery] = useState("");

    const styles = {
      container: {
        backgroundColor: isDarkMode
          ? theme.palette.background.paper
          : "#f8f9fa",
        borderRadius: "12px",
        padding: isMobileView ? "1rem" : "1.25rem",
        marginBottom: "1rem",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      },
      searchContainer: { marginBottom: "1rem" },
      searchInput: {
        "& .MuiOutlinedInput-root": {
          borderRadius: "12px",
          backgroundColor: isDarkMode ? "rgba(255,255,255,0.05)" : "#fff",
          "& fieldset": {
            borderColor: isDarkMode ? theme.palette.divider : "#ddd",
          },
          "&:hover fieldset": { borderColor: "#007bff" },
          "&.Mui-focused fieldset": { borderColor: "#007bff" },
        },
      },
      gridContainer: {
        display: "grid",
        gridTemplateColumns: isMobileView
          ? "repeat(auto-fill, minmax(250px, 1fr))"
          : "repeat(auto-fill, minmax(280px, 1fr))",
        gap: "20px",
        width: "100%",
      },
      card: {
        backgroundColor: isDarkMode ? theme.palette.background.default : "#fff",
        borderRadius: "12px",
        padding: "20px",
        cursor: "pointer",
        border: `2px solid ${isDarkMode ? theme.palette.divider : "#e0e0e0"}`,
        transition: "all 0.3s ease",
        display: "flex",
        flexDirection: "column",
        height: "160px",
        textAlign: "left",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          borderColor: "#007bff",
        },
      },
      cardActive: {
        borderColor: "#007bff",
        backgroundColor: isDarkMode ? "rgba(0,123,255,0.1)" : "#e7f3ff",
        transform: "scale(1.02)",
        boxShadow: "0 4px 12px rgba(0,123,255,0.2)",
      },
      name: {
        fontSize: "18px",
        fontWeight: 600,
        color: isDarkMode ? theme.palette.text.primary : "#333",
        mb: "8px",
        lineHeight: 1.3,
      },
      description: {
        fontSize: "14px",
        color: isDarkMode ? theme.palette.text.secondary : "#666",
        lineHeight: 1.5,
        flex: 1,
        overflow: "hidden",
        display: "-webkit-box",
        WebkitLineClamp: 3,
        WebkitBoxOrient: "vertical",
      },
      noResults: {
        textAlign: "center",
        padding: "3rem 1rem",
        color: isDarkMode ? theme.palette.text.secondary : "#666",
      },
    };

    return (
      <Box sx={styles.container}>
        <Box sx={styles.searchContainer}>
          <TextField
            fullWidth
            placeholder="Search event types..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={styles.searchInput}
          />
        </Box>

        {eventTypes.length === 0 ? (
          <Box sx={styles.noResults}>No event types found</Box>
        ) : (
          <Box sx={styles.gridContainer}>
            {eventTypes.map((type) => {
              const typeName =
                typeof type === "string" ? type : type.name || type;
              const isActive = selectedEventTypeFilter === typeName;

              // Get description from event type object
              const eventTypeObj = eventTypes.find(
                (et) => et.name?.toLowerCase() === typeName.toLowerCase(),
              ) || { name: typeName };

              const description =
                eventTypeObj.description

              return (
                <Box
                  key={typeName}
                  sx={{
                    ...styles.card,
                    ...(isActive ? styles.cardActive : {}),
                  }}
                  onClick={() => onEventTypeClick(typeName)}
                >
                  <Typography sx={styles.name}>
                    {typeName === "all" ? "ALL EVENTS" : typeName}
                  </Typography>
                  <Typography sx={styles.description}>{description}</Typography>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    );
  };

  const ViewToggle = () => (
    <Box
      sx={{
        display: "flex",
        gap: 1,
        alignItems: "center",
        backgroundColor: isDarkMode ? "rgba(255,255,255,0.05)" : "#f5f5f5",
        padding: "4px",
        borderRadius: "8px",
        border: `1px solid ${isDarkMode ? theme.palette.divider : "#e0e0e0"}`,
      }}
    >
      <Button
        variant={viewMode === "grid" ? "contained" : "text"}
        size="small"
        onClick={() => {
          setViewMode("grid");
        }}
        sx={{
          minWidth: "auto",
          padding: "4px 12px",
          fontSize: "0.75rem",
          fontWeight: 600,
          backgroundColor: viewMode === "grid" ? "#007bff" : "transparent",
          color:
            viewMode === "grid"
              ? "#fff"
              : isDarkMode
                ? theme.palette.text.secondary
                : "#666",
          "&:hover": {
            backgroundColor:
              viewMode === "grid"
                ? "#0056b3"
                : isDarkMode
                  ? "rgba(255,255,255,0.1)"
                  : "#f0f0f0",
          },
        }}
      >
        Grid
      </Button>
      <Button
        variant={viewMode === "table" ? "contained" : "text"}
        size="small"
        onClick={() => {
          setViewMode("table");
        }}
        sx={{
          minWidth: "auto",
          padding: "4px 12px",
          fontSize: "0.75rem",
          fontWeight: 600,
          backgroundColor: viewMode === "table" ? "#007bff" : "transparent",
          color:
            viewMode === "table"
              ? "#fff"
              : isDarkMode
                ? theme.palette.text.secondary
                : "#666",
          "&:hover": {
            backgroundColor:
              viewMode === "table"
                ? "#0056b3"
                : isDarkMode
                  ? "rgba(255,255,255,0.1)"
                  : "#f0f0f0",
          },
        }}
      >
        Table
      </Button>
    </Box>
  );
  const EventTypesList = ({
    eventTypes,
    selectedEventTypeFilter,
    onSelectEventType,
    onBackToGrid,
  }) => {
    const theme = useTheme();
    const isDarkMode = theme.palette.mode === "dark";
    const isMobileView = useMediaQuery(theme.breakpoints.down("lg"));
    const [searchQuery, setSearchQuery] = useState("");

    const filteredEventTypes = eventTypes.filter((type) => {
      const typeName =
        typeof type === "string" ? type : type.name || "";

      return typeName
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    });


    const getEventTypeColor = (typeName) => {
      const colors = {
        "Global Events": "#007bff",
        "Life Class": "#28a745",
        Workshop: "#fd7e14",
        Conference: "#dc3545",
        "All Cells": "#6c757d",
      };
      return colors[typeName] || "#007bff";
    };

    const styles = {
      container: {
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: isMobileView ? "16px" : "24px",
        backgroundColor: isDarkMode ? theme.palette.background.paper : "#fff",
      },
      header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "20px",
      },
      title: {
        fontSize: isMobileView ? "20px" : "22px",
        fontWeight: "bold",
        color: isDarkMode ? theme.palette.text.primary : "#333",
      },
      searchContainer: {
        marginBottom: "16px",
        position: "relative",
      },
      searchInput: {
        "& .MuiOutlinedInput-root": {
          borderRadius: "8px",
          backgroundColor: isDarkMode
            ? theme.palette.background.default
            : "#f8f9fa",
          paddingLeft: "40px",
        },
        "& .MuiInputBase-input": {
          padding: "12px 14px 12px 0",
          fontSize: "14px",
        },
      },
      searchIcon: {
        position: "absolute",
        left: "12px",
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 1,
        color: isDarkMode ? theme.palette.text.secondary : "#666",
      },
      eventTypesContainer: {
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      },
      eventTypeItem: {
        display: "flex",
        flexDirection: "column",
        padding: "12px 16px",
        borderRadius: "6px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        backgroundColor: isDarkMode ? "rgba(255,255,255,0.03)" : "#f8f9fa",
        border: `1px solid ${isDarkMode ? theme.palette.divider : "#e0e0e0"}`,
        borderLeft: `4px solid #007bff`,
        "&:hover": {
          transform: "translateX(2px)",
          backgroundColor: isDarkMode ? "rgba(0, 123, 255, 0.08)" : "#e7f3ff",
          borderLeftColor: "#0056b3",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        },
      },
      eventTypeItemActive: {
        backgroundColor: isDarkMode ? "rgba(0, 123, 255, 0.12)" : "#d0e7ff",
        borderColor: "#007bff",
        borderLeftColor: "#0056b3",
      },
      eventTypeName: {
        fontSize: "14px",
        fontWeight: 600,
        color: isDarkMode ? theme.palette.text.primary : "#333",
        marginBottom: "4px",
        lineHeight: 1.4,
      },
      eventTypeDescription: {
        fontSize: "12px",
        color: isDarkMode ? theme.palette.text.secondary : "#666",
        lineHeight: 1.4,
        overflow: "hidden",
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
      },
      noResults: {
        textAlign: "center",
        padding: "40px 20px",
        color: isDarkMode ? theme.palette.text.secondary : "#666",
      },
    };

    return (
      <Box sx={styles.container}>
        <Box sx={styles.header}>
          <Typography sx={styles.title}>Select Event Type</Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={onBackToGrid}
            sx={{
              textTransform: "none",
              borderRadius: "6px",
              padding: "6px 12px",
              fontSize: "13px",
            }}
          >
            Back
          </Button>
        </Box>

        <Box sx={styles.searchContainer}>
          <SearchIcon sx={styles.searchIcon} />
          <TextField
            fullWidth
            placeholder="Search event types..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={styles.searchInput}
            InputProps={{
              startAdornment: null,
            }}
          />
        </Box>

        {filteredEventTypes.length === 0 ? (
          <Box sx={styles.noResults}>
            <SearchIcon sx={{ fontSize: 40, color: "#ccc", mb: 1.5 }} />
            <Typography variant="h6" gutterBottom sx={{ fontSize: "18px" }}>
              No event types found
            </Typography>
            <Typography variant="body2" sx={{ fontSize: "13px" }}>
              Try a different search term
            </Typography>
          </Box>
        ) : (
          <Box sx={styles.eventTypesContainer}>
            {filteredEventTypes.map((type) => {
              const typeName =
                typeof type === "string" ? type : type.name || type;
              const isActive = selectedEventTypeFilter === typeName;
              const color = getEventTypeColor(typeName);

              // Get description from event type object
              const eventTypeObj = eventTypes.find(
                (et) => et.name?.toLowerCase() === typeName.toLowerCase(),
              ) || { name: typeName };

              const description =
                eventTypeObj.description;
              return (
                <Box
                  key={typeName}
                  sx={{
                    ...styles.eventTypeItem,
                    borderLeft: `4px solid ${color}`,
                    ...(isActive
                      ? {
                        ...styles.eventTypeItemActive,
                        borderLeftColor: color,
                      }
                      : {}),
                  }}
                  onClick={() => onSelectEventType(typeName)}
                >
                  <Typography sx={styles.eventTypeName}>
                    {typeName === "all" ? "All Events" : typeName}
                  </Typography>
                  <Typography sx={styles.eventTypeDescription}>
                    {description}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    );
  };

  const clearAllFilters = useCallback(() => {
    setSearchQuery("");
    setIsSearching(false);
    setTotalEvents(events.length || 0)

  }, [viewFilter, userRole, fetchEvents, rowsPerPage, DEFAULT_API_START_DATE]);

  const [allCurrentEvents, setAllCurrentEvents] = useState([]);
  const [isSearching, setIsSearching] = useState(null);

  const fetchAllCurrentEvents = useCallback(async () => {
    try {
      let shouldApplyPersonalFilter = undefined;
      if (userRole === "admin" || userRole === "leader at 12") {
        shouldApplyPersonalFilter =
          viewFilter === "personal" ? true : undefined;
      }
      setCurrentPage(1);

      const filters = {
        page: 1,
        limit: rowsPerPage,
        status: selectedStatus !== "all" ? selectedStatus : undefined,
        event_type:
          selectedEventTypeFilter !== "all"
            ? selectedEventTypeFilter
            : undefined,
        personal: shouldApplyPersonalFilter,
        start_date: DEFAULT_API_START_DATE,
        must_paginate: false,
      };

      const [params, endpoint] = fetchEventsFilters(filters);

      const queryString = new URLSearchParams(params).toString();
      console.log("Fetching search filters from:", params);

      const response = await authFetch(`${endpoint}?${queryString}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const allEvents = data.events || [];
      setAllCurrentEvents(allEvents);
    } catch (e) {
      console.error("Error fetching all current events", e);
    }
  }, [
    userRole,
    viewFilter,
    fetchEvents,
    rowsPerPage,
    selectedStatus,
    selectedEventTypeFilter,
    DEFAULT_API_START_DATE,
  ]);

  useEffect(() => {
    if (!isSearching) return
    fetchAllCurrentEvents()
  }, [selectedStatus, selectedEventTypeFilter, viewFilter, userRole])

  const handleSearchSubmit = (searchText) => {
    if (!searchText.trim()) return;
    const trimmedSearch = searchText.trim();

    const newArray = allCurrentEvents.filter((event) => {
      let found = false;
      [
        "Event Name",
        "eventName",
        "EventName",
        "Leader",
        "eventLeaderName",
        "EventLeaderName",
        "Email",
        "eventLeaderEmail",
        "EventLeaderEmail",
        "Leader at 12",
        "Leader @12",
        "leader12",
      ].forEach((field) => {
        if (event[field] && typeof event[field] === "string") {
          found =
            found ||
            event[field].toLowerCase().includes(trimmedSearch.toLowerCase());
        }
      });
      return found;
    });
    console.log("searched", allCurrentEvents, "with", trimmedSearch);
    setTotalEvents(newArray.length || 0);
    return newArray;
  };

  const searchDebounceRef = useRef(null);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  useEffect(() => {
    if (searchQuery.trim() === "") {
      clearAllFilters();
      setIsSearching(false);
    } else if (!isSearching) setIsSearching(true);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchQuery);
    }, 300);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchQuery]);

  const filteredEvents = useMemo(() => {
    if (isSearching === null) return events;
    if (!debouncedSearchTerm.trim()) return events;
    return handleSearchSubmit(debouncedSearchTerm) || [];
  }, [allCurrentEvents, debouncedSearchTerm, selectedStatus]);
  console.log(
    "issearching",
    isSearching,
    filteredEvents,
    allCurrentEvents,
    searchQuery,
  );

  const handleRowsPerPageChange = useCallback((e) => {
    const newRowsPerPage = Number(e.target.value);
    const cacheKey = `${selectedEventTypeFilter}_${selectedStatus}_${viewFilter}`;
    const cached = eventsCache.current[cacheKey];

    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1);

    if (cached) {
      setTotalPages(Math.ceil(cached.length / newRowsPerPage) || 1);
      setEvents(cached.slice(0, newRowsPerPage));
    }
  }, [selectedEventTypeFilter, selectedStatus, viewFilter]);


  const handleCaptureClick = useCallback(async (event) => {
    try {
      const token = localStorage.getItem("access_token");
      let eventId = event._id || event.id;
      const originalId = eventId;
      if (eventId && eventId.includes("_")) {
        eventId = eventId.split("_")[0];
      }

      if (!eventId || eventId === "undefined") {
        console.error("handleCaptureClick: no valid ID on event", event);
        setSelectedEvent(event);
        setAttendanceModalOpen(true);
        return;
      }

      const response = await fetch(`${BACKEND_URL}/events/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        console.error("Failed to fetch full event, using local event data");
        setSelectedEvent(event);
        setAttendanceModalOpen(true);
        return;
      }
      const fullEvent = await response.json();
      const enrichedEvent = {
        ...event,
        ...fullEvent,
        _id: originalId,
        original_event_id: eventId,
      };
      setSelectedEvent(enrichedEvent);
      setAttendanceModalOpen(true);
    } catch (err) {
      console.error("Failed to fetch full event:", err);
      setSelectedEvent(event);
      setAttendanceModalOpen(true);
    }
  }, [BACKEND_URL]);

  const handleCloseCreateEventModal = useCallback(
    (shouldRefresh = false) => {
      setCreateEventModalOpen(false);

      if (shouldRefresh) {
        clearCache();
        setCurrentPage(1);

        setTimeout(() => {
          const refreshParams = {
            page: 1,
            limit: rowsPerPage,
            start_date: DEFAULT_API_START_DATE,
            _t: Date.now(),
            status: selectedStatus !== "all" ? selectedStatus : undefined,
            search: searchQuery.trim() || undefined,
          };

          if (
            selectedEventTypeFilter === "all" ||
            selectedEventTypeFilter === "CELLS" ||
            !selectedEventTypeFilter
          ) {
            refreshParams.event_type = "CELLS";

            if (isLeaderAt12) {
              refreshParams.leader_at_12_view = true;
              if (viewFilter === "personal") {
                refreshParams.personal_cells_only = true;
              } else {
                refreshParams.include_subordinate_cells = true;
              }
            } else if (isAdmin && viewFilter === "personal") {
              refreshParams.personal = true;
            }
          } else {
            refreshParams.event_type = selectedEventTypeFilter;
          }

          fetchEvents(refreshParams, true);
        }, 800);
      }
    },
    [
      clearCache,
      rowsPerPage,
      selectedStatus,
      selectedEventTypeFilter,
      searchQuery,
      isLeaderAt12,
      isAdmin,
      viewFilter,
      fetchEvents,
      DEFAULT_API_START_DATE,
    ],
  );

  const applyFilters = useCallback(
    (filters) => {
      setActiveFilters(filters);
      setFilterOptions(filters);
      setCurrentPage(1);

      const shouldApplyPersonalFilter =
        viewFilter === "personal" &&
        (userRole === "admin" || userRole === "leader at 12");

      const apiFilters = {
        page: 1,
        limit: rowsPerPage,
        status: selectedStatus !== "all" ? selectedStatus : undefined,
        event_type:
          selectedEventTypeFilter !== "all"
            ? selectedEventTypeFilter
            : undefined,
        search: searchQuery.trim() || undefined,
        personal: shouldApplyPersonalFilter ? true : undefined,
        start_date: DEFAULT_API_START_DATE,
      };

      if (filters.leader && filters.leader.trim()) {
        apiFilters.search = filters.leader.trim();
      }

      if (filters.day && filters.day !== "all") {
        apiFilters.day = filters.day;
      }

      if (filters.eventType && filters.eventType !== "all") {
        apiFilters.event_type = filters.eventType;
      }

      Object.keys(apiFilters).forEach(
        (key) => apiFilters[key] === undefined && delete apiFilters[key],
      );

      fetchEvents(apiFilters, true);
    },
    [
      viewFilter,
      userRole,
      rowsPerPage,
      selectedStatus,
      selectedEventTypeFilter,
      searchQuery,
      fetchEvents,
      DEFAULT_API_START_DATE,
    ],
  );

  const handleAttendanceSubmit = useCallback(
    async (data) => {
      try {
        const token = localStorage.getItem("access_token");
        const eventId = selectedEvent._id;
        const eventName = selectedEvent.eventName || "Event";
        const eventDate = selectedEvent.date || "";

        const leaderEmail = currentUser?.email || "";
        const leaderName =
          `${(currentUser?.name || "").trim()} ${(
            currentUser?.surname || ""
          ).trim()}`.trim() ||
          currentUser?.name ||
          "";

        let payload;

        if (data === "did_not_meet") {
          payload = {
            attendees: [],
            all_attendees: [],
            leaderEmail,
            leaderName,
            did_not_meet: true,
            event_date: eventDate,
          };
        } else if (Array.isArray(data)) {
          payload = {
            attendees: data,
            all_attendees: data,
            leaderEmail,
            leaderName,
            did_not_meet: false,
            event_date: eventDate,
          };
        } else {
          payload = {
            ...data,
            leaderEmail,
            leaderName,
            event_date: eventDate,
          };
        }

        const response = await fetch(
          `${BACKEND_URL.replace(/\/$/, "")}/submit-attendance/${eventId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || `HTTP ${response.status}`);
        }

        const result = await response.json();
        console.log("Attendance submission result:", result);

        clearCache();

        setAttendanceModalOpen(false);
        setSelectedEvent(null);

        toast.success(
          payload.did_not_meet
            ? `${eventName} marked as 'Did Not Meet'.`
            : `Successfully captured attendance for ${eventName}`,
        );

        setTimeout(() => {
          (async () => {
            try {
              const shouldApplyPersonalFilter =
                viewFilter === "personal" &&
                (userRole === "admin" || userRole === "leader at 12");

              const refreshParams = {
                page: 1,
                limit: rowsPerPage,
                start_date: DEFAULT_API_START_DATE,
                _t: Date.now(),
                ...(searchQuery.trim() && { search: searchQuery.trim() }),
                ...(selectedEventTypeFilter !== "all" && {
                  event_type: selectedEventTypeFilter,
                }),
                ...(selectedStatus !== "all" && { status: selectedStatus }),
                ...(shouldApplyPersonalFilter && { personal: true }),
                ...(isLeaderAt12 && {
                  leader_at_12_view: true,
                  include_subordinate_cells: true,
                  ...(currentUserLeaderAt1 && {
                    leader_at_1_identifier: currentUserLeaderAt1,
                  }),
                  ...(viewFilter === "personal"
                    ? { show_personal_cells: true, personal: true }
                    : { show_all_authorized: true }),
                }),
              };
              await fetchEvents(refreshParams, true);
            } catch (refreshError) {
              console.error("Error refreshing events:", refreshError);
              toast.error("Failed to refresh events list");
            }
          })();
        }, 1000);

        return { success: true, message: "Attendance submitted successfully" };
      } catch (error) {
        console.error("Error submitting attendance:", error);

        let errorMessage = "Failed to submit attendance";

        if (error.message) {
          errorMessage = error.message;
        }

        toast.error(`Error: ${errorMessage}`);

        return { success: false, message: errorMessage };
      }
    },
    [
      selectedEvent,
      currentUser,
      BACKEND_URL,
      clearCache,
      fetchEvents,
      rowsPerPage,
      searchQuery,
      selectedEventTypeFilter,
      selectedStatus,
      isLeaderAt12,
      currentUserLeaderAt1,
      viewFilter,
      userRole,
      DEFAULT_API_START_DATE,
    ],
  );
  useEffect(() => {
    eventsCache.current = {};
  }, []);
  const handleEditEvent = useCallback((event) => {
    console.log("THE EVENT",event)
    
    let eventId = event._id;
    let eventDate = event.date;
    if (eventId && eventId.includes("_")) {
      const parts = eventId.split("_");
      if (parts.length > 0 && isValidObjectId(parts[0])) {
        eventId = parts[0];
      }
    }

    if (event.isTicketed === true){
      let url = new URL(window.location.href);
      url.searchParams.set("eventId", eventId);
      window.history.pushState({}, "", url);
      setSelectedEventTypeObj(event)
      setCreateEventModalOpen(true);
      return
    }

    const eventToEdit = {
      ...event,
      _id: eventId,
      original_composite_id: event._id,
      date: eventDate,
      UUID: event.UUID || event.uuid || null,
    };

    if (!eventToEdit._id && !eventToEdit.UUID) {
      toast.error(
        "Cannot edit event: Missing identifier. Please refresh and try again.",
      );
      return;
    }
    setSelectedEvent(eventToEdit);
    if (event.isTicketed === true) return //extra precaustion to not open edit event model if it is a ticketed event
    setEditModalOpen(true);
  }, []);

  const handleDeleteEvent = useCallback(
    async (event) => {
      if (
        window.confirm(`Are you sure you want to delete "${event.eventName}"?`)
      ) {
        try {
          const token = localStorage.getItem("access_token");

          let eventId = event._id;
          if (eventId && eventId.includes("_")) {
            const parts = eventId.split("_");
            if (parts.length > 0 && isValidObjectId(parts[0])) {
              eventId = parts[0];
            }
          }

          const response = await authFetch(`${BACKEND_URL}/events/${eventId}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });

          if (response.ok || response.status === 200) {
            const refreshParams = {
              page: currentPage,
              limit: rowsPerPage,
              start_date: DEFAULT_API_START_DATE,
              _t: Date.now(),
            };

            if (selectedEventTypeFilter && selectedEventTypeFilter !== "all") {
              refreshParams.event_type = selectedEventTypeFilter;
            } else {
              refreshParams.event_type = "CELLS";
            }

            if (selectedStatus && selectedStatus !== "all") {
              refreshParams.status = selectedStatus;
            }

            if (searchQuery && searchQuery.trim()) {
              refreshParams.search = searchQuery.trim();
            }

            if (
              selectedEventTypeFilter === "all" ||
              selectedEventTypeFilter === "CELLS"
            ) {
              if (isLeaderAt12) {
                refreshParams.leader_at_12_view = true;
                refreshParams.include_subordinate_cells = true;

                if (currentUserLeaderAt1) {
                  refreshParams.leader_at_1_identifier = currentUserLeaderAt1;
                }

                if (viewFilter === "personal") {
                  refreshParams.show_personal_cells = true;
                  refreshParams.personal = true;
                } else {
                  refreshParams.show_all_authorized = true;
                }
              } else if (isAdmin && viewFilter === "personal") {
                refreshParams.personal = true;
              }
            }

            await fetchEvents(refreshParams, true);

            toast.success("Event deleted successfully!");
          }
        } catch (error) {
          console.error("Error deleting event:", error);

          let errorMessage = "Failed to delete event";
          if (error.response?.data) {
            errorMessage =
              error.response.data.detail || error.response.data.message;
          } else if (error.message) {
            errorMessage = error.message;
          }

          toast.error(`Error: ${errorMessage}`);
        }
      }
    },
    [
      BACKEND_URL,
      currentPage,
      rowsPerPage,
      selectedEventTypeFilter,
      selectedStatus,
      searchQuery,
      isLeaderAt12,
      isAdmin,
      viewFilter,
      currentUserLeaderAt1,
      fetchEvents,
      DEFAULT_API_START_DATE,
      authFetch,
    ],
  );

  const handleCloseEditModal = useCallback(
    async (shouldRefresh = false, updatedEventData = null) => {
      setEditModalOpen(false);

      if (shouldRefresh) {
        // Read selectedEvent BEFORE clearing it
        const originalDay = selectedEvent?.Day || selectedEvent?.day;
        const newDay = updatedEventData?.Day || updatedEventData?.day;

        if (originalDay && newDay && originalDay !== newDay) {
          toast.info(
            `Cell moved from ${originalDay} to ${newDay}!\n\nNote: The cell has been updated but may not appear in the current view. Check the ${newDay} filter to see it.`,
            {
              autoClose: 8000,
              position: "top-center",
            },
          );
        }
        setSelectedEvent(null);
        if (updatedEventData) {
          setEvents((prev) =>
            prev.map((ev) => {
              const evId = ev._id?.includes("_") ? ev._id.split("_")[0] : ev._id;
              const updatedId = updatedEventData._id?.includes("_")
                ? updatedEventData._id.split("_")[0]
                : updatedEventData._id;
              if (evId === updatedId) {
                return { ...ev, ...updatedEventData };
              }
              return ev;
            }),
          );
        }

        eventsCache.current = {};
        if (cacheRef.current) {
          cacheRef.current.data.clear();
          cacheRef.current.timestamp.clear();
        }

        // Build refresh parameters
        const refreshParams = {
          page: currentPage,
          limit: rowsPerPage,
          start_date: DEFAULT_API_START_DATE,
          _t: Date.now(),
          status: selectedStatus !== "all" ? selectedStatus : undefined,
          event_type:
            selectedEventTypeFilter === "all"
              ? "CELLS"
              : selectedEventTypeFilter,
        };

        if (searchQuery && searchQuery.trim()) {
          refreshParams.search = searchQuery.trim();
        }

        if (
          selectedEventTypeFilter === "all" ||
          selectedEventTypeFilter === "CELLS"
        ) {
          if (isLeaderAt12) {
            refreshParams.leader_at_12_view = true;
            refreshParams.include_subordinate_cells = true;

            if (currentUserLeaderAt1) {
              refreshParams.leader_at_1_identifier = currentUserLeaderAt1;
            }

            if (viewFilter === "personal") {
              refreshParams.show_personal_cells = true;
              refreshParams.personal = true;
            } else {
              refreshParams.show_all_authorized = true;
            }
          } else if (isAdmin && viewFilter === "personal") {
            refreshParams.personal = true;
          }
        }

        Object.keys(refreshParams).forEach(
          (key) =>
            (refreshParams[key] === undefined || refreshParams[key] === "") &&
            delete refreshParams[key],
        );

        await fetchEvents(refreshParams, true);
      } else {
        setSelectedEvent(null);
      }
    },
    [
      selectedEvent,
      currentPage,
      rowsPerPage,
      selectedStatus,
      searchQuery,
      selectedEventTypeFilter,
      fetchEvents,
      DEFAULT_API_START_DATE,
      isLeaderAt12,
      currentUserLeaderAt1,
      viewFilter,
      isAdmin,
    ],
  );

  const handleCloseEventTypesModal = useCallback(() => {
    setEventTypesModalOpen(false);

    setTimeout(() => {
      setEditingEventType(null);
    }, 300);
  }, []);

  const handleDeleteType = useCallback(async () => {
    try {
      const token = localStorage.getItem("access_token");

      if (!token) {
        toast.error("Please log in again");
        setTimeout(() => (window.location.href = "/login"), 2000);
        return;
      }

      const typeName =
        typeof toDeleteType === "string"
          ? toDeleteType
          : toDeleteType?.name || toDeleteType?.eventType || "";

      if (!typeName) {
        throw new Error("No event type name provided for deletion");
      }

      const encodedTypeName = encodeURIComponent(typeName);
      const url = `${BACKEND_URL}/event-types/${encodedTypeName}`;

      try {
        const response = await authFetch(url, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorData = await response.json();

          if (
            response.status === 400 &&
            errorData.detail &&
            typeof errorData.detail === "object"
          ) {
            const eventsCount = errorData.detail.events_count || 0;
            const eventsList = errorData.detail.event_samples || [];

            console.log("Events using this type:", eventsCount);

            const eventsListText = eventsList
              .slice(0, 5)
              .map(
                (e) =>
                  `• ${e.name} (${e.date || "No date"}) - Status: ${e.status}`,
              )
              .join("\n");

            const shouldForceDelete = window.confirm(
              ` Cannot delete "${typeName}"\n\n` +
              `${eventsCount} event(s) are using this event type:\n\n` +
              `${eventsListText}\n` +
              `${eventsCount > 5 ? `\n...and ${eventsCount - 5} more\n` : ""
              }\n` +
              `━\n\n` +
              ` FORCE DELETE OPTION:\n\n` +
              `Click OK to DELETE ALL ${eventsCount} events and the event type.\n` +
              `Click Cancel to keep everything.\n\n` +
              ` THIS ACTION CANNOT BE UNDONE!`,
            );

            if (shouldForceDelete) {
              const forceUrl = `${url}?force=true`;
              const forceResponse = await authFetch(forceUrl, {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
              });

              const forceResult = await forceResponse.json();

              await fetchEventTypes();
              setConfirmDeleteOpen(false);
              setToDeleteType(null);

              if (
                selectedEventTypeFilter === typeName ||
                selectedEventTypeFilter?.toUpperCase() ===
                typeName.toUpperCase()
              ) {
                setSelectedEventTypeFilter("all");
                setSelectedEventTypeObj(null);

                setTimeout(() => {
                  fetchEvents(
                    {
                      page: 1,
                      limit: rowsPerPage,
                      event_type: "CELLS",
                      start_date: DEFAULT_API_START_DATE,
                    },
                    true,
                  );
                }, 300);
              }

              toast.success(
                ` Deleted event type "${typeName}" and ${forceResult.events_deleted || eventsCount
                } events`,
                { autoClose: 5000 },
              );
            } else {
              toast.info("Deletion cancelled", { autoClose: 3000 });
            }

            setConfirmDeleteOpen(false);
            setToDeleteType(null);
            return;
          }

          throw new Error(
            errorData.detail ||
            errorData.message ||
            "Failed to delete event type",
          );
        }

        const result = await response.json();

        await fetchEventTypes();
        setConfirmDeleteOpen(false);
        setToDeleteType(null);

        if (
          selectedEventTypeFilter === typeName ||
          selectedEventTypeFilter?.toUpperCase() === typeName.toUpperCase()
        ) {
          setSelectedEventTypeFilter("all");
          setSelectedEventTypeObj(null);

          setTimeout(() => {
            fetchEvents(
              {
                page: 1,
                limit: rowsPerPage,
                event_type: "CELLS",
                start_date: DEFAULT_API_START_DATE,
              },
              true,
            );
          }, 300);
        }

        toast.success(
          result.message || `Event type "${typeName}" deleted successfully!`,
        );
      } catch (error) {
        console.error("Delete error:", error);

        if (error.message?.includes("401") || error.status === 401) {
          toast.error("Session expired. Logging out...");
          localStorage.removeItem("token");
          localStorage.removeItem("userProfile");
          setTimeout(() => (window.location.href = "/login"), 2000);
          return;
        }

        let errorMessage = "Failed to delete event type";
        if (error.message) {
          errorMessage = error.message;
        }

        setConfirmDeleteOpen(false);
        setToDeleteType(null);
        toast.error(errorMessage, { autoClose: 7000 });
      }
    } catch (error) {
      console.error(" Unexpected error:", error);
      toast.error(`Unexpected error: ${error.message}`, { autoClose: 7000 });
      setConfirmDeleteOpen(false);
      setToDeleteType(null);
    }
  }, [
    BACKEND_URL,
    selectedEventTypeFilter,
    toDeleteType,
    fetchEventTypes,
    fetchEvents,
    rowsPerPage,
    DEFAULT_API_START_DATE,
    authFetch,
    setConfirmDeleteOpen,
    setToDeleteType,
    setSelectedEventTypeFilter,
    setSelectedEventTypeObj,
  ]);

  const handlePageChange = useCallback(
    (newPage) => {
      const cacheKey = `${selectedEventTypeFilter}_${selectedStatus}_${viewFilter}`;
      const cached = eventsCache.current[cacheKey];

      setCurrentPage(newPage);

      if (cached) {
        const skip = (newPage - 1) * rowsPerPage;
        setEvents(cached.slice(skip, skip + rowsPerPage));
      }
    },
    [selectedEventTypeFilter, selectedStatus, viewFilter, rowsPerPage]
  );
  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages && !isLoading) {
      handlePageChange(currentPage + 1);
    }
  }, [currentPage, totalPages, isLoading, handlePageChange]);

  const handlePreviousPage = useCallback(() => {
    if (currentPage > 1 && !isLoading) {
      handlePageChange(currentPage - 1);
    }
  }, [currentPage, isLoading, handlePageChange]);

  useEffect(() => {
    const checkAccess = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const token = localStorage.getItem("access_token");
      const userProfile = localStorage.getItem("userProfile");

      if (!token || !userProfile) {
        toast.error("Please log in to access events");
        setTimeout(() => (window.location.href = "/login"), 2000);
        return;
      }

      try {
        const currentUser = JSON.parse(userProfile);
        const userRole = currentUser?.role?.toLowerCase() || "";
        const email = currentUser?.email || "";
        console.log(email);

        const isAdmin = userRole === "admin";
        const isLeaderAt12 =
          userRole.includes("leader at 12") ||
          userRole.includes("leader@12") ||
          userRole.includes("leader @12") ||
          userRole.includes("leader at12") ||
          userRole === "leader at 12";
        const isRegistrant = userRole === "registrant";
        const isLeader144or1728 =
          userRole.includes("leader at 144") ||
          userRole.includes("leader at 1278") ||
          userRole.includes("leader at 1728");

        const isAnyLeader =
          userRole.includes("leader") || isLeaderAt12 || isLeader144or1728;

        const isUser = userRole === "user";

        if (isUser) {
          try {
            const response = await authFetch(
              `${BACKEND_URL}/check-leader-status`,
              {
                headers: { Authorization: `Bearer ${token}` },
              },
            );

            const { hasCell, canAccessEvents } = response.data;

            if (!canAccessEvents || !hasCell) {
              toast.warning("You must have a cell to access the Events page");
              setTimeout(() => (window.location.href = "/"), 2000);
              return;
            }
          } catch (error) {
            console.error(" Error checking cell status:", error);
            toast.error("Unable to verify access. Please contact support.");
            setTimeout(() => (window.location.href = "/"), 2000);
            return;
          }
        }
        const hasAccess =
          isAdmin ||
          isLeaderAt12 ||
          isRegistrant ||
          isLeader144or1728 ||
          isAnyLeader ||
          isUser;

        if (!hasAccess) {
          toast.warning("You do not have permission to access the Events page");
          setTimeout(() => (window.location.href = "/"), 2000);
        }
      } catch (error) {
        console.error(" Error in access check:", error);
        toast.error("Error verifying access");
      }
    };

    checkAccess();
  }, [BACKEND_URL]);

  useEffect(() => {
    if (eventTypes.length > 0 && !selectedEventTypeFilter) {
      setSelectedEventTypeFilter("all");
    }
  }, [eventTypes.length, selectedEventTypeFilter]);

  const isOverdue = useCallback((event) => {
    const did_not_meet = event.did_not_meet || false;
    const hasAttendees = event.attendees && event.attendees.length > 0;
    const status = (event.status || event.Status || "").toLowerCase().trim();
    const isMissedRecurrent =
      event.is_recurring && event.recurrent_status === "missed";

    if (
      hasAttendees ||
      status === "complete" ||
      status === "closed" ||
      status === "did_not_meet" ||
      did_not_meet ||
      isMissedRecurrent
    ) {
      return false;
    }
    if (!event?.date) return false;
    const eventDate = new Date(event.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);

    return eventDate < today;
  }, []);

  const handleSaveEventType = useCallback(
    async (eventTypeData, eventTypeId = null) => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          throw new Error("No authentication token found");
        }

        const oldName = editingEventType?.name;
        let url, method;

        if (eventTypeId || editingEventType) {
          const identifier = oldName;
          if (!identifier) {
            throw new Error(
              "Cannot update: original event type name not found",
            );
          }

          const encodedName = encodeURIComponent(identifier);
          url = `${BACKEND_URL}/event-types/${encodedName}`;
          method = "PUT";
        } else {
          url = `${BACKEND_URL}/event-types`;
          method = "POST";
        }

        const response = await authFetch(url, {
          method: method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(eventTypeData),
        });

        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch (e) {
            errorData = {
              detail: `HTTP ${response.status}: ${response.statusText}`,
              error: e,
            };
          }

          throw new Error(
            errorData.detail || `Failed to save event type: ${response.status}`,
          );
        }

        const result = await response.json();

        setEventTypesModalOpen(false);
        setEditingEventType(null);

        await fetchEventTypes();

        if (
          oldName &&
          selectedEventTypeFilter === oldName &&
          result.name !== oldName
        ) {
          setSelectedEventTypeFilter(result.name);
        }

        toast.success(
          `Event type ${eventTypeId ? "updated" : "created"} successfully!`,
        );
        return result;
      } catch (error) {
        console.error(` Error saving event type:`, error);
        toast.error(`Failed to save event type: ${error.message}`);
        throw error;
      }
    },
    [BACKEND_URL, editingEventType, fetchEventTypes, selectedEventTypeFilter],
  );
  useEffect(() => {
    if (!selectedEventTypeFilter || !showingEvents) return;

    const cacheKey = `${selectedEventTypeFilter}_${selectedStatus}_${viewFilter}`;
    const cached = eventsCache.current[cacheKey];

    if (cached) {
      console.log("Using cached data for:", cacheKey);
      const skip = (currentPage - 1) * rowsPerPage;
      setEvents(cached.slice(skip, skip + rowsPerPage));
      setTotalEvents(cached.length);
      setTotalPages(Math.ceil(cached.length / rowsPerPage) || 1);
      return;
    }

    console.log("Fetching from server for:", cacheKey);
    const fetchParams = {
      page: 1,
      limit: 100,
      must_paginate: false,
      start_date: DEFAULT_API_START_DATE,
      status: selectedStatus || "incomplete",
      event_type:
        selectedEventTypeFilter === "all" ? "CELLS" : selectedEventTypeFilter,
    };

    const isCellEvent =
      selectedEventTypeFilter === "all" ||
      selectedEventTypeFilter === "CELLS" ||
      selectedEventTypeFilter.toLowerCase().includes("cell");

    if (isCellEvent) {
      if (isAdmin && viewFilter === "personal") {
        fetchParams.personal = true;
      } else if (isRegistrant || isRegularUser) {
        fetchParams.personal = true;
      } else if (isLeaderAt12) {
        fetchParams.leader_at_12_view = true;
        if (viewFilter === "personal") {
          fetchParams.personal = true;
          fetchParams.show_personal_cells = true;
        } else {
          fetchParams.include_subordinate_cells = true;
          fetchParams.show_all_authorized = true;
        }
      }
    }

    (async () => {
      setLoading(true);
      setIsLoading(true);
      try {
        const token = localStorage.getItem("access_token");
        const [params, endpoint] = fetchEventsFilters(fetchParams);
        const queryString = new URLSearchParams(params).toString();
        const response = await authFetch(`${endpoint}?${queryString}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const allFetched = data.events || [];
        //Events sort day order

        allFetched.sort((a, b) => {
          const aOverdue = a._is_overdue || false;
          const bOverdue = b._is_overdue || false;

          if (aOverdue !== bOverdue) return aOverdue ? 1 : -1;
          return new Date(b.date) - new Date(a.date);
        });
        eventsCache.current[cacheKey] = allFetched;
        setTotalEvents(allFetched.length);
        setTotalPages(Math.ceil(allFetched.length / rowsPerPage) || 1);
        setCurrentPage(1);
        setEvents(allFetched.slice(0, rowsPerPage));
      } catch (error) {
        console.error("Fetch error:", error);
        setEvents([]);
      } finally {
        setLoading(false);
        setIsLoading(false);
      }
    })();
  }, [
    selectedEventTypeFilter,
    showingEvents,
    selectedStatus,
    viewFilter,
    isAdmin,
    isRegistrant,
    isRegularUser,
    isLeaderAt12,
    DEFAULT_API_START_DATE,
  ]);

  const StatusBadges = ({
    selectedStatus,
    setSelectedStatus,
    setCurrentPage,
    rowsPerPage,
    searchQuery,
    selectedEventTypeFilter,
    viewFilter,
    isAdmin,
    isRegistrant,
    isRegularUser,
    isLeaderAt12,
    isLeader,
    fetchEvents,
    DEFAULT_API_START_DATE,
  }) => {
    const statuses = [
      {
        value: "incomplete",
        label: "INCOMPLETE",
        style: styles.statusBadgeIncomplete,
      },
      {
        value: "complete",
        label: "COMPLETE",
        style: styles.statusBadgeComplete,
      },
      {
        value: "did_not_meet",
        label: "DID NOT MEET",
        style: styles.statusBadgeDidNotMeet,
      },
    ];

    const handleStatusClick = (statusValue) => {
      setSelectedStatus(statusValue);
      setCurrentPage(1);

      const fetchParams = {
        page: 1,
        limit: rowsPerPage,
        start_date: DEFAULT_API_START_DATE,
        status: statusValue,
        event_type:
          selectedEventTypeFilter === "all" ? "CELLS" : selectedEventTypeFilter,
        _t: Date.now(),
      };

      if (searchQuery.trim()) {
        fetchParams.search = searchQuery.trim();
      }

      const isCellEvent =
        selectedEventTypeFilter === "all" ||
        selectedEventTypeFilter === "CELLS" ||
        (selectedEventTypeFilter &&
          selectedEventTypeFilter.toLowerCase().includes("cell"));

      if (isCellEvent) {
        if (isAdmin) {
          if (viewFilter === "personal") {
            fetchParams.personal = true;
          }
        } else if (isRegistrant || isRegularUser) {
          fetchParams.personal = true;
        } else if (isLeaderAt12) {
          fetchParams.leader_at_12_view = true;
          fetchParams.include_subordinate_cells = true;

          if (viewFilter === "personal") {
            fetchParams.show_personal_cells = true;
            fetchParams.personal = true;
          } else {
            fetchParams.show_all_authorized = true;
          }
        } else if (isLeader) {
          fetchParams.personal = true;
        }
      }

      if (!isCellEvent) {
        delete fetchParams.personal;
        delete fetchParams.leader_at_12_view;
        delete fetchParams.show_personal_cells;
        delete fetchParams.show_all_authorized;
        delete fetchParams.include_subordinate_cells;
      }

      fetchEvents(fetchParams, true);
    };

    const canDownload =
      selectedStatus === "complete" || selectedStatus === "did_not_meet";
    const [period, setPeriod] = useState("current");
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const dropdownRef = useRef(null);

    useEffect(() => {
      const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
          setDropdownOpen(false);
        }
      };

      if (dropdownOpen) {
        document.addEventListener("mousedown", handleClickOutside);
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [dropdownOpen]);

    return (
      <div style={styles.statusBadgeContainer}>
        {statuses.map((status) => (
          <button
            key={status.value}
            style={{
              ...styles.statusBadge,
              ...status.style,
              ...(selectedStatus === status.value
                ? styles.statusBadgeActive
                : {}),
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "scale(0.94)";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
            onClick={() => handleStatusClick(status.value)}
          >
            {status.label}
          </button>
        ))}

        {/* Integrated dropdown in download button - only shown when COMPLETE or DID NOT MEET selected */}
        {canDownload && (
          <div
            ref={dropdownRef}
            style={{
              marginLeft: 6,
              position: "relative",
            }}
          >
            {/* Main download button with integrated dropdown */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDropdownOpen(!dropdownOpen);
              }}
              style={{
                ...styles.statusBadge,
                backgroundColor: "#f1f3f5",
                color: "#35669b",
                borderColor: "#ddd",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                whiteSpace: "nowrap",
                padding: "0.4rem 0.8rem",
                fontSize: "5rem",
                position: "relative",
              }}
              title={`Download ${selectedStatus === "complete" ? "COMPLETED" : "DID NOT MEET"} attendance`}
            >
              <GetAppIcon fontSize="small" style={{ color: "#6c757d" }} />
              <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>
                DOWNLOAD
              </span>
              <span style={{
                fontSize: "0.7rem",
                marginLeft: "4px",
                borderLeft: "1px solid #ccc",
                paddingLeft: "8px",
                display: "flex",
                alignItems: "center",
                gap: "2px"
              }}>

                <span style={{ fontSize: "0.7rem" }}>▼</span>
              </span>
            </button>

            {/* Dropdown menu attached to download button */}
            {dropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  zIndex: 1000,
                  backgroundColor: "#fff",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  marginTop: "4px",
                  minWidth: "160px",
                  overflow: "hidden",
                }}
              >
                <div style={{
                  padding: "0.5rem 0.8rem",
                  fontSize: "0.7rem",
                  color: "#999",
                  borderBottom: "1px solid #eee",
                  backgroundColor: "#f9f9f9"
                }}>
                  Select week period:
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPeriod("current");
                    setDropdownOpen(false);
                    downloadEventsByStatus(selectedStatus, "current");
                  }}
                  style={{
                    width: "100%",
                    padding: "0.7rem 0.8rem",
                    backgroundColor: "#fff",
                    color: "#333",
                    border: "none",
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    borderBottom: "1px solid #eee",
                    transition: "background-color 0.2s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f5f5f5"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#fff"}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: period === "current" ? "#6c757d" : "#ddd",
                      border: "none",
                    }}
                  ></span>
                  <span style={{ flex: 1 }}>Current Week</span>
                  {period === "current" && (
                    <span style={{ color: "#6c757d", fontSize: "0.7rem" }}>✓</span>
                  )}
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPeriod("previous");
                    setDropdownOpen(false);
                    downloadEventsByStatus(selectedStatus, "previous");
                  }}
                  style={{
                    width: "100%",
                    padding: "0.7rem 0.8rem",
                    backgroundColor: "#fff",
                    color: "#333",
                    border: "none",
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    transition: "background-color 0.2s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f5f5f5"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#fff"}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: period === "previous" ? "#6c757d" : "#ddd",
                      border: "none",
                    }}
                  ></span>
                  <span style={{ flex: 1 }}>Previous Week</span>
                  {period === "previous" && (
                    <span style={{ color: "#6c757d", fontSize: "0.7rem" }}>✓</span>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const ViewFilterButtons = () => {
    const shouldShowToggle =
      (isAdmin || isLeaderAt12) &&
      (selectedEventTypeFilter === "all" ||
        selectedEventTypeFilter === "CELLS");

    if (isRegularUser || isRegistrant) {
      return null;
    }

    if (
      selectedEventTypeFilter &&
      selectedEventTypeFilter !== "all" &&
      selectedEventTypeFilter !== "CELLS"
    ) {
      return null;
    }

    if (!shouldShowToggle) {
      return null;
    }

    const handleViewFilterChange = (newViewFilter) => {
      setViewFilter(newViewFilter);
      setCurrentPage(1);
    };

    const getAllLabel = () => {
      if (isAdmin) return "VIEW ALL";
      if (isLeaderAt12) return "DISCIPLES";
      return "ALL";
    };

    const getPersonalLabel = () => {
      if (isAdmin) return "PERSONAL";
      if (isLeaderAt12) return "PERSONAL ";
      return "PERSONAL";
    };

    return (
      <div style={styles.viewFilterContainer}>
        <span style={styles.viewFilterLabel}>View:</span>
        <label style={styles.viewFilterRadio}>
          <input
            type="radio"
            name="viewFilter"
            value="all"
            checked={viewFilter === "all"}
            onChange={(e) => handleViewFilterChange(e.target.value)}
          />
          <span style={styles.viewFilterText}>{getAllLabel()}</span>
        </label>
        <label style={styles.viewFilterRadio}>
          <input
            type="radio"
            name="viewFilter"
            value="personal"
            checked={viewFilter === "personal"}
            onChange={(e) => handleViewFilterChange(e.target.value)}
          />
          <span style={styles.viewFilterText}>{getPersonalLabel()}</span>
        </label>
      </div>
    );
  };

  const EventTypeSelector = ({
    eventTypes,
    selectedEventTypeFilter,
    setSelectedEventTypeFilter,
    setSelectedEventTypeObj,
    setSelectedStatus,
    setCurrentPage,
    setSearchQuery,
    setShowingEvents,
    setEditingEventType,
    setEventTypesModalOpen,
    setToDeleteType,
    setConfirmDeleteOpen,
    isAdmin,
    isRegistrant,
    isRegularUser,
    isLeaderAt12,
    isLeader,
    eventTypeStyles: externalStyles,
  }) => {
    const [hoveredType, setHoveredType] = useState(null);
    const [menuAnchor, setMenuAnchor] = useState(null);
    const [selectedTypeForMenu, setSelectedTypeForMenu] = useState(null);
    const [isCollapsed, setIsCollapsed] = useState(false);
    
    const theme = useTheme();
    const isMobileView = useMediaQuery(theme.breakpoints.down("lg"));
    const isDarkMode = theme.palette.mode === "dark";
    const currentUser = JSON.parse(localStorage.getItem("userProfile")) || {};
    const userRole = currentUser?.role || "";
    const normalizedRole = userRole.toLowerCase();
    const computedIsAdmin =
      isAdmin !== undefined ? isAdmin : normalizedRole === "admin";
    const computedIsRegistrant =
      isRegistrant !== undefined
        ? isRegistrant
        : normalizedRole === "registrant";
    const computedIsRegularUser =
      isRegularUser !== undefined ? isRegularUser : normalizedRole === "user";
    const computedIsLeaderAt12 =
      isLeaderAt12 !== undefined
        ? isLeaderAt12
        : normalizedRole === "leaderat12" ||
        normalizedRole.includes("leaderat12") ||
        normalizedRole.includes("leader at 12") ||
        normalizedRole.includes("leader@12");
    const computedIsLeader =
      isLeader !== undefined
        ? isLeader
        : normalizedRole === "leader" && !computedIsLeaderAt12;

    const canEditEventTypes = computedIsAdmin;

const filteredEventTypes = useMemo(() => {
  const allTypes = eventTypes
    .map((t) => t.name || t)
    .filter((name) => {
      if (!name) return false;
      // ONLY filter out "Cells" for Active Teams - don't filter out "all"
      if (isActiveTeams && (name === "Cells" || name === "CELLS" || name?.toLowerCase() === "cells")) {
        console.log("Filtering out Cells from event types:", name);
        return false;
      }
      return true;
    });

  return getFilteredEventTypes(allTypes);
}, [eventTypes, isActiveTeams]);
    const handleEventTypeClick = (typeValue) => {
      const eventTypeObj = eventTypes.find((et) => {
        const etName = et.name || et.eventTypeName || et.displayName || "";
        return etName.toLowerCase() === typeValue.toLowerCase();
      }) || { name: typeValue };
      if (setSelectedEventTypeObj) setSelectedEventTypeObj(eventTypeObj);
      if (setSelectedEventTypeFilter) setSelectedEventTypeFilter(typeValue);
      if (setSelectedStatus) setSelectedStatus("incomplete");
      if (setCurrentPage) setCurrentPage(1);

      if (setSearchQuery) setSearchQuery("");
      if (setShowingEvents) setShowingEvents(true);
    };

    const eventTypeStyles = externalStyles || {
      container: {
        backgroundColor: isDarkMode
          ? theme.palette.background.paper
          : "#f8f9fa",
        borderRadius: "12px",
        padding: isMobileView ? "0.75rem" : "1rem",
        marginBottom: isMobileView ? "0.5rem" : "1rem",
        boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
        border: `1px solid ${isDarkMode ? theme.palette.divider : "#e9ecef"}`,
        position: "relative",
        color: isDarkMode ? theme.palette.text.primary : "inherit",
      },
      headerRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: isCollapsed ? "0" : "0.5rem",
        cursor: "pointer",
      },
      header: {
        fontSize: isMobileView ? "0.7rem" : "0.875rem",
        fontWeight: "600",
        color: isDarkMode ? theme.palette.text.secondary : "#6c757d",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
      },
      selectedTypeDisplay: {
        fontSize: isMobileView ? "0.85rem" : "1rem",
        fontWeight: "600",
        color: isDarkMode ? theme.palette.primary.main : "#007bff",
        display: "flex",
        alignItems: "center",
        gap: "0.25rem",
        flex: 1,
        marginLeft: "0.5rem",
      },
      collapseButton: {
        background: "none",
        border: "none",
        color: isDarkMode ? theme.palette.text.secondary : "#6c757d",
        cursor: "pointer",
        padding: "0.25rem",
        borderRadius: "4px",
        fontSize: "0.8rem",
      },
      typesGrid: {
        display: isCollapsed ? "none" : "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        gap: isMobileView ? "0.35rem" : "0.5rem",
        marginTop: "0.5rem",
      },
      typeCard: {
        padding: isMobileView ? "0.4rem 0.6rem" : "0.6rem 0.8rem",
        borderRadius: "8px",
        border: `1px solid ${isDarkMode ? theme.palette.divider : "transparent"}`,
        backgroundColor: isDarkMode
          ? theme.palette.background.default
          : "white",
        cursor: "pointer",
        transition: "all 0.2s ease",
        position: "relative",
        minWidth: isMobileView ? "80px" : "100px",
        minHeight: "40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: isMobileView ? "0.7rem" : "0.8rem",
        fontWeight: "500",
      },
      typeCardActive: {
        borderColor: "#007bff",
        backgroundColor: isDarkMode ? "rgba(0, 123, 255, 0.1)" : "#e7f3ff",
        transform: "scale(1.02)",
        boxShadow: "0 2px 8px rgba(0, 123, 255, 0.2)",
      },
      typeCardHover: {
        borderColor: isDarkMode ? theme.palette.primary.main : "#ddd",
        transform: "translateY(-1px)",
        boxShadow: isDarkMode
          ? "0 2px 4px rgba(0,0,0,0.2)"
          : "0 2px 4px rgba(0,0,0,0.1)",
      },
    };

const allTypes = useMemo(() => {
  const availableTypes = filteredEventTypes || [];
  const shouldSeeAll = computedIsAdmin || computedIsLeaderAt12 || computedIsLeader || computedIsRegistrant || computedIsRegularUser;

  console.log("Building allTypes:", {
    isActiveTeams,
    shouldSeeAll,
    availableTypesCount: availableTypes.length,
    availableTypes: availableTypes.map(t => typeof t === 'string' ? t : t.name)
  });

  if (isActiveTeams && shouldSeeAll) {
    // ALWAYS include "all" first, then all other types
    return ["all", ...availableTypes];
  }
  
  if (shouldSeeAll) {
    return ["all", ...availableTypes];
  }
  
  return availableTypes;
}, [filteredEventTypes, computedIsAdmin, computedIsLeaderAt12, computedIsLeader, computedIsRegistrant, computedIsRegularUser, isActiveTeams]);



const getDisplayName = (type) => {
  if (!type) return "";
  if (type === "all") {
    // For Active Teams, show "ALL CELLS"
    return isActiveTeams ? "ALL CELLS" : "All Events";
  }
  return typeof type === "string" ? type : type.name || String(type);
};

const getTypeValue = (type) => {
  if (type === "all") return "all";
  return typeof type === "string" ? type : type.name || String(type);
};
    const handleMenuOpen = (event, type) => {
      event.stopPropagation();
      setMenuAnchor(event.currentTarget);
      setSelectedTypeForMenu(type);
    };

    const handleMenuClose = () => {
      setMenuAnchor(null);
      setSelectedTypeForMenu(null);
    };

    const handleEditEventType = () => {
      if (selectedTypeForMenu && selectedTypeForMenu !== "all") {
        const eventTypeToEdit = eventTypes.find(
          (et) => et.name?.toLowerCase() === selectedTypeForMenu.toLowerCase(),
        ) || { name: selectedTypeForMenu };

        if (setEditingEventType) setEditingEventType(eventTypeToEdit);
        if (setEventTypesModalOpen) setEventTypesModalOpen(true);
      }
      handleMenuClose();
    };

    const handleDeleteEventType = () => {
      if (selectedTypeForMenu && selectedTypeForMenu !== "all") {
        const exactEventType = eventTypes.find((et) => {
          const etName = et.name || et.eventType || et.eventTypeName || "";
          return etName.toLowerCase() === selectedTypeForMenu.toLowerCase();
        });

        const typeToDelete = exactEventType
          ? exactEventType.name ||
          exactEventType.eventType ||
          exactEventType.eventTypeName
          : selectedTypeForMenu;

        if (setToDeleteType) setToDeleteType(typeToDelete);
        if (setConfirmDeleteOpen) setConfirmDeleteOpen(true);
      }
      handleMenuClose();
    };

    const shouldShowSelector =
      computedIsAdmin ||
      computedIsRegistrant ||
      computedIsLeaderAt12 ||
      computedIsLeader ||
      computedIsRegularUser;

    if (!shouldShowSelector) {
      return null;
    }

    return (
      <div style={eventTypeStyles.container}>
        <div
          style={eventTypeStyles.headerRow}
          onClick={() => isMobileView && setIsCollapsed(!isCollapsed)}
        >
          <div style={eventTypeStyles.header}>
            {computedIsAdmin
              ? "Event Types"
              : computedIsRegistrant
                ? "Event Types"
                : computedIsLeaderAt12
                  ? "Cells & Events"
                  : computedIsLeader
                    ? "Your Events"
                    : "Your Cells"}
          </div>

          <div style={eventTypeStyles.selectedTypeDisplay}>
            <span>•</span>
            <span>
              {getDisplayName(selectedEventTypeFilter)}
            </span>
          </div>

          {isMobileView && (
            <button
              style={eventTypeStyles.collapseButton}
              onClick={(e) => {
                e.stopPropagation();
                setIsCollapsed(!isCollapsed);
              }}
            >
              {isCollapsed ? "▼" : "▲"}
            </button>
          )}
        </div>

        <div style={eventTypeStyles.typesGrid}>
          {allTypes.map((type) => {
            const displayName = getDisplayName(type);
            const typeValue = getTypeValue(type);
            const isActive = selectedEventTypeFilter === typeValue;
            const isHovered = hoveredType === typeValue;

            const showMenu = canEditEventTypes && typeValue !== "all";

            return (
              <div
                key={typeValue}
                style={{
                  ...eventTypeStyles.typeCard,
                  ...(isActive ? eventTypeStyles.typeCardActive : {}),
                  ...(isHovered && !isActive
                    ? eventTypeStyles.typeCardHover
                    : {}),
                }}
                onClick={() => handleEventTypeClick(typeValue)}
                onMouseEnter={() => setHoveredType(typeValue)}
                onMouseLeave={() => setHoveredType(null)}
              >
                <span>{displayName}</span>

                {showMenu && (
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, typeValue)}
                    sx={{
                      position: "absolute",
                      top: 2,
                      right: 2,
                      width: 20,
                      height: 20,
                      backgroundColor: isDarkMode
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.04)",
                      "&:hover": {
                        backgroundColor: isDarkMode
                          ? "rgba(255,255,255,0.2)"
                          : "rgba(0,0,0,0.08)",
                      },
                      color: isDarkMode ? "#fff" : "#000",
                      fontSize: "12px",
                      padding: "1px",
                      minWidth: "auto",
                      opacity: isMobileView ? 1 : isHovered || isActive ? 1 : 0,
                      transition: "opacity 0.2s ease",
                    }}
                  >
                    ⋮
                  </IconButton>
                )}
              </div>
            );
          })}
        </div>

        <Popover
          open={Boolean(menuAnchor)}
          anchorEl={menuAnchor}
          onClose={handleMenuClose}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "right",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
          sx={{
            "& .MuiPaper-root": {
              backgroundColor: isDarkMode
                ? theme.palette.background.paper
                : "#fff",
              color: isDarkMode ? theme.palette.text.primary : "#000",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              borderRadius: "8px",
              minWidth: "120px",
            },
          }}
        >
          <MenuItem onClick={handleEditEventType} sx={{ fontSize: "14px" }}>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
          <MenuItem
            onClick={handleDeleteEventType}
            sx={{
              fontSize: "14px",
              color: theme.palette.error.main,
              "&:hover": {
                backgroundColor: theme.palette.error.light + "20",
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 36, color: "inherit" }}>
              <DeleteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        </Popover>
      </div>
    );
  };

  return (
    <Box
      sx={{
        height: "100vh",
        fontFamily: "system-ui, sans-serif",
        padding: isMobileView ? "0.5rem" : "1rem",
        paddingTop: isMobileView ? "4rem" : "5rem",
        paddingBottom: "1rem",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
        width: "100%",
        maxWidth: "100vw",
        backgroundColor: isDarkMode
          ? theme.palette.background.default
          : "#f5f7fa",
      }}
    >
      {/* TOP HEADER WITH TOGGLE - ALWAYS SHOWN */}
      <Box
        sx={{
          padding: isMobileView ? "1rem" : "1.5rem",
          borderRadius: "16px",
          marginBottom: isMobileView ? "0.5rem" : "1rem",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          flexShrink: 0,
          backgroundColor: isDarkMode ? theme.palette.background.paper : "#fff",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography
            variant="h5"
            sx={{
              fontWeight: "bold",
              color: isDarkMode ? theme.palette.text.primary : "#333",
            }}
          >
            {showingEvents
              ? "Events"
              : viewMode === "grid"
                ? "Select Event Type"
                : "Event Types"}
          </Typography>

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            {/* VIEW TOGGLE - GRID/TABLE - ONLY SHOW WHEN NOT VIEWING EVENTS */}
            {!showingEvents && (
              <Box
                sx={{
                  display: "flex",
                  gap: 1,
                  alignItems: "center",
                  backgroundColor: isDarkMode
                    ? "rgba(255,255,255,0.05)"
                    : "#f5f5f5",
                  padding: "4px",
                  borderRadius: "8px",
                  border: `1px solid ${isDarkMode ? theme.palette.divider : "#e0e0e0"}`,
                }}
              >
                <Button
                  variant={viewMode === "grid" ? "contained" : "text"}
                  size="small"
                  onClick={() => {
                    setViewMode("grid");
                    setShowingEvents(false);
                  }}
                  sx={{
                    minWidth: "auto",
                    padding: "4px 12px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    backgroundColor:
                      viewMode === "grid" ? "#007bff" : "transparent",
                    color:
                      viewMode === "grid"
                        ? "#fff"
                        : isDarkMode
                          ? theme.palette.text.secondary
                          : "#666",
                  }}
                >
                  Grid
                </Button>
                <Button
                  variant={viewMode === "table" ? "contained" : "text"}
                  size="small"
                  onClick={() => {
                    setViewMode("table");
                    setShowingEvents(false);
                  }}
                  sx={{
                    minWidth: "auto",
                    padding: "4px 12px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    backgroundColor:
                      viewMode === "table" ? "#007bff" : "transparent",
                    color:
                      viewMode === "table"
                        ? "#fff"
                        : isDarkMode
                          ? theme.palette.text.secondary
                          : "#666",
                  }}
                >
                  Table
                </Button>
              </Box>
            )}
          </Box>
        </Box>
        {/* WHEN SHOWING EVENTS - Show back button */}
        {showingEvents && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              mb: 2,
            }}
          >
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                setShowingEvents(false);
                setSelectedStatus("incomplete");
                setSearchQuery("");
                eventsCache.current = {}
              }}
              startIcon={<ArrowBackIcon />}
              sx={{
                borderColor: isDarkMode ? theme.palette.divider : "#ccc",
                color: isDarkMode ? theme.palette.text.primary : "#333",
              }}
            >
              Back
            </Button>
          </Box>
        )}

        {showingEvents ? (
          <>
            {/* SEARCH BAR FOR EVENTS */}
            <Box
              sx={{
                display: "flex",
                gap: 2,
                alignItems: "center",
                marginBottom: isMobileView ? "0.75rem" : "1.5rem",
                flexWrap: "wrap",
                px: 1,
              }}
            >
              <TextField
                size="small"
                placeholder="Search by Event Name, Leader, or Email..."
                value={searchQuery}
                onClick={fetchAllCurrentEvents}
                disabled={loading}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchQuery(value);
                }}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleSearchSubmit();
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  flex: 1,
                  minWidth: 200,
                  backgroundColor: "transparent !important",
                  "& .MuiInputBase-root": {
                    backgroundColor: "transparent !important",
                  },
                  "& .MuiInputBase-input": {
                    fontSize: isMobileView ? "14px" : "0.95rem",
                    padding: isMobileView ? "0.6rem 0.8rem" : "0.75rem 1rem",
                    color: isDarkMode ? theme.palette.text.primary : "#000",
                    backgroundColor: "transparent !important",
                  },
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "transparent !important",
                    "& fieldset": {
                      borderColor: isDarkMode ? theme.palette.divider : "#ccc",
                      backgroundColor: "transparent !important",
                    },
                    "&:hover fieldset": {
                      borderColor: isDarkMode
                        ? theme.palette.primary.main
                        : "#007bff",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: isDarkMode
                        ? theme.palette.primary.main
                        : "#007bff",
                    },
                    "&:hover": {
                      backgroundColor: "transparent !important",
                    },
                    "&.Mui-focused": {
                      backgroundColor: "transparent !important",
                    },
                  },
                }}
              />

              <Button
                variant="outlined"
                onClick={clearAllFilters}
                disabled={loading}
                sx={{
                  padding: isMobileView ? "0.6rem 1rem" : "0.75rem 1.5rem",
                  fontSize: isMobileView ? "14px" : "0.95rem",
                  whiteSpace: "nowrap",
                  backgroundColor: "#6c757d",
                  color: "white",
                  "&:hover": {
                    backgroundColor: "#5a6268",
                  },
                }}
              >
                {loading ? "⏳" : "CLEAR ALL"}
              </Button>
            </Box>

            {/* STATUS BADGES AND VIEW FILTERS */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
                flexWrap: "wrap",
                gap: "1rem",
                px: 1,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <StatusBadges
                    selectedStatus={selectedStatus}
                    setSelectedStatus={setSelectedStatus}
                    setCurrentPage={setCurrentPage}
                    rowsPerPage={rowsPerPage}
                    searchQuery={searchQuery}
                    selectedEventTypeFilter={selectedEventTypeFilter}
                    viewFilter={viewFilter}
                    isAdmin={isAdmin}
                    isRegistrant={isRegistrant}
                    isRegularUser={isRegularUser}
                    isLeaderAt12={isLeaderAt12}
                    isLeader={isLeader}
                    fetchEvents={fetchEvents}
                    DEFAULT_API_START_DATE={DEFAULT_API_START_DATE}
                  />
                </div>
              </div>
              <ViewFilterButtons />
            </Box>
          </>
        ) : (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              mb: 2,
            }}
          >
            <Box
              sx={{
                width: "100%",
                maxWidth: "910px",
              }}
            >
              <TextField
                fullWidth
                placeholder="Search event types..."
                value={eventTypeSearch}
                onChange={(e) => setEventTypeSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  sx: {
                    borderRadius: "8px",
                    fontSize: "14px",
                    height: "60px",
                  },
                }}
                size="small"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                  },
                }}
              />
            </Box>
          </Box>
        )}
      </Box>

      {/* MAIN CONTENT AREA */}
      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderRadius: "16px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          backgroundColor: isDarkMode ? theme.palette.background.paper : "#fff",
        }}
      >
        {showingEvents ? (
          isMobileView ? (
            // MOBILE EVENTS VIEW
            <Box sx={{ flexGrow: 1, overflowY: "auto", padding: "0.75rem" }}>
              {loading ? (
                <Box sx={{ width: "100%", p: 2 }}>
                  <LinearProgress />
                  <Typography
                    sx={{
                      mt: 2,
                      textAlign: "center",
                      color: isDarkMode ? theme.palette.text.primary : "#666",
                    }}
                  >
                    Loading events...
                  </Typography>
                </Box>
              ) : paginatedEvents.length === 0 ||
                (isSearching && filteredEvents?.length === 0) ? (
                <Box
                  sx={{
                    textAlign: "center",
                    padding: "2rem",
                    color: isDarkMode ? theme.palette.text.primary : "#666",
                  }}
                >
                  <Typography>
                    No events found matching your criteria.
                  </Typography>
                </Box>
              ) : (
                <>
                  {!isSearching
                    ? paginatedEvents.map((event) => (
                      <>
                        <MobileEventCard
                          key={event._id}
                          event={event}
                          onOpenAttendance={() => handleCaptureClick(event)}
                          onEdit={() => handleEditEvent(event)}
                          onDelete={() => handleDeleteEvent(event)}
                          isOverdue={isOverdue(event)}
                          formatDate={formatDate}
                          theme={theme}
                          styles={styles}
                          isAdmin={isAdmin}
                          isLeaderAt12={isLeaderAt12}
                          currentUserLeaderAt1={currentUserLeaderAt1}
                          selectedEventTypeFilter={selectedEventTypeFilter}
                        />
                      </>
                    ))
                    : filteredEvents.map((event) => (
                      <>
                        <MobileEventCard
                          key={event._id}
                          event={event}
                          onOpenAttendance={() => handleCaptureClick(event)}
                          onEdit={() => handleEditEvent(event)}
                          onDelete={() => handleDeleteEvent(event)}
                          isOverdue={isOverdue(event)}
                          formatDate={formatDate}
                          theme={theme}
                          styles={styles}
                          isAdmin={isAdmin}
                          isLeaderAt12={isLeaderAt12}
                          currentUserLeaderAt1={currentUserLeaderAt1}
                          selectedEventTypeFilter={selectedEventTypeFilter}
                        />
                      </>
                    ))}

                  {/* MOBILE PAGINATION*/}
                  <Box
                    sx={{
                      ...styles.paginationContainer,
                      flexShrink: 0,
                      backgroundColor: isDarkMode
                        ? theme.palette.background.paper
                        : "#f8f9fa",
                      borderTop: `1px solid ${isDarkMode ? theme.palette.divider : "#e9ecef"
                        }`,
                      px: 2,
                      py: 1.5,
                      flexDirection: isMobileView ? "column" : "row",
                      alignItems: isMobileView ? "stretch" : "center",
                      gap: isMobileView ? 1.5 : 2,
                    }}
                  >
                    {/* Rows per page – keep but make compact */}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: isMobileView
                          ? "space-between"
                          : "flex-start",
                        gap: 1,
                        width: isMobileView ? "100%" : "auto",
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          color: isDarkMode
                            ? theme.palette.text.secondary
                            : "#6c757d",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Rows per page:
                      </Typography>

                      <select
                        value={rowsPerPage}
                        onChange={handleRowsPerPageChange}
                        disabled={loading}
                        style={{
                          padding: "0.4rem 0.6rem",
                          border: "1px solid",
                          borderColor: isDarkMode
                            ? theme.palette.divider
                            : "#dee2e6",
                          borderRadius: "8px",
                          backgroundColor: isDarkMode
                            ? theme.palette.background.default
                            : "#fff",
                          color: isDarkMode
                            ? theme.palette.text.primary
                            : "#000",
                          fontSize: "0.875rem",
                          minWidth: isMobileView ? "80px" : "100px",
                        }}
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </Box>

                    {/* Result range – center on mobile */}
                    <Typography
                      variant="body2"
                      align={isMobileView ? "center" : "left"}
                      sx={{
                        color: isDarkMode
                          ? theme.palette.text.secondary
                          : "#6c757d",
                        width: isMobileView ? "100%" : "auto",
                        order: isMobileView ? -1 : "unset",
                        mb: isMobileView ? 0.5 : 0,
                      }}
                    >
                      {totalEvents > 0
                        ? `${startIndex}-${endIndex} of ${totalEvents}`
                        : "0-0 of 0"}
                    </Typography>

                    {/* Navigation buttons */}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: isMobileView ? 2 : 1.5,
                        width: isMobileView ? "100%" : "auto",
                      }}
                    >
                      <Button
                        variant="outlined"
                        size="medium"
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1 || loading}
                        sx={{
                          minWidth: isMobileView ? 64 : 88,
                          height: isMobileView ? 48 : 36,
                          px: isMobileView ? 2 : 1.5,
                          borderRadius: "12px",
                          color: isDarkMode
                            ? theme.palette.text.primary
                            : "#007bff",
                          borderColor: isDarkMode
                            ? theme.palette.divider
                            : "#007bff",
                          fontSize: isMobileView ? "1rem" : "0.875rem",
                          "&:hover": {
                            backgroundColor: isDarkMode
                              ? "rgba(255,255,255,0.08)"
                              : "rgba(0,123,255,0.08)",
                          },
                          "&:disabled": {
                            opacity: 0.4,
                          },
                        }}
                      >
                        {loading ? "⏳" : isMobileView ? "←" : "< Previous"}
                      </Button>

                      <Typography
                        variant="body2"
                        sx={{
                          color: isDarkMode
                            ? theme.palette.text.secondary
                            : "#6c757d",
                          fontWeight: 500,
                          minWidth: "80px",
                          textAlign: "center",
                        }}
                      >
                        {isMobileView
                          ? `${currentPage} / ${totalPages}`
                          : `Page ${currentPage} of ${totalPages}`}
                      </Typography>

                      <Button
                        variant="outlined"
                        size="medium"
                        onClick={handleNextPage}
                        disabled={
                          currentPage >= totalPages ||
                          loading ||
                          totalPages === 0
                        }
                        sx={{
                          minWidth: isMobileView ? 64 : 88,
                          height: isMobileView ? 48 : 36,
                          px: isMobileView ? 2 : 1.5,
                          borderRadius: "12px",
                          color: isDarkMode
                            ? theme.palette.text.primary
                            : "#007bff",
                          borderColor: isDarkMode
                            ? theme.palette.divider
                            : "#007bff",
                          fontSize: isMobileView ? "1rem" : "0.875rem",
                          "&:hover": {
                            backgroundColor: isDarkMode
                              ? "rgba(255,255,255,0.08)"
                              : "rgba(0,123,255,0.08)",
                          },
                          "&:disabled": {
                            opacity: 0.4,
                          },
                        }}
                      >
                        {loading ? "⏳" : isMobileView ? "→" : "Next >"}
                      </Button>
                    </Box>
                  </Box>
                </>
              )}
            </Box>
          ) : (
            // DESKTOP EVENTS VIEW (DataGrid)
            <>
              <Box
                sx={{
                  flexGrow: 1,
                  overflowY: "auto",
                  overflowX: "auto",
                  padding: "1rem",
                }}
              >
                {loading ? (
                  <Box sx={{ p: 3, width: "100%" }}>
                    <LinearProgress />
                    <Typography sx={{ mt: 2, textAlign: "center" }}>
                      Loading events...
                    </Typography>
                  </Box>
                ) : paginatedEvents.length === 0 ||
                  (isSearching && filteredEvents?.length === 0) ? (
                  <Typography sx={{ p: 3, textAlign: "center" }}>
                    No events found matching your criteria.
                  </Typography>
                ) : (
                  <Box
                    sx={{ height: "calc(100vh - 450px)", minHeight: "500px" }}
                  >
                    <DataGrid
                      rows={
                        !isSearching
                          ? paginatedEvents.map((event, idx) => {
                            const id =
                              event._id || event.id || event.UUID || idx;

                            const isRecurring =
                              event.is_recurring ||
                              (event.recurring_days &&
                                event.recurring_days.length > 1);

                            return {
                              id: id,
                              ...event,
                              _id: id,
                              "data-recurring": isRecurring,
                            };
                          })
                          : filteredEvents.map((event, idx) => {
                            const id =
                              event._id || event.id || event.UUID || idx;

                            const isRecurring =
                              event.is_recurring ||
                              (event.recurring_days &&
                                event.recurring_days.length > 1);

                            return {
                              id: id,
                              ...event,
                              _id: id,
                              "data-recurring": isRecurring,
                            };
                          })
                      }
                      columns={[
                        ...generateDynamicColumns(
                          !isSearching ? paginatedEvents : filteredEvents,
                          isOverdue,
                          selectedEventTypeFilter,
                        ),
                        {
                          field: "actions",
                          headerName: "Actions",
                          sortable: false,
                          flex: 1,
                          minWidth: 200,
                          renderCell: (params) => (
                            <Box sx={{ display: "flex", gap: 1 }}>
                              <Tooltip
                                title={
                                  params.row?.is_recurring
                                    ? `Capture Attendance - ${formatRecurringDays(
                                      params.row.recurring_days,
                                    )}`
                                    : "Capture Attendance"
                                }
                                arrow
                              >
                                <IconButton
                                  onClick={() => handleCaptureClick(params.row)}
                                  size="small"
                                  sx={{
                                    backgroundColor: "#007bff",
                                    color: "#fff",
                                    "&:hover": { backgroundColor: "#0056b3" },
                                  }}
                                >
                                  <CheckBoxIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Edit Event" arrow>
                                <IconButton
                                  onClick={() => handleEditEvent(params.row)}
                                  size="small"
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              {isAdmin && (
                                <Tooltip title="Delete Event" arrow>
                                  <IconButton
                                    onClick={() =>
                                      handleDeleteEvent(params.row)
                                    }
                                    size="small"
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              <Tooltip
                                title="Download Attendance (Event)"
                                arrow
                              >
                                <IconButton
                                  onClick={() =>
                                    downloadEventAttendance(params.row)
                                  }
                                  size="small"
                                  sx={{ color: "#1976d2" }}
                                >
                                  <GetAppIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          ),
                        },
                      ]}
                      disableRowSelectionOnClick
                      hideRowSelectionOnClick
                      hideFooter
                      pageSizeOptions={[10, 25, 50, 100]}
                      paginationModel={{
                        page: currentPage - 1,
                        pageSize: rowsPerPage,
                      }}
                      onPaginationModelChange={(model) => {
                        const newPage = model.page + 1;
                        handlePageChange(newPage);
                      }}
                      rowCount={totalEvents}
                      paginationMode="server"
                      slots={{ toolbar: GridToolbar }}
                      slotProps={{
                        toolbar: {
                          showQuickFilter: true,
                          quickFilterProps: { debounceMs: 500 },
                        },
                      }}
                      sx={{
                        height: "100%",
                        border: "1px solid",
                        borderColor: isDarkMode
                          ? "rgba(255,255,255,0.1)"
                          : "rgba(0,0,0,0.1)",
                        "& .MuiDataGrid-columnHeaders": {
                          backgroundColor: isDarkMode ? "#1a1a1a" : "#f5f5f5",
                          color: isDarkMode ? "#fff" : "#333",
                          fontWeight: 600,
                          fontSize: "0.875rem",
                          borderBottom: `2px solid ${isDarkMode ? "#333" : "#ddd"
                            }`,
                          minHeight: "52px !important",
                        },
                        "& .MuiDataGrid-columnHeader": {
                          backgroundColor: isDarkMode ? "#1a1a1a" : "#f5f5f5",
                          color: isDarkMode ? "#fff" : "#333",
                          "&:focus": {
                            outline: "none",
                          },
                        },
                        "& .MuiDataGrid-columnHeaderTitle": {
                          fontWeight: 600,
                          color: isDarkMode ? "#fff" : "#333",
                          fontSize: "0.875rem",
                        },
                        "& .MuiDataGrid-cell": {
                          alignItems: "center",
                          borderBottom: `1px solid ${isDarkMode
                            ? "rgba(255,255,255,0.1)"
                            : "rgba(0,0,0,0.08)"
                            }`,
                          color: isDarkMode
                            ? theme.palette.text.primary
                            : "#212529",
                          fontSize: "0.875rem",
                          "&:focus": {
                            outline: "none",
                          },
                        },
                        "& .MuiDataGrid-row": {
                          "&:hover": {
                            backgroundColor: isDarkMode
                              ? "rgba(255, 255, 255, 0.04)"
                              : "rgba(0, 0, 0, 0.04)",
                          },
                          '&[data-recurring="true"]': {
                            borderLeft: `3px solid #2196f3`,
                          },
                        },
                        "& .MuiDataGrid-virtualScroller": {
                          overflowY: "auto !important",
                        },
                        "& .MuiDataGrid-toolbarContainer": {
                          backgroundColor: isDarkMode ? "#1a1a1a" : "#f5f5f5",
                          padding: "12px 16px",
                          borderBottom: `1px solid ${isDarkMode ? "#333" : "#ddd"
                            }`,
                        },
                        "& .MuiDataGrid-menuIcon": {
                          color: isDarkMode ? "#fff" : "#666",
                        },
                        "& .MuiDataGrid-sortIcon": {
                          color: isDarkMode ? "#fff" : "#666",
                        },
                        "& .MuiDataGrid-iconButtonContainer": {
                          visibility: "visible",
                        },
                      }}
                    />
                  </Box>
                )}
              </Box>

              {/* DESKTOP PAGINATION */}
              <Box
                sx={{
                  ...styles.paginationContainer,
                  flexShrink: 0,
                  backgroundColor: isDarkMode
                    ? theme.palette.background.paper
                    : "#f8f9fa",
                  borderTop: `1px solid ${isDarkMode ? theme.palette.divider : "#e9ecef"
                    }`,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: isDarkMode
                        ? theme.palette.text.secondary
                        : "#6c757d",
                    }}
                  >
                    Rows per page:
                  </Typography>
                  <select
                    value={rowsPerPage}
                    onChange={handleRowsPerPageChange}
                    style={{
                      padding: "0.25rem 0.5rem",
                      border: "1px solid",
                      borderColor: isDarkMode
                        ? theme.palette.divider
                        : "#dee2e6",
                      borderRadius: "8px",
                      backgroundColor: isDarkMode
                        ? theme.palette.background.default
                        : "#fff",
                      color: isDarkMode ? theme.palette.text.primary : "#000",
                      fontSize: "0.875rem",
                    }}
                    disabled={loading}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </Box>

                <Typography
                  variant="body2"
                  sx={{
                    color: isDarkMode
                      ? theme.palette.text.secondary
                      : "#6c757d",
                  }}
                >
                  {totalEvents > 0
                    ? `${startIndex}-${endIndex} of ${totalEvents}`
                    : "0-0 of 0"}
                </Typography>

                <Box sx={styles.paginationControls}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1 || loading}
                    sx={{
                      color: isDarkMode
                        ? theme.palette.text.primary
                        : "#007bff",
                      borderColor: isDarkMode
                        ? theme.palette.divider
                        : "#007bff",
                      "&:hover": {
                        backgroundColor: isDarkMode
                          ? "rgba(255,255,255,0.05)"
                          : "rgba(0,123,255,0.1)",
                        borderColor: isDarkMode
                          ? theme.palette.primary.main
                          : "#0056b3",
                      },
                      "&:disabled": {
                        color: isDarkMode
                          ? theme.palette.text.disabled
                          : "#6c757d",
                        borderColor: isDarkMode
                          ? theme.palette.divider
                          : "#dee2e6",
                      },
                    }}
                  >
                    {loading ? "⏳" : "< Previous"}
                  </Button>
                  <Typography
                    variant="body2"
                    sx={{
                      padding: "0 1rem",
                      color: isDarkMode
                        ? theme.palette.text.secondary
                        : "#6c757d",
                    }}
                  >
                    Page {currentPage} of {totalPages}
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleNextPage}
                    disabled={
                      currentPage >= totalPages || loading || totalPages === 0
                    }
                    sx={{
                      color: isDarkMode
                        ? theme.palette.text.primary
                        : "#007bff",
                      borderColor: isDarkMode
                        ? theme.palette.divider
                        : "#007bff",
                      "&:hover": {
                        backgroundColor: isDarkMode
                          ? "rgba(255,255,255,0.05)"
                          : "rgba(0,123,255,0.1)",
                        borderColor: isDarkMode
                          ? theme.palette.primary.main
                          : "#0056b3",
                      },
                      "&:disabled": {
                        color: isDarkMode
                          ? theme.palette.text.disabled
                          : "#6c757d",
                        borderColor: isDarkMode
                          ? theme.palette.divider
                          : "#dee2e6",
                      },
                    }}
                  >
                    {loading ? "⏳" : "Next >"}
                  </Button>
                </Box>
              </Box>
            </>
          )
       ) : viewMode === "grid" ? (
  <Box
    sx={{
      flexGrow: 1,
      overflowY: "auto",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    }}
  >
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: "16px",
        width: "100%",
        maxWidth: "1000px",
        margin: "0 auto",
        padding: "16px",
      }}
    >
      {(() => {
        let displayTypes = [...allEventTypes];
        if (isActiveTeams) {
          displayTypes = ["all", ...displayTypes];
        }
        return displayTypes;
      })()
        .filter((type) => {
          const typeName = typeof type === "string" ? type : type.name || type;
          if (isActiveTeams && (typeName === "Cells" || typeName === "CELLS" || typeName?.toLowerCase() === "cells")) {
            return false;
          }
          return typeName.toLowerCase().includes(eventTypeSearch.toLowerCase());
        })
        .map((type) => {
          const typeName = typeof type === "string" ? type : type.name || type;
          const isAllCells = typeName === "all";
          const eventTypeObj = isAllCells 
            ? { name: "all", description: "Gatherings for discipleship, community and spiritual growth" }
            : eventTypes.find((et) => et.name?.toLowerCase() === typeName.toLowerCase()) || { name: typeName };
          const description = isAllCells 
            ? "Gatherings for discipleship, community and spiritual growth" 
            : eventTypeObj.description || "";

          const getEventTypeColor = (type) => {
            const colors = {
              "Global Events": "#007bff",
              "Life Class": "#28a745",
              "Testing Recurring": "#6f42c1",
              Workshop: "#fd7e14",
              Conference: "#dc3545",
              Service: "#17a2b8",
              "Testing Recurring Days": "#e83e8c",
              "All Cells": "#6c757d",
            };
            return colors[type] || "#007bff";
          };

          return (
            <Box
              key={typeName}
              sx={{
                backgroundColor: isDarkMode
                  ? theme.palette.background.paper
                  : "#fff",
                borderRadius: "8px",
                padding: "12px",
                cursor: "pointer",
                border: `1px solid ${isDarkMode ? theme.palette.divider : "#e0e0e0"}`,
                borderLeft: `4px solid ${getEventTypeColor(typeName)}`,
                transition: "all 0.2s ease",
                display: "flex",
                flexDirection: "column",
                height: "110px",
                textAlign: "left",
                position: "relative",
                width: "100%",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  borderColor: isDarkMode
                    ? theme.palette.divider
                    : "#e0e0e0",
                  borderLeftColor: getEventTypeColor(typeName),
                },
              }}
            >
              <Box
                onClick={() => {
                  setSelectedEventTypeFilter(typeName);
                  setShowingEvents(true);
                  setCurrentPage(1);

                  const fetchParams = {
                    page: 1,
                    limit: rowsPerPage,
                    start_date: DEFAULT_API_START_DATE,
                    event_type: typeName === "all" ? "CELLS" : typeName,
                  };

                  fetchEvents(fetchParams, true);
                }}
                sx={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <Typography
                  sx={{
                    fontSize: "15px",
                    fontWeight: "600",
                    color: isDarkMode
                      ? theme.palette.text.primary
                      : "#333",
                    mb: "6px",
                    lineHeight: 1.3,
                    minHeight: "1.6em",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {typeName === "all" ? "ALL CELLS" : typeName}
                </Typography>

                <Box
                  sx={{
                    flex: 1,
                    display: "flex",
                    alignItems: "flex-start",
                    minHeight: "40px",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "16px",
                      color: isDarkMode
                        ? theme.palette.text.secondary
                        : "#666",
                      lineHeight: 1.4,
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      maxHeight: "2.8em",
                      fontStyle: description ? "normal" : "italic",
                    }}
                  >
                    {description ||
                      "Gatherings for discipleship, community and spiritual growth."}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    height: "3px",
                    width: "100%",
                    backgroundColor: getEventTypeColor(typeName),
                    borderRadius: "2px",
                    marginTop: "6px",
                    opacity: 0.5,
                  }}
                />
              </Box>

              {isAdmin && !isAllCells && (
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTypeForMenu(eventTypeObj);
                    setMenuAnchor(e.currentTarget);
                  }}
                  sx={{
                    position: "absolute",
                    top: "8px",
                    right: "8px",
                    width: "24px",
                    height: "24px",
                    backgroundColor: isDarkMode
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(0,0,0,0.03)",
                    "&:hover": {
                      backgroundColor: isDarkMode
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.06)",
                    },
                    color: isDarkMode ? "#fff" : "#000",
                    fontSize: "16px",
                    padding: "2px",
                    minWidth: "auto",
                    zIndex: 1,
                  }}
                >
                  ⋮
                </IconButton>
              )}
            </Box>
          );
        })}
    </Box>

    {(() => {
      let displayTypes = [...allEventTypes];
      if (isActiveTeams) {
        displayTypes = ["all", ...displayTypes];
      }
      return displayTypes;
    })().filter((type) => {
      const typeName = typeof type === "string" ? type : type.name || type;
      if (isActiveTeams && (typeName === "Cells" || typeName === "CELLS" || typeName?.toLowerCase() === "cells")) {
        return false;
      }
      return typeName.toLowerCase().includes(eventTypeSearch.toLowerCase());
    }).length === 0 && (
      <Box
        sx={{
          textAlign: "center",
          padding: "3rem 1rem",
          color: isDarkMode ? theme.palette.text.secondary : "#666",
          width: "100%",
          maxWidth: "600px",
          margin: "0 auto",
        }}
      >
        <SearchIcon sx={{ fontSize: 40, color: "#ccc", mb: 1.5 }} />
        <Typography variant="h6" gutterBottom sx={{ fontSize: "18px" }}>
          No event types found
        </Typography>
        <Typography variant="body2" sx={{ fontSize: "13px" }}>
          Try a different search term
        </Typography>
      </Box>
    )}
  </Box>
) : (
            <Box sx={{ flexGrow: 1, overflowY: "auto", padding: "24px" }}>
              <Box sx={{ maxWidth: "800px", margin: "0 auto" }}>
                {allEventTypes
                  .filter((type) => {
                    const typeName =
                      typeof type === "string" ? type : type.name || type;
                    return typeName
                      .toLowerCase()
                      .includes(eventTypeSearch.toLowerCase());
                  })
                  .map((type) => {
                    const typeName =
                      typeof type === "string" ? type : type.name || type;
                    const isAllCells = typeName === "all";

                    const eventTypeObj = eventTypes.find(
                      (et) => et.name?.toLowerCase() === typeName.toLowerCase(),
                    ) || { name: typeName };

                    // Get description from the event type object
                    const description = eventTypeObj.description || "";
                    console.log("Rendering event type:", typeName, "with description:", description);

                    const getEventTypeColor = (typeName) => {
                      const colors = {
                        "Global Events": "#007bff",
                        "Life Class": "#28a745",
                        "Testing Recurring": "#6f42c1",
                        Workshop: "#fd7e14",
                        Conference: "#dc3545",
                        Service: "#17a2b8",
                        "All Cells": "#6c757d",
                      };
                      return colors[typeName] || "#007bff";
                    };

                    const color = getEventTypeColor(typeName);

                    return (
                      <Box
                        key={typeName}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "16px 20px",
                          marginBottom: "12px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          backgroundColor: isDarkMode
                            ? theme.palette.background.paper
                            : "#fff",
                          border: `1px solid ${isDarkMode ? theme.palette.divider : "#e0e0e0"}`,
                          borderLeft: `4px solid ${color}`,
                          transition: "all 0.2s ease",
                          position: "relative",
                          "&:hover": {
                            transform: "translateX(2px)",
                            backgroundColor: isDarkMode
                              ? "rgba(0, 123, 255, 0.08)"
                              : "#e7f3ff",
                            borderColor: isDarkMode
                              ? theme.palette.divider
                              : "#e0e0e0",
                            borderLeftColor: color,
                          },
                        }}
                      >
                        {/* CLICKABLE AREA - Takes up remaining space */}
                        <Box
                          onClick={() => {
                            setSelectedEventTypeFilter(typeName);
                            setSelectedStatus("incomplete");
                            setShowingEvents(true);
                            setCurrentPage(1);

                            const fetchParams = {
                              page: 1,
                              limit: rowsPerPage,
                              start_date: DEFAULT_API_START_DATE,
                              event_type: typeName === "all" ? "CELLS" : typeName,
                              status: "incomplete",
                            };

                            const isCellEvent =
                              typeName === "all" ||
                              typeName === "CELLS" ||
                              typeName.toLowerCase().includes("cell");

                            if (isCellEvent) {
                              if (isLeaderAt12) {
                                fetchParams.leader_at_12_view = true;
                                if (viewFilter === "personal") {
                                  fetchParams.personal = true;
                                }
                              }
                            } else {
                              delete fetchParams.personal;
                              delete fetchParams.leader_at_12_view;
                              delete fetchParams.include_subordinate_cells;
                            }

                            console.log(
                              " Fetching for event type:",
                              typeName,
                              "with status:",
                              fetchParams.status,
                            );
                            fetchEvents(fetchParams, true);
                          }}
                          sx={{
                            flex: 1,
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <Box sx={{ flex: 1 }}>
                            <Typography
                              sx={{
                                fontSize: "16px",
                                fontWeight: 600,
                                color: isDarkMode
                                  ? theme.palette.text.primary
                                  : "#333",
                                mb: "4px",
                              }}
                            >
                              {typeName === "all" ? "ALL CELLS" : typeName}
                            </Typography>
                      
                          </Box>
                        </Box>

                        {/* EDIT/DELETE MENU - Now on the far right */}
                        {isAdmin && !isAllCells && (
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTypeForMenu(eventTypeObj);
                              setMenuAnchor(e.currentTarget);
                            }}
                            sx={{
                              marginLeft: "16px",
                              flexShrink: 0,
                              width: "32px",
                              height: "32px",
                              backgroundColor: isDarkMode
                                ? "rgba(255,255,255,0.1)"
                                : "rgba(0,0,0,0.04)",
                              "&:hover": {
                                backgroundColor: isDarkMode
                                  ? "rgba(255,255,255,0.2)"
                                  : "rgba(0,0,0,0.08)",
                              },
                              color: isDarkMode ? "#fff" : "#000",
                              fontSize: "20px",
                              padding: "4px",
                              minWidth: "auto",
                            }}
                          >
                            ⋮
                          </IconButton>
                        )}
                      </Box>
                    );
                  })}
              </Box>
            </Box>
        )}
      </Box>

      {/* EDIT/DELETE MENU POPOVER */}
      <Popover
        open={Boolean(menuAnchor)}
        anchorEl={menuAnchor}
        onClose={() => {
          setMenuAnchor(null);
          setSelectedTypeForMenu(null);
        }}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        sx={{
          "& .MuiPaper-root": {
            backgroundColor: isDarkMode
              ? theme.palette.background.paper
              : "#fff",
            color: isDarkMode ? theme.palette.text.primary : "#000",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            borderRadius: "8px",
            minWidth: "120px",
          },
        }}
      >
        <MenuItem
          onClick={() => {
            if (selectedTypeForMenu) {
              const fullEventTypeObj = findEventTypeByName(
                selectedTypeForMenu.name ||
                selectedTypeForMenu.eventTypeName ||
                selectedTypeForMenu,
              );
              setEditingEventType(fullEventTypeObj);
              setEventTypesModalOpen(true);
            }
            setMenuAnchor(null);
          }}
          sx={{ fontSize: "14px" }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedTypeForMenu) {
              setToDeleteType(selectedTypeForMenu);
              setConfirmDeleteOpen(true);
            }
            setMenuAnchor(null);
          }}
          sx={{
            fontSize: "14px",
            color: theme.palette.error.main,
            "&:hover": {
              backgroundColor: theme.palette.error.light + "20",
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 36, color: "inherit" }}>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Popover>

      {/* FAB BUTTON FOR ADMIN */}
      {isAdmin && (
        <Box
          sx={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 1300,
          }}
        >
          {/* OVERLAY TO CLOSE MENU */}
          {fabMenuOpen && (
            <Box
              sx={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1299,
                backgroundColor: "transparent",
              }}
              onClick={() => setFabMenuOpen(false)}
            />
          )}

          {/* FAB MENU OPTIONS */}
          <Box
            sx={{
              ...fabStyles.fabMenu,
              opacity: fabMenuOpen ? 1 : 0,
              visibility: fabMenuOpen ? "visible" : "hidden",
              transform: fabMenuOpen ? "translateY(0)" : "translateY(10px)",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              pointerEvents: fabMenuOpen ? "auto" : "none",
            }}
          >
            {/* WHEN VIEWING EVENT TYPES (GRID/TABLE) - SHOW CREATE EVENT TYPE ONLY */}
            {!showingEvents && (
              <Box
                sx={fabStyles.fabMenuItem}
                onClick={() => {
                  setFabMenuOpen(false);
                  setEventTypesModalOpen(true);
                  setEditingEventType(null);
                }}
                role="button"
                tabIndex={fabMenuOpen ? 0 : -1}
                aria-label="Create Event Type"
              >
                <Typography sx={fabStyles.fabMenuLabel}>
                  Create Event Type
                </Typography>
                <Box sx={fabStyles.fabMenuIcon}></Box>
              </Box>
            )}

            {/* WHEN VIEWING EVENTS (TABLE) - SHOW CREATE EVENT ONLY */}
            {showingEvents && (
              <Box
                sx={fabStyles.fabMenuItem}
                onClick={() => {
                  setFabMenuOpen(false);
                  const eventTypeObj = findEventTypeByName(
                    selectedEventTypeFilter,
                  );
                  setSelectedEventTypeObj(eventTypeObj);
                  setCreateEventModalOpen(true);
                }}
                role="button"
                tabIndex={fabMenuOpen ? 0 : -1}
                aria-label="Create Event Data"
              >
                <Typography sx={fabStyles.fabMenuLabel}>
                  Create Event Data
                </Typography>
                <Box sx={fabStyles.fabMenuIcon}></Box>
              </Box>
            )}
          </Box>

          {/* MAIN FAB BUTTON (+) */}
          <IconButton
            sx={{
              backgroundColor: "#007bff",
              color: "white",
              width: 56,
              height: 56,
              "&:hover": {
                backgroundColor: "#0056b3",
                transform: "scale(1.05)",
              },
              transform: fabMenuOpen
                ? "rotate(45deg) scale(1.05)"
                : "rotate(0deg) scale(1)",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
              position: "relative",
              zIndex: 1301,
            }}
            onClick={() => setFabMenuOpen(!fabMenuOpen)}
            aria-label={fabMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={fabMenuOpen}
            aria-haspopup="true"
          >
            +
          </IconButton>
        </Box>
      )}

      {/* MODALS */}
      <Eventsfilter
        open={showFilter}
        onClose={() => setShowFilter(false)}
        onApplyFilter={applyFilters}
        events={events}
        currentFilters={filterOptions}
        eventTypes={eventTypes}
      />

     {selectedEvent && (
  <AttendanceModal
    isOpen={attendanceModalOpen}
    onClose={() => {
      setAttendanceModalOpen(false);
      setSelectedEvent(null);
    }}
    onSubmit={handleAttendanceSubmit}
    event={selectedEvent}
    currentUser={currentUser}
    isActiveTeams={isActiveTeams}
  />
)}

      {isAdmin && (
        <EventTypesModal
          key={editingEventType?._id || "create"}
          open={eventTypesModalOpen}
          onClose={handleCloseEventTypesModal}
          onSubmit={handleSaveEventType}
          selectedEventType={editingEventType}
          setSelectedEventTypeObj={setSelectedEventTypeObj}
        />
      )}

      {createEventModalOpen && (
        <Box
          sx={styles.modalOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseCreateEventModal();
            }
          }}
        >
          <Box
            sx={{
              ...styles.modalContent,
              backgroundColor: isDarkMode
                ? theme.palette.background.paper
                : "white",
            }}
          >
            <Box
              sx={{
                ...styles.modalHeader,
                backgroundColor: isDarkMode
                  ? theme.palette.background.default
                  : "#333",
              }}
            >
              <Typography sx={styles.modalTitle}>
                {selectedEventTypeFilter === "CELLS" ||
                  selectedEventTypeFilter === "all"
                  ? "Create New Cell"
                  : "Create New Event"}
              </Typography>
              <IconButton
                sx={styles.modalCloseButton}
                onClick={() => handleCloseCreateEventModal(false)}
              >
                ×
              </IconButton>
            </Box>
            <Box
              sx={{
                ...styles.modalBody,
                backgroundColor: isDarkMode
                  ? theme.palette.background.paper
                  : "white",
              }}
            >
              <CreateEvents
                key={selectedEventTypeFilter}
                user={currentUser}
                isModal={true}
                onClose={handleCloseCreateEventModal}
                selectedEventTypeObj={findEventTypeByName(
                  selectedEventTypeFilter,
                )}
                selectedEventType={selectedEventTypeFilter}
                eventTypes={eventTypes}
              />
            </Box>
          </Box>
        </Box>
      )}
      <EditEventModal
        isOpen={editModalOpen}
        onClose={(shouldRefresh = false, updatedEventData = null) => {
          handleCloseEditModal(shouldRefresh, updatedEventData);
        }}
        event={selectedEvent}
        token={token}
      />

      <Dialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
        sx={{
          "& .MuiPaper-root": {
            backgroundColor: isDarkMode
              ? theme.palette.background.paper
              : "#fff",
            color: isDarkMode ? theme.palette.text.primary : "#000",
          },
        }}
      >
        <DialogTitle id="delete-dialog-title">Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography id="delete-dialog-description">
            Are you sure you want to delete the event type "
            {toDeleteType?.name || toDeleteType}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteOpen(false)} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleDeleteType}
            color="error"
            variant="contained"
            autoFocus
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        pauseOnHover
        theme={isDarkMode ? "dark" : "light"}
        style={{ marginTop: "80px" }}
      />
    </Box>
  );
};
export default Events;
