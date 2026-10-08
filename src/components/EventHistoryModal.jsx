import React, { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TablePagination,
  useMediaQuery,
  useTheme,
  Card,
  CardContent,
  Stack,
  Divider,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";
import { getTokens, DISPLAY, BODY, inputSx, outlinedBtnSx } from "../theme/checkinTokens";

const EventHistoryModal = React.memo(({ open, onClose, event, type, data = [] }) => {
  const theme = useTheme();
  const isSmDown = useMediaQuery(theme.breakpoints.down("sm"));
  const tokens = getTokens(theme.palette.mode === "dark");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  useEffect(() => {
    if (open) {
      setSearchTerm("");
      setPage(0);
    }
  }, [open]);

  const filteredData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    if (!searchTerm.trim()) return data;

    const term = searchTerm.toLowerCase().trim();
    return data.filter((item) => {
      if (!item) return false;

      const searchString = [
        item.name || "",
        item.surname || "",
        item.person_name || "",
        item.person_surname || "",
        item.email || "",
        item.person_email || "",
        item.phone || "",
        item.person_phone || "",
        item.leader1 || "",
        item.leader12 || "",
        item.leader144 || "",
        item.assigned_to || "",
        item.decision_type || "",
        item.consolidation_type || "",
      ]
        .join(" ")
        .toLowerCase();

      return searchString.includes(term);
    });
  }, [data, searchTerm]);

  const paginatedData = useMemo(
    () => filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredData, page, rowsPerPage],
  );

  const getModalTitle = () => {
    const typeTitle = type === "attendance" ? "Attendance" : type === "newPeople" ? "New people" : "Consolidated";
    return typeTitle;
  };

  const getSubtitle = () => {
    if (!event) return "";
    const eventName = event.eventName || "Event";
    const eventDate = event.date ? new Date(event.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
    const count = filteredData.length;
    const suffix = count === 1 ? "person" : "people";
    return `${eventName}${eventDate ? ` · ${eventDate}` : ""} · ${count} ${suffix}`;
  };

  const handleClose = () => onClose();

  const downloadExcel = () => {
    if (!filteredData || filteredData.length === 0) {
      toast?.info?.("No data to export") || alert("No data to export");
      return;
    }

    let headers = [];
    let dataRows = [];

    if (type === "attendance") {
      headers = ["Name", "Surname", "Email", "Phone", "Leader @1", "Leader @12", "Leader @144", "CheckIn_Time"];
      dataRows = filteredData.map((item) => [item.name || "", item.surname || "", item.email || "", item.phone || "", item.leader1 || "", item.leader12 || "", item.leader144 || "", item.time || ""]);
    } else if (type === "newPeople") {
      headers = ["Name", "Surname", "Email", "Phone", "Gender", "InvitedBy", "Leader @1", "Leader @12", "Leader @144"];
      dataRows = filteredData.map((item) => [item.name || "", item.surname || "", item.email || "", item.phone || "", item.gender || "", item.invitedBy || "", item.leader1 || "", item.leader12 || "", item.leader144 || ""]);
    } else {
      headers = ["Name", "Surname", "Email", "Phone", "Leader @1", "Leader @12", "Leader @144", "Decision_Type", "Assigned_To", "Status"];
      dataRows = filteredData.map((item) => [item.name || item.person_name || "", item.surname || item.person_surname || "", item.email || item.person_email || "", item.phone || item.person_phone || "", item.leader1 || "", item.leader12 || "", item.leader144 || "", item.decision_type || item.consolidation_type || "", item.assigned_to || "", item.status || ""]);
    }

    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
    const range = XLSX.utils.decode_range(ws["!ref"]);
    ws["!cols"] = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
      let maxw = 10;
      for (let R = range.s.r; R <= range.e.r; ++R) {
        const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
        if (!cell?.v) continue;
        const len = String(cell.v).length;
        if (len > maxw) maxw = len;
      }
      ws["!cols"][C] = { wch: maxw + 3 };
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, type === "attendance" ? "Present" : type === "newPeople" ? "New People" : "Consolidated");
    const eventName = (event?.eventName || "Event").replace(/[^a-z0-9]/gi, "_");
    const today = new Date().toISOString().split("T")[0];
    const filename = `${type}_${eventName}_${today}.xlsx`;

    try {
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "binary" });
      const buf = new ArrayBuffer(wbout.length);
      const view = new Uint8Array(buf);
      for (let i = 0; i < wbout.length; i += 1) view[i] = wbout.charCodeAt(i) & 0xff;
      const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast?.success?.(`Downloaded ${filteredData.length} records`);
    } catch (err) {
      console.error("Excel export failed:", err);
      toast?.error?.("Failed to create Excel file");
    }
  };

  if (!open) return null;

  const pillSx = { borderRadius: "99px", border: `1px solid ${tokens.line}`, color: tokens.ink, background: "transparent", fontWeight: 600, fontSize: "0.68rem", height: 22, px: 1 };

  const MobileCard = ({ item, index }) => (
    <Card variant="outlined" sx={{ mb: 1, borderRadius: "14px", border: `1px solid ${tokens.line}`, background: tokens.cardBg, boxShadow: "none" }}>
      <CardContent sx={{ p: 1.5 }}>
        <Typography sx={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: "0.92rem", color: tokens.ink }}>
          {index}. {item.name || item.person_name} {item.surname || item.person_surname}
        </Typography>
        <Stack spacing={0.5} mt={1}>
          {item.email && <Typography sx={{ fontFamily: BODY, fontSize: "0.8rem", color: tokens.mute }}>{item.email || item.person_email}</Typography>}
          {item.phone && <Typography sx={{ fontFamily: BODY, fontSize: "0.8rem", color: tokens.mute }}>{item.phone || item.person_phone}</Typography>}
          {(item.leader1 || item.leader12 || item.leader144) && (
            <>
              <Divider sx={{ borderColor: tokens.line }} />
              <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                {item.leader1 && <Box component="span" sx={pillSx}>@1: {item.leader1}</Box>}
                {item.leader12 && <Box component="span" sx={pillSx}>@12: {item.leader12}</Box>}
                {item.leader144 && <Box component="span" sx={pillSx}>@144: {item.leader144}</Box>}
              </Stack>
            </>
          )}
          {type === "consolidated" && (
            <>
              <Divider sx={{ borderColor: tokens.line }} />
              <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                <Box component="span" sx={{ ...pillSx, borderColor: tokens.line }}>{item.decision_type || item.consolidation_type || "Commitment"}</Box>
                {item.assigned_to && <Box component="span" sx={pillSx}>{item.assigned_to}</Box>}
              </Stack>
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );

  const DesktopRow = ({ item, index }) => (
    <TableRow hover sx={{ background: tokens.cardBg }}>
      <TableCell sx={{ color: tokens.ink, borderColor: tokens.line, fontFamily: BODY }}>{index}</TableCell>
      <TableCell sx={{ color: tokens.ink, borderColor: tokens.line, fontFamily: BODY, fontWeight: 600 }}>{item.name || item.person_name} {item.surname || item.person_surname}</TableCell>
      <TableCell sx={{ color: tokens.ink, borderColor: tokens.line, fontFamily: BODY }}>{item.email || item.person_email || "—"}</TableCell>
      <TableCell sx={{ color: tokens.ink, borderColor: tokens.line, fontFamily: BODY }}>{item.phone || item.person_phone || "—"}</TableCell>
      <TableCell sx={{ color: tokens.ink, borderColor: tokens.line, fontFamily: BODY }}>{item.leader1 || "—"}</TableCell>
      <TableCell sx={{ color: tokens.ink, borderColor: tokens.line, fontFamily: BODY }}>{item.leader12 || "—"}</TableCell>
      <TableCell sx={{ color: tokens.ink, borderColor: tokens.line, fontFamily: BODY }}>{item.leader144 || "—"}</TableCell>
      {type === "consolidated" && (
        <>
          <TableCell sx={{ color: tokens.ink, borderColor: tokens.line, fontFamily: BODY }}>
            <Box component="span" sx={{ ...pillSx, display: "inline-flex", alignItems: "center" }}>{item.decision_type || item.consolidation_type || "Commitment"}</Box>
          </TableCell>
          <TableCell sx={{ color: tokens.ink, borderColor: tokens.line, fontFamily: BODY }}>{item.assigned_to || item.assignedTo || "Not assigned"}</TableCell>
          <TableCell sx={{ color: tokens.ink, borderColor: tokens.line, fontFamily: BODY }}>
            <Box component="span" sx={{ ...pillSx, display: "inline-flex", alignItems: "center" }}>{item.status || "Active"}</Box>
          </TableCell>
        </>
      )}
    </TableRow>
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{
        sx: {
          borderRadius: "18px",
          bgcolor: tokens.cardBg,
          border: `1px solid ${tokens.line}`,
          backgroundImage: "none",
          m: 2,
          maxHeight: "90vh",
        },
      }}
    >
      <DialogTitle sx={{ p: "16px 20px", borderBottom: `1px solid ${tokens.line}` }}>
        <Typography sx={{ fontFamily: DISPLAY, fontWeight: 800, color: tokens.ink, fontSize: "1.25rem" }}>
          {getModalTitle()}
        </Typography>
        <Typography sx={{ fontFamily: BODY, fontSize: "0.8125rem", color: tokens.mute, mt: 0.75 }}>
          {getSubtitle()}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ p: "8px 20px 16px", overflowY: "auto" }}>
        <TextField
          size="small"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(0);
          }}
          fullWidth
          sx={{ ...inputSx(tokens), mb: 1.5 }}
        />

        {filteredData.length === 0 ? (
          <Typography variant="body2" color={tokens.mute} textAlign="center" py={4} sx={{ fontFamily: BODY }}>
            {searchTerm ? "No matching data found" : "No data available"}
          </Typography>
        ) : (
          <>
            {isSmDown ? (
              <Box>
                {paginatedData.map((item, idx) => (
                  <MobileCard key={item._id || item.id || idx} item={item} index={page * rowsPerPage + idx + 1} />
                ))}
              </Box>
            ) : (
              <Box sx={{ overflowX: "auto" }}>
                <Table size="small" sx={{ minWidth: 780 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, color: tokens.mute, bgcolor: tokens.fieldBg, borderColor: tokens.line, fontFamily: BODY }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: tokens.mute, bgcolor: tokens.fieldBg, borderColor: tokens.line, fontFamily: BODY }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: tokens.mute, bgcolor: tokens.fieldBg, borderColor: tokens.line, fontFamily: BODY }}>Email</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: tokens.mute, bgcolor: tokens.fieldBg, borderColor: tokens.line, fontFamily: BODY }}>Phone</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: tokens.mute, bgcolor: tokens.fieldBg, borderColor: tokens.line, fontFamily: BODY }}>Leader @1</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: tokens.mute, bgcolor: tokens.fieldBg, borderColor: tokens.line, fontFamily: BODY }}>Leader @12</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: tokens.mute, bgcolor: tokens.fieldBg, borderColor: tokens.line, fontFamily: BODY }}>Leader @144</TableCell>
                      {type === "consolidated" && (
                        <>
                          <TableCell sx={{ fontWeight: 600, color: tokens.mute, bgcolor: tokens.fieldBg, borderColor: tokens.line, fontFamily: BODY }}>Decision type</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: tokens.mute, bgcolor: tokens.fieldBg, borderColor: tokens.line, fontFamily: BODY }}>Assigned to</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: tokens.mute, bgcolor: tokens.fieldBg, borderColor: tokens.line, fontFamily: BODY }}>Status</TableCell>
                        </>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedData.map((item, idx) => (
                      <DesktopRow key={item._id || item.id || idx} item={item} index={page * rowsPerPage + idx + 1} />
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}

            <Box mt={1}>
              <TablePagination
                component="div"
                count={filteredData.length}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[25, 50, 100]}
                sx={{
                  color: tokens.mute,
                  "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": { color: tokens.mute, fontFamily: BODY },
                  "& .MuiSelect-icon": { color: tokens.mute },
                }}
              />
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: "12px 20px", borderTop: `1px solid ${tokens.line}`, gap: 1 }}>
        <Typography sx={{ mr: "auto", fontSize: "0.8125rem", color: tokens.mute, fontFamily: BODY }}>
          Showing {filteredData.length} of {data.length}
        </Typography>
        <Button variant="outlined" onClick={downloadExcel} startIcon={<DownloadIcon />} disabled={filteredData.length === 0} sx={{ ...outlinedBtnSx(tokens), minWidth: 120 }}>
          Download XLSX
        </Button>
      </DialogActions>
    </Dialog>
  );
});

EventHistoryModal.displayName = "EventHistoryModal";

export default EventHistoryModal;