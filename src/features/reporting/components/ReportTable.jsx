import { Link as RouterLink, useLocation } from "react-router-dom";
import { Link, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { formatTableValue } from "../formatting";

/** @param {{table: {key: string, title: string, columns: Array<{key: string, label: string, format?: string|null}>, rows: Array<Record<string, unknown>>}}} props */
const CELLS_BASE = "/reports/cells_graph";

/** Cell names and leader names become links when the row carries event_id / leader_id. */
function drillTarget(column, row, search) {
  if (column.key === "name" && row.event_id) return `${CELLS_BASE}/cell/${encodeURIComponent(row.event_id)}${search}`;
  if (column.key === "leader" && row.leader_id) return `${CELLS_BASE}/leader/${encodeURIComponent(row.leader_id)}${search}`;
  return null;
}

export default function ReportTable({ table }) {
  const { search } = useLocation();
  return (
    <Paper variant="outlined" sx={{ overflow: "hidden", borderRadius: 1 }}>
      <Typography component="h2" variant="subtitle1" fontWeight={700} sx={{ px: 2, pt: 1.75 }}>{table.title}</Typography>
      {table.rows.length === 0 ? (
        <Typography color="text.secondary" variant="body2" sx={{ p: 2 }}>No rows for this period.</Typography>
      ) : (
        <TableContainer sx={{ maxHeight: 540 }}>
          <Table size="small" stickyHeader>
            <TableHead><TableRow>
              {table.columns.map((column) => <TableCell key={column.key} align={column.format === "number" || column.format === "percent" || column.format === "ratio" ? "right" : "left"} sx={{ fontWeight: 700 }}>{column.label}</TableCell>)}
            </TableRow></TableHead>
            <TableBody>{table.rows.map((row, rowIndex) => (
              <TableRow hover key={String(row.id || row.person_id || `${table.key}-${rowIndex}`)}>
                {table.columns.map((column) => <TableCell key={column.key} align={column.format === "number" || column.format === "percent" || column.format === "ratio" ? "right" : "left"}>
                  {(() => {
                    const text = formatTableValue(row[column.key], column.format);
                    const to = drillTarget(column, row, search);
                    return to && row[column.key] ? <Link component={RouterLink} to={to} underline="hover" fontWeight={600}>{text}</Link> : text;
                  })()}
                </TableCell>)}
              </TableRow>
            ))}</TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}